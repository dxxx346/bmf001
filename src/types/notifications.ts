// Notification system types

export type NotificationType = 
  | 'order_confirmation'
  | 'order_shipped'
  | 'order_delivered'
  | 'payment_received'
  | 'payment_failed'
  | 'product_purchased'
  | 'product_review'
  | 'shop_approved'
  | 'shop_rejected'
  | 'referral_earned'
  | 'referral_payout'
  | 'account_created'
  | 'account_verified'
  | 'password_reset'
  | 'security_alert'
  | 'system_maintenance'
  | 'marketing_promotion'
  | 'newsletter'
  | 'custom';

export type NotificationChannel = 
  | 'email'
  | 'sms'
  | 'push'
  | 'in_app'
  | 'webhook';

export type NotificationPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

export type NotificationStatus = 
  | 'pending'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'cancelled';

export type NotificationFrequency = 
  | 'immediate'
  | 'daily'
  | 'weekly'
  | 'never';

export type DevicePlatform = 
  | 'ios'
  | 'android'
  | 'web';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  
  // Message content
  title: string;
  message?: string;
  html_content?: string;
  subject?: string;
  
  // Channel-specific data
  recipient_email?: string;
  recipient_phone?: string;
  recipient_device_token?: string;
  
  // Template and localization
  template_id?: string;
  locale: string;
  
  // Metadata and context
  data: Record<string, any>;
  context: Record<string, any>;
  
  // Tracking
  is_read: boolean;
  read_at?: string;
  clicked_at?: string;
  
  // Scheduling
  scheduled_at?: string;
  sent_at?: string;
  delivered_at?: string;
  expires_at?: string;
  
  // Error handling
  error_message?: string;
  retry_count: number;
  max_retries: number;
  
  // External provider tracking
  external_id?: string;
  external_status?: string;
  external_response: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  is_enabled: boolean;
  frequency: NotificationFrequency;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  locale: string;
  
  // Template content
  subject_template?: string;
  title_template: string;
  message_template?: string;
  html_template?: string;
  
  // Template variables and metadata
  variables: Record<string, any>;
  metadata: Record<string, any>;
  
  // Template settings
  is_active: boolean;
  version: number;
  
  created_at: string;
  updated_at: string;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description?: string;
  type: NotificationType;
  channel: NotificationChannel;
  
  // Campaign targeting
  target_audience: Record<string, any>;
  template_id?: string;
  
  // Campaign scheduling
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  
  // Campaign status and stats
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UnsubscribeToken {
  id: string;
  user_id: string;
  token: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export interface NotificationDeliveryLog {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  
  // Provider details
  provider?: string;
  provider_message_id?: string;
  provider_response: Record<string, any>;
  
  // Delivery details
  attempted_at: string;
  delivered_at?: string;
  error_message?: string;
  error_code?: string;
  
  // Tracking events
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  unsubscribed_at?: string;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: DevicePlatform;
  
  // Device details
  device_id?: string;
  device_name?: string;
  app_version?: string;
  os_version?: string;
  
  // Token status
  is_active: boolean;
  last_used_at: string;
  expires_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface WebSocketConnection {
  id: string;
  user_id?: string;
  connection_id: string;
  socket_id?: string;
  
  // Connection details
  ip_address?: string;
  user_agent?: string;
  connected_at: string;
  last_ping_at: string;
  disconnected_at?: string;
  
  // Connection metadata
  is_active: boolean;
  metadata: Record<string, any>;
}

// Request/Response types for API
export interface CreateNotificationRequest {
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  title: string;
  message?: string;
  html_content?: string;
  subject?: string;
  recipient_email?: string;
  recipient_phone?: string;
  template_id?: string;
  locale?: string;
  data?: Record<string, any>;
  context?: Record<string, any>;
  scheduled_at?: string;
  expires_at?: string;
}

export interface BulkNotificationRequest {
  user_ids: string[];
  template_id: string;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  scheduled_at?: string;
  data?: Record<string, any>;
}

export interface UpdatePreferencesRequest {
  preferences: Array<{
    type: NotificationType;
    channel: NotificationChannel;
    is_enabled: boolean;
    frequency: NotificationFrequency;
  }>;
}

export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template_id?: string;
  template_data?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface SendSMSRequest {
  to: string;
  message: string;
  from?: string;
}

export interface SendPushRequest {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  image?: string;
  click_action?: string;
}

// Template rendering context
export interface TemplateContext {
  user: {
    id: string;
    name?: string;
    email: string;
    avatar_url?: string;
  };
  data: Record<string, any>;
  unsubscribe_url?: string;
  app_url: string;
  locale: string;
}

// Analytics and reporting types
export interface NotificationStats {
  channel: NotificationChannel;
  type: NotificationType;
  period: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounced: number;
  unsubscribed: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
}

export interface ChannelHealth {
  channel: NotificationChannel;
  status: 'healthy' | 'degraded' | 'down';
  last_success: string;
  error_rate: number;
  avg_delivery_time: number;
  provider_status?: string;
}

// Provider-specific interfaces
export interface EmailProvider {
  name: string;
  send(request: SendEmailRequest): Promise<{ success: boolean; messageId?: string; error?: string }>;
  verify(): Promise<boolean>;
}

export interface SMSProvider {
  name: string;
  send(request: SendSMSRequest): Promise<{ success: boolean; messageId?: string; error?: string }>;
  verify(): Promise<boolean>;
}

export interface PushProvider {
  name: string;
  send(request: SendPushRequest): Promise<{ success: boolean; messageId?: string; error?: string }>;
  verify(): Promise<boolean>;
}

// Webhook payload types
export interface WebhookNotification {
  id: string;
  type: NotificationType;
  user_id: string;
  data: Record<string, any>;
  timestamp: string;
  signature: string;
}

// Rate limiting
export interface RateLimit {
  channel: NotificationChannel;
  type?: NotificationType;
  max_per_window: number;
  window_duration_minutes: number;
  current_count: number;
  window_start: string;
}
