/**
 * Dynamic Import Wrappers for Heavy Components
 * Reduces initial bundle size by lazy loading large components
 */

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'

// Loading component for dynamic imports
const DynamicLoading = ({ text = 'Loading...' }: { text?: string }) => (
  <div className="flex items-center justify-center p-8">
    <LoadingSpinner />
    <span className="ml-2 text-sm text-gray-600">{text}</span>
  </div>
)

// Skeleton loading for different component types
const ComponentSkeleton = ({ type = 'default' }: { type?: 'chart' | 'table' | 'form' | 'default' }) => {
  switch (type) {
    case 'chart':
      return (
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <div className="flex space-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      )
    case 'table':
      return (
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </div>
        </div>
      )
    case 'form':
      return (
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      )
    default:
      return (
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )
  }
}

// =============================================
// PARTNER COMPONENTS (HEAVY - 815+ lines each)
// =============================================

// Placeholder for future heavy components
const PlaceholderComponent = ({ type }: { type: string }) => (
  <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
    <p className="text-gray-600">
      {type} component will be dynamically loaded here
    </p>
    <p className="text-sm text-gray-500 mt-2">
      Replace with actual component import when available
    </p>
  </div>
)

export const LazyCommissionTable = () => <PlaceholderComponent type="Commission Table" />
export const LazyLinkGenerator = () => <PlaceholderComponent type="Link Generator" />
export const LazyPayoutRequest = () => <PlaceholderComponent type="Payout Request" />
export const LazyEarningsChart = () => <PlaceholderComponent type="Earnings Chart" />
export const LazyReferralStats = () => <PlaceholderComponent type="Referral Stats" />

// =============================================
// SELLER COMPONENTS (HEAVY - 700+ lines each)
// =============================================

export const LazyProductForm = () => <PlaceholderComponent type="Product Form" />
export const LazyShopForm = () => <PlaceholderComponent type="Shop Form" />
export const LazyFileUpload = () => <PlaceholderComponent type="File Upload" />

// =============================================
// ANALYTICS COMPONENTS (HEAVY - 600+ lines each)
// =============================================

export const LazyProductPerformance = () => <PlaceholderComponent type="Product Performance" />
export const LazyRevenueChart = () => <PlaceholderComponent type="Revenue Chart" />
export const LazySalesFunnel = () => <PlaceholderComponent type="Sales Funnel" />

// =============================================
// BUYER COMPONENTS (HEAVY - 600+ lines each)
// =============================================

export const LazyDownloadButton = () => <PlaceholderComponent type="Download Button" />
export const LazyOrderCard = () => <PlaceholderComponent type="Order Card" />
export const LazyListManager = () => <PlaceholderComponent type="List Manager" />

// =============================================
// ADMIN COMPONENTS (HEAVY - 570+ lines each)
// =============================================

export const LazyModerationQueue = () => <PlaceholderComponent type="Moderation Queue" />
export const LazyPrivacyDashboard = () => <PlaceholderComponent type="Privacy Dashboard" />

// =============================================
// FORM COMPONENTS (HEAVY - 570+ lines each)
// =============================================

export const LazyMobileOptimizedForm = () => <PlaceholderComponent type="Mobile Optimized Form" />

// =============================================
// EXAMPLE/SHOWCASE COMPONENTS (HEAVY - 595 lines)
// =============================================

export const LazyComponentShowcase = () => <PlaceholderComponent type="Component Showcase" />

// =============================================
// UTILITY COMPONENTS FOR LAZY LOADING
// =============================================

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  minHeight?: string
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback,
  minHeight = '200px'
}) => (
  <Suspense 
    fallback={
      fallback || (
        <div 
          className="flex items-center justify-center"
          style={{ minHeight }}
        >
          <LoadingSpinner />
        </div>
      )
    }
  >
    {children}
  </Suspense>
)

// =============================================
// CONDITIONAL LOADING UTILITIES
// =============================================

interface ConditionalLazyProps {
  condition: boolean
  component: React.ComponentType<any>
  fallback?: React.ComponentType<any>
  props?: any
}

export const ConditionalLazy: React.FC<ConditionalLazyProps> = ({
  condition,
  component: Component,
  fallback: Fallback,
  props = {}
}) => {
  if (!condition && Fallback) {
    return <Fallback {...props} />
  }
  
  if (!condition) {
    return null
  }

  return (
    <Suspense fallback={<DynamicLoading />}>
      <Component {...props} />
    </Suspense>
  )
}

// =============================================
// VIEWPORT-BASED LAZY LOADING
// =============================================

interface ViewportLazyProps {
  children: React.ReactNode
  rootMargin?: string
  threshold?: number
  fallback?: React.ReactNode
}

export const ViewportLazy: React.FC<ViewportLazyProps> = ({
  children,
  rootMargin = '100px',
  threshold = 0.1,
  fallback
}) => {
  // This would use Intersection Observer in a real implementation
  // For now, just wrap with Suspense
  return (
    <Suspense fallback={fallback || <ComponentSkeleton />}>
      {children}
    </Suspense>
  )
}

// =============================================
// PRELOAD UTILITIES
// =============================================

export const preloadComponent = (importFunction: () => Promise<any>) => {
  // Preload component for faster subsequent loading
  if (typeof window !== 'undefined') {
    importFunction().catch(() => {
      // Silently fail preloading
    })
  }
}

// Preload heavy components on interaction
export const preloadHeavyComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload on user interaction
    const preloadOnInteraction = () => {
      preloadComponent(() => import('@/components/partner/CommissionTable'))
      preloadComponent(() => import('@/components/analytics/ProductPerformance'))
      preloadComponent(() => import('@/components/seller/ProductForm'))
    }

    // Preload on first user interaction
    ['mousedown', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, preloadOnInteraction, { 
        once: true,
        passive: true 
      })
    })

    // Preload on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadOnInteraction, { timeout: 5000 })
    } else {
      setTimeout(preloadOnInteraction, 2000)
    }
  }
}

const LazyComponents = {
  // Partner components
  LazyCommissionTable,
  LazyLinkGenerator,
  LazyPayoutRequest,
  LazyEarningsChart,
  LazyReferralStats,
  
  // Seller components
  LazyProductForm,
  LazyShopForm,
  LazyFileUpload,
  
  // Analytics components
  LazyProductPerformance,
  LazyRevenueChart,
  LazySalesFunnel,
  
  // Buyer components
  LazyDownloadButton,
  LazyOrderCard,
  LazyListManager,
  
  // Admin components
  LazyModerationQueue,
  LazyPrivacyDashboard,
  
  // Form components
  LazyMobileOptimizedForm,
  
  // Example components
  LazyComponentShowcase,
  
  // Utilities
  LazyWrapper,
  ConditionalLazy,
  ViewportLazy,
  preloadComponent,
  preloadHeavyComponents
};

export default LazyComponents;
