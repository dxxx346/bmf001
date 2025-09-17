import { nanoid } from 'nanoid/non-secure';
import { clickhouseClient } from '@/lib/clickhouse';
import { redis } from '@/lib/redis';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import {
  AnalyticsEvent,
  AnalyticsEventRecord,
  EventContext,
  EventMetadata,
  UserBehaviorMetrics,
  ProductPerformanceMetrics,
  ConversionFunnel,
  RealTimeMetrics,
  AnalyticsDashboard,
  OverviewMetrics,
  EventType,
  UserSegment,
} from '@/types/analytics';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private eventBuffer: AnalyticsEvent[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.startEventFlushTimer();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Event Tracking
  async trackEvent(
    eventType: EventType,
    properties: Record<string, any> = {},
    context: Partial<EventContext> = {},
    metadata: Partial<EventMetadata> = {}
  ): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        id: nanoid(),
        user_id: properties.user_id,
        session_id: properties.session_id || nanoid(),
        event_type: eventType,
        timestamp: new Date().toISOString(),
        properties,
        context: this.buildEventContext(context),
        metadata: this.buildEventMetadata(metadata),
      };

      // Add to buffer
      this.eventBuffer.push(event);

      // Flush if buffer is full
      if (this.eventBuffer.length >= this.BUFFER_SIZE) {
        await this.flushEvents();
      }

      // Store in Redis for real-time analytics
      await this.storeRealTimeEvent(event);

      logger.debug('Event tracked', { event_type: eventType, event_id: event.id });
    } catch (error) {
      logError(error as Error, { action: 'track_event', event_type: eventType });
    }
  }

  async trackPageView(
    pageUrl: string,
    pageTitle: string,
    userId?: string,
    sessionId?: string,
    additionalProperties: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent('page_view', {
      page_url: pageUrl,
      page_title: pageTitle,
      user_id: userId,
      session_id: sessionId,
      ...additionalProperties,
    });
  }

  async trackProductView(
    productId: string,
    productName: string,
    category: string,
    price: number,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent('product_view', {
      product_id: productId,
      product_name: productName,
      category,
      price,
      user_id: userId,
      session_id: sessionId,
    });
  }

  async trackAddToCart(
    productId: string,
    quantity: number,
    price: number,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent('add_to_cart', {
      product_id: productId,
      quantity,
      price,
      total_value: quantity * price,
      user_id: userId,
      session_id: sessionId,
    });
  }

  async trackPurchase(
    orderId: string,
    productIds: string[],
    totalAmount: number,
    currency: string,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent('purchase', {
      order_id: orderId,
      product_ids: productIds,
      total_amount: totalAmount,
      currency,
      revenue: totalAmount,
      user_id: userId,
      session_id: sessionId,
    });
  }

  // User Behavior Analytics
  async getUserBehaviorMetrics(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<UserBehaviorMetrics | null> {
    try {
      const metrics = await clickhouseClient.getUserBehaviorMetrics(userId, startDate, endDate);
      
      if (metrics.length === 0) return null;

      const data = metrics[0];
      return {
        user_id: userId,
        period: `${startDate} to ${endDate}`,
        page_views: data.page_views || 0,
        unique_pages: data.unique_pages || 0,
        session_duration: data.session_duration || 0,
        bounce_rate: data.bounce_rate || 0,
        pages_per_session: data.pages_per_session || 0,
        return_visits: data.return_visits || 0,
        conversion_rate: data.conversion_rate || 0,
        revenue: data.revenue || 0,
        last_activity: new Date().toISOString(),
        user_segment: await this.determineUserSegment(userId),
        engagement_score: await this.calculateEngagementScore(userId),
        retention_rate: await this.calculateRetentionRate(userId),
      };
    } catch (error) {
      logError(error as Error, { action: 'get_user_behavior_metrics', userId });
      return null;
    }
  }

  // Product Performance Analytics
  async getProductPerformanceMetrics(
    productId: string,
    startDate: string,
    endDate: string
  ): Promise<ProductPerformanceMetrics | null> {
    try {
      const metrics = await clickhouseClient.getProductPerformanceMetrics(productId, startDate, endDate);
      
      if (metrics.length === 0) return null;

      const data = metrics[0];
      return {
        product_id: productId,
        period: `${startDate} to ${endDate}`,
        views: data.views || 0,
        unique_viewers: data.unique_viewers || 0,
        add_to_cart: data.add_to_cart || 0,
        purchases: data.purchases || 0,
        revenue: data.revenue || 0,
        conversion_rate: data.conversion_rate || 0,
        cart_abandonment_rate: data.cart_abandonment_rate || 0,
        average_order_value: data.average_order_value || 0,
        return_rate: 0,
        rating_average: 0,
        rating_count: 0,
        search_impressions: 0,
        search_clicks: 0,
        ctr: 0,
        position_average: 0,
        category_performance: await this.getCategoryPerformance(productId),
        competitor_analysis: await this.getCompetitorAnalysis(productId),
      };
    } catch (error) {
      logError(error as Error, { action: 'get_product_performance_metrics', productId });
      return null;
    }
  }

  // Real-time Analytics
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const data = await clickhouseClient.getRealTimeMetrics();
      
      const topPages = data.slice(0, 10).map((item: any) => ({
        page: item.top_page || 'Unknown',
        views: item.page_views || 0,
      }));

      return {
        active_users: data.reduce((sum: number, item: any) => sum + (item.active_users || 0), 0),
        page_views_per_minute: data.reduce((sum: number, item: any) => sum + (item.page_views_per_minute || 0), 0),
        conversions_per_minute: data.reduce((sum: number, item: any) => sum + (item.conversions_per_minute || 0), 0),
        revenue_per_minute: data.reduce((sum: number, item: any) => sum + (item.revenue_per_minute || 0), 0),
        top_pages: topPages,
        top_products: [],
        top_referrers: [],
        device_breakdown: {
          desktop: 0,
          mobile: 0,
          tablet: 0,
          unknown: 0,
        },
        country_breakdown: {},
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      logError(error as Error, { action: 'get_real_time_metrics' });
      return {
        active_users: 0,
        page_views_per_minute: 0,
        conversions_per_minute: 0,
        revenue_per_minute: 0,
        top_pages: [],
        top_products: [],
        top_referrers: [],
        device_breakdown: { desktop: 0, mobile: 0, tablet: 0, unknown: 0 },
        country_breakdown: {},
        last_updated: new Date().toISOString(),
      };
    }
  }

  // Dashboard Data
  async getDashboardData(period: string = '24h'): Promise<AnalyticsDashboard> {
    try {
      const endDate = new Date();
      const startDate = this.getPeriodStartDate(period, endDate);

      const [
        overview,
        userBehavior,
        productPerformance,
        realTimeMetrics,
      ] = await Promise.all([
        this.getOverviewMetrics(startDate.toISOString(), endDate.toISOString()),
        this.getUserBehaviorMetrics('all', startDate.toISOString(), endDate.toISOString()),
        this.getProductPerformanceMetrics('all', startDate.toISOString(), endDate.toISOString()),
        this.getRealTimeMetrics(),
      ]);

      return {
        period,
        overview,
        user_behavior: userBehavior ? [userBehavior] : [],
        product_performance: productPerformance ? [productPerformance] : [],
        referral_metrics: [],
        experiments: [],
        cohorts: [],
        revenue_forecast: null as any,
        real_time_events: [],
        top_pages: [],
        top_products: [],
        conversion_funnels: [],
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      logError(error as Error, { action: 'get_dashboard_data' });
      throw error;
    }
  }

  // Private Helper Methods
  private buildEventContext(context: Partial<EventContext>): EventContext {
    return {
      page_url: context.page_url || '',
      page_title: context.page_title || '',
      referrer: context.referrer,
      utm_source: context.utm_source,
      utm_medium: context.utm_medium,
      utm_campaign: context.utm_campaign,
      utm_term: context.utm_term,
      utm_content: context.utm_content,
      device_type: context.device_type || 'unknown',
      browser: context.browser || 'other',
      os: context.os || 'other',
      screen_resolution: context.screen_resolution || '0x0',
      viewport_size: context.viewport_size || '0x0',
      language: context.language || 'en',
      timezone: context.timezone || 'UTC',
      country: context.country,
      city: context.city,
      ip_address: context.ip_address,
      user_agent: context.user_agent || '',
    };
  }

  private buildEventMetadata(metadata: Partial<EventMetadata>): EventMetadata {
    return {
      experiment_id: metadata.experiment_id,
      variant_id: metadata.variant_id,
      cohort_id: metadata.cohort_id,
      funnel_step: metadata.funnel_step,
      conversion_value: metadata.conversion_value,
      attribution_source: metadata.attribution_source,
      attribution_medium: metadata.attribution_medium,
      attribution_campaign: metadata.attribution_campaign,
      attribution_term: metadata.attribution_term,
      attribution_content: metadata.attribution_content,
      attribution_touchpoint: metadata.attribution_touchpoint,
      attribution_model: metadata.attribution_model,
      custom_dimensions: metadata.custom_dimensions,
      custom_metrics: metadata.custom_metrics,
    };
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      const records: AnalyticsEventRecord[] = events.map(event => ({
        id: event.id,
        user_id: event.user_id || '',
        session_id: event.session_id,
        event_type: event.event_type,
        timestamp: event.timestamp,
        properties: JSON.stringify(event.properties),
        context: JSON.stringify(event.context),
        metadata: JSON.stringify(event.metadata),
        created_at: new Date().toISOString(),
        partition_date: new Date().toISOString().split('T')[0],
      }));

      await clickhouseClient.trackEvents(records);
      logger.info('Events flushed to ClickHouse', { count: events.length });
    } catch (error) {
      logError(error as Error, { action: 'flush_events' });
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...this.eventBuffer);
    }
  }

  private startEventFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  private async storeRealTimeEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await redis.setex(
        `analytics:realtime:${event.id}`,
        3600, // 1 hour TTL
        JSON.stringify(event)
      );
    } catch (error) {
      logError(error as Error, { action: 'store_real_time_event' });
    }
  }

  private async determineUserSegment(userId: string): Promise<UserSegment> {
    return 'new_user';
  }

  private async calculateEngagementScore(userId: string): Promise<number> {
    return 0.5;
  }

  private async calculateRetentionRate(userId: string): Promise<number> {
    return 0.3;
  }

  private async getCategoryPerformance(productId: string): Promise<any> {
    return {
      category_id: '1',
      category_name: 'Digital Products',
      market_share: 0.15,
      growth_rate: 0.05,
      average_price: 29.99,
      price_competitiveness: 0.8,
      seasonal_trends: [],
    };
  }

  private async getCompetitorAnalysis(productId: string): Promise<any> {
    return {
      competitor_products: [],
      price_positioning: 'mid_market' as const,
      feature_gaps: [],
      advantage_areas: [],
    };
  }

  private async getOverviewMetrics(startDate: string, endDate: string): Promise<OverviewMetrics> {
    return {
      total_users: 0,
      active_users: 0,
      new_users: 0,
      total_revenue: 0,
      total_orders: 0,
      average_order_value: 0,
      conversion_rate: 0,
      bounce_rate: 0,
      session_duration: 0,
      pages_per_session: 0,
      growth_rate: 0,
      retention_rate: 0,
    };
  }

  private getPeriodStartDate(period: string, now: Date): Date {
    const startDate = new Date(now);
    
    switch (period) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 1);
    }
    
    return startDate;
  }

  // Cleanup
  public async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushEvents();
    await clickhouseClient.disconnect();
  }
}

// Singleton instance
export const analyticsService = AnalyticsService.getInstance();