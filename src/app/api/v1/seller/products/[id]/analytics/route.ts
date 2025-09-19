import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { id: productId } = await params;
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || '30d';
      
      logger.info('Fetching product analytics', { productId, userId: context.userId, period });

      const supabase = createServiceClient();

      // Verify product ownership
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, seller_id, title')
        .eq('id', productId)
        .eq('seller_id', context.userId)
        .single();

      if (productError || !product) {
        return NextResponse.json(
          { error: 'Product not found or access denied' },
          { status: 404 }
        );
      }

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

      // Get product stats
      const { data: stats, error: statsError } = await supabase
        .from('product_stats')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (statsError) {
        logError(statsError as Error, { action: 'get_product_stats', productId });
      }

      // Get views data
      const { data: viewsData, error: viewsError } = await supabase
        .from('product_views')
        .select('created_at')
        .eq('product_id', productId)
        .gte('created_at', startDate.toISOString());

      if (viewsError) {
        logError(viewsError as Error, { action: 'get_product_views', productId });
      }

      // Get sales data
      const { data: salesData, error: salesError } = await supabase
        .from('order_items')
        .select('created_at, quantity, price')
        .eq('product_id', productId)
        .gte('created_at', startDate.toISOString());

      if (salesError) {
        logError(salesError as Error, { action: 'get_product_sales', productId });
      }

      // Get reviews data
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating, created_at')
        .eq('product_id', productId)
        .gte('created_at', startDate.toISOString());

      if (reviewsError) {
        logError(reviewsError as Error, { action: 'get_product_reviews', productId });
      }

      // Calculate analytics
      const totalViews = viewsData?.length || 0;
      const totalSales = salesData?.reduce((sum, sale) => sum + sale.quantity, 0) || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.quantity * parseFloat(sale.price)), 0) || 0;
      const averageRating = reviewsData?.length > 0 
        ? reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length 
        : 0;
      const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

      // Get last sale date
      const lastSale = salesData?.length > 0 
        ? salesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null;

      const analyticsData = {
        view_count: stats?.view_count || totalViews,
        download_count: stats?.download_count || 0,
        purchase_count: stats?.purchase_count || totalSales,
        total_revenue: stats?.total_revenue || totalRevenue,
        average_rating: stats?.average_rating || averageRating,
        review_count: stats?.review_count || (reviewsData?.length || 0),
        conversion_rate: conversionRate,
        last_sale_at: lastSale?.created_at,
      };

      logger.info('Product analytics fetched successfully', { 
        productId,
        userId: context.userId,
        period,
        totalViews,
        totalSales 
      });

      return NextResponse.json({ stats: analyticsData });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_product_analytics_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
