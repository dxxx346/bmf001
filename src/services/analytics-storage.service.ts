import { AnalyticsEvent, AnalyticsQuery, AnalyticsResponse, AnalyticsStorageConfig } from '@/types/analytics';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

// ClickHouse client interface
interface ClickHouseClient {
  insert(table: string, data: any[]): Promise<void>;
  query(sql: string, params?: any): Promise<any[]>;
  close(): Promise<void>;
}

// BigQuery client interface
interface BigQueryClient {
  dataset(datasetId: string): any;
  query(query: string, params?: any): Promise<any[]>;
  close(): Promise<void>;
}

export class AnalyticsStorageService {
  private config: AnalyticsStorageConfig;
  private clickhouseClient?: ClickHouseClient;
  private bigqueryClient?: BigQueryClient;

  constructor(config: AnalyticsStorageConfig) {
    this.config = config;
  }

  /**
   * Initialize the storage client
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.provider === 'clickhouse') {
        await this.initializeClickHouse();
      } else if (this.config.provider === 'bigquery') {
        await this.initializeBigQuery();
      }
      
      logger.info('Analytics storage initialized', { provider: this.config.provider });
    } catch (error) {
      logError(error as Error, { provider: this.config.provider });
      throw error;
    }
  }

  /**
   * Initialize ClickHouse client
   */
  private async initializeClickHouse(): Promise<void> {
    try {
      // Dynamic import for ClickHouse client
      let createClient: any;
      try {
        const clickhouseModule = await import('@clickhouse/client');
        createClient = clickhouseModule.createClient;
      } catch (importError) {
        throw new Error('ClickHouse client not installed. Install with: npm install @clickhouse/client');
      }
      
      this.clickhouseClient = createClient({
        host: `http://${this.config.connection.host}:${this.config.connection.port}`,
        username: this.config.connection.username,
        password: this.config.connection.password,
        database: this.config.connection.database,
        clickhouse_settings: {
          async_insert: 1,
          wait_for_async_insert: 0,
        }
      });

      // Create tables if they don't exist
      await this.createClickHouseTables();
    } catch (error) {
      logError(error as Error, {});
      throw error;
    }
  }

  /**
   * Initialize BigQuery client
   */
  private async initializeBigQuery(): Promise<void> {
    try {
      // Dynamic import for BigQuery client
      let BigQuery: any;
      try {
        const bigqueryModule = await import('@google-cloud/bigquery');
        BigQuery = bigqueryModule.BigQuery;
      } catch (importError) {
        throw new Error('BigQuery client not installed. Install with: npm install @google-cloud/bigquery');
      }
      
      this.bigqueryClient = new BigQuery({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
        credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? 
          JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
      });

      // Create tables if they don't exist
      await this.createBigQueryTables();
    } catch (error) {
      logError(error as Error, {});
      throw error;
    }
  }

  /**
   * Insert events into storage
   */
  async insertEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      if (this.config.provider === 'clickhouse') {
        await this.insertEventsToClickHouse(events);
      } else if (this.config.provider === 'bigquery') {
        await this.insertEventsToBigQuery(events);
      }
      
      logger.info('Events inserted successfully', { count: events.length, provider: this.config.provider });
    } catch (error) {
      logError(error as Error, { count: events.length });
      throw error;
    }
  }

  /**
   * Query analytics data
   */
  async queryAnalytics(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    try {
      if (this.config.provider === 'clickhouse') {
        return await this.queryClickHouse(query);
      } else if (this.config.provider === 'bigquery') {
        return await this.queryBigQuery(query);
      }
      
      throw new Error('Unsupported storage provider');
    } catch (error) {
      logError(error as Error, { query });
      throw error;
    }
  }

  /**
   * Get funnel analysis data
   */
  async getFunnelData(funnelSteps: string[], query: AnalyticsQuery): Promise<any[]> {
    try {
      if (this.config.provider === 'clickhouse') {
        return await this.getClickHouseFunnelData(funnelSteps, query);
      } else if (this.config.provider === 'bigquery') {
        return await this.getBigQueryFunnelData(funnelSteps, query);
      }
      
      throw new Error('Unsupported storage provider');
    } catch (error) {
      logError(error as Error, { funnelSteps });
      throw error;
    }
  }

  /**
   * Get cohort analysis data
   */
  async getCohortData(query: AnalyticsQuery): Promise<any[]> {
    try {
      if (this.config.provider === 'clickhouse') {
        return await this.getClickHouseCohortData(query);
      } else if (this.config.provider === 'bigquery') {
        return await this.getBigQueryCohortData(query);
      }
      
      throw new Error('Unsupported storage provider');
    } catch (error) {
      logError(error as Error, {});
      throw error;
    }
  }

  /**
   * Get revenue forecasting data
   */
  async getRevenueForecastData(query: AnalyticsQuery): Promise<any[]> {
    try {
      if (this.config.provider === 'clickhouse') {
        return await this.getClickHouseRevenueData(query);
      } else if (this.config.provider === 'bigquery') {
        return await this.getBigQueryRevenueData(query);
      }
      
      throw new Error('Unsupported storage provider');
    } catch (error) {
      logError(error as Error, {});
      throw error;
    }
  }

  /**
   * Create ClickHouse tables
   */
  private async createClickHouseTables(): Promise<void> {
    if (!this.clickhouseClient) return;

    const createEventsTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.tables.events} (
        id String,
        timestamp DateTime64(3),
        session_id String,
        user_id Nullable(String),
        anonymous_id Nullable(String),
        event_type String,
        properties String,
        context String,
        date Date MATERIALIZED toDate(timestamp),
        hour UInt8 MATERIALIZED toHour(timestamp)
      ) ENGINE = MergeTree()
      PARTITION BY date
      ORDER BY (timestamp, event_type, user_id)
      SETTINGS index_granularity = 8192
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.tables.users} (
        user_id String,
        first_seen DateTime64(3),
        last_seen DateTime64(3),
        total_events UInt32,
        total_sessions UInt32,
        properties String
      ) ENGINE = ReplacingMergeTree()
      ORDER BY user_id
    `;

    const createProductsTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.tables.products} (
        product_id String,
        first_viewed DateTime64(3),
        last_viewed DateTime64(3),
        total_views UInt32,
        total_purchases UInt32,
        total_revenue Decimal(10,2),
        properties String
      ) ENGINE = ReplacingMergeTree()
      ORDER BY product_id
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.tables.sessions} (
        session_id String,
        user_id Nullable(String),
        started_at DateTime64(3),
        ended_at Nullable(DateTime64(3)),
        duration UInt32,
        page_views UInt16,
        events UInt16,
        properties String
      ) ENGINE = ReplacingMergeTree()
      ORDER BY session_id
    `;

    await this.clickhouseClient.query(createEventsTable);
    await this.clickhouseClient.query(createUsersTable);
    await this.clickhouseClient.query(createProductsTable);
    await this.clickhouseClient.query(createSessionsTable);
  }

  /**
   * Create BigQuery tables
   */
  private async createBigQueryTables(): Promise<void> {
    if (!this.bigqueryClient) return;

    const dataset = this.bigqueryClient.dataset(this.config.connection.database);

    const eventsSchema = [
      { name: 'id', type: 'STRING' },
      { name: 'timestamp', type: 'TIMESTAMP' },
      { name: 'session_id', type: 'STRING' },
      { name: 'user_id', type: 'STRING' },
      { name: 'anonymous_id', type: 'STRING' },
      { name: 'event_type', type: 'STRING' },
      { name: 'properties', type: 'JSON' },
      { name: 'context', type: 'JSON' }
    ];

    const usersSchema = [
      { name: 'user_id', type: 'STRING' },
      { name: 'first_seen', type: 'TIMESTAMP' },
      { name: 'last_seen', type: 'TIMESTAMP' },
      { name: 'total_events', type: 'INTEGER' },
      { name: 'total_sessions', type: 'INTEGER' },
      { name: 'properties', type: 'JSON' }
    ];

    const productsSchema = [
      { name: 'product_id', type: 'STRING' },
      { name: 'first_viewed', type: 'TIMESTAMP' },
      { name: 'last_viewed', type: 'TIMESTAMP' },
      { name: 'total_views', type: 'INTEGER' },
      { name: 'total_purchases', type: 'INTEGER' },
      { name: 'total_revenue', type: 'NUMERIC' },
      { name: 'properties', type: 'JSON' }
    ];

    const sessionsSchema = [
      { name: 'session_id', type: 'STRING' },
      { name: 'user_id', type: 'STRING' },
      { name: 'started_at', type: 'TIMESTAMP' },
      { name: 'ended_at', type: 'TIMESTAMP' },
      { name: 'duration', type: 'INTEGER' },
      { name: 'page_views', type: 'INTEGER' },
      { name: 'events', type: 'INTEGER' },
      { name: 'properties', type: 'JSON' }
    ];

    await dataset.table(this.config.tables.events).create({ schema: eventsSchema });
    await dataset.table(this.config.tables.users).create({ schema: usersSchema });
    await dataset.table(this.config.tables.products).create({ schema: productsSchema });
    await dataset.table(this.config.tables.sessions).create({ schema: sessionsSchema });
  }

  /**
   * Insert events to ClickHouse
   */
  private async insertEventsToClickHouse(events: AnalyticsEvent[]): Promise<void> {
    if (!this.clickhouseClient) return;

    const formattedEvents = events.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      session_id: event.session_id,
      user_id: event.user_id || null,
      anonymous_id: event.anonymous_id || null,
      event_type: event.event_type,
      properties: JSON.stringify(event.properties),
      context: JSON.stringify(event.context)
    }));

    await this.clickhouseClient.insert(this.config.tables.events, formattedEvents);
  }

  /**
   * Insert events to BigQuery
   */
  private async insertEventsToBigQuery(events: AnalyticsEvent[]): Promise<void> {
    if (!this.bigqueryClient) return;

    const dataset = this.bigqueryClient.dataset(this.config.connection.database);
    const table = dataset.table(this.config.tables.events);

    const formattedEvents = events.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      session_id: event.session_id,
      user_id: event.user_id,
      anonymous_id: event.anonymous_id,
      event_type: event.event_type,
      properties: event.properties,
      context: event.context
    }));

    await table.insert(formattedEvents);
  }

  /**
   * Query ClickHouse
   */
  private async queryClickHouse(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    if (!this.clickhouseClient) throw new Error('ClickHouse client not initialized');

    const startTime = Date.now();
    
    let sql = `
      SELECT 
        id,
        timestamp,
        session_id,
        user_id,
        anonymous_id,
        event_type,
        properties,
        context
      FROM ${this.config.tables.events}
      WHERE timestamp >= ? 
        AND timestamp <= ?
    `;
    
    const params: any[] = [query.start_date, query.end_date];

    // Add filters with parameterized queries
    if (query.filters?.user_id) {
      sql += ` AND user_id = ?`;
      params.push(query.filters.user_id);
    }
    if (query.filters?.product_id) {
      sql += ` AND JSONExtractString(properties, 'product_id') = ?`;
      params.push(query.filters.product_id);
    }
    if (query.filters?.event_type) {
      sql += ` AND event_type = ?`;
      params.push(query.filters.event_type);
    }

    // Add grouping
    if (query.group_by && query.group_by.length > 0) {
      sql += ` GROUP BY ${query.group_by.join(', ')}`;
    }

    // Add ordering and limit
    const limit = query.limit || 1000;
    sql += ` ORDER BY timestamp DESC LIMIT ${limit}`;

    const data = await this.clickhouseClient.query(sql, params);
    const queryTime = Date.now() - startTime;
    
    return {
      data: data || [],
      total: data?.length || 0,
      page: 1,
      limit,
      has_more: false,
      query_time: queryTime,
      cached: false
    };
  }

  /**
   * Query BigQuery
   */
  private async queryBigQuery(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    if (!this.bigqueryClient) throw new Error('BigQuery client not initialized');

    const startTime = Date.now();
    
    let sql = `
      SELECT 
        id,
        timestamp,
        session_id,
        user_id,
        anonymous_id,
        event_type,
        properties,
        context
      FROM \`${this.config.connection.database}.${this.config.tables.events}\`
      WHERE timestamp >= @start_date 
        AND timestamp <= @end_date
    `;
    
    const params: Record<string, any> = {
      start_date: query.start_date,
      end_date: query.end_date
    };

    // Add filters with parameterized queries
    if (query.filters?.user_id) {
      sql += ` AND user_id = @user_id`;
      params.user_id = query.filters.user_id;
    }
    if (query.filters?.product_id) {
      sql += ` AND JSON_EXTRACT_SCALAR(properties, '$.product_id') = @product_id`;
      params.product_id = query.filters.product_id;
    }
    if (query.filters?.event_type) {
      sql += ` AND event_type = @event_type`;
      params.event_type = query.filters.event_type;
    }

    // Add grouping
    if (query.group_by && query.group_by.length > 0) {
      sql += ` GROUP BY ${query.group_by.join(', ')}`;
    }

    // Add ordering and limit
    const limit = query.limit || 1000;
    sql += ` ORDER BY timestamp DESC LIMIT ${limit}`;

    const [rows] = await this.bigqueryClient.query(sql, params);
    const queryTime = Date.now() - startTime;
    
    return {
      data: rows || [],
      total: rows?.length || 0,
      page: 1,
      limit,
      has_more: false,
      query_time: queryTime,
      cached: false
    };
  }

  /**
   * Get ClickHouse funnel data
   */
  private async getClickHouseFunnelData(funnelSteps: string[], query: AnalyticsQuery): Promise<any[]> {
    if (!this.clickhouseClient) throw new Error('ClickHouse client not initialized');

    const stepConditions = funnelSteps.map((step, index) => 
      `WHEN event_type = ? THEN ${index + 1}`
    ).join(' ');

    const sql = `
      WITH funnel_events AS (
        SELECT 
          user_id,
          event_type,
          timestamp,
          CASE ${stepConditions} END as step_number
        FROM ${this.config.tables.events}
        WHERE timestamp >= ? 
          AND timestamp <= ?
          AND event_type IN (${funnelSteps.map(() => '?').join(', ')})
          AND user_id IS NOT NULL
      ),
      user_steps AS (
        SELECT 
          user_id,
          MIN(step_number) as first_step,
          MAX(step_number) as last_step,
          COUNT(DISTINCT step_number) as steps_completed
        FROM funnel_events
        GROUP BY user_id
      )
      SELECT 
        step_number,
        COUNT(DISTINCT user_id) as users_reached,
        COUNT(DISTINCT CASE WHEN step_number <= last_step THEN user_id END) as users_completed
      FROM funnel_events fe
      JOIN user_steps us ON fe.user_id = us.user_id
      GROUP BY step_number
      ORDER BY step_number
    `;

    const params = [query.start_date, query.end_date, ...funnelSteps];
    return await this.clickhouseClient.query(sql, params);
  }

  /**
   * Get BigQuery funnel data
   */
  private async getBigQueryFunnelData(funnelSteps: string[], query: AnalyticsQuery): Promise<any[]> {
    if (!this.bigqueryClient) throw new Error('BigQuery client not initialized');

    const stepConditions = funnelSteps.map((step, index) => 
      `WHEN event_type = @step_${index} THEN ${index + 1}`
    ).join(' ');

    const sql = `
      WITH funnel_events AS (
        SELECT 
          user_id,
          event_type,
          timestamp,
          CASE ${stepConditions} END as step_number
        FROM \`${this.config.connection.database}.${this.config.tables.events}\`
        WHERE timestamp >= @start_date 
          AND timestamp <= @end_date
          AND event_type IN (${funnelSteps.map((_, i) => `@step_${i}`).join(', ')})
          AND user_id IS NOT NULL
      ),
      user_steps AS (
        SELECT 
          user_id,
          MIN(step_number) as first_step,
          MAX(step_number) as last_step,
          COUNT(DISTINCT step_number) as steps_completed
        FROM funnel_events
        GROUP BY user_id
      )
      SELECT 
        step_number,
        COUNT(DISTINCT user_id) as users_reached,
        COUNT(DISTINCT CASE WHEN step_number <= last_step THEN user_id END) as users_completed
      FROM funnel_events fe
      JOIN user_steps us ON fe.user_id = us.user_id
      GROUP BY step_number
      ORDER BY step_number
    `;

    const params: Record<string, any> = {
      start_date: query.start_date,
      end_date: query.end_date,
      ...funnelSteps.reduce((acc, step, index) => {
        acc[`step_${index}`] = step;
        return acc;
      }, {} as Record<string, string>)
    };

    const [rows] = await this.bigqueryClient.query(sql, params);
    return rows || [];
  }

  /**
   * Get ClickHouse cohort data
   */
  private async getClickHouseCohortData(query: AnalyticsQuery): Promise<any[]> {
    if (!this.clickhouseClient) throw new Error('ClickHouse client not initialized');

    const sql = `
      WITH user_cohorts AS (
        SELECT 
          user_id,
          toStartOfMonth(MIN(timestamp)) as cohort_month
        FROM ${this.config.tables.events}
        WHERE timestamp >= ? 
          AND timestamp <= ?
          AND user_id IS NOT NULL
        GROUP BY user_id
      ),
      monthly_activity AS (
        SELECT 
          user_id,
          toStartOfMonth(timestamp) as activity_month,
          COUNT(*) as events
        FROM ${this.config.tables.events}
        WHERE timestamp >= ? 
          AND timestamp <= ?
          AND user_id IS NOT NULL
        GROUP BY user_id, activity_month
      )
      SELECT 
        uc.cohort_month,
        ma.activity_month,
        COUNT(DISTINCT uc.user_id) as cohort_size,
        COUNT(DISTINCT ma.user_id) as active_users,
        ROUND(COUNT(DISTINCT ma.user_id) * 100.0 / COUNT(DISTINCT uc.user_id), 2) as retention_rate
      FROM user_cohorts uc
      LEFT JOIN monthly_activity ma ON uc.user_id = ma.user_id
      GROUP BY uc.cohort_month, ma.activity_month
      ORDER BY uc.cohort_month, ma.activity_month
    `;

    const params = [query.start_date, query.end_date, query.start_date, query.end_date];
    return await this.clickhouseClient.query(sql, params);
  }

  /**
   * Get BigQuery cohort data
   */
  private async getBigQueryCohortData(query: AnalyticsQuery): Promise<any[]> {
    if (!this.bigqueryClient) throw new Error('BigQuery client not initialized');

    const sql = `
      WITH user_cohorts AS (
        SELECT 
          user_id,
          DATE_TRUNC(MIN(timestamp), MONTH) as cohort_month
        FROM \`${this.config.connection.database}.${this.config.tables.events}\`
        WHERE timestamp >= @start_date 
          AND timestamp <= @end_date
          AND user_id IS NOT NULL
        GROUP BY user_id
      ),
      monthly_activity AS (
        SELECT 
          user_id,
          DATE_TRUNC(timestamp, MONTH) as activity_month,
          COUNT(*) as events
        FROM \`${this.config.connection.database}.${this.config.tables.events}\`
        WHERE timestamp >= @start_date 
          AND timestamp <= @end_date
          AND user_id IS NOT NULL
        GROUP BY user_id, activity_month
      )
      SELECT 
        uc.cohort_month,
        ma.activity_month,
        COUNT(DISTINCT uc.user_id) as cohort_size,
        COUNT(DISTINCT ma.user_id) as active_users,
        ROUND(COUNT(DISTINCT ma.user_id) * 100.0 / COUNT(DISTINCT uc.user_id), 2) as retention_rate
      FROM user_cohorts uc
      LEFT JOIN monthly_activity ma ON uc.user_id = ma.user_id
      GROUP BY uc.cohort_month, ma.activity_month
      ORDER BY uc.cohort_month, ma.activity_month
    `;

    const params = {
      start_date: query.start_date,
      end_date: query.end_date
    };

    const [rows] = await this.bigqueryClient.query(sql, params);
    return rows || [];
  }

  /**
   * Get ClickHouse revenue data
   */
  private async getClickHouseRevenueData(query: AnalyticsQuery): Promise<any[]> {
    if (!this.clickhouseClient) throw new Error('ClickHouse client not initialized');

    const sql = `
      SELECT 
        toDate(timestamp) as date,
        COUNT(*) as events,
        SUM(JSONExtractFloat(properties, 'amount')) as revenue,
        COUNT(DISTINCT user_id) as unique_users
      FROM ${this.config.tables.events}
      WHERE timestamp >= ? 
        AND timestamp <= ?
        AND event_type = ?
      GROUP BY date
      ORDER BY date
    `;

    const params = [query.start_date, query.end_date, 'purchase'];
    return await this.clickhouseClient.query(sql, params);
  }

  /**
   * Get BigQuery revenue data
   */
  private async getBigQueryRevenueData(query: AnalyticsQuery): Promise<any[]> {
    if (!this.bigqueryClient) throw new Error('BigQuery client not initialized');

    const sql = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as events,
        SUM(CAST(JSON_EXTRACT_SCALAR(properties, '$.amount') AS FLOAT64)) as revenue,
        COUNT(DISTINCT user_id) as unique_users
      FROM \`${this.config.connection.database}.${this.config.tables.events}\`
      WHERE timestamp >= @start_date 
        AND timestamp <= @end_date
        AND event_type = @event_type
      GROUP BY date
      ORDER BY date
    `;

    const params = {
      start_date: query.start_date,
      end_date: query.end_date,
      event_type: 'purchase'
    };

    const [rows] = await this.bigqueryClient.query(sql, params);
    return rows || [];
  }

  /**
   * Close the storage client
   */
  async close(): Promise<void> {
    try {
      if (this.clickhouseClient) {
        await this.clickhouseClient.close();
      }
      if (this.bigqueryClient) {
        await this.bigqueryClient.close();
      }
      
      logger.info('Analytics storage closed');
    } catch (error) {
      logError(error as Error, {});
    }
  }
}
