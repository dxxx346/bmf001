import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '@/services/notification.service';
import { defaultLogger as logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const preferences = await notificationService.getUserPreferences(user.id);

    // If no preferences exist, return default preferences
    if (preferences.length === 0) {
      const defaultPreferences = [
        // Order notifications
        { type: 'order_confirmation', channel: 'email', is_enabled: true, frequency: 'immediate' },
        { type: 'order_shipped', channel: 'email', is_enabled: true, frequency: 'immediate' },
        { type: 'order_delivered', channel: 'email', is_enabled: true, frequency: 'immediate' },
        
        // Payment notifications
        { type: 'payment_received', channel: 'email', is_enabled: true, frequency: 'immediate' },
        { type: 'payment_failed', channel: 'email', is_enabled: true, frequency: 'immediate' },
        
        // Product notifications
        { type: 'product_purchased', channel: 'email', is_enabled: true, frequency: 'immediate' },
        { type: 'product_review', channel: 'email', is_enabled: true, frequency: 'immediate' },
        
        // Account notifications
        { type: 'account_created', channel: 'email', is_enabled: true, frequency: 'immediate' },
        { type: 'account_verified', channel: 'email', is_enabled: true, frequency: 'immediate' },
        { type: 'password_reset', channel: 'email', is_enabled: true, frequency: 'immediate' },
        { type: 'security_alert', channel: 'email', is_enabled: true, frequency: 'immediate' },
        
        // Marketing notifications
        { type: 'marketing_promotion', channel: 'email', is_enabled: false, frequency: 'weekly' },
        { type: 'newsletter', channel: 'email', is_enabled: false, frequency: 'weekly' },
        
        // In-app notifications
        { type: 'order_confirmation', channel: 'in_app', is_enabled: true, frequency: 'immediate' },
        { type: 'payment_received', channel: 'in_app', is_enabled: true, frequency: 'immediate' },
        { type: 'product_purchased', channel: 'in_app', is_enabled: true, frequency: 'immediate' },
        
        // SMS for critical alerts only
        { type: 'security_alert', channel: 'sms', is_enabled: false, frequency: 'immediate' },
        { type: 'payment_failed', channel: 'sms', is_enabled: false, frequency: 'immediate' },
      ];

      return NextResponse.json({
        preferences: defaultPreferences,
        isDefault: true,
      });
    }

    return NextResponse.json({
      preferences,
      isDefault: false,
    });

  } catch (error) {
    logger.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/preferences
 * Update user notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { preferences } = body;

    if (!Array.isArray(preferences)) {
      return NextResponse.json(
        { error: 'Preferences must be an array' },
        { status: 400 }
      );
    }

    // Validate preference structure
    for (const pref of preferences) {
      if (!pref.type || !pref.channel || typeof pref.is_enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid preference structure' },
          { status: 400 }
        );
      }
    }

    await notificationService.updateUserPreferences(user.id, preferences);

    return NextResponse.json({
      message: 'Preferences updated successfully',
    });

  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
