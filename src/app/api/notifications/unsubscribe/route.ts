import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '@/services/notification.service';
import { defaultLogger as logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/notifications/unsubscribe
 * Process unsubscribe request using token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      );
    }

    await notificationService.processUnsubscribe(token);

    return NextResponse.json({
      message: 'Successfully unsubscribed from notifications',
    });

  } catch (error) {
    logger.error('Error processing unsubscribe:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('Invalid or expired')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/unsubscribe
 * Get unsubscribe token details for confirmation page
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      );
    }

    // Get token details without processing unsubscribe
    const { data: unsubscribeToken, error } = await supabase
      .from('unsubscribe_tokens')
      .select(`
        id,
        user_id,
        type,
        channel,
        expires_at,
        used_at,
        users (
          name,
          email
        )
      `)
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !unsubscribeToken) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      user: unsubscribeToken.users,
      type: unsubscribeToken.type,
      channel: unsubscribeToken.channel,
      expires_at: unsubscribeToken.expires_at,
    });

  } catch (error) {
    logger.error('Error fetching unsubscribe token details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
