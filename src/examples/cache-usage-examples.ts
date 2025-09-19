/**
 * Cache Usage Examples
 * Practical examples of how to use the comprehensive caching system
 */

import { 
  cache, 
  redisCache,
  ProductCacheManager, 
  UserCacheManager,
  AnalyticsCacheManager,
  CacheStrategies,
  cacheIntegration,
  cacheWarmupService,
  CacheEventHandlers
} from '@/lib/cache'

// =============================================
// BASIC CACHE OPERATIONS
// =============================================

export class BasicCacheExamples {
  
  /**
   * Simple get/set operations
   */
  async basicOperations() {
    // Set with TTL strategy
    await cache.set('user:123', { name: 'John Doe', email: 'john@example.com' }, 'users')
    
    // Get from cache
    const user = await cache.get('user:123')
    console.log('Cached user:', user)
    
    // Delete from cache
    await cache.delete('user:123')
    
    // Cache-aside pattern
    const product = await cache.getOrSet(
      'product:456',
      async () => {
        // Simulate database fetch
        return { id: '456', name: 'Sample Product', price: 99.99 }
      },
      'products',
      { tags: ['products', 'product:456'] }
    )
    
    console.log('Product from cache or database:', product)
  }

  /**
   * Batch operations
   */
  async batchOperations() {
    // Set multiple items
    await redisCache.setMany([
      { key: 'product:1', value: { name: 'Product 1' }, ttl: 'products' },
      { key: 'product:2', value: { name: 'Product 2' }, ttl: 'products' },
      { key: 'product:3', value: { name: 'Product 3' }, ttl: 'products' }
    ])
    
    // Get multiple items
    const products = await redisCache.getMany(['product:1', 'product:2', 'product:3'])
    console.log('Batch retrieved products:', products)
  }
}

// =============================================
// CACHE STRATEGIES EXAMPLES
// =============================================

export class CacheStrategiesExamples {
  
  /**
   * Using predefined strategies
   */
  async useStrategies() {
    // Cache product with automatic strategy
    await ProductCacheManager.cacheProduct('123', {
      id: '123',
      name: 'Gaming Laptop',
      price: 1299.99,
      seller: { name: 'TechStore' }
    }, true)
    
    // Get product with fallback to database
    const product = await ProductCacheManager.getProduct(
      '123',
      async () => {
        // Simulate database fetch
        return { id: '123', name: 'Gaming Laptop', price: 1299.99 }
      },
      true
    )
    
    console.log('Product with strategy:', product)
  }

  /**
   * Custom cache strategy
   */
  async customStrategy() {
    const customStrategy = CacheStrategies.createStrategy(
      'products',
      ['custom', 'special'],
      { prefix: 'custom', warmOnMiss: true }
    )
    
    await cache.set('special:item', { data: 'special' }, customStrategy.ttl, {
      tags: customStrategy.tags,
      prefix: customStrategy.prefix
    })
  }
}

// =============================================
// SERVICE INTEGRATION EXAMPLES
// =============================================

export class ServiceIntegrationExamples {
  
  /**
   * Product service with caching
   */
  async productServiceExample() {
    // Get cached products with filters
    const products = await cacheIntegration.getProductsCached({
      status: 'active',
      category_id: 1,
      sort_by: 'created_at',
      limit: 20
    })
    
    console.log('Cached products:', products)
    
    // Search with caching
    const searchResults = await cacheIntegration.searchProductsCached(
      'gaming laptop',
      { category_id: 1, min_price: 500 },
      true // include facets
    )
    
    console.log('Search results:', searchResults)
  }

  /**
   * User dashboard with caching
   */
  async dashboardExample() {
    // Buyer dashboard
    const buyerDashboard = await cacheIntegration.getBuyerDashboardCached('user123')
    console.log('Buyer dashboard:', buyerDashboard)
    
    // Seller dashboard
    const sellerDashboard = await cacheIntegration.getSellerDashboardCached('seller456', '30d')
    console.log('Seller dashboard:', sellerDashboard)
    
    // Order history
    const orderHistory = await cacheIntegration.getOrderHistoryCached('user123', {
      limit: 10,
      status: 'completed'
    })
    console.log('Order history:', orderHistory)
  }

  /**
   * Analytics with caching
   */
  async analyticsExample() {
    // Dashboard analytics
    const dashboardAnalytics = await cacheIntegration.getAnalyticsCached(
      'dashboard',
      '30d'
    )
    console.log('Dashboard analytics:', dashboardAnalytics)
    
    // Revenue analytics for specific seller
    const revenueAnalytics = await cacheIntegration.getAnalyticsCached(
      'revenue',
      '7d',
      'seller123'
    )
    console.log('Revenue analytics:', revenueAnalytics)
  }
}

// =============================================
// CACHE INVALIDATION EXAMPLES
// =============================================

export class CacheInvalidationExamples {
  
  /**
   * Tag-based invalidation
   */
  async tagInvalidation() {
    // Invalidate all product caches
    await cache.invalidateByTags(['products'])
    
    // Invalidate specific user caches
    await cache.invalidateByTags(['user:123', 'dashboards'])
    
    // Invalidate multiple tag groups
    await cache.invalidateByTags(['products', 'search', 'analytics'])
  }

  /**
   * Pattern-based invalidation
   */
  async patternInvalidation() {
    // Invalidate all search caches
    await cache.invalidateByPattern('search:*')
    
    // Invalidate specific product caches
    await cache.invalidateByPattern('*product:123*')
    
    // Invalidate dashboard caches for all users
    await cache.invalidateByPattern('dashboard:*')
  }

  /**
   * Smart related invalidation
   */
  async relatedInvalidation() {
    // Automatically invalidate related caches when product is updated
    await cache.invalidateRelated('product', '123')
    // This invalidates: product cache, listings, search, seller dashboard, analytics
    
    // Automatically invalidate related caches when user is updated
    await cache.invalidateRelated('user', 'user123')
    // This invalidates: user cache, dashboard, orders, etc.
  }

  /**
   * Event-driven invalidation
   */
  async eventDrivenInvalidation() {
    // Handle product update
    await CacheEventHandlers.onProductUpdated('123', {
      price: 999.99,
      status: 'active'
    })
    
    // Handle user update
    await CacheEventHandlers.onUserUpdated('user123', {
      name: 'John Smith',
      email: 'john.smith@example.com'
    })
    
    // Handle order creation
    await CacheEventHandlers.onOrderCreated({
      id: 'order789',
      buyer_id: 'user123',
      seller_id: 'seller456',
      product_id: '123'
    })
  }
}

// =============================================
// DISTRIBUTED LOCKING EXAMPLES
// =============================================

export class DistributedLockingExamples {
  
  /**
   * Basic locking
   */
  async basicLocking() {
    const lock = await cache.acquireLock('inventory:update:123', {
      ttl: 30,        // 30 seconds
      maxRetries: 5,
      retryDelay: 100
    })
    
    if (lock.acquired) {
      try {
        console.log('Lock acquired, performing critical operation...')
        // Perform critical operation here
        await this.updateInventory('123', 10)
      } finally {
        await lock.release?.()
        console.log('Lock released')
      }
    } else {
      console.log('Could not acquire lock')
    }
  }

  /**
   * Lock with retry pattern
   */
  async lockWithRetry() {
    const withLock = async (lockKey: string, operation: () => Promise<any>) => {
      const lock = await cache.acquireLock(lockKey, {
        ttl: 60,
        maxRetries: 10,
        retryDelay: 200
      })
      
      if (!lock.acquired) {
        throw new Error(`Could not acquire lock: ${lockKey}`)
      }
      
      try {
        return await operation()
      } finally {
        await lock.release?.()
      }
    }
    
    // Usage
    await withLock('payment:process:order123', async () => {
      console.log('Processing payment...')
      // Process payment logic here
      return { success: true, transactionId: 'tx123' }
    })
  }

  private async updateInventory(productId: string, quantity: number) {
    // Simulate inventory update
    console.log(`Updating inventory for product ${productId}: ${quantity}`)
  }
}

// =============================================
// CACHE WARMING EXAMPLES
// =============================================

export class CacheWarmingExamples {
  
  /**
   * Comprehensive warmup
   */
  async comprehensiveWarmup() {
    const result = await cacheWarmupService.warmup({
      products: {
        featured: true,
        popular: true,
        recent: true,
        categories: [1, 2, 3, 4, 5],
        limit: 50
      },
      users: {
        active: true,
        sellers: true,
        buyers: true,
        limit: 100
      },
      analytics: {
        dashboard: true,
        reports: true,
        periods: ['7d', '30d', '90d']
      },
      static: {
        categories: true,
        settings: true
      }
    })
    
    console.log('Warmup result:', result)
  }

  /**
   * Smart warmup based on cache state
   */
  async smartWarmup() {
    const result = await cacheWarmupService.smartWarmup()
    console.log('Smart warmup result:', result)
  }

  /**
   * Scheduled warmup
   */
  async scheduledWarmup() {
    // Schedule warmup every 4 hours
    await cacheWarmupService.scheduleWarmup({
      products: { featured: true, popular: true },
      users: { active: true },
      static: { categories: true },
      interval: 4 * 60 * 60 * 1000 // 4 hours in milliseconds
    })
    
    console.log('Scheduled warmup configured')
  }

  /**
   * Activity-based warmup
   */
  async activityBasedWarmup() {
    await cacheIntegration.intelligentCacheWarming()
    console.log('Intelligent warmup completed')
  }
}

// =============================================
// MANUAL CACHING EXAMPLES
// =============================================

export class ManualCachingExamples {
  
  /**
   * Service with manual caching implementation
   */
  ProductService = class {
    async getProduct(productId: string) {
      const cacheKey = `product:${productId}`
      
      // Try cache first
      const cached = await cache.get(cacheKey)
      if (cached) {
        console.log('Product retrieved from cache:', productId)
        return { ...cached, cached: true }
      }
      
      console.log('Fetching product from database:', productId)
      // Simulate database fetch
      const result = {
        id: productId,
        name: 'Sample Product',
        price: 99.99,
        description: 'A sample product'
      }
      
      // Cache the result
      await cache.set(cacheKey, result, 'products', {
        tags: ['products', `product:${productId}`],
        prefix: 'product'
      })
      
      return { ...result, cached: false }
    }

    async updateProduct(productId: string, updates: any) {
      console.log('Updating product in database:', productId, updates)
      // Simulate database update
      const result = { id: productId, ...updates, updated_at: new Date() }
      
      // Invalidate cache after update
      await cache.invalidateByTags([`product:${productId}`, 'products'])
      
      return result
    }

    async searchProducts(query: string, filters: any) {
      const cacheKey = `search:${query}:${JSON.stringify(filters)}`
      
      // Try cache first
      const cached = await cache.get(cacheKey)
      if (cached) {
        console.log('Search results retrieved from cache:', query)
        return cached
      }
      
      console.log('Searching products in database:', query, filters)
      // Simulate database search
      const result = {
        products: [
          { id: '1', name: 'Product 1', price: 50 },
          { id: '2', name: 'Product 2', price: 75 }
        ],
        total: 2,
        query,
        filters
      }
      
      // Cache the search results
      await cache.set(cacheKey, result, 'products', {
        tags: ['products', 'search', `query:${query}`],
        prefix: 'search'
      })
      
      return result
    }
  }

  async useManualCaching() {
    const productService = new this.ProductService()
    
    // First call - will fetch from database and cache
    const product1 = await productService.getProduct('123')
    console.log('First call result:', product1)
    
    // Second call - will return from cache
    const product2 = await productService.getProduct('123')
    console.log('Second call result (cached):', product2)
    
    // Update product - will invalidate cache
    await productService.updateProduct('123', { name: 'Updated Product' })
    
    // Next call will fetch fresh data from database
    const product3 = await productService.getProduct('123')
    console.log('After update result (fresh from DB):', product3)
  }
}

// =============================================
// MONITORING AND DEBUGGING EXAMPLES
// =============================================

export class MonitoringExamples {
  
  /**
   * Get cache metrics
   */
  async getCacheMetrics() {
    const metrics = cache.getMetrics()
    console.log('Cache Metrics:', {
      hitRate: `${metrics.hitRate.toFixed(1)}%`,
      totalRequests: metrics.totalRequests,
      hits: metrics.hits,
      misses: metrics.misses,
      errors: metrics.errors,
      lastReset: metrics.lastReset
    })
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = await cache.healthCheck()
    console.log('Cache Health:', {
      redisAvailable: health.redis.available,
      redisLatency: health.redis.latency,
      memoryUsage: health.memory.usage,
      memoryEntries: health.memory.entriesCount
    })
  }

  /**
   * Performance monitoring
   */
  async performanceMonitoring() {
    // Set up periodic monitoring
    setInterval(async () => {
      const metrics = cache.getMetrics()
      const health = await cache.healthCheck()
      
      console.log('Cache Performance Report:', {
        timestamp: new Date().toISOString(),
        hitRate: metrics.hitRate,
        errorRate: metrics.totalRequests > 0 ? (metrics.errors / metrics.totalRequests) * 100 : 0,
        redisAvailable: health.redis.available,
        memoryUsage: health.memory.usage
      })
      
      // Alert on issues
      if (metrics.hitRate < 70) {
        console.warn('⚠️ Low cache hit rate detected:', metrics.hitRate)
      }
      
      if (!health.redis.available) {
        console.error('❌ Redis unavailable - using memory fallback')
      }
      
    }, 60000) // Every minute
  }

  /**
   * Cache debugging
   */
  async cacheDebugging() {
    // Get cache info
    const info = await cache.getCacheInfo?.()
    console.log('Cache Info:', info)
    
    // Get cache keys
    const keys = await cache.getKeys?.('product:*')
    console.log('Product cache keys:', keys?.slice(0, 10)) // Show first 10
    
    // Get specific cache entry details
    const entry = await cache.getCacheEntry?.('product:123')
    console.log('Cache entry details:', entry)
  }
}

// =============================================
// ADVANCED USAGE EXAMPLES
// =============================================

export class AdvancedUsageExamples {
  
  /**
   * Cache middleware for API routes
   */
  async apiCacheMiddleware() {
    // This would be used in your API routes
    const cacheMiddleware = (strategy: string, keyGenerator: (req: any) => string) => {
      return async (req: any, res: any, next: any) => {
        const cacheKey = keyGenerator(req)
        
        // Try cache first
        const cached = await cache.get(cacheKey)
        if (cached) {
          res.setHeader('X-Cache', 'HIT')
          return res.json(cached)
        }
        
        // Cache miss - continue to handler
        res.setHeader('X-Cache', 'MISS')
        
        // Intercept response to cache it
        const originalJson = res.json
        res.json = function(data: any) {
          // Cache the response
          cache.set(cacheKey, data, 'products', {
            tags: ['api', 'products']
          })
          return originalJson.call(this, data)
        }
        
        next()
      }
    }
    
    console.log('Cache middleware configured')
  }

  /**
   * Cache warming on application startup
   */
  async applicationStartup() {
    console.log('Starting application with cache warmup...')
    
    try {
      // Warm essential caches
      await cacheWarmupService.warmup({
        products: {
          featured: true,
          popular: true,
          limit: 20
        },
        static: {
          categories: true,
          settings: true
        }
      })
      
      console.log('✅ Cache warmup completed - application ready')
    } catch (error) {
      console.error('❌ Cache warmup failed:', error)
      // Application can still start without cache
    }
  }

  /**
   * Cache cleanup on application shutdown
   */
  async applicationShutdown() {
    console.log('Shutting down application...')
    
    try {
      // Optionally flush temporary caches
      await cache.flush('temp:*')
      
      // Disconnect cache service
      await cache.disconnect?.()
      
      console.log('✅ Cache service disconnected cleanly')
    } catch (error) {
      console.error('❌ Cache shutdown error:', error)
    }
  }

  /**
   * Cache testing utilities
   */
  async testingUtilities() {
    // Clear all caches for testing
    await cache.flush()
    
    // Set test data
    await cache.set('test:user:123', { name: 'Test User' }, 'temporary')
    
    // Verify cache works
    const testUser = await cache.get('test:user:123')
    console.log('Test cache result:', testUser)
    
    // Clean up test data
    await cache.delete('test:user:123')
    
    console.log('Cache testing completed')
  }
}

// =============================================
// EXPORT ALL EXAMPLES
// =============================================

export const cacheExamples = {
  basic: new BasicCacheExamples(),
  strategies: new CacheStrategiesExamples(),
  integration: new ServiceIntegrationExamples(),
  invalidation: new CacheInvalidationExamples(),
  locking: new DistributedLockingExamples(),
  warming: new CacheWarmingExamples(),
  manual: new ManualCachingExamples(),
  monitoring: new MonitoringExamples(),
  advanced: new AdvancedUsageExamples()
}

// Usage example
export async function runCacheExamples() {
  console.log('🚀 Running cache usage examples...')
  
  try {
    // Basic operations
    await cacheExamples.basic.basicOperations()
    
    // Cache strategies
    await cacheExamples.strategies.useStrategies()
    
    // Service integration
    await cacheExamples.integration.productServiceExample()
    
    // Manual caching example
    await cacheExamples.manual.useManualCaching()
    
    // Monitoring
    await cacheExamples.monitoring.getCacheMetrics()
    
    console.log('✅ All cache examples completed successfully!')
  } catch (error) {
    console.error('❌ Cache examples failed:', error)
  }
}

export default cacheExamples
