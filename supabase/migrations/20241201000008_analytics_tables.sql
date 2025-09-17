-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  event_type TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Create GIN index for JSONB properties
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON analytics_events USING GIN(properties);
CREATE INDEX IF NOT EXISTS idx_analytics_events_context ON analytics_events USING GIN(context);

-- A/B Tests Table
CREATE TABLE IF NOT EXISTS ab_tests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')) DEFAULT 'draft',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_audience JSONB NOT NULL DEFAULT '{}',
  variants JSONB NOT NULL DEFAULT '[]',
  conversion_goals JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- A/B Test Assignments Table
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id TEXT REFERENCES ab_tests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT NOT NULL,
  UNIQUE(test_id, user_id)
);

-- Create indexes for A/B test tables
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created_by ON ab_tests(created_by);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_assigned_at ON ab_test_assignments(assigned_at);

-- Analytics Sessions Table
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0, -- in seconds
  page_views INTEGER DEFAULT 0,
  events INTEGER DEFAULT 0,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics_sessions
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON analytics_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_ended_at ON analytics_sessions(ended_at);

-- Analytics Users Table (for user behavior tracking)
CREATE TABLE IF NOT EXISTS analytics_users (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  total_events INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Products Table (for product performance tracking)
CREATE TABLE IF NOT EXISTS analytics_products (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  first_viewed TIMESTAMP WITH TIME ZONE,
  last_viewed TIMESTAMP WITH TIME ZONE,
  total_views INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics_products
CREATE INDEX IF NOT EXISTS idx_analytics_products_total_views ON analytics_products(total_views);
CREATE INDEX IF NOT EXISTS idx_analytics_products_total_purchases ON analytics_products(total_purchases);
CREATE INDEX IF NOT EXISTS idx_analytics_products_total_revenue ON analytics_products(total_revenue);

-- Analytics Referrals Table (for referral effectiveness tracking)
CREATE TABLE IF NOT EXISTS analytics_referrals (
  referrer_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commission DECIMAL(10,2) DEFAULT 0.00,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics_referrals
CREATE INDEX IF NOT EXISTS idx_analytics_referrals_total_clicks ON analytics_referrals(total_clicks);
CREATE INDEX IF NOT EXISTS idx_analytics_referrals_total_conversions ON analytics_referrals(total_conversions);
CREATE INDEX IF NOT EXISTS idx_analytics_referrals_total_commission ON analytics_referrals(total_commission);

-- =============================================
-- FUNCTIONS FOR ANALYTICS
-- =============================================

-- Function to update analytics counters
CREATE OR REPLACE FUNCTION update_analytics_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user analytics
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO analytics_users (user_id, first_seen, last_seen, total_events, total_sessions)
    VALUES (NEW.user_id, NEW.timestamp, NEW.timestamp, 1, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      last_seen = NEW.timestamp,
      total_events = analytics_users.total_events + 1,
      updated_at = NOW();
  END IF;

  -- Update product analytics for product_view events
  IF NEW.event_type = 'product_view' AND NEW.properties->>'product_id' IS NOT NULL THEN
    INSERT INTO analytics_products (product_id, first_viewed, last_viewed, total_views)
    VALUES (
      (NEW.properties->>'product_id')::UUID,
      NEW.timestamp,
      NEW.timestamp,
      1
    )
    ON CONFLICT (product_id) DO UPDATE SET
      last_viewed = NEW.timestamp,
      total_views = analytics_products.total_views + 1,
      updated_at = NOW();
  END IF;

  -- Update product analytics for purchase events
  IF NEW.event_type = 'purchase' AND NEW.properties->>'product_id' IS NOT NULL THEN
    UPDATE analytics_products SET
      total_purchases = total_purchases + 1,
      total_revenue = total_revenue + COALESCE((NEW.properties->>'amount')::DECIMAL, 0),
      updated_at = NOW()
    WHERE product_id = (NEW.properties->>'product_id')::UUID;
  END IF;

  -- Update referral analytics for referral events
  IF NEW.event_type IN ('referral_click', 'referral_conversion') AND NEW.properties->>'referrer_id' IS NOT NULL THEN
    INSERT INTO analytics_referrals (referrer_id, total_clicks, total_conversions, total_commission)
    VALUES (
      (NEW.properties->>'referrer_id')::UUID,
      CASE WHEN NEW.event_type = 'referral_click' THEN 1 ELSE 0 END,
      CASE WHEN NEW.event_type = 'referral_conversion' THEN 1 ELSE 0 END,
      CASE WHEN NEW.event_type = 'referral_conversion' THEN COALESCE((NEW.properties->>'conversion_value')::DECIMAL, 0) ELSE 0 END
    )
    ON CONFLICT (referrer_id) DO UPDATE SET
      total_clicks = analytics_referrals.total_clicks + CASE WHEN NEW.event_type = 'referral_click' THEN 1 ELSE 0 END,
      total_conversions = analytics_referrals.total_conversions + CASE WHEN NEW.event_type = 'referral_conversion' THEN 1 ELSE 0 END,
      total_commission = analytics_referrals.total_commission + CASE WHEN NEW.event_type = 'referral_conversion' THEN COALESCE((NEW.properties->>'conversion_value')::DECIMAL, 0) ELSE 0 END,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for analytics counters
DROP TRIGGER IF EXISTS trigger_update_analytics_counters ON analytics_events;
CREATE TRIGGER trigger_update_analytics_counters
  AFTER INSERT ON analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_counters();

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_events BIGINT,
  unique_users BIGINT,
  unique_sessions BIGINT,
  total_page_views BIGINT,
  total_purchases BIGINT,
  total_revenue DECIMAL(10,2),
  average_session_duration DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as total_page_views,
    COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as total_purchases,
    COALESCE(SUM(CASE WHEN event_type = 'purchase' THEN (properties->>'amount')::DECIMAL END), 0) as total_revenue,
    COALESCE(AVG(
      CASE WHEN event_type = 'page_view' THEN 
        EXTRACT(EPOCH FROM (
          MAX(timestamp) OVER (PARTITION BY session_id) - 
          MIN(timestamp) OVER (PARTITION BY session_id)
        ))
      END
    ), 0) as average_session_duration
  FROM analytics_events
  WHERE (start_date IS NULL OR timestamp >= start_date)
    AND (end_date IS NULL OR timestamp <= end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top products by views
CREATE OR REPLACE FUNCTION get_top_products_by_views(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_title TEXT,
  total_views BIGINT,
  total_purchases BIGINT,
  conversion_rate DECIMAL(5,2),
  total_revenue DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.title as product_title,
    COUNT(CASE WHEN ae.event_type = 'product_view' THEN 1 END) as total_views,
    COUNT(CASE WHEN ae.event_type = 'purchase' THEN 1 END) as total_purchases,
    CASE 
      WHEN COUNT(CASE WHEN ae.event_type = 'product_view' THEN 1 END) > 0 
      THEN ROUND(
        (COUNT(CASE WHEN ae.event_type = 'purchase' THEN 1 END)::DECIMAL / 
         COUNT(CASE WHEN ae.event_type = 'product_view' THEN 1 END)) * 100, 2
      )
      ELSE 0
    END as conversion_rate,
    COALESCE(SUM(CASE WHEN ae.event_type = 'purchase' THEN (ae.properties->>'amount')::DECIMAL END), 0) as total_revenue
  FROM products p
  LEFT JOIN analytics_events ae ON p.id = (ae.properties->>'product_id')::UUID
    AND (start_date IS NULL OR ae.timestamp >= start_date)
    AND (end_date IS NULL OR ae.timestamp <= end_date)
  GROUP BY p.id, p.title
  ORDER BY total_views DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user behavior metrics
CREATE OR REPLACE FUNCTION get_user_behavior_metrics(
  target_user_id UUID,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  total_events BIGINT,
  total_sessions BIGINT,
  page_views BIGINT,
  purchases BIGINT,
  average_session_duration DECIMAL(10,2),
  bounce_rate DECIMAL(5,2),
  favorite_products TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH user_events AS (
    SELECT 
      ae.*,
      ROW_NUMBER() OVER (PARTITION BY ae.session_id ORDER BY ae.timestamp) as session_event_order
    FROM analytics_events ae
    WHERE ae.user_id = target_user_id
      AND (start_date IS NULL OR ae.timestamp >= start_date)
      AND (end_date IS NULL OR ae.timestamp <= end_date)
  ),
  session_stats AS (
    SELECT 
      session_id,
      COUNT(*) as events_per_session,
      MIN(timestamp) as session_start,
      MAX(timestamp) as session_end,
      EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as session_duration
    FROM user_events
    GROUP BY session_id
  )
  SELECT 
    target_user_id as user_id,
    COUNT(ue.*) as total_events,
    COUNT(DISTINCT ue.session_id) as total_sessions,
    COUNT(CASE WHEN ue.event_type = 'page_view' THEN 1 END) as page_views,
    COUNT(CASE WHEN ue.event_type = 'purchase' THEN 1 END) as purchases,
    COALESCE(AVG(ss.session_duration), 0) as average_session_duration,
    CASE 
      WHEN COUNT(DISTINCT ue.session_id) > 0 
      THEN ROUND(
        (COUNT(CASE WHEN ss.events_per_session = 1 THEN 1 END)::DECIMAL / 
         COUNT(DISTINCT ue.session_id)) * 100, 2
      )
      ELSE 0
    END as bounce_rate,
    ARRAY(
      SELECT DISTINCT ae.properties->>'product_id'
      FROM analytics_events ae
      WHERE ae.user_id = target_user_id
        AND ae.event_type = 'product_view'
        AND (start_date IS NULL OR ae.timestamp >= start_date)
        AND (end_date IS NULL OR ae.timestamp <= end_date)
      LIMIT 10
    ) as favorite_products
  FROM user_events ue
  LEFT JOIN session_stats ss ON ue.session_id = ss.session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on analytics tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_referrals ENABLE ROW LEVEL SECURITY;

-- Analytics events policies
CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all analytics events" ON analytics_events
  FOR ALL USING (auth.role() = 'service_role');

-- A/B tests policies
CREATE POLICY "Users can view A/B tests they created" ON ab_tests
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Service role can manage all A/B tests" ON ab_tests
  FOR ALL USING (auth.role() = 'service_role');

-- A/B test assignments policies
CREATE POLICY "Users can view their own A/B test assignments" ON ab_test_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all A/B test assignments" ON ab_test_assignments
  FOR ALL USING (auth.role() = 'service_role');

-- Analytics sessions policies
CREATE POLICY "Users can view their own analytics sessions" ON analytics_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all analytics sessions" ON analytics_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Analytics users policies
CREATE POLICY "Users can view their own analytics data" ON analytics_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all analytics users" ON analytics_users
  FOR ALL USING (auth.role() = 'service_role');

-- Analytics products policies
CREATE POLICY "Anyone can view product analytics" ON analytics_products
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage all analytics products" ON analytics_products
  FOR ALL USING (auth.role() = 'service_role');

-- Analytics referrals policies
CREATE POLICY "Users can view their own referral analytics" ON analytics_referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Service role can manage all analytics referrals" ON analytics_referrals
  FOR ALL USING (auth.role() = 'service_role');
