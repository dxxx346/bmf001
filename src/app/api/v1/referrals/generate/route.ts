import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/referral.service';
import { createServiceClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { z } from 'zod';

const generateReferralSchema = z.object({
  productId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  rewardType: z.enum(['percentage', 'fixed']).default('percentage'),
  rewardValue: z.number().min(0).max(100).default(10),
  expiresInDays: z.number().min(1).max(365).optional()
});

/**
 * POST /api/referrals/generate
 * Generate a new referral code for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has partner role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile?.role !== 'partner') {
      return NextResponse.json(
        { error: 'Partner role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = generateReferralSchema.parse(body);

    // Validate product/shop ownership if specified
    if (validatedData.productId) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', validatedData.productId)
        .single();

      if (productError || product?.seller_id !== user.id) {
        return NextResponse.json(
          { error: 'Product not found or not owned by user' },
          { status: 404 }
        );
      }
    }

    if (validatedData.shopId) {
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('owner_id')
        .eq('id', validatedData.shopId)
        .single();

      if (shopError || shop?.owner_id !== user.id) {
        return NextResponse.json(
          { error: 'Shop not found or not owned by user' },
          { status: 404 }
        );
      }
    }

    const referralService = new ReferralService();
    
    // Generate referral code
    const referral = await referralService.generateReferralCode(
      user.id,
      validatedData.productId,
      validatedData.shopId,
      validatedData.rewardType,
      validatedData.rewardValue,
      validatedData.expiresInDays
    );

    // Create default short link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const originalUrl = validatedData.productId 
      ? `${baseUrl}/products/${validatedData.productId}?ref=${referral.referral_code}`
      : validatedData.shopId
      ? `${baseUrl}/shops/${validatedData.shopId}?ref=${referral.referral_code}`
      : `${baseUrl}?ref=${referral.referral_code}`;

    const shortLink = await referralService.createShortLink(
      referral.id,
      originalUrl,
      `Referral - ${referral.referral_code}`
    );

    return NextResponse.json({
      referral: {
        ...referral,
        referralUrl: originalUrl,
        shortUrl: `${baseUrl}/s/${shortLink.short_code}`
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }

    logError(error as Error, { action: 'generate_referral' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/referrals/generate
 * Get user's existing referral codes
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const shopId = searchParams.get('shopId');

    let query = supabase
      .from('referrals')
      .select(`
        *,
        products:product_id(id, title),
        shops:shop_id(id, name),
        referral_stats(*)
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data: referrals, error } = await query;

    if (error) {
      throw error;
    }

    // Add URLs to each referral
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const referralsWithUrls = referrals.map(referral => {
      const originalUrl = referral.product_id 
        ? `${baseUrl}/products/${referral.product_id}?ref=${referral.referral_code}`
        : referral.shop_id
        ? `${baseUrl}/shops/${referral.shop_id}?ref=${referral.referral_code}`
        : `${baseUrl}?ref=${referral.referral_code}`;

      return {
        ...referral,
        referralUrl: originalUrl
      };
    });

    return NextResponse.json({ referrals: referralsWithUrls });

  } catch (error) {
    logError(error as Error, { action: 'get_referrals' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
