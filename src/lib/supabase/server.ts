import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cached server client for better performance
export const createServerClient = cache(() => {
  const cookieStore = cookies()
  
  return createServerComponentClient<Database>({
    cookies: () => cookieStore
  })
})

// Service role client for admin operations (use with caution)
export const createServiceClient = cache(() => {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  })
})

// Helper functions for server-side operations
export const serverAuthHelpers = {
  // Get current user on server
  getUser: async () => {
    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Get current session on server
  getSession: async () => {
    const supabase = createServerClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Get user profile with role information
  getUserProfile: async () => {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { profile: null, error: authError }
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return { profile, error: profileError }
  },

  // Check if user has required role
  checkUserRole: async (requiredRoles: string[]) => {
    const { profile, error } = await serverAuthHelpers.getUserProfile()
    
    if (error || !profile) {
      return { hasAccess: false, role: null, error }
    }

    const hasAccess = requiredRoles.includes(profile.role)
    return { hasAccess, role: profile.role, error: null }
  },

  // Create or update user profile
  upsertUserProfile: async (userId: string, profileData: Partial<Database['public']['Tables']['users']['Insert']>) => {
    const supabase = createServiceClient() // Use service client for admin operations
    
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    return { data, error }
  },

  // Get user's shops
  getUserShops: async (userId: string) => {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    return { shops: data, error }
  },

  // Get user's products
  getUserProducts: async (userId: string) => {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        shops (
          id,
          name
        ),
        categories (
          id,
          name
        )
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })

    return { products: data, error }
  },

  // Get user's purchases
  getUserPurchases: async (userId: string) => {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        products (
          id,
          title,
          price,
          thumbnail_url
        ),
        payments (
          id,
          amount,
          currency,
          status
        )
      `)
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })

    return { purchases: data, error }
  },

  // Get user's favorites
  getUserFavorites: async (userId: string) => {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        products (
          id,
          title,
          price,
          thumbnail_url,
          shops (
            id,
            name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return { favorites: data, error }
  },

  // Get user's referral stats
  getUserReferrals: async (userId: string) => {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        products (
          id,
          title,
          price
        ),
        referral_stats (
          click_count,
          purchase_count,
          total_earned
        )
      `)
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })

    return { referrals: data, error }
  }
}

// Route protection helpers
export const routeProtection = {
  // Require authentication
  requireAuth: async () => {
    const { user, error } = await serverAuthHelpers.getUser()
    
    if (error || !user) {
      throw new Error('Authentication required')
    }
    
    return user
  },

  // Require specific role
  requireRole: async (requiredRoles: string[]) => {
    const user = await routeProtection.requireAuth()
    const { hasAccess, role, error } = await serverAuthHelpers.checkUserRole(requiredRoles)
    
    if (error || !hasAccess) {
      throw new Error(`Access denied. Required roles: ${requiredRoles.join(', ')}`)
    }
    
    return { user, role }
  },

  // Require admin role
  requireAdmin: async () => {
    return await routeProtection.requireRole(['admin'])
  },

  // Require seller role
  requireSeller: async () => {
    return await routeProtection.requireRole(['seller', 'admin'])
  },

  // Require partner role
  requirePartner: async () => {
    return await routeProtection.requireRole(['partner', 'admin'])
  }
}

// Export types
export type ServerSupabaseClient = ReturnType<typeof createServerClient>
export type ServiceSupabaseClient = ReturnType<typeof createServiceClient>
export type ServerAuthHelpers = typeof serverAuthHelpers
