import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analytics.service';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';

    const dashboardData = await analyticsService.getDashboardData(period);

    return NextResponse.json(dashboardData);
  } catch (error) {
    logError(error as Error, { action: 'get_analytics_dashboard' });
    return NextResponse.json(
      { error: 'Failed to retrieve dashboard data' },
      { status: 500 }
    );
  }
}
