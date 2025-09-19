# 🔗 Database Connection Pooling Guide

This guide explains the comprehensive database connection pooling system implemented for the BMF001 digital marketplace to optimize database performance and reliability.

## 🚀 Features

- **Connection Pooling**: Min 5, Max 20 connections with intelligent management
- **Read/Write Separation**: Dedicated pools for read and write operations
- **Connection Timeout**: 30-second timeout with exponential backoff retry
- **Health Monitoring**: Real-time pool health monitoring and metrics
- **Leak Detection**: Automatic detection and prevention of connection leaks
- **Graceful Shutdown**: Clean shutdown on application termination
- **Performance Metrics**: Comprehensive monitoring and analytics
- **TypeScript Support**: Full type safety and IntelliSense

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│              Database Connection Service                    │
├─────────────────────────────────────────────────────────────┤
│                  Pooled Supabase Client                    │
├─────────────────────────────────────────────────────────────┤
│    Read Pool (5-10 connections)  │  Write Pool (5-10 conn) │
├─────────────────────────────────────────────────────────────┤
│                    Supabase Database                       │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Installation & Setup

### 1. Environment Configuration

Add to your `.env.local`:

```env
# Database Pool Configuration (optional - uses smart defaults)
DB_POOL_MIN_CONNECTIONS=5
DB_POOL_MAX_CONNECTIONS=20
DB_POOL_CONNECTION_TIMEOUT=30000
DB_POOL_IDLE_TIMEOUT=300000
DB_POOL_MAX_RETRIES=3
DB_POOL_RETRY_DELAY=1000
DB_POOL_HEALTH_CHECK_INTERVAL=30000
DB_POOL_LEAK_DETECTION_TIMEOUT=60000
DB_POOL_ENABLE_METRICS=true
DB_POOL_ENABLE_HEALTH_CHECKS=true

# Or use a single JSON configuration
DB_POOL_CONFIG={"minConnections":5,"maxConnections":20,"connectionTimeout":30000}
```

### 2. Basic Usage

The connection pooling is automatically available through the database service:

```typescript
import { db } from '@/services/database-connection.service';

// User operations
const user = await db.users.get('user-id');
const newUser = await db.users.create(userData);

// Product operations  
const products = await db.products.search({ query: 'laptop' });
const product = await db.products.get('product-id');

// Transaction support
const results = await db.transaction([
  (client) => client.from('users').insert(userData),
  (client) => client.from('shops').insert(shopData),
]);
```

## 🔧 Advanced Usage

### 1. Direct Pool Access

For advanced use cases, you can access the pool directly:

```typescript
import { executeWithPool, getConnectionPool } from '@/lib/supabase/connection-pool';

// Execute custom operation with pooling
const result = await executeWithPool(async (client) => {
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('seller_id', sellerId);
  
  if (error) throw error;
  return data;
}, 'read'); // Specify 'read' or 'write'

// Get pool metrics
const pool = getConnectionPool();
const metrics = pool.getMetrics();
console.log('Pool health:', metrics.poolHealth);
```

### 2. Custom Pooled Client

```typescript
import { getPooledClient } from '@/lib/supabase/pooled-client';

const pooledClient = getPooledClient();

// Read operation
const users = await pooledClient.read(async (client) => {
  return await client.from('users').select('*');
});

// Write operation
const newProduct = await pooledClient.write(async (client) => {
  return await client.from('products').insert(productData).select().single();
});

// Transaction
const results = await pooledClient.transaction([
  (client) => client.from('table1').insert(data1),
  (client) => client.from('table2').insert(data2),
]);
```

### 3. Environment-Specific Configuration

```typescript
import { getOptimizedConfig } from '@/lib/supabase/pool-config';

// Get configuration optimized for expected load
const config = getOptimizedConfig('high'); // 'low', 'medium', 'high', 'extreme'

// Create custom pool with specific configuration
const customPool = new SupabaseConnectionPool(config);
```

## 📊 Health Monitoring

### 1. Health Check API

Access the health check endpoint:

```bash
# Basic health check
curl http://localhost:3000/api/health/database

# Quick availability check
curl -I http://localhost:3000/api/health/database
```

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-18T10:30:00.000Z",
  "responseTime": 45,
  "database": {
    "connection": {
      "status": "connected",
      "responseTime": 23,
      "poolStatus": "8/20 active"
    },
    "pool": {
      "health": "healthy",
      "connections": {
        "total": 20,
        "active": 8,
        "idle": 12,
        "pending": 0
      },
      "performance": {
        "totalRequests": 15420,
        "failedRequests": 12,
        "averageResponseTime": 156,
        "errorRate": 0.0008
      },
      "monitoring": {
        "connectionLeaks": 0,
        "lastHealthCheck": "2025-09-18T10:29:45.000Z",
        "uptimeSeconds": 86400
      }
    }
  }
}
```

### 2. Admin Dashboard

Include the monitoring component in your admin dashboard:

```typescript
import { DatabasePoolMonitor } from '@/components/admin/DatabasePoolMonitor';

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <DatabasePoolMonitor />
    </div>
  );
}
```

### 3. Programmatic Monitoring

```typescript
import { getDatabaseConnectionService } from '@/services/database-connection.service';

const dbService = getDatabaseConnectionService();

// Get current pool metrics
const metrics = dbService.getConnectionPoolStatus();
console.log('Pool health:', metrics.poolHealth);
console.log('Active connections:', metrics.activeConnections);

// Get query performance metrics
const queryMetrics = dbService.getQueryMetrics('hour');
console.log('Average query time:', queryMetrics.averageExecutionTime);
console.log('Slow queries:', queryMetrics.slowQueries);
```

## ⚡ Performance Optimization

### 1. Connection Pool Sizing

**Default Configuration:**
- **Development**: 2-5 connections
- **Production**: 5-20 connections  
- **High Load**: 10-50 connections

**Sizing Guidelines:**
```typescript
// For low traffic (< 100 concurrent users)
minConnections: 2-5
maxConnections: 5-10

// For medium traffic (100-1000 concurrent users)
minConnections: 5-10
maxConnections: 10-20

// For high traffic (1000+ concurrent users)
minConnections: 10-20
maxConnections: 20-50
```

### 2. Read/Write Optimization

```typescript
// Use read pool for queries
const products = await db.products.search(filters); // Uses read pool

// Use write pool for modifications
const newProduct = await db.products.create(data); // Uses write pool

// Transactions always use write pool
const result = await db.transaction([
  (client) => client.from('users').insert(userData),
  (client) => client.from('profiles').insert(profileData),
]);
```

### 3. Connection Lifecycle

```
Connection Created → Added to Pool → Health Check → Assigned to Request → 
Released → Idle Timeout → Health Check → Cleanup/Reuse
```

## 🛡️ Error Handling & Resilience

### 1. Automatic Retry Logic

```typescript
// Automatic retry with exponential backoff
const result = await executeWithPool(async (client) => {
  // This operation will be retried up to 3 times
  // with delays of 1s, 2s, 4s on failures
  return await client.from('products').select('*');
}, 'read');
```

### 2. Connection Leak Prevention

```typescript
// Automatic leak detection
// Connections held longer than 60 seconds are automatically released
// and logged as potential leaks

// Manual connection management (if needed)
const pool = getConnectionPool();
const connection = await pool.getConnection('read');
try {
  // Use connection
  const result = await connection.client.from('table').select('*');
  return result;
} finally {
  // Always release connection
  pool.releaseConnection(connection);
}
```

### 3. Graceful Shutdown

```typescript
// Automatic shutdown on process termination
process.on('SIGTERM', async () => {
  const dbService = getDatabaseConnectionService();
  await dbService.shutdown();
  process.exit(0);
});
```

## 📈 Monitoring & Alerts

### 1. Health Status Levels

| Status | Description | Action Required |
|--------|-------------|-----------------|
| **Healthy** | All systems operating normally | None |
| **Degraded** | Some issues detected | Monitor closely |
| **Unhealthy** | Significant problems | Immediate attention |

### 2. Key Metrics to Monitor

```typescript
// Connection utilization
const utilizationRate = activeConnections / totalConnections;
// Alert if > 80%

// Error rate
const errorRate = failedRequests / totalRequests;
// Alert if > 5%

// Response time
const avgResponseTime = totalResponseTime / requestCount;
// Alert if > 1000ms

// Connection leaks
const leakCount = metrics.connectionLeaks;
// Alert if > 0
```

### 3. Alerting Integration

```typescript
// Example: Slack alerts for critical issues
if (metrics.poolHealth === 'unhealthy') {
  await sendSlackAlert({
    channel: '#alerts',
    message: `🚨 Database pool unhealthy: ${metrics.activeConnections}/${metrics.totalConnections} connections`,
    severity: 'critical',
  });
}
```

## 🧪 Testing

### 1. Load Testing

```bash
# Test connection pool under load
npm run test:load-database

# Manual load test with curl
for i in {1..100}; do
  curl -s http://localhost:3000/api/health/database > /dev/null &
done
wait
```

### 2. Connection Pool Tests

```typescript
// Test connection acquisition and release
describe('Connection Pool', () => {
  it('should acquire and release connections properly', async () => {
    const pool = getConnectionPool();
    const connection = await pool.getConnection('read');
    
    expect(connection).toBeDefined();
    expect(connection.isActive).toBe(true);
    
    pool.releaseConnection(connection);
    expect(connection.isActive).toBe(false);
  });
  
  it('should handle connection timeouts', async () => {
    // Test timeout behavior
    await expect(
      pool.getConnection('read')
    ).rejects.toThrow('Connection timeout');
  });
});
```

### 3. Health Check Tests

```typescript
describe('Health Checks', () => {
  it('should return healthy status when database is available', async () => {
    const health = await checkDatabaseHealth();
    expect(health.status).toBe('healthy');
    expect(health.details.canConnect).toBe(true);
  });
});
```

## 🔧 Configuration Examples

### Development Environment

```typescript
const devConfig = {
  minConnections: 2,
  maxConnections: 5,
  connectionTimeout: 10000,
  idleTimeout: 60000,
  enableMetrics: true,
  enableHealthChecks: true,
};
```

### Production Environment

```typescript
const prodConfig = {
  minConnections: 5,
  maxConnections: 20,
  connectionTimeout: 30000,
  idleTimeout: 300000,
  maxRetries: 3,
  retryDelay: 1000,
  enableMetrics: true,
  enableHealthChecks: true,
};
```

### High-Load Environment

```typescript
const highLoadConfig = {
  minConnections: 10,
  maxConnections: 50,
  connectionTimeout: 45000,
  idleTimeout: 600000,
  maxRetries: 5,
  retryDelay: 2000,
  healthCheckInterval: 15000,
};
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Connection Pool Exhaustion

**Symptoms:**
- `Connection timeout` errors
- High pending request count
- Slow response times

**Solutions:**
```typescript
// Increase pool size
DB_POOL_MAX_CONNECTIONS=30

// Decrease idle timeout
DB_POOL_IDLE_TIMEOUT=180000

// Check for connection leaks
const metrics = pool.getMetrics();
console.log('Connection leaks:', metrics.connectionLeaks);
```

#### 2. Connection Leaks

**Symptoms:**
- Increasing leak count in metrics
- Pool utilization stays high
- Memory usage increases over time

**Solutions:**
```typescript
// Enable leak detection logging
const pool = getConnectionPool();
// Check logs for leak warnings

// Use high-level API instead of direct pool access
const result = await db.products.get(id); // Automatic connection management
```

#### 3. High Error Rates

**Symptoms:**
- Error rate > 5%
- Failed connection attempts
- Database timeouts

**Solutions:**
```typescript
// Check database connectivity
const health = await checkDatabaseHealth();
console.log('Can connect:', health.details.canConnect);

// Increase retry attempts
DB_POOL_MAX_RETRIES=5

// Check Supabase service status
```

### Debug Mode

Enable detailed logging:

```env
LOG_LEVEL=debug
DB_POOL_ENABLE_METRICS=true
```

```typescript
// Access detailed metrics
const dbService = getDatabaseConnectionService();
const queryMetrics = dbService.getQueryMetrics('hour');
console.log('Slow queries:', queryMetrics.slowQueries);
```

## 📊 Performance Benchmarks

### Expected Performance

| Metric | Development | Production | High-Load |
|--------|-------------|------------|-----------|
| **Response Time** | < 100ms | < 50ms | < 30ms |
| **Throughput** | 100 req/s | 1000 req/s | 5000 req/s |
| **Error Rate** | < 1% | < 0.1% | < 0.05% |
| **Connection Utilization** | < 60% | < 70% | < 80% |

### Optimization Tips

1. **Pool Sizing**: Start with default settings and adjust based on metrics
2. **Read/Write Separation**: Use read pool for queries, write pool for modifications
3. **Connection Reuse**: Prefer high-level API over direct pool access
4. **Health Monitoring**: Set up alerts for critical metrics
5. **Regular Maintenance**: Run cleanup tasks periodically

## 🔗 API Reference

### Connection Pool Manager

```typescript
import { getConnectionPool } from '@/lib/supabase/connection-pool';

const pool = getConnectionPool();

// Get connection
const connection = await pool.getConnection('read');

// Release connection
pool.releaseConnection(connection);

// Get metrics
const metrics = pool.getMetrics();

// Graceful shutdown
await pool.gracefulShutdown();
```

### Database Operations

```typescript
import { db } from '@/services/database-connection.service';

// CRUD operations
const user = await db.users.get(id);
const users = await db.users.create(data);
const updated = await db.users.update(id, changes);

// Search operations
const products = await db.products.search(filters);

// Analytics
const analytics = await db.analytics.get('sales', filters);

// Health checks
const health = await db.health.check();
const metrics = db.health.getMetrics();
```

### Health Check Endpoint

```http
GET /api/health/database
HEAD /api/health/database
```

**Response Headers:**
- `X-Pool-Health`: Overall pool health status
- `X-Active-Connections`: Number of active connections
- `X-Total-Connections`: Total connections in pool
- `X-Health-Check-Time`: Health check execution time

## 🔒 Security Considerations

### 1. Connection Security

- **Service Role Key**: Write operations use service role key
- **Anon Key**: Read operations use anonymous key when possible
- **Connection Isolation**: Each connection has unique identifier
- **Audit Logging**: All connection events are logged

### 2. Access Control

```typescript
// Role-based pool access
const pool = getConnectionPool();

// Admin operations (full access)
if (userRole === 'admin') {
  const connection = await pool.getConnection('write');
  // ... perform admin operations
}

// Regular user operations (read-only)
const connection = await pool.getConnection('read');
// ... perform read operations
```

### 3. Rate Limiting Integration

The connection pool integrates with the rate limiting middleware:

```typescript
// Rate limiting applies before connection acquisition
// Prevents pool exhaustion from abuse
```

## 🚨 Emergency Procedures

### 1. Pool Exhaustion

```bash
# Check current pool status
curl http://localhost:3000/api/health/database

# Force pool reset (admin only)
curl -X POST http://localhost:3000/api/admin/database/reset-pool
```

### 2. Connection Leaks

```typescript
// Get leak information
const metrics = pool.getMetrics();
if (metrics.connectionLeaks > 0) {
  logger.error('Connection leaks detected:', metrics.connectionLeaks);
  
  // Force cleanup (emergency only)
  await pool.gracefulShutdown();
  // Pool will automatically reinitialize
}
```

### 3. Database Connectivity Issues

```typescript
// Test direct database connection
const health = await checkDatabaseHealth();
if (!health.details.canConnect) {
  // Check Supabase service status
  // Verify environment variables
  // Check network connectivity
}
```

## 📝 Best Practices

1. **Use High-Level API**: Prefer `db.*` operations over direct pool access
2. **Monitor Metrics**: Set up alerts for key performance indicators
3. **Regular Health Checks**: Monitor `/api/health/database` endpoint
4. **Graceful Degradation**: Handle connection failures gracefully
5. **Connection Hygiene**: Always release connections (automatic with high-level API)
6. **Environment Tuning**: Adjust pool settings based on actual usage patterns
7. **Load Testing**: Test pool behavior under expected load

## 🔗 Related Documentation

- [Security Implementation Guide](./SECURITY_IMPLEMENTATION_GUIDE.md)
- [Rate Limiting Guide](./RATE_LIMITING_GUIDE.md)
- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Performance Optimization Guide](./OPTIMIZATION_GUIDE.md)

## 💡 Migration Guide

### From Direct Supabase Client

```typescript
// BEFORE: Direct client usage
import { createServiceClient } from '@/lib/supabase';
const supabase = createServiceClient();
const { data } = await supabase.from('products').select('*');

// AFTER: Pooled client usage
import { db } from '@/services/database-connection.service';
const products = await db.products.get();
```

### Batch Migration

```typescript
// Update all services to use pooled connections
// 1. Replace direct supabase imports
// 2. Use db.* operations
// 3. Test thoroughly
// 4. Monitor metrics
```

---

## ✅ **IMPLEMENTATION COMPLETE**

The database connection pooling system is now fully implemented and ready for production use. It provides:

- **High Performance**: Optimized connection reuse and management
- **Reliability**: Automatic retry logic and error handling  
- **Monitoring**: Comprehensive health checks and metrics
- **Security**: Secure connection management and audit logging
- **Scalability**: Supports high-load scenarios with intelligent pooling

**Next Steps:**
1. Deploy to staging environment
2. Run load tests to validate performance
3. Set up monitoring alerts
4. Train team on new API usage
5. Monitor metrics and adjust configuration as needed
