// Re-export Supabase types for convenience
export type {
  User,
  Shop,
  Category,
  Product,
  Purchase,
  Payment,
  Favorite,
  Referral,
  ReferralStats,
} from '@/lib/supabase/simple';

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  role: 'buyer' | 'seller' | 'partner' | 'admin';
}

// File upload types
export interface FileUpload {
  file: File;
  type: 'product' | 'thumbnail' | 'avatar';
  productId?: string;
}

// Search types
export interface SearchParams {
  query?: string;
  category?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price' | 'created_at' | 'title';
  order?: 'asc' | 'desc';
}

// Cart types
export interface CartItem {
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    title: string;
    price: number;
    thumbnail_url?: string | null;
  };
}

// Analytics types
export interface SalesAnalytics {
  total_sales: number;
  total_revenue: number;
  period: string;
  products_sold: number;
  top_products: Array<{
    product_id: string;
    title: string;
    sales_count: number;
    revenue: number;
  }>;
}

export interface ReferralAnalytics {
  total_clicks: number;
  total_purchases: number;
  total_earned: number;
  period: string;
  top_referrals: Array<{
    referral_id: string;
    product_title: string;
    clicks: number;
    purchases: number;
    earned: number;
  }>;
}

// Shop Management types
export interface ShopSettings {
  theme?: 'light' | 'dark' | 'auto';
  currency?: string;
  language?: string;
  timezone?: string;
  notifications?: {
    email_sales?: boolean;
    email_messages?: boolean;
    push_notifications?: boolean;
  };
  payout_settings?: {
    method: 'bank_transfer' | 'crypto' | 'paypal';
    account_details?: Record<string, any>;
    minimum_payout?: number;
  };
  store_policies?: {
    return_policy?: string;
    shipping_policy?: string;
    privacy_policy?: string;
    terms_of_service?: string;
  };
}

export interface ShopAnalytics {
  period: string;
  revenue: {
    total: number;
    currency: string;
    growth_percentage: number;
  };
  sales: {
    total_orders: number;
    conversion_rate: number;
    average_order_value: number;
    growth_percentage: number;
  };
  products: {
    total_products: number;
    active_products: number;
    top_products: Array<{
      product_id: string;
      title: string;
      sales_count: number;
      revenue: number;
      conversion_rate: number;
    }>;
  };
  visitors: {
    total_visitors: number;
    unique_visitors: number;
    bounce_rate: number;
    average_session_duration: number;
  };
  trends: {
    daily_revenue: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
    top_categories: Array<{
      category_id: number;
      category_name: string;
      revenue: number;
      sales_count: number;
    }>;
  };
}

export interface ShopSales {
  period: string;
  orders: Array<{
    id: string;
    product_id: string;
    product_title: string;
    buyer_name: string;
    buyer_email: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
  }>;
  summary: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
    refunds: number;
    net_revenue: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WithdrawalRequest {
  id: string;
  shop_id: string;
  amount: number;
  currency: string;
  method: 'bank_transfer' | 'crypto' | 'paypal';
  account_details: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  processed_at?: string;
  notes?: string;
}

export interface CreateShopRequest {
  name: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  website_url?: string;
  contact_email?: string;
  settings?: ShopSettings;
}

export interface UpdateShopRequest {
  name?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  website_url?: string;
  contact_email?: string;
  settings?: ShopSettings;
  is_active?: boolean;
}

// Re-export monitoring types
export type {
  SystemHealth,
  ResponseTimeMetrics,
  SalesMetrics,
  PaymentMetrics,
  TopProduct,
  TopShop,
  UserActivity,
  UserActivityHeatmap,
  ErrorMetrics,
  AdminDashboardData,
  MonitoringEvent,
  Alert,
  MonitoringConfig,
  SSEEvent,
  SSEClient,
} from './monitoring';
