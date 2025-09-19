import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'start_date and end_date are required' },
          { status: 400 }
        );
      }

      logger.info('Fetching partner earnings data', { 
        userId: context.userId, 
        startDate, 
        endDate 
      });

      const supabase = createServiceClient();
      
      // Get partner's referral stats for the period
      const { data: referralStats, error: statsError } = await supabase
        .from('referral_stats')
        .select(`
          total_earned,
          purchase_count,
          updated_at,
          referral:referrals(
            referral_code,
            reward_percent,
            product:products(
              id,
              title,
              thumbnail_url,
              price,
              category:categories(name)
            )
          )
        `)
        .eq('referral.referrer_id', context.userId)
        .gte('updated_at', startDate)
        .lte('updated_at', endDate);

      if (statsError) {
        logError(statsError as Error, { action: 'get_partner_earnings_stats' });
        return NextResponse.json(
          { error: 'Failed to fetch earnings data' },
          { status: 500 }
        );
      }

      // Generate earnings chart data
      const earningsChart = generateEarningsChart(referralStats || [], startDate, endDate);
      
      // Calculate earnings breakdown by category
      const earningsBreakdown = calculateEarningsBreakdown(referralStats || []);
      
      // Get commission transactions
      const commissionTransactions = await getCommissionTransactions(supabase, context.userId, startDate, endDate);
      
      // Calculate summary statistics
      const summaryStats = calculateSummaryStats(referralStats || [], startDate, endDate);
      
      // Get top products
      const topProducts = getTopProducts(referralStats || []);
      
      // Calculate monthly goals
      const monthlyGoals = calculateMonthlyGoals(summaryStats.total_earnings);

      const earningsData = {
        earnings_chart: earningsChart,
        earnings_breakdown: earningsBreakdown,
        commission_transactions: commissionTransactions,
        summary_stats: summaryStats,
        top_products: topProducts,
        monthly_goals: monthlyGoals,
      };

      logger.info('Partner earnings data fetched successfully', { 
        userId: context.userId,
        totalEarnings: summaryStats.total_earnings,
        transactionCount: commissionTransactions.length
      });

      return NextResponse.json(earningsData);

    } catch (error) {
      logError(error as Error, { 
        action: 'get_partner_earnings_api',
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
function generateEarningsChart(stats: any[], startDate: string, endDate: string) {
  // Generate daily earnings data
  const dailyEarnings: Record<string, {
    earnings: number;
    commissions: number;
    bonuses: number;
    conversions: number;
  }> = {};

  // Initialize all dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyEarnings[dateKey] = {
      earnings: 0,
      commissions: 0,
      bonuses: 0,
      conversions: 0,
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Aggregate actual earnings data
  stats.forEach(stat => {
    const dateKey = stat.updated_at.split('T')[0];
    if (dailyEarnings[dateKey]) {
      const earned = parseFloat(stat.total_earned) || 0;
      dailyEarnings[dateKey].earnings += earned;
      dailyEarnings[dateKey].commissions += earned; // For now, all earnings are commissions
      dailyEarnings[dateKey].conversions += stat.purchase_count || 0;
    }
  });

  return Object.entries(dailyEarnings).map(([date, data]) => ({
    date,
    earnings: data.earnings,
    commissions: data.commissions,
    bonuses: data.bonuses,
    conversions: data.conversions,
    average_commission: data.conversions > 0 ? data.commissions / data.conversions : 0,
  }));
}

function calculateEarningsBreakdown(stats: any[]) {
  const categoryEarnings: Record<string, number> = {};
  let totalEarnings = 0;

  stats.forEach(stat => {
    const category = stat.referral?.product?.category?.name || 'Other';
    const earned = parseFloat(stat.total_earned) || 0;
    categoryEarnings[category] = (categoryEarnings[category] || 0) + earned;
    totalEarnings += earned;
  });

  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  return Object.entries(categoryEarnings).map(([source, amount], index) => ({
    source,
    amount,
    percentage: totalEarnings > 0 ? (amount / totalEarnings) * 100 : 0,
    color: colors[index % colors.length],
  }));
}

async function getCommissionTransactions(supabase: any, userId: string, startDate: string, endDate: string) {
  // Mock commission transactions - replace with actual data
  const mockTransactions = Array.from({ length: 15 }, (_, index) => ({
    id: `txn-${index + 1}`,
    order_id: `order-${index + 1}`,
    product_id: `product-${index + 1}`,
    product_title: `Product ${index + 1}`,
    product_price: 29.99 + (index * 10),
    customer_name: `Customer ${index + 1}`,
    customer_email: `customer${index + 1}@example.com`,
    referral_code: `REF${index + 1}`,
    referral_link_name: `Link ${index + 1}`,
    commission_rate: 10 + (index % 5),
    commission_amount: (29.99 + (index * 10)) * ((10 + (index % 5)) / 100),
    order_total: 29.99 + (index * 10),
    status: ['pending', 'confirmed', 'paid', 'cancelled'][index % 4],
    created_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
    confirmed_at: index % 2 === 0 ? new Date(Date.now() - (index * 12 * 60 * 60 * 1000)).toISOString() : undefined,
    paid_at: index % 4 === 0 ? new Date(Date.now() - (index * 6 * 60 * 60 * 1000)).toISOString() : undefined,
  }));

  return mockTransactions;
}

function calculateSummaryStats(stats: any[], startDate: string, endDate: string) {
  const totalEarnings = stats.reduce((sum, stat) => sum + parseFloat(stat.total_earned), 0);
  const totalConversions = stats.reduce((sum, stat) => sum + stat.purchase_count, 0);
  const averageCommission = totalConversions > 0 ? totalEarnings / totalConversions : 0;

  // Calculate this month vs last month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthStats = stats.filter(stat => 
    new Date(stat.updated_at) >= thisMonthStart
  );
  const lastMonthStats = stats.filter(stat => {
    const date = new Date(stat.updated_at);
    return date >= lastMonthStart && date <= lastMonthEnd;
  });

  const thisMonthEarnings = thisMonthStats.reduce((sum, stat) => sum + parseFloat(stat.total_earned), 0);
  const lastMonthEarnings = lastMonthStats.reduce((sum, stat) => sum + parseFloat(stat.total_earned), 0);

  const earningsChange = lastMonthEarnings > 0 ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100 : 0;
  const conversionsChange = 0; // Would calculate from historical data
  const commissionChange = 0; // Would calculate from historical data

  return {
    total_earnings: totalEarnings,
    earnings_change: earningsChange,
    pending_earnings: totalEarnings * 0.3, // 30% pending
    paid_earnings: totalEarnings * 0.7, // 70% paid
    total_conversions: totalConversions,
    conversions_change: conversionsChange,
    average_commission: averageCommission,
    commission_change: commissionChange,
    this_month_earnings: thisMonthEarnings,
    last_month_earnings: lastMonthEarnings,
  };
}

function getTopProducts(stats: any[]) {
  const productEarnings: Record<string, {
    id: string;
    title: string;
    thumbnail_url?: string;
    total_commissions: number;
    conversion_count: number;
    commission_rate: number;
  }> = {};

  stats.forEach(stat => {
    const product = stat.referral?.product;
    if (product) {
      const key = product.id;
      if (!productEarnings[key]) {
        productEarnings[key] = {
          id: product.id,
          title: product.title,
          thumbnail_url: product.thumbnail_url,
          total_commissions: 0,
          conversion_count: 0,
          commission_rate: stat.referral.reward_percent || 10,
        };
      }
      
      productEarnings[key].total_commissions += parseFloat(stat.total_earned);
      productEarnings[key].conversion_count += stat.purchase_count;
    }
  });

  return Object.values(productEarnings)
    .sort((a, b) => b.total_commissions - a.total_commissions)
    .slice(0, 10);
}

function calculateMonthlyGoals(currentEarnings: number) {
  const targetAmount = 1000; // $1000 monthly goal
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();
  const progressPercentage = (currentEarnings / targetAmount) * 100;

  return {
    target_amount: targetAmount,
    current_amount: currentEarnings,
    progress_percentage: Math.min(progressPercentage, 100),
    days_remaining: daysRemaining,
  };
}
