import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { 
  addDailyReportsJob, 
  addWeeklyReportsJob, 
  addAnalyticsJob,
  DailyReportsJobData,
  WeeklyReportsJobData,
  AnalyticsAggregationJobData
} from '@/jobs/queue';
import { createServerClient } from '@/lib/supabase';

export class CronService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Cron service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting cron service');

    // Schedule daily reports at 6 AM UTC
    await this.scheduleDailyReports();
    
    // Schedule weekly reports on Mondays at 8 AM UTC
    await this.scheduleWeeklyReports();
    
    // Schedule analytics aggregation every hour
    await this.scheduleAnalyticsAggregation();

    // Start the cron loop
    this.startCronLoop();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.info('Cron service is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Cron service stopped');
  }

  private startCronLoop(): void {
    // Check every minute for scheduled tasks
    this.intervalId = setInterval(async () => {
      try {
        await this.checkScheduledTasks();
      } catch (error) {
        logError(error as Error, { context: 'cron-loop' });
      }
    }, 60000); // Check every minute
  }

  private async checkScheduledTasks(): Promise<void> {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const minute = now.getUTCMinutes();

    // Daily reports at 6 AM UTC
    if (hour === 6 && minute === 0) {
      await this.scheduleDailyReports();
    }

    // Weekly reports on Mondays at 8 AM UTC
    if (day === 1 && hour === 8 && minute === 0) {
      await this.scheduleWeeklyReports();
    }

    // Analytics aggregation every hour
    if (minute === 0) {
      await this.scheduleAnalyticsAggregation();
    }
  }

  private async scheduleDailyReports(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const recipients = await this.getReportRecipients();

      const reportTypes: Array<'sales' | 'users' | 'products' | 'referrals' | 'all'> = [
        'sales',
        'users',
        'products',
        'referrals',
        'all'
      ];

      for (const reportType of reportTypes) {
        const reportData: DailyReportsJobData = {
          date: today,
          reportType,
          recipients,
          format: 'pdf',
          includeCharts: true,
        };

        await addDailyReportsJob(reportData);
        logger.info('Daily report scheduled', { date: today, reportType });
      }
    } catch (error) {
      logError(error as Error, { context: 'schedule-daily-reports' });
    }
  }

  private async scheduleWeeklyReports(): Promise<void> {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday
      weekEnd.setHours(23, 59, 59, 999);

      const recipients = await this.getReportRecipients();

      const reportTypes: Array<'sales' | 'users' | 'products' | 'referrals' | 'all'> = [
        'sales',
        'users',
        'products',
        'referrals',
        'all'
      ];

      for (const reportType of reportTypes) {
        const reportData: WeeklyReportsJobData = {
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          reportType,
          recipients,
          format: 'pdf',
          includeCharts: true,
          includeComparisons: true,
        };

        await addWeeklyReportsJob(reportData);
        logger.info('Weekly report scheduled', { 
          weekStart: reportData.weekStart, 
          weekEnd: reportData.weekEnd, 
          reportType 
        });
      }
    } catch (error) {
      logError(error as Error, { context: 'schedule-weekly-reports' });
    }
  }

  private async scheduleAnalyticsAggregation(): Promise<void> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const analyticsData: AnalyticsAggregationJobData = {
        type: 'hourly',
        dateRange: {
          start: oneHourAgo.toISOString(),
          end: now.toISOString(),
        },
        metrics: [
          'page_views',
          'product_views',
          'purchases',
          'user_registrations',
          'referral_clicks',
          'conversion_rate',
        ],
      };

      await addAnalyticsJob(analyticsData);
      logger.info('Analytics aggregation scheduled', { 
        type: 'hourly',
        dateRange: analyticsData.dateRange 
      });
    } catch (error) {
      logError(error as Error, { context: 'schedule-analytics-aggregation' });
    }
  }

  private async getReportRecipients(): Promise<string[]> {
    try {
      const supabase = createServerClient();
      
      // Get admin users who should receive reports
      const { data: adminUsers, error } = await supabase
        .from('users')
        .select('email')
        .eq('role', 'admin');

      if (error) {
        logError(error as Error, { context: 'get-report-recipients' });
        return [];
      }

      return adminUsers?.map(user => user.email) || [];
    } catch (error) {
      logError(error as Error, { context: 'get-report-recipients' });
      return [];
    }
  }

  // Manual scheduling methods for testing or immediate execution
  async scheduleDailyReportsNow(): Promise<void> {
    await this.scheduleDailyReports();
  }

  async scheduleWeeklyReportsNow(): Promise<void> {
    await this.scheduleWeeklyReports();
  }

  async scheduleAnalyticsAggregationNow(): Promise<void> {
    await this.scheduleAnalyticsAggregation();
  }

  // Custom analytics aggregation for specific date ranges
  async scheduleCustomAnalyticsAggregation(
    type: 'daily' | 'weekly' | 'monthly',
    startDate: string,
    endDate: string,
    metrics: string[],
    userId?: string,
    shopId?: string,
    productId?: string
  ): Promise<void> {
    try {
      const analyticsData: AnalyticsAggregationJobData = {
        type,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        metrics,
        userId,
        shopId,
        productId,
      };

      await addAnalyticsJob(analyticsData);
      logger.info('Custom analytics aggregation scheduled', { 
        type,
        dateRange: analyticsData.dateRange,
        metrics 
      });
    } catch (error) {
      logError(error as Error, { context: 'schedule-custom-analytics' });
      throw error;
    }
  }

  // Custom report generation
  async scheduleCustomDailyReport(
    date: string,
    reportType: 'sales' | 'users' | 'products' | 'referrals' | 'all',
    recipients: string[],
    format: 'pdf' | 'csv' | 'json' = 'pdf',
    includeCharts: boolean = true
  ): Promise<void> {
    try {
      const reportData: DailyReportsJobData = {
        date,
        reportType,
        recipients,
        format,
        includeCharts,
      };

      await addDailyReportsJob(reportData);
      logger.info('Custom daily report scheduled', { date, reportType, recipients });
    } catch (error) {
      logError(error as Error, { context: 'schedule-custom-daily-report' });
      throw error;
    }
  }

  async scheduleCustomWeeklyReport(
    weekStart: string,
    weekEnd: string,
    reportType: 'sales' | 'users' | 'products' | 'referrals' | 'all',
    recipients: string[],
    format: 'pdf' | 'csv' | 'json' = 'pdf',
    includeCharts: boolean = true,
    includeComparisons: boolean = true
  ): Promise<void> {
    try {
      const reportData: WeeklyReportsJobData = {
        weekStart,
        weekEnd,
        reportType,
        recipients,
        format,
        includeCharts,
        includeComparisons,
      };

      await addWeeklyReportsJob(reportData);
      logger.info('Custom weekly report scheduled', { 
        weekStart, 
        weekEnd, 
        reportType, 
        recipients 
      });
    } catch (error) {
      logError(error as Error, { context: 'schedule-custom-weekly-report' });
      throw error;
    }
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

export const cronService = new CronService();
