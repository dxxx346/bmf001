import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analytics.service';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, properties, context, metadata } = body;

    if (!event_type) {
      return NextResponse.json(
        { error: 'event_type is required' },
        { status: 400 }
      );
    }

    await analyticsService.trackEvent(
      event_type,
      properties || {},
      context || {},
      metadata || {}
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error as Error, { action: 'track_analytics_event' });
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const eventType = searchParams.get('event_type');
    const userId = searchParams.get('user_id');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // This would typically query the analytics database
    // For now, return a placeholder response
    return NextResponse.json({
      data: [],
      total: 0,
      page: 1,
      limit: 100,
      has_more: false,
      query_time: 0,
      cached: false,
    });
  } catch (error) {
    logError(error as Error, { action: 'get_analytics_events' });
    return NextResponse.json(
      { error: 'Failed to retrieve events' },
      { status: 500 }
    );
  }
}
