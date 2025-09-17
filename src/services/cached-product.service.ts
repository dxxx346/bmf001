import { ProductService } from './product.service';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '@/lib/cache.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase';
import {
  Product,
  ProductSearchRequest,
  ProductSearchResult,
  ProductRecommendationRequest,
  ProductRecommendation,
  CreateProductRequest,
  UpdateProductRequest,
  ProductUploadResult,
  ProductVersionRequest,
  ProductVersion,
  BulkOperation,
  ProductAnalytics,
  ProductAnalyticsRequest,
  ProductExportOptions,
  ProductImportResult,
} from '@/types/product';

export class CachedProductService extends ProductService {
  private dbClient = createServiceClient();

  // =============================================
  // CACHED PRODUCT OPERATIONS
  // =============================================

  async getProduct(id: string): Promise<Product | null> {
    try {
      const cacheKey = CACHE_KEYS.productDetails(id);
      
      // Try cache first
      const cached = await cacheService.get<Product>(cacheKey);
      if (cached) {
        logger.info('Product cache hit', { productId: id });
        return cached;
      }

      // Fetch from database
      const product = await super.getProduct(id);
      if (product) {
        // Cache the result
        await cacheService.set(cacheKey, product, CACHE_TTL.PRODUCT_LISTINGS);
        logger.info('Product cached', { productId: id });
      }

      return product;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_product', productId: id });
      return null;
    }
  }

  async searchProducts(request: ProductSearchRequest): Promise<ProductSearchResult> {
    try {
      // Generate cache key from search parameters
      const filtersHash = this.generateFiltersHash(request.filters);
      const cacheKey = CACHE_KEYS.searchResults(
        request.filters.query || 'all',
        filtersHash
      );

      // Try cache first
      const cached = await cacheService.get<ProductSearchResult>(cacheKey);
      if (cached) {
        logger.info('Search results cache hit', { query: request.filters.query });
        return cached;
      }

      // Fetch from database
      const result = await super.searchProducts(request);
      
      // Cache the result
      await cacheService.set(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);
      logger.info('Search results cached', { query: request.filters.query });

      return result;
    } catch (error) {
      logError(error as Error, { action: 'search_cached_products' });
      return {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
        filters_applied: request.filters,
        facets: {
          categories: [],
          price_ranges: [],
          ratings: [],
          tags: [],
        },
      };
    }
  }

  async getProductRecommendations(request: ProductRecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      const cacheKey = CACHE_KEYS.productRecommendations(
        request.user_id || 'anonymous',
        request.product_id
      );

      // Try cache first
      const cached = await cacheService.get<ProductRecommendation[]>(cacheKey);
      if (cached) {
        logger.info('Recommendations cache hit', { userId: request.user_id });
        return cached;
      }

      // Fetch from database
      const recommendations = await super.getProductRecommendations(request);
      
      // Cache the result
      await cacheService.set(cacheKey, recommendations, CACHE_TTL.RECOMMENDATIONS);
      logger.info('Recommendations cached', { userId: request.user_id });

      return recommendations;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_recommendations' });
      return [];
    }
  }

  async getPopularProducts(limit: number = 10): Promise<Product[]> {
    try {
      const cacheKey = CACHE_KEYS.popularProducts(limit);

      // Try cache first
      const cached = await cacheService.get<Product[]>(cacheKey);
      if (cached) {
        logger.info('Popular products cache hit', { limit });
        return cached;
      }

      // Fetch from database (this would need to be implemented in the base service)
      const products = await this.fetchPopularProducts(limit);
      
      // Cache the result
      await cacheService.set(cacheKey, products, CACHE_TTL.POPULAR_PRODUCTS);
      logger.info('Popular products cached', { limit });

      return products;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_popular_products' });
      return [];
    }
  }

  async getTrendingProducts(limit: number = 10): Promise<Product[]> {
    try {
      const cacheKey = CACHE_KEYS.trendingProducts(limit);

      // Try cache first
      const cached = await cacheService.get<Product[]>(cacheKey);
      if (cached) {
        logger.info('Trending products cache hit', { limit });
        return cached;
      }

      // Fetch from database
      const products = await this.fetchTrendingProducts(limit);
      
      // Cache the result
      await cacheService.set(cacheKey, products, CACHE_TTL.POPULAR_PRODUCTS);
      logger.info('Trending products cached', { limit });

      return products;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_trending_products' });
      return [];
    }
  }

  // =============================================
  // CACHE INVALIDATION ON UPDATES
  // =============================================

  async createProduct(request: CreateProductRequest, sellerId: string): Promise<{ success: boolean; product?: Product; error?: string }> {
    const result = await super.createProduct(request, sellerId);
    
    if (result.success && result.product) {
      // Invalidate relevant caches
      await this.invalidateProductCaches(result.product.id);
      logger.info('Product caches invalidated after creation', { productId: result.product.id });
    }

    return result;
  }

  async updateProduct(id: string, updates: UpdateProductRequest, sellerId: string): Promise<{ success: boolean; product?: Product; error?: string }> {
    const result = await super.updateProduct(id, updates, sellerId);
    
    if (result.success) {
      // Invalidate relevant caches
      await this.invalidateProductCaches(id);
      logger.info('Product caches invalidated after update', { productId: id });
    }

    return result;
  }

  async deleteProduct(id: string, sellerId: string): Promise<{ success: boolean; error?: string }> {
    const result = await super.deleteProduct(id, sellerId);
    
    if (result.success) {
      // Invalidate relevant caches
      await this.invalidateProductCaches(id);
      logger.info('Product caches invalidated after deletion', { productId: id });
    }

    return result;
  }

  // =============================================
  // CACHE WARMING
  // =============================================

  async warmupProductCaches(): Promise<void> {
    try {
      logger.info('Starting product cache warmup');

      // Warm up popular products
      await this.getPopularProducts(20);
      await this.getPopularProducts(50);
      await this.getPopularProducts(100);

      // Warm up trending products
      await this.getTrendingProducts(20);
      await this.getTrendingProducts(50);

      // Warm up categories
      await this.getCategories();

      logger.info('Product cache warmup completed');
    } catch (error) {
      logError(error as Error, { action: 'warmup_product_caches' });
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private generateFiltersHash(filters: any): string {
    // Create a hash of the filters for cache key
    const filterString = JSON.stringify(filters, Object.keys(filters).sort());
    return Buffer.from(filterString).toString('base64').slice(0, 16);
  }

  private async invalidateProductCaches(productId: string): Promise<void> {
    try {
      // Invalidate product-specific caches
      await cacheService.invalidateProduct(productId);
      
      // Invalidate search caches
      await cacheService.invalidateSearch();
      
      // Invalidate recommendation caches
      await cacheService.invalidateRecommendations();
      
      // Invalidate popular/trending caches
      await cacheService.delPattern('popular:products:*');
      await cacheService.delPattern('trending:products:*');
    } catch (error) {
      logError(error as Error, { action: 'invalidate_product_caches', productId });
    }
  }

  private async fetchPopularProducts(limit: number): Promise<Product[]> {
    try {
      // This would be implemented based on your business logic
      // For now, we'll fetch products ordered by purchase count
      const { data: products, error } = await this.dbClient
        .from('products')
        .select(`
          *,
          files:product_files(*),
          images:product_images(*),
          stats:product_stats(*)
        `)
        .eq('status', 'active')
        .order('stats.purchase_count', { ascending: false })
        .limit(limit);

      if (error) {
        logError(error, { action: 'fetch_popular_products' });
        return [];
      }

      return products as Product[];
    } catch (error) {
      logError(error as Error, { action: 'fetch_popular_products' });
      return [];
    }
  }

  private async fetchTrendingProducts(limit: number): Promise<Product[]> {
    try {
      // This would be implemented based on your trending algorithm
      // For now, we'll fetch products with recent activity
      const { data: products, error } = await this.dbClient
        .from('products')
        .select(`
          *,
          files:product_files(*),
          images:product_images(*),
          stats:product_stats(*)
        `)
        .eq('status', 'active')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('stats.view_count', { ascending: false })
        .limit(limit);

      if (error) {
        logError(error, { action: 'fetch_trending_products' });
        return [];
      }

      return products as Product[];
    } catch (error) {
      logError(error as Error, { action: 'fetch_trending_products' });
      return [];
    }
  }

  private async getCategories(): Promise<any[]> {
    try {
      const cacheKey = CACHE_KEYS.categories();
      
      // Try cache first
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from database
      const { data: categories, error } = await this.dbClient
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        logError(error, { action: 'get_categories' });
        return [];
      }

      // Cache the result
      await cacheService.set(cacheKey, categories, CACHE_TTL.CATEGORIES);
      
      return categories || [];
    } catch (error) {
      logError(error as Error, { action: 'get_categories' });
      return [];
    }
  }
}
