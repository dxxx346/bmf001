import redis, { cache, cacheKeys } from './redis';
import { logError, defaultLogger as logger } from './logger';

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  PRODUCT_LISTINGS: 5 * 60, // 5 minutes
  USER_SESSIONS: 24 * 60 * 60, // 24 hours
  SHOP_ANALYTICS: 60 * 60, // 1 hour
  SEARCH_RESULTS: 10 * 60, // 10 minutes
  RECOMMENDATIONS: 30 * 60, // 30 minutes
  EXCHANGE_RATES: 60 * 60, // 1 hour
  CATEGORIES: 60 * 60, // 1 hour
  POPULAR_PRODUCTS: 15 * 60, // 15 minutes
  USER_PROFILE: 30 * 60, // 30 minutes
  SHOP_DETAILS: 30 * 60, // 30 minutes
} as const;

// Cache key generators
export const CACHE_KEYS = {
  // Product listings
  productList: (filters: string) => `products:list:${filters}`,
  productDetails: (id: string) => `product:${id}`,
  productRecommendations: (userId: string, productId?: string) => 
    productId ? `recommendations:${userId}:${productId}` : `recommendations:${userId}`,
  
  // User sessions
  userSession: (sessionId: string) => `session:${sessionId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userPurchases: (userId: string, page: number = 1) => `user:purchases:${userId}:${page}`,
  userFavorites: (userId: string) => `user:favorites:${userId}`,
  
  // Shop analytics
  shopAnalytics: (shopId: string, period: string) => `shop:analytics:${shopId}:${period}`,
  shopSales: (shopId: string, period: string, page: number = 1) => `shop:sales:${shopId}:${period}:${page}`,
  shopDetails: (shopId: string) => `shop:${shopId}`,
  shopProducts: (shopId: string, page: number = 1) => `shop:products:${shopId}:${page}`,
  
  // Search results
  searchResults: (query: string, filters: string) => `search:${query}:${filters}`,
  searchFacets: (filters: string) => `search:facets:${filters}`,
  
  // Exchange rates
  exchangeRate: (from: string, to: string) => `exchange:${from}:${to}`,
  exchangeRates: (base: string) => `exchange:rates:${base}`,
  
  // Categories and popular items
  categories: () => 'categories:all',
  popularProducts: (limit: number) => `popular:products:${limit}`,
  trendingProducts: (limit: number) => `trending:products:${limit}`,
  
  // Cache warming
  cacheWarmup: (type: string) => `warmup:${type}`,
} as const;

export class CacheService {
  private redis = redis;

  // =============================================
  // CORE CACHE OPERATIONS
  // =============================================

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await cache.get<T>(key);
      if (value) {
        logger.info('Cache hit', { key });
      }
      return value;
    } catch (error) {
      logError(error as Error, { action: 'cache_get', key });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      await cache.setWithTTL(key, value, ttl);
      logger.info('Cache set', { key, ttl });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'cache_set', key, ttl });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await cache.del(key);
      logger.info('Cache deleted', { key });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'cache_del', key });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await cache.exists(key);
    } catch (error) {
      logError(error as Error, { action: 'cache_exists', key });
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await cache.mget(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      logError(error as Error, { action: 'cache_mget', keys });
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Record<string, T>, ttl: number): Promise<boolean> {
    try {
      const args: string[] = [];
      for (const [key, value] of Object.entries(keyValuePairs)) {
        args.push(key, JSON.stringify(value));
      }
      await this.redis.mset(...args);
      
      // Set TTL for all keys
      const pipeline = this.redis.pipeline();
      for (const key of Object.keys(keyValuePairs)) {
        pipeline.expire(key, ttl);
      }
      await pipeline.exec();
      
      logger.info('Cache mset', { keyCount: Object.keys(keyValuePairs).length, ttl });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'cache_mset', keyCount: Object.keys(keyValuePairs).length });
      return false;
    }
  }

  // =============================================
  // PATTERN-BASED CACHE OPERATIONS
  // =============================================

  async getPattern(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      logError(error as Error, { action: 'cache_get_pattern', pattern });
      return [];
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.getPattern(pattern);
      if (keys.length === 0) return 0;
      
      const deleted = await this.redis.del(...keys);
      logger.info('Cache pattern deleted', { pattern, deletedCount: deleted });
      return deleted;
    } catch (error) {
      logError(error as Error, { action: 'cache_del_pattern', pattern });
      return 0;
    }
  }

  // =============================================
  // CACHE INVALIDATION
  // =============================================

  async invalidateProduct(productId: string): Promise<void> {
    try {
      const patterns = [
        `product:${productId}`,
        'products:list:*',
        'popular:products:*',
        'trending:products:*',
        'recommendations:*',
        'search:*',
      ];

      for (const pattern of patterns) {
        await this.delPattern(pattern);
      }

      logger.info('Product cache invalidated', { productId });
    } catch (error) {
      logError(error as Error, { action: 'invalidate_product', productId });
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    try {
      const patterns = [
        `user:profile:${userId}`,
        `user:purchases:${userId}:*`,
        `user:favorites:${userId}`,
        `session:*`, // Will need session mapping
        `recommendations:${userId}:*`,
      ];

      for (const pattern of patterns) {
        await this.delPattern(pattern);
      }

      logger.info('User cache invalidated', { userId });
    } catch (error) {
      logError(error as Error, { action: 'invalidate_user', userId });
    }
  }

  async invalidateShop(shopId: string): Promise<void> {
    try {
      const patterns = [
        `shop:${shopId}`,
        `shop:analytics:${shopId}:*`,
        `shop:sales:${shopId}:*`,
        `shop:products:${shopId}:*`,
        'products:list:*', // Shop products might be in general listings
      ];

      for (const pattern of patterns) {
        await this.delPattern(pattern);
      }

      logger.info('Shop cache invalidated', { shopId });
    } catch (error) {
      logError(error as Error, { action: 'invalidate_shop', shopId });
    }
  }

  async invalidateSearch(): Promise<void> {
    try {
      const patterns = [
        'search:*',
        'search:facets:*',
      ];

      for (const pattern of patterns) {
        await this.delPattern(pattern);
      }

      logger.info('Search cache invalidated');
    } catch (error) {
      logError(error as Error, { action: 'invalidate_search' });
    }
  }

  async invalidateRecommendations(): Promise<void> {
    try {
      await this.delPattern('recommendations:*');
      logger.info('Recommendations cache invalidated');
    } catch (error) {
      logError(error as Error, { action: 'invalidate_recommendations' });
    }
  }

  // =============================================
  // CACHE WARMING
  // =============================================

  async warmupCache(type: 'products' | 'categories' | 'popular' | 'trending' | 'exchange_rates'): Promise<void> {
    try {
      const warmupKey = CACHE_KEYS.cacheWarmup(type);
      const isWarming = await this.exists(warmupKey);
      
      if (isWarming) {
        logger.info('Cache warmup already in progress', { type });
        return;
      }

      // Mark warmup as in progress
      await this.set(warmupKey, { started_at: new Date().toISOString() }, 300); // 5 minutes

      switch (type) {
        case 'products':
          await this.warmupProducts();
          break;
        case 'categories':
          await this.warmupCategories();
          break;
        case 'popular':
          await this.warmupPopularProducts();
          break;
        case 'trending':
          await this.warmupTrendingProducts();
          break;
        case 'exchange_rates':
          await this.warmupExchangeRates();
          break;
      }

      // Remove warmup marker
      await this.del(warmupKey);
      logger.info('Cache warmup completed', { type });
    } catch (error) {
      logError(error as Error, { action: 'warmup_cache', type });
      await this.del(CACHE_KEYS.cacheWarmup(type));
    }
  }

  private async warmupProducts(): Promise<void> {
    // This would be implemented by the ProductService
    // For now, we'll just log the action
    logger.info('Warming up products cache');
  }

  private async warmupCategories(): Promise<void> {
    // This would be implemented by the CategoryService
    logger.info('Warming up categories cache');
  }

  private async warmupPopularProducts(): Promise<void> {
    // This would be implemented by the ProductService
    logger.info('Warming up popular products cache');
  }

  private async warmupTrendingProducts(): Promise<void> {
    // This would be implemented by the ProductService
    logger.info('Warming up trending products cache');
  }

  private async warmupExchangeRates(): Promise<void> {
    // This would be implemented by the PaymentService
    logger.info('Warming up exchange rates cache');
  }

  // =============================================
  // CACHE STATISTICS
  // =============================================

  async getCacheStats(): Promise<{
    total_keys: number;
    memory_usage: string;
    hit_rate: number;
    miss_rate: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Parse Redis info (simplified)
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : '0B';
      
      const dbMatch = keyspace.match(/db0:keys=(\d+)/);
      const totalKeys = dbMatch ? parseInt(dbMatch[1]) : 0;

      return {
        total_keys: totalKeys,
        memory_usage: memoryUsage,
        hit_rate: 0, // Would need to track this separately
        miss_rate: 0, // Would need to track this separately
      };
    } catch (error) {
      logError(error as Error, { action: 'get_cache_stats' });
      return {
        total_keys: 0,
        memory_usage: '0B',
        hit_rate: 0,
        miss_rate: 0,
      };
    }
  }

  // =============================================
  // CACHE HEALTH CHECK
  // =============================================

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T | null> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch and store
      const data = await fetcher();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      logError(error as Error, { action: 'get_or_set', key });
      return null;
    }
  }

  async refreshCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T | null> {
    try {
      // Delete existing cache
      await this.del(key);
      
      // Fetch fresh data and store
      const data = await fetcher();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      logError(error as Error, { action: 'refresh_cache', key });
      return null;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
