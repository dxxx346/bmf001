# Supabase Authentication Setup

This document outlines the comprehensive Supabase authentication system implemented for the digital marketplace.

## 🏗️ Architecture Overview

The authentication system is built with:
- **Supabase Auth**: Core authentication service
- **Next.js 15**: App Router with middleware
- **TypeScript**: Full type safety
- **React Context**: Global auth state management
- **Custom Hooks**: Convenient auth operations

## 📁 File Structure

```
src/
├── lib/supabase/
│   ├── client.ts          # Browser client configuration
│   ├── server.ts          # Server client configuration
│   └── simple.ts          # Legacy client (existing)
├── contexts/
│   └── AuthContext.tsx    # React Context for auth state
├── hooks/
│   ├── useAuth.ts         # Legacy auth hook (existing)
│   └── useSupabaseAuth.ts # New Supabase auth hooks
├── types/
│   ├── auth.ts           # Auth-related types (existing)
│   └── database.ts       # Supabase database types
├── middleware.ts          # Route protection middleware
└── app/auth/callback/
    └── route.ts          # OAuth callback handler
```

## 🔧 Core Components

### 1. Supabase Clients

#### Browser Client (`src/lib/supabase/client.ts`)
- Singleton pattern for performance
- PKCE flow for security
- Auto-refresh tokens
- OAuth helper functions

```typescript
import { supabase, authHelpers } from '@/lib/supabase/client'

// Sign in with email/password
const { data, error } = await authHelpers.signIn(email, password)

// Sign in with OAuth
const { data, error } = await authHelpers.signInWithOAuth('google')
```

#### Server Client (`src/lib/supabase/server.ts`)
- Cached server client
- Service role client for admin operations
- Helper functions for server-side operations
- Route protection utilities

```typescript
import { serverAuthHelpers, routeProtection } from '@/lib/supabase/server'

// In server components/API routes
const { user } = await serverAuthHelpers.getUser()
const { profile } = await serverAuthHelpers.getUserProfile()

// Route protection
await routeProtection.requireAuth()
await routeProtection.requireRole(['admin'])
```

### 2. Authentication Context

The `AuthContext` provides global auth state management:

```typescript
import { useAuthContext } from '@/contexts/AuthContext'

function MyComponent() {
  const { 
    user,           // Supabase User object
    profile,        // Database user profile
    session,        // Supabase Session
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    // ... other methods
  } = useAuthContext()
}
```

### 3. Custom Hooks

Multiple convenience hooks for different use cases:

```typescript
import { 
  useAuth,           // Main hook (all auth state + actions)
  useUser,           // Current user
  useProfile,        // User profile from database
  useIsAuthenticated,
  useIsAdmin,
  useIsSeller,
  useAuthActions     // All auth actions
} from '@/hooks/useSupabaseAuth'
```

### 4. Middleware Protection

Automatic route protection with role-based access control:

```typescript
// middleware.ts automatically protects:
// - /admin/* (admin only)
// - /seller/* (seller + admin)
// - /partner/* (partner + admin)
// - /dashboard/* (authenticated users)
```

## 🔐 Authentication Flow

### 1. User Registration
```typescript
const { signUp } = useAuthContext()

const result = await signUp(email, password, {
  name: 'John Doe',
  role: 'buyer' // optional, defaults to 'buyer'
})
```

### 2. User Login
```typescript
const { signIn } = useAuthContext()

const result = await signIn(email, password)
```

### 3. OAuth Login
```typescript
const { signInWithOAuth } = useAuthContext()

const result = await signInWithOAuth('google')
// Redirects to /auth/callback after OAuth flow
```

### 4. Profile Management
```typescript
const { updateProfile } = useAuthContext()

const result = await updateProfile({
  name: 'New Name',
  avatar_url: 'https://example.com/avatar.jpg'
})
```

## 🛡️ Route Protection

### 1. Middleware-Level Protection
Automatic protection for route patterns:
- `/admin/*` - Admin only
- `/seller/*` - Sellers and admins
- `/partner/*` - Partners and admins
- `/dashboard/*` - Authenticated users

### 2. Component-Level Protection
Using Higher-Order Components:

```typescript
import { withAuth } from '@/contexts/AuthContext'

const AdminPage = withAuth(() => {
  return <div>Admin Content</div>
}, ['admin'])

export default AdminPage
```

### 3. Hook-Based Protection
Using role hooks:

```typescript
function MyComponent() {
  const isAdmin = useIsAdmin()
  const hasAccess = useHasPermission(['seller', 'admin'])
  
  if (!hasAccess) return <AccessDenied />
  
  return <ProtectedContent />
}
```

## 🎯 TypeScript Integration

### Database Types
Auto-generated types from Supabase schema:

```typescript
import { User, Product, Shop } from '@/types/database'

// Fully typed database operations
const { data } = await supabase
  .from('products')
  .select('*')
  .returns<Product[]>()
```

### Auth Types
Comprehensive auth-related types:

```typescript
import { User, Session } from '@supabase/supabase-js'
import { User as DatabaseUser } from '@/types/database'

// Supabase auth user vs database user
const authUser: User = session.user
const dbUser: DatabaseUser = profile
```

## 🚀 Setup Instructions

### 1. Environment Variables
Add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Provider Setup
Wrap your app with the AuthProvider:

```typescript
// app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext'
import { ReactQueryProvider } from '@/lib/react-query'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ReactQueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
```

### 3. OAuth Configuration
In your Supabase dashboard, configure OAuth providers:
- **Google**: Add client ID and secret
- **GitHub**: Add client ID and secret
- **Redirect URL**: `https://yourdomain.com/auth/callback`

### 4. Database Setup
Ensure your `users` table exists with the correct structure:

```sql
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar_url text,
  role text check (role in ('buyer','seller','partner','admin')) default 'buyer',
  created_at timestamp with time zone default now()
);
```

## 📊 Features

### ✅ Implemented
- [x] Email/password authentication
- [x] OAuth authentication (Google, GitHub)
- [x] Automatic session management
- [x] Role-based access control
- [x] Route protection middleware
- [x] Profile management
- [x] Password reset
- [x] Type-safe operations
- [x] Server-side authentication
- [x] Automatic profile creation
- [x] Auth state persistence
- [x] Loading states
- [x] Error handling
- [x] Toast notifications

### 🔄 Advanced Features Available
- [x] Multi-role support
- [x] Session refresh
- [x] Referral tracking
- [x] Auth callbacks
- [x] Protected API routes
- [x] Server-side profile fetching
- [x] Role-based redirects

## 🔍 Usage Examples

### Basic Authentication
```typescript
function LoginForm() {
  const { signIn, isLoading } = useAuthContext()
  
  const handleSubmit = async (email: string, password: string) => {
    const result = await signIn(email, password)
    if (result.success) {
      // User is now logged in
      router.push('/dashboard')
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  )
}
```

### Role-Based UI
```typescript
function Navigation() {
  const { profile } = useAuthContext()
  const isAdmin = useIsAdmin()
  const isSeller = useIsSeller()
  
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      {isSeller && <Link href="/seller">Seller Panel</Link>}
      {isAdmin && <Link href="/admin">Admin Panel</Link>}
    </nav>
  )
}
```

### Protected API Route
```typescript
// app/api/admin/route.ts
import { routeProtection } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Require admin role
    const { user, role } = await routeProtection.requireAdmin()
    
    // Admin-only logic here
    return NextResponse.json({ data: 'admin data' })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

This authentication system provides a robust, scalable foundation for your digital marketplace with comprehensive type safety and excellent developer experience.
