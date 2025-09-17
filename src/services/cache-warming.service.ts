import { cacheService, CACHE_KEYS, CACHE_TTL } from '@/lib/cache.service';
import { CachedProductService } from './cached-product.service';
import { CachedAuthService } from './cached-auth.service';
import { CachedShopService } from './cached-shop.service';
import { CachedPaymentService } from './cached-payment.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase';

export interface WarmupConfig {
  products: {
    enabled: boolean;
    popular_limits: number[];
    trending_limits: number[];
    categories: boolean;
  };
  users: {
    enabled: boolean;
    active_user_limit: number;
  };
  shops: {
    enabled: boolean;
    active_shop_limit: number;
    analytics_periods: string[];
  };
  exchange_rates: {
    enabled: boolean;
    currencies: string[];
  };
  search: {
    enabled: boolean;
    popular_queries: string[];
  };
}

export class CacheWarmingService {
  private supabase = createServiceClient();
  private productService = new CachedProductService();
  private authService = new CachedAuthService();
  private shopService = new CachedShopService();
  private paymentService = new CachedPaymentService();

  private defaultConfig: WarmupConfig = {
    products: {
      enabled: true,
      popular_limits: [10, 20, 50, 100],
      trending_limits: [10, 20, 50],
      categories: true,
    },
    users: {
      enabled: true,
      active_user_limit: 100,
    },
    shops: {
      enabled: true,
      active_shop_limit: 50,
      analytics_periods: ['7d', '30d', '90d'],
    },
    exchange_rates: {
      enabled: true,
      currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'RUB', 'BTC', 'ETH'],
    },
    search: {
      enabled: true,
      popular_queries: ['digital', 'software', 'template', 'ebook', 'course', 'design'],
    },
  };

  // =============================================
  // MAIN WARMUP METHODS
  // =============================================

  async warmupAll(config: Partial<WarmupConfig> = {}): Promise<void> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      logger.info('Starting comprehensive cache warmup', { config: finalConfig });

      const startTime = Date.now();
      const results = await Promise.allSettled([
        finalConfig.products.enabled ? this.warmupProducts(finalConfig.products) : Promise.resolve(),
        finalConfig.users.enabled ? this.warmupUsers(finalConfig.users) : Promise.resolve(),
        finalConfig.shops.enabled ? this.warmupShops(finalConfig.shops) : Promise.resolve(),
        finalConfig.exchange_rates.enabled ? this.warmupExchangeRates(finalConfig.exchange_rates) : Promise.resolve(),
        finalConfig.search.enabled ? this.warmupSearch(finalConfig.search) : Promise.resolve(),
      ]);

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      logger.info('Cache warmup completed', {
        duration: `${duration}ms`,
        successCount,
        failureCount,
        totalTasks: results.length,
      });

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logError(result.reason, { action: 'warmup_task_failed', taskIndex: index });
        }
      });
    } catch (error) {
      logError(error as Error, { action: 'warmup_all' });
    }
  }

  async warmupProducts(config: WarmupConfig['products']): Promise<void> {
    try {
      logger.info('Starting product cache warmup', { config });

      const promises: Promise<any>[] = [];

      // Warm up popular products
      for (const limit of config.popular_limits) {
        promises.push(
          this.productService.getPopularProducts(limit).catch(error => {
            logger.warn('Failed to warm up popular products', { limit, error: error.message });
          })
        );
      }

      // Warm up trending products
      for (const limit of config.trending_limits) {
        promises.push(
          this.productService.getTrendingProducts(limit).catch(error => {
            logger.warn('Failed to warm up trending products', { limit, error: error.message });
          })
        );
      }

      // Warm up categories
      if (config.categories) {
        promises.push(
          this.warmupCategories().catch(error => {
            logger.warn('Failed to warm up categories', { error: error.message });
          })
        );
      }

      await Promise.all(promises);
      logger.info('Product cache warmup completed');
    } catch (error) {
      logError(error as Error, { action: 'warmup_products' });
    }
  }

  async warmupUsers(config: WarmupConfig['users']): Promise<void> {
    try {
      logger.info('Starting user cache warmup', { config });

      // Get active users
      const { data: users, error } = await this.supabase
        .from('users')
        .select('id, email, name')
        .eq('is_active', true)
        .order('last_login_at', { ascending: false })
        .limit(config.active_user_limit);

      if (error) {
        logError(error, { action: 'fetch_active_users' });
        return;
      }

      if (!users || users.length === 0) {
        logger.warn('No active users found for warmup');
        return;
      }

      // Warm up user profiles and data
      const promises = users.map(user => 
        this.warmupUserData(user.id).catch(error => {
          logger.warn('Failed to warm up user data', { userId: user.id, error: error.message });
        })
      );

      await Promise.all(promises);
      logger.info('User cache warmup completed', { userCount: users.length });
    } catch (error) {
      logError(error as Error, { action: 'warmup_users' });
    }
  }

  async warmupShops(config: WarmupConfig['shops']): Promise<void> {
    try {
      logger.info('Starting shop cache warmup', { config });

      // Get active shops
      const { data: shops, error } = await this.supabase
        .from('shops')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(config.active_shop_limit);

      if (error) {
        logError(error, { action: 'fetch_active_shops' });
        return;
      }

      if (!shops || shops.length === 0) {
        logger.warn('No active shops found for warmup');
        return;
      }

      // Warm up shop data
      const promises = shops.map(shop => 
        this.warmupShopData(shop.id, config.analytics_periods).catch(error => {
          logger.warn('Failed to warm up shop data', { shopId: shop.id, error: error.message });
        })
      );

      await Promise.all(promises);
      logger.info('Shop cache warmup completed', { shopCount: shops.length });
    } catch (error) {
      logError(error as Error, { action: 'warmup_shops' });
    }
  }

  async warmupExchangeRates(config: WarmupConfig['exchange_rates']): Promise<void> {
    try {
      logger.info('Starting exchange rates warmup', { config });

      const promises = config.currencies.map(currency => 
        this.paymentService.getExchangeRates(currency as any).catch(error => {
          logger.warn('Failed to warm up exchange rates', { currency, error: error.message });
        })
      );

      await Promise.all(promises);
      logger.info('Exchange rates warmup completed', { currencyCount: config.currencies.length });
    } catch (error) {
      logError(error as Error, { action: 'warmup_exchange_rates' });
    }
  }

  async warmupSearch(config: WarmupConfig['search']): Promise<void> {
    try {
      logger.info('Starting search cache warmup', { config });

      const promises = config.popular_queries.map(query => 
        this.warmupSearchQuery(query).catch(error => {
          logger.warn('Failed to warm up search query', { query, error: error.message });
        })
      );

      await Promise.all(promises);
      logger.info('Search cache warmup completed', { queryCount: config.popular_queries.length });
    } catch (error) {
      logError(error as Error, { action: 'warmup_search' });
    }
  }

  // =============================================
  // SPECIFIC WARMUP METHODS
  // =============================================

  private async warmupCategories(): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.categories();
      
      // Check if already cached
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return;
      }

      // Fetch categories from database
      const { data: categories, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        logError(error, { action: 'fetch_categories' });
        return;
      }

      // Cache categories
      await cacheService.set(cacheKey, categories || [], CACHE_TTL.CATEGORIES);
      logger.info('Categories warmed up', { count: categories?.length || 0 });
    } catch (error) {
      logError(error as Error, { action: 'warmup_categories' });
    }
  }

  private async warmupUserData(userId: string): Promise<void> {
    try {
      // Warm up user profile
      await this.authService.getUserProfile(userId);
      
      // Warm up user purchases (first page)
      await this.authService.getUserPurchases(userId, 1, 20);
      
      // Warm up user favorites
      await this.authService.getUserFavorites(userId);
      
      logger.info('User data warmed up', { userId });
    } catch (error) {
      logError(error as Error, { action: 'warmup_user_data', userId });
    }
  }

  private async warmupShopData(shopId: string, periods: string[]): Promise<void> {
    try {
      // Warm up shop details
      await this.shopService.getShop(shopId);
      
      // Warm up shop analytics for different periods
      for (const period of periods) {
        await this.shopService.getShopAnalytics(shopId, period);
      }
      
      // Warm up shop products (first page)
      await this.shopService.getShopProducts(shopId, 1, 20);
      
      // Warm up shop stats
      await this.shopService.getShopStats(shopId);
      
      logger.info('Shop data warmed up', { shopId, periods });
    } catch (error) {
      logError(error as Error, { action: 'warmup_shop_data', shopId });
    }
  }

  private async warmupSearchQuery(query: string): Promise<void> {
    try {
      // Warm up search results for popular queries
      await this.productService.searchProducts({
        filters: {
          query,
          page: 1,
          limit: 20,
        },
        user_id: undefined,
        include_facets: false,
      });
      
      logger.info('Search query warmed up', { query });
    } catch (error) {
      logError(error as Error, { action: 'warmup_search_query', query });
    }
  }

  // =============================================
  // SCHEDULED WARMUP
  // =============================================

  async scheduleWarmup(): Promise<void> {
    try {
      // Schedule different warmup tasks at different intervals
      const schedules = [
        { interval: 5 * 60 * 1000, task: () => this.warmupProducts(this.defaultConfig.products) }, // Every 5 minutes
        { interval: 15 * 60 * 1000, task: () => this.warmupExchangeRates(this.defaultConfig.exchange_rates) }, // Every 15 minutes
        { interval: 30 * 60 * 1000, task: () => this.warmupShops(this.defaultConfig.shops) }, // Every 30 minutes
        { interval: 60 * 60 * 1000, task: () => this.warmupUsers(this.defaultConfig.users) }, // Every hour
        { interval: 2 * 60 * 60 * 1000, task: () => this.warmupSearch(this.defaultConfig.search) }, // Every 2 hours
      ];

      schedules.forEach(({ interval, task }) => {
        setInterval(async () => {
          try {
            await task();
          } catch (error) {
            logError(error as Error, { action: 'scheduled_warmup' });
          }
        }, interval);
      });

      logger.info('Cache warmup scheduled', { scheduleCount: schedules.length });
    } catch (error) {
      logError(error as Error, { action: 'schedule_warmup' });
    }
  }

  // =============================================
  // CACHE HEALTH MONITORING
  // =============================================

  async monitorCacheHealth(): Promise<{
    healthy: boolean;
    stats: any;
    recommendations: string[];
  }> {
    try {
      const stats = await cacheService.getCacheStats();
      const health = await cacheService.healthCheck();
      
      const recommendations: string[] = [];
      
      // Check memory usage
      if (stats.memory_usage.includes('MB') && parseInt(stats.memory_usage) > 100) {
        recommendations.push('Consider increasing Redis memory or implementing cache eviction policies');
      }
      
      // Check key count
      if (stats.total_keys > 10000) {
        recommendations.push('High number of cache keys detected. Consider implementing key expiration policies');
      }
      
      // Check hit rate (if available)
      if (stats.hit_rate < 0.8) {
        recommendations.push('Low cache hit rate detected. Consider reviewing cache strategies');
      }

      return {
        healthy: health.healthy,
        stats,
        recommendations,
      };
    } catch (error) {
      logError(error as Error, { action: 'monitor_cache_health' });
      return {
        healthy: false,
        stats: {},
        recommendations: ['Cache health monitoring failed'],
      };
    }
  }

  // =============================================
  // CACHE CLEANUP
  // =============================================

  async cleanupExpiredCaches(): Promise<void> {
    try {
      logger.info('Starting cache cleanup');

      // This would implement cleanup of expired caches
      // Redis handles TTL automatically, but we can clean up orphaned keys
      
      logger.info('Cache cleanup completed');
    } catch (error) {
      logError(error as Error, { action: 'cleanup_expired_caches' });
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  async getWarmupStatus(): Promise<{
    last_warmup: string;
    next_warmup: string;
    active_tasks: number;
    config: WarmupConfig;
  }> {
    try {
      // This would track warmup status
      return {
        last_warmup: new Date().toISOString(),
        next_warmup: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
        active_tasks: 0,
        config: this.defaultConfig,
      };
    } catch (error) {
      logError(error as Error, { action: 'get_warmup_status' });
      return {
        last_warmup: 'Unknown',
        next_warmup: 'Unknown',
        active_tasks: 0,
        config: this.defaultConfig,
      };
    }
  }

  async updateConfig(newConfig: Partial<WarmupConfig>): Promise<void> {
    try {
      this.defaultConfig = { ...this.defaultConfig, ...newConfig };
      logger.info('Warmup configuration updated', { config: this.defaultConfig });
    } catch (error) {
      logError(error as Error, { action: 'update_warmup_config' });
    }
  }

  // Public methods for cache refresh operations
  async refreshExchangeRates(baseCurrency?: string): Promise<void> {
    if (baseCurrency) {
      await this.paymentService.refreshExchangeRates(baseCurrency as any);
    } else {
      await this.paymentService.refreshAllExchangeRates();
    }
  }

  async refreshShopAnalytics(shopId: string, period: string): Promise<void> {
    await this.shopService.refreshAnalyticsCache(shopId, period);
  }

  async refreshShopSales(shopId: string, period: string): Promise<void> {
    await this.shopService.refreshSalesCache(shopId, period);
  }
}

// Export singleton instance
export const cacheWarmingService = new CacheWarmingService();
