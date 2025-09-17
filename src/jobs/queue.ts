import { Queue } from 'bullmq';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import redis from '@/lib/redis';

// Queue names
export const QUEUE_NAMES = {
  EMAIL_SENDING: 'email-sending',
  FILE_PROCESSING: 'file-processing',
  ANALYTICS_AGGREGATION: 'analytics-aggregation',
  PAYMENT_RETRY: 'payment-retry',
  REFERRAL_COMMISSION: 'referral-commission',
  DAILY_REPORTS: 'daily-reports',
  WEEKLY_REPORTS: 'weekly-reports',
  DEAD_LETTER: 'dead-letter',
} as const;

// Common queue options with dead letter queue
const createQueueOptions = (queueName: string) => ({
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
  },
});

// Create queues
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL_SENDING, {
  ...createQueueOptions(QUEUE_NAMES.EMAIL_SENDING),
  defaultJobOptions: {
    ...createQueueOptions(QUEUE_NAMES.EMAIL_SENDING).defaultJobOptions,
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
  },
});

export const fileProcessingQueue = new Queue(QUEUE_NAMES.FILE_PROCESSING, {
  ...createQueueOptions(QUEUE_NAMES.FILE_PROCESSING),
  defaultJobOptions: {
    ...createQueueOptions(QUEUE_NAMES.FILE_PROCESSING).defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
  },
});

export const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS_AGGREGATION, {
  ...createQueueOptions(QUEUE_NAMES.ANALYTICS_AGGREGATION),
  defaultJobOptions: {
    ...createQueueOptions(QUEUE_NAMES.ANALYTICS_AGGREGATION).defaultJobOptions,
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 10000,
    },
  },
});

export const paymentRetryQueue = new Queue(QUEUE_NAMES.PAYMENT_RETRY, {
  ...createQueueOptions(QUEUE_NAMES.PAYMENT_RETRY),
  defaultJobOptions: {
    ...createQueueOptions(QUEUE_NAMES.PAYMENT_RETRY).defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 30000, // 30 seconds initial delay
    },
  },
});

export const referralCommissionQueue = new Queue(QUEUE_NAMES.REFERRAL_COMMISSION, {
  ...createQueueOptions(QUEUE_NAMES.REFERRAL_COMMISSION),
  defaultJobOptions: {
    ...createQueueOptions(QUEUE_NAMES.REFERRAL_COMMISSION).defaultJobOptions,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
  },
});

export const dailyReportsQueue = new Queue(QUEUE_NAMES.DAILY_REPORTS, {
  ...createQueueOptions(QUEUE_NAMES.DAILY_REPORTS),
  defaultJobOptions: {
    ...createQueueOptions(QUEUE_NAMES.DAILY_REPORTS).defaultJobOptions,
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
  },
});

export const weeklyReportsQueue = new Queue(QUEUE_NAMES.WEEKLY_REPORTS, {
  ...createQueueOptions(QUEUE_NAMES.WEEKLY_REPORTS),
  defaultJobOptions: {
    ...createQueueOptions(QUEUE_NAMES.WEEKLY_REPORTS).defaultJobOptions,
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 10000,
    },
  },
});

export const deadLetterQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
    attempts: 1, // No retries for dead letter jobs
  },
});

// Job data types
export interface EmailJobData {
  to: string | string[];
  template: string;
  data: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
  subject?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface FileProcessingJobData {
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  userId: string;
  productId?: string;
  processingType: 'virus_scan' | 'optimization' | 'thumbnail_generation' | 'format_conversion';
  options?: {
    maxSize?: number;
    allowedFormats?: string[];
    quality?: number;
    dimensions?: { width: number; height: number };
  };
}

export interface AnalyticsAggregationJobData {
  type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dateRange: {
    start: string;
    end: string;
  };
  metrics: string[];
  userId?: string;
  shopId?: string;
  productId?: string;
}

export interface PaymentRetryJobData {
  paymentId: string;
  userId: string;
  productId: string;
  amount: number;
  currency: string;
  provider: 'stripe' | 'yookassa' | 'crypto';
  retryCount: number;
  lastError?: string;
  originalTransactionId?: string;
}

export interface ReferralCommissionJobData {
  referralId: string;
  referrerId: string;
  buyerId: string;
  productId: string;
  purchaseId: string;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
}

export interface DailyReportsJobData {
  date: string;
  reportType: 'sales' | 'users' | 'products' | 'referrals' | 'all';
  recipients: string[];
  format: 'pdf' | 'csv' | 'json';
  includeCharts?: boolean;
}

export interface WeeklyReportsJobData {
  weekStart: string;
  weekEnd: string;
  reportType: 'sales' | 'users' | 'products' | 'referrals' | 'all';
  recipients: string[];
  format: 'pdf' | 'csv' | 'json';
  includeCharts?: boolean;
  includeComparisons?: boolean;
}

export interface DeadLetterJobData {
  originalQueue: string;
  originalJobId: string;
  originalData: any;
  error: string;
  failedAt: string;
  retryCount: number;
}

// Queue management functions
export async function addEmailJob(data: EmailJobData, delay?: number) {
  const priority = data.priority === 'high' ? 1 : data.priority === 'low' ? 3 : 2;
  const job = await emailQueue.add('send-email', data, {
    delay,
    priority,
  });
  logger.info('Email job added', {
    jobId: job.id,
    to: Array.isArray(data.to) ? data.to.join(', ') : data.to,
    template: data.template,
  });
  return job;
}

export async function addFileProcessingJob(data: FileProcessingJobData, delay?: number) {
  const job = await fileProcessingQueue.add('process-file', data, {
    delay,
    priority: 1, // High priority for file processing
  });
  logger.info('File processing job added', {
    jobId: job.id,
    fileId: data.fileId,
    processingType: data.processingType,
  });
  return job;
}

export async function addAnalyticsJob(data: AnalyticsAggregationJobData, delay?: number) {
  const job = await analyticsQueue.add('aggregate-analytics', data, {
    delay,
    priority: 3, // Low priority for analytics
  });
  logger.info('Analytics job added', {
    jobId: job.id,
    type: data.type,
    dateRange: data.dateRange,
  });
  return job;
}

export async function addPaymentRetryJob(data: PaymentRetryJobData, delay?: number) {
  const job = await paymentRetryQueue.add('retry-payment', data, {
    delay,
    priority: 1, // High priority for payment retries
  });
  logger.info('Payment retry job added', {
    jobId: job.id,
    paymentId: data.paymentId,
    retryCount: data.retryCount,
  });
  return job;
}

export async function addReferralCommissionJob(data: ReferralCommissionJobData, delay?: number) {
  const job = await referralCommissionQueue.add('calculate-commission', data, {
    delay,
    priority: 2,
  });
  logger.info('Referral commission job added', {
    jobId: job.id,
    referralId: data.referralId,
    commissionAmount: data.commissionAmount,
  });
  return job;
}

export async function addDailyReportsJob(data: DailyReportsJobData, delay?: number) {
  const job = await dailyReportsQueue.add('generate-daily-report', data, {
    delay,
    priority: 3,
  });
  logger.info('Daily reports job added', {
    jobId: job.id,
    date: data.date,
    reportType: data.reportType,
  });
  return job;
}

export async function addWeeklyReportsJob(data: WeeklyReportsJobData, delay?: number) {
  const job = await weeklyReportsQueue.add('generate-weekly-report', data, {
    delay,
    priority: 3,
  });
  logger.info('Weekly reports job added', {
    jobId: job.id,
    weekStart: data.weekStart,
    weekEnd: data.weekEnd,
    reportType: data.reportType,
  });
  return job;
}

// Commission payout jobs
export async function addCommissionPayoutJob(
  data: { referrerId: string; periodStart: string; periodEnd: string; paymentMethod?: string; minimumPayout?: number },
  delay?: number
) {
  const job = await referralCommissionQueue.add('process-commission-payout', data, {
    delay,
    priority: 2,
  });
  logger.info('Commission payout job added', {
    jobId: job.id,
    referrerId: data.referrerId,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
  });
  return job;
}

export async function addBulkCommissionPayoutsJob(
  data: { periodStart: string; periodEnd: string; minimumPayout?: number; paymentMethod?: string },
  delay?: number
) {
  const job = await referralCommissionQueue.add('bulk-commission-payouts', data, {
    delay,
    priority: 2,
  });
  logger.info('Bulk commission payouts job added', {
    jobId: job.id,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
  });
  return job;
}

export async function addDeadLetterJob(data: DeadLetterJobData) {
  const job = await deadLetterQueue.add('dead-letter', data, {
    priority: 1,
  });
  logger.info('Dead letter job added', {
    jobId: job.id,
    originalQueue: data.originalQueue,
    originalJobId: data.originalJobId,
  });
  return job;
}

// Schedule recurring jobs
export async function scheduleRecurringJobs() {
  try {
    // Schedule daily reports at 6 AM UTC
    await dailyReportsQueue.add(
      'daily-reports-scheduler',
      { scheduled: true },
      {
        repeat: { pattern: '0 6 * * *' },
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    // Schedule weekly reports on Mondays at 8 AM UTC
    await weeklyReportsQueue.add(
      'weekly-reports-scheduler',
      { scheduled: true },
      {
        repeat: { pattern: '0 8 * * 1' },
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    // Schedule analytics aggregation every hour
    await analyticsQueue.add(
      'hourly-analytics-scheduler',
      { scheduled: true },
      {
        repeat: { pattern: '0 * * * *' },
        removeOnComplete: 24,
        removeOnFail: 5,
      }
    );

    logger.info('Recurring jobs scheduled successfully');
  } catch (error) {
    logError(error as Error, { context: 'scheduleRecurringJobs' });
  }
}

// Queue monitoring functions
export async function getQueueStats() {
  const queues = [
    { name: 'Email Sending', queue: emailQueue },
    { name: 'File Processing', queue: fileProcessingQueue },
    { name: 'Analytics Aggregation', queue: analyticsQueue },
    { name: 'Payment Retry', queue: paymentRetryQueue },
    { name: 'Referral Commission', queue: referralCommissionQueue },
    { name: 'Daily Reports', queue: dailyReportsQueue },
    { name: 'Weekly Reports', queue: weeklyReportsQueue },
    { name: 'Dead Letter', queue: deadLetterQueue },
  ];

  const stats = await Promise.all(
    queues.map(async ({ name, queue }) => {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      const delayed = await queue.getDelayed();

      return {
        name,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };
    })
  );

  return stats;
}

// Graceful shutdown
export async function closeQueues() {
  await Promise.all([
    emailQueue.close(),
    fileProcessingQueue.close(),
    analyticsQueue.close(),
    paymentRetryQueue.close(),
    referralCommissionQueue.close(),
    dailyReportsQueue.close(),
    weeklyReportsQueue.close(),
    deadLetterQueue.close(),
  ]);
  logger.info('All queues closed');
}
