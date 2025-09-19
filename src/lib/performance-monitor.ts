/**
 * Database Query Performance Monitor
 * Tracks query performance, identifies slow queries, and provides optimization insights
 */

import { redis } from '@/lib/redis'
import { logError } from '@/lib/logger'
import { defaultLogger as logger } from '@/lib/logger'

export interface QueryMetrics {
  queryId: string
  query: string
  duration: number
  timestamp: string
  resultCount?: number
  cacheHit?: boolean
  userId?: string
  optimization?: string
}

export interface PerformanceReport {
  totalQueries: number
  averageDuration: number
  slowestQueries: QueryMetrics[]
  cacheHitRate: number
  optimizationSuggestions: string[]
  timeRange: string
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, QueryMetrics> = new Map()
  private readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second
  private readonly MAX_METRICS_STORED = 10000

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // =============================================
  // QUERY TRACKING
  // =============================================

  async trackQuery(metrics: QueryMetrics): Promise<void> {
    try {
      // Store in memory
      this.metrics.set(metrics.queryId, metrics)
      
      // Clean up old metrics if we have too many
      if (this.metrics.size > this.MAX_METRICS_STORED) {
        const oldestKeys = Array.from(this.metrics.keys()).slice(0, 1000)
        oldestKeys.forEach(key => this.metrics.delete(key))
      }

      // Store in Redis for persistence
      await redis.lpush('query_metrics', JSON.stringify(metrics))
      await redis.ltrim('query_metrics', 0, this.MAX_METRICS_STORED - 1)

      // Log slow queries
      if (metrics.duration > this.SLOW_QUERY_THRESHOLD) {
        logger.warn('Slow query detected', {
          queryId: metrics.queryId,
          duration: metrics.duration,
          query: metrics.query,
          resultCount: metrics.resultCount
        })
      }

      // Store daily aggregates
      await this.updateDailyAggregates(metrics)

    } catch (error) {
      logError(error as Error, { action: 'track_query', queryId: metrics.queryId })
    }
  }

  // =============================================
  // PERFORMANCE ANALYSIS
  // =============================================

  async getPerformanceReport(timeRange: string = '24h'): Promise<PerformanceReport> {
    try {
      const cutoffTime = this.getCutoffTime(timeRange)
      const recentMetrics = Array.from(this.metrics.values())
        .filter(m => new Date(m.timestamp) >= cutoffTime)

      if (recentMetrics.length === 0) {
        return {
          totalQueries: 0,
          averageDuration: 0,
          slowestQueries: [],
          cacheHitRate: 0,
          optimizationSuggestions: [],
          timeRange
        }
      }

      const totalQueries = recentMetrics.length
      const averageDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
      const cacheHits = recentMetrics.filter(m => m.cacheHit).length
      const cacheHitRate = (cacheHits / totalQueries) * 100

      const slowestQueries = recentMetrics
        .filter(m => m.duration > this.SLOW_QUERY_THRESHOLD)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)

      const optimizationSuggestions = this.generateOptimizationSuggestions(recentMetrics)

      return {
        totalQueries,
        averageDuration,
        slowestQueries,
        cacheHitRate,
        optimizationSuggestions,
        timeRange
      }
    } catch (error) {
      logError(error as Error, { action: 'get_performance_report', timeRange })
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowestQueries: [],
        cacheHitRate: 0,
        optimizationSuggestions: ['Error generating report'],
        timeRange
      }
    }
  }

  // =============================================
  // OPTIMIZATION SUGGESTIONS
  // =============================================

  private generateOptimizationSuggestions(metrics: QueryMetrics[]): string[] {
    const suggestions: string[] = []
    
    // Check for N+1 patterns
    const queryPatterns = new Map<string, number>()
    metrics.forEach(m => {
      const pattern = this.extractQueryPattern(m.query)
      queryPatterns.set(pattern, (queryPatterns.get(pattern) || 0) + 1)
    })

    queryPatterns.forEach((count, pattern) => {
      if (count > 10 && pattern.includes('single_record')) {
        suggestions.push(`Potential N+1 problem detected: ${pattern} executed ${count} times`)
      }
    })

    // Check cache hit rate
    const cacheHits = metrics.filter(m => m.cacheHit).length
    const cacheHitRate = (cacheHits / metrics.length) * 100
    
    if (cacheHitRate < 50) {
      suggestions.push(`Low cache hit rate (${cacheHitRate.toFixed(1)}%). Consider increasing cache TTL or improving cache keys.`)
    }

    // Check for slow queries
    const slowQueries = metrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD)
    if (slowQueries.length > 0) {
      suggestions.push(`${slowQueries.length} slow queries detected. Consider adding indexes or optimizing query structure.`)
    }

    // Check for large result sets
    const largeResults = metrics.filter(m => (m.resultCount || 0) > 100)
    if (largeResults.length > 0) {
      suggestions.push(`${largeResults.length} queries returning large result sets. Consider pagination or result limiting.`)
    }

    // Check for missing optimizations
    const unoptimizedQueries = metrics.filter(m => !m.optimization)
    if (unoptimizedQueries.length > metrics.length * 0.3) {
      suggestions.push('Many queries are not using optimizations. Consider implementing DataLoader pattern or query joins.')
    }

    return suggestions
  }

  private extractQueryPattern(query: string): string {
    if (query.includes('select') && query.includes('eq(')) {
      return 'single_record_fetch'
    }
    if (query.includes('products_with_relations')) {
      return 'optimized_product_listing'
    }
    if (query.includes('user_dashboard')) {
      return 'optimized_dashboard'
    }
    if (query.includes('cache_hit')) {
      return 'cache_access'
    }
    return 'other'
  }

  // =============================================
  // DAILY AGGREGATES
  // =============================================

  private async updateDailyAggregates(metrics: QueryMetrics): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const key = `daily_metrics:${today}`
      
      const existing = await redis.get(key)
      const dailyData = existing ? JSON.parse(existing) : {
        date: today,
        totalQueries: 0,
        totalDuration: 0,
        slowQueries: 0,
        cacheHits: 0,
        queryTypes: {}
      }

      dailyData.totalQueries += 1
      dailyData.totalDuration += metrics.duration
      
      if (metrics.duration > this.SLOW_QUERY_THRESHOLD) {
        dailyData.slowQueries += 1
      }
      
      if (metrics.cacheHit) {
        dailyData.cacheHits += 1
      }

      const queryType = this.extractQueryPattern(metrics.query)
      dailyData.queryTypes[queryType] = (dailyData.queryTypes[queryType] || 0) + 1

      await redis.setex(key, 86400 * 7, JSON.stringify(dailyData)) // Keep for 7 days
    } catch (error) {
      logError(error as Error, { action: 'update_daily_aggregates' })
    }
  }

  // =============================================
  // PERFORMANCE ALERTS
  // =============================================

  async checkPerformanceAlerts(): Promise<void> {
    try {
      const report = await this.getPerformanceReport('1h')
      
      // Alert on high average query time
      if (report.averageDuration > 500) {
        logger.warn('High average query time detected', {
          averageDuration: report.averageDuration,
          totalQueries: report.totalQueries
        })
      }

      // Alert on low cache hit rate
      if (report.cacheHitRate < 30 && report.totalQueries > 50) {
        logger.warn('Low cache hit rate detected', {
          cacheHitRate: report.cacheHitRate,
          totalQueries: report.totalQueries
        })
      }

      // Alert on too many slow queries
      if (report.slowestQueries.length > report.totalQueries * 0.1) {
        logger.warn('High number of slow queries detected', {
          slowQueryCount: report.slowestQueries.length,
          totalQueries: report.totalQueries,
          percentage: (report.slowestQueries.length / report.totalQueries * 100).toFixed(1)
        })
      }

    } catch (error) {
      logError(error as Error, { action: 'check_performance_alerts' })
    }
  }

  // =============================================
  // OPTIMIZATION RECOMMENDATIONS
  // =============================================

  async getOptimizationRecommendations(): Promise<{
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }> {
    try {
      const report = await this.getPerformanceReport('24h')
      const immediate: string[] = []
      const shortTerm: string[] = []
      const longTerm: string[] = []

      // Immediate optimizations
      if (report.cacheHitRate < 50) {
        immediate.push('Implement caching for frequently accessed data')
        immediate.push('Increase cache TTL for stable data')
      }

      if (report.slowestQueries.length > 5) {
        immediate.push('Add database indexes for slow queries')
        immediate.push('Optimize query structure and eliminate N+1 problems')
      }

      // Short-term optimizations
      if (report.averageDuration > 200) {
        shortTerm.push('Implement DataLoader pattern for batch loading')
        shortTerm.push('Use materialized views for complex analytics')
      }

      shortTerm.push('Set up query performance monitoring dashboard')
      shortTerm.push('Implement automatic cache warming')

      // Long-term optimizations
      longTerm.push('Consider read replicas for analytics queries')
      longTerm.push('Implement query result pagination for large datasets')
      longTerm.push('Set up database connection pooling optimization')
      longTerm.push('Consider implementing GraphQL with DataLoader for complex queries')

      return { immediate, shortTerm, longTerm }
    } catch (error) {
      logError(error as Error, { action: 'get_optimization_recommendations' })
      return { immediate: [], shortTerm: [], longTerm: [] }
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private getCutoffTime(timeRange: string): Date {
    const now = new Date()
    switch (timeRange) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000)
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
  }

  async getDailyAggregates(days: number = 7): Promise<any[]> {
    try {
      const aggregates: any[] = []
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        
        const data = await redis.get(`daily_metrics:${dateKey}`)
        if (data) {
          aggregates.push(JSON.parse(data) as any)
        }
      }
      
      return aggregates.reverse() // Oldest first
    } catch (error) {
      logError(error as Error, { action: 'get_daily_aggregates' })
      return []
    }
  }

  clearMetrics(): void {
    this.metrics.clear()
  }

  getMetricsCount(): number {
    return this.metrics.size
  }

  getPerformanceMetrics(): {
    averageQueryTime: number
    cacheHitRate: number
    totalQueries: number
    recentMetrics: QueryMetrics[]
  } {
    const metrics = Array.from(this.metrics.values())
    const totalQueries = metrics.length
    
    if (totalQueries === 0) {
      return {
        averageQueryTime: 0,
        cacheHitRate: 0,
        totalQueries: 0,
        recentMetrics: []
      }
    }

    const averageQueryTime = metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
    const cacheHits = metrics.filter(m => m.cacheHit).length
    const cacheHitRate = (cacheHits / totalQueries) * 100

    return {
      averageQueryTime,
      cacheHitRate,
      totalQueries,
      recentMetrics: metrics.slice(-10)
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// =============================================
// QUERY PERFORMANCE DECORATOR
// =============================================

export function trackQueryPerformance(queryName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now()
      const queryId = `${queryName}_${Date.now()}`
      
      try {
        const result = await method.apply(this, args)
        const duration = performance.now() - startTime
        
        await performanceMonitor.trackQuery({
          queryId,
          query: queryName,
          duration,
          timestamp: new Date().toISOString(),
          resultCount: Array.isArray(result) ? result.length : 1,
          cacheHit: false
        })

        return result
      } catch (error) {
        const duration = performance.now() - startTime
        
        await performanceMonitor.trackQuery({
          queryId,
          query: `${queryName}_error`,
          duration,
          timestamp: new Date().toISOString(),
          cacheHit: false
        })

        throw error
      }
    }

    return descriptor
  }
}
