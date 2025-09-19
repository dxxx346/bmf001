/**
 * Cache Strategies and Patterns
 * Implements specific caching strategies for different data types
 */

import { cache, TTLStrategy } from './redis-cache'
import { logError } from '@/lib/logger'
import { defaultLogger as logger } from '@/lib/logger'

export interface CacheStrategy {
  ttl: TTLStrategy
  tags: string[]
  prefix?: string
  warmOnMiss?: boolean
  invalidateOnUpdate?: boolean
}

export class CacheStrategies {
  // =============================================
  // PREDEFINED STRATEGIES
  // =============================================

  static readonly STRATEGIES: Record<string, CacheStrategy> = {
    // Product caching strategies
    PRODUCT_DETAIL: {
      ttl: 'products',
      tags: ['products', 'product_details'],
      prefix: 'product',
      warmOnMiss: true,
      invalidateOnUpdate: true
    },
    
    PRODUCT_LISTING: {
      ttl: 'products',
      tags: ['products', 'listings'],
      prefix: 'products',
      warmOnMiss: true,
      invalidateOnUpdate: true
    },

    PRODUCT_SEARCH: {
      ttl: 'products',
      tags: ['products', 'search'],
      prefix: 'search',
      warmOnMiss: false,
      invalidateOnUpdate: true
    },

    // User caching strategies
    USER_PROFILE: {
      ttl: 'users',
      tags: ['users', 'profiles'],
      prefix: 'user',
      warmOnMiss: false,
      invalidateOnUpdate: true
    },

    USER_DASHBOARD: {
      ttl: 'users',
      tags: ['users', 'dashboards'],
      prefix: 'dashboard',
      warmOnMiss: true,
      invalidateOnUpdate: true
    },

    USER_SESSIONS: {
      ttl: 'sessions',
      tags: ['users', 'sessions'],
      prefix: 'session',
      warmOnMiss: false,
      invalidateOnUpdate: true
    },

    // Analytics caching strategies
    ANALYTICS_DASHBOARD: {
      ttl: 'analytics',
      tags: ['analytics', 'dashboards'],
      prefix: 'analytics',
      warmOnMiss: true,
      invalidateOnUpdate: false
    },

    ANALYTICS_REPORTS: {
      ttl: 'analytics',
      tags: ['analytics', 'reports'],
      prefix: 'reports',
      warmOnMiss: false,
      invalidateOnUpdate: false
    },

    // Static data caching
    CATEGORIES: {
      ttl: 'static',
      tags: ['static', 'categories'],
      prefix: 'categories',
      warmOnMiss: true,
      invalidateOnUpdate: true
    },

    SETTINGS: {
      ttl: 'static',
      tags: ['static', 'settings'],
      prefix: 'settings',
      warmOnMiss: true,
      invalidateOnUpdate: true
    }
  }

  // =============================================
  // STRATEGY IMPLEMENTATIONS
  // =============================================

  /**
   * Cache product with related data
   */
  static async cacheProduct(
    productId: string,
    productData: any,
    includeRelations: boolean = true
  ): Promise<void> {
    const strategy = CacheStrategies.STRATEGIES.PRODUCT_DETAIL
    const key = `${productId}${includeRelations ? ':full' : ':basic'}`

    await cache.set(key, productData, strategy.ttl, {
      tags: [...strategy.tags, `product:${productId}`],
      prefix: strategy.prefix
    })

    logger.debug('Product cached', { productId, includeRelations })
  }

  /**
   * Cache product listing with filters
   */
  static async cacheProductListing(
    filters: any,
    products: any[],
    pagination: any
  ): Promise<void> {
    const strategy = CacheStrategies.STRATEGIES.PRODUCT_LISTING
    const key = `listing:${this.hashFilters(filters)}`

    const cacheData = {
      products,
      pagination,
      filters,
      cachedAt: new Date().toISOString()
    }

    await cache.set(key, cacheData, strategy.ttl, {
      tags: [...strategy.tags, 'product_listings'],
      prefix: strategy.prefix
    })

    logger.debug('Product listing cached', { 
      filtersHash: this.hashFilters(filters),
      productCount: products.length 
    })
  }

  /**
   * Cache user dashboard data
   */
  static async cacheUserDashboard(
    userId: string,
    dashboardData: any,
    userRole: string = 'buyer'
  ): Promise<void> {
    const strategy = CacheStrategies.STRATEGIES.USER_DASHBOARD
    const key = `${userRole}:${userId}`

    await cache.set(key, dashboardData, strategy.ttl, {
      tags: [...strategy.tags, `user:${userId}`, `role:${userRole}`],
      prefix: strategy.prefix
    })

    logger.debug('User dashboard cached', { userId, userRole })
  }

  /**
   * Cache search results with facets
   */
  static async cacheSearchResults(
    query: string,
    filters: any,
    results: any,
    facets: any
  ): Promise<void> {
    const strategy = CacheStrategies.STRATEGIES.PRODUCT_SEARCH
    const key = `${query}:${this.hashFilters(filters)}`

    const cacheData = {
      query,
      filters,
      results,
      facets,
      cachedAt: new Date().toISOString()
    }

    await cache.set(key, cacheData, strategy.ttl, {
      tags: [...strategy.tags, 'search_results'],
      prefix: strategy.prefix
    })

    logger.debug('Search results cached', { 
      query, 
      resultCount: results.length,
      filtersHash: this.hashFilters(filters)
    })
  }

  /**
   * Cache analytics data
   */
  static async cacheAnalytics(
    type: string,
    period: string,
    data: any,
    entityId?: string
  ): Promise<void> {
    const strategy = CacheStrategies.STRATEGIES.ANALYTICS_DASHBOARD
    const key = entityId ? `${type}:${period}:${entityId}` : `${type}:${period}`

    await cache.set(key, data, strategy.ttl, {
      tags: [...strategy.tags, `analytics:${type}`, `period:${period}`],
      prefix: strategy.prefix
    })

    logger.debug('Analytics cached', { type, period, entityId })
  }

  // =============================================
  // CACHE WARMING STRATEGIES
  // =============================================

  /**
   * Warm product caches based on popularity and recency
   */
  static async warmProductCaches(): Promise<void> {
    logger.info('Warming product caches...')

    try {
      // This would integrate with your actual product service
      const warmingTasks = [
        // Warm featured products
        cache.getOrSet(
          'featured',
          async () => {
            // return await productService.getFeaturedProducts()
            return { products: [], cached: true }
          },
          'products',
          { tags: ['products', 'featured'], prefix: 'products' }
        ),

        // Warm popular products
        cache.getOrSet(
          'popular',
          async () => {
            // return await productService.getPopularProducts()
            return { products: [], cached: true }
          },
          'products',
          { tags: ['products', 'popular'], prefix: 'products' }
        ),

        // Warm recent products
        cache.getOrSet(
          'recent',
          async () => {
            // return await productService.getRecentProducts()
            return { products: [], cached: true }
          },
          'products',
          { tags: ['products', 'recent'], prefix: 'products' }
        )
      ]

      await Promise.all(warmingTasks)
      logger.info('Product caches warmed successfully')

    } catch (error) {
      logError(error as Error, { action: 'warm_product_caches' })
    }
  }

  /**
   * Warm user dashboard caches for active users
   */
  static async warmUserDashboards(userIds: string[]): Promise<void> {
    logger.info('Warming user dashboard caches...', { userCount: userIds.length })

    const warmingTasks = userIds.map(async (userId) => {
      try {
        await cache.getOrSet(
          `buyer:${userId}`,
          async () => {
            // return await dashboardService.getBuyerDashboard(userId)
            return { dashboard: {}, cached: true }
          },
          'users',
          { tags: ['users', 'dashboards', `user:${userId}`], prefix: 'dashboard' }
        )
      } catch (error) {
        logError(error as Error, { action: 'warm_user_dashboard', userId })
      }
    })

    await Promise.all(warmingTasks)
    logger.info('User dashboard caches warmed')
  }

  /**
   * Warm static data caches
   */
  static async warmStaticCaches(): Promise<void> {
    logger.info('Warming static data caches...')

    const staticTasks = [
      // Categories
      cache.getOrSet(
        'all',
        async () => {
          // return await categoryService.getAllCategories()
          return { categories: [], cached: true }
        },
        'static',
        { tags: ['static', 'categories'], prefix: 'categories' }
      ),

      // System settings
      cache.getOrSet(
        'system',
        async () => {
          // return await settingsService.getSystemSettings()
          return { settings: {}, cached: true }
        },
        'static',
        { tags: ['static', 'settings'], prefix: 'settings' }
      )
    ]

    await Promise.all(staticTasks)
    logger.info('Static caches warmed')
  }

  // =============================================
  // INVALIDATION STRATEGIES
  // =============================================

  /**
   * Invalidate product-related caches
   */
  static async invalidateProductCaches(productId: string): Promise<void> {
    await Promise.all([
      cache.invalidateByTags([`product:${productId}`, 'products', 'listings', 'search']),
      cache.invalidateByPattern(`*product*${productId}*`),
      cache.invalidateByPattern('products:*'),
      cache.invalidateByPattern('search:*')
    ])

    logger.info('Product caches invalidated', { productId })
  }

  /**
   * Invalidate user-related caches
   */
  static async invalidateUserCaches(userId: string): Promise<void> {
    await Promise.all([
      cache.invalidateByTags([`user:${userId}`, 'users', 'dashboards']),
      cache.invalidateByPattern(`*user*${userId}*`),
      cache.invalidateByPattern(`dashboard:*${userId}*`)
    ])

    logger.info('User caches invalidated', { userId })
  }

  /**
   * Invalidate analytics caches
   */
  static async invalidateAnalyticsCaches(type?: string): Promise<void> {
    const tags = type ? ['analytics', `analytics:${type}`] : ['analytics']
    
    await Promise.all([
      cache.invalidateByTags(tags),
      cache.invalidateByPattern('analytics:*'),
      cache.invalidateByPattern('reports:*')
    ])

    logger.info('Analytics caches invalidated', { type })
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private static hashFilters(filters: any): string {
    try {
      const sortedFilters = Object.keys(filters)
        .sort()
        .reduce((result, key) => {
          result[key] = filters[key]
          return result
        }, {} as any)

      return Buffer.from(JSON.stringify(sortedFilters)).toString('base64').substring(0, 16)
    } catch (error) {
      return 'default'
    }
  }

  /**
   * Get cache strategy by name
   */
  static getStrategy(strategyName: string): CacheStrategy | null {
    return CacheStrategies.STRATEGIES[strategyName] || null
  }

  /**
   * Create custom strategy
   */
  static createStrategy(
    ttl: TTLStrategy,
    tags: string[],
    options: Partial<CacheStrategy> = {}
  ): CacheStrategy {
    return {
      ttl,
      tags,
      prefix: options.prefix,
      warmOnMiss: options.warmOnMiss || false,
      invalidateOnUpdate: options.invalidateOnUpdate || true
    }
  }
}

// =============================================
// CACHE DECORATORS
// =============================================

/**
 * Method decorator for automatic caching
 */
export function Cached(
  keyGenerator: (args: any[]) => string,
  strategy: CacheStrategy | string,
  options: { 
    condition?: (args: any[]) => boolean
    transform?: (result: any) => any
  } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // Check condition
      if (options.condition && !options.condition(args)) {
        return originalMethod.apply(this, args)
      }

      const cacheKey = keyGenerator(args)
      const cacheStrategy = typeof strategy === 'string' 
        ? CacheStrategies.getStrategy(strategy)
        : strategy

      if (!cacheStrategy) {
        return originalMethod.apply(this, args)
      }

      try {
        // Try cache first
        const cached = await cache.get(cacheKey, {
          prefix: cacheStrategy.prefix,
          tags: cacheStrategy.tags
        })

        if (cached !== null) {
          return cached
        }

        // Cache miss - execute original method
        const result = await originalMethod.apply(this, args)
        
        // Transform result if needed
        const finalResult = options.transform ? options.transform(result) : result

        // Cache the result
        if (finalResult !== null && finalResult !== undefined) {
          await cache.set(cacheKey, finalResult, cacheStrategy.ttl, {
            tags: cacheStrategy.tags,
            prefix: cacheStrategy.prefix
          })
        }

        return result
      } catch (error) {
        logError(error as Error, { action: 'cached_method', method: propertyName, key: cacheKey })
        return originalMethod.apply(this, args)
      }
    }

    return descriptor
  }
}

/**
 * Cache invalidation decorator
 */
export function InvalidateCache(
  strategy: CacheStrategy | string,
  keyGenerator?: (args: any[]) => string
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args)

      try {
        const cacheStrategy = typeof strategy === 'string' 
          ? CacheStrategies.getStrategy(strategy)
          : strategy

        if (cacheStrategy && cacheStrategy.invalidateOnUpdate) {
          if (keyGenerator) {
            const key = keyGenerator(args)
            await cache.delete(key, { prefix: cacheStrategy.prefix })
          }
          
          await cache.invalidateByTags(cacheStrategy.tags)
        }
      } catch (error) {
        logError(error as Error, { action: 'invalidate_cache', method: propertyName })
      }

      return result
    }

    return descriptor
  }
}

// =============================================
// SPECIALIZED CACHE MANAGERS
// =============================================

export class ProductCacheManager {
  /**
   * Cache product with automatic strategy selection
   */
  static async cacheProduct(
    productId: string,
    product: any,
    includeRelations: boolean = true
  ): Promise<void> {
    const key = includeRelations ? `${productId}:full` : `${productId}:basic`
    const strategy = CacheStrategies.STRATEGIES.PRODUCT_DETAIL

    await cache.set(key, product, strategy.ttl, {
      tags: [...strategy.tags, `product:${productId}`],
      prefix: strategy.prefix
    })
  }

  /**
   * Get product from cache or database
   */
  static async getProduct(
    productId: string,
    fetchFunction: () => Promise<any>,
    includeRelations: boolean = true
  ): Promise<any> {
    const key = includeRelations ? `${productId}:full` : `${productId}:basic`
    const strategy = CacheStrategies.STRATEGIES.PRODUCT_DETAIL

    return cache.getOrSet(key, fetchFunction, strategy.ttl, {
      tags: [...strategy.tags, `product:${productId}`],
      prefix: strategy.prefix
    })
  }

  /**
   * Invalidate all product-related caches
   */
  static async invalidateProduct(productId: string): Promise<void> {
    await CacheStrategies.invalidateProductCaches(productId)
  }
}

export class UserCacheManager {
  /**
   * Cache user dashboard
   */
  static async cacheDashboard(
    userId: string,
    dashboard: any,
    userRole: string = 'buyer'
  ): Promise<void> {
    const key = `${userRole}:${userId}`
    const strategy = CacheStrategies.STRATEGIES.USER_DASHBOARD

    await cache.set(key, dashboard, strategy.ttl, {
      tags: [...strategy.tags, `user:${userId}`, `role:${userRole}`],
      prefix: strategy.prefix
    })
  }

  /**
   * Get user dashboard from cache or database
   */
  static async getDashboard(
    userId: string,
    fetchFunction: () => Promise<any>,
    userRole: string = 'buyer'
  ): Promise<any> {
    const key = `${userRole}:${userId}`
    const strategy = CacheStrategies.STRATEGIES.USER_DASHBOARD

    return cache.getOrSet(key, fetchFunction, strategy.ttl, {
      tags: [...strategy.tags, `user:${userId}`, `role:${userRole}`],
      prefix: strategy.prefix
    })
  }

  /**
   * Invalidate user-related caches
   */
  static async invalidateUser(userId: string): Promise<void> {
    await CacheStrategies.invalidateUserCaches(userId)
  }
}

export class AnalyticsCacheManager {
  /**
   * Cache analytics data with automatic expiration
   */
  static async cacheAnalytics(
    type: string,
    period: string,
    data: any,
    entityId?: string
  ): Promise<void> {
    const key = entityId ? `${type}:${period}:${entityId}` : `${type}:${period}`
    const strategy = CacheStrategies.STRATEGIES.ANALYTICS_DASHBOARD

    await cache.set(key, data, strategy.ttl, {
      tags: [...strategy.tags, `analytics:${type}`, `period:${period}`],
      prefix: strategy.prefix
    })
  }

  /**
   * Get analytics from cache or compute
   */
  static async getAnalytics(
    type: string,
    period: string,
    fetchFunction: () => Promise<any>,
    entityId?: string
  ): Promise<any> {
    const key = entityId ? `${type}:${period}:${entityId}` : `${type}:${period}`
    const strategy = CacheStrategies.STRATEGIES.ANALYTICS_DASHBOARD

    return cache.getOrSet(key, fetchFunction, strategy.ttl, {
      tags: [...strategy.tags, `analytics:${type}`, `period:${period}`],
      prefix: strategy.prefix
    })
  }

  /**
   * Invalidate analytics caches
   */
  static async invalidateAnalytics(type?: string): Promise<void> {
    await CacheStrategies.invalidateAnalyticsCaches(type)
  }
}

// =============================================
// CACHE MIDDLEWARE
// =============================================

export class CacheMiddleware {
  /**
   * Express/Next.js middleware for automatic response caching
   */
  static create(options: {
    strategy: CacheStrategy | string
    keyGenerator: (req: any) => string
    condition?: (req: any) => boolean
  }) {
    return async (req: any, res: any, next: any) => {
      if (options.condition && !options.condition(req)) {
        return next()
      }

      const cacheKey = options.keyGenerator(req)
      const strategy = typeof options.strategy === 'string' 
        ? CacheStrategies.getStrategy(options.strategy)
        : options.strategy

      if (!strategy) {
        return next()
      }

      try {
        // Check cache
        const cached = await cache.get(cacheKey, {
          prefix: strategy.prefix,
          tags: strategy.tags
        })

        if (cached) {
          res.setHeader('X-Cache', 'HIT')
          res.setHeader('X-Cache-Key', cacheKey)
          return res.json(cached)
        }

        // Cache miss - continue to handler
        res.setHeader('X-Cache', 'MISS')
        res.setHeader('X-Cache-Key', cacheKey)
        
        // Intercept response to cache it
        const originalJson = res.json
        res.json = function(data: any) {
          // Cache the response
          cache.set(cacheKey, data, strategy.ttl, {
            tags: strategy.tags,
            prefix: strategy.prefix
          }).catch(error => {
            logError(error as Error, { action: 'cache_response', key: cacheKey })
          })

          return originalJson.call(this, data)
        }

        next()
      } catch (error) {
        logError(error as Error, { action: 'cache_middleware', key: cacheKey })
        next()
      }
    }
  }
}

export { CacheStrategies }
