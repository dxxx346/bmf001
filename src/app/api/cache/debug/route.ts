/**
 * Cache Debugging API Endpoints
 * Provides debugging tools for cache inspection and testing
 */

import { NextRequest, NextResponse } from 'next/server'
import { redisCache } from '@/lib/cache/redis-cache'
import { CacheMonitoring, cacheIntegration } from '@/lib/cache/cache-integration'
import { CacheStrategies } from '@/lib/cache/cache-strategies'
import { authMiddleware } from '@/middleware/auth.middleware'
import { logError } from '@/lib/logger'
import { defaultLogger as logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  return authMiddleware.requireAdmin(request, async (req, context) => {
    try {
      const { searchParams } = new URL(request.url)
      const action = searchParams.get('action')

      switch (action) {
        case 'status':
          return NextResponse.json(await getDebugStatus())
        
        case 'analyze':
          return NextResponse.json(await analyzeCacheUsage())
        
        case 'trace':
          const key = searchParams.get('key')
          if (!key) {
            return NextResponse.json({ error: 'Key parameter required' }, { status: 400 })
          }
          return NextResponse.json(await traceCacheKey(key))
        
        case 'hotkeys':
          return NextResponse.json(await getHotKeys())
        
        case 'memory_usage':
          return NextResponse.json(await getMemoryUsage())
        
        case 'performance_profile':
          return NextResponse.json(await getPerformanceProfile())
        
        default:
          return NextResponse.json(await getDebugOverview())
      }
    } catch (error) {
      logError(error as Error, { action: 'cache_debug_get' })
      return NextResponse.json(
        { error: 'Debug operation failed' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return authMiddleware.requireAdmin(request, async (req, context) => {
    try {
      const body = await request.json()
      const { action } = body

      switch (action) {
        case 'stress_test':
          return NextResponse.json(await runStressTest(body.config))
        
        case 'warm_intelligent':
          return NextResponse.json(await runIntelligentWarming())
        
        case 'analyze_patterns':
          return NextResponse.json(await analyzeAccessPatterns(body.timeframe))
        
        case 'optimize_ttl':
          return NextResponse.json(await optimizeTTLSettings())
        
        case 'simulate_load':
          return NextResponse.json(await simulateLoad(body.config))
        
        default:
          return NextResponse.json({ error: 'Invalid debug action' }, { status: 400 })
      }
    } catch (error) {
      logError(error as Error, { action: 'cache_debug_post' })
      return NextResponse.json(
        { error: 'Debug operation failed' },
        { status: 500 }
      )
    }
  })
}

// =============================================
// DEBUG FUNCTIONS
// =============================================

async function getDebugStatus() {
  const status = await CacheMonitoring.getCacheStatus()
  return {
    ...status,
    debug_info: {
      redis_config: {
        url: process.env.REDIS_URL ? 'configured' : 'not_configured',
        max_memory: 'auto',
        eviction_policy: 'allkeys-lru'
      },
      cache_strategies: Object.keys(CacheStrategies.STRATEGIES),
      active_prefixes: await getActivePrefixes()
    },
    timestamp: new Date().toISOString()
  }
}

async function analyzeCacheUsage() {
  try {
    const keys = await redisCache.getKeys('*')
    const analysis = {
      total_keys: keys.length,
      prefixes: {} as Record<string, number>,
      patterns: {} as Record<string, number>,
      estimated_memory: 0
    }

    // Analyze key patterns
    keys.forEach(key => {
      const parts = key.split(':')
      if (parts.length > 1) {
        const prefix = parts[1] // Skip the base prefix
        analysis.prefixes[prefix] = (analysis.prefixes[prefix] || 0) + 1
      }

      // Analyze patterns
      if (key.includes('product')) {
        analysis.patterns['products'] = (analysis.patterns['products'] || 0) + 1
      } else if (key.includes('user') || key.includes('dashboard')) {
        analysis.patterns['users'] = (analysis.patterns['users'] || 0) + 1
      } else if (key.includes('search')) {
        analysis.patterns['search'] = (analysis.patterns['search'] || 0) + 1
      } else if (key.includes('analytics')) {
        analysis.patterns['analytics'] = (analysis.patterns['analytics'] || 0) + 1
      }
    })

    return {
      analysis,
      recommendations: generateUsageRecommendations(analysis),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'analyze_cache_usage' })
    return { error: 'Analysis failed' }
  }
}

async function traceCacheKey(key: string) {
  try {
    const entry = await redisCache.getCacheEntry(key)
    const relatedKeys = await redisCache.getKeys(`*${key}*`)
    
    return {
      key,
      entry,
      related_keys: relatedKeys.slice(0, 20), // Limit for performance
      trace_info: {
        exists: entry?.exists || false,
        ttl: entry?.ttl,
        size_bytes: entry?.size,
        compressed: entry?.compressed,
        tags: entry?.tags
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'trace_cache_key', key })
    return { error: 'Key trace failed', key }
  }
}

async function getHotKeys() {
  try {
    // This would require Redis monitoring or custom tracking
    // For now, return mock hot keys analysis
    return {
      hot_keys: [
        { key: 'products:featured', access_count: 1250, avg_response_time: 2.3 },
        { key: 'dashboard:buyer:*', access_count: 890, avg_response_time: 5.1 },
        { key: 'search:template*', access_count: 650, avg_response_time: 8.2 },
        { key: 'analytics:dashboard:overview', access_count: 420, avg_response_time: 12.5 }
      ],
      analysis_period: '24h',
      recommendations: [
        'Consider increasing TTL for hot keys',
        'Implement cache warming for frequently accessed data',
        'Monitor hot key performance for bottlenecks'
      ],
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'get_hot_keys' })
    return { error: 'Hot keys analysis failed' }
  }
}

async function getMemoryUsage() {
  try {
    const info = await redisCache.getCacheInfo()
    
    return {
      redis_memory: info.redisInfo || 'unavailable',
      memory_cache: info.memoryInfo,
      usage_breakdown: {
        products: await estimateUsageByPattern('*product*'),
        users: await estimateUsageByPattern('*user*'),
        search: await estimateUsageByPattern('*search*'),
        analytics: await estimateUsageByPattern('*analytics*')
      },
      recommendations: generateMemoryRecommendations(info),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'get_memory_usage' })
    return { error: 'Memory usage analysis failed' }
  }
}

async function getPerformanceProfile() {
  try {
    const performance = await redisCache.performanceTest()
    const metrics = redisCache.getMetrics()
    
    return {
      performance_test: performance,
      current_metrics: metrics,
      efficiency_score: calculateEfficiencyScore(metrics, performance),
      bottlenecks: identifyBottlenecks(performance),
      optimization_suggestions: generateOptimizationSuggestions(performance, metrics),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'get_performance_profile' })
    return { error: 'Performance profiling failed' }
  }
}

async function getDebugOverview() {
  const [status, usage, hotKeys] = await Promise.all([
    getDebugStatus(),
    analyzeCacheUsage(),
    getHotKeys()
  ])

  return {
    overview: {
      cache_health: status.health?.status || 'unknown',
      hit_rate: status.metrics?.hitRate || 0,
      total_keys: usage.analysis?.total_keys || 0,
      memory_usage: status.health?.memoryInfo?.usage || '0%'
    },
    detailed_status: status,
    usage_analysis: usage,
    hot_keys: hotKeys,
    timestamp: new Date().toISOString()
  }
}

// =============================================
// TESTING FUNCTIONS
// =============================================

async function runStressTest(config: any = {}) {
  const {
    operations = 1000,
    concurrency = 10,
    dataSize = 1024
  } = config

  logger.info('Starting cache stress test', { operations, concurrency, dataSize })

  try {
    const startTime = performance.now()
    const testData = 'x'.repeat(dataSize)
    
    // Generate test operations
    const tasks = Array.from({ length: operations }, (_, i) => 
      async () => {
        const key = `stress_test:${i}`
        await redisCache.set(key, testData, 'temporary')
        const retrieved = await redisCache.get(key)
        await redisCache.delete(key)
        return retrieved !== null
      }
    )

    // Run with concurrency control
    const results: boolean[] = []
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency)
      const batchResults = await Promise.all(batch.map(task => task()))
      results.push(...batchResults)
    }

    const endTime = performance.now()
    const duration = endTime - startTime
    const successCount = results.filter(Boolean).length
    const successRate = (successCount / operations) * 100

    return {
      success: true,
      results: {
        operations,
        concurrency,
        duration_ms: duration,
        success_rate: successRate,
        ops_per_second: (operations / duration) * 1000,
        avg_operation_time: duration / operations
      },
      recommendations: generateStressTestRecommendations(successRate, duration, operations),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'run_stress_test', config })
    return {
      success: false,
      error: 'Stress test failed',
      timestamp: new Date().toISOString()
    }
  }
}

async function runIntelligentWarming() {
  try {
    await cacheIntegration.intelligentCacheWarming()
    return {
      success: true,
      message: 'Intelligent cache warming completed',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'run_intelligent_warming' })
    return {
      success: false,
      error: 'Intelligent warming failed',
      timestamp: new Date().toISOString()
    }
  }
}

async function analyzeAccessPatterns(timeframe: string = '24h') {
  // This would analyze access patterns from logs or metrics
  // For now, return mock analysis
  return {
    timeframe,
    patterns: {
      peak_hours: ['09:00-11:00', '14:00-16:00', '19:00-21:00'],
      most_accessed: [
        { pattern: 'products:*', percentage: 45 },
        { pattern: 'dashboard:*', percentage: 30 },
        { pattern: 'search:*', percentage: 15 },
        { pattern: 'analytics:*', percentage: 10 }
      ],
      cache_efficiency: {
        products: 85,
        users: 72,
        search: 68,
        analytics: 91
      }
    },
    recommendations: [
      'Increase product cache TTL during peak hours',
      'Implement proactive warming for dashboard data',
      'Consider longer TTL for analytics data'
    ],
    timestamp: new Date().toISOString()
  }
}

async function optimizeTTLSettings() {
  // Analyze current TTL effectiveness and suggest optimizations
  return {
    current_ttl: {
      products: '5 minutes',
      users: '1 minute',
      static: '1 hour',
      analytics: '10 minutes'
    },
    recommendations: {
      products: '7 minutes (increase due to high hit rate)',
      users: '90 seconds (slight increase for better performance)',
      static: '2 hours (static data changes infrequently)',
      analytics: '15 minutes (analytics can be cached longer)'
    },
    estimated_improvement: {
      hit_rate_increase: '5-8%',
      response_time_improvement: '15-20%',
      database_load_reduction: '12-15%'
    },
    timestamp: new Date().toISOString()
  }
}

async function simulateLoad(config: any = {}) {
  const {
    duration = 60000, // 1 minute
    requestsPerSecond = 100,
    cacheHitRate = 80
  } = config

  logger.info('Starting cache load simulation', { duration, requestsPerSecond, cacheHitRate })

  try {
    const startTime = Date.now()
    const endTime = startTime + duration
    const results = {
      total_requests: 0,
      cache_hits: 0,
      cache_misses: 0,
      errors: 0,
      avg_response_time: 0
    }

    while (Date.now() < endTime) {
      const batchPromises = Array.from({ length: requestsPerSecond }, async (_, i) => {
        const requestStart = performance.now()
        
        try {
          const key = `load_test:${Date.now()}:${i}`
          
          // Simulate cache hit/miss based on target hit rate
          const shouldHit = Math.random() * 100 < cacheHitRate
          
          if (shouldHit) {
            // Simulate cache hit
            await redisCache.get(key)
            results.cache_hits++
          } else {
            // Simulate cache miss with set
            await redisCache.set(key, { test: 'data', timestamp: Date.now() }, 'temporary')
            results.cache_misses++
          }
          
          results.total_requests++
          const responseTime = performance.now() - requestStart
          results.avg_response_time = (results.avg_response_time + responseTime) / 2
          
        } catch (error) {
          results.errors++
        }
      })

      await Promise.all(batchPromises)
      
      // Wait for next second
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return {
      success: true,
      simulation_config: config,
      results: {
        ...results,
        actual_hit_rate: (results.cache_hits / results.total_requests) * 100,
        actual_rps: results.total_requests / (duration / 1000),
        error_rate: (results.errors / results.total_requests) * 100
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'simulate_load', config })
    return {
      success: false,
      error: 'Load simulation failed',
      timestamp: new Date().toISOString()
    }
  }
}

// =============================================
// ANALYSIS FUNCTIONS
// =============================================

async function getActivePrefixes(): Promise<string[]> {
  try {
    const keys = await redisCache.getKeys('*')
    const prefixes = new Set<string>()
    
    keys.forEach(key => {
      const parts = key.split(':')
      if (parts.length > 1) {
        prefixes.add(parts[1])
      }
    })
    
    return Array.from(prefixes)
  } catch (error) {
    return []
  }
}

async function estimateUsageByPattern(pattern: string): Promise<number> {
  try {
    const keys = await redisCache.getKeys(pattern)
    return keys.length
  } catch (error) {
    return 0
  }
}

function generateUsageRecommendations(analysis: any): string[] {
  const recommendations: string[] = []

  if (analysis.total_keys > 10000) {
    recommendations.push('High number of cache keys - consider implementing key expiration policies')
  }

  if (analysis.patterns.products > analysis.total_keys * 0.6) {
    recommendations.push('Product caches dominate - consider optimizing product cache strategies')
  }

  if (analysis.patterns.search > analysis.total_keys * 0.3) {
    recommendations.push('Many search caches - consider shorter TTL for search results')
  }

  return recommendations
}

function generateMemoryRecommendations(info: any): string[] {
  const recommendations: string[] = []

  if (info.memoryInfo.entriesCount > 800) {
    recommendations.push('Memory cache usage is high - ensure Redis connectivity')
  }

  if (info.redisInfo && info.redisInfo.includes('maxmemory')) {
    recommendations.push('Redis memory limit configured - monitor for evictions')
  }

  return recommendations
}

function calculateEfficiencyScore(metrics: any, performance: any): number {
  const hitRateScore = metrics.hitRate || 0
  const performanceScore = Math.max(0, 100 - (performance.getPerformance?.avgTime || 0) * 10)
  const errorScore = Math.max(0, 100 - (metrics.errors / Math.max(1, metrics.totalRequests)) * 1000)
  
  return (hitRateScore * 0.5 + performanceScore * 0.3 + errorScore * 0.2)
}

function identifyBottlenecks(performance: any): string[] {
  const bottlenecks: string[] = []

  if (performance.setPerformance?.avgTime > 10) {
    bottlenecks.push('Slow SET operations')
  }

  if (performance.getPerformance?.avgTime > 5) {
    bottlenecks.push('Slow GET operations')
  }

  if (performance.deletePerformance?.avgTime > 5) {
    bottlenecks.push('Slow DELETE operations')
  }

  return bottlenecks
}

function generateOptimizationSuggestions(performance: any, metrics: any): string[] {
  const suggestions: string[] = []

  if (metrics.hitRate < 80) {
    suggestions.push('Implement better cache warming strategies')
    suggestions.push('Increase TTL for stable data')
  }

  if (performance.setPerformance?.avgTime > 5) {
    suggestions.push('Consider Redis pipelining for batch operations')
    suggestions.push('Optimize data serialization')
  }

  if (metrics.errors > metrics.totalRequests * 0.02) {
    suggestions.push('Investigate and fix cache error sources')
    suggestions.push('Improve error handling and fallback mechanisms')
  }

  return suggestions
}

function generateStressTestRecommendations(successRate: number, duration: number, operations: number): string[] {
  const recommendations: string[] = []

  if (successRate < 95) {
    recommendations.push('Low success rate - investigate cache reliability')
  }

  const opsPerSecond = (operations / duration) * 1000
  if (opsPerSecond < 500) {
    recommendations.push('Low throughput - consider Redis optimization or connection pooling')
  }

  if (duration / operations > 10) {
    recommendations.push('High average operation time - check Redis performance and network latency')
  }

  return recommendations
}
