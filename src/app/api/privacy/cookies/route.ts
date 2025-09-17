import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get cookie categories and their cookies
    const { data: categories, error: categoriesError } = await supabase
      .from('cookie_categories')
      .select(`
        *,
        cookies (*)
      `)
      .eq('is_active', true)
      .order('id');

    if (categoriesError) {
      logger.error('Failed to fetch cookie categories', { error: categoriesError.message });
      return NextResponse.json(
        { error: 'Failed to fetch cookie categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      categories: categories || [],
    });

  } catch (error) {
    logger.error('Error fetching cookie categories', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session (optional for cookie consent)
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Cookie preferences are required' },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '0.0.0.0';
    const userAgent = request.headers.get('user-agent') || '';

    // If user is logged in, store preferences in database
    if (user) {
      const consentRecords: Array<{
        user_id: string;
        consent_type: string;
        status: string;
        version: string;
        consented_at: string | null;
        ip_address: string;
        user_agent: string;
      }> = [];
      const timestamp = new Date().toISOString();

      for (const [category, accepted] of Object.entries(preferences)) {
        if (typeof accepted === 'boolean') {
          consentRecords.push({
            user_id: user.id,
            consent_type: `cookies_${category}`,
            status: accepted ? 'accepted' : 'declined',
            version: '1.0',
            consented_at: accepted ? timestamp : null,
            ip_address: clientIP,
            user_agent: userAgent,
          });
        }
      }

      if (consentRecords.length > 0) {
        const { error } = await supabase
          .from('user_consents')
          .upsert(consentRecords, {
            onConflict: 'user_id,consent_type,version',
          });

        if (error) {
          logger.error('Failed to store cookie consent', { error: error.message, userId: user.id });
          return NextResponse.json(
            { error: 'Failed to store cookie consent' },
            { status: 500 }
          );
        }
      }

      logger.info('Cookie consent stored for user', { userId: user.id, preferences });
    }

    // Create response with consent cookie
    const response = NextResponse.json({
      success: true,
      message: 'Cookie preferences saved successfully',
    });

    // Set cookie consent in browser
    const consentValue = JSON.stringify({
      preferences,
      timestamp: new Date().toISOString(),
      version: '1.0',
    });

    response.cookies.set('cookie_consent', consentValue, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      httpOnly: false, // Need to be accessible by JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return response;

  } catch (error) {
    logger.error('Error saving cookie preferences', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
