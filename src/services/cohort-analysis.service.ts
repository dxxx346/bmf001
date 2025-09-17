const nanoid = (() => { try { return require('nanoid/non-secure').nanoid } catch { return () => Math.random().toString(36).slice(2) } })();
import { createServiceClient } from '@/lib/supabase';
import { clickhouseClient } from '@/lib/clickhouse';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import {
  Cohort,
  CohortRetentionRate,
  CohortRevenueMetrics,
  CohortBehaviorMetrics,
} from '@/types/analytics';

export class CohortAnalysisService {
  private static instance: CohortAnalysisService;
  private supabase = createServiceClient();

  private constructor() {}

  public static getInstance(): CohortAnalysisService {
    if (!CohortAnalysisService.instance) {
      CohortAnalysisService.instance = new CohortAnalysisService();
    }
    return CohortAnalysisService.instance;
  }

  // Cohort Creation
  async createCohort(cohort: Omit<Cohort, 'cohort_id' | 'retention_rates' | 'revenue_metrics' | 'behavior_metrics'>): Promise<Cohort> {
    try {
      const newCohort: Cohort = {
        cohort_id: nanoid(),
        ...cohort,
        retention_rates: [],
        revenue_metrics: {
          total_revenue: 0,
          average_revenue_per_user: 0,
          revenue_growth_rate: 0,
          lifetime_value: 0,
          payback_period: 0,
        },
        behavior_metrics: {
          average_session_duration: 0,
          pages_per_session: 0,
          conversion_rate: 0,
          repeat_purchase_rate: 0,
          engagement_score: 0,
        },
      };

      const { data, error } = await this.supabase
        .from('cohorts')
        .insert(newCohort)
        .select()
        .single();

      if (error) throw error;

      logger.info('Cohort created', { cohort_id: newCohort.cohort_id });
      return data as Cohort;
    } catch (error) {
      logError(error as Error, { action: 'create_cohort' });
      throw error;
    }
  }

  async getCohort(cohortId: string): Promise<Cohort | null> {
    try {
      const { data, error } = await this.supabase
        .from('cohorts')
        .select('*')
        .eq('cohort_id', cohortId)
        .single();

      if (error) throw error;
      return data as Cohort;
    } catch (error) {
      logError(error as Error, { action: 'get_cohort', cohort_id: cohortId });
      return null;
    }
  }

  // Cohort Analysis
  async analyzeCohortRetention(
    cohortType: 'signup' | 'first_purchase' | 'custom',
    startDate: string,
    endDate: string,
    periodType: 'day' | 'week' | 'month' = 'day'
  ): Promise<Cohort[]> {
    try {
      const cohortData = await clickhouseClient.getCohortAnalysis(cohortType, startDate, endDate);
      
      const cohorts: Cohort[] = [];

      for (const data of cohortData) {
        const retentionRates: CohortRetentionRate[] = [
          {
            period: 0,
            period_type: periodType,
            active_users: data.day_0_active || 0,
            retention_rate: data.day_0_retention || 0,
            churn_rate: 1 - (data.day_0_retention || 0),
          },
          {
            period: 7,
            period_type: periodType,
            active_users: data.day_7_active || 0,
            retention_rate: data.day_7_retention || 0,
            churn_rate: 1 - (data.day_7_retention || 0),
          },
          {
            period: 14,
            period_type: periodType,
            active_users: data.day_14_active || 0,
            retention_rate: data.day_14_retention || 0,
            churn_rate: 1 - (data.day_14_retention || 0),
          },
          {
            period: 30,
            period_type: periodType,
            active_users: data.day_30_active || 0,
            retention_rate: data.day_30_retention || 0,
            churn_rate: 1 - (data.day_30_retention || 0),
          },
        ];

        const cohort: Cohort = {
          cohort_id: nanoid(),
          cohort_name: `Cohort ${data.cohort_date}`,
          cohort_type: cohortType,
          cohort_date: data.cohort_date,
          cohort_size: data.cohort_size || 0,
          retention_rates: retentionRates,
          revenue_metrics: await this.calculateCohortRevenueMetrics(data.cohort_date, startDate, endDate),
          behavior_metrics: await this.calculateCohortBehaviorMetrics(data.cohort_date, startDate, endDate),
        };

        cohorts.push(cohort);
      }

      logger.info('Cohort analysis completed', { cohort_count: cohorts.length });
      return cohorts;
    } catch (error) {
      logError(error as Error, { action: 'analyze_cohort_retention' });
      return [];
    }
  }

  async analyzeUserCohort(
    userId: string,
    cohortType: 'signup' | 'first_purchase' | 'custom',
    cohortDate: string
  ): Promise<Cohort | null> {
    try {
      // Get user's first activity date
      const firstActivityDate = await this.getUserFirstActivityDate(userId, cohortType);
      if (!firstActivityDate) return null;

      // Calculate retention metrics for this user
      const retentionRates = await this.calculateUserRetentionRates(userId, firstActivityDate);
      
      // Calculate revenue metrics
      const revenueMetrics = await this.calculateUserRevenueMetrics(userId, firstActivityDate);
      
      // Calculate behavior metrics
      const behaviorMetrics = await this.calculateUserBehaviorMetrics(userId, firstActivityDate);

      const cohort: Cohort = {
        cohort_id: nanoid(),
        cohort_name: `User ${userId} Cohort`,
        cohort_type: cohortType,
        cohort_date: firstActivityDate,
        cohort_size: 1,
          retention_rates: retentionRates,
          revenue_metrics: revenueMetrics,
          behavior_metrics: behaviorMetrics,
      };

      return cohort;
    } catch (error) {
      logError(error as Error, { action: 'analyze_user_cohort', user_id: userId });
      return null;
    }
  }

  // Cohort Comparison
  async compareCohorts(cohortIds: string[]): Promise<any> {
    try {
      const cohorts = await Promise.all(
        cohortIds.map(id => this.getCohort(id))
      );

      const validCohorts = cohorts.filter(c => c !== null) as Cohort[];

      if (validCohorts.length < 2) {
        throw new Error('Need at least 2 cohorts to compare');
      }

      const comparison = {
        cohorts: validCohorts.map(cohort => ({
          cohort_id: cohort.cohort_id,
          cohort_name: cohort.cohort_name,
          cohort_date: cohort.cohort_date,
          cohort_size: cohort.cohort_size,
          retention_summary: this.getRetentionSummary(cohort.retention_rates),
          revenue_summary: cohort.revenue_metrics,
          behavior_summary: cohort.behavior_metrics,
        })),
        insights: this.generateCohortInsights(validCohorts),
        recommendations: this.generateCohortRecommendations(validCohorts),
      };

      return comparison;
    } catch (error) {
      logError(error as Error, { action: 'compare_cohorts' });
      throw error;
    }
  }

  // Private Helper Methods
  private async getUserFirstActivityDate(
    userId: string,
    cohortType: 'signup' | 'first_purchase' | 'custom'
  ): Promise<string | null> {
    try {
      let query;
      
      switch (cohortType) {
        case 'signup':
          query = this.supabase
            .from('users')
            .select('created_at')
            .eq('id', userId)
            .single();
          break;
        case 'first_purchase':
          query = this.supabase
            .from('purchases')
            .select('created_at')
            .eq('buyer_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();
          break;
        default:
          return null;
      }

      const { data, error } = await query;
      if (error || !data) return null;

      return data.created_at;
    } catch (error) {
      logError(error as Error, { action: 'get_user_first_activity_date', user_id: userId });
      return null;
    }
  }

  private async calculateUserRetentionRates(
    userId: string,
    cohortDate: string
  ): Promise<CohortRetentionRate[]> {
    // Simplified retention calculation
    // In a real implementation, this would query actual user activity data
    return [
      {
        period: 0,
        period_type: 'day',
        active_users: 1,
        retention_rate: 1.0,
        churn_rate: 0.0,
      },
      {
        period: 7,
        period_type: 'day',
        active_users: 0.8,
        retention_rate: 0.8,
        churn_rate: 0.2,
      },
      {
        period: 14,
        period_type: 'day',
        active_users: 0.6,
        retention_rate: 0.6,
        churn_rate: 0.4,
      },
      {
        period: 30,
        period_type: 'day',
        active_users: 0.4,
        retention_rate: 0.4,
        churn_rate: 0.6,
      },
    ];
  }

  private async calculateCohortRevenueMetrics(
    cohortDate: string,
    startDate: string,
    endDate: string
  ): Promise<CohortRevenueMetrics> {
    // Simplified revenue calculation
    // In a real implementation, this would query actual revenue data
    return {
      total_revenue: 0,
      average_revenue_per_user: 0,
      revenue_growth_rate: 0,
      lifetime_value: 0,
      payback_period: 0,
    };
  }

  private async calculateCohortBehaviorMetrics(
    cohortDate: string,
    startDate: string,
    endDate: string
  ): Promise<CohortBehaviorMetrics> {
    // Simplified behavior calculation
    // In a real implementation, this would query actual behavior data
    return {
      average_session_duration: 0,
      pages_per_session: 0,
      conversion_rate: 0,
      repeat_purchase_rate: 0,
      engagement_score: 0,
    };
  }

  private async calculateUserRevenueMetrics(
    userId: string,
    cohortDate: string
  ): Promise<CohortRevenueMetrics> {
    // Simplified user revenue calculation
    return {
      total_revenue: 0,
      average_revenue_per_user: 0,
      revenue_growth_rate: 0,
      lifetime_value: 0,
      payback_period: 0,
    };
  }

  private async calculateUserBehaviorMetrics(
    userId: string,
    cohortDate: string
  ): Promise<CohortBehaviorMetrics> {
    // Simplified user behavior calculation
    return {
      average_session_duration: 0,
      pages_per_session: 0,
      conversion_rate: 0,
      repeat_purchase_rate: 0,
      engagement_score: 0,
    };
  }

  private getRetentionSummary(retentionRates: CohortRetentionRate[]): any {
    const day7 = retentionRates.find(r => r.period === 7);
    const day30 = retentionRates.find(r => r.period === 30);

    return {
      day_7_retention: day7?.retention_rate || 0,
      day_30_retention: day30?.retention_rate || 0,
      average_retention: retentionRates.reduce((sum, r) => sum + r.retention_rate, 0) / retentionRates.length,
    };
  }

  private generateCohortInsights(cohorts: Cohort[]): string[] {
    const insights: string[] = [];

    if (cohorts.length >= 2) {
      const latestCohort = cohorts[cohorts.length - 1];
      const previousCohort = cohorts[cohorts.length - 2];

      const latestRetention = latestCohort.retention_rates.find(r => r.period === 7)?.retention_rate || 0;
      const previousRetention = previousCohort.retention_rates.find(r => r.period === 7)?.retention_rate || 0;

      if (latestRetention > previousRetention) {
        insights.push(`7-day retention improved by ${((latestRetention - previousRetention) * 100).toFixed(1)}%`);
      } else if (latestRetention < previousRetention) {
        insights.push(`7-day retention decreased by ${((previousRetention - latestRetention) * 100).toFixed(1)}%`);
      }
    }

    return insights;
  }

  private generateCohortRecommendations(cohorts: Cohort[]): string[] {
    const recommendations: string[] = [];

    const averageRetention = cohorts.reduce((sum, cohort) => {
      const day7Retention = cohort.retention_rates.find(r => r.period === 7)?.retention_rate || 0;
      return sum + day7Retention;
    }, 0) / cohorts.length;

    if (averageRetention < 0.3) {
      recommendations.push('Consider implementing onboarding improvements to increase 7-day retention');
    }

    if (averageRetention < 0.5) {
      recommendations.push('Focus on user engagement strategies in the first week');
    }

    return recommendations;
  }

  // Cleanup
  public async destroy(): Promise<void> {
    // Cleanup if needed
  }
}

// Singleton instance
export const cohortAnalysisService = CohortAnalysisService.getInstance();
