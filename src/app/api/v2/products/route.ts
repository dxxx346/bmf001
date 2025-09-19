import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { createVersionedResponse } from '@/middleware/api-version.middleware';
import {
  ProductSearchSchema,
  ProductCreateSchema,
  validateInput,
  sanitizeHtml,
  safeJsonParse,
} from '@/lib/security-validators';

/**
 * Products API v2
 * Enhanced version with improved response format and new features
 */

const productService = new ProductService();

// V2 Response format - more consistent and includes metadata
interface V2ProductResponse {
  item: any; // v2 uses 'item' instead of 'product'
  metadata: {
    version: string;
    timestamp: string;
    requestId: string;
  };
}

interface V2ProductListResponse {
  items: any[]; // v2 uses 'items' instead of 'products'
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: any;
  metadata: {
    version: string;
    timestamp: string;
    requestId: string;
    executionTime: number;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { searchParams } = new URL(request.url);
    
    const rawFilters = {
      query: searchParams.get('query'),
      category_id: searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!) : undefined,
      min_price: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
      max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
      tags: searchParams.get('tags')?.split(','),
      file_types: searchParams.get('file_types')?.split(','),
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: searchParams.get('sort_order') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      include_inactive: searchParams.get('include_inactive') === 'true',
    };

    const validation = validateInput(ProductSearchSchema, rawFilters);
    if (!validation.success) {
      return createVersionedResponse(
        {
          error: {
            message: 'Invalid search parameters',
            code: 'VALIDATION_ERROR',
            details: validation.errors,
          },
          metadata: {
            version: 'v2',
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        request,
        400
      );
    }

    const filters = validation.data!;
    const result = await productService.searchProducts({
      filters: {
        query: filters.query,
        category_id: filters.category_id,
        min_price: filters.min_price,
        max_price: filters.max_price,
        tags: filters.tags,
        file_types: filters.file_types,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
        page: filters.page,
        limit: filters.limit,
      },
    });

    // V2 enhanced response format
    const response: V2ProductListResponse = {
      items: result.products, // v2 uses 'items'
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.total_pages,
        hasNext: result.page < result.total_pages,
        hasPrev: result.page > 1,
      },
      filters: result.filters_applied,
      metadata: {
        version: 'v2',
        timestamp: new Date().toISOString(),
        requestId,
        executionTime: Date.now() - startTime,
      },
    };

    return createVersionedResponse(response, request);

  } catch (error) {
    return createVersionedResponse(
      {
        error: {
          message: 'Failed to fetch products',
          code: 'INTERNAL_ERROR',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        },
        metadata: {
          version: 'v2',
          timestamp: new Date().toISOString(),
          requestId,
          executionTime: Date.now() - startTime,
        },
      },
      request,
      500
    );
  }
}

export async function POST(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const formData = await req.formData();
      
      const rawProductData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        short_description: (formData.get('short_description') as string) || 'No description provided',
        price: parseFloat(formData.get('price') as string),
        category_id: formData.get('category_id') ? parseInt(formData.get('category_id') as string) : null,
        tags: formData.get('tags') ? (formData.get('tags') as string).split(',') : [],
        file_types: formData.get('file_types') ? (formData.get('file_types') as string).split(',') : [],
        metadata: formData.get('metadata') ? safeJsonParse(formData.get('metadata') as string) : {},
        seo: formData.get('seo') ? safeJsonParse(formData.get('seo') as string) : {},
        // V2 new fields
        status: formData.get('status') || 'draft', // v2 supports draft status
        scheduled_publish_at: formData.get('scheduled_publish_at') as string,
        external_id: formData.get('external_id') as string, // v2 supports external IDs
      };

      const validation = validateInput(ProductCreateSchema, rawProductData);
      if (!validation.success) {
        return createVersionedResponse(
          {
            error: {
              message: 'Invalid product data',
              code: 'VALIDATION_ERROR',
              details: validation.errors,
            },
            metadata: {
              version: 'v2',
              timestamp: new Date().toISOString(),
              requestId,
            },
          },
          request,
          400
        );
      }

      const productData = validation.data!;
      const createRequest = {
        ...productData,
        shop_id: context.user.shop_id || undefined,
      };
      const result = await productService.createProduct(createRequest, context.user.id);
      
      if (!result.success) {
        return createVersionedResponse(
          {
            error: {
              message: result.error || 'Failed to create product',
              code: 'CREATION_ERROR',
            },
            metadata: {
              version: 'v2',
              timestamp: new Date().toISOString(),
              requestId,
            },
          },
          request,
          400
        );
      }
      
      const product = result.product;

      // V2 enhanced response format
      const response: V2ProductResponse = {
        item: product, // v2 uses 'item'
        metadata: {
          version: 'v2',
          timestamp: new Date().toISOString(),
          requestId,
        },
      };

      return createVersionedResponse(response, request, 201);

    } catch (error) {
      return createVersionedResponse(
        {
          error: {
            message: 'Failed to create product',
            code: 'INTERNAL_ERROR',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          },
          metadata: {
            version: 'v2',
            timestamp: new Date().toISOString(),
            requestId,
            executionTime: Date.now() - startTime,
          },
        },
        request,
        500
      );
    }
  });
}
