'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false
              }
              // Retry up to 3 times for other errors
              return failureCount < 3
            },
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // Don't retry mutations on client errors
              if (error?.status >= 400 && error?.status < 500) {
                return false
              }
              return failureCount < 2
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

// Query keys factory
export const queryKeys = {
  all: ['queries'] as const,
  
  // Products
  products: () => [...queryKeys.all, 'products'] as const,
  product: (id: string) => [...queryKeys.products(), id] as const,
  productsByCategory: (categoryId: number) => [...queryKeys.products(), 'category', categoryId] as const,
  productsByShop: (shopId: string) => [...queryKeys.products(), 'shop', shopId] as const,
  searchProducts: (query: string) => [...queryKeys.products(), 'search', query] as const,
  
  // Shops
  shops: () => [...queryKeys.all, 'shops'] as const,
  shop: (id: string) => [...queryKeys.shops(), id] as const,
  shopsByUser: (userId: string) => [...queryKeys.shops(), 'user', userId] as const,
  
  // Categories
  categories: () => [...queryKeys.all, 'categories'] as const,
  
  // User data
  users: () => [...queryKeys.all, 'users'] as const,
  user: (id: string) => [...queryKeys.users(), id] as const,
  userProfile: () => [...queryKeys.users(), 'profile'] as const,
  userPurchases: () => [...queryKeys.users(), 'purchases'] as const,
  userFavorites: () => [...queryKeys.users(), 'favorites'] as const,
  
  // Referrals
  referrals: () => [...queryKeys.all, 'referrals'] as const,
  referralStats: (userId: string) => [...queryKeys.referrals(), 'stats', userId] as const,
  
  // Analytics
  analytics: () => [...queryKeys.all, 'analytics'] as const,
  salesStats: (shopId: string) => [...queryKeys.analytics(), 'sales', shopId] as const,
  
  // Reviews
  reviews: () => [...queryKeys.all, 'reviews'] as const,
  productReviews: (productId: string) => [...queryKeys.reviews(), 'product', productId] as const,
} as const
