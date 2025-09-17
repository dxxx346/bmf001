// Product types for the digital marketplace

export type ProductStatus = 'draft' | 'active' | 'inactive' | 'archived';
export type ProductType = 'digital' | 'physical' | 'service';
export type FileType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other';

export interface ProductFile {
  id: string;
  product_id: string;
  file_name: string;
  file_size: number;
  file_type: FileType;
  mime_type: string;
  file_url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVersion {
  id: string;
  product_id: string;
  version: string;
  changelog: string;
  file_url: string;
  file_size: number;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  thumbnail_url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductTag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  created_at: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  is_verified: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductStats {
  id: string;
  product_id: string;
  view_count: number;
  download_count: number;
  purchase_count: number;
  favorite_count: number;
  review_count: number;
  average_rating: number;
  total_revenue: number;
  last_updated: string;
}

export interface ProductSearchFilters {
  query?: string;
  category_id?: number;
  subcategory_id?: number;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  max_rating?: number;
  tags?: string[];
  file_types?: FileType[];
  status?: ProductStatus[];
  is_featured?: boolean;
  is_on_sale?: boolean;
  seller_id?: string;
  shop_id?: string;
  created_after?: string;
  created_before?: string;
  sort_by?: 'price' | 'rating' | 'created_at' | 'updated_at' | 'popularity' | 'name';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  filters_applied: ProductSearchFilters;
  facets: {
    categories: Array<{ id: number; name: string; count: number }>;
    price_ranges: Array<{ min: number; max: number; count: number }>;
    ratings: Array<{ rating: number; count: number }>;
    tags: Array<{ name: string; count: number }>;
  };
}

export interface ProductRecommendation {
  product: Product;
  score: number;
  reason: string;
  algorithm: 'collaborative' | 'content_based' | 'hybrid';
}

export interface BulkOperation {
  id: string;
  operation_type: 'update' | 'delete' | 'activate' | 'deactivate' | 'archive';
  product_ids: string[];
  parameters?: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_by: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  progress: number;
}

export interface ProductAnalytics {
  product_id: string;
  period: 'day' | 'week' | 'month' | 'year';
  views: number;
  downloads: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
  top_referrers: Array<{ source: string; count: number }>;
  geographic_data: Array<{ country: string; count: number }>;
  device_data: Array<{ device: string; count: number }>;
}

export interface Product {
  id: string;
  seller_id: string;
  shop_id: string;
  category_id?: number;
  subcategory_id?: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  sale_price?: number;
  currency: string;
  product_type: ProductType;
  status: ProductStatus;
  is_featured: boolean;
  is_digital: boolean;
  is_downloadable: boolean;
  download_limit?: number;
  download_expiry_days?: number;
  version: string;
  changelog?: string;
  tags: string[];
  file_url: string;
  thumbnail_url?: string | null;
  metadata: {
    dimensions?: { width: number; height: number; depth: number };
    weight?: number;
    color?: string;
    material?: string;
    compatibility?: string[];
    license_type?: string;
    support_included?: boolean;
    warranty_period?: number;
    custom_fields?: Record<string, unknown>;
  };
  seo: {
    meta_title?: string;
    meta_description?: string;
    keywords?: string[];
  };
  files: ProductFile[];
  images: ProductImage[];
  versions: ProductVersion[];
  stats: ProductStats;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface CreateProductRequest {
  title: string;
  description: string;
  short_description: string;
  price: number;
  sale_price?: number;
  currency: string;
  category_id?: number;
  subcategory_id?: number;
  shop_id?: string;
  product_type: ProductType;
  is_digital: boolean;
  is_downloadable: boolean;
  download_limit?: number;
  download_expiry_days?: number;
  tags: string[];
  metadata?: Record<string, unknown>;
  seo?: {
    meta_title?: string;
    meta_description?: string;
    keywords?: string[];
  };
  files?: File[];
  images?: File[];
}

export interface UpdateProductRequest {
  title?: string;
  slug?: string;
  description?: string;
  short_description?: string;
  price?: number;
  sale_price?: number;
  currency?: string;
  category_id?: number;
  subcategory_id?: number;
  product_type?: ProductType;
  status?: ProductStatus;
  is_featured?: boolean;
  is_digital?: boolean;
  is_downloadable?: boolean;
  download_limit?: number;
  download_expiry_days?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  seo?: {
    meta_title?: string;
    meta_description?: string;
    keywords?: string[];
  };
  files?: File[];
  images?: File[];
}

export interface ProductUploadResult {
  success: boolean;
  file_id?: string;
  file_url?: string;
  thumbnail_url?: string;
  error?: string;
  virus_scan_result?: {
    clean: boolean;
    threats: string[];
  };
  image_optimization?: {
    original_size: number;
    optimized_size: number;
    compression_ratio: number;
  };
}

export interface ProductVersionRequest {
  version: string;
  changelog: string;
  file: File;
}

export interface BulkUpdateRequest {
  product_ids: string[];
  updates: Partial<UpdateProductRequest>;
}

export interface ProductRecommendationRequest {
  user_id?: string;
  product_id?: string;
  category_id?: number;
  limit?: number;
  algorithm?: 'collaborative' | 'content_based' | 'hybrid';
}

export interface ProductSearchRequest {
  filters: ProductSearchFilters;
  user_id?: string;
  include_facets?: boolean;
}

export interface ProductAnalyticsRequest {
  product_id: string;
  period: 'day' | 'week' | 'month' | 'year';
  start_date?: string;
  end_date?: string;
}

export interface FileUploadProgress {
  file_id: string;
  file_name: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ProductExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  fields: string[];
  filters?: ProductSearchFilters;
  include_files?: boolean;
  include_analytics?: boolean;
}

export interface ProductImportResult {
  success: boolean;
  imported_count: number;
  failed_count: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}
