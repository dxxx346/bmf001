/**
 * Query Optimizer - Eliminates N+1 Problems and Implements DataLoader Pattern
 * Provides optimized query builders with proper joins and caching
 */

import { createServiceClient } from '@/lib/supabase'
import { redis } from '@/lib/redis'
import { logError } from '@/lib/logger'
import { defaultLogger as logger } from '@/lib/logger'
import DataLoader from 'dataloader'

interface QueryOptions {
  useCache?: boolean
  cacheTTL?: number
  batchLoad?: boolean
}

interface QueryMetrics {
  queryId: string
  startTime: number
  endTime?: number
  duration?: number
  cacheHit?: boolean
  resultCount?: number
  query: string
}

export class QueryOptimizer {
  private supabase = createServiceClient()
  private queryMetrics: Map<string, QueryMetrics> = new Map()
  
  // DataLoader instances for batch loading
  private productLoader = new DataLoader<string, any>(this.batchLoadProducts.bind(this))
  private userLoader = new DataLoader<string, any>(this.batchLoadUsers.bind(this))
  private shopLoader = new DataLoader<string, any>(this.batchLoadShops.bind(this))
  private orderLoader = new DataLoader<string, any>(this.batchLoadOrders.bind(this))
  private paymentLoader = new DataLoader<string, any>(this.batchLoadPayments.bind(this))

  // =============================================
  // OPTIMIZED PRODUCT QUERIES
  // =============================================

  /**
   * Get products with all related data in a single query (eliminates N+1)
   * BEFORE: 1 query for products + N queries for files + N queries for images + N queries for stats
   * AFTER: 1 query with proper joins
   */
  async getProductsWithRelations(
    filters: any = {},
    options: QueryOptions = {}
  ): Promise<{ products: any[]; metrics: QueryMetrics }> {
    const queryId = `products_with_relations_${Date.now()}`
    const startTime = performance.now()
    
    try {
      // Check cache first
      if (options.useCache) {
        const cacheKey = `products:${JSON.stringify(filters)}`
        const cached = await this.getFromCache(cacheKey)
        if (cached) {
          return {
            products: cached,
            metrics: {
              queryId,
              startTime,
              endTime: performance.now(),
              duration: performance.now() - startTime,
              cacheHit: true,
              resultCount: cached.length,
              query: 'cache_hit'
            }
          }
        }
      }

      // Single optimized query with all relations
      let query = this.supabase
        .from('products')
        .select(`
          *,
          seller:users!seller_id(
            id,
            name,
            email,
            avatar_url
          ),
          shop:shops!shop_id(
            id,
            name,
            slug,
            logo_url
          ),
          category:categories!category_id(
            id,
            name
          ),
          subcategory:categories!subcategory_id(
            id,
            name
          ),
          files:product_files(
            id,
            filename,
            file_url,
            file_size,
            file_type,
            is_primary
          ),
          images:product_images(
            id,
            image_url,
            alt_text,
            is_primary,
            sort_order
          ),
          versions:product_versions(
            id,
            version_number,
            release_notes,
            file_url,
            created_at
          ),
          stats:product_stats(
            views,
            purchases,
            revenue,
            rating_average,
            rating_count,
            conversion_rate
          ),
          reviews:reviews(
            id,
            rating,
            comment,
            created_at,
            user:users(name, avatar_url)
          )
        `)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      if (filters.seller_id) {
        query = query.eq('seller_id', filters.seller_id)
      }
      if (filters.shop_id) {
        query = query.eq('shop_id', filters.shop_id)
      }
      if (filters.min_price) {
        query = query.gte('price', filters.min_price)
      }
      if (filters.max_price) {
        query = query.lte('price', filters.max_price)
      }
      if (filters.is_featured !== undefined) {
        query = query.eq('is_featured', filters.is_featured)
      }

      // Sorting
      const sortBy = filters.sort_by || 'created_at'
      const sortOrder = filters.sort_order || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
      }

      const { data: products, error } = await query

      if (error) throw error

      const endTime = performance.now()
      const metrics: QueryMetrics = {
        queryId,
        startTime,
        endTime,
        duration: endTime - startTime,
        cacheHit: false,
        resultCount: products?.length || 0,
        query: 'products_with_relations'
      }

      // Cache the results
      if (options.useCache && products) {
        const cacheKey = `products:${JSON.stringify(filters)}`
        await this.setCache(cacheKey, products, options.cacheTTL || 300) // 5 minutes default
      }

      // Store metrics
      this.queryMetrics.set(queryId, metrics)
      
      logger.info('Optimized product query executed', {
        duration: metrics.duration,
        resultCount: metrics.resultCount,
        cacheHit: metrics.cacheHit
      })

      return { products: products || [], metrics }
    } catch (error) {
      logError(error as Error, { action: 'get_products_with_relations', filters })
      return { products: [], metrics: { queryId, startTime, query: 'error' } }
    }
  }

  /**
   * Get user dashboard data with all relations (eliminates multiple queries)
   * BEFORE: Multiple separate queries for orders, favorites, purchases, analytics
   * AFTER: Optimized queries with proper joins and caching
   */
  async getUserDashboardData(
    userId: string,
    options: QueryOptions = {}
  ): Promise<{ dashboard: any; metrics: QueryMetrics[] }> {
    const startTime = performance.now()
    const metrics: QueryMetrics[] = []

    try {
      // Check cache first
      if (options.useCache) {
        const cacheKey = `user_dashboard:${userId}`
        const cached = await this.getFromCache(cacheKey)
        if (cached) {
          return {
            dashboard: cached,
            metrics: [{
              queryId: `dashboard_${userId}`,
              startTime,
              endTime: performance.now(),
              duration: performance.now() - startTime,
              cacheHit: true,
              query: 'cache_hit'
            }]
          }
        }
      }

      // Execute optimized parallel queries
      const [
        userProfile,
        recentOrders,
        favoriteProducts,
        purchaseHistory,
        userStats
      ] = await Promise.all([
        // User profile with shop info if seller
        this.supabase
          .from('users')
          .select(`
            *,
            shops:shops(
              id,
              name,
              slug,
              logo_url,
              is_active,
              stats:shop_stats(
                total_products,
                total_sales,
                total_revenue
              )
            )
          `)
          .eq('id', userId)
          .single(),

        // Recent orders with full product and payment details
        this.supabase
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
              seller:users(name),
              shop:shops(name, slug)
            ),
            payment:payments(
              id,
              amount,
              currency,
              status,
              provider,
              created_at
            )
          `)
          .eq('buyer_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),

        // Favorite products with full details
        this.supabase
          .from('favorites')
          .select(`
            id,
            created_at,
            product:products(
              id,
              title,
              description,
              price,
              thumbnail_url,
              seller:users(name),
              shop:shops(name, slug),
              stats:product_stats(rating_average, rating_count)
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),

        // Purchase history with download info
        this.supabase
          .from('purchases')
          .select(`
            id,
            created_at,
            product:products(
              id,
              title,
              price,
              is_downloadable,
              download_limit,
              download_expiry_days
            ),
            payment:payments(
              amount,
              currency,
              status
            ),
            downloads:product_downloads(
              id,
              downloaded_at,
              download_count
            )
          `)
          .eq('buyer_id', userId)
          .eq('payment.status', 'succeeded')
          .order('created_at', { ascending: false }),

        // User statistics
        this.supabase
          .rpc('get_user_stats', { user_id: userId })
      ])

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      // Compile dashboard data
      const dashboard = {
        user: userProfile.data,
        recent_orders: recentOrders.data || [],
        favorites: favoriteProducts.data || [],
        purchase_history: purchaseHistory.data || [],
        stats: userStats.data || {
          total_purchases: 0,
          total_spent: 0,
          favorite_categories: [],
          download_count: 0
        },
        last_updated: new Date().toISOString()
      }

      // Cache the results
      if (options.useCache) {
        const cacheKey = `user_dashboard:${userId}`
        await this.setCache(cacheKey, dashboard, options.cacheTTL || 180) // 3 minutes
      }

      metrics.push({
        queryId: `user_dashboard_${userId}`,
        startTime,
        endTime,
        duration: totalDuration,
        cacheHit: false,
        resultCount: dashboard.recent_orders.length + dashboard.favorites.length,
        query: 'user_dashboard_optimized'
      })

      logger.info('User dashboard data retrieved', {
        userId,
        duration: totalDuration,
        ordersCount: dashboard.recent_orders.length,
        favoritesCount: dashboard.favorites.length
      })

      return { dashboard, metrics }
    } catch (error) {
      logError(error as Error, { action: 'get_user_dashboard_data', userId })
      return { 
        dashboard: { user: null, recent_orders: [], favorites: [], purchase_history: [], stats: {} },
        metrics: []
      }
    }
  }

  /**
   * Get order history with full details (eliminates N+1 for order items)
   * BEFORE: 1 query for orders + N queries for products + N queries for payments
   * AFTER: Single optimized query with joins
   */
  async getOrderHistoryOptimized(
    userId: string,
    filters: any = {},
    options: QueryOptions = {}
  ): Promise<{ orders: any[]; metrics: QueryMetrics }> {
    const queryId = `order_history_${userId}`
    const startTime = performance.now()

    try {
      // Check cache first
      if (options.useCache) {
        const cacheKey = `orders:${userId}:${JSON.stringify(filters)}`
        const cached = await this.getFromCache(cacheKey)
        if (cached) {
          return {
            orders: cached,
            metrics: {
              queryId,
              startTime,
              endTime: performance.now(),
              duration: performance.now() - startTime,
              cacheHit: true,
              resultCount: cached.length,
              query: 'cache_hit'
            }
          }
        }
      }

      // Single optimized query for complete order data
      let query = this.supabase
        .from('purchases')
        .select(`
          id,
          created_at,
          status,
          buyer_id,
          product:products(
            id,
            title,
            description,
            price,
            thumbnail_url,
            seller:users(
              id,
              name,
              email
            ),
            shop:shops(
              id,
              name,
              slug,
              logo_url
            ),
            category:categories(
              id,
              name
            )
          ),
          payment:payments(
            id,
            amount,
            currency,
            status,
            provider,
            external_id,
            created_at,
            updated_at
          ),
          downloads:product_downloads(
            id,
            downloaded_at,
            download_count,
            ip_address,
            user_agent
          ),
          refunds:refunds(
            id,
            amount,
            reason,
            status,
            created_at
          )
        `)
        .eq('buyer_id', userId)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.payment_status) {
        query = query.eq('payment.status', filters.payment_status)
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date)
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date)
      }

      // Sorting and pagination
      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50)

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data: orders, error } = await query

      if (error) throw error

      const endTime = performance.now()
      const metrics: QueryMetrics = {
        queryId,
        startTime,
        endTime,
        duration: endTime - startTime,
        cacheHit: false,
        resultCount: orders?.length || 0,
        query: 'order_history_optimized'
      }

      // Cache results
      if (options.useCache && orders) {
        const cacheKey = `orders:${userId}:${JSON.stringify(filters)}`
        await this.setCache(cacheKey, orders, options.cacheTTL || 300)
      }

      logger.info('Order history retrieved', {
        userId,
        duration: metrics.duration,
        resultCount: metrics.resultCount
      })

      return { orders: orders || [], metrics }
    } catch (error) {
      logError(error as Error, { action: 'get_order_history_optimized', userId })
      return { orders: [], metrics: { queryId, startTime, query: 'error' } }
    }
  }

  // =============================================
  // DATALOADER BATCH LOADING METHODS
  // =============================================

  private async batchLoadProducts(productIds: readonly string[]): Promise<any[]> {
    const { data: products } = await this.supabase
      .from('products')
      .select(`
        *,
        files:product_files(*),
        images:product_images(*),
        stats:product_stats(*)
      `)
      .in('id', productIds)

    // Return in same order as requested
    return productIds.map(id => products?.find(p => p.id === id) || null)
  }

  private async batchLoadUsers(userIds: readonly string[]): Promise<any[]> {
    const { data: users } = await this.supabase
      .from('users')
      .select('*')
      .in('id', userIds)

    return userIds.map(id => users?.find(u => u.id === id) || null)
  }

  private async batchLoadShops(shopIds: readonly string[]): Promise<any[]> {
    const { data: shops } = await this.supabase
      .from('shops')
      .select(`
        *,
        owner:users(id, name, email),
        stats:shop_stats(*)
      `)
      .in('id', shopIds)

    return shopIds.map(id => shops?.find(s => s.id === id) || null)
  }

  private async batchLoadOrders(orderIds: readonly string[]): Promise<any[]> {
    const { data: orders } = await this.supabase
      .from('purchases')
      .select(`
        *,
        product:products(*),
        payment:payments(*),
        buyer:users(*)
      `)
      .in('id', orderIds)

    return orderIds.map(id => orders?.find(o => o.id === id) || null)
  }

  private async batchLoadPayments(paymentIds: readonly string[]): Promise<any[]> {
    const { data: payments } = await this.supabase
      .from('payments')
      .select('*')
      .in('id', paymentIds)

    return paymentIds.map(id => payments?.find(p => p.id === id) || null)
  }

  // =============================================
  // DATALOADER PUBLIC METHODS
  // =============================================

  async loadProduct(productId: string): Promise<any> {
    return this.productLoader.load(productId)
  }

  async loadProducts(productIds: string[]): Promise<any[]> {
    return this.productLoader.loadMany(productIds)
  }

  async loadUser(userId: string): Promise<any> {
    return this.userLoader.load(userId)
  }

  async loadUsers(userIds: string[]): Promise<any[]> {
    return this.userLoader.loadMany(userIds)
  }

  async loadShop(shopId: string): Promise<any> {
    return this.shopLoader.load(shopId)
  }

  async loadOrder(orderId: string): Promise<any> {
    return this.orderLoader.load(orderId)
  }

  async loadPayment(paymentId: string): Promise<any> {
    return this.paymentLoader.load(paymentId)
  }

  // =============================================
  // CACHING UTILITIES
  // =============================================

  private async getFromCache(key: string): Promise<any> {
    try {
      const cached = await redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logError(error as Error, { action: 'get_from_cache', key })
      return null
    }
  }

  private async setCache(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      logError(error as Error, { action: 'set_cache', key })
    }
  }

  // =============================================
  // PERFORMANCE MONITORING
  // =============================================

  getQueryMetrics(): QueryMetrics[] {
    return Array.from(this.queryMetrics.values())
  }

  getAverageQueryTime(): number {
    const metrics = this.getQueryMetrics()
    if (metrics.length === 0) return 0
    
    const totalTime = metrics.reduce((sum, metric) => sum + (metric.duration || 0), 0)
    return totalTime / metrics.length
  }

  getCacheHitRate(): number {
    const metrics = this.getQueryMetrics()
    if (metrics.length === 0) return 0
    
    const cacheHits = metrics.filter(m => m.cacheHit).length
    return (cacheHits / metrics.length) * 100
  }

  clearMetrics(): void {
    this.queryMetrics.clear()
  }

  // =============================================
  // QUERY BUILDER UTILITIES
  // =============================================

  buildProductQuery(options: {
    includeRelations?: boolean
    includeStats?: boolean
    includeReviews?: boolean
  } = {}) {
    let selectClause = '*'
    
    if (options.includeRelations) {
      selectClause += `,
        seller:users!seller_id(id, name, avatar_url),
        shop:shops!shop_id(id, name, slug, logo_url),
        category:categories!category_id(id, name)`
    }
    
    if (options.includeStats) {
      selectClause += `,
        stats:product_stats(*)`
    }
    
    if (options.includeReviews) {
      selectClause += `,
        reviews:reviews(id, rating, comment, user:users(name))`
    }

    return this.supabase.from('products').select(selectClause)
  }

  // Clear all DataLoader caches
  clearLoaders(): void {
    this.productLoader.clearAll()
    this.userLoader.clearAll()
    this.shopLoader.clearAll()
    this.orderLoader.clearAll()
    this.paymentLoader.clearAll()
  }

  async clearAllCaches(): Promise<void> {
    try {
      this.clearLoaders()
      this.clearMetrics()
      
      // Clear Redis cache patterns
      const patterns = ['products:*', 'search:*', 'user_dashboard:*', 'seller_dashboard:*']
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }
      
      logger.info('All caches cleared')
    } catch (error) {
      logError(error as Error, { action: 'clear_all_caches' })
    }
  }
}

export const queryOptimizer = new QueryOptimizer()
