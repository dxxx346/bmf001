import { createServiceClient, createServerClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

// Admin-specific types
export interface PlatformStats {
  total_users: number;
  total_sellers: number;
  total_products: number;
  total_revenue: number;
  monthly_revenue: number;
  active_users_24h: number;
  active_users_7d: number;
  active_users_30d: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  refunded_orders: number;
  conversion_rate: number;
  average_order_value: number;
}

export interface SystemHealth {
  database_status: 'healthy' | 'warning' | 'error';
  api_response_time: number;
  storage_usage: number;
  storage_limit: number;
  bandwidth_usage: number;
  bandwidth_limit: number;
  error_rate: number;
  uptime_percentage: number;
  last_backup: string;
  active_sessions: number;
}

export interface UserManagement {
  id: string;
  email: string;
  name?: string;
  role: 'buyer' | 'seller' | 'partner' | 'admin';
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at?: string;
  total_purchases: number;
  total_sales: number;
  account_balance: number;
  status: 'active' | 'suspended' | 'banned' | 'pending';
}

export interface ProductModeration {
  id: string;
  title: string;
  seller_id: string;
  seller_name: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'flagged';
  price: number;
  created_at: string;
  updated_at: string;
  reports_count: number;
  last_report_date?: string;
  moderation_notes?: string;
  flagged_reasons: string[];
}

export interface ReportedContent {
  id: string;
  type: 'product' | 'user' | 'review' | 'comment';
  content_id: string;
  reporter_id: string;
  reporter_name: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  content_preview?: string;
}

export interface PlatformSettings {
  id: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  category: 'general' | 'payments' | 'security' | 'features' | 'limits';
  is_public: boolean;
  updated_at: string;
  updated_by: string;
}

export interface AdminActivity {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export class AdminService {
  private supabase = createServiceClient();
  private serverSupabase = createServerClient();

  // =============================================
  // DASHBOARD METRICS
  // =============================================

  async getPlatformStats(): Promise<PlatformStats | null> {
    try {
      logger.info('Fetching platform statistics');

      // Get basic counts
      const [usersResult, productsResult, ordersResult, revenueResult] = await Promise.all([
        this.supabase.from('users').select('id, role, created_at', { count: 'exact' }),
        this.supabase.from('products').select('id, status', { count: 'exact' }),
        this.supabase.from('purchases').select('id, created_at', { count: 'exact' }),
        this.supabase.from('payments').select('amount, currency, status, created_at')
      ]);

      if (usersResult.error || productsResult.error || ordersResult.error || revenueResult.error) {
        throw new Error('Failed to fetch platform statistics');
      }

      const users = usersResult.data || [];
      const products = productsResult.data || [];
      const orders = ordersResult.data || [];
      const payments = revenueResult.data || [];

      // Calculate metrics
      const totalUsers = usersResult.count || 0;
      const totalSellers = users.filter(u => u.role === 'seller').length;
      const totalProducts = productsResult.count || 0;
      const totalOrders = ordersResult.count || 0;

      const completedPayments = payments.filter(p => p.status === 'succeeded');
      const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyPayments = completedPayments.filter(p => new Date(p.created_at) >= monthStart);
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

      const averageOrderValue = completedPayments.length > 0 
        ? totalRevenue / completedPayments.length 
        : 0;

      const conversionRate = totalUsers > 0 ? (completedPayments.length / totalUsers) * 100 : 0;

      // Active users calculations
      const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const day7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const day30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activeUsers24h = orders.filter(o => new Date(o.created_at) >= day24h).length;
      const activeUsers7d = orders.filter(o => new Date(o.created_at) >= day7d).length;
      const activeUsers30d = orders.filter(o => new Date(o.created_at) >= day30d).length;

      const stats: PlatformStats = {
        total_users: totalUsers,
        total_sellers: totalSellers,
        total_products: totalProducts,
        total_revenue: totalRevenue,
        monthly_revenue: monthlyRevenue,
        active_users_24h: activeUsers24h,
        active_users_7d: activeUsers7d,
        active_users_30d: activeUsers30d,
        total_orders: totalOrders,
        pending_orders: payments.filter(p => p.status === 'pending').length,
        completed_orders: completedPayments.length,
        refunded_orders: payments.filter(p => p.status === 'failed').length,
        conversion_rate: conversionRate,
        average_order_value: averageOrderValue,
      };

      logger.info('Platform statistics fetched successfully', { stats });
      return stats;
    } catch (error) {
      logError(error as Error, { action: 'get_platform_stats' });
      return null;
    }
  }

  async getSystemHealth(): Promise<SystemHealth | null> {
    try {
      logger.info('Checking system health');

      const startTime = Date.now();
      
      // Test database connection
      const { error: dbError } = await this.supabase.from('users').select('id').limit(1);
      const apiResponseTime = Date.now() - startTime;

      const health: SystemHealth = {
        database_status: dbError ? 'error' : 'healthy',
        api_response_time: apiResponseTime,
        storage_usage: 0, // Would need to implement storage monitoring
        storage_limit: 1000000000, // 1GB default
        bandwidth_usage: 0, // Would need to implement bandwidth monitoring
        bandwidth_limit: 100000000, // 100MB default
        error_rate: 0, // Would need error tracking
        uptime_percentage: 99.9, // Would need uptime monitoring
        last_backup: new Date().toISOString(), // Would need backup tracking
        active_sessions: 0, // Would need session tracking
      };

      logger.info('System health checked', { health });
      return health;
    } catch (error) {
      logError(error as Error, { action: 'get_system_health' });
      return null;
    }
  }

  // =============================================
  // USER MANAGEMENT
  // =============================================

  async getUsers(
    page: number = 1,
    limit: number = 50,
    filters?: {
      role?: string;
      status?: string;
      search?: string;
    }
  ): Promise<{ users: UserManagement[]; total: number } | null> {
    try {
      logger.info('Fetching users for admin', { page, limit, filters });

      let query = this.supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          role,
          is_active,
          email_verified,
          created_at,
          last_login_at
        `, { count: 'exact' });

      // Apply filters
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      if (filters?.status === 'active') {
        query = query.eq('is_active', true);
      } else if (filters?.status === 'inactive') {
        query = query.eq('is_active', false);
      }

      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data: users, error, count } = await query;

      if (error) {
        throw error;
      }

      // Enhance user data with additional metrics
      const enhancedUsers: UserManagement[] = await Promise.all(
        (users || []).map(async (user) => {
          // Get purchase count
          const { count: purchaseCount } = await this.supabase
            .from('purchases')
            .select('*', { count: 'exact' })
            .eq('buyer_id', user.id);

          // Get sales count (if seller)
          const { count: salesCount } = await this.supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('seller_id', user.id);

          return {
            ...user,
            total_purchases: purchaseCount || 0,
            total_sales: salesCount || 0,
            account_balance: 0, // Would need to implement balance tracking
            status: user.is_active ? 'active' : 'suspended',
          } as UserManagement;
        })
      );

      logger.info('Users fetched successfully', { count: enhancedUsers.length });
      return { users: enhancedUsers, total: count || 0 };
    } catch (error) {
      logError(error as Error, { action: 'get_users', filters });
      return null;
    }
  }

  async updateUserStatus(
    userId: string,
    status: 'active' | 'suspended' | 'banned',
    adminId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      logger.info('Updating user status', { userId, status, adminId, reason });

      const { error } = await this.supabase
        .from('users')
        .update({
          is_active: status === 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Log admin activity
      await this.logAdminActivity(
        adminId,
        'user_status_update',
        'user',
        userId,
        { status, reason }
      );

      logger.info('User status updated successfully', { userId, status });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'update_user_status', userId, status });
      return false;
    }
  }

  // =============================================
  // PRODUCT MODERATION
  // =============================================

  async getProductsForModeration(
    page: number = 1,
    limit: number = 50,
    filters?: {
      status?: string;
      flagged?: boolean;
    }
  ): Promise<{ products: ProductModeration[]; total: number } | null> {
    try {
      logger.info('Fetching products for moderation', { page, limit, filters });

      let query = this.supabase
        .from('products')
        .select(`
          id,
          title,
          seller_id,
          status,
          price,
          created_at,
          updated_at,
          users!seller_id (
            name
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data: products, error, count } = await query;

      if (error) {
        throw error;
      }

      // Transform data
      const moderationProducts: ProductModeration[] = (products || []).map(product => ({
        id: product.id,
        title: product.title,
        seller_id: product.seller_id,
        seller_name: (product.users as any)?.name || 'Unknown',
        status: product.status,
        price: product.price,
        created_at: product.created_at,
        updated_at: product.updated_at,
        reports_count: 0, // Would need to implement reports system
        flagged_reasons: [],
      }));

      logger.info('Products for moderation fetched successfully', { count: moderationProducts.length });
      return { products: moderationProducts, total: count || 0 };
    } catch (error) {
      logError(error as Error, { action: 'get_products_for_moderation', filters });
      return null;
    }
  }

  async moderateProduct(
    productId: string,
    action: 'approve' | 'reject' | 'flag',
    adminId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      logger.info('Moderating product', { productId, action, adminId, notes });

      const status = action === 'approve' ? 'active' : action === 'reject' ? 'inactive' : 'flagged';

      const { error } = await this.supabase
        .from('products')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) {
        throw error;
      }

      // Log admin activity
      await this.logAdminActivity(
        adminId,
        'product_moderation',
        'product',
        productId,
        { action, notes }
      );

      logger.info('Product moderated successfully', { productId, action });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'moderate_product', productId });
      return false;
    }
  }

  // =============================================
  // REPORTED CONTENT
  // =============================================

  async getReportedContent(
    page: number = 1,
    limit: number = 50,
    filters?: {
      type?: string;
      status?: string;
      priority?: string;
    }
  ): Promise<{ reports: ReportedContent[]; total: number } | null> {
    try {
      logger.info('Fetching reported content', { page, limit, filters });

      // This would need a reports table in the database
      // For now, returning mock data structure
      const reports: ReportedContent[] = [];
      
      return { reports, total: 0 };
    } catch (error) {
      logError(error as Error, { action: 'get_reported_content', filters });
      return null;
    }
  }

  // =============================================
  // PLATFORM SETTINGS
  // =============================================

  async getPlatformSettings(category?: string): Promise<PlatformSettings[] | null> {
    try {
      logger.info('Fetching platform settings', { category });

      // This would need a settings table in the database
      // For now, returning mock data structure
      const settings: PlatformSettings[] = [
        {
          id: '1',
          key: 'platform_name',
          value: 'Digital Marketplace',
          type: 'string',
          description: 'The name of the platform',
          category: 'general',
          is_public: true,
          updated_at: new Date().toISOString(),
          updated_by: 'admin',
        },
        {
          id: '2',
          key: 'commission_rate',
          value: 5.0,
          type: 'number',
          description: 'Platform commission rate (%)',
          category: 'payments',
          is_public: false,
          updated_at: new Date().toISOString(),
          updated_by: 'admin',
        },
      ];

      return category 
        ? settings.filter(s => s.category === category)
        : settings;
    } catch (error) {
      logError(error as Error, { action: 'get_platform_settings', category });
      return null;
    }
  }

  async updatePlatformSetting(
    key: string,
    value: any,
    adminId: string
  ): Promise<boolean> {
    try {
      logger.info('Updating platform setting', { key, value, adminId });

      // This would update the settings table
      // For now, just log the activity
      await this.logAdminActivity(
        adminId,
        'setting_update',
        'setting',
        key,
        { value }
      );

      logger.info('Platform setting updated successfully', { key, value });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'update_platform_setting', key });
      return false;
    }
  }

  // =============================================
  // ADMIN ACTIVITY LOGGING
  // =============================================

  private async logAdminActivity(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // This would log to an admin_activities table
      logger.info('Admin activity logged', {
        adminId,
        action,
        targetType,
        targetId,
        details,
      });
    } catch (error) {
      logError(error as Error, { action: 'log_admin_activity', adminId });
    }
  }

  async getAdminActivities(
    page: number = 1,
    limit: number = 50,
    adminId?: string
  ): Promise<{ activities: AdminActivity[]; total: number } | null> {
    try {
      logger.info('Fetching admin activities', { page, limit, adminId });

      // This would fetch from admin_activities table
      // For now, returning mock data
      const activities: AdminActivity[] = [];
      
      return { activities, total: 0 };
    } catch (error) {
      logError(error as Error, { action: 'get_admin_activities' });
      return null;
    }
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  async bulkUpdateUsers(
    userIds: string[],
    updates: Partial<UserManagement>,
    adminId: string
  ): Promise<boolean> {
    try {
      logger.info('Bulk updating users', { userIds, updates, adminId });

      const { error } = await this.supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .in('id', userIds);

      if (error) {
        throw error;
      }

      // Log admin activity
      await this.logAdminActivity(
        adminId,
        'bulk_user_update',
        'users',
        userIds.join(','),
        { updates, count: userIds.length }
      );

      logger.info('Users bulk updated successfully', { count: userIds.length });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'bulk_update_users', userIds });
      return false;
    }
  }

  async bulkModerationAction(
    productIds: string[],
    action: 'approve' | 'reject' | 'flag',
    adminId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      logger.info('Bulk moderating products', { productIds, action, adminId, notes });

      const status = action === 'approve' ? 'active' : action === 'reject' ? 'inactive' : 'flagged';

      const { error } = await this.supabase
        .from('products')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .in('id', productIds);

      if (error) {
        throw error;
      }

      // Log admin activity
      await this.logAdminActivity(
        adminId,
        'bulk_product_moderation',
        'products',
        productIds.join(','),
        { action, notes, count: productIds.length }
      );

      logger.info('Products bulk moderated successfully', { count: productIds.length });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'bulk_moderation_action', productIds });
      return false;
    }
  }
}

export const adminService = new AdminService();
