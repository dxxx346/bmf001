import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || '30d';
      
      logger.info('Fetching seller stats', { userId: context.userId, period });

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

      // Get seller's shops
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', context.userId);

      if (shopsError) {
        logError(shopsError as Error, { action: 'get_seller_shops_for_stats' });
        return NextResponse.json(
          { error: 'Failed to fetch shops' },
          { status: 500 }
        );
      }

      const shopIds = shops?.map(shop => shop.id) || [];

      if (shopIds.length === 0) {
        // No shops, return zero stats
        return NextResponse.json({
          stats: {
            total_revenue: 0,
            revenue_change: 0,
            total_sales: 0,
            sales_change: 0,
            total_products: 0,
            products_change: 0,
            average_rating: 0,
            rating_change: 0,
            total_views: 0,
            views_change: 0,
            conversion_rate: 0,
            conversion_change: 0,
          }
        });
      }

      // Get current period stats
      const [
        currentRevenue,
        currentSales,
        currentProducts,
        currentRating,
        currentViews
      ] = await Promise.all([
        // Total revenue
        supabase
          .from('orders')
          .select('total_amount')
          .in('shop_id', shopIds)
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString()),
        
        // Total sales
        supabase
          .from('orders')
          .select('id')
          .in('shop_id', shopIds)
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString()),
        
        // Total products
        supabase
          .from('products')
          .select('id')
          .in('shop_id', shopIds)
          .eq('status', 'active'),
        
        // Average rating
        supabase
          .from('reviews')
          .select('rating')
          .in('shop_id', shopIds)
          .gte('created_at', startDate.toISOString()),
        
        // Total views
        supabase
          .from('product_views')
          .select('id')
          .in('shop_id', shopIds)
          .gte('created_at', startDate.toISOString()),
      ]);

      // Calculate previous period for comparison
      const previousStartDate = new Date(startDate);
      const periodDuration = now.getTime() - startDate.getTime();
      previousStartDate.setTime(startDate.getTime() - periodDuration);

      const [
        previousRevenue,
        previousSales,
        previousProducts,
        previousRating,
        previousViews
      ] = await Promise.all([
        // Previous revenue
        supabase
          .from('orders')
          .select('total_amount')
          .in('shop_id', shopIds)
          .eq('status', 'completed')
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString()),
        
        // Previous sales
        supabase
          .from('orders')
          .select('id')
          .in('shop_id', shopIds)
          .eq('status', 'completed')
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString()),
        
        // Previous products (at start of current period)
        supabase
          .from('products')
          .select('id')
          .in('shop_id', shopIds)
          .eq('status', 'active')
          .lt('created_at', startDate.toISOString()),
        
        // Previous rating
        supabase
          .from('reviews')
          .select('rating')
          .in('shop_id', shopIds)
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString()),
        
        // Previous views
        supabase
          .from('product_views')
          .select('id')
          .in('shop_id', shopIds)
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString()),
      ]);

      // Calculate current metrics
      const totalRevenue = currentRevenue.data?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
      const totalSales = currentSales.data?.length || 0;
      const totalProducts = currentProducts.data?.length || 0;
      const ratings = currentRating.data?.map(r => r.rating) || [];
      const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
      const totalViews = currentViews.data?.length || 0;

      // Calculate previous metrics
      const prevRevenue = previousRevenue.data?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
      const prevSales = previousSales.data?.length || 0;
      const prevProducts = previousProducts.data?.length || 0;
      const prevRatings = previousRating.data?.map(r => r.rating) || [];
      const prevAverageRating = prevRatings.length > 0 ? prevRatings.reduce((sum, r) => sum + r, 0) / prevRatings.length : 0;
      const prevViews = previousViews.data?.length || 0;

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;
      const prevConversionRate = prevViews > 0 ? (prevSales / prevViews) * 100 : 0;

      const stats = {
        total_revenue: totalRevenue,
        revenue_change: calculateChange(totalRevenue, prevRevenue),
        total_sales: totalSales,
        sales_change: calculateChange(totalSales, prevSales),
        total_products: totalProducts,
        products_change: calculateChange(totalProducts, prevProducts),
        average_rating: averageRating,
        rating_change: calculateChange(averageRating, prevAverageRating),
        total_views: totalViews,
        views_change: calculateChange(totalViews, prevViews),
        conversion_rate: conversionRate,
        conversion_change: calculateChange(conversionRate, prevConversionRate),
      };

      logger.info('Seller stats calculated successfully', { 
        userId: context.userId,
        period,
        shopCount: shopIds.length,
        totalRevenue,
        totalSales 
      });

      return NextResponse.json({ stats });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_seller_stats_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
