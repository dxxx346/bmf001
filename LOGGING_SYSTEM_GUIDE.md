# Comprehensive Logging System Guide

This guide covers the complete logging system implementation for the BMF001 digital marketplace, including Winston, Sentry integration, performance metrics, and business analytics.

## 🏗️ Architecture Overview

The logging system is built with the following components:

- **Winston Logger**: Core logging with structured JSON output
- **Sentry Integration**: Error tracking and performance monitoring
- **Performance Metrics**: API response times, database queries, operation tracking
- **Business Metrics**: User activities, purchases, conversions
- **Log Aggregation**: Datadog, LogTail, and custom transports
- **Correlation IDs**: Request tracing across services

## 📁 File Structure

```
src/
├── lib/
│   ├── logger.ts                 # Core Winston logger
│   ├── log-aggregation.ts       # External log services
│   ├── sentry-logger.ts         # Sentry integration
│   ├── metrics.ts               # Performance & business metrics
│   └── logging-config.ts        # Configuration & setup
├── middleware/
│   └── logging.middleware.ts    # API request logging
└── app/api/example-logging/     # Usage examples
```

## 🚀 Quick Start

### 1. Environment Variables

Add these to your `.env.local`:

```bash
# Logging Configuration
LOG_LEVEL=info
NODE_ENV=production

# Sentry Configuration
SENTRY_DSN=your_sentry_dsn_here

# Log Aggregation (Optional)
DATADOG_API_KEY=your_datadog_api_key
LOGTAIL_TOKEN=your_logtail_token
LOGSTASH_URL=your_logstash_endpoint
```

### 2. Basic Usage

```typescript
import { createLogger, logError, logPerformance } from '@/lib/logger';
import { sentryLogger } from '@/lib/sentry-logger';

// Create logger with correlation ID
const logger = createLogger('req-123');

// Basic logging
logger.info('User action completed', { userId: 'user-123' });
logger.error('Database connection failed', { error: 'Connection timeout' });

// Performance logging
logPerformance('database_query', 150, { table: 'users' }, 'req-123');

// Business metrics
trackUserRegistration('user-123', { source: 'web' }, 'req-123');
```

## 🔧 Core Components

### Winston Logger (`src/lib/logger.ts`)

The core logging system with structured JSON output and correlation IDs.

**Features:**
- Multiple log levels (error, warn, info, debug)
- Correlation ID tracking
- Structured JSON logging
- File rotation in production
- Console formatting for development

**Usage:**
```typescript
import { createLogger, logError, logPerformance } from '@/lib/logger';

const logger = createLogger('correlation-id');

// Different log levels
logger.error('Error message', { context: 'data' });
logger.warn('Warning message', { context: 'data' });
logger.info('Info message', { context: 'data' });
logger.debug('Debug message', { context: 'data' });

// Utility functions
logError(new Error('Something went wrong'), { userId: 'user-123' });
logPerformance('operation_name', 150, { metadata: 'value' });
```

### Sentry Integration (`src/lib/sentry-logger.ts`)

Enhanced error tracking and performance monitoring with Sentry.

**Features:**
- Automatic error capture
- User context tracking
- Performance breadcrumbs
- Business metrics tracking
- Correlation ID integration

**Usage:**
```typescript
import { sentryLogger } from '@/lib/sentry-logger';

// Set user context
sentryLogger.setUserContext({
  id: 'user-123',
  email: 'user@example.com',
  role: 'buyer'
});

// Log errors with context
sentryLogger.error('User action failed', error, { userId: 'user-123' });

// Track business metrics
sentryLogger.trackBusinessMetric('purchase_completed', {
  productId: 'prod-123',
  amount: 99.99
});
```

### Performance Metrics (`src/lib/metrics.ts`)

Comprehensive performance tracking for APIs, database queries, and operations.

**Features:**
- API response time tracking
- Database query performance
- Operation duration monitoring
- Slow query detection
- Aggregated metrics

**Usage:**
```typescript
import { 
  performanceMetrics, 
  databaseMetrics, 
  apiMetrics,
  trackUserRegistration,
  trackProductPurchase 
} from '@/lib/metrics';

// Track performance
performanceMetrics.record('user_creation', 150, { userId: 'user-123' });

// Track database queries
databaseMetrics.recordQuery('SELECT * FROM users', [], 50);

// Track business events
trackUserRegistration('user-123', { source: 'api' });
trackProductPurchase('prod-123', 'user-123', 99.99);
```

### API Request Logging (`src/middleware/logging.middleware.ts`)

Automatic logging for all API requests with detailed metrics.

**Features:**
- Request/response logging
- Performance tracking
- Error handling
- Security event logging
- Rate limiting logs

**Usage:**
```typescript
import { withLogging, withDetailedLogging } from '@/middleware/logging.middleware';

// Basic request logging
export const GET = withLogging(async (req) => {
  // Your handler logic
});

// Detailed logging with additional metrics
export const POST = withDetailedLogging(async (req) => {
  // Your handler logic
});
```

## 📊 Log Aggregation

### Datadog Integration

```typescript
// Configure in your environment
DATADOG_API_KEY=your_api_key

// Logs are automatically sent to Datadog in production
```

### LogTail Integration

```typescript
// Configure in your environment
LOGTAIL_TOKEN=your_token

// Logs are automatically sent to LogTail in production
```

### Custom Transports

```typescript
import { StructuredLogTransport } from '@/lib/log-aggregation';

// Add custom transport
logger.add(new StructuredLogTransport());
```

## 🎯 Business Metrics

Track key business events and conversions:

```typescript
import { 
  trackUserRegistration,
  trackUserLogin,
  trackProductView,
  trackProductPurchase,
  trackShopCreation,
  trackReferralClick,
  trackReferralPurchase,
  trackPaymentSuccess,
  trackPaymentFailure
} from '@/lib/metrics';

// User lifecycle
trackUserRegistration('user-123', { source: 'web' });
trackUserLogin('user-123', { method: 'email' });

// Product interactions
trackProductView('prod-123', 'user-123');
trackProductPurchase('prod-123', 'user-123', 99.99);

// Shop management
trackShopCreation('shop-123', 'user-123');

// Referral system
trackReferralClick('ref-123', 'prod-123');
trackReferralPurchase('ref-123', 'prod-123', 99.99);

// Payment processing
trackPaymentSuccess('payment-123', 99.99, 'stripe');
trackPaymentFailure('payment-123', 99.99, 'stripe', 'Card declined');
```

## 🔍 Monitoring & Alerting

### Performance Monitoring

```typescript
// Get slow queries
const slowQueries = databaseMetrics.getSlowQueries(1000); // > 1 second

// Get slow API endpoints
const slowEndpoints = apiMetrics.getSlowEndpoints(2000); // > 2 seconds

// Get performance summary
performanceMetrics.logSummary();
```

### Error Tracking

```typescript
// Track errors with context
sentryLogger.captureException(error, {
  userId: 'user-123',
  operation: 'payment_processing'
});

// Track security events
sentryLogger.trackSecurityEvent('suspicious_activity', {
  ip: '192.168.1.1',
  action: 'multiple_failed_logins'
});
```

## 📈 Analytics Dashboard

The logging system provides data for:

1. **Performance Metrics**
   - API response times
   - Database query performance
   - Slow operations
   - Error rates

2. **Business Metrics**
   - User registrations
   - Product views and purchases
   - Shop creation
   - Referral performance
   - Payment success rates

3. **Security Events**
   - Failed login attempts
   - Suspicious activities
   - Rate limiting events
   - Access violations

## 🛠️ Configuration

### Log Levels

```bash
# Development
LOG_LEVEL=debug

# Production
LOG_LEVEL=info

# Staging
LOG_LEVEL=warn
```

### File Rotation

Logs are automatically rotated in production:
- Max file size: 20MB
- Retention: 14 days
- Date pattern: YYYY-MM-DD

### Correlation IDs

Every request gets a unique correlation ID for tracing:
- Automatically generated if not provided
- Passed in `x-correlation-id` header
- Included in all log entries
- Used for distributed tracing

## 🚨 Error Handling

The system includes comprehensive error handling:

1. **Automatic Error Capture**: All unhandled errors are logged
2. **Context Preservation**: Error context is maintained across async operations
3. **Sentry Integration**: Errors are sent to Sentry for monitoring
4. **Correlation Tracking**: Errors are linked to specific requests

## 📝 Best Practices

1. **Always use correlation IDs** for request tracing
2. **Log at appropriate levels** (error, warn, info, debug)
3. **Include relevant context** in log messages
4. **Use structured logging** with consistent field names
5. **Monitor performance metrics** regularly
6. **Set up alerts** for critical errors
7. **Review logs** for security events
8. **Track business metrics** for analytics

## 🔧 Troubleshooting

### Common Issues

1. **Missing correlation IDs**: Ensure middleware is applied
2. **Logs not appearing**: Check LOG_LEVEL configuration
3. **Sentry not working**: Verify SENTRY_DSN is set
4. **File rotation issues**: Check disk space and permissions

### Debug Mode

Enable debug logging for troubleshooting:

```bash
LOG_LEVEL=debug NODE_ENV=development npm run dev
```

## 📚 Examples

See `src/app/api/example-logging/route.ts` for a complete example of the logging system in action.

## 🔄 Updates

The logging system is designed to be:
- **Extensible**: Easy to add new log types
- **Configurable**: Environment-based settings
- **Scalable**: Handles high-volume logging
- **Maintainable**: Clean, documented code

For questions or issues, refer to the individual component files or create an issue in the repository.
