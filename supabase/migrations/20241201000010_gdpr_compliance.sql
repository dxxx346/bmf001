-- GDPR Compliance Migration
-- This migration adds all necessary tables and functions for GDPR compliance

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create GDPR-related enums
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'export', 'anonymize');
CREATE TYPE consent_status AS ENUM ('pending', 'accepted', 'declined', 'revoked');
CREATE TYPE data_retention_policy AS ENUM ('7_days', '30_days', '90_days', '1_year', '2_years', '7_years', 'indefinite');
CREATE TYPE deletion_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- =============================================
-- AUDIT LOGGING TABLES
-- =============================================

-- Audit logs for tracking all data access and modifications
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action audit_action NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================
-- CONSENT MANAGEMENT TABLES
-- =============================================

-- Cookie and privacy consent tracking
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'cookies', 'analytics', 'marketing', 'functional'
  status consent_status DEFAULT 'pending',
  version TEXT NOT NULL, -- Version of privacy policy/terms
  consented_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, consent_type, version)
);

-- Terms of service acceptance tracking
CREATE TABLE terms_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  privacy_policy_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DATA RETENTION AND DELETION
-- =============================================

-- Data retention policies
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL UNIQUE,
  retention_period data_retention_policy NOT NULL,
  conditions JSONB DEFAULT '{}', -- Additional conditions for retention
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User deletion requests (Right to be forgotten)
CREATE TABLE user_deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who processed
  reason TEXT,
  status deletion_status DEFAULT 'pending',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  deletion_summary JSONB DEFAULT '{}', -- Summary of what was deleted
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track deleted user data for compliance
CREATE TABLE deleted_user_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_user_id UUID NOT NULL, -- Original user ID (not a foreign key)
  deletion_request_id UUID REFERENCES user_deletion_requests(id),
  table_name TEXT NOT NULL,
  record_count INTEGER DEFAULT 0,
  anonymized_data JSONB, -- Anonymized version for compliance
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DATA EXPORT TABLES
-- =============================================

-- User data export requests
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  export_type TEXT DEFAULT 'full', -- 'full', 'partial', 'specific_tables'
  format TEXT DEFAULT 'json', -- 'json', 'csv', 'xml'
  tables_requested TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  file_url TEXT, -- URL to download the export file
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COOKIE CONSENT TABLES
-- =============================================

-- Cookie categories and their descriptions
CREATE TABLE cookie_categories (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_essential BOOLEAN DEFAULT false,
  is_enabled_by_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual cookies tracked
CREATE TABLE cookies (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES cookie_categories(id),
  name TEXT NOT NULL,
  purpose TEXT,
  duration TEXT, -- '1 day', '1 month', 'session', etc.
  provider TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PRIVACY SETTINGS
-- =============================================

-- User privacy preferences
CREATE TABLE user_privacy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analytics_consent BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  functional_consent BOOLEAN DEFAULT true,
  data_processing_consent BOOLEAN DEFAULT false,
  third_party_sharing BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  profile_visibility TEXT DEFAULT 'private', -- 'public', 'private', 'limited'
  data_retention_preference data_retention_policy DEFAULT '2_years',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================
-- BREACH NOTIFICATION TABLES
-- =============================================

-- Data breach incidents tracking
CREATE TABLE data_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_users_count INTEGER DEFAULT 0,
  data_types_affected TEXT[], -- 'personal', 'financial', 'health', etc.
  breach_detected_at TIMESTAMP WITH TIME ZONE,
  breach_contained_at TIMESTAMP WITH TIME ZONE,
  authorities_notified_at TIMESTAMP WITH TIME ZONE,
  users_notified_at TIMESTAMP WITH TIME ZONE,
  resolution_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users affected by breaches
CREATE TABLE breach_affected_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  breach_id UUID REFERENCES data_breaches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  notification_method TEXT, -- 'email', 'sms', 'in_app'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(breach_id, user_id)
);

-- =============================================
-- SECURITY AND COMPLIANCE FUNCTIONS
-- =============================================

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_session_id TEXT,
  p_table_name TEXT,
  p_record_id TEXT,
  p_action audit_action,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, session_id, table_name, record_id, action,
    old_values, new_values, ip_address, user_agent
  ) VALUES (
    p_user_id, p_session_id, p_table_name, p_record_id, p_action,
    p_old_values, p_new_values, p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to anonymize user data
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID) RETURNS VOID AS $$
BEGIN
  -- Anonymize user profile
  UPDATE users SET
    name = 'Anonymous User ' || LEFT(id::text, 8),
    email = 'deleted+' || LEFT(id::text, 8) || '@example.com',
    avatar_url = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Anonymize reviews (keep content but remove attribution)
  UPDATE reviews SET
    user_id = '00000000-0000-0000-0000-000000000000'::UUID,
    title = '[Deleted User Review]',
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Anonymize session data
  UPDATE user_sessions SET
    ip_address = '0.0.0.0',
    user_agent = 'anonymized',
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    p_user_id,
    NULL,
    'users',
    p_user_id::text,
    'anonymize'::audit_action,
    NULL,
    jsonb_build_object('anonymized_at', NOW()),
    '0.0.0.0',
    'system'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete user and all related data
CREATE OR REPLACE FUNCTION soft_delete_user_data(p_user_id UUID) RETURNS JSONB AS $$
DECLARE
  deletion_summary JSONB;
  affected_count INTEGER;
BEGIN
  deletion_summary := jsonb_build_object();
  
  -- Mark user as deleted
  UPDATE users SET 
    is_active = false,
    email = 'deleted+' || LEFT(id::text, 8) || '@example.com',
    name = 'Deleted User',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Count and track deletions
  SELECT COUNT(*) INTO affected_count FROM products WHERE seller_id = p_user_id;
  deletion_summary := jsonb_set(deletion_summary, '{products}', to_jsonb(affected_count));
  
  SELECT COUNT(*) INTO affected_count FROM purchases WHERE buyer_id = p_user_id;
  deletion_summary := jsonb_set(deletion_summary, '{purchases}', to_jsonb(affected_count));
  
  SELECT COUNT(*) INTO affected_count FROM favorites WHERE user_id = p_user_id;
  deletion_summary := jsonb_set(deletion_summary, '{favorites}', to_jsonb(affected_count));
  
  SELECT COUNT(*) INTO affected_count FROM reviews WHERE user_id = p_user_id;
  deletion_summary := jsonb_set(deletion_summary, '{reviews}', to_jsonb(affected_count));
  
  -- Soft delete related data (keep for business integrity but mark as deleted)
  UPDATE products SET 
    seller_id = NULL,
    status = 'archived',
    updated_at = NOW()
  WHERE seller_id = p_user_id;
  
  -- Keep purchase history for business records but anonymize
  UPDATE purchases SET updated_at = NOW() WHERE buyer_id = p_user_id;
  
  -- Remove personal preferences
  DELETE FROM favorites WHERE user_id = p_user_id;
  DELETE FROM cart_items WHERE user_id = p_user_id;
  DELETE FROM user_consents WHERE user_id = p_user_id;
  DELETE FROM user_privacy_settings WHERE user_id = p_user_id;
  
  -- Anonymize reviews but keep content
  UPDATE reviews SET
    title = '[Deleted User Review]',
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    p_user_id,
    NULL,
    'users',
    p_user_id::text,
    'delete'::audit_action,
    NULL,
    deletion_summary,
    '0.0.0.0',
    'system'
  );
  
  RETURN deletion_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to check data retention compliance
CREATE OR REPLACE FUNCTION check_data_retention() RETURNS VOID AS $$
DECLARE
  policy RECORD;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  FOR policy IN SELECT * FROM data_retention_policies WHERE is_active = true LOOP
    -- Calculate cutoff date based on retention period
    CASE policy.retention_period
      WHEN '7_days' THEN cutoff_date := NOW() - INTERVAL '7 days';
      WHEN '30_days' THEN cutoff_date := NOW() - INTERVAL '30 days';
      WHEN '90_days' THEN cutoff_date := NOW() - INTERVAL '90 days';
      WHEN '1_year' THEN cutoff_date := NOW() - INTERVAL '1 year';
      WHEN '2_years' THEN cutoff_date := NOW() - INTERVAL '2 years';
      WHEN '7_years' THEN cutoff_date := NOW() - INTERVAL '7 years';
      ELSE CONTINUE; -- Skip indefinite retention
    END CASE;
    
    -- Handle specific table retention
    CASE policy.table_name
      WHEN 'audit_logs' THEN
        DELETE FROM audit_logs WHERE created_at < cutoff_date;
      WHEN 'user_sessions' THEN
        DELETE FROM user_sessions WHERE created_at < cutoff_date AND status != 'active';
      WHEN 'login_attempts' THEN
        DELETE FROM login_attempts WHERE created_at < cutoff_date;
      WHEN 'security_events' THEN
        DELETE FROM security_events WHERE created_at < cutoff_date;
      -- Add more tables as needed
    END CASE;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR AUDIT LOGGING
-- =============================================

-- Generic trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
DECLARE
  table_name_var TEXT := TG_TABLE_NAME;
  record_id_var TEXT;
  old_values_var JSONB;
  new_values_var JSONB;
  action_var audit_action;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    action_var := 'delete';
    record_id_var := OLD.id::text;
    old_values_var := row_to_json(OLD)::jsonb;
    new_values_var := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    action_var := 'update';
    record_id_var := NEW.id::text;
    old_values_var := row_to_json(OLD)::jsonb;
    new_values_var := row_to_json(NEW)::jsonb;
  ELSIF TG_OP = 'INSERT' THEN
    action_var := 'create';
    record_id_var := NEW.id::text;
    old_values_var := NULL;
    new_values_var := row_to_json(NEW)::jsonb;
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    table_name, record_id, action, old_values, new_values
  ) VALUES (
    table_name_var, record_id_var, action_var, old_values_var, new_values_var
  );
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to critical tables
CREATE TRIGGER users_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER products_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER purchases_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchases
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER payments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================
-- DATA RETENTION POLICIES SETUP
-- =============================================

-- Insert default data retention policies
INSERT INTO data_retention_policies (table_name, retention_period) VALUES
('audit_logs', '2_years'),
('user_sessions', '90_days'),
('login_attempts', '90_days'),
('security_events', '2_years'),
('password_reset_tokens', '7_days'),
('data_export_requests', '30_days');

-- =============================================
-- COOKIE CATEGORIES SETUP
-- =============================================

-- Insert default cookie categories
INSERT INTO cookie_categories (category, name, description, is_essential, is_enabled_by_default) VALUES
('essential', 'Essential Cookies', 'Required for basic site functionality', true, true),
('functional', 'Functional Cookies', 'Enhance your experience with extra features', false, true),
('analytics', 'Analytics Cookies', 'Help us understand how you use our site', false, false),
('marketing', 'Marketing Cookies', 'Used to show you relevant advertisements', false, false),
('performance', 'Performance Cookies', 'Help us improve site performance', false, false);

-- =============================================
-- SCHEDULED JOBS FOR COMPLIANCE
-- =============================================

-- Schedule daily data retention check (requires pg_cron extension)
-- This will run at 2 AM daily
SELECT cron.schedule('data-retention-check', '0 2 * * *', 'SELECT check_data_retention();');

-- Schedule weekly deletion of old export files
SELECT cron.schedule('cleanup-expired-exports', '0 3 * * 0', $$
  DELETE FROM data_export_requests 
  WHERE status = 'completed' 
  AND expires_at < NOW();
$$);

-- Create updated_at triggers for GDPR tables
CREATE TRIGGER update_user_consents_updated_at 
  BEFORE UPDATE ON user_consents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_deletion_requests_updated_at 
  BEFORE UPDATE ON user_deletion_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_export_requests_updated_at 
  BEFORE UPDATE ON data_export_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_privacy_settings_updated_at 
  BEFORE UPDATE ON user_privacy_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_breaches_updated_at 
  BEFORE UPDATE ON data_breaches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type_status ON user_consents(consent_type, status);
CREATE INDEX idx_terms_acceptances_user_id ON terms_acceptances(user_id);
CREATE INDEX idx_user_deletion_requests_status ON user_deletion_requests(status);
CREATE INDEX idx_user_deletion_requests_scheduled ON user_deletion_requests(scheduled_for);
CREATE INDEX idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX idx_user_privacy_settings_user_id ON user_privacy_settings(user_id);
