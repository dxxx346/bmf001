import { ShopService } from './shop.service';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '@/lib/cache.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase';
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

export class CachedShopService extends ShopService {
  private dbClient = createServiceClient();

  // =============================================
  // CACHED SHOP OPERATIONS
  // =============================================

  async getShop(shopId: string): Promise<Shop | null> {
    try {
      const cacheKey = CACHE_KEYS.shopDetails(shopId);
      
      // Try cache first
      const cached = await cacheService.get<Shop>(cacheKey);
      if (cached) {
        logger.info('Shop details cache hit', { shopId });
        return cached;
      }

      // Fetch from database
      const shop = await super.getShop(shopId);
      if (shop) {
        // Cache the result
        await cacheService.set(cacheKey, shop, CACHE_TTL.SHOP_DETAILS);
        logger.info('Shop details cached', { shopId });
      }

      return shop;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_shop', shopId });
      return null;
    }
  }

  async getShopBySlug(slug: string): Promise<Shop | null> {
    try {
      const cacheKey = `shop:slug:${slug}`;
      
      // Try cache first
      const cached = await cacheService.get<Shop>(cacheKey);
      if (cached) {
        logger.info('Shop by slug cache hit', { slug });
        return cached;
      }

      // Fetch from database
      const shop = await super.getShopBySlug(slug);
      if (shop) {
        // Cache the result
        await cacheService.set(cacheKey, shop, CACHE_TTL.SHOP_DETAILS);
        logger.info('Shop by slug cached', { slug });
      }

      return shop;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_shop_by_slug', slug });
      return null;
    }
  }

  async getShopAnalytics(shopId: string, period: string = '30d'): Promise<ShopAnalytics | null> {
    try {
      const cacheKey = CACHE_KEYS.shopAnalytics(shopId, period);
      
      // Try cache first
      const cached = await cacheService.get<ShopAnalytics>(cacheKey);
      if (cached) {
        logger.info('Shop analytics cache hit', { shopId, period });
        return cached;
      }

      // Fetch from database
      const analytics = await super.getShopAnalytics(shopId, period);
      if (analytics) {
        // Cache the result
        await cacheService.set(cacheKey, analytics, CACHE_TTL.SHOP_ANALYTICS);
        logger.info('Shop analytics cached', { shopId, period });
      }

      return analytics;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_shop_analytics', shopId, period });
      return null;
    }
  }

  async getShopSales(shopId: string, params: PaginationParams & { period?: string }): Promise<ShopSales | null> {
    try {
      const { page = 1, period = '30d' } = params;
      const cacheKey = CACHE_KEYS.shopSales(shopId, period, page);
      
      // Try cache first
      const cached = await cacheService.get<ShopSales>(cacheKey);
      if (cached) {
        logger.info('Shop sales cache hit', { shopId, period, page });
        return cached;
      }

      // Fetch from database
      const sales = await super.getShopSales(shopId, params);
      if (sales) {
        // Cache the result
        await cacheService.set(cacheKey, sales, CACHE_TTL.SHOP_ANALYTICS);
        logger.info('Shop sales cached', { shopId, period, page });
      }

      return sales;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_shop_sales', shopId, params });
      return null;
    }
  }

  async getShopProducts(shopId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const cacheKey = CACHE_KEYS.shopProducts(shopId, page);
      
      // Try cache first
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        logger.info('Shop products cache hit', { shopId, page });
        return cached;
      }

      // Fetch from database
      const products = await this.fetchShopProducts(shopId, page, limit);
      
      // Cache the result
      await cacheService.set(cacheKey, products, CACHE_TTL.PRODUCT_LISTINGS);
      logger.info('Shop products cached', { shopId, page });

      return products;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_shop_products', shopId, page });
      return { products: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  }

  async getShopStats(shopId: string): Promise<any> {
    try {
      const cacheKey = `shop:stats:${shopId}`;
      
      // Try cache first
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        logger.info('Shop stats cache hit', { shopId });
        return cached;
      }

      // Fetch from database
      const stats = await this.fetchShopStats(shopId);
      
      // Cache the result
      await cacheService.set(cacheKey, stats, CACHE_TTL.SHOP_ANALYTICS);
      logger.info('Shop stats cached', { shopId });

      return stats;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_shop_stats', shopId });
      return null;
    }
  }

  // =============================================
  // CACHE INVALIDATION ON UPDATES
  // =============================================

  async createShop(request: CreateShopRequest, ownerId: string): Promise<{ success: boolean; shop?: Shop; error?: string }> {
    const result = await super.createShop(request, ownerId);
    
    if (result.success && result.shop) {
      // Invalidate shop caches
      await this.invalidateShopCaches(result.shop.id);
      logger.info('Shop caches invalidated after creation', { shopId: result.shop.id });
    }

    return result;
  }

  async updateShop(shopId: string, request: UpdateShopRequest, ownerId: string): Promise<{ success: boolean; shop?: Shop; error?: string }> {
    const result = await super.updateShop(shopId, request, ownerId);
    
    if (result.success) {
      // Invalidate shop caches
      await this.invalidateShopCaches(shopId);
      logger.info('Shop caches invalidated after update', { shopId });
    }

    return result;
  }

  async deleteShop(shopId: string, ownerId: string): Promise<{ success: boolean; error?: string }> {
    const result = await super.deleteShop(shopId, ownerId);
    
    if (result.success) {
      // Invalidate shop caches
      await this.invalidateShopCaches(shopId);
      logger.info('Shop caches invalidated after deletion', { shopId });
    }

    return result;
  }

  // =============================================
  // CACHE WARMING
  // =============================================

  async warmupShopCaches(): Promise<void> {
    try {
      logger.info('Starting shop cache warmup');

      // This would typically warm up frequently accessed shop data
      // For now, we'll just log the action
      logger.info('Shop cache warmup completed');
    } catch (error) {
      logError(error as Error, { action: 'warmup_shop_caches' });
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private async invalidateShopCaches(shopId: string): Promise<void> {
    try {
      // Invalidate shop-specific caches
      await cacheService.invalidateShop(shopId);
      
      // Invalidate shop details cache
      await cacheService.del(CACHE_KEYS.shopDetails(shopId));
      
      // Invalidate shop analytics caches
      await cacheService.delPattern(`shop:analytics:${shopId}:*`);
      
      // Invalidate shop sales caches
      await cacheService.delPattern(`shop:sales:${shopId}:*`);
      
      // Invalidate shop products caches
      await cacheService.delPattern(`shop:products:${shopId}:*`);
      
      // Invalidate shop stats cache
      await cacheService.del(`shop:stats:${shopId}`);
      
      // Invalidate shop by slug cache
      await cacheService.delPattern('shop:slug:*');
    } catch (error) {
      logError(error as Error, { action: 'invalidate_shop_caches', shopId });
    }
  }

  private async fetchShopProducts(shopId: string, page: number, limit: number): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      const { data: products, error, count } = await this.dbClient
        .from('products')
        .select(`
          *,
          files:product_files(*),
          images:product_images(*),
          stats:product_stats(*)
        `, { count: 'exact' })
        .eq('shop_id', shopId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logError(error, { action: 'fetch_shop_products', shopId });
        return { products: [], total: 0, page, limit, totalPages: 0 };
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        products: products || [],
        total: count || 0,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logError(error as Error, { action: 'fetch_shop_products', shopId });
      return { products: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  private async fetchShopStats(shopId: string): Promise<any> {
    try {
      // Get basic shop statistics
      const { data: productCount } = await this.dbClient
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .eq('status', 'active');

      const { data: totalRevenue } = await this.dbClient
        .from('purchases')
        .select(`
          payment:payments!inner(
            amount,
            status
          )
        `)
        .eq('product.shop_id', shopId)
        .eq('payment.status', 'succeeded');

      const revenue = totalRevenue?.reduce((sum: number, purchase: any) => {
        const payments = purchase.payment as { amount: number; status: string }[] | null;
        const totalPaymentAmount = payments?.reduce((paymentSum: number, payment) => paymentSum + (payment?.amount || 0), 0) || 0;
        return sum + totalPaymentAmount;
      }, 0) || 0;

      return {
        total_products: productCount || 0,
        total_revenue: revenue,
        currency: 'USD',
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      logError(error as Error, { action: 'fetch_shop_stats', shopId });
      return null;
    }
  }

  // =============================================
  // ANALYTICS CACHE MANAGEMENT
  // =============================================

  async refreshAnalyticsCache(shopId: string, period: string = '30d'): Promise<void> {
    try {
      // Remove existing cache
      await cacheService.del(CACHE_KEYS.shopAnalytics(shopId, period));
      
      // Fetch fresh data and cache it
      const analytics = await super.getShopAnalytics(shopId, period);
      if (analytics) {
        await cacheService.set(
          CACHE_KEYS.shopAnalytics(shopId, period),
          analytics,
          CACHE_TTL.SHOP_ANALYTICS
        );
        logger.info('Analytics cache refreshed', { shopId, period });
      }
    } catch (error) {
      logError(error as Error, { action: 'refresh_analytics_cache', shopId, period });
    }
  }

  async refreshSalesCache(shopId: string, period: string = '30d', page: number = 1): Promise<void> {
    try {
      // Remove existing cache
      await cacheService.del(CACHE_KEYS.shopSales(shopId, period, page));
      
      // Fetch fresh data and cache it
      const sales = await super.getShopSales(shopId, { page, period });
      if (sales) {
        await cacheService.set(
          CACHE_KEYS.shopSales(shopId, period, page),
          sales,
          CACHE_TTL.SHOP_ANALYTICS
        );
        logger.info('Sales cache refreshed', { shopId, period, page });
      }
    } catch (error) {
      logError(error as Error, { action: 'refresh_sales_cache', shopId, period, page });
    }
  }

  // =============================================
  // BULK CACHE OPERATIONS
  // =============================================

  async warmupShopAnalytics(shopIds: string[]): Promise<void> {
    try {
      logger.info('Starting shop analytics warmup', { shopCount: shopIds.length });

      const periods = ['7d', '30d', '90d'];
      const promises: Promise<void>[] = [];

      for (const shopId of shopIds) {
        for (const period of periods) {
          promises.push(
            this.getShopAnalytics(shopId, period).then(() => {
              logger.info('Shop analytics warmed up', { shopId, period });
            })
          );
        }
      }

      await Promise.all(promises);
      logger.info('Shop analytics warmup completed', { shopCount: shopIds.length });
    } catch (error) {
      logError(error as Error, { action: 'warmup_shop_analytics' });
    }
  }

  async invalidateAllShopCaches(): Promise<void> {
    try {
      // Invalidate all shop-related caches
      await cacheService.delPattern('shop:*');
      await cacheService.delPattern('analytics:shop:*');
      
      logger.info('All shop caches invalidated');
    } catch (error) {
      logError(error as Error, { action: 'invalidate_all_shop_caches' });
    }
  }
}
