import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      const format = searchParams.get('format') || 'csv';
      
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'start_date and end_date are required' },
          { status: 400 }
        );
      }

      logger.info('Exporting seller analytics', { 
        userId: context.userId, 
        startDate, 
        endDate,
        format 
      });

      const supabase = createServiceClient();
      
      // Get seller's shops
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('id, name')
        .eq('owner_id', context.userId);

      if (shopsError) {
        logError(shopsError as Error, { action: 'get_seller_shops_for_export' });
        return NextResponse.json(
          { error: 'Failed to fetch shops' },
          { status: 500 }
        );
      }

      const shopIds = shops?.map(shop => shop.id) || [];

      if (shopIds.length === 0) {
        return NextResponse.json(
          { error: 'No shops found' },
          { status: 404 }
        );
      }

      // Get detailed analytics data
      const [ordersData, productsData, viewsData] = await Promise.all([
        // Orders data
        supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            status,
            created_at,
            billing_address,
            order_items:order_items(
              product_id,
              product_title,
              quantity,
              price
            )
          `)
          .in('shop_id', shopIds)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at'),

        // Products data
        supabase
          .from('products')
          .select(`
            id,
            title,
            price,
            sale_price,
            created_at,
            category:categories(name),
            shop:shops(name),
            stats:product_stats(
              view_count,
              purchase_count,
              total_revenue,
              average_rating
            )
          `)
          .in('shop_id', shopIds),

        // Views data
        supabase
          .from('product_views')
          .select('created_at, product_id, user_id')
          .in('shop_id', shopIds)
          .gte('created_at', startDate)
          .lte('created_at', endDate),
      ]);

      // Format data based on requested format
      if (format === 'csv') {
        const csvData = generateCSVData(ordersData.data, productsData.data, viewsData.data);
        
        const response = new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="analytics-${startDate}-to-${endDate}.csv"`,
          },
        });

        return response;
      } else if (format === 'json') {
        const jsonData = {
          period: { start_date: startDate, end_date: endDate },
          orders: ordersData.data,
          products: productsData.data,
          views: viewsData.data,
          exported_at: new Date().toISOString(),
        };

        const response = new NextResponse(JSON.stringify(jsonData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="analytics-${startDate}-to-${endDate}.json"`,
          },
        });

        return response;
      }

      return NextResponse.json(
        { error: 'Unsupported format. Use csv or json.' },
        { status: 400 }
      );

    } catch (error) {
      logError(error as Error, { 
        action: 'export_seller_analytics_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

function generateCSVData(orders: any[], products: any[], views: any[]): string {
  const headers = [
    'Date',
    'Order ID',
    'Product Title',
    'Quantity',
    'Price',
    'Total Amount',
    'Customer Name',
    'Customer Email',
    'Status',
  ];

  const rows = orders.map(order => [
    order.created_at.split('T')[0],
    order.id,
    order.order_items?.[0]?.product_title || 'Multiple Products',
    order.order_items?.[0]?.quantity || 1,
    order.order_items?.[0]?.price || 0,
    order.total_amount,
    order.billing_address?.name || '',
    order.billing_address?.email || '',
    order.status,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
