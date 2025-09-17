import { RedisOptions } from 'ioredis';

// Redis configuration for different environments
export const redisConfigs = {
  development: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'bmf001:dev:',
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxLoadingTimeout: 5000,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
    family: 4,
    enableOfflineQueue: false,
  } as RedisOptions,

  production: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'bmf001:prod:',
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxLoadingTimeout: 10000,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
    family: 4,
    enableOfflineQueue: false,
    // Production-specific settings
    retryDelayOnClusterDown: 300,
    enableAutoPipelining: true,
  } as RedisOptions,

  test: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    db: parseInt(process.env.REDIS_DB || '1'), // Use different DB for tests
    keyPrefix: 'bmf001:test:',
    maxRetriesPerRequest: 1,
    retryDelayOnFailover: 50,
    enableReadyCheck: false,
    maxLoadingTimeout: 2000,
    lazyConnect: true,
    keepAlive: 10000,
    connectTimeout: 5000,
    commandTimeout: 2000,
    family: 4,
    enableOfflineQueue: false,
  } as RedisOptions,
};

// Get Redis configuration for current environment
export function getRedisConfig(): RedisOptions {
  const env = process.env.NODE_ENV || 'development';
  return redisConfigs[env as keyof typeof redisConfigs] || redisConfigs.development;
}

// Redis connection health check
export async function checkRedisHealth(redis: any): Promise<{
  healthy: boolean;
  status: string;
  latency?: number;
  memory?: string;
  version?: string;
}> {
  try {
    const start = Date.now();
    const pong = await redis.ping();
    const latency = Date.now() - start;

    if (pong !== 'PONG') {
      return { healthy: false, status: 'PING failed' };
    }

    // Get Redis info
    const info = await redis.info('server');
    const memoryInfo = await redis.info('memory');
    
    // Parse version
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : 'Unknown';
    
    // Parse memory usage
    const memoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
    const memory = memoryMatch ? memoryMatch[1] : 'Unknown';

    return {
      healthy: true,
      status: 'Connected',
      latency,
      memory,
      version,
    };
  } catch (error) {
    return {
      healthy: false,
      status: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Cache TTL configurations
export const cacheTTL = {
  // Short-lived caches (5 minutes)
  short: 300,
  
  // Medium-lived caches (1 hour)
  medium: 3600,
  
  // Long-lived caches (24 hours)
  long: 86400,
  
  // Very long-lived caches (7 days)
  veryLong: 604800,
  
  // Static data (30 days)
  static: 2592000,
  
  // Specific data types
  product: 3600, // 1 hour
  products: 1800, // 30 minutes
  user: 7200, // 2 hours
  shop: 3600, // 1 hour
  category: 86400, // 24 hours
  categories: 43200, // 12 hours
  search: 900, // 15 minutes
  analytics: 300, // 5 minutes
  session: 86400, // 24 hours
  rateLimit: 60, // 1 minute
  lock: 30, // 30 seconds
} as const;

// Redis key patterns for different data types
export const keyPatterns = {
  product: 'product:*',
  products: 'products:*',
  user: 'user:*',
  shop: 'shop:*',
  category: 'category:*',
  categories: 'categories:*',
  purchase: 'purchase:*',
  payment: 'payment:*',
  referral: 'referral:*',
  analytics: 'analytics:*',
  session: 'session:*',
  lock: 'lock:*',
  rateLimit: 'rate_limit:*',
  search: 'search:*',
  popular: 'popular:*',
  trending: 'trending:*',
  recommendations: 'recommendations:*',
} as const;

// Redis memory optimization settings
export const memoryOptimization = {
  // Maximum memory usage (in bytes)
  maxMemory: process.env.REDIS_MAX_MEMORY || '256mb',
  
  // Eviction policy
  maxMemoryPolicy: 'allkeys-lru' as const,
  
  // Compression settings
  compressionThreshold: 1024, // Compress values larger than 1KB
  
  // Key expiration settings
  defaultExpiration: 3600, // 1 hour default TTL
} as const;

// Redis monitoring and metrics
export const monitoring = {
  // Enable slow log
  slowLogEnabled: true,
  slowLogThreshold: 10000, // 10ms
  
  // Enable command latency monitoring
  latencyMonitoring: true,
  
  // Enable memory usage monitoring
  memoryMonitoring: true,
  
  // Metrics collection interval (in milliseconds)
  metricsInterval: 60000, // 1 minute
} as const;

// Redis security settings
export const security = {
  // Enable AUTH
  requireAuth: !!process.env.REDIS_PASSWORD,
  
  // Enable TLS (if supported)
  enableTLS: process.env.REDIS_TLS === 'true',
  
  // Connection timeout
  connectionTimeout: 10000,
  
  // Command timeout
  commandTimeout: 5000,
} as const;

// Export default configuration
export default getRedisConfig();
