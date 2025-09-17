# 🗄️ Supabase Migration Guide

This guide will help you set up and run the complete database schema for your digital marketplace using Supabase migrations.

## 📋 Migration Files Overview

The migration files are organized in the `supabase/migrations/` directory:

1. **`20241201000001_initial_schema.sql`** - Complete database schema
2. **`20241201000002_performance_indexes.sql`** - Performance indexes
3. **`20241201000003_rls_policies.sql`** - Row Level Security policies
4. **`20241201000004_database_functions.sql`** - Database functions
5. **`20241201000005_seed_data.sql`** - Sample data for development

## 🚀 Quick Start

### 1. Prerequisites

Make sure you have:
- Supabase project created
- Environment variables set in `.env.local`
- Supabase CLI installed

### 2. Run Migrations

```bash
# Run all migrations
npm run db:migrate

# Or run manually with Supabase CLI
supabase db push
```

### 3. Verify Setup

```bash
# Check migration status
npm run db:status

# Generate TypeScript types
npm run db:types
```

## 📊 Database Schema

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User accounts | Role-based access, email verification |
| `shops` | Multi-store support | Slug-based URLs, settings JSONB |
| `products` | Digital products | File management, ratings, analytics |
| `purchases` | Transaction history | Download tracking, expiration |
| `payments` | Multi-provider payments | Stripe, YooKassa, crypto support |
| `categories` | Product categorization | Hierarchical structure |
| `reviews` | Product reviews | Rating system, moderation |
| `cart_items` | Shopping cart | Session-based cart |
| `favorites` | User favorites | Wishlist functionality |
| `referrals` | Affiliate system | Commission tracking |

### Analytics Tables

| Table | Purpose |
|-------|---------|
| `referral_stats` | Referral performance |
| `referral_clicks` | Click tracking |
| `product_views` | Product analytics |
| `user_sessions` | User behavior |
| `notifications` | User notifications |

## 🔐 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with comprehensive policies:

- **Users**: Can only access their own data
- **Shops**: Public read, owner management
- **Products**: Public read for active products, owner management
- **Purchases**: Users see their own, sellers see their product sales
- **Reviews**: Public read for approved, owner management
- **Referrals**: Owner management, public read for active
- **Analytics**: Owner-specific data access

### Access Patterns

```sql
-- Users can only see their own data
SELECT * FROM users WHERE id = auth.uid();

-- Public can see active products
SELECT * FROM products WHERE status = 'active';

-- Sellers can manage their products
SELECT * FROM products WHERE seller_id = auth.uid();
```

## ⚡ Performance Features

### Indexes

- **Primary indexes** on all foreign keys
- **Composite indexes** for common queries
- **Full-text search** indexes on content
- **Partial indexes** for active records
- **GIN indexes** for JSONB and array fields

### Query Optimization

```sql
-- Optimized product search
SELECT * FROM search_products('design', 1, 10, 100, 'rating', 'desc', 20, 0);

-- Efficient analytics
SELECT * FROM get_shop_analytics('shop-id', '2024-01-01', '2024-12-31');
```

## 🛠️ Database Functions

### Product Functions

- `increment_product_views(product_id)` - Track views
- `increment_product_downloads(product_id)` - Track downloads
- `update_product_rating(product_id)` - Update ratings
- `get_product_stats(product_id)` - Get analytics

### Referral Functions

- `increment_referral_clicks(referral_id, ...)` - Track clicks
- `process_referral_conversion(referral_id, purchase_id)` - Process commissions

### Analytics Functions

- `get_shop_analytics(shop_id, start_date, end_date)` - Shop performance
- `get_user_analytics(user_id, start_date, end_date)` - User statistics

### Search Functions

- `search_products(query, category, min_price, max_price, sort_by, sort_order, limit, offset)` - Product search

### Utility Functions

- `create_notification(user_id, type, title, message, data)` - Send notifications
- `add_to_cart(user_id, product_id, quantity)` - Cart management
- `create_purchase(buyer_id, product_id, payment_id, amount, currency)` - Process purchases

## 🔄 Migration Commands

```bash
# Run all migrations
npm run db:migrate

# Check migration status
npm run db:status

# Reset database (development only)
npm run db:reset

# Generate TypeScript types
npm run db:types

# View migration history
supabase migration list

# Create new migration
supabase migration new migration_name
```

## 🧪 Development Data

The seed data includes:

- **15 product categories** (Digital Art, Templates, Software, etc.)
- **Sample users** (admin, seller, buyer, partner)
- **Sample shops** with products
- **Sample reviews** and ratings
- **Sample referrals** and notifications

## 🔍 Testing Migrations

### 1. Test RLS Policies

```sql
-- Test user can only see own data
SET LOCAL "request.jwt.claims" TO '{"sub": "user-id"}';
SELECT * FROM users; -- Should only return current user

-- Test public can see active products
SELECT * FROM products WHERE status = 'active';
```

### 2. Test Functions

```sql
-- Test product view increment
SELECT increment_product_views('product-id');

-- Test search function
SELECT * FROM search_products('design', NULL, NULL, NULL, 'rating', 'desc', 10, 0);
```

### 3. Test Performance

```sql
-- Check index usage
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM products 
WHERE status = 'active' 
AND category_id = 1 
ORDER BY rating_average DESC 
LIMIT 20;
```

## 🚨 Troubleshooting

### Common Issues

1. **Migration fails**
   - Check Supabase CLI is installed and logged in
   - Verify environment variables are set
   - Check database connection

2. **RLS policies blocking queries**
   - Verify user authentication
   - Check policy conditions
   - Use service role for admin operations

3. **Performance issues**
   - Check if indexes are being used
   - Analyze query execution plans
   - Consider additional indexes

### Debug Commands

```bash
# Check Supabase CLI version
supabase --version

# Check project status
supabase status

# View logs
supabase logs

# Check database connection
supabase db ping
```

## 📈 Monitoring

### Key Metrics to Monitor

- **Query performance** - Use `EXPLAIN ANALYZE`
- **Index usage** - Monitor unused indexes
- **RLS policy performance** - Check policy execution time
- **Function performance** - Monitor function execution time

### Recommended Monitoring

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 🎉 Next Steps

After running migrations:

1. **Set up authentication** in Supabase dashboard
2. **Configure storage** for file uploads
3. **Set up webhooks** for payment processing
4. **Configure email** for notifications
5. **Test the API** with your application

Your database is now ready for development! 🚀
