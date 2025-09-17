import { cache, cacheKeys, redis } from './redis';
import { Cached, CacheInvalidate, CacheWarm, keyGenerators, cacheConfig } from './cache-decorator';
import { invalidateCache } from './cache-invalidation';
import { pubsub, createEvent, channels } from './redis-pubsub';
import { locks, Mutex, Semaphore, WithLock } from './distributed-locks';
import logger from './logger';

// Example service using Redis caching
export class ProductService {
  // Example of cached method
  async getProduct(productId: string): Promise<{ id: string; name: string; price: number; description: string; }> {
    const cacheKey = keyGenerators.product(productId);
    
    // Try to get from cache first
    const cached = await cache.get<{ id: string; name: string; price: number; description: string; }>(cacheKey);
    if (cached !== null) {
      logger.debug(`Cache hit for product ${productId}`);
      return cached;
    }
    
    logger.info(`Fetching product ${productId} from database`);
    // Simulate database call
    await new Promise(resolve => setTimeout(resolve, 100));
    const result = {
      id: productId,
      name: `Product ${productId}`,
      price: 99.99,
      description: 'A great product',
    };
    
    // Cache the result
    await cache.set(cacheKey, result, cacheConfig.medium.ttl);
    return result;
  }

  // Example of cached method with custom key generator
  async getProducts(filters: Record<string, any>): Promise<{ id: string; name: string; price: number; }[]> {
    const cacheKey = keyGenerators.products(filters);
    
    // Try to get from cache first
    const cached = await cache.get<{ id: string; name: string; price: number; }[]>(cacheKey);
    if (cached !== null) {
      logger.debug(`Cache hit for products with filters`);
      return cached;
    }
    
    logger.info('Fetching products from database with filters:', filters);
    // Simulate database call
    await new Promise(resolve => setTimeout(resolve, 200));
    const result = [
      { id: '1', name: 'Product 1', price: 99.99 },
      { id: '2', name: 'Product 2', price: 149.99 },
    ];
    
    // Cache the result
    await cache.set(cacheKey, result, cacheConfig.short.ttl);
    return result;
  }

  // Example of method that invalidates cache
  async createProduct(productData: any): Promise<any> {
    logger.info('Creating new product:', productData);
    // Simulate database insert
    await new Promise(resolve => setTimeout(resolve, 150));
    const productId = Math.random().toString(36).substr(2, 9);
    
    // Invalidate related caches
    await invalidateCache.product(productId, 'create');
    
    // Publish event
    await pubsub.publish(channels.PRODUCT_CREATED, createEvent.productCreated(
      productId,
      productData.shopId,
      productData.categoryId
    ));
    
    return { id: productId, ...productData };
  }

  // Example of method with distributed lock
  async updateProduct(productId: string, updates: any): Promise<any> {
    const lockResult = await locks.acquire('product:update', { ttl: 30000, maxRetries: 3 });
    
    if (!lockResult.acquired) {
      throw new Error(`Failed to acquire lock for product update: ${lockResult.error}`);
    }
    
    try {
      logger.info(`Updating product ${productId} with lock`);
      // Simulate database update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Invalidate related caches
      await invalidateCache.product(productId, 'update');
      
      return { id: productId, ...updates };
    } finally {
      if (lockResult.lockId) {
        await locks.release('product:update', lockResult.lockId);
      }
    }
  }
}

// Example of using Redis pub/sub
export class EventService {
  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Subscribe to product events
    pubsub.subscribe(channels.PRODUCT_CREATED, async (event) => {
      logger.info('Product created event received:', event.data);
      // Update analytics, send notifications, etc.
    });

    pubsub.subscribe(channels.PRODUCT_UPDATED, async (event) => {
      logger.info('Product updated event received:', event.data);
      // Invalidate related caches
      await invalidateCache.product(event.data.productId, 'update');
    });

    // Subscribe to purchase events
    pubsub.subscribe(channels.PURCHASE_COMPLETED, async (event) => {
      logger.info('Purchase completed event received:', event.data);
      // Update analytics, send confirmation emails, etc.
    });
  }

  async publishProductEvent(type: string, data: any) {
    await pubsub.publish(`product:${type}`, {
      type: `product:${type}`,
      data,
    });
  }
}

// Example of using distributed locks
export class InventoryService {
  private mutex = new Mutex('inventory:update');
  private semaphore = new Semaphore('inventory:reserve', 10);

  async updateInventory(productId: string, quantity: number) {
    const acquired = await this.mutex.lock({ ttl: 30000 });
    
    if (!acquired) {
      throw new Error('Could not acquire inventory lock');
    }

    try {
      logger.info(`Updating inventory for product ${productId}`);
      // Simulate inventory update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Publish inventory update event
      await pubsub.publish('inventory:updated', {
        type: 'inventory:updated',
        data: { productId, quantity },
      });
    } finally {
      await this.mutex.unlock();
    }
  }

  async reserveInventory(productId: string, quantity: number) {
    const acquired = await this.semaphore.acquire(quantity, { ttl: 60000 });
    
    if (!acquired) {
      throw new Error('Could not acquire inventory permits');
    }

    try {
      logger.info(`Reserving ${quantity} units of product ${productId}`);
      // Simulate inventory reservation
      await new Promise(resolve => setTimeout(resolve, 50));
    } finally {
      await this.semaphore.release(quantity);
    }
  }
}

// Example of manual cache operations
export class CacheService {
  async cacheUserData(userId: string, userData: any) {
    const key = cacheKeys.user(userId);
    await cache.set(key, userData, 7200); // 2 hours
  }

  async getUserData(userId: string) {
    const key = cacheKeys.user(userId);
    return await cache.get(key);
  }

  async invalidateUserCache(userId: string) {
    const key = cacheKeys.user(userId);
    await cache.del(key);
  }

  async cacheSearchResults(query: string, results: any[]) {
    const key = cacheKeys.searchResults(query, '');
    await cache.set(key, results, 900); // 15 minutes
  }

  async getSearchResults(query: string) {
    const key = cacheKeys.searchResults(query, '');
    return await cache.get(key);
  }

  async warmCache() {
    // Warm up popular products cache
    const popularProducts = await this.getPopularProducts();
    const key = cacheKeys.popularProducts(10);
    await cache.set(key, popularProducts, 1800); // 30 minutes

    // Warm up categories cache
    const categories = await this.getCategories();
    const categoriesKey = cacheKeys.categories();
    await cache.set(categoriesKey, categories, 43200); // 12 hours
  }

  private async getPopularProducts() {
    // Simulate database call
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      { id: '1', name: 'Popular Product 1', views: 1000 },
      { id: '2', name: 'Popular Product 2', views: 800 },
    ];
  }

  private async getCategories() {
    // Simulate database call
    await new Promise(resolve => setTimeout(resolve, 50));
    return [
      { id: 1, name: 'Electronics' },
      { id: 2, name: 'Books' },
      { id: 3, name: 'Software' },
    ];
  }
}

// Example of rate limiting
export class RateLimitService {
  async checkRateLimit(identifier: string, limit: number, window: number): Promise<boolean> {
    const key = cacheKeys.rateLimit(identifier);
    const current = await cache.incr(key, window);
    
    if (current === 1) {
      // First request in window, set expiration
      await redis.expire(key, window);
    }
    
    return current <= limit;
  }

  async getRateLimitInfo(identifier: string) {
    const key = cacheKeys.rateLimit(identifier);
    const current = await redis.get(key);
    const ttl = await redis.ttl(key);
    
    return {
      current: current ? parseInt(current) : 0,
      ttl: ttl > 0 ? ttl : 0,
    };
  }
}

// Example of session management
export class SessionService {
  async createSession(userId: string, sessionData: any) {
    const sessionId = Math.random().toString(36).substr(2, 9);
    const key = cacheKeys.session(sessionId);
    
    await cache.set(key, {
      userId,
      ...sessionData,
      createdAt: Date.now(),
    }, 86400); // 24 hours
    
    return sessionId;
  }

  async getSession(sessionId: string) {
    const key = cacheKeys.session(sessionId);
    return await cache.get(key);
  }

  async updateSession(sessionId: string, updates: any) {
    const key = cacheKeys.session(sessionId);
    const session = await cache.get(key);
    
    if (session) {
      await cache.set(key, { ...session, ...updates }, 86400);
    }
  }

  async deleteSession(sessionId: string) {
    const key = cacheKeys.session(sessionId);
    await cache.del(key);
  }
}

// Example of analytics tracking
export class AnalyticsService {
  async trackEvent(eventType: string, data: any) {
    const key = `analytics:${eventType}:${Date.now()}`;
    await cache.set(key, {
      type: eventType,
      data,
      timestamp: Date.now(),
    }, 3600); // 1 hour

    // Publish event for real-time processing
    await pubsub.publish(channels.ANALYTICS_UPDATE, {
      type: 'analytics:update',
      data: { eventType, data },
    });
  }

  async getAnalytics(eventType: string, timeRange: string) {
    const pattern = `analytics:${eventType}:*`;
    const keys = await cache.scan(pattern);
    const events: any[] = [];
    
    for (const key of keys) {
      const event = await cache.get(key);
      if (event) {
        events.push(event);
      }
    }
    
    return events;
  }
}

// Export example services
export const exampleServices = {
  product: new ProductService(),
  event: new EventService(),
  inventory: new InventoryService(),
  cache: new CacheService(),
  rateLimit: new RateLimitService(),
  session: new SessionService(),
  analytics: new AnalyticsService(),
};

export default exampleServices;
