import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/referral.service';
import { logError, logInfo } from '@/lib/logger';

/**
 * GET /s/[shortCode]
 * Handle short link redirects
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { shortCode: string } }
) {
  try {
    const { shortCode } = params;
    
    if (!shortCode) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    const referralService = new ReferralService();
    
    // Track click and get redirect info
    const clickResult = await referralService.trackShortLinkClick(shortCode);
    
    if (!clickResult) {
      // Short link not found or expired
      return NextResponse.redirect(new URL('/?error=link-expired', request.url));
    }
    
    // Extract request information for tracking
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const referrerUrl = request.headers.get('referer') || undefined;
    
    // Track the referral click
    await referralService.trackReferralClick(clickResult.referralId, {
      ip,
      userAgent,
      referrerUrl
    });
    
    logInfo('Short link clicked', {
      shortCode,
      referralId: clickResult.referralId,
      redirectUrl: clickResult.redirectUrl,
      ip,
      userAgent
    });
    
    // Build redirect URL with referral parameter
    const redirectUrl = new URL(clickResult.redirectUrl);
    
    // Add referral code as query parameter if not already present
    if (!redirectUrl.searchParams.has('ref')) {
      // Get referral code from database
       
      const { data: referral } = await (referralService as any).supabase
        .from('referrals')
        .select('referral_code')
        .eq('id', clickResult.referralId)
        .single();
      
      if (referral) {
        redirectUrl.searchParams.set('ref', referral.referral_code);
      }
    }
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    logError(error as Error, { action: 'short_link_redirect', shortCode: params.shortCode });
    return NextResponse.redirect(new URL('/?error=link-error', request.url));
  }
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string | undefined {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIp) {
    return xRealIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  );
}
