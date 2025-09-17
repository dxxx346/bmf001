# Analytics System - Complete Implementation

## Overview

This document describes the comprehensive analytics system implemented for the digital marketplace, providing detailed tracking of user behavior, product performance, referral effectiveness, A/B testing, cohort analysis, and revenue forecasting.

## Architecture

### Core Components

1. **Analytics Service** (`/src/services/analytics.service.ts`)
   - Main service for event tracking and analytics
   - Handles event buffering and batch processing
   - Provides real-time and historical analytics

2. **ClickHouse Integration** (`/src/lib/clickhouse.ts`)
   - Scalable analytics database client
   - Optimized for time-series data
   - Handles high-volume event ingestion

3. **A/B Testing Service** (`/src/services/ab-testing.service.ts`)
   - Experiment management and variant assignment
   - Statistical significance calculation
   - Conversion tracking

4. **Cohort Analysis Service** (`/src/services/cohort-analysis.service.ts`)
   - User cohort creation and analysis
   - Retention rate calculations
   - Behavioral pattern analysis

5. **Revenue Forecasting Service** (`/src/services/revenue-forecasting.service.ts`)
   - ML-based revenue predictions
   - Multiple forecasting models
   - Accuracy tracking and validation

## Features

### 1. User Behavior Tracking

#### Event Types
- **Page Views**: Track page visits and user navigation
- **Clicks**: Monitor user interactions and engagement
- **Product Views**: Track product page visits and interest
- **Cart Actions**: Monitor add/remove from cart behavior
- **Purchases**: Track conversion events and revenue
- **Authentication**: Track signup, login, logout events
- **Search**: Monitor search queries and results
- **Referrals**: Track referral clicks and conversions

#### Implementation
```typescript
// Track a page view
await analyticsService.trackPageView(
  '/product/123',
  'Product Page',
  userId,
  sessionId
);

// Track a product view
await analyticsService.trackProductView(
  'product-123',
  'Digital Template',
  'Templates',
  29.99,
  userId,
  sessionId
);

// Track a purchase
await analyticsService.trackPurchase(
  'order-456',
  ['product-123', 'product-456'],
  59.98,
  'USD',
  userId,
  sessionId
);
```

### 2. Product Performance Analytics

#### Metrics Tracked
- **Views**: Total and unique product views
- **Conversions**: Purchase rate and revenue
- **Cart Abandonment**: Add to cart vs purchase rate
- **Search Performance**: Impressions, clicks, CTR
- **Category Performance**: Market share and growth
- **Competitor Analysis**: Price positioning and features

#### Implementation
```typescript
// Get product performance metrics
const metrics = await analyticsService.getProductPerformanceMetrics(
  'product-123',
  '2024-01-01',
  '2024-01-31'
);

console.log(metrics);
// {
//   product_id: 'product-123',
//   views: 1250,
//   unique_viewers: 980,
//   purchases: 45,
//   revenue: 1349.55,
//   conversion_rate: 0.036,
//   cart_abandonment_rate: 0.65,
//   average_order_value: 29.99
// }
```

### 3. Referral Effectiveness

#### Tracking
- **Referral Clicks**: Track when users click referral links
- **Referral Signups**: Monitor new user registrations from referrals
- **Referral Purchases**: Track purchases from referred users
- **Commission Tracking**: Calculate and track referral earnings

#### Implementation
```typescript
// Track referral click
await analyticsService.trackReferralClick(
  'referrer-123',
  'REF123ABC',
  '/product/456',
  userId,
  sessionId
);
```

### 4. A/B Testing Framework

#### Features
- **Experiment Management**: Create, start, stop experiments
- **Variant Assignment**: Automatic user assignment to variants
- **Statistical Analysis**: Calculate significance and confidence
- **Conversion Tracking**: Track experiment-specific conversions

#### Implementation
```typescript
// Create an experiment
const experiment = await abTestingService.createExperiment({
  name: 'Homepage Hero Test',
  description: 'Test different hero images',
  hypothesis: 'Image A will increase conversions by 10%',
  variants: [
    {
      name: 'Control',
      description: 'Current hero image',
      traffic_percentage: 50,
      configuration: { image: 'hero-a.jpg' },
      is_control: true
    },
    {
      name: 'Variant B',
      description: 'New hero image',
      traffic_percentage: 50,
      configuration: { image: 'hero-b.jpg' },
      is_control: false
    }
  ],
  metrics: [
    {
      name: 'conversion_rate',
      type: 'conversion',
      goal: 'maximize',
      primary: true
    }
  ],
  segments: ['all'],
  created_by: 'admin-123'
});

// Assign user to variant
const variant = await abTestingService.assignVariant(
  experiment.id,
  userId
);

// Track conversion
await abTestingService.trackConversion(
  experiment.id,
  userId,
  'conversion_rate',
  1.0
);
```

### 5. Cohort Analysis

#### Features
- **Cohort Creation**: Group users by signup date, first purchase, etc.
- **Retention Analysis**: Track user retention over time
- **Revenue Analysis**: Calculate cohort revenue metrics
- **Behavior Analysis**: Analyze cohort behavior patterns

#### Implementation
```typescript
// Analyze cohort retention
const cohorts = await cohortAnalysisService.analyzeCohortRetention(
  'signup',
  '2024-01-01',
  '2024-01-31',
  'day'
);

// Analyze specific user cohort
const userCohort = await cohortAnalysisService.analyzeUserCohort(
  'user-123',
  'signup',
  '2024-01-15'
);
```

### 6. Revenue Forecasting

#### Features
- **Multiple Models**: ARIMA, Prophet, Linear Regression, Neural Networks
- **Confidence Intervals**: Statistical confidence in predictions
- **Accuracy Tracking**: Monitor and improve forecast accuracy
- **External Factors**: Consider market conditions and seasonality

#### Implementation
```typescript
// Generate revenue forecast
const forecast = await revenueForecastingService.generateForecast(
  'monthly',
  '2024-02',
  'linear_regression'
);

// Analyze forecast accuracy
const accuracy = await revenueForecastingService.analyzeForecastAccuracy(
  forecast.forecast_id
);
```

## Database Schema

### ClickHouse Tables

#### analytics_events
```sql
CREATE TABLE analytics_events (
  id String,
  user_id String,
  session_id String,
  event_type String,
  timestamp DateTime64(3),
  properties String,
  context String,
  metadata String,
  created_at DateTime64(3) DEFAULT now(),
  partition_date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY partition_date
ORDER BY (user_id, timestamp, event_type)
TTL timestamp + INTERVAL 2 YEAR
```

#### analytics_aggregations
```sql
CREATE TABLE analytics_aggregations (
  aggregation_id String,
  metric_name String,
  metric_type String,
  dimensions String,
  value Float64,
  period String,
  created_at DateTime64(3) DEFAULT now()
) ENGINE = SummingMergeTree()
ORDER BY (metric_name, period, dimensions)
TTL created_at + INTERVAL 1 YEAR
```

### Supabase Tables

#### experiments
```sql
CREATE TABLE experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  status TEXT CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  traffic_allocation INTEGER DEFAULT 100,
  variants JSONB NOT NULL DEFAULT '[]',
  metrics JSONB NOT NULL DEFAULT '[]',
  segments TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### Event Tracking
```typescript
POST /api/analytics/events
{
  "event_type": "page_view",
  "properties": {
    "page_url": "/product/123",
    "page_title": "Product Page"
  },
  "context": {
    "device_type": "desktop",
    "browser": "chrome",
    "os": "windows"
  },
  "metadata": {
    "experiment_id": "exp-123",
    "variant_id": "var-456"
  }
}
```

### Dashboard Data
```typescript
GET /api/analytics/dashboard?period=24h
```

### Real-time Metrics
```typescript
GET /api/analytics/realtime
```

### A/B Testing
```typescript
POST /api/analytics/ab-tests
{
  "action": "create",
  "name": "Homepage Test",
  "variants": [...],
  "metrics": [...]
}
```

### Cohort Analysis
```typescript
POST /api/analytics/cohorts
{
  "action": "analyze_retention",
  "cohort_type": "signup",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

### Revenue Forecasting
```typescript
POST /api/analytics/forecasts
{
  "action": "generate",
  "forecast_type": "monthly",
  "period": "2024-02",
  "model_type": "linear_regression"
}
```

## Frontend Components

### Analytics Dashboard
```typescript
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

<AnalyticsDashboard period="24h" />
```

### Real-time Metrics
```typescript
import { useRealTimeMetrics } from '@/hooks/useAnalytics';

const { metrics, loading, error } = useRealTimeMetrics();
```

## Configuration

### Environment Variables
```bash
# ClickHouse Configuration
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=analytics

# Analytics Configuration
ANALYTICS_BUFFER_SIZE=1000
ANALYTICS_FLUSH_INTERVAL=5000
ANALYTICS_RETENTION_DAYS=730
```

### Redis Configuration
```typescript
// Real-time analytics caching
await redis.setex(
  `analytics:realtime:${eventId}`,
  3600, // 1 hour TTL
  JSON.stringify(event)
);
```

## Performance Optimization

### Event Buffering
- Events are buffered in memory and flushed in batches
- Configurable buffer size and flush interval
- Automatic retry on failure

### ClickHouse Optimization
- Partitioned by date for efficient queries
- TTL for automatic data cleanup
- Optimized indexes for common queries

### Caching Strategy
- Redis for real-time metrics
- Supabase for user-specific data
- ClickHouse for historical analytics

## Security

### Row Level Security (RLS)
- Users can only view their own analytics data
- Admins have full access to all analytics
- Sellers can view their product performance

### Data Privacy
- IP addresses are hashed
- Personal data is anonymized
- GDPR compliance features

## Monitoring and Alerting

### Health Checks
```typescript
// ClickHouse health check
const isHealthy = await clickhouseClient.healthCheck();

// Analytics service health
const status = await analyticsService.getHealthStatus();
```

### Error Tracking
- All errors are logged with context
- Failed events are retried automatically
- Alerting for critical failures

## Usage Examples

### Track User Journey
```typescript
// User lands on homepage
await analyticsService.trackPageView('/', 'Homepage', userId, sessionId);

// User searches for products
await analyticsService.trackEvent('search', {
  query: 'digital templates',
  results_count: 25,
  user_id: userId,
  session_id: sessionId
});

// User views a product
await analyticsService.trackProductView(
  'product-123',
  'Digital Template Pack',
  'Templates',
  29.99,
  userId,
  sessionId
);

// User adds to cart
await analyticsService.trackAddToCart(
  'product-123',
  1,
  29.99,
  userId,
  sessionId
);

// User completes purchase
await analyticsService.trackPurchase(
  'order-456',
  ['product-123'],
  29.99,
  'USD',
  userId,
  sessionId
);
```

### A/B Test Implementation
```typescript
// Check if user is in an experiment
const variant = await abTestingService.assignVariant(
  'homepage-hero-test',
  userId
);

if (variant) {
  // Show variant-specific content
  const heroImage = variant.configuration.image;
  // Render component with variant
}

// Track conversion when user purchases
await abTestingService.trackConversion(
  'homepage-hero-test',
  userId,
  'purchase',
  1.0
);
```

### Cohort Analysis
```typescript
// Analyze user retention by signup month
const cohorts = await cohortAnalysisService.analyzeCohortRetention(
  'signup',
  '2024-01-01',
  '2024-03-31',
  'month'
);

// Compare cohorts
const comparison = await cohortAnalysisService.compareCohorts([
  'cohort-2024-01',
  'cohort-2024-02',
  'cohort-2024-03'
]);
```

## Best Practices

### Event Naming
- Use consistent naming conventions
- Include relevant context in properties
- Avoid PII in event names

### Performance
- Batch events when possible
- Use appropriate data types
- Monitor query performance

### Privacy
- Anonymize user data
- Respect user privacy preferences
- Implement data retention policies

## Troubleshooting

### Common Issues

1. **Events not appearing**
   - Check ClickHouse connection
   - Verify event buffer is flushing
   - Check for validation errors

2. **Slow queries**
   - Add appropriate indexes
   - Optimize query patterns
   - Consider data partitioning

3. **Memory issues**
   - Adjust buffer size
   - Monitor flush frequency
   - Check for memory leaks

### Debugging
```typescript
// Enable debug logging
process.env.ANALYTICS_DEBUG = 'true';

// Check event buffer status
const bufferSize = analyticsService.getBufferSize();

// Verify ClickHouse health
const isHealthy = await clickhouseClient.healthCheck();
```

## Future Enhancements

### Planned Features
- Real-time dashboards
- Advanced segmentation
- Predictive analytics
- Machine learning insights
- Custom event funnels
- Advanced cohort analysis
- Revenue attribution modeling

### Scalability Improvements
- Horizontal ClickHouse scaling
- Event streaming with Kafka
- Advanced caching strategies
- Query optimization
- Data archiving

This analytics system provides a comprehensive foundation for understanding user behavior, optimizing product performance, and making data-driven decisions in the digital marketplace.