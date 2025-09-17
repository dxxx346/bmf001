import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'

// Types
interface Product {
  id: string
  title: string
  description: string
  price: number
  thumbnail_url?: string
  seller_id: string
  shop_id: string
  category_id: number
  created_at: string
  updated_at: string
}

interface CartItem {
  product: Product
  quantity: number
}

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

interface FavoritesState {
  items: Product[]
  addFavorite: (product: Product) => void
  removeFavorite: (productId: string) => void
  isFavorite: (productId: string) => boolean
  clearFavorites: () => void
}

interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  searchQuery: string
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleSidebar: () => void
  setSearchQuery: (query: string) => void
}

// Auth Store
export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'auth-store' }
  )
)

// Cart Store
export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        isOpen: false,
        addItem: (product) => {
          const items = get().items
          const existingItem = items.find(item => item.product.id === product.id)
          
          if (existingItem) {
            set({
              items: items.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            })
          } else {
            set({ items: [...items, { product, quantity: 1 }] })
          }
        },
        removeItem: (productId) => {
          set({
            items: get().items.filter(item => item.product.id !== productId)
          })
        },
        updateQuantity: (productId, quantity) => {
          if (quantity <= 0) {
            get().removeItem(productId)
            return
          }
          
          set({
            items: get().items.map(item =>
              item.product.id === productId
                ? { ...item, quantity }
                : item
            )
          })
        },
        clearCart: () => set({ items: [] }),
        toggleCart: () => set({ isOpen: !get().isOpen }),
        getTotalPrice: () => {
          return get().items.reduce((total, item) => 
            total + (item.product.price * item.quantity), 0
          )
        },
        getTotalItems: () => {
          return get().items.reduce((total, item) => total + item.quantity, 0)
        },
      }),
      {
        name: 'cart-store',
        partialize: (state) => ({ items: state.items })
      }
    ),
    { name: 'cart-store' }
  )
)

// Favorites Store
export const useFavoritesStore = create<FavoritesState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        addFavorite: (product) => {
          const items = get().items
          if (!items.some(item => item.id === product.id)) {
            set({ items: [...items, product] })
          }
        },
        removeFavorite: (productId) => {
          set({
            items: get().items.filter(item => item.id !== productId)
          })
        },
        isFavorite: (productId) => {
          return get().items.some(item => item.id === productId)
        },
        clearFavorites: () => set({ items: [] }),
      }),
      {
        name: 'favorites-store',
        partialize: (state) => ({ items: state.items })
      }
    ),
    { name: 'favorites-store' }
  )
)

// UI Store
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'system',
        sidebarOpen: false,
        searchQuery: '',
        setTheme: (theme) => set({ theme }),
        toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
        setSearchQuery: (searchQuery) => set({ searchQuery }),
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({ theme: state.theme })
      }
    ),
    { name: 'ui-store' }
  )
)
