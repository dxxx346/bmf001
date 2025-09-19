/**
 * Cache Warmup Service
 * Intelligent cache warming based on usage patterns and data access frequency
 */

import { cache, redisCache } from './redis-cache'
import { CacheStrategies } from './cache-strategies'
import { redis } from '@/lib/redis'
import { createServiceClient } from '@/lib/supabase'
import { logError } from '@/lib/logger'
import { defaultLogger as logger } from '@/lib/logger'

export interface WarmupConfig {
  products?: {
    featured?: boolean
    popular?: boolean
    recent?: boolean
    categories?: number[]
    limit?: number
  }
  users?: {
    active?: boolean
    sellers?: boolean
    buyers?: boolean
    limit?: number
  }
  analytics?: {
    dashboard?: boolean
    reports?: boolean
    periods?: string[]
  }
  static?: {
    categories?: boolean
    settings?: boolean
  }
}

export interface WarmupResult {
  success: boolean
  duration: number
  itemsWarmed: number
  errors: number
  details: Record<string, any>
}

export class CacheWarmupService {
  private supabase = createServiceClient()
  private isWarming = false

  // =============================================
  // MAIN WARMUP METHODS
  // =============================================

  /**
   * Comprehensive cache warmup based on configuration
   */
  async warmup(config: WarmupConfig): Promise<WarmupResult> {
    if (this.isWarming) {
      throw new Error('Cache warmup already in progress')
    }

    this.isWarming = true
    const startTime = performance.now()
    let itemsWarmed = 0
    let errors = 0
    const details: Record<string, any> = {}

    try {
      logger.info('Starting comprehensive cache warmup', config)

      // Warm products
      if (config.products) {
        const productResult = await this.warmProducts(config.products)
        itemsWarmed += productResult.itemsWarmed
        errors += productResult.errors
        details.products = productResult
      }

      // Warm users
      if (config.users) {
        const userResult = await this.warmUsers(config.users)
        itemsWarmed += userResult.itemsWarmed
        errors += userResult.errors
        details.users = userResult
      }

      // Warm analytics
      if (config.analytics) {
        const analyticsResult = await this.warmAnalytics(config.analytics)
        itemsWarmed += analyticsResult.itemsWarmed
        errors += analyticsResult.errors
        details.analytics = analyticsResult
      }

      // Warm static data
      if (config.static) {
        const staticResult = await this.warmStatic(config.static)
        itemsWarmed += staticResult.itemsWarmed
        errors += staticResult.errors
        details.static = staticResult
      }

      const duration = performance.now() - startTime

      logger.info('Cache warmup completed', {
        duration,
        itemsWarmed,
        errors,
        successRate: ((itemsWarmed - errors) / Math.max(1, itemsWarmed)) * 100
      })

      return {
        success: true,
        duration,
        itemsWarmed,
        errors,
        details
      }

    } catch (error) {
      logError(error as Error, { action: 'cache_warmup', config })
      return {
        success: false,
        duration: performance.now() - startTime,
        itemsWarmed,
        errors: errors + 1,
        details
      }
    } finally {
      this.isWarming = false
    }
  }

  // =============================================
  // PRODUCT WARMUP
  // =============================================

  private async warmProducts(config: {
    featured?: boolean
    popular?: boolean
    recent?: boolean
    categories?: number[]
    limit?: number
  }): Promise<{ itemsWarmed: number; errors: number; details: any }> {
    let itemsWarmed = 0
    let errors = 0
    const details: any = {}

    try {
      if (config.featured) {
        const featuredResult = await this.warmFeaturedProducts(config.limit)
        itemsWarmed += featuredResult.count
        errors += featuredResult.errors
        details.featured = featuredResult
      }

      if (config.popular) {
        const popularResult = await this.warmPopularProducts(config.limit)
        itemsWarmed += popularResult.count
        errors += popularResult.errors
        details.popular = popularResult
      }

      if (config.recent) {
        const recentResult = await this.warmRecentProducts(config.limit)
        itemsWarmed += recentResult.count
        errors += recentResult.errors
        details.recent = recentResult
      }

      if (config.categories && config.categories.length > 0) {
        const categoryResult = await this.warmProductsByCategories(config.categories, config.limit)
        itemsWarmed += categoryResult.count
        errors += categoryResult.errors
        details.categories = categoryResult
      }

    } catch (error) {
      logError(error as Error, { action: 'warm_products', config })
      errors++
    }

    return { itemsWarmed, errors, details }
  }

  private async warmFeaturedProducts(limit: number = 20): Promise<{ count: number; errors: number }> {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select(`
          *,
          seller:users!seller_id(id, name, avatar_url),
          shop:shops!shop_id(id, name, slug, logo_url),
          category:categories!category_id(id, name),
          files:product_files(*),
          images:product_images(*),
          stats:product_stats(*)
        `)
        .eq('status', 'active')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Cache each product individually
      const warmingTasks = (products || []).map(async (product) => {
        try {
          await cache.set(
            `${product.id}:full`,
            product,
            'products',
            { 
              tags: ['products', 'featured', `product:${product.id}`],
              prefix: 'product'
            }
          )
          return true
        } catch (error) {
          logError(error as Error, { action: 'warm_featured_product', productId: product.id })
          return false
        }
      })

      const results = await Promise.all(warmingTasks)
      const successCount = results.filter(Boolean).length
      const errorCount = results.length - successCount

      // Cache the featured products list
      await cache.set(
        'featured',
        { products: products || [], cached_at: new Date().toISOString() },
        'products',
        { tags: ['products', 'featured'], prefix: 'products' }
      )

      logger.info('Featured products warmed', { count: successCount, errors: errorCount })
      return { count: successCount, errors: errorCount }

    } catch (error) {
      logError(error as Error, { action: 'warm_featured_products' })
      return { count: 0, errors: 1 }
    }
  }

  private async warmPopularProducts(limit: number = 20): Promise<{ count: number; errors: number }> {
    try {
      // Get popular products based on views/purchases
      const { data: products, error } = await this.supabase
        .from('products')
        .select(`
          *,
          seller:users!seller_id(id, name, avatar_url),
          shop:shops!shop_id(id, name, slug, logo_url),
          stats:product_stats(*)
        `)
        .eq('status', 'active')
        .order('views', { ascending: false })
        .limit(limit)

      if (error) throw error

      let warmed = 0
      let errors = 0

      for (const product of products || []) {
        try {
          await cache.set(
            `${product.id}:full`,
            product,
            'products',
            { 
              tags: ['products', 'popular', `product:${product.id}`],
              prefix: 'product'
            }
          )
          warmed++
        } catch (error) {
          errors++
        }
      }

      // Cache the popular products list
      await cache.set(
        'popular',
        { products: products || [], cached_at: new Date().toISOString() },
        'products',
        { tags: ['products', 'popular'], prefix: 'products' }
      )

      return { count: warmed, errors }

    } catch (error) {
      logError(error as Error, { action: 'warm_popular_products' })
      return { count: 0, errors: 1 }
    }
  }

  private async warmRecentProducts(limit: number = 20): Promise<{ count: number; errors: number }> {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select(`
          *,
          seller:users!seller_id(id, name, avatar_url),
          shop:shops!shop_id(id, name, slug, logo_url),
          category:categories!category_id(id, name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      let warmed = 0
      let errors = 0

      for (const product of products || []) {
        try {
          await cache.set(
            `${product.id}:full`,
            product,
            'products',
            { 
              tags: ['products', 'recent', `product:${product.id}`],
              prefix: 'product'
            }
          )
          warmed++
        } catch (error) {
          errors++
        }
      }

      return { count: warmed, errors }

    } catch (error) {
      logError(error as Error, { action: 'warm_recent_products' })
      return { count: 0, errors: 1 }
    }
  }

  private async warmProductsByCategories(
    categoryIds: number[],
    limit: number = 10
  ): Promise<{ count: number; errors: number }> {
    let totalWarmed = 0
    let totalErrors = 0

    for (const categoryId of categoryIds) {
      try {
        const { data: products, error } = await this.supabase
          .from('products')
          .select(`
            *,
            seller:users!seller_id(id, name, avatar_url),
            category:categories!category_id(id, name)
          `)
          .eq('status', 'active')
          .eq('category_id', categoryId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) throw error

        for (const product of products || []) {
          try {
            await cache.set(
              `${product.id}:basic`,
              product,
              'products',
              { 
                tags: ['products', `category:${categoryId}`, `product:${product.id}`],
                prefix: 'product'
              }
            )
            totalWarmed++
          } catch (error) {
            totalErrors++
          }
        }

        // Cache category products list
        await cache.set(
          `category:${categoryId}`,
          { products: products || [], category_id: categoryId, cached_at: new Date().toISOString() },
          'products',
          { tags: ['products', `category:${categoryId}`], prefix: 'products' }
        )

      } catch (error) {
        logError(error as Error, { action: 'warm_category_products', categoryId })
        totalErrors++
      }
    }

    return { count: totalWarmed, errors: totalErrors }
  }

  // =============================================
  // USER WARMUP
  // =============================================

  private async warmUsers(config: {
    active?: boolean
    sellers?: boolean
    buyers?: boolean
    limit?: number
  }): Promise<{ itemsWarmed: number; errors: number; details: any }> {
    let itemsWarmed = 0
    let errors = 0
    const details: any = {}

    try {
      if (config.active) {
        const activeResult = await this.warmActiveUsers(config.limit)
        itemsWarmed += activeResult.count
        errors += activeResult.errors
        details.active = activeResult
      }

      if (config.sellers) {
        const sellersResult = await this.warmSellers(config.limit)
        itemsWarmed += sellersResult.count
        errors += sellersResult.errors
        details.sellers = sellersResult
      }

      if (config.buyers) {
        const buyersResult = await this.warmBuyers(config.limit)
        itemsWarmed += buyersResult.count
        errors += buyersResult.errors
        details.buyers = buyersResult
      }

    } catch (error) {
      logError(error as Error, { action: 'warm_users', config })
      errors++
    }

    return { itemsWarmed, errors, details }
  }

  private async warmActiveUsers(limit: number = 50): Promise<{ count: number; errors: number }> {
    try {
      const { data: users, error } = await this.supabase
        .from('users')
        .select('id, role')
        .order('last_seen_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      let warmed = 0
      let errors = 0

      for (const user of users || []) {
        try {
          // Warm dashboard based on role
          if (user.role === 'buyer') {
            const { data: dashboard } = await this.supabase
              .rpc('get_buyer_dashboard_optimized', { buyer_id: user.id })
            
            await cache.set(
              `buyer:${user.id}`,
              dashboard,
              'users',
              { tags: ['users', 'dashboards', `user:${user.id}`], prefix: 'dashboard' }
            )
          } else if (user.role === 'seller') {
            const { data: dashboard } = await this.supabase
              .rpc('get_seller_dashboard_optimized', { seller_id: user.id, period_days: 30 })
            
            await cache.set(
              `seller:${user.id}`,
              dashboard,
              'users',
              { tags: ['users', 'dashboards', `user:${user.id}`], prefix: 'dashboard' }
            )
          }
          
          warmed++
        } catch (error) {
          errors++
        }
      }

      return { count: warmed, errors }

    } catch (error) {
      logError(error as Error, { action: 'warm_active_users' })
      return { count: 0, errors: 1 }
    }
  }

  private async warmSellers(limit: number = 20): Promise<{ count: number; errors: number }> {
    try {
      const { data: sellers, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('role', 'seller')
        .order('last_seen_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      let warmed = 0
      let errors = 0

      for (const seller of sellers || []) {
        try {
          // Warm seller dashboard
          const { data: dashboard } = await this.supabase
            .rpc('get_seller_dashboard_optimized', { seller_id: seller.id, period_days: 30 })
          
          await cache.set(
            `seller:${seller.id}`,
            dashboard,
            'users',
            { tags: ['users', 'sellers', `user:${seller.id}`], prefix: 'dashboard' }
          )

          // Warm seller products
          const { data: products } = await this.supabase
            .from('products')
            .select('id, title, status, stats:product_stats(*)')
            .eq('seller_id', seller.id)
            .eq('status', 'active')
            .limit(10)

          if (products) {
            await cache.set(
              `seller_products:${seller.id}`,
              products,
              'products',
              { tags: ['products', 'sellers', `seller:${seller.id}`], prefix: 'products' }
            )
          }

          warmed++
        } catch (error) {
          errors++
        }
      }

      return { count: warmed, errors }

    } catch (error) {
      logError(error as Error, { action: 'warm_sellers' })
      return { count: 0, errors: 1 }
    }
  }

  private async warmBuyers(limit: number = 30): Promise<{ count: number; errors: number }> {
    try {
      // Get recent buyers (users with purchases)
      const { data: buyers, error } = await this.supabase
        .from('purchases')
        .select('buyer_id')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const uniqueBuyers = [...new Set(buyers?.map(b => b.buyer_id) || [])]
      let warmed = 0
      let errors = 0

      for (const buyerId of uniqueBuyers) {
        try {
          // Warm buyer dashboard
          const { data: dashboard } = await this.supabase
            .rpc('get_buyer_dashboard_optimized', { buyer_id: buyerId })
          
          await cache.set(
            `buyer:${buyerId}`,
            dashboard,
            'users',
            { tags: ['users', 'buyers', `user:${buyerId}`], prefix: 'dashboard' }
          )

          warmed++
        } catch (error) {
          errors++
        }
      }

      return { count: warmed, errors }

    } catch (error) {
      logError(error as Error, { action: 'warm_buyers' })
      return { count: 0, errors: 1 }
    }
  }

  // =============================================
  // ANALYTICS WARMUP
  // =============================================

  private async warmAnalytics(config: {
    dashboard?: boolean
    reports?: boolean
    periods?: string[]
  }): Promise<{ itemsWarmed: number; errors: number; details: any }> {
    let itemsWarmed = 0
    let errors = 0
    const details: any = {}

    const periods = config.periods || ['7d', '30d']

    try {
      if (config.dashboard) {
        for (const period of periods) {
          try {
            // Warm admin dashboard analytics
            const { data: adminData } = await this.supabase
              .rpc('get_admin_dashboard_data', { period_days: this.periodToDays(period) })
            
            await cache.set(
              `admin:${period}`,
              adminData,
              'analytics',
              { tags: ['analytics', 'dashboard', `period:${period}`], prefix: 'analytics' }
            )

            itemsWarmed++
          } catch (error) {
            errors++
          }
        }
        details.dashboard = { periods, warmed: periods.length - errors }
      }

      if (config.reports) {
        // Warm common reports
        const reportTypes = ['revenue', 'products', 'users']
        
        for (const reportType of reportTypes) {
          for (const period of periods) {
            try {
              // This would call your analytics service
              const reportData = {
                type: reportType,
                period,
                generated_at: new Date().toISOString(),
                data: {} // Placeholder
              }

              await cache.set(
                `${reportType}:${period}`,
                reportData,
                'analytics',
                { tags: ['analytics', 'reports', `type:${reportType}`], prefix: 'reports' }
              )

              itemsWarmed++
            } catch (error) {
              errors++
            }
          }
        }
        details.reports = { types: reportTypes, periods, warmed: reportTypes.length * periods.length - errors }
      }

    } catch (error) {
      logError(error as Error, { action: 'warm_analytics', config })
      errors++
    }

    return { itemsWarmed, errors, details }
  }

  // =============================================
  // STATIC DATA WARMUP
  // =============================================

  private async warmStatic(config: {
    categories?: boolean
    settings?: boolean
  }): Promise<{ itemsWarmed: number; errors: number; details: any }> {
    let itemsWarmed = 0
    let errors = 0
    const details: any = {}

    try {
      if (config.categories) {
        try {
          const { data: categories, error } = await this.supabase
            .from('categories')
            .select('*')
            .order('name')

          if (error) throw error

          await cache.set(
            'all',
            categories,
            'static',
            { tags: ['static', 'categories'], prefix: 'categories' }
          )

          itemsWarmed++
          details.categories = { count: categories?.length || 0 }
        } catch (error) {
          errors++
          details.categories = { error: error.message }
        }
      }

      if (config.settings) {
        try {
          // This would fetch system settings
          const settings = {
            app_name: 'BMF Marketplace',
            version: '1.0.0',
            features: ['products', 'payments', 'analytics'],
            cached_at: new Date().toISOString()
          }

          await cache.set(
            'system',
            settings,
            'static',
            { tags: ['static', 'settings'], prefix: 'settings' }
          )

          itemsWarmed++
          details.settings = { warmed: true }
        } catch (error) {
          errors++
          details.settings = { error: error.message }
        }
      }

    } catch (error) {
      logError(error as Error, { action: 'warm_static', config })
      errors++
    }

    return { itemsWarmed, errors, details }
  }

  // =============================================
  // SCHEDULED WARMUP
  // =============================================

  /**
   * Schedule regular cache warmup
   */
  async scheduleWarmup(config: WarmupConfig & { interval: number }): Promise<void> {
    logger.info('Scheduling cache warmup', { interval: config.interval })

    const warmupInterval = setInterval(async () => {
      try {
        const result = await this.warmup(config)
        logger.info('Scheduled warmup completed', {
          itemsWarmed: result.itemsWarmed,
          errors: result.errors,
          duration: result.duration
        })
      } catch (error) {
        logError(error as Error, { action: 'scheduled_warmup' })
      }
    }, config.interval)

    // Store interval reference for cleanup
    process.on('SIGTERM', () => {
      clearInterval(warmupInterval)
    })
  }

  /**
   * Smart warmup based on current cache state
   */
  async smartWarmup(): Promise<WarmupResult> {
    logger.info('Starting smart cache warmup...')

    try {
      const metrics = redisCache.getMetrics()
      const config: WarmupConfig = {}

      // Determine what to warm based on current metrics
      if (metrics.hitRate < 70) {
        // Low hit rate - warm everything
        config.products = { featured: true, popular: true, recent: true, limit: 30 }
        config.users = { active: true, sellers: true, buyers: true, limit: 50 }
        config.analytics = { dashboard: true, reports: true }
        config.static = { categories: true, settings: true }
      } else if (metrics.hitRate < 85) {
        // Medium hit rate - warm high-value items
        config.products = { featured: true, popular: true, limit: 20 }
        config.users = { active: true, limit: 30 }
        config.analytics = { dashboard: true }
        config.static = { categories: true }
      } else {
        // High hit rate - minimal warming
        config.products = { featured: true, limit: 10 }
        config.users = { active: true, limit: 20 }
        config.static = { categories: true }
      }

      return await this.warmup(config)

    } catch (error) {
      logError(error as Error, { action: 'smart_warmup' })
      return {
        success: false,
        duration: 0,
        itemsWarmed: 0,
        errors: 1,
        details: { error: error.message }
      }
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private periodToDays(period: string): number {
    switch (period) {
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      case '1y': return 365
      default: return 30
    }
  }

  /**
   * Check if warmup is in progress
   */
  isWarmupInProgress(): boolean {
    return this.isWarming
  }

  /**
   * Get warmup recommendations based on current state
   */
  async getWarmupRecommendations(): Promise<{
    immediate: string[]
    scheduled: string[]
    optimization: string[]
  }> {
    try {
      const metrics = redisCache.getMetrics()
      const health = await redisCache.healthCheck()

      const immediate: string[] = []
      const scheduled: string[] = []
      const optimization: string[] = []

      if (metrics.hitRate < 60) {
        immediate.push('Run comprehensive cache warmup - hit rate is very low')
        immediate.push('Warm featured products and active user dashboards')
      }

      if (health.redis.available && health.redis.latency && health.redis.latency < 10) {
        scheduled.push('Schedule regular warmup every 4 hours during low traffic')
        scheduled.push('Implement intelligent warmup based on access patterns')
      }

      if (metrics.totalRequests > 1000) {
        optimization.push('Analyze access patterns to optimize warmup strategy')
        optimization.push('Consider implementing predictive cache warming')
      }

      return { immediate, scheduled, optimization }

    } catch (error) {
      logError(error as Error, { action: 'get_warmup_recommendations' })
      return {
        immediate: ['Unable to analyze - check cache system health'],
        scheduled: [],
        optimization: []
      }
    }
  }
}

// Export singleton instance
export const cacheWarmupService = new CacheWarmupService()
