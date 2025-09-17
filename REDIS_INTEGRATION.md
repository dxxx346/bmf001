# Redis Integration with Upstash

This document describes the comprehensive Redis integration setup for the BMF001 digital marketplace, including connection pooling, caching decorators, cache invalidation strategies, pub/sub messaging, and distributed locks.

## 🚀 Features

- **Connection Pooling**: Singleton Redis connection manager with automatic reconnection
- **Caching Decorators**: TypeScript decorators for automatic method caching
- **Cache Invalidation**: Multiple strategies for intelligent cache invalidation
- **Pub/Sub Messaging**: Real-time event broadcasting and subscription
- **Distributed Locks**: Mutex and semaphore implementations for concurrent operations
- **Error Handling**: Comprehensive error handling and logging
- **TypeScript Support**: Full type safety and IntelliSense support

## 📁 File Structure

```
src/lib/
├── redis.ts                 # Main Redis connection and cache utilities
├── redis-config.ts          # Environment-specific Redis configurations
├── cache-decorator.ts       # TypeScript caching decorators
├── cache-invalidation.ts    # Cache invalidation strategies
├── redis-pubsub.ts          # Pub/Sub messaging system
├── distributed-locks.ts     # Distributed locking mechanisms
└── redis-examples.ts        # Usage examples and patterns
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following Redis configuration:

```bash
# Redis Connection
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_USERNAME=your-redis-username
REDIS_DB=0
REDIS_KEY_PREFIX=bmf001:prod:

# Optional: Redis TLS
REDIS_TLS=true

# Optional: Memory limits
REDIS_MAX_MEMORY=256mb
```

### Upstash Setup

1. Create a new Redis database on [Upstash](https://upstash.com/)
2. Copy the connection details to your environment variables
3. The system will automatically connect using the provided configuration

## 🎯 Usage Examples

### 1. Basic Caching

```typescript
import { cache, cacheKeys } from '@/lib/redis';

// Set cache
await cache.set('user:123', { name: 'John', email: 'john@example.com' }, 3600);

// Get cache
const user = await cache.get('user:123');

// Delete cache
await cache.del('user:123');
```

### 2. Method Caching with Decorators

```typescript
import { Cached, CacheInvalidate, keyGenerators } from '@/lib/cache-decorator';

class ProductService {
  @Cached({
    ttl: 3600, // 1 hour
    keyGenerator: keyGenerators.product,
  })
  async getProduct(productId: string) {
    // This method will be automatically cached
    return await this.fetchFromDatabase(productId);
  }

  @CacheInvalidate({
    keys: ['products:*', 'popular:products:*'],
  })
  async createProduct(productData: any) {
    // This will invalidate related caches
    return await this.saveToDatabase(productData);
  }
}
```

### 3. Cache Invalidation

```typescript
import { invalidateCache } from '@/lib/cache-invalidation';

// Invalidate product cache
await invalidateCache.product('product-123', 'update');

// Invalidate user cache
await invalidateCache.user('user-456', 'delete');

// Invalidate shop cache
await invalidateCache.shop('shop-789', 'create');
```

### 4. Pub/Sub Messaging

```typescript
import { pubsub, createEvent, channels } from '@/lib/redis-pubsub';

// Subscribe to events
pubsub.subscribe(channels.PRODUCT_CREATED, async (event) => {
  console.log('New product created:', event.data);
});

// Publish events
await pubsub.publish(channels.PRODUCT_CREATED, createEvent.productCreated(
  'product-123',
  'shop-456',
  'category-789'
));
```

### 5. Distributed Locks

```typescript
import { locks, Mutex, Semaphore, WithLock } from '@/lib/distributed-locks';

// Using locks utility
const lockResult = await locks.acquire('inventory:update', { ttl: 30000 });
if (lockResult.acquired) {
  try {
    // Critical section
    await updateInventory();
  } finally {
    await locks.release('inventory:update', lockResult.lockId!);
  }
}

// Using Mutex
const mutex = new Mutex('resource:update');
await mutex.lock();
try {
  // Critical section
} finally {
  await mutex.unlock();
}

// Using decorator
class InventoryService {
  @WithLock('inventory:update', { ttl: 30000 })
  async updateInventory(productId: string, quantity: number) {
    // This method is automatically protected by a distributed lock
  }
}
```

## 🏗️ Architecture

### Connection Management

The Redis integration uses a singleton pattern for connection management:

- **Main Connection**: For general cache operations
- **Subscriber**: For pub/sub message consumption
- **Publisher**: For pub/sub message publishing

### Caching Strategy

1. **Method-Level Caching**: Decorators automatically cache method results
2. **Manual Caching**: Direct cache operations for custom scenarios
3. **Cache Invalidation**: Multiple strategies for intelligent cache clearing
4. **TTL Management**: Configurable time-to-live for different data types

### Cache Invalidation Strategies

1. **Tag-Based**: Invalidate caches by tags
2. **Pattern-Based**: Invalidate caches by key patterns
3. **Time-Based**: Invalidate time-sensitive caches
4. **Cascade**: Invalidate related caches automatically

### Pub/Sub Channels

Predefined channels for different event types:

- `product:*` - Product-related events
- `user:*` - User-related events
- `shop:*` - Shop-related events
- `purchase:*` - Purchase-related events
- `payment:*` - Payment-related events
- `analytics:*` - Analytics events
- `cache:*` - Cache management events

## 🔒 Security

- **Authentication**: Redis AUTH support
- **TLS**: Optional TLS encryption
- **Key Prefixing**: Namespace isolation
- **Connection Timeouts**: Prevent hanging connections

## 📊 Monitoring

### Health Checks

```typescript
import { checkRedisHealth } from '@/lib/redis-config';

const health = await checkRedisHealth(redis);
console.log(health);
// {
//   healthy: true,
//   status: 'Connected',
//   latency: 5,
//   memory: '2.1M',
//   version: '6.2.6'
// }
```

### Cache Statistics

```typescript
import { CacheManager } from '@/lib/cache-decorator';

const stats = await CacheManager.getStats();
console.log(stats);
// {
//   totalKeys: 1250,
//   memoryUsage: '2.1M',
//   hitRate: 0.85
// }
```

## 🚨 Error Handling

All Redis operations include comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Command Errors**: Graceful degradation with fallback to database
- **Timeout Handling**: Configurable timeouts for all operations
- **Logging**: Detailed error logging with context

## 🧪 Testing

### Unit Tests

```typescript
import { redis, cache } from '@/lib/redis';

describe('Redis Integration', () => {
  beforeEach(async () => {
    // Clear test data
    await redis.flushdb();
  });

  it('should cache and retrieve data', async () => {
    const testData = { id: '1', name: 'Test' };
    await cache.set('test:1', testData);
    const result = await cache.get('test:1');
    expect(result).toEqual(testData);
  });
});
```

### Integration Tests

```typescript
import { pubsub, channels } from '@/lib/redis-pubsub';

describe('Pub/Sub Integration', () => {
  it('should publish and receive messages', async () => {
    const receivedMessages: any[] = [];
    
    await pubsub.subscribe(channels.PRODUCT_CREATED, (event) => {
      receivedMessages.push(event);
    });

    await pubsub.publish(channels.PRODUCT_CREATED, {
      type: 'product:created',
      data: { id: '1', name: 'Test Product' },
    });

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(receivedMessages).toHaveLength(1);
  });
});
```

## 🚀 Performance Optimization

### Connection Pooling

- Singleton connection manager prevents connection leaks
- Separate connections for different operations
- Automatic reconnection with health checks

### Caching Strategy

- **Short-lived**: 5 minutes (search results, analytics)
- **Medium-lived**: 1 hour (products, users)
- **Long-lived**: 24 hours (categories, static data)
- **Very long-lived**: 7 days (configuration data)

### Memory Management

- Key prefixing for namespace isolation
- TTL management for automatic cleanup
- Memory usage monitoring
- LRU eviction policy

## 🔧 Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check Redis server status
   - Verify network connectivity
   - Adjust timeout settings

2. **Memory Issues**
   - Monitor Redis memory usage
   - Adjust TTL settings
   - Implement cache eviction

3. **Lock Timeouts**
   - Check for deadlocks
   - Adjust lock TTL
   - Implement lock monitoring

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

This will provide detailed Redis operation logs.

## 📚 Additional Resources

- [ioredis Documentation](https://github.com/luin/ioredis)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Redis Commands Reference](https://redis.io/commands)
- [Redis Pub/Sub Guide](https://redis.io/topics/pubsub)

## 🤝 Contributing

When adding new Redis features:

1. Follow the existing patterns
2. Add comprehensive error handling
3. Include TypeScript types
4. Write unit tests
5. Update this documentation

## 📄 License

This Redis integration is part of the BMF001 digital marketplace project.
