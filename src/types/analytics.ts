// Analytics types for comprehensive tracking and analysis

export type EventType = 
  | 'page_view'
  | 'click'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'purchase'
  | 'signup'
  | 'login'
  | 'logout'
  | 'search'
  | 'filter'
  | 'referral_click'
  | 'referral_signup'
  | 'referral_purchase'
  | 'ab_test_view'
  | 'ab_test_convert'
  | 'email_open'
  | 'email_click'
  | 'download'
  | 'upload'
  | 'review'
  | 'favorite'
  | 'share'
  | 'error';

export type UserSegment = 
  | 'new_user'
  | 'returning_user'
  | 'high_value'
  | 'at_risk'
  | 'churned'
  | 'vip'
  | 'bargain_hunter'
  | 'premium_buyer';

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';
export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';
export type OS = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'other';

// Base Analytics Event
export interface AnalyticsEvent {
  id: string;
  user_id?: string;
  anonymous_id?: string;
  session_id: string;
  event_type: EventType;
  timestamp: string;
  properties: Record<string, any>;
  context: EventContext;
  metadata: EventMetadata;
}

export interface EventContext {
  page_url: string;
  page_title: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  device_type: DeviceType;
  browser: BrowserType;
  os: OS;
  screen_resolution: string;
  viewport_size: string;
  language: string;
  timezone: string;
  country?: string;
  city?: string;
  ip_address?: string;
  user_agent: string;
}

export interface EventMetadata {
  experiment_id?: string;
  variant_id?: string;
  cohort_id?: string;
  funnel_step?: number;
  conversion_value?: number;
  attribution_source?: string;
  attribution_medium?: string;
  attribution_campaign?: string;
  attribution_term?: string;
  attribution_content?: string;
  attribution_touchpoint?: number;
  attribution_model?: 'first_click' | 'last_click' | 'linear' | 'time_decay' | 'position_based';
  custom_dimensions?: Record<string, string>;
  custom_metrics?: Record<string, number>;
}

// User Behavior Analytics
export interface UserBehaviorMetrics {
  user_id: string;
  period: string;
  page_views: number;
  unique_pages: number;
  session_duration: number;
  bounce_rate: number;
  pages_per_session: number;
  return_visits: number;
  conversion_rate: number;
  revenue: number;
  last_activity: string;
  user_segment: UserSegment;
  engagement_score: number;
  retention_rate: number;
}

export interface ConversionFunnel {
  funnel_id: string;
  funnel_name: string;
  steps: FunnelStep[];
  total_entered: number;
  total_converted: number;
  conversion_rate: number;
  drop_off_rates: number[];
  average_time_to_convert: number;
  period: string;
}

export interface FunnelStep {
  step_number: number;
  step_name: string;
  page_url: string;
  entered: number;
  converted: number;
  conversion_rate: number;
  drop_off_rate: number;
  average_time_on_step: number;
}

// Product Performance Analytics
export interface ProductPerformanceMetrics {
  product_id: string;
  period: string;
  views: number;
  unique_viewers: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
  cart_abandonment_rate: number;
  average_order_value: number;
  return_rate: number;
  rating_average: number;
  rating_count: number;
  search_impressions: number;
  search_clicks: number;
  ctr: number;
  position_average: number;
  category_performance: CategoryPerformance;
  competitor_analysis: CompetitorAnalysis;
}

export interface CategoryPerformance {
  category_id: string;
  category_name: string;
  market_share: number;
  growth_rate: number;
  average_price: number;
  price_competitiveness: number;
  seasonal_trends: SeasonalTrend[];
}

export interface SeasonalTrend {
  month: number;
  demand_index: number;
  price_index: number;
  competition_index: number;
}

export interface CompetitorAnalysis {
  competitor_products: CompetitorProduct[];
  price_positioning: 'premium' | 'mid_market' | 'budget';
  feature_gaps: string[];
  advantage_areas: string[];
}

export interface CompetitorProduct {
  product_id: string;
  product_name: string;
  price: number;
  rating: number;
  features: string[];
  market_share: number;
}

// Referral Analytics
export interface ReferralMetrics {
  referrer_id: string;
  period: string;
  total_referrals: number;
  successful_referrals: number;
  conversion_rate: number;
  total_revenue: number;
  commission_earned: number;
  average_referral_value: number;
  top_referral_sources: ReferralSource[];
  referral_quality_score: number;
  retention_rate: number;
  lifetime_value: number;
}

export interface ReferralSource {
  source: string;
  referrals: number;
  conversions: number;
  revenue: number;
  conversion_rate: number;
  quality_score: number;
}

// A/B Testing Framework
export interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  start_date: string;
  end_date?: string;
  traffic_allocation: number; // 0-100
  variants: ExperimentVariant[];
  metrics: ExperimentMetric[];
  segments: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  traffic_percentage: number;
  configuration: Record<string, any>;
  is_control: boolean;
}

export interface ExperimentMetric {
  name: string;
  type: 'conversion' | 'revenue' | 'engagement' | 'custom';
  goal: 'maximize' | 'minimize';
  primary: boolean;
  target_value?: number;
}

export interface ExperimentResult {
  experiment_id: string;
  variant_id: string;
  variant_name: string;
  participants: number;
  conversions: number;
  conversion_rate: number;
  confidence_level: number;
  statistical_significance: boolean;
  lift: number;
  p_value: number;
  revenue: number;
  average_order_value: number;
  metrics: Record<string, number>;
  start_date: string;
  end_date: string;
}

// Cohort Analysis
export interface Cohort {
  cohort_id: string;
  cohort_name: string;
  cohort_type: 'signup' | 'first_purchase' | 'custom';
  cohort_date: string;
  cohort_size: number;
  retention_rates: CohortRetentionRate[];
  revenue_metrics: CohortRevenueMetrics;
  behavior_metrics: CohortBehaviorMetrics;
}

export interface CohortRetentionRate {
  period: number; // days/weeks/months
  period_type: 'day' | 'week' | 'month';
  active_users: number;
  retention_rate: number;
  churn_rate: number;
}

export interface CohortRevenueMetrics {
  total_revenue: number;
  average_revenue_per_user: number;
  revenue_growth_rate: number;
  lifetime_value: number;
  payback_period: number;
}

export interface CohortBehaviorMetrics {
  average_session_duration: number;
  pages_per_session: number;
  conversion_rate: number;
  repeat_purchase_rate: number;
  engagement_score: number;
}

// Revenue Forecasting
export interface RevenueForecast {
  forecast_id: string;
  forecast_name: string;
  forecast_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period: string;
  forecast_date: string;
  predictions: RevenuePrediction[];
  confidence_intervals: ConfidenceInterval[];
  accuracy_metrics: ForecastAccuracy;
  model_info: ModelInfo;
}

export interface RevenuePrediction {
  date: string;
  predicted_revenue: number;
  predicted_orders: number;
  predicted_customers: number;
  predicted_aov: number;
  seasonality_factor: number;
  trend_factor: number;
  external_factors: ExternalFactor[];
}

export interface ConfidenceInterval {
  date: string;
  lower_bound: number;
  upper_bound: number;
  confidence_level: number;
}

export interface ForecastAccuracy {
  mae: number; // Mean Absolute Error
  mse: number; // Mean Squared Error
  rmse: number; // Root Mean Squared Error
  mape: number; // Mean Absolute Percentage Error
  r_squared: number;
  last_updated: string;
}

export interface ModelInfo {
  model_type: 'arima' | 'prophet' | 'linear_regression' | 'neural_network' | 'ensemble';
  parameters: Record<string, any>;
  training_data_period: string;
  last_trained: string;
  version: string;
}

export interface ExternalFactor {
  name: string;
  impact: number; // -1 to 1
  description: string;
  source: string;
}

// Analytics Dashboard Data
export interface AnalyticsDashboard {
  period: string;
  overview: OverviewMetrics;
  user_behavior: UserBehaviorMetrics[];
  product_performance: ProductPerformanceMetrics[];
  referral_metrics: ReferralMetrics[];
  experiments: ExperimentResult[];
  cohorts: Cohort[];
  revenue_forecast: RevenueForecast;
  real_time_events: AnalyticsEvent[];
  top_pages: PageMetrics[];
  top_products: ProductMetrics[];
  conversion_funnels: ConversionFunnel[];
  last_updated: string;
}

export interface OverviewMetrics {
  total_users: number;
  active_users: number;
  new_users: number;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  conversion_rate: number;
  bounce_rate: number;
  session_duration: number;
  pages_per_session: number;
  growth_rate: number;
  retention_rate: number;
}

export interface PageMetrics {
  page_url: string;
  page_title: string;
  views: number;
  unique_viewers: number;
  bounce_rate: number;
  average_time_on_page: number;
  exit_rate: number;
  conversion_rate: number;
  revenue: number;
}

export interface ProductMetrics {
  product_id: string;
  product_name: string;
  views: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
  rating: number;
  category: string;
}

// ClickHouse/BigQuery Storage Types
export interface AnalyticsEventRecord {
  id: string;
  user_id: string;
  session_id: string;
  event_type: string;
  timestamp: string;
  properties: string; // JSON string
  context: string; // JSON string
  metadata: string; // JSON string
  created_at: string;
  partition_date: string; // YYYY-MM-DD for partitioning
}

export interface AnalyticsAggregation {
  aggregation_id: string;
  metric_name: string;
  metric_type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  dimensions: Record<string, string>;
  value: number;
  period: string;
  created_at: string;
}

// API Request/Response Types
export interface AnalyticsQuery {
  start_date: string;
  end_date: string;
  metrics: string[];
  dimensions: string[];
  filters?: {
    user_id?: string;
    product_id?: string;
    event_type?: string;
    [key: string]: any;
  };
  group_by: string[];
  order_by: OrderByClause[];
  limit?: number;
  offset?: number;
}

export interface AnalyticsFilter {
  dimension: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  values?: any[];
}

export interface OrderByClause {
  dimension: string;
  direction: 'asc' | 'desc';
}

export interface AnalyticsResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  query_time: number;
  cached: boolean;
  cache_ttl?: number;
}

// Real-time Analytics
export interface RealTimeMetrics {
  active_users: number;
  page_views_per_minute: number;
  conversions_per_minute: number;
  revenue_per_minute: number;
  top_pages: Array<{ page: string; views: number }>;
  top_products: Array<{ product: string; views: number }>;
  top_referrers: Array<{ referrer: string; visits: number }>;
  device_breakdown: Record<DeviceType, number>;
  country_breakdown: Record<string, number>;
  last_updated: string;
}

// Storage Configuration
export interface AnalyticsStorageConfig {
  provider: 'clickhouse' | 'bigquery';
  connection: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  tables: {
    events: string;
    users: string;
    products: string;
    sessions: string;
  };
  batch_size?: number;
  flush_interval?: number;
  retry_attempts?: number;
  timeout?: number;
}

// All types are already exported above