import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const shopId = searchParams.get('shop_id');
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      logger.info('Fetching seller products', { 
        userId: context.userId, 
        shopId, 
        status, 
        limit, 
        offset 
      });

      const supabase = createServiceClient();
      
      // Build query
      let query = supabase
        .from('products')
        .select(`
          *,
          stats:product_stats(
            view_count,
            download_count,
            purchase_count,
            total_revenue,
            average_rating,
            review_count
          ),
          shop:shops(
            name,
            slug
          ),
          category:categories(
            name
          ),
          files:product_files(
            id,
            file_name,
            file_size,
            file_type,
            url
          ),
          images:product_images(
            id,
            url,
            alt_text,
            sort_order
          )
        `)
        .eq('seller_id', context.userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (shopId) {
        query = query.eq('shop_id', shopId);
      }
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: products, error } = await query;

      if (error) {
        logError(error as Error, { action: 'get_seller_products', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch products' },
          { status: 500 }
        );
      }

      // Transform data to include default stats if none exist
      const productsWithStats = products?.map(product => ({
        ...product,
        stats: product.stats?.[0] || {
          view_count: 0,
          download_count: 0,
          purchase_count: 0,
          total_revenue: 0,
          average_rating: 0,
          review_count: 0,
        },
        shop: product.shop?.[0] || { name: 'Unknown Shop', slug: '' },
        category: product.category?.[0] || { name: 'Uncategorized' },
      })) || [];

      logger.info('Seller products fetched successfully', { 
        userId: context.userId,
        productCount: productsWithStats.length 
      });

      return NextResponse.json({ 
        products: productsWithStats,
        total_count: productsWithStats.length,
        limit,
        offset,
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_seller_products_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
