import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      const linkId = params.id;
      const { searchParams } = new URL(req.url);
      const timeframe = searchParams.get('timeframe') || '30d';
      const timezone = searchParams.get('timezone') || 'UTC';

      logger.info('Fetching referral link analytics', { 
        userId: context.userId, 
        linkId,
        timeframe
      });

      const supabase = createServiceClient();

      // Verify link ownership
      const { data: referralLink, error: linkError } = await supabase
        .from('referrals')
        .select(`
          id,
          referral_code,
          reward_percent,
          created_at,
          product:products(
            id,
            title,
            price,
            thumbnail_url
          )
        `)
        .eq('id', linkId)
        .eq('referrer_id', context.userId)
        .single();

      if (linkError || !referralLink) {
        return NextResponse.json(
          { error: 'Referral link not found' },
          { status: 404 }
        );
      }

      // Get basic stats
      const { data: stats, error: statsError } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('referral_id', linkId)
        .single();

      if (statsError) {
        logError(statsError as Error, { action: 'get_link_stats', userId: context.userId, linkId });
      }

      // Calculate date range for analytics
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Generate mock analytics data (replace with real data when available)
      const analytics = generateMockAnalytics(linkId, startDate, endDate, stats);

      const response = {
        link: {
          id: referralLink.id,
          name: referralLink.product?.title ? `${referralLink.product.title} Referral` : `Link ${referralLink.referral_code}`,
          code: referralLink.referral_code,
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/${referralLink.product?.id}?ref=${referralLink.referral_code}`,
          short_url: `${process.env.NEXT_PUBLIC_SITE_URL}/r/${referralLink.referral_code}`,
          commission_rate: referralLink.reward_percent,
          created_at: referralLink.created_at,
        },
        analytics: {
          timeframe,
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          summary: {
            total_clicks: stats?.click_count || 0,
            total_conversions: stats?.purchase_count || 0,
            total_earnings: parseFloat(stats?.total_earned || '0'),
            conversion_rate: stats?.click_count > 0 
              ? ((stats?.purchase_count || 0) / stats.click_count * 100) 
              : 0,
            average_order_value: stats?.purchase_count > 0 
              ? parseFloat(stats?.total_earned || '0') / stats.purchase_count 
              : 0,
          },
          daily_data: analytics.daily_data,
          top_referrers: analytics.top_referrers,
          conversion_funnel: analytics.conversion_funnel,
          geographic_data: analytics.geographic_data,
        }
      };

      logger.info('Referral link analytics fetched successfully', { 
        userId: context.userId,
        linkId,
        timeframe
      });

      return NextResponse.json(response);

    } catch (error) {
      logError(error as Error, { 
        action: 'get_link_analytics_api',
        userId: context.userId,
        linkId: params.id
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Helper function to generate mock analytics data
function generateMockAnalytics(linkId: string, startDate: Date, endDate: Date, stats: any) {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalClicks = stats?.click_count || 0;
  const totalConversions = stats?.purchase_count || 0;
  const totalEarnings = parseFloat(stats?.total_earned || '0');

  // Generate daily data
  const daily_data: Array<{
    date: string;
    clicks: number;
    conversions: number;
    earnings: number;
    conversion_rate: number;
  }> = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Distribute data across days with some randomness
    const dayClicks = Math.floor((totalClicks / days) * (0.5 + Math.random()));
    const dayConversions = Math.floor((totalConversions / days) * (0.5 + Math.random()));
    const dayEarnings = (totalEarnings / days) * (0.5 + Math.random());

    daily_data.push({
      date: date.toISOString().split('T')[0],
      clicks: dayClicks,
      conversions: dayConversions,
      earnings: dayEarnings,
      conversion_rate: dayClicks > 0 ? (dayConversions / dayClicks * 100) : 0,
    });
  }

  return {
    daily_data,
    top_referrers: [
      { source: 'Direct', clicks: Math.floor(totalClicks * 0.4), conversions: Math.floor(totalConversions * 0.3) },
      { source: 'Social Media', clicks: Math.floor(totalClicks * 0.3), conversions: Math.floor(totalConversions * 0.4) },
      { source: 'Email', clicks: Math.floor(totalClicks * 0.2), conversions: Math.floor(totalConversions * 0.2) },
      { source: 'Other', clicks: Math.floor(totalClicks * 0.1), conversions: Math.floor(totalConversions * 0.1) },
    ],
    conversion_funnel: [
      { stage: 'Link Clicks', count: totalClicks, percentage: 100 },
      { stage: 'Product Views', count: Math.floor(totalClicks * 0.8), percentage: 80 },
      { stage: 'Add to Cart', count: Math.floor(totalClicks * 0.3), percentage: 30 },
      { stage: 'Checkout', count: Math.floor(totalClicks * 0.15), percentage: 15 },
      { stage: 'Purchase', count: totalConversions, percentage: totalClicks > 0 ? (totalConversions / totalClicks * 100) : 0 },
    ],
    geographic_data: [
      { country: 'United States', clicks: Math.floor(totalClicks * 0.4), conversions: Math.floor(totalConversions * 0.4) },
      { country: 'United Kingdom', clicks: Math.floor(totalClicks * 0.2), conversions: Math.floor(totalConversions * 0.2) },
      { country: 'Canada', clicks: Math.floor(totalClicks * 0.15), conversions: Math.floor(totalConversions * 0.15) },
      { country: 'Australia', clicks: Math.floor(totalClicks * 0.1), conversions: Math.floor(totalConversions * 0.1) },
      { country: 'Germany', clicks: Math.floor(totalClicks * 0.08), conversions: Math.floor(totalConversions * 0.08) },
      { country: 'Other', clicks: Math.floor(totalClicks * 0.07), conversions: Math.floor(totalConversions * 0.07) },
    ],
  };
}
