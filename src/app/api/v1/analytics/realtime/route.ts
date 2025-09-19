import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analytics.service';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const realTimeMetrics = await analyticsService.getRealTimeMetrics();

    return NextResponse.json(realTimeMetrics);
  } catch (error) {
    logError(error as Error, { action: 'get_realtime_metrics' });
    return NextResponse.json(
      { error: 'Failed to retrieve real-time metrics' },
      { status: 500 }
    );
  }
}
