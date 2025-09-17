'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a singleton instance for the browser client
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

export function createBrowserClient() {
  // Use auth helpers for better Next.js integration
  if (typeof window !== 'undefined' && !supabaseClient) {
    supabaseClient = createClientComponentClient<Database>() as ReturnType<typeof createClient<Database>>
  }
  
  // Fallback for SSR or when auth helpers are not available
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=30, max=100'
        }
      },
      realtime: {
        params: {
          eventsPerSecond: process.env.NODE_ENV === 'production' ? 100 : 10
        }
      }
    })
  }

  return supabaseClient
}

// Export a default instance
export const supabase = createBrowserClient()

// Helper functions for common auth operations
export const authHelpers = {
  // Sign up with email and password
  signUp: async (email: string, password: string, metadata?: { name?: string; role?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign in with OAuth provider
  signInWithOAuth: async (provider: 'google' | 'github') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { data, error }
  },

  // Update password
  updatePassword: async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password
    })
    return { data, error }
  },

  // Update profile
  updateProfile: async (updates: { name?: string; avatar_url?: string }) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    })
    return { data, error }
  },

  // Get current session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    return { session: data.session, error }
  },

  // Get current user
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser()
    return { user: data.user, error }
  },

  // Refresh session
  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession()
    return { session: data.session, error }
  }
}

// Auth state change listener
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

// Types for better TypeScript support
export type SupabaseClient = typeof supabase
export type AuthHelpers = typeof authHelpers
