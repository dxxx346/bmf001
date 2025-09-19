-- Error Logging System Migration
-- Creates tables and functions for comprehensive error tracking

-- Error logs table
CREATE TABLE error_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_id text UNIQUE NOT NULL,
  error_type text CHECK (error_type IN ('javascript_error', 'api_error', 'global_error', 'boundary_error')) NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  message text NOT NULL,
  stack_trace text,
  component_stack text,
  url text NOT NULL,
  user_agent text NOT NULL,
  ip_address text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text,
  status_code integer,
  endpoint text,
  http_method text,
  error_context text,
  error_level text CHECK (error_level IN ('page', 'section', 'component')),
  retryable boolean DEFAULT true,
  build_version text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolution_notes text
);

-- Error patterns table for pattern detection
CREATE TABLE error_patterns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_hash text UNIQUE NOT NULL,
  pattern_text text NOT NULL,
  first_seen timestamp with time zone DEFAULT now(),
  last_seen timestamp with time zone DEFAULT now(),
  occurrence_count integer DEFAULT 1,
  affected_users integer DEFAULT 0,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status text CHECK (status IN ('active', 'investigating', 'resolved', 'ignored')) DEFAULT 'active',
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Error notifications table for alerting
CREATE TABLE error_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_log_id uuid REFERENCES error_logs(id) ON DELETE CASCADE,
  notification_type text CHECK (notification_type IN ('email', 'slack', 'webhook', 'sms')) NOT NULL,
  recipient text NOT NULL,
  status text CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_url ON error_logs(url);
CREATE INDEX idx_error_logs_error_id ON error_logs(error_id);
CREATE INDEX idx_error_logs_resolved_at ON error_logs(resolved_at);

CREATE INDEX idx_error_patterns_pattern_hash ON error_patterns(pattern_hash);
CREATE INDEX idx_error_patterns_severity ON error_patterns(severity);
CREATE INDEX idx_error_patterns_status ON error_patterns(status);
CREATE INDEX idx_error_patterns_last_seen ON error_patterns(last_seen);

CREATE INDEX idx_error_notifications_status ON error_notifications(status);
CREATE INDEX idx_error_notifications_created_at ON error_notifications(created_at);

-- Function to update error patterns
CREATE OR REPLACE FUNCTION update_error_pattern(
  pattern_text_param text,
  user_id_param uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  pattern_hash_val text;
  pattern_id uuid;
  user_count integer;
BEGIN
  -- Generate hash for pattern
  pattern_hash_val := md5(pattern_text_param);
  
  -- Check if pattern exists
  SELECT id INTO pattern_id
  FROM error_patterns
  WHERE pattern_hash = pattern_hash_val;
  
  IF pattern_id IS NULL THEN
    -- Create new pattern
    INSERT INTO error_patterns (
      pattern_hash,
      pattern_text,
      occurrence_count,
      affected_users
    ) VALUES (
      pattern_hash_val,
      pattern_text_param,
      1,
      CASE WHEN user_id_param IS NOT NULL THEN 1 ELSE 0 END
    ) RETURNING id INTO pattern_id;
  ELSE
    -- Update existing pattern
    -- Count unique users for this pattern
    IF user_id_param IS NOT NULL THEN
      SELECT COUNT(DISTINCT user_id)
      INTO user_count
      FROM error_logs el
      JOIN error_patterns ep ON md5(el.message) = ep.pattern_hash
      WHERE ep.id = pattern_id AND el.user_id IS NOT NULL;
    ELSE
      user_count := 0;
    END IF;
    
    UPDATE error_patterns
    SET 
      occurrence_count = occurrence_count + 1,
      last_seen = now(),
      affected_users = GREATEST(affected_users, user_count),
      updated_at = now()
    WHERE id = pattern_id;
  END IF;
  
  RETURN pattern_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get error statistics
CREATE OR REPLACE FUNCTION get_error_statistics(
  timeframe_hours integer DEFAULT 24
)
RETURNS TABLE (
  total_errors bigint,
  critical_errors bigint,
  high_errors bigint,
  medium_errors bigint,
  low_errors bigint,
  unique_users bigint,
  error_rate numeric,
  top_error_type text
) AS $$
DECLARE
  start_time timestamp with time zone;
  total_requests bigint;
BEGIN
  start_time := now() - (timeframe_hours || ' hours')::interval;
  
  -- Get total requests from access logs (approximate)
  SELECT COUNT(*) INTO total_requests
  FROM security_events
  WHERE created_at >= start_time;
  
  RETURN QUERY
  SELECT 
    COUNT(*) as total_errors,
    COUNT(*) FILTER (WHERE el.severity = 'critical') as critical_errors,
    COUNT(*) FILTER (WHERE el.severity = 'high') as high_errors,
    COUNT(*) FILTER (WHERE el.severity = 'medium') as medium_errors,
    COUNT(*) FILTER (WHERE el.severity = 'low') as low_errors,
    COUNT(DISTINCT el.user_id) as unique_users,
    CASE 
      WHEN total_requests > 0 THEN (COUNT(*)::numeric / total_requests::numeric) * 100
      ELSE 0
    END as error_rate,
    (
      SELECT error_type
      FROM error_logs
      WHERE created_at >= start_time
      GROUP BY error_type
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as top_error_type
  FROM error_logs el
  WHERE el.created_at >= start_time;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old error logs
CREATE OR REPLACE FUNCTION cleanup_old_error_logs(
  retention_days integer DEFAULT 90
)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
  cutoff_date timestamp with time zone;
BEGIN
  cutoff_date := now() - (retention_days || ' days')::interval;
  
  -- Delete old error logs
  DELETE FROM error_logs
  WHERE created_at < cutoff_date
  AND resolved_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Cleanup old error patterns that are no longer relevant
  DELETE FROM error_patterns
  WHERE last_seen < cutoff_date
  AND status = 'resolved';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-resolve patterns
CREATE OR REPLACE FUNCTION auto_resolve_error_patterns()
RETURNS integer AS $$
DECLARE
  resolved_count integer;
BEGIN
  -- Auto-resolve patterns that haven't occurred in the last 7 days
  UPDATE error_patterns
  SET 
    status = 'resolved',
    resolution_notes = 'Auto-resolved: No occurrences in 7 days',
    updated_at = now()
  WHERE status = 'active'
  AND last_seen < (now() - interval '7 days');
  
  GET DIAGNOSTICS resolved_count = ROW_COUNT;
  
  RETURN resolved_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update error patterns when new errors are logged
CREATE OR REPLACE FUNCTION trigger_update_error_pattern()
RETURNS trigger AS $$
BEGIN
  PERFORM update_error_pattern(NEW.message, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_error_pattern_trigger
  AFTER INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_error_pattern();

-- Enable RLS on error tables
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for error_logs
CREATE POLICY "Users can view their own error logs" ON error_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all error logs" ON error_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for error_patterns
CREATE POLICY "Admins can manage error patterns" ON error_patterns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for error_notifications
CREATE POLICY "Admins can manage error notifications" ON error_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create views for easier querying
CREATE VIEW error_summary AS
SELECT 
  error_type,
  severity,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence,
  COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved_count
FROM error_logs
WHERE created_at >= (now() - interval '7 days')
GROUP BY error_type, severity
ORDER BY count DESC;

CREATE VIEW critical_errors_today AS
SELECT *
FROM error_logs
WHERE severity IN ('critical', 'high')
AND created_at >= date_trunc('day', now())
AND resolved_at IS NULL
ORDER BY created_at DESC;

-- Comments
COMMENT ON TABLE error_logs IS 'Comprehensive error logging for application monitoring';
COMMENT ON TABLE error_patterns IS 'Error pattern detection and tracking';
COMMENT ON TABLE error_notifications IS 'Error notification management';
COMMENT ON FUNCTION update_error_pattern IS 'Updates error pattern statistics';
COMMENT ON FUNCTION get_error_statistics IS 'Returns error statistics for a given timeframe';
COMMENT ON FUNCTION cleanup_old_error_logs IS 'Cleans up old resolved error logs';
COMMENT ON FUNCTION auto_resolve_error_patterns IS 'Auto-resolves inactive error patterns';
