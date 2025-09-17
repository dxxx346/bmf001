import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      logger.info('Fetching buyer orders', { 
        userId: context.userId, 
        startDate,
        endDate,
        status,
        limit,
        offset 
      });

      const supabase = createServiceClient();
      
      // Build query
      let query = supabase
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
              download_count,
              max_downloads,
              expires_at,
              is_available,
              last_downloaded_at
            )
          ),
          billing_address
        `)
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: orders, error } = await query;

      if (error) {
        logError(error as Error, { action: 'get_buyer_orders', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch orders' },
          { status: 500 }
        );
      }

      // Transform data for frontend
      const transformedOrders = orders?.map(order => ({
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
            download_count: file.download_count,
            max_downloads: file.max_downloads,
            expires_at: file.expires_at,
            is_available: file.is_available,
            last_downloaded_at: file.last_downloaded_at,
          })) || [],
        })) || [],
        billing_address: order.billing_address,
      })) || [];

      logger.info('Buyer orders fetched successfully', { 
        userId: context.userId,
        orderCount: transformedOrders.length 
      });

      return NextResponse.json({ 
        orders: transformedOrders,
        total_count: transformedOrders.length,
        limit,
        offset,
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_buyer_orders_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
