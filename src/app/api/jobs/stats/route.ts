import { NextRequest, NextResponse } from 'next/server';
import { getQueueStats } from '@/jobs/queue';
import { logError } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const stats = await getQueueStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error as Error, { context: 'get-queue-stats' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch queue statistics',
      },
      { status: 500 }
    );
  }
}
