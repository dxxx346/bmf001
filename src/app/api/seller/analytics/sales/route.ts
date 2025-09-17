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
      
      logger.info('Fetching sales analytics for seller', { userId: context.userId, period });

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
        logError(shopsError as Error, { action: 'get_seller_shops_for_analytics' });
        return NextResponse.json(
          { error: 'Failed to fetch shops' },
          { status: 500 }
        );
      }

      const shopIds = shops?.map(shop => shop.id) || [];

      if (shopIds.length === 0) {
        return NextResponse.json({ chart_data: [] });
      }

      // Get daily sales data
      const { data: salesData, error: salesError } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .in('shop_id', shopIds)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (salesError) {
        logError(salesError as Error, { action: 'get_sales_analytics', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch sales data' },
          { status: 500 }
        );
      }

      // Group sales by date
      const salesByDate: Record<string, { sales: number; revenue: number }> = {};
      
      // Initialize all dates in the period with zero values
      const currentDate = new Date(startDate);
      while (currentDate <= now) {
        const dateKey = currentDate.toISOString().split('T')[0];
        salesByDate[dateKey] = { sales: 0, revenue: 0 };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Aggregate actual sales data
      salesData?.forEach(order => {
        const dateKey = order.created_at.split('T')[0];
        if (salesByDate[dateKey]) {
          salesByDate[dateKey].sales += 1;
          salesByDate[dateKey].revenue += parseFloat(order.total_amount);
        }
      });

      // Convert to chart data format
      const chartData = Object.entries(salesByDate).map(([date, data]) => ({
        date,
        sales: data.sales,
        revenue: data.revenue,
      }));

      logger.info('Sales analytics fetched successfully', { 
        userId: context.userId,
        period,
        dataPoints: chartData.length 
      });

      return NextResponse.json({ chart_data: chartData });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_sales_analytics_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
