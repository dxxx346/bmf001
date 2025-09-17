# BMF001 Digital Marketplace Setup Guide

This is a Next.js 14 project with TypeScript, App Router, and TailwindCSS for a digital goods marketplace.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
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

### 3. Database Setup
Run the SQL schema in your Supabase project:

```sql
-- Users
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text,
  avatar_url text,
  role text check (role in ('buyer','seller','partner','admin')) default 'buyer',
  created_at timestamp with time zone default now()
);

-- Shops (assigned to seller)
create table shops (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamp with time zone default now()
);

-- Categories
create table categories (
  id serial primary key,
  name text not null unique
);

-- Products
create table products (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid references users(id) on delete set null,
  shop_id uuid references shops(id) on delete cascade,
  category_id int references categories(id) on delete set null,
  title text not null,
  description text,
  price numeric(10,2) not null,
  file_url text not null,
  thumbnail_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Purchases
create table purchases (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid references users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  payment_id uuid references payments(id),
  created_at timestamp with time zone default now()
);

-- Favorite products
create table favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, product_id)
);

-- Payments
create table payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  provider text check (provider in ('stripe','yookassa','crypto')),
  amount numeric(10,2) not null,
  currency text default 'USD',
  status text check (status in ('pending','succeeded','failed')) default 'pending',
  external_id text,
  created_at timestamp with time zone default now()
);

-- Referal links
create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid references users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  referral_code text not null,
  reward_percent numeric(5,2) default 10.0,
  created_at timestamp with time zone default now(),
  unique(referrer_id, product_id)
);

-- Referral transitions/purchases
create table referral_stats (
  id uuid primary key default uuid_generate_v4(),
  referral_id uuid references referrals(id) on delete cascade,
  click_count int default 0,
  purchase_count int default 0,
  total_earned numeric(10,2) default 0.00,
  updated_at timestamp with time zone default now()
);
```

### 4. Start Development Server
```bash
npm run dev
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── products/      # Product management
│   │   ├── categories/    # Category management
│   │   └── webhooks/      # Webhook handlers
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/                   # Utilities and configurations
│   ├── supabase.ts        # Supabase client
│   ├── redis.ts           # Redis client and cache utilities
│   ├── stripe.ts          # Stripe configuration
│   └── logger.ts          # Logging utilities
├── services/              # Business logic layer
│   ├── productService.ts  # Product operations
│   └── paymentService.ts  # Payment processing
├── types/                 # TypeScript type definitions
│   └── index.ts           # All type definitions
├── middleware/            # Custom middleware
│   └── auth.ts            # Authentication middleware
└── jobs/                  # Background job processing
    ├── queue.ts           # Job queue definitions
    └── workers.ts         # Job workers
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## 🔧 Code Quality Tools

- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files

## 🚀 Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript for type safety
- ✅ TailwindCSS for styling
- ✅ Supabase for database and auth
- ✅ Stripe for payments
- ✅ Redis for caching and job queues
- ✅ Background job processing
- ✅ Rate limiting and middleware
- ✅ Comprehensive logging
- ✅ Code quality tools

## 📝 Next Steps

1. Set up your Supabase project and configure the database
2. Set up Stripe account and configure webhooks
3. Set up Redis instance for caching and job queues
4. Configure environment variables
5. Start building your marketplace features!

## 🤝 Contributing

1. Make sure to run `npm run lint` and `npm run format` before committing
2. All commits are automatically checked with pre-commit hooks
3. Follow the established code structure and patterns
