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

      logger.info('Fetching partner dashboard data', { 
        userId: context.userId, 
        startDate, 
        endDate 
      });

      const supabase = createServiceClient();
      
      // Get partner's referral links
      const { data: referralLinks, error: linksError } = await supabase
        .from('referrals')
        .select('id, referral_code')
        .eq('referrer_id', context.userId);

      if (linksError) {
        logError(linksError as Error, { action: 'get_referral_links_for_dashboard' });
        return NextResponse.json(
          { error: 'Failed to fetch referral links' },
          { status: 500 }
        );
      }

      const linkCodes = referralLinks?.map(link => link.referral_code) || [];

      if (linkCodes.length === 0) {
        // No links, return empty dashboard data
        return NextResponse.json({
          stats: {
            total_clicks: 0,
            total_conversions: 0,
            total_earnings: 0,
            conversion_rate: 0,
            click_trend: [],
            top_links: [],
            earnings_breakdown: [],
            recent_conversions: [],
          },
          recent_referrals: [],
          payout_info: {
            pending_amount: 0,
            next_payout_date: getNextPayoutDate(),
            total_paid: 0,
            minimum_payout: 50,
          },
          achievements: [],
        });
      }

      // Fetch dashboard data in parallel
      const [
        clicksData,
        conversionsData,
        earningsData,
        recentReferrals,
        payoutInfo
      ] = await Promise.all([
        fetchClicksData(supabase, linkCodes, startDate, endDate),
        fetchConversionsData(supabase, linkCodes, startDate, endDate),
        fetchEarningsData(supabase, context.userId, startDate, endDate),
        fetchRecentReferrals(supabase, context.userId, 10),
        fetchPayoutInfo(supabase, context.userId),
      ]);

      // Calculate conversion rate
      const totalClicks = clicksData.total_clicks;
      const totalConversions = conversionsData.total_conversions;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      // Generate click trend data
      const clickTrend = generateClickTrend(clicksData.daily_data, conversionsData.daily_data, earningsData.daily_data);

      // Get top performing links
      const topLinks = await getTopPerformingLinks(supabase, linkCodes, startDate, endDate);

      const dashboardData = {
        stats: {
          total_clicks: totalClicks,
          total_conversions: totalConversions,
          total_earnings: earningsData.total_earnings,
          conversion_rate: conversionRate,
          click_trend: clickTrend,
          top_links: topLinks,
          earnings_breakdown: earningsData.breakdown,
          recent_conversions: conversionsData.recent_conversions,
        },
        recent_referrals: recentReferrals,
        payout_info: payoutInfo,
        achievements: generateAchievements(totalClicks, totalConversions, earningsData.total_earnings),
      };

      logger.info('Partner dashboard data fetched successfully', { 
        userId: context.userId,
        totalClicks,
        totalConversions,
        totalEarnings: earningsData.total_earnings
      });

      return NextResponse.json(dashboardData);

    } catch (error) {
      logError(error as Error, { 
        action: 'get_partner_dashboard_api',
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
async function fetchClicksData(supabase: any, linkCodes: string[], startDate: string, endDate: string) {
  // Mock implementation - replace with actual click tracking data
  const { data: clickEvents } = await supabase
    .from('referral_clicks')
    .select('created_at, referral_code')
    .in('referral_code', linkCodes)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const totalClicks = clickEvents?.length || 0;
  
  // Group by date for trend
  const dailyData: Record<string, number> = {};
  clickEvents?.forEach(click => {
    const date = click.created_at.split('T')[0];
    dailyData[date] = (dailyData[date] || 0) + 1;
  });

  return { total_clicks: totalClicks, daily_data: dailyData };
}

async function fetchConversionsData(supabase: any, linkCodes: string[], startDate: string, endDate: string) {
  // Get conversions from referral_stats
  const { data: conversions } = await supabase
    .from('referral_stats')
    .select(`
      purchase_count,
      total_earned,
      referral:referrals(referral_code, product:products(title))
    `)
    .in('referral.referral_code', linkCodes)
    .gte('updated_at', startDate)
    .lte('updated_at', endDate);

  const totalConversions = conversions?.reduce((sum, stat) => sum + stat.purchase_count, 0) || 0;
  
  // Mock recent conversions
  const recentConversions = conversions?.slice(0, 10).map((conv, index) => ({
    id: `conv-${index}`,
    product_name: conv.referral?.product?.title || 'Unknown Product',
    customer_name: `Customer ${index + 1}`,
    commission: parseFloat(conv.total_earned) || 0,
    created_at: new Date().toISOString(),
    link_code: conv.referral?.referral_code || '',
  })) || [];

  return { 
    total_conversions: totalConversions, 
    daily_data: {}, // Would implement daily conversion tracking
    recent_conversions: recentConversions 
  };
}

async function fetchEarningsData(supabase: any, userId: string, startDate: string, endDate: string) {
  const { data: earnings } = await supabase
    .from('referral_stats')
    .select('total_earned, referral:referrals(product:products(title, category:categories(name)))')
    .eq('referral.referrer_id', userId)
    .gte('updated_at', startDate)
    .lte('updated_at', endDate);

  const totalEarnings = earnings?.reduce((sum, stat) => sum + parseFloat(stat.total_earned), 0) || 0;
  
  // Calculate earnings breakdown by category
  const categoryEarnings: Record<string, number> = {};
  earnings?.forEach(stat => {
    const category = stat.referral?.product?.category?.name || 'Other';
    categoryEarnings[category] = (categoryEarnings[category] || 0) + parseFloat(stat.total_earned);
  });

  const breakdown = Object.entries(categoryEarnings).map(([source, amount]) => ({
    source,
    amount,
    percentage: totalEarnings > 0 ? (amount / totalEarnings) * 100 : 0,
  }));

  return { 
    total_earnings: totalEarnings, 
    breakdown,
    daily_data: {} // Would implement daily earnings tracking
  };
}

async function fetchRecentReferrals(supabase: any, userId: string, limit: number) {
  // Mock recent referrals data
  return Array.from({ length: Math.min(limit, 5) }, (_, index) => ({
    id: `ref-${index}`,
    link_name: `Referral Link ${index + 1}`,
    link_code: `REF${index + 1}`,
    product_name: `Product ${index + 1}`,
    customer_name: `Customer ${index + 1}`,
    commission: 10 + (index * 5),
    status: ['pending', 'confirmed', 'paid'][index % 3],
    created_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
  }));
}

async function fetchPayoutInfo(supabase: any, userId: string) {
  const { data: payouts } = await supabase
    .from('partner_payouts')
    .select('amount, status, created_at')
    .eq('partner_id', userId)
    .order('created_at', { ascending: false });

  const totalPaid = payouts?.filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

  const pendingAmount = payouts?.filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

  return {
    pending_amount: pendingAmount,
    next_payout_date: getNextPayoutDate(),
    total_paid: totalPaid,
    minimum_payout: 50,
  };
}

async function getTopPerformingLinks(supabase: any, linkCodes: string[], startDate: string, endDate: string) {
  // Mock top links data
  return linkCodes.slice(0, 5).map((code, index) => ({
    id: `link-${index}`,
    name: `Top Link ${index + 1}`,
    code,
    clicks: 100 - (index * 15),
    conversions: 10 - (index * 2),
    earnings: 200 - (index * 30),
    conversion_rate: (10 - index * 2) / (100 - index * 15) * 100,
    created_at: new Date().toISOString(),
  }));
}

function generateClickTrend(clicksData: any, conversionsData: any, earningsData: any) {
  // Generate last 30 days of data
  const trend: Array<{
    date: string;
    clicks: number;
    conversions: number;
    earnings: number;
  }> = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const dateKey = date.toISOString().split('T')[0];
    
    trend.push({
      date: dateKey,
      clicks: Math.floor(Math.random() * 20) + 5,
      conversions: Math.floor(Math.random() * 3),
      earnings: Math.floor(Math.random() * 50) + 10,
    });
  }
  
  return trend;
}

function generateAchievements(clicks: number, conversions: number, earnings: number) {
  const achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earned_at: string;
  }> = [];
  
  if (clicks >= 100) {
    achievements.push({
      id: 'clicks-100',
      title: 'Click Master',
      description: 'Generated 100+ clicks',
      icon: '🎯',
      earned_at: new Date().toISOString(),
    });
  }
  
  if (conversions >= 10) {
    achievements.push({
      id: 'conversions-10',
      title: 'Sales Champion',
      description: 'Generated 10+ conversions',
      icon: '🏆',
      earned_at: new Date().toISOString(),
    });
  }
  
  if (earnings >= 100) {
    achievements.push({
      id: 'earnings-100',
      title: 'Money Maker',
      description: 'Earned $100+ in commissions',
      icon: '💰',
      earned_at: new Date().toISOString(),
    });
  }
  
  return achievements;
}

function getNextPayoutDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
