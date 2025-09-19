import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analytics.service';
import { z } from 'zod';

const UserBehaviorQuerySchema = z.object({
  start_date: z.string(),
  end_date: z.string()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const { id: userId } = await params;

    const query = {
      start_date: searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: searchParams.get('end_date') || new Date().toISOString(),
      granularity: 'day' as const,
      metrics: ['count'],
      filters: {
        user_id: userId
      }
    };

    const result = await analyticsService.getUserBehaviorMetrics(userId, query.start_date, query.end_date);

    return NextResponse.json(result);
  } catch (error) {
    console.error('User behavior error:', error);
    return NextResponse.json(
      { error: 'Failed to get user behavior metrics' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { start_date, end_date } = UserBehaviorQuerySchema.parse(body);
    const { id: userId } = await params;

    const query = {
      start_date,
      end_date,
      granularity: 'day' as const,
      metrics: ['count'],
      filters: {
        user_id: userId
      }
    };

    const result = await analyticsService.getUserBehaviorMetrics(userId, query.start_date, query.end_date);

    return NextResponse.json(result);
  } catch (error) {
    console.error('User behavior error:', error);
    return NextResponse.json(
      { error: 'Failed to get user behavior metrics' },
      { status: 500 }
    );
  }
}
