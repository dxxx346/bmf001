# Digital Marketplace - Frontend Folder Structure

This document outlines the organized folder structure for our digital marketplace frontend built with Next.js 15, TypeScript, and TailwindCSS.

## 📁 Folder Structure Overview

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Auth-related pages (grouped route)
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes
│   ├── products/          # Product-related pages
│   ├── shops/             # Shop-related pages
│   ├── cart/              # Shopping cart page
│   ├── favorites/         # Favorites page
│   ├── profile/           # User profile pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── ui/                # Base UI components (buttons, inputs, etc.)
│   ├── forms/             # Form components
│   ├── layout/            # Layout-specific components
│   ├── product/           # Product-related components
│   ├── shop/              # Shop-related components
│   ├── cart/              # Cart-related components
│   └── common/            # Common/shared components
├── lib/                   # Utilities and configuration
│   ├── utils.ts           # General utility functions
│   ├── store.ts           # Zustand state management
│   ├── react-query.ts     # React Query configuration
│   ├── supabase.ts        # Supabase client configuration
│   ├── validations.ts     # Zod validation schemas
│   └── constants.ts       # App constants
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts         # Authentication hook
│   ├── useProducts.ts     # Product-related hooks
│   ├── useShops.ts        # Shop-related hooks
│   ├── useCart.ts         # Cart-related hooks
│   └── useLocalStorage.ts # Local storage hook
├── types/                 # TypeScript type definitions
│   ├── auth.ts            # Authentication types
│   ├── product.ts         # Product-related types
│   ├── shop.ts            # Shop-related types
│   ├── user.ts            # User-related types
│   └── api.ts             # API response types
├── contexts/              # React Context providers
│   ├── AuthContext.tsx    # Authentication context
│   ├── ThemeContext.tsx   # Theme context
│   └── CartContext.tsx    # Cart context (if not using Zustand)
└── styles/                # Additional CSS styles
    ├── globals.css        # Global styles
    ├── components.css     # Component-specific styles
    └── animations.css     # Animation styles
```

## 🔧 Essential Packages Installed

### State Management & Data Fetching
- **zustand**: Lightweight state management
- **@tanstack/react-query**: Server state management and data fetching
- **@tanstack/react-query-devtools**: Development tools for React Query

### Forms & Validation
- **react-hook-form**: Performant forms with minimal re-renders
- **zod**: TypeScript-first schema validation
- **@hookform/resolvers**: Validation resolvers for react-hook-form

### UI Components & Styling
- **@radix-ui/react-***: Accessible, unstyled UI primitives
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-select`
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-toast`
  - `@radix-ui/react-tooltip`
  - `@radix-ui/react-popover`
  - `@radix-ui/react-accordion`
  - `@radix-ui/react-avatar`
  - `@radix-ui/react-checkbox`
  - `@radix-ui/react-progress`
  - `@radix-ui/react-slider`
  - `@radix-ui/react-switch`
- **lucide-react**: Beautiful & consistent icon library
- **framer-motion**: Production-ready motion library
- **react-hot-toast**: Smoking hot notifications
- **class-variance-authority**: Component variant handling
- **clsx**: Conditional className utility
- **tailwind-merge**: Merge Tailwind CSS classes

### Backend Integration
- **@supabase/supabase-js**: Supabase client library
- **@supabase/auth-helpers-nextjs**: Supabase auth helpers for Next.js

## 🚀 Key Features of This Structure

### 1. **Organized Component Architecture**
- **ui/**: Base, reusable UI components following design system principles
- **forms/**: Specialized form components with validation
- **layout/**: Header, footer, navigation components
- **feature-specific/**: Components grouped by domain (product, shop, cart)

### 2. **Centralized State Management**
- **Zustand stores** for client-side state (cart, favorites, UI state)
- **React Query** for server state and caching
- **Context providers** for theme and authentication

### 3. **Type Safety**
- Comprehensive TypeScript definitions
- Zod schemas for runtime validation
- Type-safe API responses and database models

### 4. **Performance Optimized**
- React Query for intelligent caching and background updates
- Zustand for minimal re-renders
- Framer Motion for smooth animations
- Optimized bundle splitting with Next.js

### 5. **Developer Experience**
- React Query DevTools for debugging
- Hot reloading with Turbopack
- Consistent code organization
- Easy-to-find utilities and helpers

## 📋 Usage Examples

### State Management with Zustand
```tsx
import { useCartStore } from '@/lib/store'

function CartButton() {
  const { items, addItem, getTotalItems } = useCartStore()
  
  return (
    <button className="relative">
      Cart ({getTotalItems()})
    </button>
  )
}
```

### Data Fetching with React Query
```tsx
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'

function ProductList() {
  const { data: products, isLoading } = useQuery({
    queryKey: queryKeys.products(),
    queryFn: fetchProducts,
  })
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Form Validation with Zod + React Hook Form
```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.number().min(0, 'Price must be positive'),
})

function ProductForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

### UI Components with Radix UI
```tsx
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function ProductModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>View Product</Button>
      </DialogTrigger>
      <DialogContent>
        {/* Modal content */}
      </DialogContent>
    </Dialog>
  )
}
```

## 🎯 Next Steps

1. **Create page components** in the `src/app/` directory
2. **Build UI component library** in `src/components/ui/`
3. **Set up authentication** with Supabase
4. **Implement product catalog** with search and filtering
5. **Add shopping cart** functionality
6. **Create seller dashboard** for product management
7. **Implement payment processing** with Stripe

This structure provides a solid foundation for building a scalable, maintainable digital marketplace with excellent developer experience and performance.
