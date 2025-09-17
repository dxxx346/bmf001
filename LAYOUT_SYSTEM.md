# Layout System Documentation

## 🏗️ Layout Architecture

The layout system provides a comprehensive, responsive, and role-based navigation structure for the digital marketplace. All layouts are built with TypeScript, Tailwind CSS, and follow accessibility best practices.

## 📁 Layout Components

### 1. **Header** (`src/components/layout/Header.tsx`)

The main application header with comprehensive navigation and user management.

#### Features:
- ✅ **Logo and branding** with responsive design
- ✅ **Main navigation** (Products, Categories, Shops, About)
- ✅ **Search bar** with form submission
- ✅ **Shopping cart** with item counter badge
- ✅ **User authentication** (login/register or profile dropdown)
- ✅ **Role switcher** (buyer/seller/partner modes)
- ✅ **Mobile responsive** with collapsible menu

#### Usage:
```tsx
import { Header } from '@/components/layout/Header'

<Header className="custom-header-styles" />
```

### 2. **Footer** (`src/components/layout/Footer.tsx`)

Comprehensive footer with links, contact info, and newsletter signup.

#### Features:
- ✅ **Company information** and social links
- ✅ **Quick navigation** links
- ✅ **Support and legal** links
- ✅ **Newsletter signup** with form validation
- ✅ **Contact information** (email, phone, address)
- ✅ **Trust badges** (SSL, GDPR, 24/7 support)
- ✅ **Responsive grid** layout

#### Usage:
```tsx
import { Footer } from '@/components/layout/Footer'

<Footer className="custom-footer-styles" />
```

### 3. **Sidebar** (`src/components/layout/Sidebar.tsx`)

Dynamic sidebar for dashboard pages with role-based navigation.

#### Features:
- ✅ **Role-based navigation** (different menus for buyer/seller/partner/admin)
- ✅ **Collapsible design** with toggle button
- ✅ **User profile** section
- ✅ **Active state** highlighting
- ✅ **Badge support** for notifications/counts
- ✅ **Nested navigation** with expandable sections
- ✅ **Access control** based on user roles

#### Navigation Structure:
- **Buyer**: Dashboard, Purchases, Favorites, Downloads, Orders
- **Seller**: Seller Dashboard, Products, Sales, Analytics, Customers, Reviews
- **Partner**: Partner Dashboard, Referrals, Commissions, Marketing, Performance
- **Admin**: All of the above plus Admin Dashboard, Users, Analytics, Content

#### Usage:
```tsx
import { Sidebar } from '@/components/layout/Sidebar'

<Sidebar 
  collapsed={isCollapsed}
  onToggleCollapsed={() => setIsCollapsed(!isCollapsed)}
/>
```

### 4. **MobileNav** (`src/components/layout/MobileNav.tsx`)

Mobile-first navigation with bottom tab bar and slide-out menu.

#### Features:
- ✅ **Bottom tab bar** for main navigation (Home, Products, Search, Cart)
- ✅ **Cart counter** badge
- ✅ **Slide-out menu** with full navigation
- ✅ **User profile** section in menu
- ✅ **Role-based content** in slide-out menu
- ✅ **Authentication buttons** for non-logged users

#### Usage:
```tsx
import { MobileNav } from '@/components/layout/MobileNav'

<MobileNav className="custom-mobile-nav-styles" />
```

### 5. **MainLayout** (`src/components/layout/MainLayout.tsx`)

The main layout wrapper that orchestrates all layout components.

#### Layout Types:
- **MainLayout**: Complete layout with header, footer, sidebar (conditional)
- **DashboardLayout**: Layout for dashboard pages with page header
- **ContentLayout**: Layout for content pages with max-width container
- **AuthLayout**: Centered layout for authentication pages

#### Features:
- ✅ **Conditional rendering** based on route
- ✅ **Automatic sidebar** for dashboard routes
- ✅ **Responsive behavior**
- ✅ **Route-based layout switching**

## 🎯 Layout Behavior

### Route-Based Layout Logic

```typescript
// Sidebar shows on these routes:
const dashboardRoutes = ['/dashboard', '/seller', '/partner', '/admin']

// Header/Footer hidden on these routes:
const authRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password']

// Layout automatically adapts based on current route
```

### Responsive Breakpoints

```css
/* Mobile First Approach */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### Layout Behavior by Screen Size:
- **Mobile (< 768px)**: Bottom tab navigation + slide-out menu
- **Tablet (768px - 1024px)**: Header navigation, no sidebar
- **Desktop (> 1024px)**: Full layout with collapsible sidebar

## 🔐 Role-Based Access Control

### User Roles and Navigation Access:

#### **Buyer** (Default)
- Dashboard overview
- Purchase history
- Favorites management
- Download center
- Order tracking

#### **Seller** (+ all Buyer features)
- Seller dashboard
- Product management
- Sales analytics
- Customer management
- Review management

#### **Partner** (+ all Buyer features)
- Partner dashboard
- Referral management
- Commission tracking
- Marketing tools
- Performance analytics

#### **Admin** (All features)
- Admin dashboard
- User management
- System analytics
- Content moderation
- Platform administration

### Access Control Implementation:
```tsx
// In navigation components
const hasAccess = (roles?: string[]) => {
  if (!roles || !profile) return true
  return roles.includes(profile.role)
}

// Usage in nav items
const navItem = {
  title: "Admin Panel",
  href: "/admin",
  icon: Shield,
  roles: ["admin"] // Only admins can see this
}
```

## 🚀 Usage Examples

### 1. **Basic Page Layout**
```tsx
// For regular content pages
import { ContentLayout } from '@/components/layout'

export default function AboutPage() {
  return (
    <ContentLayout maxWidth="2xl">
      <h1>About Us</h1>
      <p>Page content...</p>
    </ContentLayout>
  )
}
```

### 2. **Dashboard Page Layout**
```tsx
// For dashboard pages with sidebar
import { DashboardLayout } from '@/components/layout'

export default function SellerDashboard() {
  return (
    <DashboardLayout
      title="Seller Dashboard"
      description="Manage your products and sales"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dashboard content */}
      </div>
    </DashboardLayout>
  )
}
```

### 3. **Authentication Page Layout**
```tsx
// For auth pages (login, register, etc.)
import { AuthLayout } from '@/components/layout'

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign In"
      description="Welcome back to Digital Marketplace"
    >
      <LoginForm />
    </AuthLayout>
  )
}
```

### 4. **Custom Layout Override**
```tsx
// For pages that need custom layout
export default function CustomPage() {
  return (
    <div className="min-h-screen bg-custom">
      {/* Custom layout without MainLayout wrapper */}
      <CustomHeader />
      <main>{/* content */}</main>
      <CustomFooter />
    </div>
  )
}
```

## 📱 Mobile Experience

### Bottom Tab Navigation
- **Home**: Main marketplace
- **Products**: Product catalog
- **Search**: Search interface
- **Cart**: Shopping cart with counter
- **Menu**: Slide-out navigation menu

### Slide-Out Menu Features:
- User profile section
- Role-based navigation
- Quick actions
- Support links
- Settings access

## 🎨 Styling and Customization

### CSS Variables for Theming:
```css
:root {
  --header-height: 4rem;
  --sidebar-width: 16rem;
  --sidebar-collapsed-width: 4rem;
  --mobile-nav-height: 4rem;
}
```

### Customization Examples:
```tsx
// Custom header styling
<Header className="bg-gray-900 text-white border-gray-800" />

// Custom sidebar width
<Sidebar className="w-72" /> // Wider sidebar

// Custom mobile nav positioning
<MobileNav className="bg-gray-100 border-gray-300" />
```

## 🔧 Configuration

### Environment Setup
The layout system integrates with:
- **Authentication Context** for user state
- **Cart Store** for shopping cart state
- **React Query** for data fetching
- **Toast System** for notifications

### Provider Setup (Already configured in layout.tsx):
```tsx
<ReactQueryProvider>
  <AuthProvider>
    <ToastProvider>
      <MainLayout>
        {children}
      </MainLayout>
    </ToastProvider>
  </AuthProvider>
</ReactQueryProvider>
```

## 🎯 Best Practices

### Do's ✅
- Use appropriate layout component for each page type
- Follow role-based access patterns
- Implement proper loading states
- Use consistent spacing and typography
- Test on multiple screen sizes

### Don'ts ❌
- Don't bypass the layout system for consistency
- Don't hardcode user roles in components
- Don't ignore mobile experience
- Don't skip accessibility features
- Don't forget to handle loading states

## 🚀 Performance Features

- **Lazy loading** for navigation items
- **Memoized components** to prevent unnecessary re-renders
- **Conditional rendering** based on routes
- **Efficient state management** with minimal re-renders
- **Optimized bundle splitting** with Next.js

This layout system provides a production-ready foundation for your digital marketplace with excellent user experience across all devices and user roles.
