-- Analytics Tables Migration
-- This migration creates tables for comprehensive analytics tracking

-- Experiments table for A/B testing
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  status TEXT CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')) DEFAULT 'draft',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  traffic_allocation INTEGER DEFAULT 100 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
  variants JSONB NOT NULL DEFAULT '[]',
  metrics JSONB NOT NULL DEFAULT '[]',
  segments TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experiment assignments table
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id TEXT REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(experiment_id, user_id)
);

-- Experiment conversions table
CREATE TABLE IF NOT EXISTS experiment_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id TEXT REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value DECIMAL(10,2) DEFAULT 1.0,
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cohorts table
CREATE TABLE IF NOT EXISTS cohorts (
  cohort_id TEXT PRIMARY KEY,
  cohort_name TEXT NOT NULL,
  cohort_type TEXT CHECK (cohort_type IN ('signup', 'first_purchase', 'custom')) NOT NULL,
  cohort_date TIMESTAMP WITH TIME ZONE NOT NULL,
  cohort_size INTEGER DEFAULT 0,
  retention_rates JSONB DEFAULT '[]',
  revenue_metrics JSONB DEFAULT '{}',
  behavior_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue forecasts table
CREATE TABLE IF NOT EXISTS revenue_forecasts (
  forecast_id TEXT PRIMARY KEY,
  forecast_name TEXT NOT NULL,
  forecast_type TEXT CHECK (forecast_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')) NOT NULL,
  period TEXT NOT NULL,
  forecast_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  predictions JSONB DEFAULT '[]',
  confidence_intervals JSONB DEFAULT '[]',
  accuracy_metrics JSONB DEFAULT '{}',
  model_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events table (for Supabase storage)
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  properties JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics aggregations table
CREATE TABLE IF NOT EXISTS analytics_aggregations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregation_id TEXT UNIQUE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT CHECK (metric_type IN ('count', 'sum', 'avg', 'min', 'max', 'distinct')) NOT NULL,
  dimensions JSONB DEFAULT '{}',
  value DECIMAL(15,4) NOT NULL,
  period TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User behavior metrics table
CREATE TABLE IF NOT EXISTS user_behavior_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_pages INTEGER DEFAULT 0,
  session_duration DECIMAL(10,2) DEFAULT 0,
  bounce_rate DECIMAL(5,4) DEFAULT 0,
  pages_per_session DECIMAL(5,2) DEFAULT 0,
  return_visits INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_segment TEXT CHECK (user_segment IN ('new_user', 'returning_user', 'high_value', 'at_risk', 'churned', 'vip', 'bargain_hunter', 'premium_buyer')),
  engagement_score DECIMAL(5,4) DEFAULT 0,
  retention_rate DECIMAL(5,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period)
);

-- Product performance metrics table
CREATE TABLE IF NOT EXISTS product_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  cart_abandonment_rate DECIMAL(5,4) DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  return_rate DECIMAL(5,4) DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  search_impressions INTEGER DEFAULT 0,
  search_clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  position_average DECIMAL(5,2) DEFAULT 0,
  category_performance JSONB DEFAULT '{}',
  competitor_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, period)
);

-- Referral metrics table
CREATE TABLE IF NOT EXISTS referral_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  commission_earned DECIMAL(10,2) DEFAULT 0,
  average_referral_value DECIMAL(10,2) DEFAULT 0,
  top_referral_sources JSONB DEFAULT '[]',
  referral_quality_score DECIMAL(5,4) DEFAULT 0,
  retention_rate DECIMAL(5,4) DEFAULT 0,
  lifetime_value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, period)
);

-- Conversion funnels table
CREATE TABLE IF NOT EXISTS conversion_funnels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_id TEXT UNIQUE NOT NULL,
  funnel_name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  total_entered INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  drop_off_rates JSONB DEFAULT '[]',
  average_time_to_convert DECIMAL(10,2) DEFAULT 0,
  period TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time metrics table
CREATE TABLE IF NOT EXISTS real_time_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  active_users INTEGER DEFAULT 0,
  page_views_per_minute INTEGER DEFAULT 0,
  conversions_per_minute INTEGER DEFAULT 0,
  revenue_per_minute DECIMAL(10,2) DEFAULT 0,
  top_pages JSONB DEFAULT '[]',
  top_products JSONB DEFAULT '[]',
  top_referrers JSONB DEFAULT '[]',
  device_breakdown JSONB DEFAULT '{}',
  country_breakdown JSONB DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment_id ON experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user_id ON experiment_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_experiment_conversions_experiment_id ON experiment_conversions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_conversions_user_id ON experiment_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_conversions_converted_at ON experiment_conversions(converted_at);

CREATE INDEX IF NOT EXISTS idx_user_behavior_metrics_user_id ON user_behavior_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_metrics_period ON user_behavior_metrics(period);

CREATE INDEX IF NOT EXISTS idx_product_performance_metrics_product_id ON product_performance_metrics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_performance_metrics_period ON product_performance_metrics(period);

CREATE INDEX IF NOT EXISTS idx_referral_metrics_referrer_id ON referral_metrics(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_metrics_period ON referral_metrics(period);

-- RLS Policies
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for experiments (admin only)
CREATE POLICY "Only admins can manage experiments" ON experiments
  FOR ALL USING (auth.role() = 'admin');

CREATE POLICY "Only admins can manage experiment assignments" ON experiment_assignments
  FOR ALL USING (auth.role() = 'admin');

CREATE POLICY "Only admins can manage experiment conversions" ON experiment_conversions
  FOR ALL USING (auth.role() = 'admin');

-- Policies for cohorts (admin only)
CREATE POLICY "Only admins can manage cohorts" ON cohorts
  FOR ALL USING (auth.role() = 'admin');

-- Policies for revenue forecasts (admin only)
CREATE POLICY "Only admins can manage revenue forecasts" ON revenue_forecasts
  FOR ALL USING (auth.role() = 'admin');

-- Policies for analytics events (users can insert their own events)
CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can view analytics events" ON analytics_events
  FOR SELECT USING (auth.role() = 'admin');

-- Policies for analytics aggregations (admin only)
CREATE POLICY "Only admins can manage analytics aggregations" ON analytics_aggregations
  FOR ALL USING (auth.role() = 'admin');

-- Policies for user behavior metrics (users can view their own metrics)
CREATE POLICY "Users can view their own behavior metrics" ON user_behavior_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage user behavior metrics" ON user_behavior_metrics
  FOR ALL USING (auth.role() = 'admin');

-- Policies for product performance metrics (sellers can view their own products)
CREATE POLICY "Sellers can view their own product performance" ON product_performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p 
      WHERE p.id = product_performance_metrics.product_id 
      AND p.seller_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage product performance metrics" ON product_performance_metrics
  FOR ALL USING (auth.role() = 'admin');

-- Policies for referral metrics (users can view their own referral metrics)
CREATE POLICY "Users can view their own referral metrics" ON referral_metrics
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Only admins can manage referral metrics" ON referral_metrics
  FOR ALL USING (auth.role() = 'admin');

-- Policies for conversion funnels (admin only)
CREATE POLICY "Only admins can manage conversion funnels" ON conversion_funnels
  FOR ALL USING (auth.role() = 'admin');

-- Policies for real-time metrics (admin only)
CREATE POLICY "Only admins can manage real-time metrics" ON real_time_metrics
  FOR ALL USING (auth.role() = 'admin');

-- Functions for analytics
CREATE OR REPLACE FUNCTION get_user_behavior_metrics(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  user_id UUID,
  period TEXT,
  page_views INTEGER,
  unique_pages INTEGER,
  session_duration DECIMAL,
  bounce_rate DECIMAL,
  pages_per_session DECIMAL,
  return_visits INTEGER,
  conversion_rate DECIMAL,
  revenue DECIMAL,
  last_activity TIMESTAMP WITH TIME ZONE,
  user_segment TEXT,
  engagement_score DECIMAL,
  retention_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ubm.user_id,
    ubm.period,
    ubm.page_views,
    ubm.unique_pages,
    ubm.session_duration,
    ubm.bounce_rate,
    ubm.pages_per_session,
    ubm.return_visits,
    ubm.conversion_rate,
    ubm.revenue,
    ubm.last_activity,
    ubm.user_segment,
    ubm.engagement_score,
    ubm.retention_rate
  FROM user_behavior_metrics ubm
  WHERE ubm.user_id = p_user_id
    AND ubm.created_at >= p_start_date
    AND ubm.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get product performance metrics
CREATE OR REPLACE FUNCTION get_product_performance_metrics(
  p_product_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  product_id UUID,
  period TEXT,
  views INTEGER,
  unique_viewers INTEGER,
  add_to_cart INTEGER,
  purchases INTEGER,
  revenue DECIMAL,
  conversion_rate DECIMAL,
  cart_abandonment_rate DECIMAL,
  average_order_value DECIMAL,
  return_rate DECIMAL,
  rating_average DECIMAL,
  rating_count INTEGER,
  search_impressions INTEGER,
  search_clicks INTEGER,
  ctr DECIMAL,
  position_average DECIMAL,
  category_performance JSONB,
  competitor_analysis JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ppm.product_id,
    ppm.period,
    ppm.views,
    ppm.unique_viewers,
    ppm.add_to_cart,
    ppm.purchases,
    ppm.revenue,
    ppm.conversion_rate,
    ppm.cart_abandonment_rate,
    ppm.average_order_value,
    ppm.return_rate,
    ppm.rating_average,
    ppm.rating_count,
    ppm.search_impressions,
    ppm.search_clicks,
    ppm.ctr,
    ppm.position_average,
    ppm.category_performance,
    ppm.competitor_analysis
  FROM product_performance_metrics ppm
  WHERE ppm.product_id = p_product_id
    AND ppm.created_at >= p_start_date
    AND ppm.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get real-time metrics
CREATE OR REPLACE FUNCTION get_real_time_metrics()
RETURNS TABLE (
  active_users INTEGER,
  page_views_per_minute INTEGER,
  conversions_per_minute INTEGER,
  revenue_per_minute DECIMAL,
  top_pages JSONB,
  top_products JSONB,
  top_referrers JSONB,
  device_breakdown JSONB,
  country_breakdown JSONB,
  last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rtm.active_users,
    rtm.page_views_per_minute,
    rtm.conversions_per_minute,
    rtm.revenue_per_minute,
    rtm.top_pages,
    rtm.top_products,
    rtm.top_referrers,
    rtm.device_breakdown,
    rtm.country_breakdown,
    rtm.last_updated
  FROM real_time_metrics rtm
  ORDER BY rtm.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
