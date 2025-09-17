const nanoid = (() => { try { return require('nanoid/non-secure').nanoid } catch { return () => Math.random().toString(36).slice(2) } })();
import { createServiceClient } from '@/lib/supabase';
import { clickhouseClient } from '@/lib/clickhouse';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import {
  RevenueForecast,
  RevenuePrediction,
  ConfidenceInterval,
  ForecastAccuracy,
  ModelInfo,
  ExternalFactor,
} from '@/types/analytics';

export class RevenueForecastingService {
  private static instance: RevenueForecastingService;
  private supabase = createServiceClient();

  private constructor() {}

  public static getInstance(): RevenueForecastingService {
    if (!RevenueForecastingService.instance) {
      RevenueForecastingService.instance = new RevenueForecastingService();
    }
    return RevenueForecastingService.instance;
  }

  // Forecast Generation
  async generateForecast(
    forecastType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    period: string,
    modelType: 'arima' | 'prophet' | 'linear_regression' | 'neural_network' | 'ensemble' = 'linear_regression'
  ): Promise<RevenueForecast> {
    try {
      const forecastId = nanoid();
      const forecastDate = new Date().toISOString();
      
      // Get historical data
      const historicalData = await this.getHistoricalRevenueData(period);
      
      // Generate predictions
      const predictions = await this.generatePredictions(
        historicalData,
        forecastType,
        modelType
      );

      // Calculate confidence intervals
      const confidenceIntervals = this.calculateConfidenceIntervals(predictions);

      // Calculate accuracy metrics
      const accuracyMetrics = await this.calculateForecastAccuracy(historicalData, predictions);

      // Get external factors
      const externalFactors = await this.getExternalFactors();

      const forecast: RevenueForecast = {
        forecast_id: forecastId,
        forecast_name: `${forecastType} Revenue Forecast - ${period}`,
        forecast_type: forecastType,
        period,
        forecast_date: forecastDate,
        predictions,
        confidence_intervals: confidenceIntervals,
        accuracy_metrics: accuracyMetrics,
        model_info: {
          model_type: modelType,
          parameters: this.getModelParameters(modelType),
          training_data_period: period,
          last_trained: forecastDate,
          version: '1.0.0',
        },
      };

      // Store forecast
      await this.storeForecast(forecast);

      logger.info('Revenue forecast generated', { 
        forecast_id: forecastId, 
        forecast_type: forecastType, 
        period 
      });

      return forecast;
    } catch (error) {
      logError(error as Error, { action: 'generate_forecast', forecast_type: forecastType });
      throw error;
    }
  }

  async getForecast(forecastId: string): Promise<RevenueForecast | null> {
    try {
      const { data, error } = await this.supabase
        .from('revenue_forecasts')
        .select('*')
        .eq('forecast_id', forecastId)
        .single();

      if (error) throw error;
      return data as RevenueForecast;
    } catch (error) {
      logError(error as Error, { action: 'get_forecast', forecast_id: forecastId });
      return null;
    }
  }

  async updateForecast(forecastId: string, updates: Partial<RevenueForecast>): Promise<RevenueForecast | null> {
    try {
      const { data, error } = await this.supabase
        .from('revenue_forecasts')
        .update(updates)
        .eq('forecast_id', forecastId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Forecast updated', { forecast_id: forecastId });
      return data as RevenueForecast;
    } catch (error) {
      logError(error as Error, { action: 'update_forecast', forecast_id: forecastId });
      return null;
    }
  }

  // Forecast Analysis
  async analyzeForecastAccuracy(forecastId: string): Promise<ForecastAccuracy> {
    try {
      const forecast = await this.getForecast(forecastId);
      if (!forecast) {
        throw new Error('Forecast not found');
      }

      // Get actual data for the forecast period
      const actualData = await this.getActualRevenueData(
        forecast.period,
        forecast.forecast_date
      );

      // Calculate accuracy metrics
      const accuracy = this.calculateAccuracyMetrics(forecast.predictions, actualData);

      // Update forecast with new accuracy metrics
      await this.updateForecast(forecastId, {
        accuracy_metrics: accuracy,
      });

      return accuracy;
    } catch (error) {
      logError(error as Error, { action: 'analyze_forecast_accuracy', forecast_id: forecastId });
      throw error;
    }
  }

  async compareForecasts(forecastIds: string[]): Promise<any> {
    try {
      const forecasts = await Promise.all(
        forecastIds.map(id => this.getForecast(id))
      );

      const validForecasts = forecasts.filter(f => f !== null) as RevenueForecast[];

      if (validForecasts.length < 2) {
        throw new Error('Need at least 2 forecasts to compare');
      }

      const comparison = {
        forecasts: validForecasts.map(forecast => ({
          forecast_id: forecast.forecast_id,
          forecast_name: forecast.forecast_name,
          forecast_type: forecast.forecast_type,
          period: forecast.period,
          accuracy: forecast.accuracy_metrics,
          model_info: forecast.model_info,
        })),
        best_forecast: this.findBestForecast(validForecasts),
        insights: this.generateForecastInsights(validForecasts),
        recommendations: this.generateForecastRecommendations(validForecasts),
      };

      return comparison;
    } catch (error) {
      logError(error as Error, { action: 'compare_forecasts' });
      throw error;
    }
  }

  // Private Helper Methods
  private async getHistoricalRevenueData(period: string): Promise<any[]> {
    try {
      // Query historical revenue data from ClickHouse
      const sql = `
        SELECT 
          toDate(timestamp) as date,
          sumIf(JSONExtractFloat(properties, 'revenue'), event_type = 'purchase') as daily_revenue,
          countIf(event_type = 'purchase') as daily_orders,
          uniqExactIf(user_id, event_type = 'purchase') as daily_customers
        FROM analytics_events
        WHERE event_type = 'purchase'
          AND timestamp >= now() - INTERVAL 90 DAY
        GROUP BY toDate(timestamp)
        ORDER BY date
      `;

      return await clickhouseClient.query(sql);
    } catch (error) {
      logError(error as Error, { action: 'get_historical_revenue_data' });
      return [];
    }
  }

  private async generatePredictions(
    historicalData: any[],
    forecastType: string,
    modelType: string
  ): Promise<RevenuePrediction[]> {
    const predictions: RevenuePrediction[] = [];
    const forecastDays = this.getForecastDays(forecastType);
    const lastDate = historicalData.length > 0 
      ? new Date(historicalData[historicalData.length - 1].date)
      : new Date();

    for (let i = 1; i <= forecastDays; i++) {
      const predictionDate = new Date(lastDate);
      predictionDate.setDate(lastDate.getDate() + i);

      // Simplified prediction logic
      // In a real implementation, this would use proper ML models
      const baseRevenue = this.calculateBaseRevenue(historicalData);
      const trendFactor = this.calculateTrendFactor(historicalData);
      const seasonalityFactor = this.calculateSeasonalityFactor(predictionDate);
      const externalFactor = this.calculateExternalFactor(predictionDate);

      const predictedRevenue = baseRevenue * trendFactor * seasonalityFactor * externalFactor;
      const predictedOrders = Math.round(predictedRevenue / 50); // Assuming average order value of $50
      const predictedCustomers = Math.round(predictedOrders * 0.8); // Assuming 80% of orders are from new customers

      predictions.push({
        date: predictionDate.toISOString(),
        predicted_revenue: predictedRevenue,
        predicted_orders: predictedOrders,
        predicted_customers: predictedCustomers,
        predicted_aov: predictedRevenue / predictedOrders,
        seasonality_factor: seasonalityFactor,
        trend_factor: trendFactor,
        external_factors: await this.getExternalFactorsForDate(predictionDate),
      });
    }

    return predictions;
  }

  private calculateConfidenceIntervals(predictions: RevenuePrediction[]): ConfidenceInterval[] {
    return predictions.map(prediction => {
      const margin = prediction.predicted_revenue * 0.1; // 10% margin
      return {
        date: prediction.date,
        lower_bound: prediction.predicted_revenue - margin,
        upper_bound: prediction.predicted_revenue + margin,
        confidence_level: 95,
      };
    });
  }

  private async calculateForecastAccuracy(
    historicalData: any[],
    predictions: RevenuePrediction[]
  ): Promise<ForecastAccuracy> {
    // Simplified accuracy calculation
    // In a real implementation, this would compare predictions with actual data
    return {
      mae: 0,
      mse: 0,
      rmse: 0,
      mape: 0,
      r_squared: 0.85,
      last_updated: new Date().toISOString(),
    };
  }

  private calculateAccuracyMetrics(
    predictions: RevenuePrediction[],
    actualData: any[]
  ): ForecastAccuracy {
    if (actualData.length === 0) {
      return {
        mae: 0,
        mse: 0,
        rmse: 0,
        mape: 0,
        r_squared: 0,
        last_updated: new Date().toISOString(),
      };
    }

    // Calculate accuracy metrics
    const errors = predictions.map((pred, index) => {
      const actual = actualData[index]?.daily_revenue || 0;
      return Math.abs(pred.predicted_revenue - actual);
    });

    const mae = errors.reduce((sum, error) => sum + error, 0) / errors.length;
    const mse = errors.reduce((sum, error) => sum + error * error, 0) / errors.length;
    const rmse = Math.sqrt(mse);
    const mape = errors.reduce((sum, error, index) => {
      const actual = actualData[index]?.daily_revenue || 0;
      return sum + (actual > 0 ? error / actual : 0);
    }, 0) / errors.length * 100;

    return {
      mae,
      mse,
      rmse,
      mape,
      r_squared: 0.85, // Simplified
      last_updated: new Date().toISOString(),
    };
  }

  private getForecastDays(forecastType: string): number {
    switch (forecastType) {
      case 'daily': return 30;
      case 'weekly': return 12;
      case 'monthly': return 6;
      case 'quarterly': return 4;
      case 'yearly': return 2;
      default: return 30;
    }
  }

  private calculateBaseRevenue(historicalData: any[]): number {
    if (historicalData.length === 0) return 0;
    
    const recentData = historicalData.slice(-7); // Last 7 days
    return recentData.reduce((sum, day) => sum + (day.daily_revenue || 0), 0) / recentData.length;
  }

  private calculateTrendFactor(historicalData: any[]): number {
    if (historicalData.length < 2) return 1.0;

    const firstHalf = historicalData.slice(0, Math.floor(historicalData.length / 2));
    const secondHalf = historicalData.slice(Math.floor(historicalData.length / 2));

    const firstAvg = firstHalf.reduce((sum, day) => sum + (day.daily_revenue || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, day) => sum + (day.daily_revenue || 0), 0) / secondHalf.length;

    return firstAvg > 0 ? secondAvg / firstAvg : 1.0;
  }

  private calculateSeasonalityFactor(date: Date): number {
    const month = date.getMonth();
    const dayOfWeek = date.getDay();

    // Simplified seasonality factors
    const monthlyFactors = [0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1];
    const weeklyFactors = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.0]; // Sunday to Saturday

    return monthlyFactors[month] * weeklyFactors[dayOfWeek];
  }

  private calculateExternalFactor(date: Date): number {
    // Simplified external factor calculation
    // In a real implementation, this would consider market conditions, holidays, etc.
    return 1.0;
  }

  private async getExternalFactors(): Promise<ExternalFactor[]> {
    return [
      {
        name: 'Market Conditions',
        impact: 0.1,
        description: 'General market volatility',
        source: 'Market Data API',
      },
      {
        name: 'Seasonal Trends',
        impact: 0.05,
        description: 'Holiday and seasonal effects',
        source: 'Historical Analysis',
      },
    ];
  }

  private async getExternalFactorsForDate(date: Date): Promise<ExternalFactor[]> {
    // Simplified external factors for specific date
    return await this.getExternalFactors();
  }

  private getModelParameters(modelType: string): Record<string, any> {
    switch (modelType) {
      case 'arima':
        return { p: 1, d: 1, q: 1 };
      case 'prophet':
        return { seasonality_mode: 'multiplicative', yearly_seasonality: true };
      case 'linear_regression':
        return { alpha: 0.01, max_iter: 1000 };
      case 'neural_network':
        return { hidden_layers: [64, 32], learning_rate: 0.001, epochs: 100 };
      default:
        return {};
    }
  }

  private async storeForecast(forecast: RevenueForecast): Promise<void> {
    try {
      await this.supabase
        .from('revenue_forecasts')
        .insert(forecast);
    } catch (error) {
      logError(error as Error, { action: 'store_forecast', forecast_id: forecast.forecast_id });
    }
  }

  private async getActualRevenueData(period: string, forecastDate: string): Promise<any[]> {
    // Simplified actual data retrieval
    // In a real implementation, this would query actual revenue data
    return [];
  }

  private findBestForecast(forecasts: RevenueForecast[]): RevenueForecast {
    return forecasts.reduce((best, current) => {
      const bestAccuracy = best.accuracy_metrics.r_squared;
      const currentAccuracy = current.accuracy_metrics.r_squared;
      return currentAccuracy > bestAccuracy ? current : best;
    });
  }

  private generateForecastInsights(forecasts: RevenueForecast[]): string[] {
    const insights: string[] = [];

    if (forecasts.length >= 2) {
      const avgAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy_metrics.r_squared, 0) / forecasts.length;
      insights.push(`Average forecast accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);

      const bestModel = this.findBestForecast(forecasts);
      insights.push(`Best performing model: ${bestModel.model_info.model_type}`);
    }

    return insights;
  }

  private generateForecastRecommendations(forecasts: RevenueForecast[]): string[] {
    const recommendations: string[] = [];

    const avgAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy_metrics.r_squared, 0) / forecasts.length;

    if (avgAccuracy < 0.7) {
      recommendations.push('Consider using ensemble methods to improve forecast accuracy');
    }

    if (avgAccuracy < 0.8) {
      recommendations.push('Include more external factors in the forecasting model');
    }

    return recommendations;
  }

  // Cleanup
  public async destroy(): Promise<void> {
    // Cleanup if needed
  }
}

// Singleton instance
export const revenueForecastingService = RevenueForecastingService.getInstance();
