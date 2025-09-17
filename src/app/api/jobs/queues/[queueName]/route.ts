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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueName: string }> }
) {
  try {
    const { queueName } = await params;
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

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        queueName,
        waiting: waiting.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress,
          createdAt: job.timestamp,
          delay: job.delay,
          priority: job.opts.priority,
        })),
        active: active.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress,
          processedOn: job.processedOn,
          attemptsMade: job.attemptsMade,
        })),
        completed: completed.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          returnvalue: job.returnvalue,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
        })),
        failed: failed.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          failedReason: job.failedReason,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade,
        })),
        delayed: delayed.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          delay: job.delay,
          createdAt: job.timestamp,
          priority: job.opts.priority,
        })),
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          total: waiting.length + active.length + completed.length + failed.length + delayed.length,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error as Error, { context: 'get-queue-details' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch queue details',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ queueName: string }> }
) {
  try {
    const { queueName } = await params;
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const jobType = searchParams.get('type') || 'all';

    if (jobId) {
      // Delete specific job
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        return NextResponse.json({
          success: true,
          message: 'Job deleted successfully',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Job not found',
          },
          { status: 404 }
        );
      }
    } else {
      // Clear jobs by type
      switch (jobType) {
        case 'waiting':
          await queue.obliterate({ force: true });
          break;
        case 'completed':
          await queue.clean(0, 100, 'completed');
          break;
        case 'failed':
          await queue.clean(0, 100, 'failed');
          break;
        case 'all':
          await queue.obliterate({ force: true });
          break;
        default:
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid job type',
            },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        message: `Cleared ${jobType} jobs from ${queueName}`,
      });
    }
  } catch (error) {
    logError(error as Error, { context: 'delete-queue-jobs' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete jobs',
      },
      { status: 500 }
    );
  }
}
