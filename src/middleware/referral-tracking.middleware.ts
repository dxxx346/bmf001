import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/referral.service';
import { logError, logInfo } from '@/lib/logger';

const REFERRAL_COOKIE_NAME = 'ref_tracking';
const REFERRAL_PARAM = 'ref';

/**
 * Middleware to handle referral tracking with 30-day cookies
 */
export async function referralTrackingMiddleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  
  try {
    const referralService = new ReferralService();
    const url = new URL(request.url);
    const referralCode = url.searchParams.get(REFERRAL_PARAM);
    
    // Check if there's a referral code in the URL
    if (referralCode) {
      await handleReferralClick(request, response, referralCode, referralService);
    }
    
    // Check for existing referral cookie and extend if needed
    const existingCookie = request.cookies.get(REFERRAL_COOKIE_NAME);
    if (existingCookie) {
      await extendCookieIfNeeded(existingCookie.value, response, referralService);
    }
    
    return response;
  } catch (error) {
    logError(error as Error, { action: 'referral_tracking_middleware' });
    return response;
  }
}

/**
 * Handle new referral click and create tracking cookie
 */
async function handleReferralClick(
  request: NextRequest,
  response: NextResponse,
  referralCode: string,
  referralService: ReferralService
): Promise<void> {
  try {
    // Extract request information
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const referrerUrl = request.headers.get('referer') || undefined;
    const landingPage = request.url;
    
    // Get geolocation info if available (you could integrate with a service like MaxMind)
    const geoInfo = await getGeoLocation(ip);
    
    // Create tracking cookie
    const tracking = await referralService.createTrackingCookie(referralCode, {
      ip,
      userAgent,
      referrerUrl,
      landingPage,
      country: geoInfo?.country,
      city: geoInfo?.city
    });
    
    // Set cookie for 30 days
    const cookieOptions = {
      name: REFERRAL_COOKIE_NAME,
      value: tracking.cookie_value,
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    };
    
    response.cookies.set(cookieOptions);
    
    logInfo('Referral tracking cookie set', {
      referralCode,
      cookieValue: tracking.cookie_value,
      ip,
      userAgent
    });
    
    // Remove referral parameter from URL to clean it up
    const url = new URL(request.url);
    url.searchParams.delete(REFERRAL_PARAM);
    
    // Redirect to clean URL
    if (url.search !== new URL(request.url).search) {
      response.headers.set('Location', url.toString());
      (response as any).status = 302;
      return;
    }
  } catch (error) {
    logError(error as Error, { action: 'handle_referral_click', referralCode });
  }
}

/**
 * Extend cookie expiration if it's still valid
 */
async function extendCookieIfNeeded(
  cookieValue: string,
  response: NextResponse,
  referralService: ReferralService
): Promise<void> {
  try {
    // Check if cookie is still valid in database
     
    const { data: tracking, error } = await (referralService as any).supabase
      .from('referral_tracking')
      .select('expires_at, is_active')
      .eq('cookie_value', cookieValue)
      .eq('is_active', true)
      .single();
    
    if (error || !tracking) {
      // Cookie is invalid, remove it
      response.cookies.delete(REFERRAL_COOKIE_NAME);
      return;
    }
    
    // Check if cookie expires within 7 days, extend it
    const expiresAt = new Date(tracking.expires_at);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    if (expiresAt < sevenDaysFromNow) {
      // Extend cookie and database record
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
       
      await (referralService as any).supabase
        .from('referral_tracking')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('cookie_value', cookieValue);
      
      // Update browser cookie
      response.cookies.set({
        name: REFERRAL_COOKIE_NAME,
        value: cookieValue,
        maxAge: 30 * 24 * 60 * 60,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      
      logInfo('Referral tracking cookie extended', { cookieValue });
    }
  } catch (error) {
    logError(error as Error, { action: 'extend_cookie_if_needed', cookieValue });
  }
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string | undefined {
  // Check various headers for the real IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIp) {
    return xRealIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to request IP
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  );
}

/**
 * Get geolocation information from IP
 * This is a placeholder - you should integrate with a real service like MaxMind or ipinfo.io
 */
async function getGeoLocation(ip?: string): Promise<{ country?: string; city?: string } | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return null;
  }
  
  try {
    // Placeholder for geo service integration
    // You could use services like:
    // - MaxMind GeoLite2
    // - ipinfo.io
    // - ip-api.com
    // - Cloudflare's CF-IPCountry header
    
    // For now, return null - implement your preferred geo service
    return null;
  } catch (error) {
    logError(error as Error, { action: 'get_geo_location', ip });
    return null;
  }
}

/**
 * Utility function to get referral cookie value from request
 */
export function getReferralCookie(request: NextRequest): string | undefined {
  return request.cookies.get(REFERRAL_COOKIE_NAME)?.value;
}

/**
 * Utility function to clear referral cookie
 */
export function clearReferralCookie(response: NextResponse): void {
  response.cookies.delete(REFERRAL_COOKIE_NAME);
}
