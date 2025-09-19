import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      logger.info('Fetching buyer order statistics', { userId: context.userId });

      const supabase = createServiceClient();
      
      // Get all orders for statistics
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('user_id', context.userId);

      if (error) {
        logError(error as Error, { action: 'get_buyer_order_stats', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch order statistics' },
          { status: 500 }
        );
      }

      // Calculate statistics
      const totalOrders = orders?.length || 0;
      const totalSpent = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
      const completedOrders = orders?.filter(order => order.status === 'completed').length || 0;
      const pendingOrders = orders?.filter(order => order.status === 'pending' || order.status === 'processing').length || 0;
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Get download statistics
      const { data: downloads } = await supabase
        .from('product_downloads')
        .select('id')
        .eq('user_id', context.userId);

      const totalDownloads = downloads?.length || 0;

      const stats = {
        total_orders: totalOrders,
        total_spent: totalSpent,
        total_downloads: totalDownloads,
        pending_orders: pendingOrders,
        completed_orders: completedOrders,
        average_order_value: averageOrderValue,
      };

      logger.info('Buyer order statistics calculated', { 
        userId: context.userId,
        ...stats 
      });

      return NextResponse.json(stats);

    } catch (error) {
      logError(error as Error, { 
        action: 'get_buyer_order_stats_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
