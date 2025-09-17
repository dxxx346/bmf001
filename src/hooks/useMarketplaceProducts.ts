import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/react-query'
import { useCartStore, useFavoritesStore } from '@/lib/store'
import { Product, Category, Shop } from '@/types/database'
import toast from 'react-hot-toast'
import React from 'react'

// Enhanced product type for marketplace
export interface MarketplaceProduct extends Product {
  shops?: Shop
  categories?: Category
  seller?: {
    id: string
    name: string
    avatar_url?: string
  }
  is_favorited?: boolean
  average_rating?: number
  review_count?: number
}

export interface ProductFilters {
  category_id?: number
  price_min?: number
  price_max?: number
  search?: string
  seller_id?: string
  sort_by?: 'created_at' | 'price' | 'rating' | 'popularity'
  sort_order?: 'asc' | 'desc'
  limit?: number
}

// Fetch featured products for homepage
export function useFeaturedProducts(limit = 8) {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: async (): Promise<MarketplaceProduct[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          shops (
            id,
            name,
            owner_id
          ),
          categories (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw new Error(error.message)
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch recommended products
export function useRecommendedProducts(userId?: string, limit = 6) {
  return useQuery({
    queryKey: ['products', 'recommended', userId, limit],
    queryFn: async (): Promise<MarketplaceProduct[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          shops (
            id,
            name,
            owner_id
          ),
          categories (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw new Error(error.message)
      return data || []
    },
    staleTime: 15 * 60 * 1000,
  })
}

// Fetch products by category
export function useProductsByCategory(categoryId: number, limit = 12) {
  return useQuery({
    queryKey: queryKeys.productsByCategory(categoryId),
    queryFn: async (): Promise<MarketplaceProduct[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          shops (
            id,
            name,
            owner_id
          ),
          categories (
            id,
            name
          )
        `)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw new Error(error.message)
      return data || []
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  })
}

// Search products
export function useSearchProducts(query: string, filters: ProductFilters = {}) {
  return useQuery({
    queryKey: queryKeys.searchProducts(query),
    queryFn: async (): Promise<MarketplaceProduct[]> => {
      if (!query.trim()) return []

      let supabaseQuery = supabase
        .from('products')
        .select(`
          *,
          shops (
            id,
            name,
            owner_id
          ),
          categories (
            id,
            name
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)

      if (filters.category_id) {
        supabaseQuery = supabaseQuery.eq('category_id', filters.category_id)
      }

      const { data, error } = await supabaseQuery
        .order('created_at', { ascending: false })
        .limit(filters.limit || 20)

      if (error) throw new Error(error.message)
      return data || []
    },
    enabled: !!query.trim(),
    staleTime: 2 * 60 * 1000,
  })
}

// Fetch categories
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw new Error(error.message)
      return data || []
    },
    staleTime: 30 * 60 * 1000,
  })
}

// Add to cart mutation
export function useAddToCart() {
  const { addItem } = useCartStore()

  return useMutation({
    mutationFn: async (product: MarketplaceProduct) => {
      addItem(product)
      return product
    },
    onSuccess: (product) => {
      toast.success(`${product.title} added to cart!`)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to add to cart')
    }
  })
}

// Toggle favorite mutation
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore()

  return useMutation({
    mutationFn: async ({ product, userId }: { product: MarketplaceProduct, userId: string }) => {
      const isCurrentlyFavorited = isFavorite(product.id)

      if (isCurrentlyFavorited) {
        removeFavorite(product.id)
        
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', product.id)

        if (error) {
          addFavorite(product)
          throw new Error(error.message)
        }

        return { action: 'removed', product }
      } else {
        addFavorite(product)
        
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: userId,
            product_id: product.id
          })

        if (error) {
          removeFavorite(product.id)
          throw new Error(error.message)
        }

        return { action: 'added', product }
      }
    },
    onSuccess: ({ action, product }) => {
      const message = action === 'added' 
        ? `${product.title} added to favorites!`
        : `${product.title} removed from favorites`
      
      toast.success(message)
      queryClient.invalidateQueries({ queryKey: queryKeys.userFavorites() })
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update favorites')
    }
  })
}

// Recently viewed products hook
export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = React.useState<MarketplaceProduct[]>([])

  React.useEffect(() => {
    const stored = localStorage.getItem('recently_viewed_products')
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored))
      } catch (error) {
        console.error('Error parsing recently viewed products:', error)
      }
    }
  }, [])

  const addToRecentlyViewed = React.useCallback((product: MarketplaceProduct) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p.id !== product.id)
      const updated = [product, ...filtered].slice(0, 10)
      localStorage.setItem('recently_viewed_products', JSON.stringify(updated))
      return updated
    })
  }, [])

  return {
    recentlyViewed,
    addToRecentlyViewed
  }
}

// Product actions hook
export function useProductActions() {
  const addToCart = useAddToCart()
  const toggleFavorite = useToggleFavorite()
  const { addToRecentlyViewed } = useRecentlyViewed()

  return {
    addToCart: addToCart.mutate,
    toggleFavorite: toggleFavorite.mutate,
    addToRecentlyViewed,
    isAddingToCart: addToCart.isPending,
    isTogglingFavorite: toggleFavorite.isPending
  }
}

// Utility functions
export function formatPrice(price: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price)
}

export function getProductUrl(product: MarketplaceProduct): string {
  const slug = product.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  
  return `/products/${product.id}/${slug}`
}

export function getShopUrl(shop: Shop): string {
  const slug = shop.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  
  return `/shops/${shop.id}/${slug}`
}
