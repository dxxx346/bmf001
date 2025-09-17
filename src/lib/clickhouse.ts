import { ClickHouseClient, createClient } from '@clickhouse/client';
import { logError } from './logger';
import { defaultLogger as logger } from './logger';
import { AnalyticsEventRecord, AnalyticsAggregation } from '@/types/analytics';

export class ClickHouseAnalyticsClient {
  private client: ClickHouseClient;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USERNAME || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DATABASE || 'analytics',
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.ping();
      this.isConnected = true;
      logger.info('ClickHouse connected successfully');
    } catch (error) {
      logError(error as Error, { action: 'clickhouse_connect' });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      this.isConnected = false;
      logger.info('ClickHouse disconnected');
    } catch (error) {
      logError(error as Error, { action: 'clickhouse_disconnect' });
    }
  }

  // Event Tracking
  async trackEvent(event: AnalyticsEventRecord): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.client.insert({
        table: 'analytics_events',
        values: [event],
        format: 'JSONEachRow',
      });

      logger.debug('Event tracked successfully', { event_id: event.id });
    } catch (error) {
      logError(error as Error, { action: 'track_event', event_id: event.id });
      throw error;
    }
  }

  async trackEvents(events: AnalyticsEventRecord[]): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (events.length === 0) return;

      await this.client.insert({
        table: 'analytics_events',
        values: events,
        format: 'JSONEachRow',
      });

      logger.info('Events tracked successfully', { count: events.length });
    } catch (error) {
      logError(error as Error, { action: 'track_events', count: events.length });
      throw error;
    }
  }

  // Aggregations
  async storeAggregation(aggregation: AnalyticsAggregation): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.client.insert({
        table: 'analytics_aggregations',
        values: [aggregation],
        format: 'JSONEachRow',
      });

      logger.debug('Aggregation stored successfully', { aggregation_id: aggregation.aggregation_id });
    } catch (error) {
      logError(error as Error, { action: 'store_aggregation', aggregation_id: aggregation.aggregation_id });
      throw error;
    }
  }

  async storeAggregations(aggregations: AnalyticsAggregation[]): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (aggregations.length === 0) return;

      await this.client.insert({
        table: 'analytics_aggregations',
        values: aggregations,
        format: 'JSONEachRow',
      });

      logger.info('Aggregations stored successfully', { count: aggregations.length });
    } catch (error) {
      logError(error as Error, { action: 'store_aggregations', count: aggregations.length });
      throw error;
    }
  }

  // Query Methods
  async query<T = any>(sql: string, params?: Record<string, any>): Promise<T[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const result = await this.client.query({
        query: sql,
        query_params: params,
        format: 'JSONEachRow',
      });

      const data = await result.json();
      return data as T[];
    } catch (error) {
      logError(error as Error, { action: 'clickhouse_query', sql });
      throw error;
    }
  }

  async queryOne<T = any>(sql: string, params?: Record<string, any>): Promise<T | null> {
    try {
      const results = await this.query<T>(sql, params);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logError(error as Error, { action: 'clickhouse_query_one', sql });
      throw error;
    }
  }

  // Analytics Queries
  async getUserBehaviorMetrics(userId: string, startDate: string, endDate: string): Promise<any[]> {
    const sql = `
      SELECT 
        user_id,
        countIf(event_type = 'page_view') as page_views,
        uniqExact(JSONExtractString(properties, 'page_url')) as unique_pages,
        avgIf(JSONExtractInt(properties, 'session_duration'), event_type = 'page_view') as session_duration,
        countIf(event_type = 'page_view' AND JSONExtractInt(properties, 'bounce') = 1) / countIf(event_type = 'page_view') as bounce_rate,
        countIf(event_type = 'page_view') / uniqExact(session_id) as pages_per_session,
        uniqExact(toDate(timestamp)) as return_visits,
        countIf(event_type = 'purchase') / countIf(event_type = 'page_view') as conversion_rate,
        sumIf(JSONExtractFloat(properties, 'revenue'), event_type = 'purchase') as revenue
      FROM analytics_events
      WHERE user_id = {userId:String}
        AND timestamp >= {startDate:String}
        AND timestamp <= {endDate:String}
      GROUP BY user_id
    `;

    return this.query(sql, { userId, startDate, endDate });
  }

  async getProductPerformanceMetrics(productId: string, startDate: string, endDate: string): Promise<any[]> {
    const sql = `
      SELECT 
        JSONExtractString(properties, 'product_id') as product_id,
        countIf(event_type = 'product_view') as views,
        uniqExactIf(user_id, event_type = 'product_view') as unique_viewers,
        countIf(event_type = 'add_to_cart') as add_to_cart,
        countIf(event_type = 'purchase') as purchases,
        sumIf(JSONExtractFloat(properties, 'revenue'), event_type = 'purchase') as revenue,
        countIf(event_type = 'purchase') / countIf(event_type = 'product_view') as conversion_rate,
        (countIf(event_type = 'add_to_cart') - countIf(event_type = 'purchase')) / countIf(event_type = 'add_to_cart') as cart_abandonment_rate,
        avgIf(JSONExtractFloat(properties, 'order_value'), event_type = 'purchase') as average_order_value
      FROM analytics_events
      WHERE JSONExtractString(properties, 'product_id') = {productId:String}
        AND timestamp >= {startDate:String}
        AND timestamp <= {endDate:String}
      GROUP BY JSONExtractString(properties, 'product_id')
    `;

    return this.query(sql, { productId, startDate, endDate });
  }

  async getConversionFunnel(funnelId: string, startDate: string, endDate: string): Promise<any[]> {
    const sql = `
      WITH funnel_steps AS (
        SELECT 
          session_id,
          minIf(timestamp, event_type = 'page_view' AND JSONExtractString(properties, 'funnel_step') = '1') as step1_time,
          minIf(timestamp, event_type = 'page_view' AND JSONExtractString(properties, 'funnel_step') = '2') as step2_time,
          minIf(timestamp, event_type = 'page_view' AND JSONExtractString(properties, 'funnel_step') = '3') as step3_time,
          minIf(timestamp, event_type = 'purchase') as conversion_time
        FROM analytics_events
        WHERE JSONExtractString(properties, 'funnel_id') = {funnelId:String}
          AND timestamp >= {startDate:String}
          AND timestamp <= {endDate:String}
        GROUP BY session_id
      )
      SELECT 
        countIf(step1_time > 0) as step1_entered,
        countIf(step2_time > 0) as step2_entered,
        countIf(step3_time > 0) as step3_entered,
        countIf(conversion_time > 0) as converted,
        countIf(step2_time > 0) / countIf(step1_time > 0) as step1_to_step2_rate,
        countIf(step3_time > 0) / countIf(step2_time > 0) as step2_to_step3_rate,
        countIf(conversion_time > 0) / countIf(step3_time > 0) as step3_to_conversion_rate,
        countIf(conversion_time > 0) / countIf(step1_time > 0) as overall_conversion_rate
      FROM funnel_steps
    `;

    return this.query(sql, { funnelId, startDate, endDate });
  }

  async getCohortAnalysis(cohortType: string, startDate: string, endDate: string): Promise<any[]> {
    const sql = `
      WITH user_first_activity AS (
        SELECT 
          user_id,
          min(toDate(timestamp)) as first_activity_date
        FROM analytics_events
        WHERE timestamp >= {startDate:String}
          AND timestamp <= {endDate:String}
        GROUP BY user_id
      ),
      user_activity_by_period AS (
        SELECT 
          ufa.user_id,
          ufa.first_activity_date,
          toDate(ae.timestamp) as activity_date,
          dateDiff('day', ufa.first_activity_date, toDate(ae.timestamp)) as days_since_first
        FROM user_first_activity ufa
        JOIN analytics_events ae ON ufa.user_id = ae.user_id
        WHERE ae.timestamp >= {startDate:String}
          AND ae.timestamp <= {endDate:String}
      )
      SELECT 
        first_activity_date as cohort_date,
        count(DISTINCT user_id) as cohort_size,
        countIf(days_since_first = 0) as day_0_active,
        countIf(days_since_first = 7) as day_7_active,
        countIf(days_since_first = 14) as day_14_active,
        countIf(days_since_first = 30) as day_30_active,
        countIf(days_since_first = 0) / count(DISTINCT user_id) as day_0_retention,
        countIf(days_since_first = 7) / count(DISTINCT user_id) as day_7_retention,
        countIf(days_since_first = 14) / count(DISTINCT user_id) as day_14_retention,
        countIf(days_since_first = 30) / count(DISTINCT user_id) as day_30_retention
      FROM user_activity_by_period
      GROUP BY first_activity_date
      ORDER BY first_activity_date
    `;

    return this.query(sql, { startDate, endDate });
  }

  async getRealTimeMetrics(): Promise<any> {
    const sql = `
      SELECT 
        uniqExact(user_id) as active_users,
        countIf(event_type = 'page_view' AND timestamp >= now() - INTERVAL 1 MINUTE) as page_views_per_minute,
        countIf(event_type = 'purchase' AND timestamp >= now() - INTERVAL 1 MINUTE) as conversions_per_minute,
        sumIf(JSONExtractFloat(properties, 'revenue'), event_type = 'purchase' AND timestamp >= now() - INTERVAL 1 MINUTE) as revenue_per_minute,
        JSONExtractString(properties, 'page_url') as top_page,
        countIf(event_type = 'page_view' AND timestamp >= now() - INTERVAL 1 MINUTE) as page_views
      FROM analytics_events
      WHERE timestamp >= now() - INTERVAL 1 HOUR
      GROUP BY JSONExtractString(properties, 'page_url')
      ORDER BY page_views DESC
      LIMIT 10
    `;

    return this.query(sql);
  }

  // Table Management
  async createTables(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // Create analytics_events table
      await this.client.command({
        query: `
        CREATE TABLE IF NOT EXISTS analytics_events (
          id String,
          user_id String,
          session_id String,
          event_type String,
          timestamp DateTime64(3),
          properties String,
          context String,
          metadata String,
          created_at DateTime64(3) DEFAULT now(),
          partition_date Date DEFAULT toDate(timestamp)
        ) ENGINE = MergeTree()
        PARTITION BY partition_date
        ORDER BY (user_id, timestamp, event_type)
        TTL timestamp + INTERVAL 2 YEAR
        `
      });

      // Create analytics_aggregations table
      await this.client.command({
        query: `
        CREATE TABLE IF NOT EXISTS analytics_aggregations (
          aggregation_id String,
          metric_name String,
          metric_type String,
          dimensions String,
          value Float64,
          period String,
          created_at DateTime64(3) DEFAULT now()
        ) ENGINE = SummingMergeTree()
        ORDER BY (metric_name, period, dimensions)
        TTL created_at + INTERVAL 1 YEAR
        `
      });

      logger.info('ClickHouse tables created successfully');
    } catch (error) {
      logError(error as Error, { action: 'create_clickhouse_tables' });
      throw error;
    }
  }

  async dropTables(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.client.command({
        query: 'DROP TABLE IF EXISTS analytics_events'
      });
      await this.client.command({
        query: 'DROP TABLE IF EXISTS analytics_aggregations'
      });

      logger.info('ClickHouse tables dropped successfully');
    } catch (error) {
      logError(error as Error, { action: 'drop_clickhouse_tables' });
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logError(error as Error, { action: 'clickhouse_health_check' });
      return false;
    }
  }
}

// Singleton instance
export const clickhouseClient = new ClickHouseAnalyticsClient();
