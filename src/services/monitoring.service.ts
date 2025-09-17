import { createServerClient } from '@/lib/supabase';
import { redis, cache } from '@/lib/redis';
import logger, { performanceLogger, businessLogger, errorLogger } from '@/lib/logger';
import {
  SystemHealth,
  ResponseTimeMetrics,
  SalesMetrics,
  PaymentMetrics,
  TopProduct,
  TopShop,
  UserActivity,
  UserActivityHeatmap,
  ErrorMetrics,
  AdminDashboardData,
  MonitoringEvent,
  Alert,
} from '@/types/monitoring';

export class MonitoringService {
  private static instance: MonitoringService;
  private responseTimeBuffer: number[] = [];
  private errorBuffer: any[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly CACHE_TTL = 60; // 1 minute

  private constructor() {
    this.startPeriodicCollection();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // System Health Monitoring
  async getSystemHealth(): Promise<SystemHealth> {
    const cacheKey = 'monitoring:system_health';
    const cached = await cache.get<SystemHealth>(cacheKey);
    if (cached) return cached;

    try {
      const os = await import('os');
      const process = await import('process');

      const cpuUsage = await this.getCpuUsage();
      const memory = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      const health: SystemHealth = {
        cpu: {
          usage: cpuUsage,
          cores: os.cpus().length,
          loadAverage: os.loadavg(),
        },
        memory: {
          used: usedMemory,
          total: totalMemory,
          free: freeMemory,
          usage: (usedMemory / totalMemory) * 100,
        },
        disk: {
          used: 0, // Would need additional library for disk usage
          total: 0,
          free: 0,
          usage: 0,
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };

      await cache.set(cacheKey, health, this.CACHE_TTL);
      return health;
    } catch (error) {
      logger.error('Failed to get system health', { error });
      throw error;
    }
  }

  private async getCpuUsage(): Promise<number> {
    const os = await import('os');
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    return 100 - Math.round((100 * totalIdle) / totalTick);
  }

  // Response Time Monitoring
  async getResponseTimeMetrics(): Promise<ResponseTimeMetrics> {
    const cacheKey = 'monitoring:response_time';
    const cached = await cache.get<ResponseTimeMetrics>(cacheKey);
    if (cached) return cached;

    try {
      const times = this.responseTimeBuffer.length > 0 ? this.responseTimeBuffer : [0];
      const sorted = [...times].sort((a, b) => a - b);

      const metrics: ResponseTimeMetrics = {
        average: times.reduce((a, b) => a + b, 0) / times.length,
        p50: this.percentile(sorted, 0.5),
        p95: this.percentile(sorted, 0.95),
        p99: this.percentile(sorted, 0.99),
        max: Math.max(...times),
        min: Math.min(...times),
        count: times.length,
        timestamp: new Date().toISOString(),
      };

      await cache.set(cacheKey, metrics, this.CACHE_TTL);
      return metrics;
    } catch (error) {
      logger.error('Failed to get response time metrics', { error });
      throw error;
    }
  }

  recordResponseTime(duration: number): void {
    this.responseTimeBuffer.push(duration);
    if (this.responseTimeBuffer.length > this.BUFFER_SIZE) {
      this.responseTimeBuffer.shift();
    }
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  // Sales Metrics
  async getSalesMetrics(period: string = '24h'): Promise<SalesMetrics> {
    const cacheKey = `monitoring:sales_metrics:${period}`;
    const cached = await cache.get<SalesMetrics>(cacheKey);
    if (cached) return cached;

    try {
      const supabase = createServerClient();
      const now = new Date();
      const startDate = this.getPeriodStartDate(period, now);

      // Get current period data
      const { data: currentData, error: currentError } = await supabase
        .from('purchases')
        .select(`
          id,
          amount,
          created_at,
          products!inner(title, price)
        `)
        .eq('is_active', true)
        .gte('created_at', startDate.toISOString());

      if (currentError) throw currentError;

      // Get previous period data for growth calculation
      const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
      const { data: previousData, error: previousError } = await supabase
        .from('purchases')
        .select('id, amount')
        .eq('is_active', true)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      if (previousError) throw previousError;

      const currentRevenue = currentData?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
      const currentOrders = currentData?.length || 0;
      const previousRevenue = previousData?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
      const previousOrders = previousData?.length || 0;

      const metrics: SalesMetrics = {
        totalRevenue: currentRevenue,
        totalOrders: currentOrders,
        averageOrderValue: currentOrders > 0 ? currentRevenue / currentOrders : 0,
        conversionRate: 0, // Would need view data to calculate
        revenueGrowth: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
        ordersGrowth: previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0,
        period,
        timestamp: new Date().toISOString(),
      };

      await cache.set(cacheKey, metrics, this.CACHE_TTL);
      return metrics;
    } catch (error) {
      logger.error('Failed to get sales metrics', { error });
      throw error;
    }
  }

  // Payment Metrics
  async getPaymentMetrics(period: string = '24h'): Promise<PaymentMetrics> {
    const cacheKey = `monitoring:payment_metrics:${period}`;
    const cached = await cache.get<PaymentMetrics>(cacheKey);
    if (cached) return cached;

    try {
      const supabase = createServerClient();
      const now = new Date();
      const startDate = this.getPeriodStartDate(period, now);

      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, provider, status, amount, created_at')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const totalTransactions = payments?.length || 0;
      const successfulTransactions = payments?.filter((p: any) => p.status === 'succeeded').length || 0;
      const failedTransactions = payments?.filter((p: any) => p.status === 'failed').length || 0;

      const byProvider = payments?.reduce((acc: any, payment: any) => {
        const provider = payment.provider as 'stripe' | 'yookassa' | 'crypto';
        if (!acc[provider]) {
          acc[provider] = {
            successRate: 0,
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            averageProcessingTime: 0,
            revenue: 0,
          };
        }
        acc[provider].totalTransactions++;
        if (payment.status === 'succeeded') {
          acc[provider].successfulTransactions++;
          acc[provider].revenue += Number(payment.amount);
        } else if (payment.status === 'failed') {
          acc[provider].failedTransactions++;
        }
        return acc;
      }, {} as Record<string, any>) || {};

      // Calculate success rates
      Object.values(byProvider).forEach((provider: any) => {
        provider.successRate = provider.totalTransactions > 0 
          ? (provider.successfulTransactions / provider.totalTransactions) * 100 
          : 0;
      });

      const metrics: PaymentMetrics = {
        successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
        failureRate: totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0,
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        averageProcessingTime: 0, // Would need processing time data
        byProvider: {
          stripe: byProvider.stripe || this.getEmptyProviderMetrics(),
          yookassa: byProvider.yookassa || this.getEmptyProviderMetrics(),
          crypto: byProvider.crypto || this.getEmptyProviderMetrics(),
        },
        timestamp: new Date().toISOString(),
      };

      await cache.set(cacheKey, metrics, this.CACHE_TTL);
      return metrics;
    } catch (error) {
      logger.error('Failed to get payment metrics', { error });
      throw error;
    }
  }

  private getEmptyProviderMetrics() {
    return {
      successRate: 0,
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      averageProcessingTime: 0,
      revenue: 0,
    };
  }

  // Top Products
  async getTopProducts(limit: number = 10, period: string = '24h'): Promise<TopProduct[]> {
    const cacheKey = `monitoring:top_products:${limit}:${period}`;
    const cached = await cache.get<TopProduct[]>(cacheKey);
    if (cached) return cached;

    try {
      const supabase = createServerClient();
      const now = new Date();
      const startDate = this.getPeriodStartDate(period, now);

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price,
          view_count,
          download_count,
          rating_average,
          rating_count,
          categories(name),
          shops(name, owner_id),
          purchases!inner(id, amount, created_at)
        `)
        .eq('purchases.is_active', true)
        .gte('purchases.created_at', startDate.toISOString())
        .order('purchases.created_at', { ascending: false })
        .limit(limit * 2); // Get more to filter properly

      if (error) throw error;

      const productMap = new Map<string, any>();
      
      data?.forEach((item: any) => {
        const productId = item.id;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            id: item.id,
            title: item.title,
            price: item.price,
            view_count: item.view_count || 0,
            download_count: item.download_count || 0,
            rating_average: item.rating_average || 0,
            rating_count: item.rating_count || 0,
            category: (item.categories as any)?.name || 'Unknown',
            shop_name: (item.shops as any)?.name || 'Unknown',
            sales: 0,
            revenue: 0,
          });
        }
        
        const product = productMap.get(productId);
        product.sales++;
        product.revenue += Number((item.purchases as any)?.amount || 0);
      });

      const topProducts: TopProduct[] = Array.from(productMap.values())
        .map(product => ({
          id: product.id,
          title: product.title,
          shopName: product.shop_name,
          sales: product.sales,
          revenue: product.revenue,
          views: product.view_count,
          conversionRate: product.view_count > 0 ? (product.sales / product.view_count) * 100 : 0,
          rating: product.rating_average,
          category: product.category,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);

      await cache.set(cacheKey, topProducts, this.CACHE_TTL);
      return topProducts;
    } catch (error) {
      logger.error('Failed to get top products', { error });
      throw error;
    }
  }

  // Top Shops
  async getTopShops(limit: number = 10, period: string = '24h'): Promise<TopShop[]> {
    const cacheKey = `monitoring:top_shops:${limit}:${period}`;
    const cached = await cache.get<TopShop[]>(cacheKey);
    if (cached) return cached;

    try {
      const supabase = createServerClient();
      const now = new Date();
      const startDate = this.getPeriodStartDate(period, now);

      const { data, error } = await supabase
        .from('shops')
        .select(`
          id,
          name,
          owner_id,
          users!inner(name),
          products!inner(
            id,
            title,
            rating_average,
            rating_count,
            purchases!inner(id, amount, created_at)
          )
        `)
        .eq('products.purchases.is_active', true)
        .gte('products.purchases.created_at', startDate.toISOString())
        .limit(limit * 2);

      if (error) throw error;

      const shopMap = new Map<string, any>();

      data?.forEach((shop: any) => {
        const shopId = shop.id;
        if (!shopMap.has(shopId)) {
          shopMap.set(shopId, {
            id: shop.id,
            name: shop.name,
            ownerName: (shop.users as any)?.name || 'Unknown',
            totalProducts: 0,
            totalSales: 0,
            totalRevenue: 0,
            totalRating: 0,
            ratingCount: 0,
            totalViews: 0,
          });
        }

        const shopData = shopMap.get(shopId);
        shopData.totalProducts++;

        shop.products?.forEach((product: any) => {
          shopData.totalViews += product.view_count || 0;
          shopData.totalRating += (product.rating_average || 0) * (product.rating_count || 0);
          shopData.ratingCount += product.rating_count || 0;

          product.purchases?.forEach((purchase: any) => {
            shopData.totalSales++;
            shopData.totalRevenue += Number(purchase.amount || 0);
          });
        });
      });

      const topShops: TopShop[] = Array.from(shopMap.values())
        .map(shop => ({
          id: shop.id,
          name: shop.name,
          ownerName: shop.ownerName,
          totalProducts: shop.totalProducts,
          totalSales: shop.totalSales,
          totalRevenue: shop.totalRevenue,
          averageRating: shop.ratingCount > 0 ? shop.totalRating / shop.ratingCount : 0,
          conversionRate: shop.totalViews > 0 ? (shop.totalSales / shop.totalViews) * 100 : 0,
          growthRate: 0, // Would need historical data
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);

      await cache.set(cacheKey, topShops, this.CACHE_TTL);
      return topShops;
    } catch (error) {
      logger.error('Failed to get top shops', { error });
      throw error;
    }
  }

  // User Activity
  async getUserActivity(period: string = '24h'): Promise<UserActivity> {
    const cacheKey = `monitoring:user_activity:${period}`;
    const cached = await cache.get<UserActivity>(cacheKey);
    if (cached) return cached;

    try {
      const supabase = createServerClient();
      const now = new Date();
      const startDate = this.getPeriodStartDate(period, now);

      // Get user counts
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, created_at, last_login_at')
        .gte('created_at', startDate.toISOString());

      if (usersError) throw usersError;

      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, created_at, last_login_at');

      if (allUsersError) throw allUsersError;

      const newUsers = users?.length || 0;
      const totalUsers = allUsers?.length || 0;
      const activeUsers = allUsers?.filter((u: any) => 
        u.last_login_at && new Date(u.last_login_at) >= startDate
      ).length || 0;

      const metrics: UserActivity = {
        totalUsers,
        activeUsers,
        newUsers,
        returningUsers: activeUsers - newUsers,
        userGrowth: 0, // Would need historical data
        averageSessionDuration: 0, // Would need session data
        bounceRate: 0, // Would need analytics data
        timestamp: new Date().toISOString(),
      };

      await cache.set(cacheKey, metrics, this.CACHE_TTL);
      return metrics;
    } catch (error) {
      logger.error('Failed to get user activity', { error });
      throw error;
    }
  }

  // User Activity Heatmap
  async getUserActivityHeatmap(period: string = '7d'): Promise<UserActivityHeatmap[]> {
    const cacheKey = `monitoring:user_activity_heatmap:${period}`;
    const cached = await cache.get<UserActivityHeatmap[]>(cacheKey);
    if (cached) return cached;

    try {
      const supabase = createServerClient();
      const now = new Date();
      const startDate = this.getPeriodStartDate(period, now);

      // This would typically come from analytics data
      // For now, we'll generate sample data
      const heatmap: UserActivityHeatmap[] = [];
      
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          heatmap.push({
            day,
            hour,
            activity: Math.floor(Math.random() * 100),
            users: Math.floor(Math.random() * 50),
          });
        }
      }

      await cache.set(cacheKey, heatmap, this.CACHE_TTL);
      return heatmap;
    } catch (error) {
      logger.error('Failed to get user activity heatmap', { error });
      throw error;
    }
  }

  // Error Metrics
  async getErrorMetrics(period: string = '24h'): Promise<ErrorMetrics> {
    const cacheKey = `monitoring:error_metrics:${period}`;
    const cached = await cache.get<ErrorMetrics>(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const startDate = this.getPeriodStartDate(period, now);

      // Get error logs from Redis or database
      const errorKeys = await redis.keys('logs:error:*');
      const recentErrors: Array<{
        id: string;
        timestamp: string;
        level: string;
        message: string;
        stack?: string;
        endpoint?: string;
        userId?: string;
        correlationId?: string;
        metadata?: any;
      }> = [];
      let totalErrors = 0;
      const errorsByType: Record<string, number> = {};
      const errorsByEndpoint: Record<string, number> = {};

      for (const key of errorKeys.slice(0, 100)) { // Limit to recent errors
        const errorData = await redis.get(key);
        if (errorData) {
          try {
            const error = JSON.parse(errorData);
            if (new Date(error.timestamp) >= startDate) {
              recentErrors.push({
                id: key,
                timestamp: error.timestamp,
                level: error.level,
                message: error.message,
                stack: error.stack,
                endpoint: error.endpoint,
                userId: error.userId,
                correlationId: error.correlationId,
                metadata: error.metadata,
              });

              totalErrors++;
              errorsByType[error.level] = (errorsByType[error.level] || 0) + 1;
              if (error.endpoint) {
                errorsByEndpoint[error.endpoint] = (errorsByEndpoint[error.endpoint] || 0) + 1;
              }
            }
          } catch (parseError) {
            // Skip invalid JSON
          }
        }
      }

      const metrics: ErrorMetrics = {
        totalErrors,
        errorRate: 0, // Would need total requests to calculate
        errorsByType: Object.fromEntries(Object.entries(errorsByType).map(([k, v]) => [k as 'error' | 'warn' | 'info', v])) as any,
        errorsByEndpoint,
        recentErrors: recentErrors.slice(0, 20).map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          level: (['error','warn','info'].includes(e.level) ? e.level : 'error') as 'error' | 'warn' | 'info',
          message: e.message,
          stack: e.stack,
          endpoint: e.endpoint,
          userId: e.userId,
          correlationId: e.correlationId || 'no-correlation-id',
          metadata: e.metadata,
        })),
        timestamp: new Date().toISOString(),
      };

      await cache.set(cacheKey, metrics, this.CACHE_TTL);
      return metrics;
    } catch (error) {
      logger.error('Failed to get error metrics', { error });
      throw error;
    }
  }

  // Get complete dashboard data
  async getDashboardData(period: string = '24h'): Promise<AdminDashboardData> {
    try {
      const [
        systemHealth,
        responseTime,
        salesMetrics,
        paymentMetrics,
        topProducts,
        topShops,
        userActivity,
        userActivityHeatmap,
        errorMetrics,
      ] = await Promise.all([
        this.getSystemHealth(),
        this.getResponseTimeMetrics(),
        this.getSalesMetrics(period),
        this.getPaymentMetrics(period),
        this.getTopProducts(10, period),
        this.getTopShops(10, period),
        this.getUserActivity(period),
        this.getUserActivityHeatmap(period),
        this.getErrorMetrics(period),
      ]);

      return {
        systemHealth,
        responseTime,
        salesMetrics,
        paymentMetrics,
        topProducts,
        topShops,
        userActivity,
        userActivityHeatmap,
        errorMetrics,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get dashboard data', { error });
      throw error;
    }
  }

  // Utility methods
  private getPeriodStartDate(period: string, now: Date): Date {
    const startDate = new Date(now);
    
    switch (period) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 1);
    }
    
    return startDate;
  }

  private startPeriodicCollection(): void {
    // Collect metrics every minute
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Failed to collect metrics', { error });
      }
    }, 60000);
  }

  private async collectMetrics(): Promise<void> {
    // This would collect and store metrics periodically
    // For now, we'll just log that collection is happening
    logger.debug('Collecting monitoring metrics');
  }

  // Record error for monitoring
  recordError(error: any, context?: Record<string, any>): void {
    const errorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message || 'Unknown error',
      stack: error.stack,
      endpoint: context?.endpoint,
      userId: context?.userId,
      correlationId: context?.correlationId || 'no-correlation-id',
      metadata: context,
    };

    // Store in Redis for error metrics
    redis.setex(`logs:error:${errorLog.id}`, 86400 * 7, JSON.stringify(errorLog)); // 7 days retention

    // Add to buffer for real-time monitoring
    this.errorBuffer.push(errorLog);
    if (this.errorBuffer.length > this.BUFFER_SIZE) {
      this.errorBuffer.shift();
    }
  }
}

export const monitoringService = MonitoringService.getInstance();
