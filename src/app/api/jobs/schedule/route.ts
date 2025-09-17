import { NextRequest, NextResponse } from 'next/server';
import { scheduleRecurringJobs } from '@/jobs/queue';
import { logError } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await scheduleRecurringJobs();

    return NextResponse.json({
      success: true,
      message: 'Recurring jobs scheduled successfully',
    });
  } catch (error) {
    logError(error as Error, { context: 'schedule-recurring-jobs' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to schedule recurring jobs',
      },
      { status: 500 }
    );
  }
}
