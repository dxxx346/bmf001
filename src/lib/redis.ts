import Redis, { Cluster, RedisOptions } from 'ioredis';
import logger from './logger';

// Redis connection configuration
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Connection pool settings
  family: 4, // 4 (IPv4) or 6 (IPv6)
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'bmf001:',
  // Enable offline queue
  enableOfflineQueue: false,
};

// Create Redis connection with connection pooling
class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private redis: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private isConnected = false;

  private constructor() {
    this.redis = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);
    
    this.setupEventHandlers();
  }

  public static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  private setupEventHandlers(): void {
    // Main Redis connection events
    this.redis.on('connect', () => {
      logger.info('Redis connected');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      logger.info('Redis ready');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Subscriber events
    this.subscriber.on('connect', () => {
      logger.info('Redis subscriber connected');
    });

    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error:', error);
    });

    // Publisher events
    this.publisher.on('connect', () => {
      logger.info('Redis publisher connected');
    });

    this.publisher.on('error', (error) => {
      logger.error('Redis publisher error:', error);
    });
  }

  public getRedis(): Redis {
    return this.redis;
  }

  public getSubscriber(): Redis {
    return this.subscriber;
  }

  public getPublisher(): Redis {
    return this.publisher;
  }

  public isHealthy(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }

  public async disconnect(): Promise<void> {
    await Promise.all([
      this.redis.quit(),
      this.subscriber.quit(),
      this.publisher.quit(),
    ]);
  }
}

// Export singleton instances
const connectionManager = RedisConnectionManager.getInstance();
export const redis = connectionManager.getRedis();
export const subscriber = connectionManager.getSubscriber();
export const publisher = connectionManager.getPublisher();

// Cache utility functions with enhanced error handling
export const cache = {
  // Set cache with TTL
  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  },

  // Get cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  // Delete cache
  async del(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  },

  // Set cache with custom TTL
  async setWithTTL(
    key: string,
    value: unknown,
    ttlSeconds: number
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error('Cache setWithTTL error:', error);
      return false;
    }
  },

  // Get multiple keys
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await redis.mget(...keys);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return [];
    }
  },

  // Set multiple key-value pairs
  async mset(keyValuePairs: Record<string, unknown>): Promise<boolean> {
    try {
      const args: string[] = [];
      for (const [key, value] of Object.entries(keyValuePairs)) {
        args.push(key, JSON.stringify(value));
      }
      await redis.mset(...args);
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  },

  // Increment counter
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const result = await redis.incr(key);
      if (ttlSeconds && result === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      logger.error('Cache incr error:', error);
      return 0;
    }
  },

  // Set with expiration
  async setex(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error('Cache setex error:', error);
      return false;
    }
  },

  // Get and delete atomically
  async getdel<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.getdel(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache getdel error:', error);
      return null;
    }
  },

  // Scan for keys with pattern
  async scan(pattern: string, count = 100): Promise<string[]> {
    try {
      const keys: string[] = [];
      let cursor = '0';
      
      do {
        const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', count);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');
      
      return keys;
    } catch (error) {
      logger.error('Cache scan error:', error);
      return [];
    }
  },

  // Delete multiple keys
  async delMultiple(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      return await redis.del(...keys);
    } catch (error) {
      logger.error('Cache delMultiple error:', error);
      return 0;
    }
  },
};

// Cache key generators
export const cacheKeys = {
  product: (id: string) => `product:${id}`,
  products: (filters: string) => `products:${filters}`,
  user: (id: string) => `user:${id}`,
  shop: (id: string) => `shop:${id}`,
  category: (id: number) => `category:${id}`,
  categories: () => 'categories:all',
  popularProducts: (limit: number) => `popular:products:${limit}`,
  referralStats: (referralId: string) => `referral:stats:${referralId}`,
  userPurchases: (userId: string) => `user:purchases:${userId}`,
  userFavorites: (userId: string) => `user:favorites:${userId}`,
  shopProducts: (shopId: string) => `shop:products:${shopId}`,
  searchResults: (query: string, filters: string) => `search:${query}:${filters}`,
  suggestions: (query: string) => `suggestions:${query.toLowerCase()}`,
  analytics: (type: string, id: string) => `analytics:${type}:${id}`,
  rateLimit: (identifier: string) => `rate_limit:${identifier}`,
  session: (sessionId: string) => `session:${sessionId}`,
  lock: (resource: string) => `lock:${resource}`,
};

// Export connection manager for cleanup
export { connectionManager };
export default redis;
