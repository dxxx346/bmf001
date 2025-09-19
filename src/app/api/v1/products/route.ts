import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { 
  ProductSearchSchema, 
  ProductCreateSchema, 
  validateInput,
  sanitizeHtml,
  safeJsonParse,
  createAuditLog,
  securityHeaders 
} from '@/lib/security-validators';
import { createServiceClient } from '@/lib/supabase';

const productService = new ProductService();
const supabase = createServiceClient();

// Security audit logging function
async function logSecurityAudit(log: {
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  metadata?: Record<string, unknown>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}) {
  try {
    await supabase.from('security_events').insert({
      user_id: log.user_id,
      event_type: 'suspicious_activity',
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      details: {
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        risk_level: log.risk_level,
        ...log.metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to log security audit:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Parse and validate search filters
    const rawFilters = {
      query: searchParams.get('query') || undefined,
      category_id: searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!) : undefined,
      subcategory_id: searchParams.get('subcategory_id') ? parseInt(searchParams.get('subcategory_id')!) : undefined,
      min_price: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
      max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
      min_rating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
      max_rating: searchParams.get('max_rating') ? parseFloat(searchParams.get('max_rating')!) : undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      file_types: searchParams.get('file_types')?.split(',').filter(Boolean) as any,
      status: searchParams.get('status')?.split(',').filter(Boolean) as any,
      is_featured: searchParams.get('is_featured') === 'true' ? true : searchParams.get('is_featured') === 'false' ? false : undefined,
      is_on_sale: searchParams.get('is_on_sale') === 'true' ? true : searchParams.get('is_on_sale') === 'false' ? false : undefined,
      seller_id: searchParams.get('seller_id') || undefined,
      shop_id: searchParams.get('shop_id') || undefined,
      created_after: searchParams.get('created_after') || undefined,
      created_before: searchParams.get('created_before') || undefined,
      sort_by: searchParams.get('sort_by') as any || 'created_at',
      sort_order: searchParams.get('sort_order') as any || 'desc',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    // Validate input using Zod schema
    const validation = validateInput(ProductSearchSchema, rawFilters);
    if (!validation.success) {
      // Log security event for invalid input
      await logSecurityAudit({
        action: 'invalid_search_input',
        resource_type: 'product_search',
        ip_address: ipAddress,
        user_agent: userAgent,
        risk_level: 'medium',
        metadata: { errors: validation.errors, rawFilters },
      });

      return NextResponse.json(
        { 
          error: 'Invalid search parameters', 
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    const filters = validation.data!;
    const includeFacets = searchParams.get('include_facets') === 'true';
    const userId = request.headers.get('x-user-id') || undefined;

    logger.info('Product search API call', { filters, userId });

    const result = await productService.searchProducts({
      filters,
      user_id: userId,
      include_facets: includeFacets,
    });

    // Add security headers
    const response = NextResponse.json(result);
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    logError(error as Error, { action: 'get_products_api' });
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const formData = await req.formData();
      const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      // Parse and validate form data
      const rawProductData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        short_description: (formData.get('short_description') as string) || 'No description provided',
        price: parseFloat(formData.get('price') as string),
        sale_price: formData.get('sale_price') ? parseFloat(formData.get('sale_price') as string) : undefined,
        currency: formData.get('currency') as string || 'USD',
        category_id: formData.get('category_id') ? parseInt(formData.get('category_id') as string) : undefined,
        subcategory_id: formData.get('subcategory_id') ? parseInt(formData.get('subcategory_id') as string) : undefined,
        product_type: formData.get('product_type') as any || 'digital',
        is_digital: formData.get('is_digital') === 'true',
        is_downloadable: formData.get('is_downloadable') === 'true',
        download_limit: formData.get('download_limit') ? parseInt(formData.get('download_limit') as string) : undefined,
        download_expiry_days: formData.get('download_expiry_days') ? parseInt(formData.get('download_expiry_days') as string) : undefined,
        tags: formData.get('tags') ? (formData.get('tags') as string).split(',').filter(Boolean) : [],
        metadata: formData.get('metadata') ? safeJsonParse(formData.get('metadata') as string) : {},
        seo: formData.get('seo') ? safeJsonParse(formData.get('seo') as string) : {},
      };

      // Validate input using Zod schema
      const validation = validateInput(ProductCreateSchema, rawProductData);
      if (!validation.success) {
        await logSecurityAudit({
          user_id: context.userId,
          action: 'invalid_product_creation_input',
          resource_type: 'product',
          ip_address: ipAddress,
          user_agent: userAgent,
          risk_level: 'medium',
          metadata: { errors: validation.errors },
        });

        return NextResponse.json(
          { 
            error: 'Invalid product data', 
            details: validation.errors 
          },
          { status: 400 }
        );
      }

      const productData = validation.data!;

      // Get files
      const files: File[] = [];
      const images: File[] = [];
      
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('files[') && value instanceof File) {
          files.push(value);
        } else if (key.startsWith('images[') && value instanceof File) {
          images.push(value);
        }
      }

      (productData as any).files = files;
      (productData as any).images = images;

      logger.info('Creating product via API', { sellerId: context.userId, title: productData.title });

      const result = await productService.createProduct(productData, context.userId);

      if (!result.success) {
        await logSecurityAudit({
          user_id: context.userId,
          action: 'product_creation_failed',
          resource_type: 'product',
          ip_address: ipAddress,
          user_agent: userAgent,
          risk_level: 'low',
          metadata: { error: result.error, title: productData.title },
        });

        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      // Log successful product creation
      await logSecurityAudit({
        user_id: context.userId,
        action: 'product_created',
        resource_type: 'product',
        resource_id: result.product?.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        risk_level: 'low',
        metadata: { title: productData.title, price: productData.price },
      });

      const response = NextResponse.json({
        message: 'Product created successfully',
        product: result.product,
      }, { status: 201 });

      // Add security headers
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      logError(error as Error, { action: 'create_product_api', userId: context.userId });
      
      await logSecurityAudit({
        user_id: context.userId,
        action: 'product_creation_error',
        resource_type: 'product',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        risk_level: 'medium',
        metadata: { error: (error as Error).message },
      });

      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }
  });
}