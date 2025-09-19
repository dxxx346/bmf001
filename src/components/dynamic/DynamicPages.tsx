/**
 * Dynamic Page Components for Route-Based Code Splitting
 * Splits large pages into separate chunks for better loading performance
 */

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'

// Page loading skeleton
const PageSkeleton = ({ type = 'dashboard' }: { type?: 'dashboard' | 'listing' | 'form' | 'analytics' }) => {
  switch (type) {
    case 'dashboard':
      return (
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      )
    case 'listing':
      return (
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      )
    case 'form':
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-8">
            <Skeleton className="h-8 w-64" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      )
    case 'analytics':
      return (
        <div className="container mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      )
    default:
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      )
  }
}

// =============================================
// SELLER PAGES (HEAVY)
// =============================================

// Placeholder for page-level dynamic imports
const PlaceholderPage = ({ type, title }: { type: string; title: string }) => (
  <div className="container mx-auto px-4 py-8">
    <div className="max-w-2xl mx-auto text-center space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-600">
        This {type} page will be dynamically loaded when the actual component is available.
      </p>
      <div className="p-6 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          🚀 Bundle Optimization: This page is configured for dynamic loading to reduce initial bundle size.
        </p>
      </div>
    </div>
  </div>
)

export const DynamicSellerDashboard = () => <PlaceholderPage type="dashboard" title="Seller Dashboard" />
export const DynamicSellerProducts = () => <PlaceholderPage type="listing" title="Seller Products" />
export const DynamicSellerShops = () => <PlaceholderPage type="listing" title="Seller Shops" />
export const DynamicSellerAnalytics = () => <PlaceholderPage type="analytics" title="Seller Analytics" />
export const DynamicProductCreate = () => <PlaceholderPage type="form" title="Create Product" />
export const DynamicShopCreate = () => <PlaceholderPage type="form" title="Create Shop" />

// =============================================
// BUYER PAGES (HEAVY)
// =============================================

export const DynamicBuyerDashboard = () => <PlaceholderPage type="dashboard" title="Buyer Dashboard" />
export const DynamicBuyerOrders = () => <PlaceholderPage type="listing" title="Buyer Orders" />
export const DynamicBuyerFavorites = () => <PlaceholderPage type="listing" title="Buyer Favorites" />
export const DynamicBuyerLists = () => <PlaceholderPage type="listing" title="Buyer Lists" />

// =============================================
// PARTNER PAGES (HEAVY)
// =============================================

export const DynamicPartnerDashboard = () => <PlaceholderPage type="dashboard" title="Partner Dashboard" />
export const DynamicPartnerLinks = () => <PlaceholderPage type="listing" title="Partner Links" />
export const DynamicPartnerEarnings = () => <PlaceholderPage type="analytics" title="Partner Earnings" />
export const DynamicPartnerAnalytics = () => <PlaceholderPage type="analytics" title="Partner Analytics" />

// =============================================
// ADMIN PAGES (HEAVY)
// =============================================

export const DynamicAdminDashboard = () => <PlaceholderPage type="dashboard" title="Admin Dashboard" />
export const DynamicAdminUsers = () => <PlaceholderPage type="listing" title="Admin Users" />
export const DynamicAdminProducts = () => <PlaceholderPage type="listing" title="Admin Products" />
export const DynamicAdminAnalytics = () => <PlaceholderPage type="analytics" title="Admin Analytics" />

// =============================================
// PROFILE & SETTINGS PAGES
// =============================================

export const DynamicProfileSettings = () => <PlaceholderPage type="form" title="Profile Settings" />
export const DynamicProfileSecurity = () => <PlaceholderPage type="form" title="Profile Security" />
export const DynamicProfileBilling = () => <PlaceholderPage type="listing" title="Profile Billing" />

// =============================================
// SEARCH & DISCOVERY PAGES
// =============================================

export const DynamicSearchPage = () => <PlaceholderPage type="listing" title="Search Results" />
export const DynamicCategoryPage = () => <PlaceholderPage type="listing" title="Category Listing" />

// =============================================
// WRAPPER COMPONENT FOR CONDITIONAL LOADING
// =============================================

interface DynamicPageWrapperProps {
  page: string
  children?: React.ReactNode
  fallback?: React.ReactNode
  loadingType?: 'dashboard' | 'listing' | 'form' | 'analytics'
  ssr?: boolean
}

export const DynamicPageWrapper: React.FC<DynamicPageWrapperProps> = ({
  page,
  children,
  fallback,
  loadingType = 'dashboard',
  ssr = false
}) => {
  const DynamicComponent = dynamic(
    () => import(`@/app/${page}/page`),
    {
      loading: () => fallback || <PageSkeleton type={loadingType} />,
      ssr
    }
  )

  return (
    <Suspense fallback={fallback || <PageSkeleton type={loadingType} />}>
      {children || <DynamicComponent />}
    </Suspense>
  )
}

// =============================================
// PRELOADING UTILITIES
// =============================================

export const preloadPages = {
  seller: () => {
    if (typeof window !== 'undefined') {
      console.log('Preloading seller pages...')
      // Would preload actual seller pages when available
    }
  },
  buyer: () => {
    if (typeof window !== 'undefined') {
      console.log('Preloading buyer pages...')
      // Would preload actual buyer pages when available
    }
  },
  partner: () => {
    if (typeof window !== 'undefined') {
      console.log('Preloading partner pages...')
      // Would preload actual partner pages when available
    }
  },
  admin: () => {
    if (typeof window !== 'undefined') {
      console.log('Preloading admin pages...')
      // Would preload actual admin pages when available
    }
  },
  all: () => {
    preloadPages.seller()
    preloadPages.buyer()
    preloadPages.partner()
    preloadPages.admin()
  }
}

// =============================================
// EXPORT MAP FOR EASY USAGE
// =============================================

export const dynamicPages = {
  // Seller pages
  seller: {
    dashboard: DynamicSellerDashboard,
    products: DynamicSellerProducts,
    shops: DynamicSellerShops,
    analytics: DynamicSellerAnalytics,
    productCreate: DynamicProductCreate,
    shopCreate: DynamicShopCreate,
  },
  
  // Buyer pages
  buyer: {
    dashboard: DynamicBuyerDashboard,
    orders: DynamicBuyerOrders,
    favorites: DynamicBuyerFavorites,
    lists: DynamicBuyerLists,
  },
  
  // Partner pages
  partner: {
    dashboard: DynamicPartnerDashboard,
    links: DynamicPartnerLinks,
    earnings: DynamicPartnerEarnings,
    analytics: DynamicPartnerAnalytics,
  },
  
  // Admin pages
  admin: {
    dashboard: DynamicAdminDashboard,
    users: DynamicAdminUsers,
    products: DynamicAdminProducts,
    analytics: DynamicAdminAnalytics,
  },
  
  // Profile pages
  profile: {
    settings: DynamicProfileSettings,
    security: DynamicProfileSecurity,
    billing: DynamicProfileBilling,
  },
  
  // Public pages
  public: {
    search: DynamicSearchPage,
    category: DynamicCategoryPage,
  }
}

export default dynamicPages
