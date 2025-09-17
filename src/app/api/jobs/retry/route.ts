import { NextRequest, NextResponse } from 'next/server';
import {
  emailQueue,
  fileProcessingQueue,
  analyticsQueue,
  paymentRetryQueue,
  referralCommissionQueue,
  dailyReportsQueue,
  weeklyReportsQueue,
  deadLetterQueue,
  QUEUE_NAMES
} from '@/jobs/queue';
import { logError } from '@/lib/logger';

export const runtime = 'nodejs';

const queueMap = {
  [QUEUE_NAMES.EMAIL_SENDING]: emailQueue,
  [QUEUE_NAMES.FILE_PROCESSING]: fileProcessingQueue,
  [QUEUE_NAMES.ANALYTICS_AGGREGATION]: analyticsQueue,
  [QUEUE_NAMES.PAYMENT_RETRY]: paymentRetryQueue,
  [QUEUE_NAMES.REFERRAL_COMMISSION]: referralCommissionQueue,
  [QUEUE_NAMES.DAILY_REPORTS]: dailyReportsQueue,
  [QUEUE_NAMES.WEEKLY_REPORTS]: weeklyReportsQueue,
  [QUEUE_NAMES.DEAD_LETTER]: deadLetterQueue,
};

export async function POST(request: NextRequest) {
  try {
    const { queueName, jobId } = await request.json();

    if (!queueName || !jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Queue name and job ID are required',
        },
        { status: 400 }
      );
    }

    const queue = queueMap[queueName as keyof typeof queueMap];

    if (!queue) {
      return NextResponse.json(
        {
          success: false,
          error: 'Queue not found',
        },
        { status: 404 }
      );
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
        },
        { status: 404 }
      );
    }

    // Retry the job
    await job.retry();

    return NextResponse.json({
      success: true,
      message: 'Job retried successfully',
      jobId,
    });
  } catch (error) {
    logError(error as Error, { context: 'retry-job' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retry job',
      },
      { status: 500 }
    );
  }
}
