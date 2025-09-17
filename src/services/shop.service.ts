import { createServiceClient, createServerClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { nanoid } from 'nanoid/non-secure';
import {
  Shop,
  ShopSettings,
  ShopAnalytics,
  ShopSales,
  WithdrawalRequest,
  CreateShopRequest,
  UpdateShopRequest,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

export class ShopService {
  private supabase = createServiceClient();
  private serverSupabase = createServerClient();

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  async createShop(request: CreateShopRequest, ownerId: string): Promise<{ success: boolean; shop?: Shop; error?: string }> {
    try {
      logger.info('Creating shop', { ownerId, name: request.name });

      // Validate input
      const validation = this.validateCreateShopRequest(request);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate slug
      const slug = this.generateSlug(request.name);

      // Check if slug already exists
      const { data: existingShop } = await this.supabase
        .from('shops')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingShop) {
        return { success: false, error: 'Shop with this name already exists' };
      }

      // Create shop
      const { data: shop, error } = await this.supabase
        .from('shops')
        .insert({
          owner_id: ownerId,
          name: request.name,
          slug,
          description: request.description,
          logo_url: request.logo_url,
          banner_url: request.banner_url,
          website_url: request.website_url,
          contact_email: request.contact_email,
          settings: request.settings || {},
          is_active: true,
        })
        .select('*')
        .single();

      if (error) {
        logError(error as Error, { action: 'create_shop', ownerId });
        return { success: false, error: 'Failed to create shop' };
      }

      logger.info('Shop created successfully', { shopId: shop.id, ownerId });
      return { success: true, shop };
    } catch (error) {
      logError(error as Error, { action: 'create_shop', ownerId });
      return { success: false, error: 'Internal server error' };
    }
  }

  async getShop(shopId: string): Promise<Shop | null> {
    try {
      const { data: shop, error } = await this.supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();

      if (error || !shop) {
        return null;
      }

      return shop;
    } catch (error) {
      logError(error as Error, { action: 'get_shop', shopId });
      return null;
    }
  }

  async getShopBySlug(slug: string): Promise<Shop | null> {
    try {
      const { data: shop, error } = await this.supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !shop) {
        return null;
      }

      return shop;
    } catch (error) {
      logError(error as Error, { action: 'get_shop_by_slug', slug });
      return null;
    }
  }

  async updateShop(shopId: string, request: UpdateShopRequest, ownerId: string): Promise<{ success: boolean; shop?: Shop; error?: string }> {
    try {
      logger.info('Updating shop', { shopId, ownerId });

      // Verify ownership
      const { data: shop } = await this.supabase
        .from('shops')
        .select('owner_id')
        .eq('id', shopId)
        .single();

      if (!shop || shop.owner_id !== ownerId) {
        return { success: false, error: 'Shop not found or access denied' };
      }

      // Validate input
      const validation = this.validateUpdateShopRequest(request);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check slug uniqueness if name is being updated
      if (request.name) {
        const slug = this.generateSlug(request.name);
        const { data: existingShop } = await this.supabase
          .from('shops')
          .select('id')
          .eq('slug', slug)
          .neq('id', shopId)
          .single();

        if (existingShop) {
          return { success: false, error: 'Shop with this name already exists' };
        }
      }

      // Update shop
      const updateData: any = { ...request };
      if (request.name) {
        updateData.slug = this.generateSlug(request.name);
      }

      const { data: updatedShop, error } = await this.supabase
        .from('shops')
        .update(updateData)
        .eq('id', shopId)
        .select('*')
        .single();

      if (error) {
        logError(error as Error, { action: 'update_shop', shopId });
        return { success: false, error: 'Failed to update shop' };
      }

      logger.info('Shop updated successfully', { shopId, ownerId });
      return { success: true, shop: updatedShop };
    } catch (error) {
      logError(error as Error, { action: 'update_shop', shopId, ownerId });
      return { success: false, error: 'Internal server error' };
    }
  }

  async deleteShop(shopId: string, ownerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Deleting shop', { shopId, ownerId });

      // Verify ownership
      const { data: shop } = await this.supabase
        .from('shops')
        .select('owner_id')
        .eq('id', shopId)
        .single();

      if (!shop || shop.owner_id !== ownerId) {
        return { success: false, error: 'Shop not found or access denied' };
      }

      // Soft delete by setting is_active to false
      const { error } = await this.supabase
        .from('shops')
        .update({ is_active: false })
        .eq('id', shopId);

      if (error) {
        logError(error as Error, { action: 'delete_shop', shopId });
        return { success: false, error: 'Failed to delete shop' };
      }

      logger.info('Shop deleted successfully', { shopId, ownerId });
      return { success: true };
    } catch (error) {
      logError(error as Error, { action: 'delete_shop', shopId, ownerId });
      return { success: false, error: 'Internal server error' };
    }
  }

  async getUserShops(ownerId: string): Promise<Shop[]> {
    try {
      const { data: shops, error } = await this.supabase
        .from('shops')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logError(error as Error, { action: 'get_user_shops', ownerId });
        return [];
      }

      return shops || [];
    } catch (error) {
      logError(error as Error, { action: 'get_user_shops', ownerId });
      return [];
    }
  }

  // =============================================
  // ANALYTICS & METRICS
  // =============================================

  async getShopAnalytics(shopId: string, period: string = '30d'): Promise<ShopAnalytics | null> {
    try {
      logger.info('Getting shop analytics', { shopId, period });

      const dateRange = this.getDateRange(period);
      const now = new Date();
      const startDate = dateRange.start;
      const endDate = dateRange.end;

      // Get revenue data
      const { data: revenueData, error: revenueError } = await this.supabase
        .from('purchases')
        .select(`
          id,
          created_at,
          product:products!inner(
            id,
            title,
            price,
            shop_id
          ),
          payment:payments!inner(
            amount,
            currency,
            status
          )
        `)
        .eq('product.shop_id', shopId)
        .eq('payment.status', 'succeeded')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (revenueError) {
        logError(revenueError as Error, { action: 'get_shop_analytics_revenue', shopId });
        return null;
      }

      // Get previous period for growth calculation
      const prevStartDate = new Date(startDate);
      const prevEndDate = new Date(endDate);
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      prevStartDate.setDate(prevStartDate.getDate() - periodDays);
      prevEndDate.setDate(prevEndDate.getDate() - periodDays);

      const { data: prevRevenueData } = await this.supabase
        .from('purchases')
        .select(`
          payment:payments!inner(
            amount,
            status
          )
        `)
        .eq('product.shop_id', shopId)
        .eq('payment.status', 'succeeded')
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

      // Calculate revenue metrics
      const currentRevenue = revenueData?.reduce((sum, purchase) => sum + (purchase.payment?.amount || 0), 0) || 0;
      const prevRevenue = prevRevenueData?.reduce((sum, purchase) => sum + (purchase.payment?.amount || 0), 0) || 0;
      const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Get product data
      const { data: productsData } = await this.supabase
        .from('products')
        .select('id, title, status')
        .eq('shop_id', shopId);

      const totalProducts = productsData?.length || 0;
      const activeProducts = productsData?.filter(p => p.status === 'active').length || 0;

      // Calculate top products
      const productStats = new Map();
      revenueData?.forEach(purchase => {
        const productId = purchase.product?.id;
        const productTitle = purchase.product?.title;
        const amount = purchase.payment?.amount || 0;
        
        if (productId && productTitle) {
          const existing = productStats.get(productId) || { product_id: productId, title: productTitle, sales_count: 0, revenue: 0 };
          existing.sales_count += 1;
          existing.revenue += amount;
          productStats.set(productId, existing);
        }
      });

      const topProducts = Array.from(productStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(product => ({
          ...product,
          conversion_rate: 0, // This would need view data to calculate properly
        }));

      // Get visitor data (mock for now - would need analytics integration)
      const totalVisitors = Math.floor(Math.random() * 1000) + 500;
      const uniqueVisitors = Math.floor(totalVisitors * 0.7);
      const bounceRate = Math.random() * 0.3 + 0.2; // 20-50%
      const avgSessionDuration = Math.random() * 300 + 120; // 2-7 minutes

      // Get daily revenue trends
      const dailyRevenue = this.calculateDailyRevenue(revenueData || [], startDate, endDate);

      // Get top categories
      const { data: categoryData } = await this.supabase
        .from('purchases')
        .select(`
          product:products!inner(
            category_id,
            category:categories!inner(
              id,
              name
            )
          ),
          payment:payments!inner(
            amount,
            status
          )
        `)
        .eq('product.shop_id', shopId)
        .eq('payment.status', 'succeeded')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const categoryStats = new Map();
      categoryData?.forEach(purchase => {
        const categoryId = purchase.product?.category_id;
        const categoryName = purchase.product?.category?.name;
        const amount = purchase.payment?.amount || 0;
        
        if (categoryId && categoryName) {
          const existing = categoryStats.get(categoryId) || { 
            category_id: categoryId, 
            category_name: categoryName, 
            revenue: 0, 
            sales_count: 0 
          };
          existing.revenue += amount;
          existing.sales_count += 1;
          categoryStats.set(categoryId, existing);
        }
      });

      const topCategories = Array.from(categoryStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const analytics: ShopAnalytics = {
        period,
        revenue: {
          total: currentRevenue,
          currency: 'USD', // Default currency
          growth_percentage: revenueGrowth,
        },
        sales: {
          total_orders: revenueData?.length || 0,
          conversion_rate: 0, // Would need view data
          average_order_value: revenueData?.length ? currentRevenue / revenueData.length : 0,
          growth_percentage: 0, // Would need previous period data
        },
        products: {
          total_products: totalProducts,
          active_products: activeProducts,
          top_products: topProducts,
        },
        visitors: {
          total_visitors: totalVisitors,
          unique_visitors: uniqueVisitors,
          bounce_rate: bounceRate,
          average_session_duration: avgSessionDuration,
        },
        trends: {
          daily_revenue: dailyRevenue,
          top_categories: topCategories,
        },
      };

      logger.info('Shop analytics retrieved', { shopId, period, revenue: currentRevenue });
      return analytics;
    } catch (error) {
      logError(error as Error, { action: 'get_shop_analytics', shopId, period });
      return null;
    }
  }

  async getShopSales(shopId: string, params: PaginationParams & { period?: string }): Promise<ShopSales | null> {
    try {
      logger.info('Getting shop sales', { shopId, params });

      const { page = 1, limit = 20, period = '30d' } = params;
      const offset = (page - 1) * limit;

      const dateRange = this.getDateRange(period);
      const startDate = dateRange.start;
      const endDate = dateRange.end;

      // Get sales data
      const { data: salesData, error: salesError } = await this.supabase
        .from('purchases')
        .select(`
          id,
          created_at,
          buyer_id,
          product:products!inner(
            id,
            title,
            shop_id
          ),
          payment:payments!inner(
            amount,
            currency,
            status
          ),
          buyer:users!inner(
            name,
            email
          )
        `)
        .eq('product.shop_id', shopId)
        .eq('payment.status', 'succeeded')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (salesError) {
        logError(salesError as Error, { action: 'get_shop_sales', shopId });
        return null;
      }

      // Get total count for pagination
      const { count: totalCount } = await this.supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('product.shop_id', shopId)
        .eq('payment.status', 'succeeded')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get summary data
      const { data: summaryData } = await this.supabase
        .from('purchases')
        .select(`
          payment:payments!inner(
            amount,
            currency,
            status
          )
        `)
        .eq('product.shop_id', shopId)
        .eq('payment.status', 'succeeded')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalRevenue = summaryData?.reduce((sum, purchase) => sum + (purchase.payment?.amount || 0), 0) || 0;
      const totalOrders = summaryData?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get refunds data
      const { data: refundsData } = await this.supabase
        .from('purchases')
        .select(`
          payment:payments!inner(
            amount,
            status
          )
        `)
        .eq('product.shop_id', shopId)
        .eq('payment.status', 'refunded')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const refunds = refundsData?.reduce((sum, purchase) => sum + (purchase.payment?.amount || 0), 0) || 0;

      const orders = salesData?.map(purchase => ({
        id: purchase.id,
        product_id: purchase.product?.id || '',
        product_title: purchase.product?.title || '',
        buyer_name: purchase.buyer?.name || 'Unknown',
        buyer_email: purchase.buyer?.email || '',
        amount: purchase.payment?.amount || 0,
        currency: purchase.payment?.currency || 'USD',
        status: purchase.payment?.status || 'unknown',
        created_at: purchase.created_at,
      })) || [];

      const sales: ShopSales = {
        period,
        orders,
        summary: {
          total_revenue: totalRevenue,
          total_orders: totalOrders,
          average_order_value: averageOrderValue,
          refunds,
          net_revenue: totalRevenue - refunds,
        },
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
        },
      };

      logger.info('Shop sales retrieved', { shopId, period, totalOrders, totalRevenue });
      return sales;
    } catch (error) {
      logError(error as Error, { action: 'get_shop_sales', shopId, params });
      return null;
    }
  }

  // =============================================
  // WITHDRAWAL MANAGEMENT
  // =============================================

  async createWithdrawalRequest(shopId: string, amount: number, method: string, accountDetails: Record<string, any>, ownerId: string): Promise<{ success: boolean; request?: WithdrawalRequest; error?: string }> {
    try {
      logger.info('Creating withdrawal request', { shopId, amount, method, ownerId });

      // Verify ownership
      const { data: shop } = await this.supabase
        .from('shops')
        .select('owner_id')
        .eq('id', shopId)
        .single();

      if (!shop || shop.owner_id !== ownerId) {
        return { success: false, error: 'Shop not found or access denied' };
      }

      // Check minimum withdrawal amount
      const minAmount = 10; // $10 minimum
      if (amount < minAmount) {
        return { success: false, error: `Minimum withdrawal amount is $${minAmount}` };
      }

      // Check available balance (simplified - would need proper balance calculation)
      const { data: balanceData } = await this.supabase
        .from('purchases')
        .select(`
          payment:payments!inner(
            amount,
            status
          )
        `)
        .eq('product.shop_id', shopId)
        .eq('payment.status', 'succeeded');

      const totalEarnings = balanceData?.reduce((sum, purchase) => sum + (purchase.payment?.amount || 0), 0) || 0;
      const platformFee = 0.05; // 5% platform fee
      const availableBalance = totalEarnings * (1 - platformFee);

      if (amount > availableBalance) {
        return { success: false, error: 'Insufficient balance for withdrawal' };
      }

      // Create withdrawal request
      const { data: request, error } = await this.supabase
        .from('withdrawal_requests')
        .insert({
          shop_id: shopId,
          amount,
          currency: 'USD',
          method,
          account_details: accountDetails,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error) {
        logError(error as Error, { action: 'create_withdrawal_request', shopId });
        return { success: false, error: 'Failed to create withdrawal request' };
      }

      logger.info('Withdrawal request created', { requestId: request.id, shopId, amount });
      return { success: true, request };
    } catch (error) {
      logError(error as Error, { action: 'create_withdrawal_request', shopId, ownerId });
      return { success: false, error: 'Internal server error' };
    }
  }

  async getWithdrawalRequests(shopId: string, ownerId: string): Promise<WithdrawalRequest[]> {
    try {
      // Verify ownership
      const { data: shop } = await this.supabase
        .from('shops')
        .select('owner_id')
        .eq('id', shopId)
        .single();

      if (!shop || shop.owner_id !== ownerId) {
        return [];
      }

      const { data: requests, error } = await this.supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(error as Error, { action: 'get_withdrawal_requests', shopId });
        return [];
      }

      return requests || [];
    } catch (error) {
      logError(error as Error, { action: 'get_withdrawal_requests', shopId, ownerId });
      return [];
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private validateCreateShopRequest(request: CreateShopRequest): { valid: boolean; error?: string } {
    if (!request.name || request.name.trim().length < 2) {
      return { valid: false, error: 'Shop name must be at least 2 characters long' };
    }

    if (request.name.length > 100) {
      return { valid: false, error: 'Shop name must be less than 100 characters' };
    }

    if (request.contact_email && !this.isValidEmail(request.contact_email)) {
      return { valid: false, error: 'Invalid contact email format' };
    }

    if (request.website_url && !this.isValidUrl(request.website_url)) {
      return { valid: false, error: 'Invalid website URL format' };
    }

    return { valid: true };
  }

  private validateUpdateShopRequest(request: UpdateShopRequest): { valid: boolean; error?: string } {
    if (request.name !== undefined) {
      if (!request.name || request.name.trim().length < 2) {
        return { valid: false, error: 'Shop name must be at least 2 characters long' };
      }

      if (request.name.length > 100) {
        return { valid: false, error: 'Shop name must be less than 100 characters' };
      }
    }

    if (request.contact_email && !this.isValidEmail(request.contact_email)) {
      return { valid: false, error: 'Invalid contact email format' };
    }

    if (request.website_url && !this.isValidUrl(request.website_url)) {
      return { valid: false, error: 'Invalid website URL format' };
    }

    return { valid: true };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private getDateRange(period: string): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);

    switch (period) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  }

  private calculateDailyRevenue(purchases: any[], startDate: Date, endDate: Date): Array<{ date: string; revenue: number; orders: number }> {
    const dailyData = new Map<string, { revenue: number; orders: number }>();
    
    // Initialize all days in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dailyData.set(dateKey, { revenue: 0, orders: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Aggregate purchase data
    purchases.forEach(purchase => {
      const date = new Date(purchase.created_at).toISOString().split('T')[0];
      const amount = purchase.payment?.amount || 0;
      
      if (dailyData.has(date)) {
        const existing = dailyData.get(date)!;
        existing.revenue += amount;
        existing.orders += 1;
      }
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
