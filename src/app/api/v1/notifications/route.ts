import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '@/services/notification.service';
import { defaultLogger as logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/notifications
 * Get user notifications with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const channel = url.searchParams.get('channel') as any;
    const type = url.searchParams.get('type') as any;
    const isRead = url.searchParams.get('isRead');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify user authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notifications = await notificationService.getUserNotifications(userId, {
      channel,
      type,
      is_read: isRead !== null ? isRead === 'true' : undefined,
      limit,
      offset,
    });

    // Get unread count
    const unreadNotifications = await notificationService.getUserNotifications(userId, {
      is_read: false,
      limit: 1000, // Get count only
    });

    return NextResponse.json({
      notifications,
      unreadCount: unreadNotifications.length,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit,
      },
    });

  } catch (error) {
    logger.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification
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

    // Check if user is admin for creating notifications
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      user_id,
      type,
      channel,
      priority,
      title,
      message,
      html_content,
      subject,
      recipient_email,
      recipient_phone,
      template_id,
      locale,
      data,
      context,
      scheduled_at,
      expires_at,
    } = body;

    if (!user_id || !type || !channel || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, type, channel, title' },
        { status: 400 }
      );
    }

    const notification = await notificationService.createNotification({
      user_id,
      type,
      channel,
      priority,
      title,
      message,
      html_content,
      subject,
      recipient_email,
      recipient_phone,
      template_id,
      locale,
      data,
      context,
      scheduled_at,
      expires_at,
    });

    return NextResponse.json({
      notification,
      message: 'Notification created successfully',
    });

  } catch (error) {
    logger.error('Error creating notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
