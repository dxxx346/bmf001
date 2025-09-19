/**
 * Comprehensive Redis Caching Layer
 * Implements cache-aside pattern, warming, invalidation, and monitoring
 */

import Redis from 'ioredis'
import { redis } from '@/lib/redis'
import { logError } from '@/lib/logger'
import { defaultLogger as logger } from '@/lib/logger'

export interface CacheOptions {
  ttl?: number
  tags?: string[]
  prefix?: string
  compress?: boolean
  serialize?: boolean
}

export interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
  totalRequests: number
  hitRate: number
  lastReset: Date
}

export interface CacheEntry {
  value: any
  tags: string[]
  createdAt: Date
  expiresAt: Date
  compressed: boolean
}

export interface LockOptions {
  ttl?: number
  retryDelay?: number
  maxRetries?: number
}

export type TTLStrategy = 'products' | 'users' | 'static' | 'analytics' | 'sessions' | 'temporary'

export class RedisCacheService {
  private redis: Redis
  private fallbackCache: Map<string, CacheEntry> = new Map()
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    totalRequests: 0,
    hitRate: 0,
    lastReset: new Date()
  }
  private isRedisAvailable = true
  private readonly MAX_MEMORY_CACHE_SIZE = 1000
  private readonly COMPRESSION_THRESHOLD = 1024 // 1KB

  // TTL strategies in seconds
  private readonly TTL_STRATEGIES: Record<TTLStrategy, number> = {
    products: 300,    // 5 minutes
    users: 60,        // 1 minute
    static: 3600,     // 1 hour
    analytics: 600,   // 10 minutes
    sessions: 1800,   // 30 minutes
    temporary: 30     // 30 seconds
  }

  constructor(redisInstance?: Redis) {
    this.redis = redisInstance || redis || new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
    this.setupRedisEventHandlers()
    this.startMetricsReporting()
  }

  // =============================================
  // CORE CACHE METHODS
  // =============================================

  /**
   * Get value from cache with fallback to memory cache
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const prefixedKey = this.getPrefixedKey(key, options.prefix)
    this.metrics.totalRequests++

    try {
      let value: string | null = null

      // Try Redis first
      if (this.isRedisAvailable) {
        value = await this.redis.get(prefixedKey)
      }

      // Fallback to memory cache if Redis unavailable
      if (!value && !this.isRedisAvailable) {
        const memoryEntry = this.fallbackCache.get(prefixedKey)
        if (memoryEntry && memoryEntry.expiresAt > new Date()) {
          value = JSON.stringify(memoryEntry.value)
          logger.debug('Memory cache hit', { key: prefixedKey })
        }
      }

      if (value) {
        this.metrics.hits++
        const parsed = this.deserializeValue(value)
        
        logger.debug('Cache hit', { 
          key: prefixedKey, 
          source: this.isRedisAvailable ? 'redis' : 'memory' 
        })
        
        return parsed
      }

      this.metrics.misses++
      logger.debug('Cache miss', { key: prefixedKey })
      return null

    } catch (error) {
      this.metrics.errors++
      logError(error as Error, { action: 'cache_get', key: prefixedKey })
      return null
    } finally {
      this.updateHitRate()
    }
  }

  /**
   * Set value in cache with TTL and compression
   */
  async set(
    key: string, 
    value: any, 
    ttlOrStrategy?: number | TTLStrategy,
    options: CacheOptions = {}
  ): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key, options.prefix)
    const ttl = this.resolveTTL(ttlOrStrategy)

    try {
      const serialized = this.serializeValue(value, options)
      
      // Set in Redis if available
      if (this.isRedisAvailable) {
        await this.redis.setex(prefixedKey, ttl, serialized)
        
        // Add tags for group invalidation
        if (options.tags && options.tags.length > 0) {
          await this.addCacheTags(prefixedKey, options.tags)
        }
      } else {
        // Fallback to memory cache
        this.setInMemoryCache(prefixedKey, value, ttl, options.tags || [])
      }

      this.metrics.sets++
      
      logger.debug('Cache set', { 
        key: prefixedKey, 
        ttl, 
        tags: options.tags,
        source: this.isRedisAvailable ? 'redis' : 'memory'
      })
      
      return true

    } catch (error) {
      this.metrics.errors++
      logError(error as Error, { action: 'cache_set', key: prefixedKey })
      return false
    }
  }

  /**
   * Delete single key from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key, options.prefix)

    try {
      if (this.isRedisAvailable) {
        await this.redis.del(prefixedKey)
        await this.removeCacheTags(prefixedKey)
      } else {
        this.fallbackCache.delete(prefixedKey)
      }

      this.metrics.deletes++
      logger.debug('Cache delete', { key: prefixedKey })
      return true

    } catch (error) {
      this.metrics.errors++
      logError(error as Error, { action: 'cache_delete', key: prefixedKey })
      return false
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[], options: CacheOptions = {}): Promise<number> {
    const prefixedKeys = keys.map(key => this.getPrefixedKey(key, options.prefix))

    try {
      let deletedCount = 0

      if (this.isRedisAvailable && prefixedKeys.length > 0) {
        deletedCount = await this.redis.del(...prefixedKeys)
        
        // Remove tags for all keys
        await Promise.all(prefixedKeys.map(key => this.removeCacheTags(key)))
      } else {
        prefixedKeys.forEach(key => {
          if (this.fallbackCache.has(key)) {
            this.fallbackCache.delete(key)
            deletedCount++
          }
        })
      }

      this.metrics.deletes += deletedCount
      logger.debug('Cache delete many', { keys: prefixedKeys.length, deleted: deletedCount })
      return deletedCount

    } catch (error) {
      this.metrics.errors++
      logError(error as Error, { action: 'cache_delete_many', keys: prefixedKeys })
      return 0
    }
  }

  /**
   * Flush all cache or by pattern
   */
  async flush(pattern?: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable) {
        if (pattern) {
          const keys = await this.redis.keys(pattern)
          if (keys.length > 0) {
            await this.redis.del(...keys)
          }
        } else {
          await this.redis.flushdb()
        }
      } else {
        if (pattern) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          Array.from(this.fallbackCache.keys())
            .filter(key => regex.test(key))
            .forEach(key => this.fallbackCache.delete(key))
        } else {
          this.fallbackCache.clear()
        }
      }

      logger.info('Cache flushed', { pattern: pattern || 'all' })
      return true

    } catch (error) {
      this.metrics.errors++
      logError(error as Error, { action: 'cache_flush', pattern })
      return false
    }
  }

  // =============================================
  // CACHE-ASIDE PATTERN IMPLEMENTATION
  // =============================================

  /**
   * Cache-aside pattern: Get from cache or execute function and cache result
   */
  async getOrSet<T = any>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlOrStrategy?: number | TTLStrategy,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options)
    if (cached !== null) {
      return cached
    }

    // Cache miss - execute function and cache result
    try {
      const result = await fetchFunction()
      
      // Only cache non-null results
      if (result !== null && result !== undefined) {
        await this.set(key, result, ttlOrStrategy, options)
      }
      
      return result
    } catch (error) {
      logError(error as Error, { action: 'cache_get_or_set', key })
      throw error
    }
  }

  /**
   * Batch get multiple keys efficiently
   */
  async getMany<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    const prefixedKeys = keys.map(key => this.getPrefixedKey(key, options.prefix))

    try {
      if (this.isRedisAvailable && prefixedKeys.length > 0) {
        const values = await this.redis.mget(...prefixedKeys)
        return values.map(value => value ? this.deserializeValue(value) : null)
      } else {
        return prefixedKeys.map(key => {
          const entry = this.fallbackCache.get(key)
          return entry && entry.expiresAt > new Date() ? entry.value : null
        })
      }
    } catch (error) {
      this.metrics.errors++
      logError(error as Error, { action: 'cache_get_many', keys: prefixedKeys })
      return keys.map(() => null)
    }
  }

  /**
   * Batch set multiple key-value pairs
   */
  async setMany(
    entries: Array<{ key: string; value: any; ttl?: number | TTLStrategy }>,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      if (this.isRedisAvailable) {
        const pipeline = this.redis.pipeline()
        
        entries.forEach(({ key, value, ttl }) => {
          const prefixedKey = this.getPrefixedKey(key, options.prefix)
          const resolvedTTL = this.resolveTTL(ttl)
          const serialized = this.serializeValue(value, options)
          
          pipeline.setex(prefixedKey, resolvedTTL, serialized)
        })

        await pipeline.exec()
      } else {
        entries.forEach(({ key, value, ttl }) => {
          const prefixedKey = this.getPrefixedKey(key, options.prefix)
          const resolvedTTL = this.resolveTTL(ttl)
          this.setInMemoryCache(prefixedKey, value, resolvedTTL, options.tags || [])
        })
      }

      this.metrics.sets += entries.length
      logger.debug('Cache set many', { count: entries.length })
      return true

    } catch (error) {
      this.metrics.errors++
      logError(error as Error, { action: 'cache_set_many', count: entries.length })
      return false
    }
  }

  // =============================================
  // CACHE WARMING
  // =============================================

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(warmingConfig: {
    products?: { featured: boolean; popular: boolean; recent: boolean }
    users?: { active: boolean; sellers: boolean }
    analytics?: { dashboard: boolean; reports: boolean }
  }): Promise<void> {
    logger.info('Starting cache warming...', warmingConfig)

    try {
      const warmingTasks: Promise<void>[] = []

      if (warmingConfig.products) {
        warmingTasks.push(this.warmProductCache(warmingConfig.products))
      }

      if (warmingConfig.users) {
        warmingTasks.push(this.warmUserCache(warmingConfig.users))
      }

      if (warmingConfig.analytics) {
        warmingTasks.push(this.warmAnalyticsCache(warmingConfig.analytics))
      }

      await Promise.all(warmingTasks)
      
      logger.info('Cache warming completed successfully')
    } catch (error) {
      logError(error as Error, { action: 'warm_cache', config: warmingConfig })
    }
  }

  private async warmProductCache(config: { featured: boolean; popular: boolean; recent: boolean }): Promise<void> {
    if (config.featured) {
      // Warm featured products
      await this.getOrSet(
        'products:featured',
        async () => {
          // This would call your product service
          return { products: [], total: 0 } // Placeholder
        },
        'products',
        { tags: ['products', 'featured'] }
      )
    }

    if (config.popular) {
      // Warm popular products
      await this.getOrSet(
        'products:popular',
        async () => {
          return { products: [], total: 0 } // Placeholder
        },
        'products',
        { tags: ['products', 'popular'] }
      )
    }

    if (config.recent) {
      // Warm recent products
      await this.getOrSet(
        'products:recent',
        async () => {
          return { products: [], total: 0 } // Placeholder
        },
        'products',
        { tags: ['products', 'recent'] }
      )
    }
  }

  private async warmUserCache(config: { active: boolean; sellers: boolean }): Promise<void> {
    if (config.active) {
      // Warm active user sessions
      await this.getOrSet(
        'users:active_sessions',
        async () => {
          return { sessions: [] } // Placeholder
        },
        'sessions',
        { tags: ['users', 'sessions'] }
      )
    }

    if (config.sellers) {
      // Warm seller data
      await this.getOrSet(
        'users:top_sellers',
        async () => {
          return { sellers: [] } // Placeholder
        },
        'users',
        { tags: ['users', 'sellers'] }
      )
    }
  }

  private async warmAnalyticsCache(config: { dashboard: boolean; reports: boolean }): Promise<void> {
    if (config.dashboard) {
      // Warm dashboard analytics
      await this.getOrSet(
        'analytics:dashboard:overview',
        async () => {
          return { metrics: {} } // Placeholder
        },
        'analytics',
        { tags: ['analytics', 'dashboard'] }
      )
    }

    if (config.reports) {
      // Warm report data
      await this.getOrSet(
        'analytics:reports:monthly',
        async () => {
          return { report: {} } // Placeholder
        },
        'analytics',
        { tags: ['analytics', 'reports'] }
      )
    }
  }

  // =============================================
  // CACHE INVALIDATION
  // =============================================

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let deletedCount = 0

      if (this.isRedisAvailable) {
        for (const tag of tags) {
          const tagKey = `cache_tags:${tag}`
          const keys = await this.redis.smembers(tagKey)
          
          if (keys.length > 0) {
            deletedCount += await this.redis.del(...keys)
            await this.redis.del(tagKey) // Remove the tag set itself
          }
        }
      } else {
        // Invalidate from memory cache
        for (const [key, entry] of this.fallbackCache.entries()) {
          if (entry.tags.some(tag => tags.includes(tag))) {
            this.fallbackCache.delete(key)
            deletedCount++
          }
        }
      }

      logger.info('Cache invalidated by tags', { tags, deletedCount })
      return deletedCount

    } catch (error) {
      this.metrics.errors++
      logError(error as Error, { action: 'invalidate_by_tags', tags })
      return 0
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      let deletedCount = 0

      if (this.isRedisAvailable) {
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          deletedCount = await this.redis.del(...keys)
        }
      } else {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        Array.from(this.fallbackCache.keys())
          .filter(key => regex.test(key))
          .forEach(key => {
            this.fallbackCache.delete(key)
            deletedCount++
          })
      }

      logger.info('Cache invalidated by pattern', { pattern, deletedCount })
      return deletedCount

    } catch (error) {
      this.metrics.errors++
      logError(error as Error, { action: 'invalidate_by_pattern', pattern })
      return 0
    }
  }

  /**
   * Smart invalidation for related data
   */
  async invalidateRelated(entityType: string, entityId: string): Promise<void> {
    const invalidationMap: Record<string, string[]> = {
      product: [
        `product:${entityId}`,
        `products:*`,
        `search:*`,
        `seller_dashboard:*`,
        `analytics:products:*`
      ],
      user: [
        `user:${entityId}`,
        `user_dashboard:${entityId}`,
        `seller_dashboard:${entityId}`,
        `buyer_dashboard:${entityId}`,
        `users:*`
      ],
      shop: [
        `shop:${entityId}`,
        `shop_dashboard:${entityId}`,
        `products:shop:${entityId}`,
        `analytics:shop:${entityId}`
      ],
      order: [
        `order:${entityId}`,
        `order_history:*`,
        `buyer_dashboard:*`,
        `seller_dashboard:*`,
        `analytics:*`
      ]
    }

    const patterns = invalidationMap[entityType] || []
    
    for (const pattern of patterns) {
      await this.invalidateByPattern(pattern)
    }

    logger.info('Related cache invalidated', { entityType, entityId, patterns })
  }

  // =============================================
  // DISTRIBUTED LOCKING
  // =============================================

  /**
   * Acquire distributed lock
   */
  async acquireLock(
    lockKey: string, 
    options: LockOptions = {}
  ): Promise<{ acquired: boolean; lockId?: string; release?: () => Promise<void> }> {
    const { ttl = 30, retryDelay = 100, maxRetries = 10 } = options
    const lockId = `lock:${lockKey}:${Date.now()}`
    const fullLockKey = `locks:${lockKey}`

    try {
      if (!this.isRedisAvailable) {
        // Simple memory-based locking (not distributed)
        const memoryLockKey = `memory_lock:${lockKey}`
        if (!this.fallbackCache.has(memoryLockKey)) {
          this.setInMemoryCache(memoryLockKey, lockId, ttl, [])
          return {
            acquired: true,
            lockId,
            release: async () => {
              this.fallbackCache.delete(memoryLockKey)
            }
          }
        }
        return { acquired: false }
      }

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Try to acquire lock with SET NX EX
        const result = await this.redis.set(fullLockKey, lockId, 'EX', ttl, 'NX')
        
        if (result === 'OK') {
          logger.debug('Lock acquired', { lockKey, lockId, attempt })
          
          return {
            acquired: true,
            lockId,
            release: async () => {
              await this.releaseLock(fullLockKey, lockId)
            }
          }
        }

        // Wait before retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }

      logger.debug('Lock acquisition failed', { lockKey, maxRetries })
      return { acquired: false }

    } catch (error) {
      logError(error as Error, { action: 'acquire_lock', lockKey })
      return { acquired: false }
    }
  }

  /**
   * Release distributed lock safely
   */
  private async releaseLock(lockKey: string, lockId: string): Promise<void> {
    try {
      if (!this.isRedisAvailable) return

      // Use Lua script for atomic lock release
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `
      
      await this.redis.eval(luaScript, 1, lockKey, lockId)
      logger.debug('Lock released', { lockKey, lockId })

    } catch (error) {
      logError(error as Error, { action: 'release_lock', lockKey, lockId })
    }
  }

  // =============================================
  // CACHE TAGS MANAGEMENT
  // =============================================

  private async addCacheTags(key: string, tags: string[]): Promise<void> {
    if (!this.isRedisAvailable) return

    try {
      const pipeline = this.redis.pipeline()
      
      tags.forEach(tag => {
        const tagKey = `cache_tags:${tag}`
        pipeline.sadd(tagKey, key)
        pipeline.expire(tagKey, 86400) // 24 hours
      })

      await pipeline.exec()
    } catch (error) {
      logError(error as Error, { action: 'add_cache_tags', key, tags })
    }
  }

  private async removeCacheTags(key: string): Promise<void> {
    if (!this.isRedisAvailable) return

    try {
      // Find all tag sets that contain this key and remove it
      const tagKeys = await this.redis.keys('cache_tags:*')
      const pipeline = this.redis.pipeline()
      
      tagKeys.forEach(tagKey => {
        pipeline.srem(tagKey, key)
      })

      await pipeline.exec()
    } catch (error) {
      logError(error as Error, { action: 'remove_cache_tags', key })
    }
  }

  // =============================================
  // MEMORY MANAGEMENT
  // =============================================

  private setInMemoryCache(key: string, value: any, ttl: number, tags: string[]): void {
    // Check memory limit
    if (this.fallbackCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      this.evictOldestEntries(Math.floor(this.MAX_MEMORY_CACHE_SIZE * 0.1)) // Evict 10%
    }

    const entry: CacheEntry = {
      value,
      tags,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000),
      compressed: false
    }

    this.fallbackCache.set(key, entry)
  }

  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.fallbackCache.entries())
      .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, count)

    entries.forEach(([key]) => {
      this.fallbackCache.delete(key)
    })

    logger.debug('Evicted oldest cache entries', { count })
  }

  private cleanupExpiredMemoryEntries(): void {
    const now = new Date()
    let expiredCount = 0

    for (const [key, entry] of this.fallbackCache.entries()) {
      if (entry.expiresAt <= now) {
        this.fallbackCache.delete(key)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      logger.debug('Cleaned up expired memory cache entries', { count: expiredCount })
    }
  }

  // =============================================
  // SERIALIZATION & COMPRESSION
  // =============================================

  private serializeValue(value: any, options: CacheOptions): string {
    try {
      let serialized = options.serialize !== false ? JSON.stringify(value) : value

      // Compress large values
      if (options.compress && serialized.length > this.COMPRESSION_THRESHOLD) {
        // Simple compression placeholder - in production use zlib or similar
        serialized = `COMPRESSED:${serialized}`
      }

      return serialized
    } catch (error) {
      logError(error as Error, { action: 'serialize_value' })
      return JSON.stringify(value)
    }
  }

  private deserializeValue(value: string): any {
    try {
      // Handle compression
      if (value.startsWith('COMPRESSED:')) {
        value = value.substring(11) // Remove COMPRESSED: prefix
      }

      return JSON.parse(value)
    } catch (error) {
      logError(error as Error, { action: 'deserialize_value' })
      return value
    }
  }

  // =============================================
  // METRICS & MONITORING
  // =============================================

  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0,
      lastReset: new Date()
    }
  }

  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0
  }

  private startMetricsReporting(): void {
    // Report metrics every 5 minutes
    setInterval(() => {
      logger.info('Cache metrics', {
        ...this.metrics,
        memoryEntriesCount: this.fallbackCache.size,
        redisAvailable: this.isRedisAvailable
      })
    }, 300000) // 5 minutes

    // Cleanup expired memory entries every minute
    setInterval(() => {
      this.cleanupExpiredMemoryEntries()
    }, 60000) // 1 minute
  }

  // =============================================
  // DEBUGGING & ADMIN TOOLS
  // =============================================

  async getCacheInfo(): Promise<{
    redisInfo?: any
    memoryInfo: {
      entriesCount: number
      maxSize: number
      usage: string
    }
    metrics: CacheMetrics
    health: {
      redisAvailable: boolean
      memoryFallbackActive: boolean
      lastError?: string
    }
  }> {
    try {
      let redisInfo: any = undefined

      if (this.isRedisAvailable) {
        try {
          redisInfo = await this.redis.info('memory')
        } catch (error) {
          // Redis info might not be available
          redisInfo = 'unavailable'
        }
      }

      return {
        redisInfo,
        memoryInfo: {
          entriesCount: this.fallbackCache.size,
          maxSize: this.MAX_MEMORY_CACHE_SIZE,
          usage: `${((this.fallbackCache.size / this.MAX_MEMORY_CACHE_SIZE) * 100).toFixed(1)}%`
        },
        metrics: this.getMetrics(),
        health: {
          redisAvailable: this.isRedisAvailable,
          memoryFallbackActive: !this.isRedisAvailable,
          lastError: undefined // Would track last error
        }
      }
    } catch (error) {
      logError(error as Error, { action: 'get_cache_info' })
      return {
        memoryInfo: { entriesCount: 0, maxSize: 0, usage: '0%' },
        metrics: this.getMetrics(),
        health: { redisAvailable: false, memoryFallbackActive: true }
      }
    }
  }

  /**
   * Get cache keys by pattern for debugging
   */
  async getKeys(pattern: string = '*'): Promise<string[]> {
    try {
      if (this.isRedisAvailable) {
        return await this.redis.keys(pattern)
      } else {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return Array.from(this.fallbackCache.keys()).filter(key => regex.test(key))
      }
    } catch (error) {
      logError(error as Error, { action: 'get_cache_keys', pattern })
      return []
    }
  }

  /**
   * Get detailed cache entry info for debugging
   */
  async getCacheEntry(key: string): Promise<{
    exists: boolean
    value?: any
    ttl?: number
    tags?: string[]
    size?: number
    compressed?: boolean
  } | null> {
    try {
      const prefixedKey = this.getPrefixedKey(key)

      if (this.isRedisAvailable) {
        const [value, ttl] = await Promise.all([
          this.redis.get(prefixedKey),
          this.redis.ttl(prefixedKey)
        ])

        if (value === null) {
          return { exists: false }
        }

        return {
          exists: true,
          value: this.deserializeValue(value),
          ttl: ttl > 0 ? ttl : undefined,
          size: value.length,
          compressed: value.startsWith('COMPRESSED:')
        }
      } else {
        const entry = this.fallbackCache.get(prefixedKey)
        if (!entry) {
          return { exists: false }
        }

        const ttl = Math.max(0, Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000))

        return {
          exists: true,
          value: entry.value,
          ttl,
          tags: entry.tags,
          compressed: entry.compressed
        }
      }
    } catch (error) {
      logError(error as Error, { action: 'get_cache_entry', key })
      return null
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private getPrefixedKey(key: string, prefix?: string): string {
    const basePrefix = process.env.CACHE_PREFIX || 'bmf_cache'
    return prefix ? `${basePrefix}:${prefix}:${key}` : `${basePrefix}:${key}`
  }

  private resolveTTL(ttlOrStrategy?: number | TTLStrategy): number {
    if (typeof ttlOrStrategy === 'number') {
      return ttlOrStrategy
    }
    
    if (typeof ttlOrStrategy === 'string') {
      return this.TTL_STRATEGIES[ttlOrStrategy] || this.TTL_STRATEGIES.temporary
    }

    return this.TTL_STRATEGIES.temporary
  }

  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isRedisAvailable = true
      logger.info('Redis connected - switching from memory fallback')
    })

    this.redis.on('error', (error) => {
      this.isRedisAvailable = false
      logger.warn('Redis error - switching to memory fallback', { error: error.message })
    })

    this.redis.on('close', () => {
      this.isRedisAvailable = false
      logger.warn('Redis disconnected - using memory fallback')
    })

    this.redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...')
    })
  }

  // =============================================
  // HEALTH CHECK & DIAGNOSTICS
  // =============================================

  async healthCheck(): Promise<{
    redis: { available: boolean; latency?: number }
    memory: { entriesCount: number; usage: string }
    metrics: CacheMetrics
  }> {
    const startTime = performance.now()
    let redisLatency: number | undefined

    try {
      if (this.isRedisAvailable) {
        await this.redis.ping()
        redisLatency = performance.now() - startTime
      }
    } catch (error) {
      this.isRedisAvailable = false
    }

    return {
      redis: {
        available: this.isRedisAvailable,
        latency: redisLatency
      },
      memory: {
        entriesCount: this.fallbackCache.size,
        usage: `${((this.fallbackCache.size / this.MAX_MEMORY_CACHE_SIZE) * 100).toFixed(1)}%`
      },
      metrics: this.getMetrics()
    }
  }

  /**
   * Performance test for cache operations
   */
  async performanceTest(): Promise<{
    setPerformance: { operations: number; totalTime: number; avgTime: number }
    getPerformance: { operations: number; totalTime: number; avgTime: number }
    deletePerformance: { operations: number; totalTime: number; avgTime: number }
  }> {
    const testOperations = 100
    const testData = { test: 'data', timestamp: Date.now() }

    // Test SET performance
    const setStart = performance.now()
    for (let i = 0; i < testOperations; i++) {
      await this.set(`perf_test:${i}`, testData, 'temporary')
    }
    const setTime = performance.now() - setStart

    // Test GET performance
    const getStart = performance.now()
    for (let i = 0; i < testOperations; i++) {
      await this.get(`perf_test:${i}`)
    }
    const getTime = performance.now() - getStart

    // Test DELETE performance
    const deleteStart = performance.now()
    const deleteKeys = Array.from({ length: testOperations }, (_, i) => `perf_test:${i}`)
    await this.deleteMany(deleteKeys)
    const deleteTime = performance.now() - deleteStart

    return {
      setPerformance: {
        operations: testOperations,
        totalTime: setTime,
        avgTime: setTime / testOperations
      },
      getPerformance: {
        operations: testOperations,
        totalTime: getTime,
        avgTime: getTime / testOperations
      },
      deletePerformance: {
        operations: testOperations,
        totalTime: deleteTime,
        avgTime: deleteTime / testOperations
      }
    }
  }

  // =============================================
  // CLEANUP & SHUTDOWN
  // =============================================

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit()
      this.fallbackCache.clear()
      logger.info('Cache service disconnected')
    } catch (error) {
      logError(error as Error, { action: 'cache_disconnect' })
    }
  }
}

// Singleton instance
export const redisCache = new RedisCacheService()

// Export convenience methods
export const cache = {
  get: <T = any>(key: string, options?: CacheOptions) => redisCache.get<T>(key, options),
  set: (key: string, value: any, ttl?: number | TTLStrategy, options?: CacheOptions) => 
    redisCache.set(key, value, ttl, options),
  delete: (key: string, options?: CacheOptions) => redisCache.delete(key, options),
  deleteMany: (keys: string[], options?: CacheOptions) => redisCache.deleteMany(keys, options),
  flush: (pattern?: string) => redisCache.flush(pattern),
  getMany: <T = any>(keys: string[], options?: CacheOptions) => redisCache.getMany<T>(keys, options),
  setMany: (entries: Array<{ key: string; value: any; ttl?: number | TTLStrategy }>, options?: CacheOptions) => redisCache.setMany(entries, options),
  getOrSet: <T = any>(key: string, fn: () => Promise<T>, ttl?: number | TTLStrategy, options?: CacheOptions) =>
    redisCache.getOrSet<T>(key, fn, ttl, options),
  invalidateByTags: (tags: string[]) => redisCache.invalidateByTags(tags),
  invalidateByPattern: (pattern: string) => redisCache.invalidateByPattern(pattern),
  invalidateRelated: (entityType: string, entityId: string) => redisCache.invalidateRelated(entityType, entityId),
  acquireLock: (key: string, options?: LockOptions) => redisCache.acquireLock(key, options),
  warmCache: (config: any) => redisCache.warmCache(config),
  getMetrics: () => redisCache.getMetrics(),
  healthCheck: () => redisCache.healthCheck(),
  getCacheInfo: () => redisCache.getCacheInfo(),
  getKeys: (pattern?: string) => redisCache.getKeys(pattern),
  getCacheEntry: (key: string) => redisCache.getCacheEntry(key),
  performanceTest: () => redisCache.performanceTest(),
  disconnect: () => redisCache.disconnect()
}
