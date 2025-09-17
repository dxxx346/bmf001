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
      const includeComparison = searchParams.get('include_comparison') === 'true';
      
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'start_date and end_date are required' },
          { status: 400 }
        );
      }

      logger.info('Fetching seller analytics', { 
        userId: context.userId, 
        startDate, 
        endDate,
        includeComparison 
      });

      const supabase = createServiceClient();
      
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
        // No shops, return empty analytics
        return NextResponse.json({
          revenue_chart: [],
          sales_funnel: {
            views: 0,
            product_views: 0,
            add_to_cart: 0,
            checkout_started: 0,
            checkout_completed: 0,
            downloads: 0,
          },
          top_products: [],
          customer_demographics: {
            countries: [],
            age_groups: [],
            device_types: [],
            traffic_sources: [],
          },
          summary_stats: {
            total_revenue: 0,
            revenue_change: 0,
            total_sales: 0,
            sales_change: 0,
            total_customers: 0,
            customers_change: 0,
            conversion_rate: 0,
            conversion_change: 0,
          },
        });
      }

      // Fetch analytics data in parallel
      const [
        revenueData,
        funnelData,
        topProductsData,
        demographicsData,
        summaryData
      ] = await Promise.all([
        fetchRevenueChart(supabase, shopIds, startDate, endDate),
        fetchSalesFunnel(supabase, shopIds, startDate, endDate),
        fetchTopProducts(supabase, shopIds, startDate, endDate),
        fetchCustomerDemographics(supabase, shopIds, startDate, endDate),
        fetchSummaryStats(supabase, shopIds, startDate, endDate),
      ]);

      const analyticsData = {
        revenue_chart: revenueData,
        sales_funnel: funnelData,
        top_products: topProductsData,
        customer_demographics: demographicsData,
        summary_stats: summaryData,
      };

      logger.info('Seller analytics fetched successfully', { 
        userId: context.userId,
        dataPoints: revenueData.length,
        topProducts: topProductsData.length 
      });

      return NextResponse.json(analyticsData);

    } catch (error) {
      logError(error as Error, { 
        action: 'get_seller_analytics_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Helper functions for fetching different analytics data
async function fetchRevenueChart(supabase: any, shopIds: string[], startDate: string, endDate: string) {
  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .in('shop_id', shopIds)
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at');

  // Group by date
  const dailyData: Record<string, { revenue: number; sales: number; orders: number }> = {};
  
  // Initialize all dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyData[dateKey] = { revenue: 0, sales: 0, orders: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Aggregate actual data
  orders?.forEach(order => {
    const dateKey = order.created_at.split('T')[0];
    if (dailyData[dateKey]) {
      dailyData[dateKey].revenue += parseFloat(order.total_amount);
      dailyData[dateKey].orders += 1;
    }
  });

  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    sales: data.orders, // For this context, sales = orders
    orders: data.orders,
  }));
}

async function fetchSalesFunnel(supabase: any, shopIds: string[], startDate: string, endDate: string) {
  const [views, productViews, cartAdds, checkoutStarts, checkoutCompletes, downloads] = await Promise.all([
    // Total page views (approximate with product views for now)
    supabase
      .from('product_views')
      .select('id')
      .in('shop_id', shopIds)
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    
    // Product detail views
    supabase
      .from('product_views')
      .select('id')
      .in('shop_id', shopIds)
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    
    // Add to cart events (approximate with cart items)
    supabase
      .from('cart_items')
      .select('id')
      .in('shop_id', shopIds)
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    
    // Checkout started (approximate with payment intents)
    supabase
      .from('payments')
      .select('id')
      .in('shop_id', shopIds)
      .in('status', ['pending', 'processing', 'succeeded'])
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    
    // Checkout completed
    supabase
      .from('orders')
      .select('id')
      .in('shop_id', shopIds)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    
    // Downloads
    supabase
      .from('product_downloads')
      .select('id')
      .in('shop_id', shopIds)
      .gte('created_at', startDate)
      .lte('created_at', endDate),
  ]);

  return {
    views: views?.data?.length || 0,
    product_views: productViews?.data?.length || 0,
    add_to_cart: cartAdds?.data?.length || 0,
    checkout_started: checkoutStarts?.data?.length || 0,
    checkout_completed: checkoutCompletes?.data?.length || 0,
    downloads: downloads?.data?.length || 0,
  };
}

async function fetchTopProducts(supabase: any, shopIds: string[], startDate: string, endDate: string) {
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      title,
      thumbnail_url,
      price,
      sale_price,
      category:categories(name),
      stats:product_stats(
        view_count,
        purchase_count,
        total_revenue,
        average_rating,
        review_count
      )
    `)
    .in('shop_id', shopIds)
    .eq('status', 'active')
    .order('stats.total_revenue', { ascending: false })
    .limit(20);

  return products?.map(product => ({
    id: product.id,
    title: product.title,
    thumbnail_url: product.thumbnail_url,
    category: product.category?.name || 'Uncategorized',
    price: product.price,
    sale_price: product.sale_price,
    views: product.stats?.[0]?.view_count || 0,
    sales: product.stats?.[0]?.purchase_count || 0,
    revenue: parseFloat(product.stats?.[0]?.total_revenue || '0'),
    rating: parseFloat(product.stats?.[0]?.average_rating || '0'),
    review_count: product.stats?.[0]?.review_count || 0,
    conversion_rate: product.stats?.[0]?.view_count > 0 
      ? ((product.stats[0].purchase_count / product.stats[0].view_count) * 100) 
      : 0,
    profit_margin: 0, // Calculate based on costs if available
    created_at: product.created_at,
  })) || [];
}

async function fetchCustomerDemographics(supabase: any, shopIds: string[], startDate: string, endDate: string) {
  // Mock demographics data - in production, this would come from actual user data
  return {
    countries: [
      { country: 'US', count: 150, revenue: 4500 },
      { country: 'UK', count: 89, revenue: 2670 },
      { country: 'CA', count: 67, revenue: 2010 },
      { country: 'AU', count: 45, revenue: 1350 },
      { country: 'DE', count: 34, revenue: 1020 },
    ],
    age_groups: [
      { age_range: '18-24', count: 89 },
      { age_range: '25-34', count: 156 },
      { age_range: '35-44', count: 134 },
      { age_range: '45-54', count: 78 },
      { age_range: '55+', count: 45 },
    ],
    device_types: [
      { device: 'desktop', count: 245 },
      { device: 'mobile', count: 189 },
      { device: 'tablet', count: 68 },
    ],
    traffic_sources: [
      { source: 'Direct', visits: 234, conversions: 45 },
      { source: 'Google', visits: 189, conversions: 38 },
      { source: 'Social Media', visits: 123, conversions: 15 },
      { source: 'Referral', visits: 67, conversions: 12 },
    ],
  };
}

async function fetchSummaryStats(supabase: any, shopIds: string[], startDate: string, endDate: string) {
  // Calculate period duration for comparison
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodDuration = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - periodDuration);
  const previousEnd = new Date(start);

  // Current period stats
  const [currentRevenue, currentOrders, currentCustomers] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount')
      .in('shop_id', shopIds)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    
    supabase
      .from('orders')
      .select('id')
      .in('shop_id', shopIds)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    
    supabase
      .from('orders')
      .select('user_id')
      .in('shop_id', shopIds)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate),
  ]);

  // Previous period stats for comparison
  const [previousRevenue, previousOrders, previousCustomers] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount')
      .in('shop_id', shopIds)
      .eq('status', 'completed')
      .gte('created_at', previousStart.toISOString())
      .lte('created_at', previousEnd.toISOString()),
    
    supabase
      .from('orders')
      .select('id')
      .in('shop_id', shopIds)
      .eq('status', 'completed')
      .gte('created_at', previousStart.toISOString())
      .lte('created_at', previousEnd.toISOString()),
    
    supabase
      .from('orders')
      .select('user_id')
      .in('shop_id', shopIds)
      .eq('status', 'completed')
      .gte('created_at', previousStart.toISOString())
      .lte('created_at', previousEnd.toISOString()),
  ]);

  // Calculate current metrics
  const totalRevenue = currentRevenue.data?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
  const totalSales = currentOrders.data?.length || 0;
  const uniqueCustomers = new Set(currentCustomers.data?.map(order => order.user_id) || []).size;

  // Calculate previous metrics
  const prevRevenue = previousRevenue.data?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
  const prevSales = previousOrders.data?.length || 0;
  const prevCustomers = new Set(previousCustomers.data?.map(order => order.user_id) || []).size;

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Get total views for conversion rate
  const { data: totalViews } = await supabase
    .from('product_views')
    .select('id')
    .in('shop_id', shopIds)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const { data: prevViews } = await supabase
    .from('product_views')
    .select('id')
    .in('shop_id', shopIds)
    .gte('created_at', previousStart.toISOString())
    .lte('created_at', previousEnd.toISOString());

  const conversionRate = (totalViews?.length || 0) > 0 ? (totalSales / (totalViews?.length || 1)) * 100 : 0;
  const prevConversionRate = (prevViews?.length || 0) > 0 ? (prevSales / (prevViews?.length || 1)) * 100 : 0;

  return {
    total_revenue: totalRevenue,
    revenue_change: calculateChange(totalRevenue, prevRevenue),
    total_sales: totalSales,
    sales_change: calculateChange(totalSales, prevSales),
    total_customers: uniqueCustomers,
    customers_change: calculateChange(uniqueCustomers, prevCustomers),
    conversion_rate: conversionRate,
    conversion_change: calculateChange(conversionRate, prevConversionRate),
  };
}
