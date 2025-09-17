// Webhook-specific types for payment providers

export interface WebhookEvent {
  id: string;
  provider: 'stripe' | 'yookassa' | 'coingate';
  event_type: string;
  data: Record<string, any>;
  signature: string;
  processed: boolean;
  success: boolean;
  error?: string;
  created_at: string;
  processed_at?: string;
}

export interface StripeWebhookEvent {
  id: string;
  object: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
}

export interface YooKassaWebhookEvent {
  type: string;
  event: string;
  object: {
    id: string;
    status: string;
    amount: {
      value: string;
      currency: string;
    };
    metadata: Record<string, string>;
    created_at: string;
    paid: boolean;
    refundable: boolean;
    test: boolean;
  };
}

export interface CoinGateWebhookEvent {
  id: number;
  order_id: string;
  status: string;
  do_not_remove: boolean;
  price_amount: number;
  price_currency: string;
  receive_amount: number;
  receive_currency: string;
  created_at: string;
  token: string;
  payment_url: string;
  lightning_network?: {
    invoice: string;
    expires_at: string;
  };
}

export interface WebhookProcessingResult {
  success: boolean;
  processed: boolean;
  error?: string;
  data?: any;
}

export interface PaymentWebhookData {
  payment_id: string;
  user_id: string;
  product_id?: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, any>;
  referral_code?: string;
}

export interface WebhookSignatureVerification {
  valid: boolean;
  provider: string;
  error?: string;
}

export interface ProductAccessGrant {
  user_id: string;
  product_id: string;
  purchase_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  expires_at?: string;
}

export interface ReferralCommissionData {
  referral_id: string;
  referrer_id: string;
  product_id: string;
  purchase_id: string;
  commission_amount: number;
  commission_percent: number;
  product_price: number;
}

export interface EmailNotificationData {
  user_id: string;
  product_title: string;
  amount: number;
  currency: string;
  download_url?: string;
  commission_amount?: number;
  dashboard_url?: string;
}

export interface WebhookAuditLog {
  id: string;
  provider: string;
  event_type: string;
  payment_id?: string;
  user_id?: string;
  product_id?: string;
  success: boolean;
  error?: string;
  processing_time_ms: number;
  created_at: string;
  processed_at: string;
}

export interface WebhookConfig {
  stripe: {
    webhook_secret: string;
    events: string[];
  };
  yookassa: {
    webhook_secret: string;
    events: string[];
  };
  coingate: {
    webhook_secret: string;
    events: string[];
  };
}

export interface WebhookRetryConfig {
  max_attempts: number;
  base_delay: number;
  max_delay: number;
  backoff_multiplier: number;
}

export interface WebhookRateLimit {
  requests_per_minute: number;
  burst_limit: number;
  window_size_minutes: number;
}

export interface WebhookSecurityConfig {
  allowed_ips: string[];
  require_signature: boolean;
  max_payload_size: number;
  timeout_seconds: number;
}

export interface WebhookMonitoringConfig {
  enable_logging: boolean;
  enable_metrics: boolean;
  alert_on_failure: boolean;
  alert_threshold: number;
  retention_days: number;
}
