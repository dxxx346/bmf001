# 🌱 Database Seeding Guide

This guide explains how to use the database seeding scripts to populate your digital marketplace with realistic test data.

## 📋 Overview

The seeding system uses [Faker.js](https://fakerjs.dev/) to generate realistic test data for all major entities in your marketplace:

- **Users** (buyers, sellers, partners, admins)
- **Shops** with realistic business information
- **Products** with detailed metadata and file information
- **Categories** for product organization
- **Purchases** and transaction history
- **Reviews** and ratings
- **Referrals** and affiliate links
- **Notifications** for user engagement

## 🚀 Quick Start

### Basic Seeding

```bash
# Seed with default configuration
npm run db:seed

# Seed with development configuration (smaller dataset)
npm run db:seed:dev

# Seed with test configuration (minimal dataset)
npm run db:seed:test

# Seed with production configuration (full dataset)
npm run db:seed:prod
```

### Advanced Options

```bash
# Clear existing data before seeding
npm run db:seed:clear

# Seed specific tables only
npm run db:seed -- --tables users,shops,products

# Use specific configuration
npm run db:seed -- --config dev

# Combine options
npm run db:seed -- --clear --config test --tables users,products
```

## 📊 Configuration

The seeding system supports three predefined configurations:

### Development Config (Default)
- **Users**: 10 buyers, 5 sellers, 3 partners, 1 admin
- **Shops**: 8 shops
- **Products**: 20 products
- **Purchases**: 30 purchases
- **Reviews**: 25 reviews
- **Referrals**: 10 referrals

### Test Config
- **Users**: 5 buyers, 2 sellers, 1 partner, 1 admin
- **Shops**: 3 shops
- **Products**: 10 products
- **Purchases**: 15 purchases
- **Reviews**: 10 reviews
- **Referrals**: 5 referrals

### Production Config
- **Users**: 50 buyers, 20 sellers, 10 partners, 2 admins
- **Shops**: 25 shops
- **Products**: 100 products
- **Purchases**: 200 purchases
- **Reviews**: 150 reviews
- **Referrals**: 30 referrals

## 🎯 Generated Data

### Users
- **Admins**: `admin1@marketplace.com`, `admin2@marketplace.com`
- **Sellers**: Random email addresses with seller role
- **Partners**: Random email addresses with partner role
- **Buyers**: Random email addresses with buyer role
- All users include realistic names, email verification status, and login timestamps

### Shops
- Company names using Faker's company generator
- Realistic descriptions and contact information
- Logo and banner URLs (placeholder images)
- Configurable settings (theme, currency, language)
- Active/inactive status

### Products
- Product names and descriptions
- Realistic pricing ($5-$500)
- File metadata (size, type, download counts)
- Thumbnail and gallery images
- Tags and categories
- Rating and review counts
- Version and compatibility information

### Categories
Predefined categories covering common digital product types:
- Digital Art
- Templates
- Software
- E-books
- Music & Audio
- Video Content
- Photography
- 3D Models
- Fonts & Typography
- Icons & Graphics
- Code & Scripts
- Gaming Assets
- Marketing Materials
- Educational Content
- Other

### Purchases
- Realistic transaction amounts
- Download tracking
- Expiration dates
- Active/inactive status

### Reviews
- Star ratings (1-5)
- Review titles and content
- Verification status
- Helpful vote counts
- Approval status

### Referrals
- Unique referral codes
- Reward configurations (percentage or fixed)
- Expiration dates
- Click and conversion tracking

### Notifications
- Various notification types (welcome, sale, review, referral, system, promotion)
- Read/unread status
- Realistic timestamps

## 🔧 Customization

### Modifying Configuration

Edit `src/scripts/seed-config.ts` to adjust the number of records generated:

```typescript
export const customConfig: SeedConfig = {
  users: {
    buyers: 100,
    sellers: 50,
    partners: 20,
    admins: 3,
  },
  shops: 50,
  products: 200,
  purchases: 500,
  reviews: 300,
  referrals: 60,
};
```

### Adding New Data Types

1. Add the new table to the `clearData()` method
2. Create a new `seed[TableName]()` method
3. Add the method to the `seedMethods` object in `seedSpecificTables()`
4. Include the table in the `orderedTables` array

### Custom Faker Locales

Change the locale in `src/scripts/seed.ts`:

```typescript
// Set faker locale for consistent results
faker.setLocale('en_US'); // Change to 'de', 'fr', 'es', etc.
```

## 🚨 Important Notes

### Data Dependencies
The seeding process follows a specific order to respect foreign key constraints:
1. Categories
2. Users
3. Shops
4. Products
5. Purchases
6. Reviews
7. Referrals
8. Notifications

### Environment Variables
Make sure your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Performance
- **Development**: ~30 seconds for full dataset
- **Test**: ~10 seconds for minimal dataset
- **Production**: ~2-3 minutes for full dataset

### Data Consistency
- All generated data uses consistent timestamps
- User roles are properly assigned
- Foreign key relationships are maintained
- File URLs point to placeholder services

## 🐛 Troubleshooting

### Common Issues

1. **"Missing environment variables"**
   - Ensure `.env.local` is properly configured
   - Check that Supabase service role key has admin permissions

2. **"Foreign key constraint violations"**
   - Run `npm run db:seed:clear` to clear existing data
   - Ensure migrations are up to date with `npm run db:migrate`

3. **"Permission denied"**
   - Verify the service role key has the correct permissions
   - Check that RLS policies allow the service role to insert data

4. **"Out of memory"**
   - Use a smaller configuration (dev or test)
   - Seed specific tables instead of all at once

### Debug Mode

Enable debug logging by setting the log level in your environment:

```bash
DEBUG=* npm run db:seed
```

## 📈 Monitoring

The seeding process logs detailed information about:
- Number of records created per table
- Processing time for each step
- Any errors or warnings
- Cache invalidation activities

Check your application logs for detailed seeding information.

## 🔄 Reset and Reseed

To completely reset your database and reseed:

```bash
# Reset database (WARNING: This deletes all data)
npm run db:reset

# Run migrations
npm run db:migrate

# Seed with fresh data
npm run db:seed
```

## 📝 Examples

### Seed Only User Data
```bash
npm run db:seed -- --tables users
```

### Clear and Seed with Test Data
```bash
npm run db:seed -- --clear --config test
```

### Seed Specific Tables in Order
```bash
npm run db:seed -- --tables categories,users,shops,products
```

This seeding system provides a robust foundation for testing and development, ensuring your digital marketplace has realistic data to work with.
