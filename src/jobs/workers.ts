import { Worker, Job } from 'bullmq';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import {
  emailQueue,
  fileProcessingQueue,
  analyticsQueue,
  paymentRetryQueue,
  referralCommissionQueue,
  dailyReportsQueue,
  weeklyReportsQueue,
  deadLetterQueue,
  EmailJobData,
  FileProcessingJobData,
  AnalyticsAggregationJobData,
  PaymentRetryJobData,
  ReferralCommissionJobData,
  DailyReportsJobData,
  WeeklyReportsJobData,
  DeadLetterJobData,
  addDeadLetterJob,
  addPaymentRetryJob,
} from './queue';
import { createServerClient } from '@/lib/supabase';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

// Email sending worker
const emailWorker = new Worker(
  'email-sending',
  async (job: Job<EmailJobData>) => {
    const { to, template, data, subject, attachments } = job.data;

    try {
      logger.info('Processing email job', {
        jobId: job.id,
        to: Array.isArray(to) ? to.join(', ') : to,
        template,
        subject,
      });

      // Simulate email sending - replace with actual email service
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
      // Example:
      // await emailService.send({
      //   to,
      //   template,
      //   data,
      //   subject,
      //   attachments,
      // });

      logger.info('Email job completed', {
        jobId: job.id,
        to: Array.isArray(to) ? to.join(', ') : to,
        template,
      });
    } catch (error) {
      logError(error as Error, {
        jobId: job.id,
        to: Array.isArray(to) ? to.join(', ') : to,
        template,
      });
      
      // Send to dead letter queue after max retries
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await addDeadLetterJob({
          originalQueue: 'email-sending',
          originalJobId: job.id!,
          originalData: job.data,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
          retryCount: job.attemptsMade,
        });
      }
      
      throw error;
    }
  },
  { connection: emailQueue.opts.connection }
);

// File processing worker
const fileProcessingWorker = new Worker(
  'file-processing',
  async (job: Job<FileProcessingJobData>) => {
    const { fileId, fileUrl, fileName, fileType, processingType, options } = job.data;

    try {
      logger.info('Processing file job', {
        jobId: job.id,
        fileId,
        fileName,
        processingType,
      });

      const supabase = createServerClient();

      switch (processingType) {
        case 'virus_scan':
          // Simulate virus scanning
          await new Promise(resolve => setTimeout(resolve, 2000));
          logger.info('Virus scan completed', { fileId, fileName });
          break;

        case 'optimization':
          // Simulate file optimization
          await new Promise(resolve => setTimeout(resolve, 3000));
          logger.info('File optimization completed', { fileId, fileName });
          break;

        case 'thumbnail_generation':
          // Generate thumbnail using Sharp
          if (fileType.startsWith('image/')) {
            const thumbnailUrl = await generateThumbnail(fileUrl, options);
            logger.info('Thumbnail generated', { fileId, thumbnailUrl });
          }
          break;

        case 'format_conversion':
          // Convert file format if needed
          await new Promise(resolve => setTimeout(resolve, 5000));
          logger.info('Format conversion completed', { fileId, fileName });
          break;

        default:
          throw new Error(`Unknown processing type: ${processingType}`);
      }

      logger.info('File processing job completed', { jobId: job.id, fileId, processingType });
    } catch (error) {
      logError(error as Error, {
        jobId: job.id,
        fileId,
        processingType,
      });
      
      // Send to dead letter queue after max retries
      if (job.attemptsMade >= (job.opts.attempts || 5)) {
        await addDeadLetterJob({
          originalQueue: 'file-processing',
          originalJobId: job.id!,
          originalData: job.data,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
          retryCount: job.attemptsMade,
        });
      }
      
      throw error;
    }
  },
  { connection: fileProcessingQueue.opts.connection }
);

// Analytics aggregation worker
const analyticsWorker = new Worker(
  'analytics-aggregation',
  async (job: Job<AnalyticsAggregationJobData>) => {
    const { type, dateRange, metrics, userId, shopId, productId } = job.data;

    try {
      logger.info('Processing analytics aggregation job', {
        jobId: job.id,
        type,
        dateRange,
        metrics,
      });

      const supabase = createServerClient();

      // Aggregate analytics based on type and date range
      switch (type) {
        case 'hourly':
          await aggregateHourlyAnalytics(supabase, dateRange, metrics, userId, shopId, productId);
          break;

        case 'daily':
          await aggregateDailyAnalytics(supabase, dateRange, metrics, userId, shopId, productId);
          break;

        case 'weekly':
          await aggregateWeeklyAnalytics(supabase, dateRange, metrics, userId, shopId, productId);
          break;

        case 'monthly':
          await aggregateMonthlyAnalytics(supabase, dateRange, metrics, userId, shopId, productId);
          break;

        default:
          throw new Error(`Unknown aggregation type: ${type}`);
      }

      logger.info('Analytics aggregation job completed', { jobId: job.id, type });
    } catch (error) {
      logError(error as Error, {
        jobId: job.id,
        type,
        dateRange,
      });
      
      // Send to dead letter queue after max retries
      if (job.attemptsMade >= (job.opts.attempts || 2)) {
        await addDeadLetterJob({
          originalQueue: 'analytics-aggregation',
          originalJobId: job.id!,
          originalData: job.data,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
          retryCount: job.attemptsMade,
        });
      }
      
      throw error;
    }
  },
  { connection: analyticsQueue.opts.connection }
);

// Payment retry worker
const paymentRetryWorker = new Worker(
  'payment-retry',
  async (job: Job<PaymentRetryJobData>) => {
    const { paymentId, userId, productId, amount, currency, provider, retryCount } = job.data;

    try {
      logger.info('Processing payment retry job', {
        jobId: job.id,
        paymentId,
        userId,
        retryCount,
        provider,
      });

      const supabase = createServerClient();

      // Implement payment retry logic based on provider
      let success = false;
      switch (provider) {
        case 'stripe':
          success = await retryStripePayment(paymentId, amount, currency);
          break;
        case 'yookassa':
          success = await retryYooKassaPayment(paymentId, amount, currency);
          break;
        case 'crypto':
          success = await retryCryptoPayment(paymentId, amount, currency);
          break;
        default:
          throw new Error(`Unknown payment provider: ${provider}`);
      }

      if (success) {
        // Update payment status to succeeded
        await supabase
          .from('payments')
          .update({ status: 'succeeded' })
          .eq('id', paymentId);

        logger.info('Payment retry successful', { jobId: job.id, paymentId });
      } else {
        // Schedule another retry if we haven't exceeded max retries
        if (retryCount < 5) {
          await addPaymentRetryJob({
            ...job.data,
            retryCount: retryCount + 1,
          }, 30000); // Retry in 30 seconds
        } else {
          // Mark payment as failed after max retries
          await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('id', paymentId);
        }
      }

      logger.info('Payment retry job completed', { jobId: job.id, paymentId, success });
    } catch (error) {
      logError(error as Error, {
        jobId: job.id,
        paymentId,
        userId,
        retryCount,
      });
      
      // Send to dead letter queue after max retries
      if (job.attemptsMade >= (job.opts.attempts || 5)) {
        await addDeadLetterJob({
          originalQueue: 'payment-retry',
          originalJobId: job.id!,
          originalData: job.data,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
          retryCount: job.attemptsMade,
        });
      }
      
      throw error;
    }
  },
  { connection: paymentRetryQueue.opts.connection }
);

// Referral commission worker
const referralCommissionWorker = new Worker(
  'referral-commission',
  async (job: Job<ReferralCommissionJobData>) => {
    const { referralId, referrerId, buyerId, productId, purchaseId, amount, commissionRate, commissionAmount, currency } = job.data;

    try {
      logger.info('Processing referral commission job', {
        jobId: job.id,
        referralId,
        referrerId,
        commissionAmount,
      });

      const supabase = createServerClient();

      // Update referral stats
      const { error: statsError } = await supabase
        .from('referral_stats')
        .upsert(
          {
            referral_id: referralId,
            purchase_count: 1,
            total_earned: commissionAmount,
          },
          {
            onConflict: 'referral_id',
          }
        );

      if (statsError) {
        logError(statsError as Error, { jobId: job.id, referralId });
        throw new Error('Failed to update referral stats');
      }

      // Add commission to referrer's account balance
      const { error: balanceError } = await supabase
        .from('user_balances')
        .upsert(
          {
            user_id: referrerId,
            balance: commissionAmount,
            currency,
          },
          {
            onConflict: 'user_id',
          }
        );

      if (balanceError) {
        logError(balanceError as Error, { jobId: job.id, referrerId });
        throw new Error('Failed to update referrer balance');
      }

      // Log commission transaction
      await supabase
        .from('commission_transactions')
        .insert({
          referral_id: referralId,
          referrer_id: referrerId,
          buyer_id: buyerId,
          product_id: productId,
          purchase_id: purchaseId,
          amount: commissionAmount,
          currency,
          status: 'completed',
        });

      logger.info('Referral commission job completed', {
        jobId: job.id,
        referralId,
        commissionAmount,
      });
    } catch (error) {
      logError(error as Error, {
        jobId: job.id,
        referralId,
        referrerId,
      });
      
      // Send to dead letter queue after max retries
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await addDeadLetterJob({
          originalQueue: 'referral-commission',
          originalJobId: job.id!,
          originalData: job.data,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
          retryCount: job.attemptsMade,
        });
      }
      
      throw error;
    }
  },
  { connection: referralCommissionQueue.opts.connection }
);

// Daily reports worker
const dailyReportsWorker = new Worker(
  'daily-reports',
  async (job: Job<DailyReportsJobData>) => {
    const { date, reportType, recipients, format, includeCharts } = job.data;

    try {
      logger.info('Processing daily reports job', {
        jobId: job.id,
        date,
        reportType,
        format,
      });

      const supabase = createServerClient();

      // Generate report based on type
      let reportData;
      switch (reportType) {
        case 'sales':
          reportData = await generateSalesReport(supabase, date, format, includeCharts);
          break;
        case 'users':
          reportData = await generateUsersReport(supabase, date, format, includeCharts);
          break;
        case 'products':
          reportData = await generateProductsReport(supabase, date, format, includeCharts);
          break;
        case 'referrals':
          reportData = await generateReferralsReport(supabase, date, format, includeCharts);
          break;
        case 'all':
          reportData = await generateAllReports(supabase, date, format, includeCharts);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      // Send report to recipients
      await sendReportToRecipients(recipients, reportData, format, `Daily Report - ${date}`);

      logger.info('Daily reports job completed', {
        jobId: job.id,
        date,
        reportType,
        recipients: recipients.length,
      });
    } catch (error) {
      logError(error as Error, {
        jobId: job.id,
        date,
        reportType,
      });
      
      // Send to dead letter queue after max retries
      if (job.attemptsMade >= (job.opts.attempts || 2)) {
        await addDeadLetterJob({
          originalQueue: 'daily-reports',
          originalJobId: job.id!,
          originalData: job.data,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
          retryCount: job.attemptsMade,
        });
      }
      
      throw error;
    }
  },
  { connection: dailyReportsQueue.opts.connection }
);

// Weekly reports worker
const weeklyReportsWorker = new Worker(
  'weekly-reports',
  async (job: Job<WeeklyReportsJobData>) => {
    const { weekStart, weekEnd, reportType, recipients, format, includeCharts, includeComparisons } = job.data;

    try {
      logger.info('Processing weekly reports job', {
        jobId: job.id,
        weekStart,
        weekEnd,
        reportType,
        format,
      });

      const supabase = createServerClient();

      // Generate weekly report based on type
      let reportData;
      switch (reportType) {
        case 'sales':
          reportData = await generateWeeklySalesReport(supabase, weekStart, weekEnd, format, includeCharts, includeComparisons);
          break;
        case 'users':
          reportData = await generateWeeklyUsersReport(supabase, weekStart, weekEnd, format, includeCharts, includeComparisons);
          break;
        case 'products':
          reportData = await generateWeeklyProductsReport(supabase, weekStart, weekEnd, format, includeCharts, includeComparisons);
          break;
        case 'referrals':
          reportData = await generateWeeklyReferralsReport(supabase, weekStart, weekEnd, format, includeCharts, includeComparisons);
          break;
        case 'all':
          reportData = await generateWeeklyAllReports(supabase, weekStart, weekEnd, format, includeCharts, includeComparisons);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      // Send report to recipients
      await sendReportToRecipients(recipients, reportData, format, `Weekly Report - ${weekStart} to ${weekEnd}`);

      logger.info('Weekly reports job completed', {
        jobId: job.id,
        weekStart,
        weekEnd,
        reportType,
        recipients: recipients.length,
      });
    } catch (error) {
      logError(error as Error, {
        jobId: job.id,
        weekStart,
        weekEnd,
        reportType,
      });
      
      // Send to dead letter queue after max retries
      if (job.attemptsMade >= (job.opts.attempts || 2)) {
        await addDeadLetterJob({
          originalQueue: 'weekly-reports',
          originalJobId: job.id!,
          originalData: job.data,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
          retryCount: job.attemptsMade,
        });
      }
      
      throw error;
    }
  },
  { connection: weeklyReportsQueue.opts.connection }
);

// Dead letter queue worker
const deadLetterWorker = new Worker(
  'dead-letter',
  async (job: Job<DeadLetterJobData>) => {
    const { originalQueue, originalJobId, originalData, error, failedAt, retryCount } = job.data;

    try {
      logger.info('Processing dead letter job', {
        jobId: job.id,
        originalQueue,
        originalJobId,
        retryCount,
      });

      // Log the failed job for manual review
      const supabase = createServerClient();
      
      await supabase
        .from('failed_jobs')
        .insert({
          original_queue: originalQueue,
          original_job_id: originalJobId,
          original_data: originalData,
          error_message: error,
          failed_at: failedAt,
          retry_count: retryCount,
          processed_at: new Date().toISOString(),
        });

      // Send alert to administrators
      await sendDeadLetterAlert(originalQueue, originalJobId, error, retryCount);

      logger.info('Dead letter job processed', {
        jobId: job.id,
        originalQueue,
        originalJobId,
      });
    } catch (error) {
      logError(error as Error, {
        jobId: job.id,
        originalQueue,
        originalJobId,
      });
      // Don't throw error for dead letter jobs to avoid infinite loops
    }
  },
  { connection: deadLetterQueue.opts.connection }
);

// Helper functions
async function generateThumbnail(fileUrl: string, options?: any): Promise<string> {
  // Implementation for thumbnail generation using Sharp
  // This is a placeholder - implement based on your needs
  return fileUrl;
}

async function aggregateHourlyAnalytics(supabase: any, dateRange: any, metrics: string[], userId?: string, shopId?: string, productId?: string) {
  // Implementation for hourly analytics aggregation
  logger.info('Aggregating hourly analytics', { dateRange, metrics });
}

async function aggregateDailyAnalytics(supabase: any, dateRange: any, metrics: string[], userId?: string, shopId?: string, productId?: string) {
  // Implementation for daily analytics aggregation
  logger.info('Aggregating daily analytics', { dateRange, metrics });
}

async function aggregateWeeklyAnalytics(supabase: any, dateRange: any, metrics: string[], userId?: string, shopId?: string, productId?: string) {
  // Implementation for weekly analytics aggregation
  logger.info('Aggregating weekly analytics', { dateRange, metrics });
}

async function aggregateMonthlyAnalytics(supabase: any, dateRange: any, metrics: string[], userId?: string, shopId?: string, productId?: string) {
  // Implementation for monthly analytics aggregation
  logger.info('Aggregating monthly analytics', { dateRange, metrics });
}

async function retryStripePayment(paymentId: string, amount: number, currency: string): Promise<boolean> {
  // Implementation for Stripe payment retry
  logger.info('Retrying Stripe payment', { paymentId, amount, currency });
  return true; // Placeholder
}

async function retryYooKassaPayment(paymentId: string, amount: number, currency: string): Promise<boolean> {
  // Implementation for YooKassa payment retry
  logger.info('Retrying YooKassa payment', { paymentId, amount, currency });
  return true; // Placeholder
}

async function retryCryptoPayment(paymentId: string, amount: number, currency: string): Promise<boolean> {
  // Implementation for crypto payment retry
  logger.info('Retrying crypto payment', { paymentId, amount, currency });
  return true; // Placeholder
}

async function generateSalesReport(supabase: any, date: string, format: string, includeCharts?: boolean) {
  // Implementation for sales report generation
  logger.info('Generating sales report', { date, format, includeCharts });
  return {}; // Placeholder
}

async function generateUsersReport(supabase: any, date: string, format: string, includeCharts?: boolean) {
  // Implementation for users report generation
  logger.info('Generating users report', { date, format, includeCharts });
  return {}; // Placeholder
}

async function generateProductsReport(supabase: any, date: string, format: string, includeCharts?: boolean) {
  // Implementation for products report generation
  logger.info('Generating products report', { date, format, includeCharts });
  return {}; // Placeholder
}

async function generateReferralsReport(supabase: any, date: string, format: string, includeCharts?: boolean) {
  // Implementation for referrals report generation
  logger.info('Generating referrals report', { date, format, includeCharts });
  return {}; // Placeholder
}

async function generateAllReports(supabase: any, date: string, format: string, includeCharts?: boolean) {
  // Implementation for all reports generation
  logger.info('Generating all reports', { date, format, includeCharts });
  return {}; // Placeholder
}

async function generateWeeklySalesReport(supabase: any, weekStart: string, weekEnd: string, format: string, includeCharts?: boolean, includeComparisons?: boolean) {
  // Implementation for weekly sales report generation
  logger.info('Generating weekly sales report', { weekStart, weekEnd, format, includeCharts, includeComparisons });
  return {}; // Placeholder
}

async function generateWeeklyUsersReport(supabase: any, weekStart: string, weekEnd: string, format: string, includeCharts?: boolean, includeComparisons?: boolean) {
  // Implementation for weekly users report generation
  logger.info('Generating weekly users report', { weekStart, weekEnd, format, includeCharts, includeComparisons });
  return {}; // Placeholder
}

async function generateWeeklyProductsReport(supabase: any, weekStart: string, weekEnd: string, format: string, includeCharts?: boolean, includeComparisons?: boolean) {
  // Implementation for weekly products report generation
  logger.info('Generating weekly products report', { weekStart, weekEnd, format, includeCharts, includeComparisons });
  return {}; // Placeholder
}

async function generateWeeklyReferralsReport(supabase: any, weekStart: string, weekEnd: string, format: string, includeCharts?: boolean, includeComparisons?: boolean) {
  // Implementation for weekly referrals report generation
  logger.info('Generating weekly referrals report', { weekStart, weekEnd, format, includeCharts, includeComparisons });
  return {}; // Placeholder
}

async function generateWeeklyAllReports(supabase: any, weekStart: string, weekEnd: string, format: string, includeCharts?: boolean, includeComparisons?: boolean) {
  // Implementation for weekly all reports generation
  logger.info('Generating weekly all reports', { weekStart, weekEnd, format, includeCharts, includeComparisons });
  return {}; // Placeholder
}

async function sendReportToRecipients(recipients: string[], reportData: any, format: string, subject: string) {
  // Implementation for sending reports to recipients
  logger.info('Sending report to recipients', { recipients: recipients.length, format, subject });
}

async function sendDeadLetterAlert(originalQueue: string, originalJobId: string, error: string, retryCount: number) {
  // Implementation for sending dead letter alerts
  logger.info('Sending dead letter alert', { originalQueue, originalJobId, error, retryCount });
}

// Error handlers
emailWorker.on('error', error => {
  logError(error, { worker: 'email' });
});

fileProcessingWorker.on('error', error => {
  logError(error, { worker: 'file-processing' });
});

analyticsWorker.on('error', error => {
  logError(error, { worker: 'analytics' });
});

paymentRetryWorker.on('error', error => {
  logError(error, { worker: 'payment-retry' });
});

referralCommissionWorker.on('error', error => {
  logError(error, { worker: 'referral-commission' });
});

dailyReportsWorker.on('error', error => {
  logError(error, { worker: 'daily-reports' });
});

weeklyReportsWorker.on('error', error => {
  logError(error, { worker: 'weekly-reports' });
});

deadLetterWorker.on('error', error => {
  logError(error, { worker: 'dead-letter' });
});

// Graceful shutdown
export async function closeWorkers() {
  await Promise.all([
    emailWorker.close(),
    fileProcessingWorker.close(),
    analyticsWorker.close(),
    paymentRetryWorker.close(),
    referralCommissionWorker.close(),
    dailyReportsWorker.close(),
    weeklyReportsWorker.close(),
    deadLetterWorker.close(),
  ]);
  logger.info('All workers closed');
}

// Start workers (only in production or when explicitly started)
if (
  process.env.NODE_ENV === 'production' ||
  process.env.START_WORKERS === 'true'
) {
  logger.info('Starting background workers');
}
