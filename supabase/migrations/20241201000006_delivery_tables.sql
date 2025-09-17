-- Delivery service tables
-- This migration adds tables for file delivery, bandwidth tracking, and license keys

-- License keys table
CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download sessions table (backup for Redis)
CREATE TABLE IF NOT EXISTS download_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  license_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_download_at TIMESTAMP WITH TIME ZONE
);

-- Bandwidth usage tracking
CREATE TABLE IF NOT EXISTS bandwidth_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- YYYY-MM format
  bytes_used BIGINT DEFAULT 0,
  limit_bytes BIGINT DEFAULT 10737418240, -- 10GB default
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period)
);

-- Delivery logs for analytics
CREATE TABLE IF NOT EXISTS delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  session_id TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watermark configurations
CREATE TABLE IF NOT EXISTS watermark_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  position TEXT CHECK (position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center')) DEFAULT 'bottom-right',
  opacity DECIMAL(3,2) DEFAULT 0.3,
  font_size INTEGER DEFAULT 12,
  color TEXT DEFAULT '#000000',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CDN configurations
CREATE TABLE IF NOT EXISTS cdn_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL CHECK (provider IN ('cloudflare', 'aws', 'supabase')),
  endpoint TEXT NOT NULL,
  api_key TEXT,
  region TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(key);
CREATE INDEX IF NOT EXISTS idx_license_keys_user_id ON license_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_product_id ON license_keys(product_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_expires_at ON license_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_download_sessions_user_id ON download_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_download_sessions_product_id ON download_sessions(product_id);
CREATE INDEX IF NOT EXISTS idx_download_sessions_expires_at ON download_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_user_id ON bandwidth_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_period ON bandwidth_usage(period);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_user_period ON bandwidth_usage(user_id, period);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_event ON delivery_logs(event);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_user_id ON delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_product_id ON delivery_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_created_at ON delivery_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_watermark_configs_user_id ON watermark_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_watermark_configs_is_default ON watermark_configs(is_default);

-- RLS policies
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandwidth_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE watermark_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdn_configs ENABLE ROW LEVEL SECURITY;

-- License keys policies
CREATE POLICY "Users can view their own license keys" ON license_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create license keys for their products" ON license_keys
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM products 
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

-- Download sessions policies
CREATE POLICY "Users can view their own download sessions" ON download_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create download sessions" ON download_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own download sessions" ON download_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Bandwidth usage policies
CREATE POLICY "Users can view their own bandwidth usage" ON bandwidth_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bandwidth usage" ON bandwidth_usage
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bandwidth usage" ON bandwidth_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Delivery logs policies (admin only for viewing)
CREATE POLICY "Admins can view all delivery logs" ON delivery_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own delivery logs" ON delivery_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert delivery logs" ON delivery_logs
  FOR INSERT WITH CHECK (true);

-- Watermark configs policies
CREATE POLICY "Users can manage their own watermark configs" ON watermark_configs
  FOR ALL USING (auth.uid() = user_id);

-- CDN configs policies (admin only)
CREATE POLICY "Admins can manage CDN configs" ON cdn_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Functions for delivery service
CREATE OR REPLACE FUNCTION cleanup_expired_download_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM download_sessions 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_delivery_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM delivery_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_bandwidth_usage(p_user_id UUID, p_period TEXT)
RETURNS TABLE (
  user_id UUID,
  period TEXT,
  bytes_used BIGINT,
  limit_bytes BIGINT,
  usage_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bu.user_id,
    bu.period,
    bu.bytes_used,
    bu.limit_bytes,
    ROUND((bu.bytes_used::DECIMAL / bu.limit_bytes::DECIMAL) * 100, 2) as usage_percentage
  FROM bandwidth_usage bu
  WHERE bu.user_id = p_user_id 
    AND bu.period = p_period;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_bandwidth_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bandwidth_usage_updated_at
  BEFORE UPDATE ON bandwidth_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_bandwidth_usage_updated_at();

-- Insert default watermark config
INSERT INTO watermark_configs (user_id, name, text, position, opacity, font_size, color, is_default)
SELECT 
  id,
  'Default Watermark',
  'Purchased from Digital Marketplace',
  'bottom-right',
  0.3,
  12,
  '#000000',
  true
FROM users
WHERE role = 'admin'
LIMIT 1;

-- Insert default CDN config (if not exists)
INSERT INTO cdn_configs (provider, endpoint, is_active)
VALUES ('supabase', 'https://your-project.supabase.co/storage/v1/object/public', true)
ON CONFLICT DO NOTHING;
