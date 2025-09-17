# Supabase Configuration Setup

This guide will help you set up Supabase configuration for your Next.js marketplace application.

## 🔧 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: Start background workers
START_WORKERS=false
```

## 📊 Database Schema

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('buyer','seller','partner','admin')) DEFAULT 'buyer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shops table
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT CHECK (provider IN ('stripe','yookassa','crypto')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('pending','succeeded','failed')) DEFAULT 'pending',
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases table
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  reward_percent NUMERIC(5,2) DEFAULT 10.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, product_id)
);

-- Referral stats table
CREATE TABLE referral_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  click_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  total_earned NUMERIC(10,2) DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_product_id ON favorites(product_id);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_product_id ON referrals(product_id);
CREATE INDEX idx_referral_stats_referral_id ON referral_stats(referral_id);

-- Create functions for analytics
CREATE OR REPLACE FUNCTION increment_product_views(product_id UUID)
RETURNS VOID AS $$
BEGIN
  -- This function can be implemented to track product views
  -- For now, it's a placeholder
  NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_referral_clicks(referral_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE referral_stats 
  SET click_count = click_count + 1, updated_at = NOW()
  WHERE referral_stats.referral_id = increment_referral_clicks.referral_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_purchase_analytics(
  product_id UUID,
  user_id UUID,
  metadata JSONB
)
RETURNS VOID AS $$
BEGIN
  -- This function can be implemented to update purchase analytics
  -- For now, it's a placeholder
  NULL;
END;
$$ LANGUAGE plpgsql;
```

## 🔐 Row Level Security (RLS)

Enable RLS and create policies for data security:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Shops policies
CREATE POLICY "Anyone can view shops" ON shops
  FOR SELECT USING (true);

CREATE POLICY "Users can create shops" ON shops
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Shop owners can update their shops" ON shops
  FOR UPDATE USING (auth.uid() = owner_id);

-- Products policies
CREATE POLICY "Anyone can view products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create products" ON products
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Product owners can update their products" ON products
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Product owners can delete their products" ON products
  FOR DELETE USING (auth.uid() = seller_id);

-- Purchases policies
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Users can create purchases" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- Referrals policies
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- Referral stats policies
CREATE POLICY "Users can view own referral stats" ON referral_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM referrals 
      WHERE referrals.id = referral_stats.referral_id 
      AND referrals.referrer_id = auth.uid()
    )
  );
```

## 🚀 TypeScript Types Generation

Generate TypeScript types from your Supabase schema:

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Generate types
npm run generate-types
```

Or use the provided script:

```bash
npm run db:types
```

## 📁 Client Structure

The project now uses a structured approach for Supabase clients:

- **Browser Client** (`src/lib/supabase/client.ts`): For client-side operations
- **Server Client** (`src/lib/supabase/server.ts`): For server-side operations with user context
- **Service Client** (`src/lib/supabase/server.ts`): For admin operations with service role
- **Middleware Client** (`src/lib/supabase/middleware.ts`): For middleware operations

## 🔄 Usage Examples

### Browser Client (Client Components)
```typescript
import { createBrowserClient } from '@/lib/supabase';

const supabase = createBrowserClient();
const { data, error } = await supabase.from('products').select('*');
```

### Server Client (Server Components & API Routes)
```typescript
import { createServerClient } from '@/lib/supabase';

const supabase = createServerClient();
const { data, error } = await supabase.from('products').select('*');
```

### Service Client (Admin Operations)
```typescript
import { createServiceClient } from '@/lib/supabase';

const supabase = createServiceClient();
// This client has full access to all data
```

### Middleware Client (Middleware)
```typescript
import { createMiddlewareClient } from '@/lib/supabase';

const { supabase, response } = createMiddlewareClient(request);
const { data: { session } } = await supabase.auth.getSession();
```

## ✅ Verification

After setup, verify everything works:

1. **Type Check**: `npm run type-check`
2. **Lint**: `npm run lint`
3. **Format**: `npm run format`
4. **Build**: `npm run build`

## 🆘 Troubleshooting

### Common Issues

1. **Environment Variables Not Found**
   - Ensure `.env.local` exists in the root directory
   - Restart your development server after adding variables

2. **Type Generation Fails**
   - Check your Supabase project URL and keys
   - Ensure you're logged in to Supabase CLI
   - Verify your project ID is correct

3. **RLS Policies Blocking Requests**
   - Check your RLS policies in Supabase dashboard
   - Ensure user authentication is working
   - Verify user roles are set correctly

4. **Client Import Errors**
   - Make sure you're using the correct client for your context
   - Check that all imports are from `@/lib/supabase`

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the [Next.js Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- Check the project's `SETUP.md` for general setup instructions
