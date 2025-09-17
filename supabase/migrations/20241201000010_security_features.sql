-- Security features migration
-- Creates tables for API keys, security logs, and rate limiting

-- API Keys table for partner access
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  permissions text[] NOT NULL DEFAULT '{}',
  usage_count bigint DEFAULT 0,
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- API Key usage tracking
CREATE TABLE api_key_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  ip_address text,
  user_agent text,
  response_status integer NOT NULL,
  response_time_ms integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Security events logging
CREATE TABLE security_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type text NOT NULL, -- 'rate_limit_exceeded', 'invalid_api_key', 'brute_force_attempt', etc.
  ip_address text,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_agent text,
  endpoint text,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  details jsonb,
  blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Rate limiting store (Redis alternative for smaller deployments)
CREATE TABLE rate_limits (
  id text PRIMARY KEY, -- combination of IP, user_id, endpoint
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL,
  window_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Blacklisted IPs
CREATE TABLE ip_blacklist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address text NOT NULL UNIQUE,
  reason text NOT NULL,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Failed login attempts tracking
CREATE TABLE login_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  success boolean DEFAULT false,
  failure_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_created_at ON api_key_usage(created_at);
CREATE INDEX idx_api_key_usage_endpoint ON api_key_usage(endpoint);

CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_severity ON security_events(severity);

CREATE INDEX idx_rate_limits_window_end ON rate_limits(window_end);
CREATE INDEX idx_rate_limits_created_at ON rate_limits(created_at);

CREATE INDEX idx_ip_blacklist_ip_address ON ip_blacklist(ip_address);
CREATE INDEX idx_ip_blacklist_is_active ON ip_blacklist(is_active);
CREATE INDEX idx_ip_blacklist_expires_at ON ip_blacklist(expires_at);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX idx_login_attempts_success ON login_attempts(success);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_keys_updated_at 
  BEFORE UPDATE ON api_keys 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at 
  BEFORE UPDATE ON rate_limits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- API Keys policies - users can only see their own keys
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- API Key usage policies - users can only see usage of their own keys
CREATE POLICY "Users can view usage of their own API keys" ON api_key_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM api_keys 
      WHERE api_keys.id = api_key_usage.api_key_id 
      AND api_keys.user_id = auth.uid()
    )
  );

-- Security events policies - users can only see their own events
CREATE POLICY "Users can view their own security events" ON security_events
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policies for security tables
CREATE POLICY "Admins can view all API keys" ON api_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all security events" ON security_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage IP blacklist" ON ip_blacklist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Functions for security operations

-- Function to check if IP is blacklisted
CREATE OR REPLACE FUNCTION is_ip_blacklisted(ip_addr text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ip_blacklist 
    WHERE ip_address = ip_addr 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type text,
  p_ip_address text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_endpoint text DEFAULT NULL,
  p_severity text DEFAULT 'medium',
  p_details jsonb DEFAULT NULL,
  p_blocked boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO security_events (
    event_type, ip_address, user_id, user_agent, 
    endpoint, severity, details, blocked
  ) VALUES (
    p_event_type, p_ip_address, p_user_id, p_user_agent,
    p_endpoint, p_severity, p_details, p_blocked
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old security data
CREATE OR REPLACE FUNCTION cleanup_security_data()
RETURNS void AS $$
BEGIN
  -- Delete old API key usage records (older than 90 days)
  DELETE FROM api_key_usage 
  WHERE created_at < now() - INTERVAL '90 days';
  
  -- Delete old security events (older than 365 days)
  DELETE FROM security_events 
  WHERE created_at < now() - INTERVAL '365 days';
  
  -- Delete old login attempts (older than 30 days)
  DELETE FROM login_attempts 
  WHERE created_at < now() - INTERVAL '30 days';
  
  -- Delete expired rate limit records
  DELETE FROM rate_limits 
  WHERE window_end < now() - INTERVAL '1 hour';
  
  -- Delete expired IP blacklist entries
  DELETE FROM ip_blacklist 
  WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API key statistics
CREATE OR REPLACE FUNCTION get_api_key_stats(key_id uuid)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'avg_response_time', COALESCE(AVG(response_time_ms), 0),
    'error_rate', COALESCE(
      (COUNT(*) FILTER (WHERE response_status >= 400))::float / 
      NULLIF(COUNT(*), 0) * 100, 0
    ),
    'last_30_days', COALESCE(
      COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days'), 0
    )
  ) INTO stats
  FROM api_key_usage
  WHERE api_key_id = key_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add some initial data

-- Insert default API permissions (if not exists)
INSERT INTO categories (name) VALUES 
  ('Security Tools'),
  ('Development Tools'),
  ('Analytics Tools')
ON CONFLICT (name) DO NOTHING;

-- Create a scheduled job to clean up old security data (requires pg_cron extension)
-- This would typically be set up separately in a production environment
-- SELECT cron.schedule('cleanup-security-data', '0 2 * * *', 'SELECT cleanup_security_data();');

COMMENT ON TABLE api_keys IS 'API keys for partner access to the platform';
COMMENT ON TABLE api_key_usage IS 'Usage tracking for API keys';
COMMENT ON TABLE security_events IS 'Security events and incidents logging';
COMMENT ON TABLE rate_limits IS 'Rate limiting data store';
COMMENT ON TABLE ip_blacklist IS 'Blacklisted IP addresses';
COMMENT ON TABLE login_attempts IS 'Login attempt tracking for security analysis';
