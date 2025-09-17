// Shop types for the digital marketplace

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  website_url?: string;
  contact_email?: string;
  is_active: boolean;
  settings: ShopSettings;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  product_count?: number;
  total_sales?: number;
  total_revenue?: number;
  average_rating?: number;
  follower_count?: number;
}

export interface ShopSettings {
  theme?: {
    primary_color?: string;
    secondary_color?: string;
    logo_position?: 'left' | 'center' | 'right';
  };
  social_links?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
  };
  policies?: {
    return_policy?: string;
    shipping_policy?: string;
    privacy_policy?: string;
  };
  notifications?: {
    email_orders?: boolean;
    email_reviews?: boolean;
    email_analytics?: boolean;
  };
  seo?: {
    meta_title?: string;
    meta_description?: string;
    keywords?: string[];
  };
}

export interface CreateShopRequest {
  name: string;
  description?: string;
  logo?: File;
  banner?: File;
  website_url?: string;
  contact_email?: string;
  settings?: Partial<ShopSettings>;
}

export interface UpdateShopRequest {
  name?: string;
  description?: string;
  logo?: File;
  banner?: File;
  website_url?: string;
  contact_email?: string;
  is_active?: boolean;
  settings?: Partial<ShopSettings>;
}

export interface ShopAnalytics {
  shop_id: string;
  period: {
    start_date: string;
    end_date: string;
  };
  metrics: {
    total_views: number;
    total_sales: number;
    total_revenue: number;
    total_orders: number;
    conversion_rate: number;
    average_order_value: number;
    return_customer_rate: number;
  };
  top_products: Array<{
    product_id: string;
    product_title: string;
    sales_count: number;
    revenue: number;
  }>;
  sales_by_day: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
  traffic_sources: Array<{
    source: string;
    visits: number;
    conversions: number;
  }>;
  customer_demographics: {
    countries: Array<{ country: string; count: number }>;
    age_groups: Array<{ age_range: string; count: number }>;
  };
}

export interface ShopStats {
  shop_id: string;
  total_products: number;
  active_products: number;
  total_sales: number;
  total_revenue: number;
  total_views: number;
  average_rating: number;
  review_count: number;
  follower_count: number;
  conversion_rate: number;
  last_sale_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ShopSearchFilters {
  query?: string;
  category_id?: number;
  min_rating?: number;
  is_active?: boolean;
  has_products?: boolean;
  created_after?: string;
  created_before?: string;
  sort_by?: 'name' | 'created_at' | 'total_sales' | 'rating';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ShopSearchResult {
  shops: Shop[];
  total_count: number;
  page: number;
  limit: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface ShopAnalyticsRequest {
  shop_id: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  start_date?: string;
  end_date?: string;
  metrics?: string[];
  include_products?: boolean;
  include_demographics?: boolean;
}

export interface ShopPerformance {
  shop_id: string;
  performance_score: number; // 0-100
  ranking: {
    category_rank?: number;
    overall_rank?: number;
    trending_rank?: number;
  };
  recommendations: Array<{
    type: 'product' | 'seo' | 'marketing' | 'pricing';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  benchmarks: {
    category_average_rating: number;
    category_average_sales: number;
    category_average_revenue: number;
  };
}
