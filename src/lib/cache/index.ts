/**
 * Cache Module Index
 * Central exports for all caching functionality
 */

// Core cache service
export {
  RedisCacheService,
  redisCache,
  cache,
  type CacheOptions,
  type CacheMetrics,
  type CacheEntry,
  type LockOptions,
  type TTLStrategy
} from './redis-cache'

// Cache strategies and patterns
export {
  CacheStrategies,
  ProductCacheManager,
  UserCacheManager,
  AnalyticsCacheManager,
  CacheMiddleware,
  Cached,
  InvalidateCache,
  type CacheStrategy
} from './cache-strategies'

// Cache integration layer
export {
  CacheIntegration,
  cacheIntegration,
  CacheHooks,
  CacheEventHandlers,
  CacheMonitoring
} from './cache-integration'

// Cache warmup service
export {
  CacheWarmupService,
  cacheWarmupService,
  type WarmupConfig,
  type WarmupResult
} from './cache-warmup'

// Convenience exports for common operations
export const cacheOperations = {
  // Basic operations
  get: cache.get,
  set: cache.set,
  delete: cache.delete,
  flush: cache.flush,
  getOrSet: cache.getOrSet,

  // Advanced operations
  invalidateByTags: cache.invalidateByTags,
  invalidateRelated: cache.invalidateRelated,
  acquireLock: cache.acquireLock,
  warmCache: cache.warmCache,

  // Monitoring
  getMetrics: cache.getMetrics,
  healthCheck: cache.healthCheck
}

// Cache constants
export const CACHE_CONSTANTS = {
  TTL: {
    PRODUCTS: 300,     // 5 minutes
    USERS: 60,         // 1 minute
    STATIC: 3600,      // 1 hour
    ANALYTICS: 600,    // 10 minutes
    SESSIONS: 1800,    // 30 minutes
    TEMPORARY: 30      // 30 seconds
  },
  
  PREFIXES: {
    PRODUCT: 'product',
    PRODUCTS: 'products',
    USER: 'user',
    DASHBOARD: 'dashboard',
    SEARCH: 'search',
    ANALYTICS: 'analytics',
    CATEGORIES: 'categories',
    SETTINGS: 'settings'
  },

  TAGS: {
    PRODUCTS: 'products',
    USERS: 'users',
    STATIC: 'static',
    ANALYTICS: 'analytics',
    SEARCH: 'search',
    DASHBOARDS: 'dashboards'
  }
}

// Cache utilities
export const cacheUtils = {
  /**
   * Create a cache key with prefix
   */
  createKey: (prefix: string, ...parts: string[]) => {
    return [prefix, ...parts].join(':')
  },

  /**
   * Hash object for cache key
   */
  hashObject: (obj: any): string => {
    try {
      const sorted = Object.keys(obj)
        .sort()
        .reduce((result, key) => {
          result[key] = obj[key]
          return result
        }, {} as any)

      return Buffer.from(JSON.stringify(sorted)).toString('base64').substring(0, 16)
    } catch (error) {
      return 'default'
    }
  },

  /**
   * Generate tags for entity
   */
  generateTags: (entityType: string, entityId: string, ...additionalTags: string[]) => {
    return [entityType, `${entityType}:${entityId}`, ...additionalTags]
  },

  /**
   * Get TTL for strategy
   */
  getTTL: (strategy: TTLStrategy): number => {
    return CACHE_CONSTANTS.TTL[strategy.toUpperCase() as keyof typeof CACHE_CONSTANTS.TTL] || CACHE_CONSTANTS.TTL.TEMPORARY
  }
}

// Default export with all functionality
const CacheSystem = {
  // Services
  redisCache,
  cache,
  cacheIntegration,
  cacheWarmupService,

  // Managers
  ProductCacheManager,
  UserCacheManager,
  AnalyticsCacheManager,

  // Strategies
  CacheStrategies,

  // Operations
  cacheOperations,

  // Utilities
  cacheUtils,

  // Constants
  CACHE_CONSTANTS,

  // Monitoring
  CacheMonitoring
};

export default CacheSystem;
