import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const { id: orderId } = await params;
      
      logger.info('Fetching buyer order details', { orderId, userId: context.userId });

      const supabase = createServiceClient();
      
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          currency,
          payment_method,
          payment_status,
          created_at,
          completed_at,
          download_expires_at,
          notes,
          shipping_address,
          billing_address,
          payment_details,
          order_items:order_items(
            id,
            product_id,
            product_title,
            product_thumbnail,
            quantity,
            price,
            total,
            seller_name,
            shop_name,
            category,
            can_review,
            review_id,
            rating,
            files:product_files(
              id,
              file_name,
              file_size,
              file_type,
              url,
              download_count,
              max_downloads,
              expires_at,
              is_available,
              last_downloaded_at
            )
          )
        `)
        .eq('id', orderId)
        .eq('user_id', context.userId)
        .single();

      if (error || !order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      // Get order timeline
      const orderTimeline = [
        {
          status: 'placed',
          timestamp: order.created_at,
          description: 'Order placed',
          details: `Order #${order.order_number} was successfully placed`,
        },
        {
          status: 'payment',
          timestamp: order.created_at,
          description: 'Payment processed',
          details: `Payment via ${order.payment_method} was ${order.payment_status}`,
        },
      ];

      if (order.completed_at) {
        orderTimeline.push({
          status: 'completed',
          timestamp: order.completed_at,
          description: 'Order completed',
          details: 'Digital products are now available for download',
        });
      }

      // Get support tickets for this order
      const { data: supportTickets } = await supabase
        .from('support_tickets')
        .select('id, subject, status, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      // Transform data for frontend
      const orderDetails = {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: parseFloat(order.total_amount),
        currency: order.currency,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        created_at: order.created_at,
        completed_at: order.completed_at,
        download_expires_at: order.download_expires_at,
        notes: order.notes,
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        payment_details: order.payment_details || {
          method: order.payment_method,
          transaction_id: `txn_${order.id.substring(0, 8)}`,
        },
        items: order.order_items?.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_title: item.product_title,
          product_thumbnail: item.product_thumbnail,
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: parseFloat(item.total),
          seller_name: item.seller_name,
          shop_name: item.shop_name,
          category: item.category,
          can_review: item.can_review,
          review_id: item.review_id,
          rating: item.rating,
          files: item.files?.map((file: any) => ({
            id: file.id,
            name: file.file_name,
            size: file.file_size,
            type: file.file_type,
            url: file.url,
            download_count: file.download_count,
            max_downloads: file.max_downloads,
            expires_at: file.expires_at,
            is_available: file.is_available,
            last_downloaded_at: file.last_downloaded_at,
          })) || [],
        })) || [],
        order_timeline: orderTimeline,
        support_tickets: supportTickets || [],
      };

      logger.info('Buyer order details fetched successfully', { 
        orderId,
        userId: context.userId 
      });

      return NextResponse.json({ order: orderDetails });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_buyer_order_details_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
