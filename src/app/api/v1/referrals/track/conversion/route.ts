import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/referral.service';
import { FraudDetectionService } from '@/services/fraud-detection.service';
import { logError, logInfo } from '@/lib/logger';
import { z } from 'zod';

const trackConversionSchema = z.object({
  purchaseId: z.string().uuid(),
  cookieValue: z.string().optional()
});

/**
 * POST /api/referrals/track/conversion
 * Track referral conversion with fraud detection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = trackConversionSchema.parse(body);
    
    // Extract request info
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    
    const referralService = new ReferralService();
    const fraudService = new FraudDetectionService();
    
    // Process conversion with fraud detection
    const conversionResult = await referralService.processConversion(
      validatedData.purchaseId,
      validatedData.cookieValue,
      ipAddress,
      userAgent
    );
    
    if (!conversionResult) {
      return NextResponse.json({
        success: false,
        reason: 'No valid referral tracking found'
      });
    }
    
    // Additional fraud analysis for conversion
    const fraudAnalysis = await fraudService.analyzeConversion(
      conversionResult.conversion_id,
      validatedData.purchaseId,
      ipAddress || '',
      userAgent
    );
    
    logInfo('Referral conversion tracked', {
      purchaseId: validatedData.purchaseId,
      conversionId: conversionResult.conversion_id,
      commissionAmount: conversionResult.commission_amount,
      fraudScore: fraudAnalysis.riskScore,
      isVerified: conversionResult.is_verified
    });
    
    return NextResponse.json({
      success: true,
      conversion: {
        id: conversionResult.conversion_id,
        commissionAmount: conversionResult.commission_amount,
        isVerified: conversionResult.is_verified,
        tierLevel: conversionResult.tier_level,
        tierName: conversionResult.tier_name
      },
      fraudAnalysis: {
        riskScore: fraudAnalysis.riskScore,
        flagged: fraudAnalysis.shouldFlag,
        blocked: fraudAnalysis.shouldBlock,
        fraudTypes: fraudAnalysis.fraudTypes
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }
    
    logError(error as Error, { action: 'track_referral_conversion' });
    return NextResponse.json(
      { error: 'Failed to track conversion' },
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
