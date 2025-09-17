# Analytics System Guide

This guide covers the comprehensive analytics system implemented for the digital marketplace, including user behavior tracking, product performance analytics, A/B testing, cohort analysis, and revenue forecasting.

## 🎯 Overview

The analytics system provides:
- **User Behavior Tracking**: Page views, clicks, conversion funnels
- **Product Performance**: Views, purchases, cart abandonment rates
- **Referral Effectiveness**: Click tracking, conversion rates, commission tracking
- **A/B Testing Framework**: Test creation, user assignment, statistical analysis
- **Cohort Analysis**: User retention and behavior patterns
- **Revenue Forecasting**: Predictive analytics for business planning
- **Scalable Storage**: ClickHouse/BigQuery integration for high-volume data

## 🏗️ Architecture

### Core Components

1. **Analytics Service** (`src/services/analytics.service.ts`)
   - Central service for event tracking
   - Batch processing and buffering
   - Privacy mode and data anonymization

2. **Analytics Storage Service** (`src/services/analytics-storage.service.ts`)
   - ClickHouse/BigQuery integration
   - Scalable data storage and querying
   - Real-time analytics processing

3. **A/B Testing Service** (`src/services/ab-testing.service.ts`)
   - Test creation and management
   - User assignment and variant tracking
   - Statistical significance calculation

4. **Analytics Middleware** (`src/middleware/analytics.middleware.ts`)
   - Request-level event tracking
   - Context extraction and processing
   - Session management

5. **Frontend Components**
   - `AnalyticsProvider`: Context provider for tracking
   - `ClickTracker`: Automatic click tracking
   - `ScrollTracker`: Scroll depth and time tracking
   - `ABTestWrapper`: A/B test variant rendering
   - `AnalyticsDashboard`: Comprehensive analytics UI

## 📊 Event Types

### User Behavior Events

```typescript
// Page View
{
  event_type: 'page_view',
  properties: {
    page_url: string,
    page_title: string,
    page_path: string,
    referrer?: string,
    load_time?: number,
    viewport_width: number,
    viewport_height: number
  }
}

// Click Event
{
  event_type: 'click',
  properties: {
    element_id?: string,
    element_class?: string,
    element_text?: string,
    element_type: string,
    page_url: string,
    position_x: number,
    position_y: number
  }
}

// Conversion Event
{
  event_type: 'conversion',
  properties: {
    conversion_type: 'purchase' | 'signup' | 'download' | 'subscription',
    conversion_value?: number,
    currency?: string,
    product_id?: string,
    funnel_stage: string
  }
}
```

### Product Performance Events

```typescript
// Product View
{
  event_type: 'product_view',
  properties: {
    product_id: string,
    shop_id: string,
    category_id?: number,
    price: number,
    currency: string,
    view_duration?: number,
    scroll_depth?: number
  }
}

// Cart Events
{
  event_type: 'cart_add' | 'cart_remove' | 'cart_abandon',
  properties: {
    product_id: string,
    quantity: number,
    price: number,
    currency: string,
    cart_value: number,
    cart_items_count: number
  }
}

// Purchase Event
{
  event_type: 'purchase',
  properties: {
    order_id: string,
    product_id: string,
    shop_id: string,
    amount: number,
    currency: string,
    payment_method: string,
    discount_code?: string,
    referral_code?: string
  }
}
```

### Referral Events

```typescript
// Referral Events
{
  event_type: 'referral_click' | 'referral_conversion',
  properties: {
    referral_id: string,
    referrer_id: string,
    product_id?: string,
    shop_id?: string,
    referral_code: string,
    commission_rate: number,
    conversion_value?: number
  }
}
```

## 🚀 Getting Started

### 1. Environment Setup

Add these environment variables to your `.env.local`:

```bash
# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_BATCH_SIZE=50
ANALYTICS_FLUSH_INTERVAL=5000
ANALYTICS_STORAGE_PROVIDER=supabase # or 'clickhouse' or 'bigquery'
ANALYTICS_PRIVACY_MODE=false
ANALYTICS_DEBUG_MODE=true

# ClickHouse Configuration (if using ClickHouse)
ANALYTICS_DB_HOST=localhost
ANALYTICS_DB_PORT=9000
ANALYTICS_DB_NAME=analytics
ANALYTICS_DB_USER=default
ANALYTICS_DB_PASSWORD=your_password
ANALYTICS_DB_SSL=false

# BigQuery Configuration (if using BigQuery)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account.json
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}
```

### 2. Database Migration

Run the analytics migration:

```bash
npm run db:migrate
```

This creates the necessary tables:
- `analytics_events`: Main events table
- `ab_tests`: A/B test definitions
- `ab_test_assignments`: User test assignments
- `analytics_sessions`: Session tracking
- `analytics_users`: User behavior data
- `analytics_products`: Product performance data
- `analytics_referrals`: Referral effectiveness data

### 3. Frontend Integration

Wrap your app with the AnalyticsProvider:

```tsx
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';
import { ClickTracker } from '@/components/analytics/ClickTracker';
import { ScrollTracker } from '@/components/analytics/ScrollTracker';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider>
          <ClickTracker trackAllClicks={true}>
            <ScrollTracker trackScrollDepth={true}>
              {children}
            </ScrollTracker>
          </ClickTracker>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

## 📈 Usage Examples

### Basic Event Tracking

```tsx
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';

function ProductPage({ product }) {
  const { trackProductView, trackCartEvent } = useAnalytics();

  useEffect(() => {
    // Track product view
    trackProductView({
      productId: product.id,
      shopId: product.shop_id,
      categoryId: product.category_id,
      price: product.price,
      currency: 'USD',
      viewDuration: 30000, // 30 seconds
      scrollDepth: 75
    });
  }, [product.id]);

  const handleAddToCart = () => {
    trackCartEvent({
      eventType: 'cart_add',
      productId: product.id,
      quantity: 1,
      price: product.price,
      currency: 'USD',
      cartValue: cartTotal,
      cartItemsCount: cartItems.length
    });
  };

  return (
    <div>
      <h1>{product.title}</h1>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}
```

### A/B Testing

```tsx
import { ABTestWrapper } from '@/components/analytics/ABTestWrapper';

function HomePage() {
  return (
    <ABTestWrapper
      testId="homepage-cta-test"
      variants={{
        control: <button className="bg-blue-500">Buy Now</button>,
        variant_a: <button className="bg-green-500">Get Started</button>,
        variant_b: <button className="bg-red-500">Shop Now</button>
      }}
      defaultVariant="control"
    />
  );
}
```

### Custom Event Tracking

```tsx
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';

function SearchPage() {
  const { trackSearch, trackCustomEvent } = useAnalytics();

  const handleSearch = (query: string, results: any[]) => {
    trackSearch({
      query,
      resultsCount: results.length,
      filters: { category: 'electronics' }
    });
  };

  const handleFilterChange = (filter: string, value: any) => {
    trackCustomEvent({
      eventType: 'filter_applied',
      properties: {
        filter_type: filter,
        filter_value: value,
        page: 'search'
      }
    });
  };

  return (
    <div>
      {/* Search implementation */}
    </div>
  );
}
```

## 🔧 API Endpoints

### Event Tracking

```bash
POST /api/analytics/track
Content-Type: application/json

{
  "event_type": "page_view",
  "session_id": "session_123",
  "user_id": "user_456",
  "data": {
    "page_url": "https://example.com/products",
    "page_title": "Products",
    "page_path": "/products"
  }
}
```

### Analytics Queries

```bash
GET /api/analytics/query?start_date=2024-01-01&end_date=2024-01-31&granularity=day&metrics=count,sum

POST /api/analytics/query
Content-Type: application/json

{
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-31T23:59:59Z",
  "granularity": "day",
  "filters": {
    "event_type": "purchase",
    "product_id": "product_123"
  },
  "group_by": ["event_type", "date"],
  "metrics": ["count", "sum"]
}
```

### Funnel Analysis

```bash
POST /api/analytics/funnel
Content-Type: application/json

{
  "funnel_name": "conversion_funnel",
  "steps": ["page_view", "product_view", "cart_add", "purchase"],
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-31T23:59:59Z"
}
```

### Product Performance

```bash
GET /api/analytics/products/{product_id}/performance?start_date=2024-01-01&end_date=2024-01-31
```

### User Behavior

```bash
GET /api/analytics/users/{user_id}/behavior?start_date=2024-01-01&end_date=2024-01-31
```

### A/B Testing

```bash
# Assign user to test
POST /api/analytics/ab-test/{test_id}/assign
Content-Type: application/json

{
  "session_id": "session_123",
  "user_id": "user_456"
}

# Get test results
GET /api/analytics/ab-test/{test_id}/results
```

### Cohort Analysis

```bash
GET /api/analytics/cohort?start_date=2024-01-01&end_date=2024-01-31
```

### Revenue Forecasting

```bash
GET /api/analytics/revenue-forecast?period=monthly&months=12
```

## 📊 Analytics Dashboard

The `AnalyticsDashboard` component provides a comprehensive view of your analytics data:

```tsx
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

function AdminPage() {
  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <AnalyticsDashboard 
        period="30d"
        userId="user_123" // Optional: filter by user
        productId="product_456" // Optional: filter by product
        shopId="shop_789" // Optional: filter by shop
      />
    </div>
  );
}
```

## 🔒 Privacy and Compliance

### Privacy Mode

Enable privacy mode to anonymize sensitive data:

```bash
ANALYTICS_PRIVACY_MODE=true
```

This will:
- Hash user IDs
- Anonymize IP addresses
- Remove personally identifiable information

### Data Retention

Configure data retention policies in your storage provider:

- **Supabase**: Use RLS policies and scheduled functions
- **ClickHouse**: Use TTL (Time To Live) settings
- **BigQuery**: Use partition expiration

### GDPR Compliance

The system supports GDPR compliance through:
- User data deletion
- Data export functionality
- Consent tracking
- Right to be forgotten implementation

## 🚀 Performance Optimization

### Batch Processing

Events are automatically batched and flushed:
- Default batch size: 50 events
- Flush interval: 5 seconds
- Configurable via environment variables

### Caching

Use Redis for caching frequently accessed analytics data:

```typescript
import { redis } from '@/lib/redis';

// Cache top products
const cacheKey = 'analytics:top_products:30d';
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const data = await getTopProducts();
await redis.setex(cacheKey, 3600, JSON.stringify(data)); // 1 hour cache
```

### Database Optimization

1. **Indexes**: Proper indexing on frequently queried columns
2. **Partitioning**: Partition large tables by date
3. **Archiving**: Move old data to cold storage
4. **Compression**: Use compression for storage efficiency

## 🔧 Troubleshooting

### Common Issues

1. **Events not tracking**
   - Check `ANALYTICS_ENABLED=true`
   - Verify session ID is being generated
   - Check browser console for errors

2. **High memory usage**
   - Reduce `ANALYTICS_BATCH_SIZE`
   - Increase `ANALYTICS_FLUSH_INTERVAL`
   - Check for memory leaks in event buffering

3. **Slow queries**
   - Add proper indexes
   - Use query optimization
   - Consider data archiving

4. **A/B tests not working**
   - Verify test is in 'running' status
   - Check user assignment logic
   - Ensure proper variant configuration

### Debug Mode

Enable debug mode for detailed logging:

```bash
ANALYTICS_DEBUG_MODE=true
```

This will log:
- Event tracking details
- Batch processing information
- Error details
- Performance metrics

## 📚 Advanced Features

### Custom Metrics

Create custom metrics for business-specific KPIs:

```typescript
// Track custom business metric
trackCustomEvent({
  eventType: 'customer_lifetime_value',
  properties: {
    customer_id: 'customer_123',
    ltv: 1500.00,
    currency: 'USD',
    calculation_date: new Date().toISOString()
  }
});
```

### Real-time Analytics

Use WebSocket connections for real-time analytics:

```typescript
// Real-time dashboard updates
const ws = new WebSocket('ws://localhost:3000/analytics/realtime');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateDashboard(data);
};
```

### Machine Learning Integration

Integrate with ML services for advanced analytics:

```typescript
// Anomaly detection
const anomalies = await detectAnomalies({
  metric: 'conversion_rate',
  threshold: 0.1,
  period: '7d'
});

// Predictive analytics
const predictions = await predictRevenue({
  historical_data: revenueData,
  forecast_period: '3m'
});
```

## 🎯 Best Practices

1. **Event Naming**: Use consistent, descriptive event names
2. **Property Structure**: Standardize property schemas
3. **Data Quality**: Validate data before sending
4. **Performance**: Monitor tracking performance impact
5. **Privacy**: Always consider user privacy
6. **Testing**: Test analytics implementation thoroughly
7. **Documentation**: Document custom events and metrics
8. **Monitoring**: Set up alerts for analytics failures

## 📈 Scaling Considerations

### High Volume

For high-volume applications:
- Use ClickHouse or BigQuery for storage
- Implement data partitioning
- Use message queues for event processing
- Consider data sampling for very high volumes

### Multi-tenant

For multi-tenant applications:
- Implement tenant isolation
- Use separate databases per tenant
- Add tenant-specific analytics dashboards
- Consider data aggregation strategies

### Global Scale

For global applications:
- Use CDN for analytics scripts
- Implement regional data centers
- Consider data sovereignty requirements
- Use edge computing for real-time processing

This analytics system provides a comprehensive foundation for understanding user behavior, optimizing conversions, and making data-driven business decisions in your digital marketplace.
