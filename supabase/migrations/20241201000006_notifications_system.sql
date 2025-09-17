-- Comprehensive Notifications System Migration
-- This migration extends the existing notifications table and adds support for multi-channel notifications

-- Create notification types and channels enums
CREATE TYPE notification_type AS ENUM (
  'order_confirmation',
  'order_shipped',
  'order_delivered',
  'payment_received',
  'payment_failed',
  'product_purchased',
  'product_review',
  'shop_approved',
  'shop_rejected',
  'referral_earned',
  'referral_payout',
  'account_created',
  'account_verified',
  'password_reset',
  'security_alert',
  'system_maintenance',
  'marketing_promotion',
  'newsletter',
  'custom'
);

CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms',
  'push',
  'in_app',
  'webhook'
);

CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'cancelled'
);

-- Drop existing notifications table and recreate with enhanced structure
DROP TABLE IF EXISTS notifications;

-- Enhanced notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  priority notification_priority DEFAULT 'normal',
  status notification_status DEFAULT 'pending',
  
  -- Message content
  title TEXT NOT NULL,
  message TEXT,
  html_content TEXT,
  subject TEXT,
  
  -- Channel-specific data
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_device_token TEXT,
  
  -- Template and localization
  template_id TEXT,
  locale TEXT DEFAULT 'en',
  
  -- Metadata and context
  data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  
  -- Tracking
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- External provider tracking
  external_id TEXT,
  external_status TEXT,
  external_response JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'never')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type, channel)
);

-- Notification templates table
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  locale TEXT DEFAULT 'en',
  
  -- Template content
  subject_template TEXT,
  title_template TEXT NOT NULL,
  message_template TEXT,
  html_template TEXT,
  
  -- Template variables and metadata
  variables JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Template settings
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, locale, channel)
);

-- Notification campaigns table (for bulk notifications)
CREATE TABLE notification_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  
  -- Campaign targeting
  target_audience JSONB DEFAULT '{}', -- filters for user selection
  template_id UUID REFERENCES notification_templates(id),
  
  -- Campaign scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Campaign status and stats
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'cancelled')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unsubscribe tokens table
CREATE TABLE unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  type notification_type,
  channel notification_channel,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 year',
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification delivery log table (for tracking and analytics)
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  status notification_status NOT NULL,
  
  -- Provider details
  provider TEXT, -- 'sendgrid', 'twilio', 'fcm', etc.
  provider_message_id TEXT,
  provider_response JSONB DEFAULT '{}',
  
  -- Delivery details
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_code TEXT,
  
  -- Tracking events
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Notification rate limiting table
CREATE TABLE notification_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  type notification_type,
  
  -- Rate limiting
  count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_duration_minutes INTEGER DEFAULT 60,
  max_per_window INTEGER DEFAULT 10,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel, type)
);

-- WebSocket connections table (for real-time notifications)
CREATE TABLE websocket_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  connection_id TEXT UNIQUE NOT NULL,
  socket_id TEXT,
  
  -- Connection details
  ip_address TEXT,
  user_agent TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  
  -- Connection metadata
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- Device tokens table (for push notifications)
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  
  -- Device details
  device_id TEXT,
  device_name TEXT,
  app_version TEXT,
  os_version TEXT,
  
  -- Token status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token, platform)
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_type_channel ON notification_preferences(type, channel);

CREATE INDEX idx_notification_templates_type_channel ON notification_templates(type, channel);
CREATE INDEX idx_notification_templates_locale ON notification_templates(locale);

CREATE INDEX idx_notification_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX idx_notification_delivery_log_status ON notification_delivery_log(status);
CREATE INDEX idx_notification_delivery_log_attempted_at ON notification_delivery_log(attempted_at);

CREATE INDEX idx_websocket_connections_user_id ON websocket_connections(user_id);
CREATE INDEX idx_websocket_connections_is_active ON websocket_connections(is_active);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_platform ON device_tokens(platform);
CREATE INDEX idx_device_tokens_is_active ON device_tokens(is_active);

CREATE INDEX idx_unsubscribe_tokens_token ON unsubscribe_tokens(token);
CREATE INDEX idx_unsubscribe_tokens_user_id ON unsubscribe_tokens(user_id);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_campaigns_updated_at BEFORE UPDATE ON notification_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_rate_limits_updated_at BEFORE UPDATE ON notification_rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_tokens_updated_at BEFORE UPDATE ON device_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for notifications system
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Users can view their own delivery logs
CREATE POLICY "Users can view own delivery logs" ON notification_delivery_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM notifications WHERE id = notification_id AND user_id = auth.uid())
);

-- Users can manage their own device tokens
CREATE POLICY "Users can manage own device tokens" ON device_tokens FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own WebSocket connections
CREATE POLICY "Users can manage own websocket connections" ON websocket_connections FOR ALL USING (auth.uid() = user_id);

-- Users can view their own unsubscribe tokens
CREATE POLICY "Users can view own unsubscribe tokens" ON unsubscribe_tokens FOR SELECT USING (auth.uid() = user_id);

-- Admin policies for templates and campaigns
CREATE POLICY "Admins can manage templates" ON notification_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage campaigns" ON notification_campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Public read access to active templates for rendering
CREATE POLICY "Public can view active templates" ON notification_templates FOR SELECT USING (is_active = true);
