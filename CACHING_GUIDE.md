# Caching System Implementation Guide

This document provides a comprehensive guide to the caching system implemented for the digital marketplace.

## Overview

The caching system uses Redis to improve performance by storing frequently accessed data in memory. It includes:

- **Product listings caching** (5-minute TTL)
- **User sessions caching** (24-hour TTL)
- **Shop analytics caching** (1-hour TTL)
- **Search results caching** (10-minute TTL)
- **Recommendation engine caching** (30-minute TTL)
- **Exchange rates caching** (1-hour TTL)

## Architecture

### Core Components

1. **Cache Service** (`src/lib/cache.service.ts`)
   - Central cache management
   - TTL management
   - Pattern-based operations
   - Cache invalidation strategies

2. **Cached Services**
   - `CachedProductService` - Product data caching
   - `CachedAuthService` - User session caching
   - `CachedShopService` - Shop analytics caching
   - `CachedPaymentService` - Exchange rates caching

3. **Cache Warming Service** (`src/services/cache-warming.service.ts`)
   - Proactive cache population
   - Scheduled warmup tasks
   - Health monitoring

4. **Cache Invalidation** (`src/lib/cache-invalidation.ts`)
   - Smart invalidation strategies
   - Pattern-based cleanup
   - Cascade invalidation

## Cache TTL Configuration

```typescript
export const CACHE_TTL = {
  PRODUCT_LISTINGS: 5 * 60,        // 5 minutes
  USER_SESSIONS: 24 * 60 * 60,     // 24 hours
  SHOP_ANALYTICS: 60 * 60,         // 1 hour
  SEARCH_RESULTS: 10 * 60,         // 10 minutes
  RECOMMENDATIONS: 30 * 60,        // 30 minutes
  EXCHANGE_RATES: 60 * 60,         // 1 hour
  CATEGORIES: 60 * 60,             // 1 hour
  POPULAR_PRODUCTS: 15 * 60,       // 15 minutes
  USER_PROFILE: 30 * 60,           // 30 minutes
  SHOP_DETAILS: 30 * 60,           // 30 minutes
};
```

## Cache Key Patterns

### Product Caching
- `product:{id}` - Individual product details
- `products:list:{filters}` - Product listings
- `popular:products:{limit}` - Popular products
- `trending:products:{limit}` - Trending products
- `recommendations:{userId}:{productId}` - User recommendations

### User Caching
- `user:profile:{userId}` - User profile data
- `user:purchases:{userId}:{page}` - User purchase history
- `user:favorites:{userId}` - User favorites
- `session:{sessionId}` - User session data

### Shop Caching
- `shop:{shopId}` - Shop details
- `shop:analytics:{shopId}:{period}` - Shop analytics
- `shop:sales:{shopId}:{period}:{page}` - Shop sales data
- `shop:products:{shopId}:{page}` - Shop products

### Search Caching
- `search:{query}:{filters}` - Search results
- `search:facets:{filters}` - Search facets

### Exchange Rates
- `exchange:{from}:{to}` - Currency conversion rates
- `exchange:rates:{base}` - All rates for base currency

## Usage Examples

### Basic Cache Operations

```typescript
import { cacheService, CACHE_KEYS, CACHE_TTL } from '@/lib/cache.service';

// Get from cache
const product = await cacheService.get<Product>(CACHE_KEYS.productDetails(productId));

// Set cache with TTL
await cacheService.set(
  CACHE_KEYS.productDetails(productId),
  product,
  CACHE_TTL.PRODUCT_LISTINGS
);

// Delete from cache
await cacheService.del(CACHE_KEYS.productDetails(productId));

// Pattern-based deletion
await cacheService.delPattern('products:*');
```

### Using Cached Services

```typescript
import { CachedProductService } from '@/services/cached-product.service';

const productService = new CachedProductService();

// This will automatically use cache
const products = await productService.searchProducts({
  filters: { query: 'digital', page: 1, limit: 20 },
  user_id: 'user123',
  include_facets: false,
});
```

### Cache Invalidation

```typescript
import { cacheInvalidationManager } from '@/lib/cache-invalidation';

// Invalidate product caches
await cacheInvalidationManager.invalidateProduct(
  productId,
  'update',
  shopId,
  categoryId
);

// Invalidate user caches
await cacheInvalidationManager.invalidateUser(userId, 'update');

// Invalidate shop caches
await cacheInvalidationManager.invalidateShop(shopId, 'update');
```

## Cache Warming

### Automatic Warmup

The cache warming service automatically populates frequently accessed data:

```typescript
import { cacheWarmingService } from '@/services/cache-warming.service';

// Trigger comprehensive warmup
await cacheWarmingService.warmupAll();

// Warmup specific components
await cacheWarmingService.warmupProducts({
  enabled: true,
  popular_limits: [10, 20, 50, 100],
  trending_limits: [10, 20, 50],
  categories: true,
});
```

### Scheduled Warmup

```typescript
// Start scheduled warmup tasks
await cacheWarmingService.scheduleWarmup();
```

## API Endpoints

### Cache Management API

```bash
# Get cache statistics
GET /api/cache?action=stats

# Get cache health
GET /api/cache?action=health

# Trigger warmup
POST /api/cache
{
  "action": "warmup",
  "products": { "enabled": true },
  "exchange_rates": { "enabled": true }
}

# Invalidate cache
POST /api/cache
{
  "action": "invalidate",
  "type": "product",
  "id": "product123"
}

# Delete cache pattern
DELETE /api/cache?pattern=products:*
```

## Monitoring and Health Checks

### Cache Health Monitoring

```typescript
const health = await cacheService.healthCheck();
const monitoring = await cacheWarmingService.monitorCacheHealth();

console.log('Cache Health:', health);
console.log('Monitoring:', monitoring);
```

### Cache Statistics

```typescript
const stats = await cacheService.getCacheStats();
console.log('Total Keys:', stats.total_keys);
console.log('Memory Usage:', stats.memory_usage);
console.log('Hit Rate:', stats.hit_rate);
```

## Best Practices

### 1. Cache Key Design
- Use consistent naming conventions
- Include relevant identifiers
- Avoid special characters
- Keep keys reasonably short

### 2. TTL Selection
- **Short TTL (5-15 minutes)**: Frequently changing data (product listings, search results)
- **Medium TTL (30-60 minutes)**: Moderately changing data (user profiles, shop details)
- **Long TTL (24 hours)**: Stable data (user sessions, categories)

### 3. Cache Invalidation
- Invalidate related caches when data changes
- Use pattern-based invalidation for bulk operations
- Implement cascade invalidation for complex relationships

### 4. Error Handling
- Always fallback to database on cache errors
- Log cache operations for debugging
- Implement circuit breakers for cache failures

### 5. Memory Management
- Monitor Redis memory usage
- Implement eviction policies
- Clean up expired keys regularly

## Performance Considerations

### Cache Hit Rates
- Target >80% hit rate for frequently accessed data
- Monitor hit rates and adjust TTL accordingly
- Use cache warming for critical data

### Memory Usage
- Monitor Redis memory consumption
- Set appropriate maxmemory policies
- Implement key expiration strategies

### Network Optimization
- Use Redis pipelining for bulk operations
- Implement connection pooling
- Consider Redis clustering for high availability

## Troubleshooting

### Common Issues

1. **Low Cache Hit Rate**
   - Check TTL settings
   - Verify cache key generation
   - Review invalidation patterns

2. **High Memory Usage**
   - Implement key expiration
   - Review cache key patterns
   - Consider data compression

3. **Cache Inconsistency**
   - Verify invalidation logic
   - Check for race conditions
   - Review cache warming timing

### Debugging Tools

```typescript
// Check if key exists
const exists = await cacheService.exists('product:123');

// Get all keys matching pattern
const keys = await cacheService.getPattern('products:*');

// Get cache statistics
const stats = await cacheService.getCacheStats();
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# Cache Configuration
CACHE_DEFAULT_TTL=3600
CACHE_MAX_KEYS=10000
CACHE_MEMORY_LIMIT=100mb
```

### Redis Configuration

```redis
# redis.conf
maxmemory 100mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Migration Guide

### From No Caching to Cached Services

1. Replace service imports:
   ```typescript
   // Before
   import { ProductService } from './product.service';
   
   // After
   import { CachedProductService } from './cached-product.service';
   ```

2. Update service instantiation:
   ```typescript
   // Before
   const productService = new ProductService();
   
   // After
   const productService = new CachedProductService();
   ```

3. Add cache invalidation to update operations:
   ```typescript
   // After updating a product
   await cacheService.invalidateProduct(productId, 'update');
   ```

## Future Enhancements

### Planned Features

1. **Distributed Caching**
   - Redis Cluster support
   - Multi-region cache replication

2. **Advanced Analytics**
   - Cache performance metrics
   - Predictive cache warming
   - Machine learning-based TTL optimization

3. **Cache Compression**
   - Data compression for large objects
   - Serialization optimization

4. **Real-time Monitoring**
   - Cache metrics dashboard
   - Alerting for cache issues
   - Performance trend analysis

## Support

For questions or issues related to the caching system:

1. Check the logs for cache-related errors
2. Monitor cache health via the API
3. Review this documentation
4. Contact the development team

---

*Last updated: December 2024*
