import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const paymentIntentId = searchParams.get('payment_intent');
      const sessionId = searchParams.get('session_id');
      const orderId = searchParams.get('order_id');

      if (!paymentIntentId && !sessionId && !orderId) {
        return NextResponse.json(
          { error: 'Missing payment identifier' },
          { status: 400 }
        );
      }

      logger.info('Fetching successful order', {
        paymentIntentId,
        sessionId,
        orderId,
        userId: context.userId,
      });

      const supabase = createServiceClient();
      
      // Build query based on available identifiers
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items:order_items(
            id,
            product_id,
            product_title,
            quantity,
            price,
            download_url
          ),
          payments:payments(
            provider,
            payment_method_type,
            status
          )
        `)
        .eq('user_id', context.userId)
        .eq('status', 'completed');

      if (paymentIntentId) {
        query = query.eq('payment_intent_id', paymentIntentId);
      } else if (sessionId) {
        query = query.eq('checkout_session_id', sessionId);
      } else if (orderId) {
        query = query.eq('id', orderId);
      }

      const { data: orders, error } = await query.single();

      if (error) {
        logger.error('Error fetching order:', error);
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      if (!orders) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      // Transform the data for frontend consumption
      const orderData = {
        id: orders.id,
        payment_intent_id: orders.payment_intent_id,
        amount: parseFloat(orders.total_amount),
        currency: orders.currency,
        status: orders.status,
        created_at: orders.created_at,
        items: orders.order_items?.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_title: item.product_title,
          quantity: item.quantity,
          price: parseFloat(item.price),
          download_url: item.download_url,
        })) || [],
        billing_address: orders.billing_address || {},
        payment_method: {
          provider: orders.payments?.[0]?.provider || 'unknown',
          type: orders.payments?.[0]?.payment_method_type || 'unknown',
        },
      };

      logger.info('Order retrieved successfully', {
        orderId: orders.id,
        userId: context.userId,
        itemCount: orderData.items.length,
      });

      return NextResponse.json({ order: orderData });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_successful_order_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
