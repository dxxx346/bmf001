# Shop Management System Guide

This guide covers the complete shop management system implementation, including API endpoints, analytics, and dashboard metrics.

## 📋 Overview

The shop management system provides comprehensive functionality for sellers to manage their stores, track analytics, process sales, and handle withdrawals. It includes:

- Shop CRUD operations
- Advanced analytics and metrics
- Sales tracking and reporting
- Withdrawal/payout management
- Settings and configuration

## 🏗️ Architecture

### Database Schema

The system extends the existing database with new tables:

- `withdrawal_requests` - Tracks payout requests
- `shop_analytics_cache` - Caches analytics data for performance
- `shop_visits` - Tracks shop visitor analytics
- Materialized views for performance optimization

### API Structure

```
/api/shops/
├── POST /                    # Create shop
├── GET /                     # List shops
└── [id]/
    ├── GET /analytics        # Get shop analytics
    ├── GET /sales            # Get sales data
    ├── POST /withdraw        # Create withdrawal request
    ├── GET /withdraw         # List withdrawal requests
    ├── PUT /settings         # Update shop settings
    └── GET /settings         # Get shop settings
```

## 🚀 API Endpoints

### 1. Shop Management

#### Create Shop
```http
POST /api/shops
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "My Digital Store",
  "description": "Premium digital products",
  "logo_url": "https://example.com/logo.png",
  "banner_url": "https://example.com/banner.png",
  "website_url": "https://mystore.com",
  "contact_email": "contact@mystore.com",
  "settings": {
    "theme": "light",
    "currency": "USD",
    "language": "en",
    "notifications": {
      "email_sales": true,
      "email_messages": true
    }
  }
}
```

#### Get Shops
```http
GET /api/shops
Authorization: Bearer <token>

# Optional query parameters:
# ?owner_id=uuid - Get shops for specific owner (admin only)
```

#### Update Shop Settings
```http
PUT /api/shops/{id}/settings
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Store Name",
  "description": "New description",
  "settings": {
    "theme": "dark",
    "currency": "EUR",
    "payout_settings": {
      "method": "bank_transfer",
      "account_details": {
        "bank_name": "Chase Bank",
        "account_number": "1234567890",
        "routing_number": "021000021"
      },
      "minimum_payout": 50
    }
  }
}
```

### 2. Analytics & Metrics

#### Get Shop Analytics
```http
GET /api/shops/{id}/analytics?period=30d
Authorization: Bearer <token>

# Period options: 7d, 30d, 90d, 1y
```

**Response:**
```json
{
  "analytics": {
    "period": "30d",
    "revenue": {
      "total": 15000.00,
      "currency": "USD",
      "growth_percentage": 15.5
    },
    "sales": {
      "total_orders": 150,
      "conversion_rate": 3.2,
      "average_order_value": 100.00,
      "growth_percentage": 8.3
    },
    "products": {
      "total_products": 25,
      "active_products": 20,
      "top_products": [
        {
          "product_id": "uuid",
          "title": "Premium Template Pack",
          "sales_count": 45,
          "revenue": 4500.00,
          "conversion_rate": 5.2
        }
      ]
    },
    "visitors": {
      "total_visitors": 2500,
      "unique_visitors": 1800,
      "bounce_rate": 0.35,
      "average_session_duration": 180
    },
    "trends": {
      "daily_revenue": [
        {
          "date": "2024-01-01",
          "revenue": 500.00,
          "orders": 5
        }
      ],
      "top_categories": [
        {
          "category_id": 1,
          "category_name": "Templates",
          "revenue": 8000.00,
          "sales_count": 80
        }
      ]
    }
  }
}
```

#### Get Sales Data
```http
GET /api/shops/{id}/sales?page=1&limit=20&period=30d
Authorization: Bearer <token>
```

**Response:**
```json
{
  "sales": {
    "period": "30d",
    "orders": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_title": "Premium Template",
        "buyer_name": "John Doe",
        "buyer_email": "john@example.com",
        "amount": 99.99,
        "currency": "USD",
        "status": "succeeded",
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "summary": {
      "total_revenue": 15000.00,
      "total_orders": 150,
      "average_order_value": 100.00,
      "refunds": 500.00,
      "net_revenue": 14500.00
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### 3. Withdrawal Management

#### Create Withdrawal Request
```http
POST /api/shops/{id}/withdraw
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 1000.00,
  "method": "bank_transfer",
  "account_details": {
    "bank_name": "Chase Bank",
    "account_number": "1234567890",
    "routing_number": "021000021",
    "account_holder_name": "John Doe"
  }
}
```

#### Get Withdrawal Requests
```http
GET /api/shops/{id}/withdraw
Authorization: Bearer <token>
```

**Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "shop_id": "uuid",
      "amount": 1000.00,
      "currency": "USD",
      "method": "bank_transfer",
      "account_details": {
        "bank_name": "Chase Bank",
        "account_number": "****7890"
      },
      "status": "pending",
      "created_at": "2024-01-01T10:00:00Z",
      "processed_at": null,
      "notes": null
    }
  ]
}
```

## 📊 Dashboard Metrics

### Revenue Metrics
- **Total Revenue**: Sum of all successful sales
- **Growth Percentage**: Period-over-period revenue growth
- **Average Order Value**: Total revenue / number of orders
- **Net Revenue**: Total revenue minus refunds

### Sales Metrics
- **Total Orders**: Count of successful purchases
- **Conversion Rate**: Orders / visitors (requires analytics integration)
- **Growth Percentage**: Period-over-period order growth
- **Refund Rate**: Refunded amount / total revenue

### Product Metrics
- **Total Products**: All products in the shop
- **Active Products**: Products with 'active' status
- **Top Products**: Best-selling products by revenue
- **Product Performance**: Individual product analytics

### Visitor Metrics
- **Total Visitors**: All shop visits
- **Unique Visitors**: Distinct visitors
- **Bounce Rate**: Single-page visits / total visits
- **Session Duration**: Average time spent on shop

## 🛠️ Frontend Integration

### React Hooks

The system provides custom React hooks for easy frontend integration:

```typescript
import { useShops, useShopAnalytics, useShopSales, useWithdrawals } from '@/hooks/useShops';

// Shop management
const { shops, loading, createShop, updateShop } = useShops();

// Analytics
const { analytics, fetchAnalytics } = useShopAnalytics(shopId);

// Sales data
const { sales, fetchSales } = useShopSales(shopId);

// Withdrawals
const { requests, createWithdrawal } = useWithdrawals(shopId);
```

### Example Usage

```typescript
// Create a new shop
const handleCreateShop = async () => {
  const result = await createShop({
    name: "My Store",
    description: "Digital products store",
    settings: {
      theme: "light",
      currency: "USD"
    }
  });
  
  if (result.success) {
    console.log("Shop created successfully!");
  } else {
    console.error("Error:", result.error);
  }
};

// Fetch analytics
const handleFetchAnalytics = async () => {
  await fetchAnalytics('30d');
  console.log(analytics);
};

// Create withdrawal
const handleWithdraw = async () => {
  const result = await createWithdrawal(1000, 'bank_transfer', {
    bank_name: 'Chase Bank',
    account_number: '1234567890',
    routing_number: '021000021'
  });
  
  if (result.success) {
    console.log("Withdrawal request created!");
  }
};
```

## 🔒 Security & Permissions

### Access Control
- **Shop Owners**: Can manage their own shops
- **Admins**: Can access all shops
- **Other Users**: Cannot access shop management

### Data Validation
- Input validation for all API endpoints
- SQL injection prevention
- XSS protection
- Rate limiting on sensitive endpoints

### Withdrawal Security
- Minimum withdrawal amounts
- Balance verification
- Account details validation
- Audit trail for all requests

## 📈 Performance Optimization

### Caching Strategy
- Analytics data cached for 1 hour
- Materialized views for complex queries
- Redis caching for frequently accessed data

### Database Optimization
- Indexed columns for fast queries
- Materialized views for analytics
- Efficient aggregation queries
- Connection pooling

### API Optimization
- Pagination for large datasets
- Efficient data fetching
- Minimal data transfer
- Response compression

## 🚀 Deployment

### Database Migration
Run the migration to set up the required tables:

```bash
# Apply the shop management migration
supabase db push
```

### Environment Variables
Ensure these are set in your environment:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### Testing
Test the endpoints using the provided examples or tools like Postman/Insomnia.

## 📝 Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `SHOP_NOT_FOUND` - Shop doesn't exist
- `ACCESS_DENIED` - Insufficient permissions
- `INVALID_INPUT` - Validation failed
- `INSUFFICIENT_BALANCE` - Not enough funds for withdrawal
- `WITHDRAWAL_LIMIT` - Below minimum withdrawal amount

## 🔄 Future Enhancements

### Planned Features
- Real-time analytics updates
- Advanced reporting and exports
- Multi-currency support
- Automated payout processing
- Shop performance benchmarking
- A/B testing for shop layouts
- Advanced visitor analytics
- Revenue forecasting

### Integration Opportunities
- Google Analytics integration
- Email marketing platforms
- Social media analytics
- Payment processor webhooks
- Third-party analytics tools

## 📞 Support

For issues or questions regarding the shop management system:

1. Check the API documentation
2. Review error messages and logs
3. Test with the provided examples
4. Contact the development team

---

This shop management system provides a comprehensive solution for digital marketplace sellers to manage their stores, track performance, and process payments efficiently.
