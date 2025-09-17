import { nanoid } from 'nanoid/non-secure';
import { createServiceClient } from '@/lib/supabase';
import { analyticsService } from './analytics.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import {
  Experiment,
  ExperimentVariant,
  ExperimentMetric,
  ExperimentResult,
} from '@/types/analytics';

export class ABTestingService {
  private static instance: ABTestingService;
  private supabase = createServiceClient();

  private constructor() {}

  public static getInstance(): ABTestingService {
    if (!ABTestingService.instance) {
      ABTestingService.instance = new ABTestingService();
    }
    return ABTestingService.instance;
  }

  // Experiment Management
  async createExperiment(experiment: Omit<Experiment, 'id' | 'created_at' | 'updated_at'>): Promise<Experiment> {
    try {
      const newExperiment: Experiment = {
        id: nanoid(),
        ...experiment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('experiments')
        .insert(newExperiment)
        .select()
        .single();

      if (error) throw error;

      logger.info('Experiment created', { experiment_id: newExperiment.id });
      return data as Experiment;
    } catch (error) {
      logError(error as Error, { action: 'create_experiment' });
      throw error;
    }
  }

  async getExperiment(experimentId: string): Promise<Experiment | null> {
    try {
      const { data, error } = await this.supabase
        .from('experiments')
        .select('*')
        .eq('id', experimentId)
        .single();

      if (error) throw error;
      return data as Experiment;
    } catch (error) {
      logError(error as Error, { action: 'get_experiment', experiment_id: experimentId });
      return null;
    }
  }

  async updateExperiment(experimentId: string, updates: Partial<Experiment>): Promise<Experiment | null> {
    try {
      const { data, error } = await this.supabase
        .from('experiments')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', experimentId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Experiment updated', { experiment_id: experimentId });
      return data as Experiment;
    } catch (error) {
      logError(error as Error, { action: 'update_experiment', experiment_id: experimentId });
      return null;
    }
  }

  async startExperiment(experimentId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('experiments')
        .update({
          status: 'running',
          start_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', experimentId);

      if (error) throw error;

      logger.info('Experiment started', { experiment_id: experimentId });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'start_experiment', experiment_id: experimentId });
      return false;
    }
  }

  async stopExperiment(experimentId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('experiments')
        .update({
          status: 'completed',
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', experimentId);

      if (error) throw error;

      logger.info('Experiment stopped', { experiment_id: experimentId });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'stop_experiment', experiment_id: experimentId });
      return false;
    }
  }

  // Variant Assignment
  async assignVariant(experimentId: string, userId: string): Promise<ExperimentVariant | null> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment || experiment.status !== 'running') {
        return null;
      }

      // Check if user is already assigned
      const existingAssignment = await this.getUserVariant(experimentId, userId);
      if (existingAssignment) {
        return existingAssignment;
      }

      // Assign variant based on traffic allocation
      const variant = this.selectVariant(experiment.variants);
      if (!variant) {
        return null;
      }

      // Store assignment
      await this.supabase
        .from('experiment_assignments')
        .insert({
          experiment_id: experimentId,
          user_id: userId,
          variant_id: variant.id,
          assigned_at: new Date().toISOString(),
        });

      // Track assignment event
      await analyticsService.trackEvent('ab_test_view', {
        experiment_id: experimentId,
        variant_id: variant.id,
        user_id: userId,
      });

      logger.info('Variant assigned', { 
        experiment_id: experimentId, 
        user_id: userId, 
        variant_id: variant.id 
      });

      return variant;
    } catch (error) {
      logError(error as Error, { action: 'assign_variant', experiment_id: experimentId, user_id: userId });
      return null;
    }
  }

  async getUserVariant(experimentId: string, userId: string): Promise<ExperimentVariant | null> {
    try {
      const { data, error } = await this.supabase
        .from('experiment_assignments')
        .select(`
          variant_id,
          experiments!inner(
            variants
          )
        `)
        .eq('experiment_id', experimentId)
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      const experiment = data.experiments as any;
      const variant = experiment.variants.find((v: ExperimentVariant) => v.id === data.variant_id);
      return variant || null;
    } catch (error) {
      logError(error as Error, { action: 'get_user_variant', experiment_id: experimentId, user_id: userId });
      return null;
    }
  }

  // Conversion Tracking
  async trackConversion(
    experimentId: string,
    userId: string,
    metricName: string,
    value: number = 1
  ): Promise<void> {
    try {
      const assignment = await this.supabase
        .from('experiment_assignments')
        .select('variant_id')
        .eq('experiment_id', experimentId)
        .eq('user_id', userId)
        .single();

      if (!assignment.data) return;

      // Store conversion
      await this.supabase
        .from('experiment_conversions')
        .insert({
          experiment_id: experimentId,
          user_id: userId,
          variant_id: assignment.data.variant_id,
          metric_name: metricName,
          value,
          converted_at: new Date().toISOString(),
        });

      // Track conversion event
      await analyticsService.trackEvent('ab_test_convert', {
        experiment_id: experimentId,
        variant_id: assignment.data.variant_id,
        metric_name: metricName,
        value,
        user_id: userId,
      });

      logger.info('Conversion tracked', { 
        experiment_id: experimentId, 
        user_id: userId, 
        metric_name: metricName 
      });
    } catch (error) {
      logError(error as Error, { action: 'track_conversion', experiment_id: experimentId, user_id: userId });
    }
  }

  // Results Analysis
  async getExperimentResults(experimentId: string): Promise<ExperimentResult[]> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) return [];

      const { data: conversions, error } = await this.supabase
        .from('experiment_conversions')
        .select(`
          variant_id,
          metric_name,
          value,
          experiments!inner(
            variants
          )
        `)
        .eq('experiment_id', experimentId);

      if (error) throw error;

      // Group by variant and calculate metrics
      const variantResults = new Map<string, any>();
      
      for (const conversion of conversions || []) {
        const variantId = conversion.variant_id;
        if (!variantResults.has(variantId)) {
          const variant = experiment.variants.find(v => v.id === variantId);
          variantResults.set(variantId, {
            experiment_id: experimentId,
            variant_id: variantId,
            variant_name: variant?.name || 'Unknown',
            participants: 0,
            conversions: 0,
            conversion_rate: 0,
            confidence_level: 0,
            statistical_significance: false,
            lift: 0,
            p_value: 0,
            revenue: 0,
            average_order_value: 0,
            metrics: {},
            start_date: experiment.start_date,
            end_date: experiment.end_date || new Date().toISOString(),
          });
        }

        const result = variantResults.get(variantId);
        result.conversions += conversion.value;
        result.metrics[conversion.metric_name] = (result.metrics[conversion.metric_name] || 0) + conversion.value;
      }

      // Calculate additional metrics
      const results = Array.from(variantResults.values());
      const controlVariant = results.find(r => experiment.variants.find(v => v.id === r.variant_id)?.is_control);
      
      for (const result of results) {
        // Get participant count
        const { data: assignments } = await this.supabase
          .from('experiment_assignments')
          .select('user_id')
          .eq('experiment_id', experimentId)
          .eq('variant_id', result.variant_id);

        result.participants = assignments?.length || 0;
        result.conversion_rate = result.participants > 0 ? result.conversions / result.participants : 0;

        // Calculate lift compared to control
        if (controlVariant && controlVariant.variant_id !== result.variant_id) {
          result.lift = controlVariant.conversion_rate > 0 
            ? ((result.conversion_rate - controlVariant.conversion_rate) / controlVariant.conversion_rate) * 100 
            : 0;
        }

        // Calculate statistical significance (simplified)
        result.statistical_significance = this.calculateStatisticalSignificance(
          result.participants,
          result.conversions,
          controlVariant?.participants || 0,
          controlVariant?.conversions || 0
        );
        result.confidence_level = result.statistical_significance ? 95 : 0;
      }

      return results;
    } catch (error) {
      logError(error as Error, { action: 'get_experiment_results', experiment_id: experimentId });
      return [];
    }
  }

  // Private Helper Methods
  private selectVariant(variants: ExperimentVariant[]): ExperimentVariant | null {
    if (variants.length === 0) return null;

    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.traffic_percentage;
      if (random <= cumulative) {
        return variant;
      }
    }

    // Fallback to first variant
    return variants[0];
  }

  private calculateStatisticalSignificance(
    variantParticipants: number,
    variantConversions: number,
    controlParticipants: number,
    controlConversions: number
  ): boolean {
    // Simplified statistical significance calculation
    // In a real implementation, this would use proper statistical tests
    
    if (variantParticipants < 30 || controlParticipants < 30) {
      return false; // Need minimum sample size
    }

    const variantRate = variantConversions / variantParticipants;
    const controlRate = controlConversions / controlParticipants;
    const difference = Math.abs(variantRate - controlRate);
    
    // Simplified threshold (in reality, would use proper statistical tests)
    const threshold = 0.05; // 5% minimum difference
    
    return difference >= threshold;
  }

  // Cleanup
  public async destroy(): Promise<void> {
    // Cleanup if needed
  }
}

// Singleton instance
export const abTestingService = ABTestingService.getInstance();