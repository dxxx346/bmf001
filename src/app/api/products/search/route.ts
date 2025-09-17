import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { FileType, ProductSearchFilters, ProductStatus } from '@/types/product';

const productService = new ProductService();

export async function GET(request: NextRequest) {
  return authMiddleware.optionalAuth(request).then(async (context) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parse search filters from query parameters
      const frontendSortBy = searchParams.get('sort_by');
      const frontendSortOrder = searchParams.get('sort_order');
      const query = searchParams.get('query') || searchParams.get('q') || undefined;

      // Map sort_by values from frontend to backend
      let sortBy: ProductSearchFilters['sort_by'] = 'created_at';
      let sortOrder: ProductSearchFilters['sort_order'] = 'desc';
      
      if (frontendSortBy === 'relevance' && !query) {
        sortBy = 'created_at';
        sortOrder = 'desc';
      } else if (frontendSortBy === 'relevance' && query) {
        sortBy = 'created_at'; // Will be handled by search algorithm
        sortOrder = 'desc';
      } else if (frontendSortBy === 'newest') {
        sortBy = 'created_at';
        sortOrder = 'desc';
      } else if (frontendSortBy === 'popularity') {
        sortBy = 'popularity';
        sortOrder = 'desc';
      } else if (frontendSortBy === 'rating') {
        sortBy = 'rating';
        sortOrder = 'desc';
      } else if (frontendSortBy === 'price_asc') {
        sortBy = 'price';
        sortOrder = 'asc';
      } else if (frontendSortBy === 'price_desc') {
        sortBy = 'price';
        sortOrder = 'desc';
      } else if (frontendSortBy === 'name') {
        sortBy = 'name';
        sortOrder = frontendSortOrder === 'desc' ? 'desc' : 'asc';
      } else if (frontendSortBy && ['price', 'rating', 'created_at', 'updated_at', 'popularity', 'name'].includes(frontendSortBy)) {
        sortBy = frontendSortBy as ProductSearchFilters['sort_by'];
        sortOrder = frontendSortOrder === 'asc' ? 'asc' : 'desc';
      }

      const filters: ProductSearchFilters = {
        query,
        category_id: searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!) : undefined,
        subcategory_id: searchParams.get('subcategory_id') ? parseInt(searchParams.get('subcategory_id')!) : undefined,
        min_price: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
        max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
        min_rating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
        max_rating: searchParams.get('max_rating') ? parseFloat(searchParams.get('max_rating')!) : undefined,
        tags: searchParams.get('tags')?.split(',').filter(Boolean),
        file_types: searchParams.get('file_types')?.split(',').filter(Boolean) as FileType[],
        status: ['active' as ProductStatus], // Only show active products in search
        is_featured: searchParams.get('is_featured') === 'true' ? true : undefined,
        is_on_sale: searchParams.get('is_on_sale') === 'true' ? true : undefined,
        seller_id: searchParams.get('seller_id') || undefined,
        shop_id: searchParams.get('shop_id') || undefined,
        created_after: searchParams.get('created_after') || undefined,
        created_before: searchParams.get('created_before') || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      };

      const includeFacets = searchParams.get('include_facets') === 'true';
      const userId = context.isAuthenticated ? context.userId : undefined;

      logger.info('Product search API call', { 
        filters: { ...filters, query: filters.query ? `"${filters.query}"` : undefined },
        userId,
        includeFacets 
      });

      const result = await productService.searchProducts({
        filters,
        user_id: userId,
        include_facets: includeFacets,
      });

      // Transform the result to match expected format
      const totalCount = result.total || 0;
      const currentPage = filters.page || 1;
      const currentLimit = filters.limit || 20;
      const totalPages = Math.ceil(totalCount / currentLimit);
      
      const response = {
        products: result.products || [],
        total: totalCount,
        page: currentPage,
        limit: currentLimit,
        total_pages: totalPages,
        has_next_page: currentPage < totalPages,
        has_previous_page: currentPage > 1,
        filters_applied: filters,
        facets: result.facets || {
          categories: [],
          price_ranges: [],
          ratings: [],
          tags: []
        },
      };

      return NextResponse.json(response);
    } catch (error) {
      logError(error as Error, { action: 'search_products_api' });
      return NextResponse.json(
        { error: 'Failed to search products' },
        { status: 500 }
      );
    }
  });
}
