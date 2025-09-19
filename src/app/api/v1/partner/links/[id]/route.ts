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
      logger.info('Fetching partner referral link', { userId: context.userId, linkId });

      const supabase = createServiceClient();
      
      const { data: referralLink, error } = await supabase
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
        .eq('id', linkId)
        .eq('referrer_id', context.userId)
        .single();

      if (error) {
        logError(error as Error, { action: 'get_partner_link', userId: context.userId, linkId });
        return NextResponse.json(
          { error: 'Failed to fetch referral link' },
          { status: 500 }
        );
      }

      if (!referralLink) {
        return NextResponse.json(
          { error: 'Referral link not found' },
          { status: 404 }
        );
      }

      // Transform data for frontend
      const stats = referralLink.stats?.[0] || { click_count: 0, purchase_count: 0, total_earned: '0' };
      const clicks = stats.click_count || 0;
      const conversions = stats.purchase_count || 0;
      const earnings = parseFloat(stats.total_earned) || 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      const link = {
        id: referralLink.id,
        name: referralLink.product?.title ? `${referralLink.product.title} Referral` : `Link ${referralLink.referral_code}`,
        code: referralLink.referral_code,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/${referralLink.product?.id}?ref=${referralLink.referral_code}`,
        short_url: `${process.env.NEXT_PUBLIC_SITE_URL}/r/${referralLink.referral_code}`,
        type: 'product' as const,
        target_id: referralLink.product?.id,
        target_name: referralLink.product?.title,
        commission_rate: referralLink.reward_percent,
        clicks,
        conversions,
        earnings,
        conversion_rate: conversionRate,
        status: 'active' as const, // Default status
        created_at: referralLink.created_at,
        last_click_at: null, // Would track from click events
      };

      logger.info('Partner referral link fetched successfully', { 
        userId: context.userId,
        linkId 
      });

      return NextResponse.json({ link });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_partner_link_api',
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      const linkId = params.id;
      const body = await req.json();
      const { status, name, commission_rate } = body;

      logger.info('Updating partner referral link', { 
        userId: context.userId, 
        linkId,
        updates: body
      });

      const supabase = createServiceClient();

      // Verify link ownership
      const { data: existingLink, error: fetchError } = await supabase
        .from('referrals')
        .select('id')
        .eq('id', linkId)
        .eq('referrer_id', context.userId)
        .single();

      if (fetchError || !existingLink) {
        return NextResponse.json(
          { error: 'Referral link not found' },
          { status: 404 }
        );
      }

      // Build update object
      const updates: any = {};
      if (commission_rate !== undefined) {
        updates.reward_percent = commission_rate;
      }

      // Update referral link
      const { data: updatedLink, error: updateError } = await supabase
        .from('referrals')
        .update(updates)
        .eq('id', linkId)
        .select()
        .single();

      if (updateError) {
        logError(updateError as Error, { action: 'update_referral_link', userId: context.userId, linkId });
        return NextResponse.json(
          { error: 'Failed to update referral link' },
          { status: 500 }
        );
      }

      logger.info('Referral link updated successfully', { 
        linkId,
        userId: context.userId
      });

      return NextResponse.json({ 
        message: 'Referral link updated successfully',
        link: updatedLink
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'update_referral_link_api',
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      const linkId = params.id;
      logger.info('Deleting partner referral link', { userId: context.userId, linkId });

      const supabase = createServiceClient();

      // Verify link ownership
      const { data: existingLink, error: fetchError } = await supabase
        .from('referrals')
        .select('id')
        .eq('id', linkId)
        .eq('referrer_id', context.userId)
        .single();

      if (fetchError || !existingLink) {
        return NextResponse.json(
          { error: 'Referral link not found' },
          { status: 404 }
        );
      }

      // Delete referral stats first (if cascade delete is not set up)
      await supabase
        .from('referral_stats')
        .delete()
        .eq('referral_id', linkId);

      // Delete referral link
      const { error: deleteError } = await supabase
        .from('referrals')
        .delete()
        .eq('id', linkId);

      if (deleteError) {
        logError(deleteError as Error, { action: 'delete_referral_link', userId: context.userId, linkId });
        return NextResponse.json(
          { error: 'Failed to delete referral link' },
          { status: 500 }
        );
      }

      logger.info('Referral link deleted successfully', { 
        linkId,
        userId: context.userId
      });

      return NextResponse.json({ 
        message: 'Referral link deleted successfully'
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'delete_referral_link_api',
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
