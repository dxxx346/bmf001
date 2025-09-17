-- Shop Management Migration
-- This migration adds tables and functions for shop management, analytics, and withdrawals

-- Create withdrawal_requests table
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'crypto', 'paypal')),
  account_details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shop_analytics table for caching analytics data
CREATE TABLE shop_analytics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(shop_id, period)
);

-- Create shop_visits table for tracking shop visits
CREATE TABLE shop_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shop_products_view table for materialized view of shop products
CREATE MATERIALIZED VIEW shop_products_view AS
SELECT 
  s.id as shop_id,
  s.name as shop_name,
  s.owner_id,
  COUNT(p.id) as total_products,
  COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_products,
  COUNT(CASE WHEN p.status = 'draft' THEN 1 END) as draft_products,
  COUNT(CASE WHEN p.status = 'inactive' THEN 1 END) as inactive_products,
  COALESCE(SUM(p.price), 0) as total_product_value,
  COALESCE(AVG(p.price), 0) as average_product_price,
  MAX(p.created_at) as last_product_created
FROM shops s
LEFT JOIN products p ON s.id = p.shop_id
GROUP BY s.id, s.name, s.owner_id;

-- Create shop_sales_view table for materialized view of shop sales
CREATE MATERIALIZED VIEW shop_sales_view AS
SELECT 
  s.id as shop_id,
  s.name as shop_name,
  s.owner_id,
  COUNT(pur.id) as total_sales,
  COALESCE(SUM(pay.amount), 0) as total_revenue,
  COALESCE(AVG(pay.amount), 0) as average_sale_value,
  COUNT(CASE WHEN pay.status = 'succeeded' THEN 1 END) as successful_sales,
  COUNT(CASE WHEN pay.status = 'refunded' THEN 1 END) as refunded_sales,
  COALESCE(SUM(CASE WHEN pay.status = 'succeeded' THEN pay.amount ELSE 0 END), 0) as net_revenue,
  COALESCE(SUM(CASE WHEN pay.status = 'refunded' THEN pay.amount ELSE 0 END), 0) as total_refunds,
  MAX(pur.created_at) as last_sale_date
FROM shops s
LEFT JOIN products p ON s.id = p.shop_id
LEFT JOIN purchases pur ON p.id = pur.product_id
LEFT JOIN payments pay ON pur.payment_id = pay.id
GROUP BY s.id, s.name, s.owner_id;

-- Create indexes for performance
CREATE INDEX idx_withdrawal_requests_shop_id ON withdrawal_requests(shop_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created_at ON withdrawal_requests(created_at);

CREATE INDEX idx_shop_analytics_cache_shop_id ON shop_analytics_cache(shop_id);
CREATE INDEX idx_shop_analytics_cache_expires_at ON shop_analytics_cache(expires_at);

CREATE INDEX idx_shop_visits_shop_id ON shop_visits(shop_id);
CREATE INDEX idx_shop_visits_created_at ON shop_visits(created_at);
CREATE INDEX idx_shop_visits_visitor_id ON shop_visits(visitor_id);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_shop_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW shop_products_view;
  REFRESH MATERIALIZED VIEW shop_sales_view;
END;
$$ LANGUAGE plpgsql;

-- Create function to get shop analytics
CREATE OR REPLACE FUNCTION get_shop_analytics(
  p_shop_id UUID,
  p_period TEXT DEFAULT '30d'
)
RETURNS JSONB AS $$
DECLARE
  start_date TIMESTAMP WITH TIME ZONE;
  end_date TIMESTAMP WITH TIME ZONE;
  result JSONB;
BEGIN
  -- Calculate date range based on period
  end_date := NOW();
  CASE p_period
    WHEN '7d' THEN start_date := end_date - INTERVAL '7 days';
    WHEN '30d' THEN start_date := end_date - INTERVAL '30 days';
    WHEN '90d' THEN start_date := end_date - INTERVAL '90 days';
    WHEN '1y' THEN start_date := end_date - INTERVAL '1 year';
    ELSE start_date := end_date - INTERVAL '30 days';
  END CASE;

  -- Get analytics data
  WITH revenue_data AS (
    SELECT 
      COUNT(pur.id) as total_orders,
      COALESCE(SUM(pay.amount), 0) as total_revenue,
      COALESCE(AVG(pay.amount), 0) as avg_order_value
    FROM purchases pur
    JOIN products p ON pur.product_id = p.id
    JOIN payments pay ON pur.payment_id = pay.id
    WHERE p.shop_id = p_shop_id
      AND pay.status = 'succeeded'
      AND pur.created_at >= start_date
      AND pur.created_at <= end_date
  ),
  product_data AS (
    SELECT 
      COUNT(p.id) as total_products,
      COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_products
    FROM products p
    WHERE p.shop_id = p_shop_id
  ),
  top_products AS (
    SELECT 
      p.id as product_id,
      p.title,
      COUNT(pur.id) as sales_count,
      COALESCE(SUM(pay.amount), 0) as revenue
    FROM products p
    LEFT JOIN purchases pur ON p.id = pur.product_id
    LEFT JOIN payments pay ON pur.payment_id = pay.id
    WHERE p.shop_id = p_shop_id
      AND pay.status = 'succeeded'
      AND pur.created_at >= start_date
      AND pur.created_at <= end_date
    GROUP BY p.id, p.title
    ORDER BY revenue DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'period', p_period,
    'revenue', jsonb_build_object(
      'total', COALESCE(rd.total_revenue, 0),
      'currency', 'USD',
      'growth_percentage', 0
    ),
    'sales', jsonb_build_object(
      'total_orders', COALESCE(rd.total_orders, 0),
      'conversion_rate', 0,
      'average_order_value', COALESCE(rd.avg_order_value, 0),
      'growth_percentage', 0
    ),
    'products', jsonb_build_object(
      'total_products', COALESCE(pd.total_products, 0),
      'active_products', COALESCE(pd.active_products, 0),
      'top_products', COALESCE(jsonb_agg(
        jsonb_build_object(
          'product_id', tp.product_id,
          'title', tp.title,
          'sales_count', tp.sales_count,
          'revenue', tp.revenue,
          'conversion_rate', 0
        )
      ) FILTER (WHERE tp.product_id IS NOT NULL), '[]'::jsonb)
    ),
    'visitors', jsonb_build_object(
      'total_visitors', 0,
      'unique_visitors', 0,
      'bounce_rate', 0,
      'average_session_duration', 0
    ),
    'trends', jsonb_build_object(
      'daily_revenue', '[]'::jsonb,
      'top_categories', '[]'::jsonb
    )
  )
  INTO result
  FROM revenue_data rd
  CROSS JOIN product_data pd
  LEFT JOIN top_products tp ON true;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Create function to track shop visits
CREATE OR REPLACE FUNCTION track_shop_visit(
  p_shop_id UUID,
  p_visitor_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO shop_visits (
    shop_id,
    visitor_id,
    ip_address,
    user_agent,
    referrer,
    session_id
  ) VALUES (
    p_shop_id,
    p_visitor_id,
    p_ip_address,
    p_user_agent,
    p_referrer,
    p_session_id
  );
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for withdrawal_requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawal requests" ON withdrawal_requests
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create withdrawal requests for their shops" ON withdrawal_requests
  FOR INSERT WITH CHECK (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Create RLS policies for shop_analytics_cache
ALTER TABLE shop_analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for their shops" ON shop_analytics_cache
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Create RLS policies for shop_visits
ALTER TABLE shop_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view visits for their shops" ON shop_visits
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to clean up expired analytics cache
CREATE OR REPLACE FUNCTION clean_expired_analytics_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM shop_analytics_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to refresh materialized views (if pg_cron is available)
-- This would need to be set up separately in production
-- SELECT cron.schedule('refresh-shop-views', '0 2 * * *', 'SELECT refresh_shop_views();');

-- Insert some sample withdrawal methods configuration
INSERT INTO shop_analytics_cache (shop_id, period, data, expires_at) 
SELECT 
  s.id,
  '30d',
  '{"revenue": {"total": 0, "currency": "USD", "growth_percentage": 0}, "sales": {"total_orders": 0, "conversion_rate": 0, "average_order_value": 0, "growth_percentage": 0}, "products": {"total_products": 0, "active_products": 0, "top_products": []}, "visitors": {"total_visitors": 0, "unique_visitors": 0, "bounce_rate": 0, "average_session_duration": 0}, "trends": {"daily_revenue": [], "top_categories": []}}'::jsonb,
  NOW() + INTERVAL '1 hour'
FROM shops s
WHERE NOT EXISTS (
  SELECT 1 FROM shop_analytics_cache WHERE shop_id = s.id AND period = '30d'
);
