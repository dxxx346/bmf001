// Payment types for the digital marketplace

export type PaymentProvider = 'stripe' | 'yookassa' | 'coingate' | 'paypal';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
export type PaymentMethodType = 'card' | 'bank_transfer' | 'crypto' | 'wallet' | 'other';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | 'RUB' | 'CNY' | 'BTC' | 'ETH' | 'USDT';
export type RefundStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  provider: PaymentProvider;
  provider_payment_id?: string;
  client_secret?: string;
  payment_method_id?: string;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  provider: PaymentProvider;
  type: PaymentMethodType;
  provider_method_id: string;
  last_four?: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  payment_intent_id: string;
  user_id: string;
  product_id?: string;
  order_id?: string;
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  provider_transaction_id: string;
  status: PaymentStatus;
  payment_method_id?: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: string;
  payment_intent_id: string;
  transaction_id: string;
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  provider_refund_id: string;
  status: RefundStatus;
  reason?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  payment_intent_id: string;
  invoice_number: string;
  amount: number;
  currency: Currency;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  items: InvoiceItem[];
  billing_address: BillingAddress;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
}

export interface BillingAddress {
  name: string;
  email: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export interface ExchangeRate {
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  timestamp: string;
  source: 'stripe' | 'yookassa' | 'coingate' | 'manual';
}

export interface PaymentRequest {
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  payment_method_id?: string;
  product_id?: string;
  order_id?: string;
  description: string;
  metadata?: Record<string, string>;
  return_url?: string;
  cancel_url?: string;
  billing_address?: BillingAddress;
  items?: InvoiceItem[];
}

export interface StripePaymentData {
  payment_intent_id: string;
  client_secret: string;
  publishable_key: string;
  checkout_url?: string;
}

export interface YooKassaPaymentData {
  payment_id: string;
  confirmation_url: string;
  status: string;
}

export interface CoinGatePaymentData {
  payment_id: string;
  payment_url: string;
  status: string;
  lightning_network?: {
    invoice: string;
    expires_at: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  payment_intent?: PaymentIntent;
  payment_data?: StripePaymentData | YooKassaPaymentData | CoinGatePaymentData;
  error?: string;
  error_code?: string;
}

export interface RefundRequest {
  payment_intent_id: string;
  amount?: number; // If not provided, refunds full amount
  reason?: string;
  metadata?: Record<string, string>;
}

export interface RefundResponse {
  success: boolean;
  refund?: Refund;
  error?: string;
  error_code?: string;
}

export interface InvoiceRequest {
  user_id: string;
  payment_intent_id: string;
  items: InvoiceItem[];
  billing_address: BillingAddress;
  due_date?: string;
  tax_rate?: number;
}

export interface InvoiceResponse {
  success: boolean;
  invoice?: Invoice;
  error?: string;
  error_code?: string;
}

export interface PaymentMethodRequest {
  user_id: string;
  provider: PaymentProvider;
  provider_method_id: string;
  type: PaymentMethodType;
  last_four?: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  metadata?: Record<string, unknown>;
}

export interface PaymentMethodResponse {
  success: boolean;
  payment_method?: PaymentMethod;
  error?: string;
  error_code?: string;
}

export interface ExchangeRateRequest {
  from_currency: Currency;
  to_currency: Currency;
  amount: number;
}

export interface ExchangeRateResponse {
  success: boolean;
  converted_amount?: number;
  exchange_rate?: number;
  error?: string;
}

export interface WebhookEvent {
  id: string;
  provider: PaymentProvider;
  event_type: string;
  data: Record<string, unknown>;
  processed: boolean;
  created_at: string;
  processed_at?: string;
}

export interface PaymentAnalytics {
  total_volume: number;
  total_transactions: number;
  success_rate: number;
  average_transaction_value: number;
  currency_breakdown: Array<{
    currency: Currency;
    volume: number;
    transactions: number;
  }>;
  provider_breakdown: Array<{
    provider: PaymentProvider;
    volume: number;
    transactions: number;
    success_rate: number;
  }>;
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface PaymentConfig {
  stripe: {
    publishable_key: string;
    secret_key: string;
    webhook_secret: string;
    success_url: string;
    cancel_url: string;
  };
  yookassa: {
    shop_id: string;
    secret_key: string;
    webhook_secret: string;
    success_url: string;
    cancel_url: string;
  };
  coingate: {
    api_key: string;
    webhook_secret: string;
    success_url: string;
    cancel_url: string;
  };
  paypal: {
    client_id: string;
    client_secret: string;
    webhook_secret: string;
    success_url: string;
    cancel_url: string;
  };
  exchange_rates: {
    api_key: string;
    base_currency: Currency;
    update_interval: number; // minutes
  };
  retry: {
    max_attempts: number;
    base_delay: number; // milliseconds
    max_delay: number; // milliseconds
    backoff_multiplier: number;
  };
  idempotency: {
    key_expiry: number; // hours
    cleanup_interval: number; // hours
  };
}

export interface IdempotencyKey {
  key: string;
  payment_intent_id: string;
  expires_at: string;
  created_at: string;
}

export interface RetryConfig {
  max_attempts: number;
  base_delay: number;
  max_delay: number;
  backoff_multiplier: number;
}

export interface PaymentError {
  code: string;
  message: string;
  provider: PaymentProvider;
  provider_error?: string;
  retryable: boolean;
  metadata?: Record<string, unknown>;
}

export interface PaymentWebhook {
  id: string;
  provider: PaymentProvider;
  event_type: string;
  data: Record<string, unknown>;
  signature: string;
  processed: boolean;
  created_at: string;
  processed_at?: string;
  error?: string;
}

export interface PaymentSummary {
  payment_intent: PaymentIntent;
  transaction?: PaymentTransaction;
  refunds: Refund[];
  invoice?: Invoice;
  payment_method?: PaymentMethod;
}
