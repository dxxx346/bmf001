import { NextRequest, NextResponse } from 'next/server';
import { gdprService } from '@/services/gdpr.service';
import { createServerClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { termsVersion, privacyPolicyVersion } = body;

    // Validate required fields
    if (!termsVersion || !privacyPolicyVersion) {
      return NextResponse.json(
        { error: 'Terms version and privacy policy version are required' },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '0.0.0.0';
    const userAgent = request.headers.get('user-agent') || '';

    // Record terms acceptance
    const result = await gdprService.recordTermsAcceptance({
      userId: user.id,
      termsVersion,
      privacyPolicyVersion,
      ipAddress: clientIP,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    logger.info('Terms acceptance recorded via API', { 
      userId: user.id, 
      termsVersion,
      privacyPolicyVersion 
    });

    return NextResponse.json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    logger.error('Error in terms acceptance API endpoint', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's terms acceptance history
    const { data: acceptances, error } = await supabase
      .from('terms_acceptances')
      .select('*')
      .eq('user_id', user.id)
      .order('accepted_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch terms acceptances', { error: error.message, userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch terms acceptance history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      acceptances: acceptances || [],
    });

  } catch (error) {
    logger.error('Error fetching terms acceptance history', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
