import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      logger.info('Fetching buyer dashboard data', { userId: context.userId });

      const supabase = createServiceClient();
      
      // Fetch dashboard data in parallel
      const [
        ordersData,
        statsData,
        activityData,
        recommendationsData,
        spendingData,
        achievementsData
      ] = await Promise.all([
        fetchRecentOrders(supabase, context.userId),
        fetchBuyerStats(supabase, context.userId),
        fetchRecentActivity(supabase, context.userId),
        fetchRecommendedProducts(supabase, context.userId),
        fetchSpendingChart(supabase, context.userId),
        fetchAchievements(supabase, context.userId),
      ]);

      const dashboardData = {
        stats: statsData,
        recent_orders: ordersData,
        recent_activity: activityData,
        recommended_products: recommendationsData,
        spending_chart: spendingData,
        achievements: achievementsData,
      };

      logger.info('Buyer dashboard data fetched successfully', { 
        userId: context.userId,
        orderCount: ordersData.length,
        totalSpent: statsData.total_spent
      });

      return NextResponse.json(dashboardData);

    } catch (error) {
      logError(error as Error, { 
        action: 'get_buyer_dashboard_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Helper functions
async function fetchRecentOrders(supabase: any, userId: string) {
  const { data: orders } = await supabase
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
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return orders?.map(order => ({
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
}

async function fetchBuyerStats(supabase: any, userId: string) {
  // Get order statistics
  const { data: orderStats } = await supabase
    .from('orders')
    .select('total_amount, status, created_at')
    .eq('user_id', userId);

  const totalOrders = orderStats?.length || 0;
  const totalSpent = orderStats?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
  const completedOrders = orderStats?.filter(order => order.status === 'completed').length || 0;

  // Get this month's stats
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const thisMonthOrders = orderStats?.filter(order => 
    new Date(order.created_at) >= thisMonth
  ) || [];

  const lastMonthOrders = orderStats?.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= lastMonth && orderDate < thisMonth;
  }) || [];

  const spendingThisMonth = thisMonthOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
  const spendingLastMonth = lastMonthOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
  const ordersThisMonth = thisMonthOrders.length;

  // Get download count
  const { data: downloadStats } = await supabase
    .from('product_downloads')
    .select('id')
    .eq('user_id', userId);

  const totalDownloads = downloadStats?.length || 0;

  // Get favorites count
  const { data: favoritesStats } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId);

  const favoriteProducts = favoritesStats?.length || 0;

  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  return {
    total_spent: totalSpent,
    total_orders: totalOrders,
    total_downloads: totalDownloads,
    favorite_products: favoriteProducts,
    spending_this_month: spendingThisMonth,
    spending_last_month: spendingLastMonth,
    orders_this_month: ordersThisMonth,
    average_order_value: averageOrderValue,
  };
}

async function fetchRecentActivity(supabase: any, userId: string) {
  // Mock recent activity - in production, this would come from activity logs
  const activities = [
    {
      id: 'activity-1',
      type: 'purchase',
      title: 'New Purchase',
      description: 'Bought Digital Art Bundle',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      amount: 49.99,
      product_id: 'product-1',
      order_id: 'order-1',
    },
    {
      id: 'activity-2',
      type: 'download',
      title: 'File Downloaded',
      description: 'Downloaded Design Templates.zip',
      date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      product_id: 'product-2',
    },
    {
      id: 'activity-3',
      type: 'review',
      title: 'Review Posted',
      description: 'Reviewed JavaScript Course',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      product_id: 'product-3',
    },
    {
      id: 'activity-4',
      type: 'favorite',
      title: 'Added to Favorites',
      description: 'Saved UI Component Library',
      date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      product_id: 'product-4',
    },
  ];

  return activities;
}

async function fetchRecommendedProducts(supabase: any, userId: string) {
  // Get user's purchase history to generate recommendations
  const { data: userOrders } = await supabase
    .from('orders')
    .select('order_items:order_items(category)')
    .eq('user_id', userId)
    .eq('status', 'completed');

  // Extract categories from purchase history
  const purchasedCategories = new Set();
  userOrders?.forEach(order => {
    order.order_items?.forEach((item: any) => {
      if (item.category) purchasedCategories.add(item.category);
    });
  });

  // Get recommended products based on categories
  let query = supabase
    .from('products')
    .select(`
      id,
      title,
      price,
      sale_price,
      thumbnail_url,
      category:categories(name),
      seller:users(name),
      stats:product_stats(
        average_rating,
        review_count
      ),
      is_favorited:favorites(id)
    `)
    .eq('status', 'active')
    .order('stats.average_rating', { ascending: false });

  if (purchasedCategories.size > 0) {
    query = query.in('category.name', Array.from(purchasedCategories));
  }

  const { data: products } = await query.limit(12);

  return products?.map(product => ({
    id: product.id,
    title: product.title,
    price: product.price,
    sale_price: product.sale_price,
    thumbnail_url: product.thumbnail_url,
    category: product.category?.name || 'Uncategorized',
    rating: product.stats?.[0]?.average_rating || 0,
    review_count: product.stats?.[0]?.review_count || 0,
    is_favorited: !!product.is_favorited?.[0],
    seller_name: product.seller?.name || 'Unknown Seller',
  })) || [];
}

async function fetchSpendingChart(supabase: any, userId: string) {
  // Get last 12 months of spending data
  const { data: monthlySpending } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at');

  // Group by month
  const monthlyData: Record<string, { amount: number; orders: number }> = {};
  
  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
    monthlyData[monthKey] = { amount: 0, orders: 0 };
  }

  // Aggregate actual data
  monthlySpending?.forEach(order => {
    const monthKey = order.created_at.substring(0, 7);
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].amount += parseFloat(order.total_amount);
      monthlyData[monthKey].orders += 1;
    }
  });

  return Object.entries(monthlyData).map(([date, data]) => ({
    date,
    amount: data.amount,
    orders: data.orders,
  }));
}

async function fetchAchievements(supabase: any, userId: string) {
  // Get user stats for achievements
  const { data: orderStats } = await supabase
    .from('orders')
    .select('total_amount, status')
    .eq('user_id', userId);

  const totalSpent = orderStats?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
  const totalOrders = orderStats?.filter(order => order.status === 'completed').length || 0;

  const achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earned_at: string;
  }> = [];
  
  if (totalOrders >= 1) {
    achievements.push({
      id: 'first-purchase',
      title: 'First Purchase',
      description: 'Made your first purchase',
      icon: '🛍️',
      earned_at: new Date().toISOString(),
    });
  }
  
  if (totalOrders >= 5) {
    achievements.push({
      id: 'frequent-buyer',
      title: 'Frequent Buyer',
      description: 'Made 5 purchases',
      icon: '🏆',
      earned_at: new Date().toISOString(),
    });
  }
  
  if (totalSpent >= 100) {
    achievements.push({
      id: 'big-spender',
      title: 'Big Spender',
      description: 'Spent over $100',
      icon: '💎',
      earned_at: new Date().toISOString(),
    });
  }
  
  return achievements;
}
