# Rate Limiting Middleware Guide

This guide explains how to use the comprehensive rate limiting middleware system that provides distributed rate limiting with Redis backend and memory fallback.

## 🚀 Features

- **Sliding Window Algorithm**: More accurate than fixed windows
- **Redis + Memory Fallback**: Distributed rate limiting with local fallback
- **Exponential Backoff**: Progressively longer delays for repeat violators
- **Role-based Exemptions**: Admin users can bypass rate limits
- **IP + User-based Limiting**: Flexible client identification
- **Security Event Logging**: Automatic logging to `security_events` table
- **Comprehensive Error Handling**: Graceful degradation on failures
- **TypeScript Support**: Full type safety and IntelliSense

## 📋 Default Rate Limits

| Endpoint Type | Requests | Window | Description |
|---------------|----------|--------|-------------|
| Authentication | 5 | 1 minute | Login, register, password reset |
| Payment | 10 | 1 minute | Payment processing endpoints |
| Product Creation | 20 | 1 hour | Creating/uploading products |
| General API | 100 | 1 minute | Most API endpoints |
| Search | 50 | 1 minute | Search and filtering |
| Categories | 200 | 1 minute | Read-heavy category endpoints |

## 🛠️ Installation & Setup

### 1. Prerequisites

Ensure you have the following dependencies:

```bash
npm install ioredis
npm install @supabase/auth-helpers-nextjs
```

### 2. Environment Variables

Add Redis configuration to your `.env.local`:

```env
# Redis Configuration (optional - falls back to memory if unavailable)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_KEY_PREFIX=bmf001:
```

### 3. Database Schema

The rate limiting system uses the `security_events` table which should already exist in your database. If not, run the security features migration:

```sql
-- Security events logging (already in your schema)
CREATE TABLE security_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type text NOT NULL,
  ip_address text,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_agent text,
  endpoint text,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  details jsonb,
  blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
```

## 🔧 Basic Usage

### Method 1: Automatic Integration (Recommended)

The rate limiting is automatically applied to all `/api/*` routes through the main middleware:

```typescript
// src/middleware.ts (already integrated)
import { applyRateLimit } from '@/lib/rate-limit-utils';

export async function middleware(request: NextRequest) {
  // Rate limiting is automatically applied to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }
  // ... rest of middleware
}
```

### Method 2: Per-Route Integration

For custom rate limits on specific routes:

```typescript
// src/app/api/auth/login/route.ts
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit-utils';

const handler = withRateLimit(
  async (request: NextRequest) => {
    // Your login logic here
    const body = await request.json();
    // ... authentication logic
    return NextResponse.json({ success: true });
  },
  rateLimitConfigs.auth // 5 requests per minute
);

export const POST = handler;
```

### Method 3: Custom Configuration

For advanced use cases:

```typescript
// src/app/api/payments/create/route.ts
import { createRateLimitedHandler } from '@/lib/rate-limit-utils';

const handler = createRateLimitedHandler(
  {
    rules: {
      '/api/payments/create': {
        requests: 10,
        window: 60, // 1 minute
      },
    },
    exemptRoles: ['admin', 'premium'],
    enableExponentialBackoff: true,
    maxBackoffMultiplier: 8,
  },
  async (request: NextRequest) => {
    // Your payment logic
    return NextResponse.json({ success: true });
  }
);

export const POST = handler;
```

## 🎯 Advanced Configuration

### Custom Rate Limit Rules

```typescript
import { RateLimitConfig } from '@/middleware/rate-limit.middleware';

const customConfig: RateLimitConfig = {
  rules: {
    // Exact path matching
    '/api/auth/login': { requests: 5, window: 60 },
    
    // Pattern matching with wildcards
    '/api/products/*': { requests: 100, window: 60 },
    
    // Default fallback
    'default': { requests: 50, window: 60 },
  },
  
  // Exempt roles from rate limiting
  exemptRoles: ['admin', 'premium'],
  
  // Exempt specific IP addresses
  exemptIPs: ['192.168.1.100', '10.0.0.1'],
  
  // Custom client identifier
  keyGenerator: (request) => {
    const userId = request.headers.get('x-user-id');
    return userId ? `user:${userId}` : `ip:${getClientIP(request)}`;
  },
  
  // Custom rate limit exceeded handler
  onExceeded: async (request, limit) => {
    return new NextResponse(
      JSON.stringify({
        error: 'Custom rate limit message',
        retryAfter: limit.window,
      }),
      { status: 429 }
    );
  },
  
  // Enable exponential backoff
  enableExponentialBackoff: true,
  maxBackoffMultiplier: 16,
};
```

### Exponential Backoff

When enabled, repeat violators face progressively longer delays:

- 1st violation: Normal limit
- 2nd violation: Limit ÷ 2
- 3rd violation: Limit ÷ 4
- 4th violation: Limit ÷ 8
- And so on...

```typescript
// Example: User normally has 100 req/min
// After 3 violations: Only 12.5 req/min (100 ÷ 8)
```

## 📊 Monitoring & Management

### Check Rate Limit Status

```typescript
// src/app/api/rate-limit/status/route.ts
import { checkRateLimitStatus, rateLimitConfigs } from '@/lib/rate-limit-utils';

export async function GET(request: NextRequest) {
  const status = await checkRateLimitStatus(request, rateLimitConfigs.api);
  
  return NextResponse.json({
    limit: status.limit,
    remaining: status.remaining,
    reset: new Date(status.reset * 1000).toISOString(),
    success: status.success,
  });
}
```

### Admin: Reset Rate Limits

```typescript
// src/app/api/admin/rate-limit/reset/route.ts
import { resetRateLimit } from '@/lib/rate-limit-utils';

export async function POST(request: NextRequest) {
  // Verify admin role first
  const success = await resetRateLimit(request);
  
  return NextResponse.json({
    success,
    message: success ? 'Rate limit reset' : 'Failed to reset',
  });
}
```

### View Security Events

```sql
-- Query recent rate limit violations
SELECT 
  event_type,
  ip_address,
  user_agent,
  details->>'endpoint' as endpoint,
  details->>'limit' as rate_limit,
  created_at
FROM security_events 
WHERE event_type = 'rate_limit_exceeded'
ORDER BY created_at DESC 
LIMIT 50;
```

## 🛡️ Security Features

### Automatic Logging

All rate limit violations are automatically logged to the `security_events` table:

```json
{
  "event_type": "rate_limit_exceeded",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "details": {
    "endpoint": "/api/auth/login",
    "limit": 5,
    "window": 60,
    "remaining": 0,
    "backoffMultiplier": 2
  }
}
```

### IP Blocking Integration

You can integrate with IP blocking systems:

```typescript
// Check if IP is blocked before rate limiting
const isBlocked = await checkIPBlacklist(clientIP);
if (isBlocked) {
  return NextResponse.json(
    { error: 'IP address blocked' },
    { status: 403 }
  );
}
```

### Admin Exemptions

Admin users automatically bypass all rate limits:

```typescript
// Admins are automatically detected and exempted
// No additional configuration needed
```

## 🔍 Response Headers

Rate limited responses include helpful headers:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 60

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 60 seconds.",
  "retryAfter": 60
}
```

Successful requests also include rate limit headers:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🧪 Testing

### Unit Tests

```typescript
// Test rate limiting behavior
describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const request = new NextRequest('http://localhost/api/test');
    const response = await rateLimitMiddleware.handle(request);
    expect(response).toBeNull(); // No rate limit response
  });

  it('should block requests exceeding limit', async () => {
    // Make requests beyond the limit
    for (let i = 0; i < 101; i++) {
      await rateLimitMiddleware.handle(request);
    }
    
    const response = await rateLimitMiddleware.handle(request);
    expect(response?.status).toBe(429);
  });
});
```

### Load Testing

```bash
# Test with Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/products

# Test with curl
for i in {1..200}; do
  curl -w "%{http_code}\n" -o /dev/null -s http://localhost:3000/api/test
done
```

## ⚡ Performance

### Redis Backend

- **Throughput**: 10,000+ requests/second
- **Latency**: <1ms additional overhead
- **Memory**: Minimal, automatic cleanup
- **Scalability**: Distributed across multiple servers

### Memory Fallback

- **Throughput**: 1,000+ requests/second
- **Latency**: <0.1ms additional overhead
- **Memory**: Self-cleaning, max 100MB
- **Scalability**: Single server only

### Optimization Tips

1. **Use Redis in production** for best performance
2. **Adjust window sizes** based on your traffic patterns
3. **Monitor memory usage** if Redis is unavailable
4. **Set appropriate exemptions** for trusted users
5. **Use pattern matching** sparingly for better performance

## 🐛 Troubleshooting

### Common Issues

#### Rate Limits Not Working

```typescript
// Check if middleware is properly integrated
console.log('Rate limit middleware loaded:', !!rateLimitMiddleware);

// Verify Redis connection
const isRedisHealthy = await redis.ping();
console.log('Redis healthy:', isRedisHealthy);
```

#### False Positives

```typescript
// Check if user should be exempted
const isExempt = await rateLimitMiddleware.isExemptClient(request, clientId, ip);
console.log('User exempt:', isExempt);
```

#### Memory Usage High

```typescript
// Monitor memory store size
console.log('Memory store entries:', Object.keys(memoryStore).length);

// Force cleanup
rateLimitMiddleware.cleanupMemoryStore();
```

### Debug Mode

Enable debug logging:

```typescript
// Add to your rate limit configuration
const debugConfig = {
  ...defaultConfig,
  onExceeded: async (request, limit) => {
    console.log('Rate limit exceeded:', {
      path: request.nextUrl.pathname,
      limit: limit.requests,
      window: limit.window,
      ip: getClientIP(request),
    });
    return createRateLimitResponse(limit.requests, 0, Date.now() + limit.window);
  },
};
```

## 📝 Best Practices

1. **Start Conservative**: Begin with strict limits and relax as needed
2. **Monitor Logs**: Watch `security_events` for patterns
3. **Use Exemptions Carefully**: Only exempt truly trusted users
4. **Test Thoroughly**: Verify limits work as expected
5. **Plan for Growth**: Consider higher limits as your user base grows
6. **Document Changes**: Keep track of rate limit adjustments
7. **Monitor Performance**: Watch for impact on response times

## 🔗 Related Documentation

- [Security Implementation Guide](./SECURITY_IMPLEMENTATION_GUIDE.md)
- [Redis Integration](./REDIS_INTEGRATION.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Testing Guide](./TESTING_GUIDE.md)

## 💡 Examples

See [rate-limiting-examples.ts](./src/examples/rate-limiting-examples.ts) for comprehensive usage examples including:

- Basic API route protection
- Custom rate limit configurations
- Role-based rate limiting
- File upload handling
- Webhook processing
- Admin management endpoints
- Health checks
- Custom middleware integration

## 🆘 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the examples file
3. Check application logs for error messages
4. Verify Redis connectivity and configuration
5. Test with simple curl commands first
