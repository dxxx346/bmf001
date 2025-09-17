import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Production-optimized client configurations
const clientConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=30, max=100',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: process.env.NODE_ENV === 'production' ? 100 : 10,
    },
  },
};

const serverConfig = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=30, max=100',
    },
  },
};

const serviceConfig = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=30, max=100',
    },
  },
};

// Cached client instances for connection pooling
let browserClientInstance: any = null;
let serverClientInstance: any = null;
let serviceClientInstance: any = null;

// Basic client for browser with connection pooling
export const createBrowserClient = () => {
  if (browserClientInstance) {
    return browserClientInstance;
  }
  
  browserClientInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, clientConfig);
  return browserClientInstance;
};

// Basic client for server with connection pooling
export const createServerClient = () => {
  if (serverClientInstance) {
    return serverClientInstance;
  }
  
  serverClientInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, serverConfig);
  return serverClientInstance;
};

// Service client for admin operations with connection pooling
export const createServiceClient = () => {
  if (serviceClientInstance) {
    return serviceClientInstance;
  }
  
  serviceClientInstance = createSupabaseClient(supabaseUrl, supabaseServiceKey, serviceConfig);
  return serviceClientInstance;
};

// Get pooled Supabase client (for server-side operations)
export const getPooledSupabaseClient = async () => {
  // Dynamic import to avoid client-side bundling of server-side code
  if (typeof window !== 'undefined') {
    throw new Error('getPooledSupabaseClient can only be used on the server-side');
  }
  
  const { getSupabasePool } = await import('../database-pool');
  return getSupabasePool();
};

// Basic types for the marketplace
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: 'buyer' | 'seller' | 'partner' | 'admin';
  created_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: string;
  seller_id: string;
  shop_id: string;
  category_id?: number;
  title: string;
  description?: string;
  price: number;
  file_url: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  buyer_id: string;
  product_id: string;
  payment_id?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  provider: 'stripe' | 'yookassa' | 'crypto';
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  external_id?: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  product_id: string;
  referral_code: string;
  reward_percent: number;
  created_at: string;
}

export interface ReferralStats {
  id: string;
  referral_id: string;
  click_count: number;
  purchase_count: number;
  total_earned: number;
  updated_at: string;
}
