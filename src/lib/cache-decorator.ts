import { cache, cacheKeys, redis } from './redis';
import logger from './logger';

// Cache decorator options
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (...args: any[]) => string; // Custom key generator
  skipCache?: (...args: any[]) => boolean; // Skip cache condition
  invalidateOn?: string[]; // Methods to invalidate cache on
  tags?: string[]; // Cache tags for invalidation
}

// Cache metadata storage
const cacheMetadata = new Map<string, CacheOptions>();

// Cache decorator for methods
export function Cached(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyName}`;
    
    // Store metadata
    cacheMetadata.set(methodName, options);

    descriptor.value = async function (...args: any[]) {
      // Check if cache should be skipped
      if (options.skipCache && options.skipCache(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(...args)
        : generateDefaultKey(methodName, args);

      try {
        // Try to get from cache
        const cached = await cache.get(cacheKey);
        if (cached !== null) {
          logger.debug(`Cache hit for ${methodName}`);
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);
        
        // Store in cache
        if (result !== null && result !== undefined) {
          await cache.set(cacheKey, result, options.ttl || 3600);
          logger.debug(`Cached result for ${methodName}`);
        }

        return result;
      } catch (error) {
        logger.error(`Cache decorator error for ${methodName}:`, error);
        // Fallback to original method on cache error
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

// Cache invalidation decorator
export function CacheInvalidate(options: { 
  keys?: string[]; 
  patterns?: string[]; 
  tags?: string[] 
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      // Execute original method first
      const result = await originalMethod.apply(this, args);

      try {
        // Invalidate specific keys
        if (options.keys) {
          for (const key of options.keys) {
            await cache.del(key);
          }
        }

        // Invalidate by patterns
        if (options.patterns) {
          for (const pattern of options.patterns) {
            const keys = await cache.scan(pattern);
            if (keys.length > 0) {
              await cache.delMultiple(keys);
            }
          }
        }

        // Invalidate by tags (if tag system is implemented)
        if (options.tags) {
          for (const tag of options.tags) {
            await invalidateByTag(tag);
          }
        }

        logger.debug(`Cache invalidated for ${methodName}`);
      } catch (error) {
        logger.error(`Cache invalidation error for ${methodName}:`, error);
      }

      return result;
    };

    return descriptor;
  };
}

// Cache warming decorator
export function CacheWarm(options: { 
  keyGenerator?: (...args: any[]) => string;
  ttl?: number;
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      try {
        // Warm cache with result
        const cacheKey = options.keyGenerator 
          ? options.keyGenerator(...args)
          : generateDefaultKey(methodName, args);

        if (result !== null && result !== undefined) {
          await cache.set(cacheKey, result, options.ttl || 3600);
          logger.debug(`Cache warmed for ${methodName}`);
        }
      } catch (error) {
        logger.error(`Cache warming error for ${methodName}:`, error);
      }

      return result;
    };

    return descriptor;
  };
}

// Generate default cache key
function generateDefaultKey(methodName: string, args: any[]): string {
  const argsHash = args.length > 0 ? JSON.stringify(args) : 'no-args';
  return `${methodName}:${Buffer.from(argsHash).toString('base64')}`;
}

// Invalidate cache by tag
async function invalidateByTag(tag: string): Promise<void> {
  try {
    const pattern = `*:tag:${tag}:*`;
    const keys = await cache.scan(pattern);
    if (keys.length > 0) {
      await cache.delMultiple(keys);
    }
  } catch (error) {
    logger.error(`Error invalidating cache by tag ${tag}:`, error);
  }
}

// Cache manager for manual operations
export class CacheManager {
  // Get cache metadata
  static getMetadata(methodName: string): CacheOptions | undefined {
    return cacheMetadata.get(methodName);
  }

  // Invalidate all caches for a class
  static async invalidateClass(className: string): Promise<void> {
    try {
      const pattern = `${className}:*`;
      const keys = await cache.scan(pattern);
      if (keys.length > 0) {
        await cache.delMultiple(keys);
        logger.info(`Invalidated ${keys.length} cache entries for class ${className}`);
      }
    } catch (error) {
      logger.error(`Error invalidating class cache for ${className}:`, error);
    }
  }

  // Invalidate caches by pattern
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await cache.scan(pattern);
      if (keys.length > 0) {
        await cache.delMultiple(keys);
        logger.info(`Invalidated ${keys.length} cache entries matching pattern ${pattern}`);
      }
    } catch (error) {
      logger.error(`Error invalidating cache pattern ${pattern}:`, error);
    }
  }

  // Clear all caches
  static async clearAll(): Promise<void> {
    try {
      const keys = await cache.scan('*');
      if (keys.length > 0) {
        await cache.delMultiple(keys);
        logger.info(`Cleared ${keys.length} cache entries`);
      }
    } catch (error) {
      logger.error('Error clearing all caches:', error);
    }
  }

  // Get cache statistics
  static async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const keys = await cache.scan('*');
      const info = await redis.info('memory');
      
      // Parse memory usage from Redis INFO
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        totalKeys: keys.length,
        memoryUsage,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
      };
    }
  }
}

// Predefined cache key generators for common patterns
export const keyGenerators = {
  // For product-related methods
  product: (id: string) => cacheKeys.product(id),
  products: (filters: Record<string, any>) => 
    cacheKeys.products(JSON.stringify(filters)),
  
  // For user-related methods
  user: (id: string) => cacheKeys.user(id),
  userPurchases: (userId: string, page = 1, limit = 10) => 
    `${cacheKeys.userPurchases(userId)}:${page}:${limit}`,
  userFavorites: (userId: string, page = 1, limit = 10) => 
    `${cacheKeys.userFavorites(userId)}:${page}:${limit}`,
  
  // For shop-related methods
  shop: (id: string) => cacheKeys.shop(id),
  shopProducts: (shopId: string, page = 1, limit = 10) => 
    `${cacheKeys.shopProducts(shopId)}:${page}:${limit}`,
  
  // For search methods
  search: (query: string, filters: Record<string, any>, page = 1, limit = 10) => 
    `${cacheKeys.searchResults(query, JSON.stringify(filters))}:${page}:${limit}`,
  
  // For analytics methods
  analytics: (type: string, id: string, period = '30d') => 
    `${cacheKeys.analytics(type, id)}:${period}`,
  
  // For referral methods
  referralStats: (referralId: string, period = '30d') => 
    `${cacheKeys.referralStats(referralId)}:${period}`,
};

// Cache configuration for different data types
export const cacheConfig = {
  // Short-lived caches (5 minutes)
  short: { ttl: 300 },
  
  // Medium-lived caches (1 hour)
  medium: { ttl: 3600 },
  
  // Long-lived caches (24 hours)
  long: { ttl: 86400 },
  
  // Very long-lived caches (7 days)
  veryLong: { ttl: 604800 },
  
  // Static data (30 days)
  static: { ttl: 2592000 },
};

export default CacheManager;
