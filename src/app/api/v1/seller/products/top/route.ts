import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '5');
      const period = searchParams.get('period') || '30d';
      
      logger.info('Fetching top products for seller', { userId: context.userId, limit, period });

      const supabase = createServiceClient();
      
      // Calculate date range based on period
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Get seller's shops first
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', context.userId);

      if (shopsError) {
        logError(shopsError as Error, { action: 'get_seller_shops_for_top_products' });
        return NextResponse.json(
          { error: 'Failed to fetch shops' },
          { status: 500 }
        );
      }

      const shopIds = shops?.map(shop => shop.id) || [];

      if (shopIds.length === 0) {
        return NextResponse.json({ products: [] });
      }

      // Get products with their stats
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          title,
          thumbnail_url,
          stats:product_stats(
            view_count,
            download_count,
            purchase_count,
            total_revenue,
            average_rating
          )
        `)
        .in('shop_id', shopIds)
        .eq('status', 'active')
        .order('stats.total_revenue', { ascending: false })
        .limit(limit);

      if (productsError) {
        logError(productsError as Error, { action: 'get_top_products', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch top products' },
          { status: 500 }
        );
      }

      // Transform products data
      const transformedProducts = products?.map(product => ({
        id: product.id,
        title: product.title,
        thumbnail_url: product.thumbnail_url,
        sales_count: product.stats?.[0]?.purchase_count || 0,
        revenue: parseFloat(product.stats?.[0]?.total_revenue || '0'),
        rating: parseFloat(product.stats?.[0]?.average_rating || '0'),
        views: product.stats?.[0]?.view_count || 0,
      })).sort((a, b) => b.revenue - a.revenue) || [];

      logger.info('Top products fetched successfully', { 
        userId: context.userId,
        productCount: transformedProducts.length 
      });

      return NextResponse.json({ products: transformedProducts });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_top_products_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
