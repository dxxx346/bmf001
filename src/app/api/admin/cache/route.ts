/**
 * Cache Admin API Endpoints
 * Provides debugging tools and cache management for administrators
 */

import { NextRequest, NextResponse } from 'next/server'
import { redisCache, type CacheMetrics } from '@/lib/cache/redis-cache'
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
        case 'info':
          return NextResponse.json(await getCacheInfo())
        
        case 'metrics':
          return NextResponse.json(await getCacheMetrics())
        
        case 'health':
          return NextResponse.json(await getCacheHealth())
        
        case 'keys':
          const pattern = searchParams.get('pattern') || '*'
          return NextResponse.json(await getCacheKeys(pattern))
        
        case 'entry':
          const key = searchParams.get('key')
          if (!key) {
            return NextResponse.json({ error: 'Key parameter required' }, { status: 400 })
          }
          return NextResponse.json(await getCacheEntry(key))
        
        case 'performance':
          return NextResponse.json(await getCachePerformance())
        
        default:
          return NextResponse.json(await getCacheOverview())
      }
    } catch (error) {
      logError(error as Error, { action: 'cache_admin_get' })
      return NextResponse.json(
        { error: 'Failed to retrieve cache information' },
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
        case 'warm':
          return NextResponse.json(await warmCache(body.config))
        
        case 'flush':
          return NextResponse.json(await flushCache(body.pattern))
        
        case 'invalidate':
          return NextResponse.json(await invalidateCache(body))
        
        case 'test_performance':
          return NextResponse.json(await testCachePerformance())
        
        case 'set_test_data':
          return NextResponse.json(await setTestData(body.data))
        
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
    } catch (error) {
      logError(error as Error, { action: 'cache_admin_post' })
      return NextResponse.json(
        { error: 'Failed to execute cache operation' },
        { status: 500 }
      )
    }
  })
}

export async function DELETE(request: NextRequest) {
  return authMiddleware.requireAdmin(request, async (req, context) => {
    try {
      const { searchParams } = new URL(request.url)
      const key = searchParams.get('key')
      const pattern = searchParams.get('pattern')
      const tags = searchParams.get('tags')?.split(',')

      if (key) {
        const deleted = await redisCache.delete(key)
        return NextResponse.json({ success: deleted, key })
      }

      if (pattern) {
        const deletedCount = await redisCache.invalidateByPattern(pattern)
        return NextResponse.json({ success: true, deletedCount, pattern })
      }

      if (tags) {
        const deletedCount = await redisCache.invalidateByTags(tags)
        return NextResponse.json({ success: true, deletedCount, tags })
      }

      return NextResponse.json({ error: 'Key, pattern, or tags parameter required' }, { status: 400 })
    } catch (error) {
      logError(error as Error, { action: 'cache_admin_delete' })
      return NextResponse.json(
        { error: 'Failed to delete cache entries' },
        { status: 500 }
      )
    }
  })
}

// =============================================
// HELPER FUNCTIONS
// =============================================

async function getCacheInfo() {
  const info = await redisCache.getCacheInfo()
  return {
    ...info,
    strategies: Object.keys(CacheStrategies.STRATEGIES),
    timestamp: new Date().toISOString()
  }
}

async function getCacheMetrics() {
  const metrics = redisCache.getMetrics()
  return {
    ...metrics,
    performance: {
      hitRateGrade: getHitRateGrade(metrics.hitRate),
      errorRate: metrics.totalRequests > 0 ? (metrics.errors / metrics.totalRequests) * 100 : 0,
      efficiency: calculateCacheEfficiency(metrics)
    },
    timestamp: new Date().toISOString()
  }
}

async function getCacheHealth() {
  const health = await redisCache.healthCheck()
  return {
    ...health,
    status: health.redis.available ? 'healthy' : 'degraded',
    recommendations: generateHealthRecommendations(health),
    timestamp: new Date().toISOString()
  }
}

async function getCacheKeys(pattern: string) {
  const keys = await redisCache.getKeys(pattern)
  return {
    pattern,
    keys: keys.slice(0, 100), // Limit to 100 keys for performance
    totalCount: keys.length,
    truncated: keys.length > 100,
    timestamp: new Date().toISOString()
  }
}

async function getCacheEntry(key: string) {
  const entry = await redisCache.getCacheEntry(key)
  return {
    key,
    entry,
    timestamp: new Date().toISOString()
  }
}

async function getCachePerformance() {
  const performance = await redisCache.performanceTest()
  return {
    ...performance,
    recommendations: generatePerformanceRecommendations(performance),
    timestamp: new Date().toISOString()
  }
}

async function getCacheOverview() {
  const [info, metrics, health] = await Promise.all([
    getCacheInfo(),
    getCacheMetrics(),
    getCacheHealth()
  ])

  return {
    overview: {
      status: health.status,
      hitRate: metrics.hitRate,
      totalRequests: metrics.totalRequests,
      redisAvailable: health.redis.available,
      memoryFallbackActive: health.memory.entriesCount > 0
    },
    info,
    metrics,
    health,
    timestamp: new Date().toISOString()
  }
}

async function warmCache(config: any) {
  try {
    await redisCache.warmCache(config)
    return {
      success: true,
      message: 'Cache warming initiated',
      config,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'warm_cache_admin', config })
    return {
      success: false,
      error: 'Cache warming failed',
      timestamp: new Date().toISOString()
    }
  }
}

async function flushCache(pattern?: string) {
  try {
    const success = await redisCache.flush(pattern)
    return {
      success,
      message: pattern ? `Cache flushed for pattern: ${pattern}` : 'All cache flushed',
      pattern,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'flush_cache_admin', pattern })
    return {
      success: false,
      error: 'Cache flush failed',
      timestamp: new Date().toISOString()
    }
  }
}

async function invalidateCache(config: { tags?: string[]; pattern?: string; entityType?: string; entityId?: string }) {
  try {
    let deletedCount = 0

    if (config.tags) {
      deletedCount += await redisCache.invalidateByTags(config.tags)
    }

    if (config.pattern) {
      deletedCount += await redisCache.invalidateByPattern(config.pattern)
    }

    if (config.entityType && config.entityId) {
      await redisCache.invalidateRelated(config.entityType, config.entityId)
      deletedCount += 1 // Approximate
    }

    return {
      success: true,
      deletedCount,
      config,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'invalidate_cache_admin', config })
    return {
      success: false,
      error: 'Cache invalidation failed',
      timestamp: new Date().toISOString()
    }
  }
}

async function testCachePerformance() {
  try {
    const performance = await redisCache.performanceTest()
    return {
      success: true,
      performance,
      recommendations: generatePerformanceRecommendations(performance),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'test_cache_performance' })
    return {
      success: false,
      error: 'Performance test failed',
      timestamp: new Date().toISOString()
    }
  }
}

async function setTestData(data: any) {
  try {
    await redisCache.set('test:admin_test', data, 'temporary', {
      tags: ['test', 'admin']
    })

    return {
      success: true,
      message: 'Test data set successfully',
      key: 'test:admin_test',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logError(error as Error, { action: 'set_test_data', data })
    return {
      success: false,
      error: 'Failed to set test data',
      timestamp: new Date().toISOString()
    }
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function getHitRateGrade(hitRate: number): string {
  if (hitRate >= 90) return 'A+'
  if (hitRate >= 80) return 'A'
  if (hitRate >= 70) return 'B'
  if (hitRate >= 60) return 'C'
  if (hitRate >= 50) return 'D'
  return 'F'
}

function calculateCacheEfficiency(metrics: CacheMetrics): number {
  if (metrics.totalRequests === 0) return 0
  
  const hitWeight = 1.0
  const missWeight = 0.5
  const errorWeight = 0.0
  
  const weightedScore = (metrics.hits * hitWeight + metrics.misses * missWeight + metrics.errors * errorWeight)
  return (weightedScore / metrics.totalRequests) * 100
}

function generateHealthRecommendations(health: any): string[] {
  const recommendations: string[] = []

  if (!health.redis.available) {
    recommendations.push('Redis is unavailable - check connection and configuration')
    recommendations.push('Currently using memory fallback - performance may be degraded')
  }

  if (health.redis.latency && health.redis.latency > 50) {
    recommendations.push('High Redis latency detected - check network connectivity')
  }

  if (health.memoryInfo.usage && parseFloat(health.memoryInfo.usage) > 80) {
    recommendations.push('Memory cache usage is high - consider increasing Redis availability')
  }

  if (health.metrics.hitRate < 70) {
    recommendations.push('Low cache hit rate - consider increasing TTL or improving cache warming')
  }

  if (health.metrics.errors > health.metrics.totalRequests * 0.05) {
    recommendations.push('High error rate detected - check Redis configuration and connectivity')
  }

  return recommendations
}

function generatePerformanceRecommendations(performance: any): string[] {
  const recommendations: string[] = []

  if (performance.setPerformance.avgTime > 10) {
    recommendations.push('Slow SET operations - consider Redis optimization or connection pooling')
  }

  if (performance.getPerformance.avgTime > 5) {
    recommendations.push('Slow GET operations - check Redis memory usage and network latency')
  }

  if (performance.deletePerformance.avgTime > 5) {
    recommendations.push('Slow DELETE operations - consider batch deletion strategies')
  }

  return recommendations
}
