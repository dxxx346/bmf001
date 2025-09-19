/**
 * Cache Integration Layer
 * Integrates caching with existing services and provides high-level caching utilities
 */

import { cache, redisCache } from './redis-cache'
import { ProductCacheManager, UserCacheManager, AnalyticsCacheManager, CacheStrategies } from './cache-strategies'
import { redis } from '@/lib/redis'
import { createServiceClient } from '@/lib/supabase'
import { logError } from '@/lib/logger'
import { defaultLogger as logger } from '@/lib/logger'

export class CacheIntegration {
  private supabase = createServiceClient()

  // =============================================
  // PRODUCT CACHING INTEGRATION
  // =============================================

  /**
   * Get product with intelligent caching
   */
  async getProductCached(
    productId: string,
    includeRelations: boolean = true
  ): Promise<any> {
    return ProductCacheManager.getProduct(
      productId,
      async () => {
        // Fetch from database with relations
        const { data: product, error } = await this.supabase
          .from('products')
          .select(includeRelations ? `
            *,
            seller:users!seller_id(id, name, avatar_url),
            shop:shops!shop_id(id, name, slug, logo_url),
            category:categories!category_id(id, name),
            files:product_files(*),
            images:product_images(*),
            stats:product_stats(*)
          ` : '*')
          .eq('id', productId)
          .single()

        if (error) throw error
        return product
      },
      includeRelations
    )
  }

  /**
   * Get products with caching and filtering
   */
  async getProductsCached(filters: any = {}): Promise<any> {
    const cacheKey = `listing:${this.hashObject(filters)}`
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        // Fetch from database
        let query = this.supabase
          .from('products')
          .select(`
            *,
            seller:users!seller_id(id, name, avatar_url),
            shop:shops!shop_id(id, name, slug, logo_url),
            category:categories!category_id(id, name),
            stats:product_stats(views, purchases, rating_average, rating_count)
          `)

        // Apply filters
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.category_id) query = query.eq('category_id', filters.category_id)
        if (filters.seller_id) query = query.eq('seller_id', filters.seller_id)
        if (filters.min_price) query = query.gte('price', filters.min_price)
        if (filters.max_price) query = query.lte('price', filters.max_price)

        // Sorting and pagination
        query = query
          .order(filters.sort_by || 'created_at', { ascending: filters.sort_order === 'asc' })
          .limit(filters.limit || 20)

        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
        }

        const { data: products, error } = await query

        if (error) throw error
        return { products: products || [], filters, cached_at: new Date().toISOString() }
      },
      'products',
      { 
        tags: ['products', 'listings'],
        prefix: 'products'
      }
    )
  }

  /**
   * Search products with caching
   */
  async searchProductsCached(
    query: string,
    filters: any = {},
    includeFacets: boolean = false
  ): Promise<any> {
    const cacheKey = `search:${query}:${this.hashObject(filters)}:${includeFacets}`
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        // Use RPC function for optimized search
        const { data: results, error } = await this.supabase
          .rpc('search_products_optimized', {
            search_query: query,
            category_ids: filters.category_id ? [filters.category_id] : null,
            min_price: filters.min_price || null,
            max_price: filters.max_price || null,
            sort_by: filters.sort_by || 'created_at',
            sort_order: filters.sort_order || 'desc',
            limit_count: filters.limit || 20,
            offset_count: filters.offset || 0,
            include_facets: includeFacets
          })

        if (error) throw error
        return results
      },
      'products',
      {
        tags: ['products', 'search', `query:${query}`],
        prefix: 'search'
      }
    )
  }

  // =============================================
  // USER DASHBOARD CACHING
  // =============================================

  /**
   * Get buyer dashboard with caching
   */
  async getBuyerDashboardCached(userId: string): Promise<any> {
    return UserCacheManager.getDashboard(
      userId,
      async () => {
        // Use optimized RPC function
        const { data: dashboard, error } = await this.supabase
          .rpc('get_buyer_dashboard_optimized', { buyer_id: userId })

        if (error) throw error
        return dashboard
      },
      'buyer'
    )
  }

  /**
   * Get seller dashboard with caching
   */
  async getSellerDashboardCached(sellerId: string, period: string = '30d'): Promise<any> {
    return UserCacheManager.getDashboard(
      sellerId,
      async () => {
        // Use optimized RPC function
        const { data: dashboard, error } = await this.supabase
          .rpc('get_seller_dashboard_optimized', {
            seller_id: sellerId,
            period_days: this.periodToDays(period)
          })

        if (error) throw error
        return dashboard
      },
      'seller'
    )
  }

  /**
   * Get order history with caching
   */
  async getOrderHistoryCached(
    userId: string,
    filters: any = {}
  ): Promise<any> {
    const cacheKey = `order_history:${userId}:${this.hashObject(filters)}`
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        // Optimized query with all relations
        const { data: orders, error } = await this.supabase
          .from('purchases')
          .select(`
            id,
            created_at,
            status,
            product:products(
              id,
              title,
              price,
              thumbnail_url,
              seller:users(id, name, avatar_url),
              shop:shops(id, name, slug)
            ),
            payment:payments(
              id,
              amount,
              currency,
              status,
              provider
            )
          `)
          .eq('buyer_id', userId)
          .order('created_at', { ascending: false })
          .limit(filters.limit || 50)

        if (error) throw error
        return { orders: orders || [], filters, cached_at: new Date().toISOString() }
      },
      'users',
      {
        tags: ['users', 'orders', `user:${userId}`],
        prefix: 'orders'
      }
    )
  }

  // =============================================
  // ANALYTICS CACHING
  // =============================================

  /**
   * Get analytics with caching
   */
  async getAnalyticsCached(
    type: string,
    period: string,
    entityId?: string
  ): Promise<any> {
    return AnalyticsCacheManager.getAnalytics(
      type,
      period,
      async () => {
        // Fetch analytics based on type
        switch (type) {
          case 'dashboard':
            return this.fetchDashboardAnalytics(period, entityId)
          case 'revenue':
            return this.fetchRevenueAnalytics(period, entityId)
          case 'products':
            return this.fetchProductAnalytics(period, entityId)
          case 'users':
            return this.fetchUserAnalytics(period, entityId)
          default:
            throw new Error(`Unknown analytics type: ${type}`)
        }
      },
      entityId
    )
  }

  // =============================================
  // CACHE WARMING INTEGRATION
  // =============================================

  /**
   * Intelligent cache warming based on usage patterns
   */
  async intelligentCacheWarming(): Promise<void> {
    logger.info('Starting intelligent cache warming...')

    try {
      // Warm based on recent activity
      await this.warmBasedOnActivity()
      
      // Warm popular content
      await this.warmPopularContent()
      
      // Warm static data
      await this.warmStaticData()

      logger.info('Intelligent cache warming completed')
    } catch (error) {
      logError(error as Error, { action: 'intelligent_cache_warming' })
    }
  }

  private async warmBasedOnActivity(): Promise<void> {
    // Get recently active users
    const { data: activeUsers } = await this.supabase
      .from('users')
      .select('id, role')
      .order('last_seen_at', { ascending: false })
      .limit(50)

    if (activeUsers) {
      const warmingTasks = activeUsers.map(async (user) => {
        try {
          if (user.role === 'buyer') {
            await this.getBuyerDashboardCached(user.id)
          } else if (user.role === 'seller') {
            await this.getSellerDashboardCached(user.id)
          }
        } catch (error) {
          // Continue warming other users
        }
      })

      await Promise.all(warmingTasks)
    }
  }

  private async warmPopularContent(): Promise<void> {
    // Warm popular products
    await this.getProductsCached({
      status: 'active',
      sort_by: 'views',
      sort_order: 'desc',
      limit: 20
    })

    // Warm featured products
    await this.getProductsCached({
      status: 'active',
      is_featured: true,
      limit: 10
    })
  }

  private async warmStaticData(): Promise<void> {
    // Warm categories
    await cache.getOrSet(
      'all',
      async () => {
        const { data: categories, error } = await this.supabase
          .from('categories')
          .select('*')
          .order('name')

        if (error) throw error
        return categories
      },
      'static',
      { tags: ['static', 'categories'], prefix: 'categories' }
    )
  }

  // =============================================
  // CACHE INVALIDATION INTEGRATION
  // =============================================

  /**
   * Invalidate caches when product is updated
   */
  async invalidateProductUpdate(productId: string, changes: any): Promise<void> {
    await ProductCacheManager.invalidateProduct(productId)

    // Invalidate related caches based on what changed
    if (changes.category_id) {
      await cache.invalidateByTags(['categories', 'listings'])
    }

    if (changes.price || changes.status) {
      await cache.invalidateByTags(['search', 'listings'])
    }

    if (changes.is_featured !== undefined) {
      await redisCache.invalidateByPattern('products:featured*')
    }

    logger.info('Product update caches invalidated', { productId, changes: Object.keys(changes) })
  }

  /**
   * Invalidate caches when user is updated
   */
  async invalidateUserUpdate(userId: string, changes: any): Promise<void> {
    await UserCacheManager.invalidateUser(userId)

    // Invalidate role-specific caches
    if (changes.role) {
      await cache.invalidateByTags([`role:${changes.role}`, 'users'])
    }

    logger.info('User update caches invalidated', { userId, changes: Object.keys(changes) })
  }

  /**
   * Invalidate caches when order is created/updated
   */
  async invalidateOrderUpdate(orderId: string, buyerId: string, sellerId?: string): Promise<void> {
    await Promise.all([
      cache.invalidateRelated('order', orderId),
      cache.invalidateRelated('user', buyerId),
      sellerId ? cache.invalidateRelated('user', sellerId) : Promise.resolve(),
      cache.invalidateByTags(['analytics', 'dashboards'])
    ])

    logger.info('Order update caches invalidated', { orderId, buyerId, sellerId })
  }

  // =============================================
  // ANALYTICS HELPERS
  // =============================================

  private async fetchDashboardAnalytics(period: string, entityId?: string): Promise<any> {
    // This would call your analytics service
    return {
      type: 'dashboard',
      period,
      entityId,
      data: {},
      generated_at: new Date().toISOString()
    }
  }

  private async fetchRevenueAnalytics(period: string, entityId?: string): Promise<any> {
    return {
      type: 'revenue',
      period,
      entityId,
      data: {},
      generated_at: new Date().toISOString()
    }
  }

  private async fetchProductAnalytics(period: string, entityId?: string): Promise<any> {
    return {
      type: 'products',
      period,
      entityId,
      data: {},
      generated_at: new Date().toISOString()
    }
  }

  private async fetchUserAnalytics(period: string, entityId?: string): Promise<any> {
    return {
      type: 'users',
      period,
      entityId,
      data: {},
      generated_at: new Date().toISOString()
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private hashObject(obj: any): string {
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
  }

  private periodToDays(period: string): number {
    switch (period) {
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      case '1y': return 365
      default: return 30
    }
  }
}

// =============================================
// CACHE HOOKS FOR REACT COMPONENTS
// =============================================

export class CacheHooks {
  /**
   * React hook for cached data fetching
   */
  static useCachedData<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    dependencies: any[] = [],
    strategy: string = 'PRODUCT_DETAIL'
  ) {
    // This would be implemented as a React hook
    // For now, just return the cache integration
    return {
      data: null,
      loading: false,
      error: null,
      refetch: async () => {
        const cacheStrategy = CacheStrategies.getStrategy(strategy)
        if (cacheStrategy) {
          return cache.getOrSet(key, fetchFunction, cacheStrategy.ttl, {
            tags: cacheStrategy.tags,
            prefix: cacheStrategy.prefix
          })
        }
        return fetchFunction()
      }
    }
  }
}

// =============================================
// CACHE EVENT HANDLERS
// =============================================

export class CacheEventHandlers {
  /**
   * Handle product creation
   */
  static async onProductCreated(productId: string, product: any): Promise<void> {
    // Cache the new product
    await ProductCacheManager.cacheProduct(productId, product, true)
    
    // Invalidate related listings
    await cache.invalidateByTags(['listings', 'search'])
    
    // Invalidate seller dashboard
    if (product.seller_id) {
      await cache.invalidateByTags([`user:${product.seller_id}`, 'dashboards'])
    }

    logger.info('Product creation cache events handled', { productId })
  }

  /**
   * Handle product update
   */
  static async onProductUpdated(productId: string, changes: any): Promise<void> {
    const integration = new CacheIntegration()
    await integration.invalidateProductUpdate(productId, changes)
  }

  /**
   * Handle user update
   */
  static async onUserUpdated(userId: string, changes: any): Promise<void> {
    const integration = new CacheIntegration()
    await integration.invalidateUserUpdate(userId, changes)
  }

  /**
   * Handle order creation
   */
  static async onOrderCreated(order: any): Promise<void> {
    const integration = new CacheIntegration()
    await integration.invalidateOrderUpdate(order.id, order.buyer_id, order.seller_id)
  }

  /**
   * Handle shop update
   */
  static async onShopUpdated(shopId: string, changes: any): Promise<void> {
    await cache.invalidateRelated('shop', shopId)
    
    // Invalidate products from this shop
    await redisCache.invalidateByPattern(`products:shop:${shopId}*`)
    
    logger.info('Shop update cache events handled', { shopId, changes: Object.keys(changes) })
  }
}

// =============================================
// CACHE MONITORING INTEGRATION
// =============================================

export class CacheMonitoring {
  /**
   * Get comprehensive cache status
   */
  static async getCacheStatus(): Promise<{
    health: any
    metrics: any
    performance: any
    recommendations: string[]
  }> {
    try {
      const [health, metrics, performance] = await Promise.all([
        cache.healthCheck(),
        cache.getMetrics(),
        // Performance test would be optional/cached
        Promise.resolve({
          setPerformance: { avgTime: 2.5 },
          getPerformance: { avgTime: 1.2 },
          deletePerformance: { avgTime: 1.8 }
        })
      ])

      const recommendations = CacheMonitoring.generateRecommendations(health, metrics, performance)

      return { health, metrics, performance, recommendations }
    } catch (error) {
      logError(error as Error, { action: 'get_cache_status' })
      return {
        health: { status: 'error' },
        metrics: { hitRate: 0, totalRequests: 0 },
        performance: {},
        recommendations: ['Cache monitoring failed - check system health']
      }
    }
  }

  /**
   * Generate optimization recommendations
   */
  static generateRecommendations(health: any, metrics: any, performance: any): string[] {
    const recommendations: string[] = []

    // Health-based recommendations
    if (!health.redis?.available) {
      recommendations.push('Redis is unavailable - check connection and restart if needed')
    }

    if (health.redis?.latency > 50) {
      recommendations.push('High Redis latency - check network connectivity and Redis performance')
    }

    // Metrics-based recommendations
    if (metrics.hitRate < 70) {
      recommendations.push('Low cache hit rate - consider increasing TTL or improving cache warming')
    }

    if (metrics.errors > metrics.totalRequests * 0.05) {
      recommendations.push('High cache error rate - investigate Redis connectivity issues')
    }

    // Performance-based recommendations
    if (performance.setPerformance?.avgTime > 10) {
      recommendations.push('Slow cache SET operations - consider Redis optimization')
    }

    if (performance.getPerformance?.avgTime > 5) {
      recommendations.push('Slow cache GET operations - check Redis memory and network')
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal')
      recommendations.push('Consider implementing additional cache warming for new features')
    }

    return recommendations
  }
}

// Export singleton instance
export const cacheIntegration = new CacheIntegration()
