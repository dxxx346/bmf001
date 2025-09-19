import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '10');
      
      logger.info('Fetching recent orders for seller', { userId: context.userId, limit });

      const supabase = createServiceClient();
      
      // Get seller's shops first
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', context.userId);

      if (shopsError) {
        logError(shopsError as Error, { action: 'get_seller_shops_for_orders' });
        return NextResponse.json(
          { error: 'Failed to fetch shops' },
          { status: 500 }
        );
      }

      const shopIds = shops?.map(shop => shop.id) || [];

      if (shopIds.length === 0) {
        return NextResponse.json({ orders: [] });
      }

      // Get recent orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          billing_address,
          order_items:order_items(
            product_title,
            quantity
          )
        `)
        .in('shop_id', shopIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ordersError) {
        logError(ordersError as Error, { action: 'get_recent_orders', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch recent orders' },
          { status: 500 }
        );
      }

      // Transform orders data
      const transformedOrders = orders?.map(order => ({
        id: order.id,
        customer_name: order.billing_address?.name || 'Unknown Customer',
        customer_email: order.billing_address?.email || '',
        product_title: order.order_items?.[0]?.product_title || 'Multiple Products',
        amount: parseFloat(order.total_amount),
        status: order.status,
        created_at: order.created_at,
      })) || [];

      logger.info('Recent orders fetched successfully', { 
        userId: context.userId,
        orderCount: transformedOrders.length 
      });

      return NextResponse.json({ orders: transformedOrders });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_recent_orders_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
