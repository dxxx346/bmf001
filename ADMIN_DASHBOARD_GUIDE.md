# 🎛️ Admin Monitoring Dashboard

A comprehensive real-time monitoring dashboard for the digital marketplace admin panel, featuring system health monitoring, analytics, and performance metrics.

## 🚀 Features

### 📊 Real-time Metrics
- **System Health**: CPU usage, memory consumption, disk space, uptime
- **Response Times**: Average, P95, P99 response times with request counts
- **Sales Analytics**: Revenue, orders, conversion rates with growth trends
- **Payment Metrics**: Success/failure rates by provider (Stripe, YooKassa, Crypto)
- **User Activity**: Active users, new users, session duration, bounce rate
- **Error Monitoring**: Error rates, error types, recent error logs

### 📈 Visualizations
- **Top Products**: Best performing products with sales and revenue data
- **Top Shops**: Highest performing shops with growth metrics
- **User Activity Heatmap**: 7-day activity pattern visualization
- **Real-time Charts**: Live updating metrics with Server-Sent Events

### 🔄 Real-time Updates
- **Server-Sent Events (SSE)**: Live data streaming without page refresh
- **Connection Status**: Visual indicator of real-time connection
- **Auto-reconnection**: Automatic reconnection on connection loss
- **Period Selection**: 1h, 24h, 7d, 30d time period filtering

## 🏗️ Architecture

### Backend Components

#### 1. Monitoring Service (`src/services/monitoring.service.ts`)
- **System Health Collection**: CPU, memory, disk usage monitoring
- **Response Time Tracking**: Request duration measurement and statistics
- **Analytics Aggregation**: Sales, payment, and user activity metrics
- **Error Collection**: Error logging and categorization
- **Caching**: Redis-based caching for performance optimization

#### 2. API Endpoints
- **`/api/admin/monitoring`**: REST API for dashboard data
- **`/api/admin/monitoring/sse`**: Server-Sent Events for real-time updates
- **Authentication**: Admin role required for all endpoints

#### 3. Middleware Integration
- **Response Time Recording**: Automatic request duration tracking
- **Error Logging**: Automatic error capture and categorization
- **Performance Monitoring**: Slow request detection and alerting

### Frontend Components

#### 1. Main Dashboard (`src/components/admin/AdminDashboard.tsx`)
- **Real-time Connection**: SSE connection management
- **Data State Management**: Centralized dashboard data state
- **Error Handling**: Graceful error handling and retry mechanisms
- **Period Management**: Time period selection and data filtering

#### 2. Dashboard Cards
- **SystemHealthCard**: CPU, memory, uptime visualization
- **ResponseTimeCard**: Response time statistics and percentiles
- **SalesMetricsCard**: Revenue, orders, growth trends
- **PaymentMetricsCard**: Payment success rates by provider
- **TopProductsCard**: Best performing products list
- **TopShopsCard**: Highest performing shops list
- **UserActivityCard**: User statistics and session data
- **UserActivityHeatmap**: 7-day activity pattern grid
- **ErrorMetricsCard**: Error rates and recent error logs

#### 3. UI Components
- **PeriodSelector**: Time period dropdown selection
- **ConnectionStatus**: Real-time connection indicator
- **LoadingSpinner**: Loading state component
- **ErrorMessage**: Error display component

## 🔧 Setup and Configuration

### Prerequisites
- Node.js 18+ and npm
- Redis server running
- Supabase database configured
- Admin user with 'admin' role

### Installation
```bash
# Install dependencies
npm install recharts lucide-react

# Start the development server
npm run dev
```

### Environment Variables
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Setup
The monitoring system uses existing database tables:
- `users` - User data for activity metrics
- `products` - Product data for sales analytics
- `shops` - Shop data for performance metrics
- `purchases` - Purchase data for revenue tracking
- `payments` - Payment data for success rate monitoring

## 📱 Usage

### Accessing the Dashboard
1. Navigate to `/admin` in your browser
2. Log in with an admin account
3. The dashboard will load with real-time data

### Real-time Features
- **Live Updates**: Data refreshes automatically every 5 seconds
- **Connection Status**: Green dot indicates active connection
- **Last Updated**: Shows when data was last refreshed
- **Error Handling**: Automatic retry on connection loss

### Period Selection
- **1 Hour**: Real-time monitoring for immediate issues
- **24 Hours**: Daily performance overview
- **7 Days**: Weekly trends and patterns
- **30 Days**: Monthly analytics and growth

### Monitoring Alerts
- **High CPU Usage**: >80% CPU utilization
- **High Memory Usage**: >80% memory utilization
- **Slow Requests**: >1000ms response time
- **High Error Rate**: >5% error rate
- **Payment Failures**: Low payment success rate

## 🔍 Monitoring Metrics

### System Health
- **CPU Usage**: Real-time CPU utilization percentage
- **Memory Usage**: RAM usage with total/used/free breakdown
- **Load Average**: System load over 1, 5, 15 minutes
- **Uptime**: Server uptime in hours and minutes

### Performance Metrics
- **Response Time**: Average, P95, P99 response times
- **Request Count**: Total requests processed
- **Slow Requests**: Requests taking >1000ms
- **Error Rate**: Percentage of failed requests

### Business Metrics
- **Revenue**: Total revenue with growth percentage
- **Orders**: Total orders with growth percentage
- **Conversion Rate**: Purchase to view ratio
- **Average Order Value**: Revenue per order

### User Analytics
- **Active Users**: Users active in selected period
- **New Users**: New user registrations
- **Returning Users**: Users with previous activity
- **Session Duration**: Average user session length
- **Bounce Rate**: Single-page session percentage

## 🛠️ Customization

### Adding New Metrics
1. Add metric type to `src/types/monitoring.ts`
2. Implement collection in `MonitoringService`
3. Create dashboard card component
4. Add to main dashboard layout

### Customizing Alerts
```typescript
// In monitoring.service.ts
const alertThresholds = {
  cpuUsage: 80,
  memoryUsage: 80,
  errorRate: 5,
  responseTime: 1000
};
```

### Styling Customization
- Modify `src/app/admin/admin.css` for custom styles
- Update Tailwind classes in dashboard cards
- Customize color schemes and layouts

## 🔒 Security

### Authentication
- Admin role required for all dashboard access
- JWT token validation for API endpoints
- Session-based authentication for web interface

### Data Privacy
- No sensitive user data exposed in metrics
- Aggregated data only for analytics
- Error logs sanitized of personal information

### Rate Limiting
- API endpoints protected with rate limiting
- SSE connections limited per IP
- Automatic connection cleanup

## 🚨 Troubleshooting

### Common Issues

#### Dashboard Not Loading
- Check admin authentication
- Verify Redis connection
- Ensure database tables exist

#### Real-time Updates Not Working
- Check SSE endpoint accessibility
- Verify browser EventSource support
- Check network connectivity

#### Performance Issues
- Monitor Redis memory usage
- Check database query performance
- Review error logs for bottlenecks

#### Data Not Updating
- Verify monitoring service is running
- Check cache TTL settings
- Ensure database connections are active

### Debug Mode
Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

## 📊 Performance Considerations

### Caching Strategy
- Redis caching for expensive queries
- 1-minute TTL for real-time data
- Background data collection

### Database Optimization
- Indexed queries for analytics
- Aggregated data storage
- Connection pooling

### Memory Management
- Limited buffer sizes for metrics
- Automatic cleanup of old data
- Efficient data serialization

## 🔮 Future Enhancements

### Planned Features
- **Alert System**: Email/SMS notifications for critical issues
- **Custom Dashboards**: User-configurable dashboard layouts
- **Historical Data**: Long-term trend analysis
- **Export Functionality**: CSV/PDF report generation
- **Mobile App**: Native mobile monitoring app

### Integration Opportunities
- **Slack Notifications**: Real-time alerts to Slack channels
- **Grafana Integration**: Advanced visualization options
- **Prometheus Metrics**: Industry-standard monitoring
- **Custom Webhooks**: Integration with external monitoring tools

## 📝 API Reference

### REST Endpoints

#### GET `/api/admin/monitoring`
Get dashboard data for specified period.

**Query Parameters:**
- `period`: Time period (1h, 24h, 7d, 30d)
- `metric`: Specific metric type (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "systemHealth": { ... },
    "salesMetrics": { ... },
    "paymentMetrics": { ... },
    "topProducts": [ ... ],
    "topShops": [ ... ],
    "userActivity": { ... },
    "errorMetrics": { ... }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST `/api/admin/monitoring`
Record monitoring data or perform actions.

**Body:**
```json
{
  "action": "record_response_time",
  "data": {
    "duration": 150
  }
}
```

### Server-Sent Events

#### GET `/api/admin/monitoring/sse`
Real-time data stream.

**Query Parameters:**
- `clientId`: Unique client identifier
- `subscriptions`: Comma-separated event types

**Events:**
- `system_health`: System health updates
- `sales_metrics`: Sales data updates
- `payment_metrics`: Payment data updates
- `user_activity`: User activity updates
- `error_metrics`: Error data updates
- `response_time`: Response time updates
- `heartbeat`: Connection keep-alive

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Component-based architecture

### Testing
- Unit tests for services
- Integration tests for APIs
- E2E tests for dashboard functionality

---

**Built with ❤️ for the Digital Marketplace Platform**
