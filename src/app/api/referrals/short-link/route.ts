import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/referral.service';
import { createServiceClient } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import { z } from 'zod';

const createShortLinkSchema = z.object({
  referralId: z.string().uuid(),
  originalUrl: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  expiresInDays: z.number().min(1).max(365).optional()
});

/**
 * POST /api/referrals/short-link
 * Create a short link for a referral
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createShortLinkSchema.parse(body);
    
    const referralService = new ReferralService();
    
    // Verify referral exists and user has access
    const supabase = createServiceClient();
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('id, referrer_id, referral_code')
      .eq('id', validatedData.referralId)
      .eq('is_active', true)
      .single();
    
    if (referralError || !referral) {
      return NextResponse.json(
        { error: 'Referral not found or inactive' },
        { status: 404 }
      );
    }
    
    // Create short link
    const shortLink = await referralService.createShortLink(
      validatedData.referralId,
      validatedData.originalUrl,
      validatedData.title,
      validatedData.description,
      validatedData.expiresInDays
    );
    
    const shortUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/s/${shortLink.short_code}`;
    
    return NextResponse.json({
      shortLink: {
        ...shortLink,
        shortUrl
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    
    logError(error as Error, { action: 'create_short_link' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/referrals/short-link?referralId=xxx
 * Get short links for a referral
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralId = searchParams.get('referralId');
    
    if (!referralId) {
      return NextResponse.json(
        { error: 'referralId parameter is required' },
        { status: 400 }
      );
    }
    
    const supabase = createServiceClient();
    const { data: shortLinks, error } = await supabase
      .from('short_links')
      .select('*')
      .eq('referral_id', referralId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Add full URLs to the response
    const shortLinksWithUrls = shortLinks.map(link => ({
      ...link,
      shortUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/s/${link.short_code}`
    }));
    
    return NextResponse.json({ shortLinks: shortLinksWithUrls });
  } catch (error) {
    logError(error as Error, { action: 'get_short_links' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
