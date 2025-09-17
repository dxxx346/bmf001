import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      logger.info('Fetching partner referral links', { userId: context.userId });

      const supabase = createServiceClient();
      
      const { data: referralLinks, error } = await supabase
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
            thumbnail_url,
            category:categories(name)
          ),
          stats:referral_stats(
            click_count,
            purchase_count,
            total_earned
          )
        `)
        .eq('referrer_id', context.userId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(error as Error, { action: 'get_partner_links', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch referral links' },
          { status: 500 }
        );
      }

      // Transform data for frontend
      const links = referralLinks?.map(link => {
        const stats = link.stats?.[0] || { click_count: 0, purchase_count: 0, total_earned: '0' };
        const clicks = stats.click_count || 0;
        const conversions = stats.purchase_count || 0;
        const earnings = parseFloat(stats.total_earned) || 0;
        const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

        return {
          id: link.id,
          name: link.product?.title ? `${link.product.title} Referral` : `Link ${link.referral_code}`,
          code: link.referral_code,
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/${link.product?.id}?ref=${link.referral_code}`,
          short_url: `${process.env.NEXT_PUBLIC_SITE_URL}/r/${link.referral_code}`,
          type: 'product' as const,
          target_id: link.product?.id,
          target_name: link.product?.title,
          commission_rate: link.reward_percent,
          clicks,
          conversions,
          earnings,
          conversion_rate: conversionRate,
          status: 'active' as const, // Default status
          created_at: link.created_at,
          last_click_at: null, // Would track from click events
        };
      }) || [];

      logger.info('Partner referral links fetched successfully', { 
        userId: context.userId,
        linkCount: links.length 
      });

      return NextResponse.json({ links });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_partner_links_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      const body = await req.json();
      const { name, type, target_id, code, description, commission_rate } = body;

      logger.info('Creating referral link', { 
        userId: context.userId, 
        type,
        targetId: target_id,
        code 
      });

      const supabase = createServiceClient();

      // Validate target exists if specified
      if (type === 'product' && target_id) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, title')
          .eq('id', target_id)
          .eq('status', 'active')
          .single();

        if (productError || !product) {
          return NextResponse.json(
            { error: 'Product not found or not active' },
            { status: 404 }
          );
        }
      }

      // Generate unique code if not provided
      const referralCode = code || generateUniqueCode();

      // Check if code already exists
      const { data: existingLink } = await supabase
        .from('referrals')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (existingLink) {
        return NextResponse.json(
          { error: 'Referral code already exists' },
          { status: 400 }
        );
      }

      // Create referral link
      const { data: newLink, error: createError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: context.userId,
          product_id: target_id,
          referral_code: referralCode,
          reward_percent: commission_rate || 10,
        })
        .select()
        .single();

      if (createError) {
        logError(createError as Error, { action: 'create_referral_link', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to create referral link' },
          { status: 500 }
        );
      }

      // Create initial stats record
      await supabase
        .from('referral_stats')
        .insert({
          referral_id: newLink.id,
          click_count: 0,
          purchase_count: 0,
          total_earned: 0,
        });

      logger.info('Referral link created successfully', { 
        linkId: newLink.id,
        userId: context.userId,
        code: referralCode 
      });

      return NextResponse.json({ 
        id: newLink.id,
        code: referralCode,
        message: 'Referral link created successfully' 
      }, { status: 201 });

    } catch (error) {
      logError(error as Error, { 
        action: 'create_referral_link_api',
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
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'REF';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function fetchRecentReferrals(supabase: any, userId: string, limit: number) {
  // Mock recent referrals - replace with actual data
  return Array.from({ length: Math.min(limit, 5) }, (_, index) => ({
    id: `recent-${index}`,
    link_name: `Link ${index + 1}`,
    link_code: `REF${index + 1}`,
    product_name: `Product ${index + 1}`,
    customer_name: `Customer ${index + 1}`,
    commission: 15 + (index * 3),
    status: ['pending', 'confirmed', 'paid'][index % 3],
    created_at: new Date(Date.now() - (index * 12 * 60 * 60 * 1000)).toISOString(),
  }));
}

async function fetchPayoutInfo(supabase: any, userId: string) {
  // Get total earnings from referral stats
  const { data: totalStats } = await supabase
    .from('referral_stats')
    .select('total_earned')
    .eq('referral.referrer_id', userId);

  const totalEarnings = totalStats?.reduce((sum, stat) => sum + parseFloat(stat.total_earned), 0) || 0;

  return {
    pending_amount: totalEarnings * 0.8, // 80% pending, 20% paid
    next_payout_date: getNextPayoutDate(),
    total_paid: totalEarnings * 0.2,
    minimum_payout: 50,
  };
}

function getNextPayoutDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
