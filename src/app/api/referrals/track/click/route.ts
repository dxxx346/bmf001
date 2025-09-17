import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/referral.service';
import { FraudDetectionService } from '@/services/fraud-detection.service';
import { logError, logInfo } from '@/lib/logger';
import { z } from 'zod';

const trackClickSchema = z.object({
  referralCode: z.string(),
  landingPage: z.string().url().optional(),
  referrerUrl: z.string().url().optional()
});

/**
 * POST /api/referrals/track/click
 * Track referral click with fraud detection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = trackClickSchema.parse(body);
    
    // Extract request info
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const country = request.headers.get('cf-ipcountry') || undefined;
    const city = request.headers.get('cf-city') || undefined;
    
    const referralService = new ReferralService();
    const fraudService = new FraudDetectionService();
    
    // Get referral details first
    const { data: referral, error: referralError } = await (referralService as any).supabase
      .from('referrals')
      .select('id, referrer_id, is_active')
      .eq('referral_code', validatedData.referralCode)
      .eq('is_active', true)
      .single();
    
    if (referralError || !referral) {
      return NextResponse.json(
        { error: 'Referral code not found or inactive' },
        { status: 404 }
      );
    }
    
    // Perform fraud analysis
    const fraudAnalysis = await fraudService.analyzeClick(
      referral.id,
      ipAddress || '',
      userAgent,
      validatedData.referrerUrl
    );
    
    // Check if click should be blocked
    if (fraudAnalysis.shouldBlock) {
      logInfo('Referral click blocked due to fraud detection', {
        referralCode: validatedData.referralCode,
        riskScore: fraudAnalysis.riskScore,
        fraudTypes: fraudAnalysis.fraudTypes,
        ipAddress
      });
      
      return NextResponse.json({
        success: false,
        blocked: true,
        reason: 'Suspicious activity detected',
        riskScore: fraudAnalysis.riskScore
      });
    }
    
    // Create tracking cookie
    const tracking = await referralService.createTrackingCookie(
      validatedData.referralCode,
      {
        ip: ipAddress,
        userAgent,
        referrerUrl: validatedData.referrerUrl,
        landingPage: validatedData.landingPage,
        country,
        city
      }
    );
    
    logInfo('Referral click tracked successfully', {
      referralCode: validatedData.referralCode,
      trackingId: tracking.id,
      riskScore: fraudAnalysis.riskScore,
      ipAddress
    });
    
    return NextResponse.json({
      success: true,
      trackingId: tracking.id,
      cookieValue: tracking.cookie_value,
      expiresAt: tracking.expires_at,
      fraudAnalysis: {
        riskScore: fraudAnalysis.riskScore,
        flagged: fraudAnalysis.shouldFlag,
        recommendations: fraudAnalysis.recommendations
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    
    logError(error as Error, { action: 'track_referral_click' });
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
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
