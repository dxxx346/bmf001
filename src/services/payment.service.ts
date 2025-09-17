import { createServiceClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { nanoid } from 'nanoid/non-secure';
import Stripe from 'stripe';
import {
  PaymentIntent,
  PaymentMethod,
  PaymentTransaction,
  Refund,
  Invoice,
  ExchangeRate,
  PaymentRequest,
  StripePaymentData,
  YooKassaPaymentData,
  CoinGatePaymentData,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
  InvoiceRequest,
  InvoiceResponse,
  PaymentMethodRequest,
  PaymentMethodResponse,
  ExchangeRateRequest,
  ExchangeRateResponse,
  WebhookEvent,
  PaymentAnalytics,
  PaymentConfig,
  IdempotencyKey,
  RetryConfig,
  PaymentError,
  PaymentWebhook,
  PaymentSummary,
  PaymentProvider,
  PaymentStatus,
  Currency,
  RefundStatus,
} from '@/types/payment';

export class PaymentService {
  private supabase = createServiceClient();
  private stripe: Stripe;
  private config: PaymentConfig;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });

    this.config = {
      stripe: {
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY!,
        secret_key: process.env.STRIPE_SECRET_KEY!,
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET!,
        success_url: process.env.STRIPE_SUCCESS_URL || 'https://yourdomain.com/payment/success',
        cancel_url: process.env.STRIPE_CANCEL_URL || 'https://yourdomain.com/payment/cancel',
      },
      yookassa: {
        shop_id: process.env.YOOKASSA_SHOP_ID!,
        secret_key: process.env.YOOKASSA_SECRET_KEY!,
        webhook_secret: process.env.YOOKASSA_WEBHOOK_SECRET!,
        success_url: process.env.YOOKASSA_SUCCESS_URL || 'https://yourdomain.com/payment/success',
        cancel_url: process.env.YOOKASSA_CANCEL_URL || 'https://yourdomain.com/payment/cancel',
      },
      coingate: {
        api_key: process.env.COINGATE_API_KEY!,
        webhook_secret: process.env.COINGATE_WEBHOOK_SECRET!,
        success_url: process.env.COINGATE_SUCCESS_URL || 'https://yourdomain.com/payment/success',
        cancel_url: process.env.COINGATE_CANCEL_URL || 'https://yourdomain.com/payment/cancel',
      },
      paypal: {
        client_id: process.env.PAYPAL_CLIENT_ID!,
        client_secret: process.env.PAYPAL_CLIENT_SECRET!,
        webhook_secret: process.env.PAYPAL_WEBHOOK_SECRET!,
        success_url: process.env.PAYPAL_SUCCESS_URL || 'https://yourdomain.com/payment/success',
        cancel_url: process.env.PAYPAL_CANCEL_URL || 'https://yourdomain.com/payment/cancel',
      },
      exchange_rates: {
        api_key: process.env.EXCHANGE_RATES_API_KEY!,
        base_currency: 'USD',
        update_interval: 60, // 1 hour
      },
      retry: {
        max_attempts: 3,
        base_delay: 1000,
        max_delay: 10000,
        backoff_multiplier: 2,
      },
      idempotency: {
        key_expiry: 24, // 24 hours
        cleanup_interval: 6, // 6 hours
      },
    };
  }

  // =============================================
  // PAYMENT CREATION
  // =============================================

  async createPayment(request: PaymentRequest, idempotencyKey?: string): Promise<PaymentResponse> {
    try {
      logger.info('Creating payment', { 
        amount: request.amount, 
        currency: request.currency, 
        provider: request.provider,
        idempotencyKey 
      });

      // Check idempotency
      if (idempotencyKey) {
        const existingPayment = await this.checkIdempotency(idempotencyKey);
        if (existingPayment) {
          return {
            success: true,
            payment_intent: existingPayment,
          };
        }
      }

      // Convert currency if needed
      const convertedAmount = await this.convertCurrency(
        request.amount,
        request.currency,
        this.getProviderBaseCurrency(request.provider)
      );

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent({
        ...request,
        amount: convertedAmount.amount,
        currency: convertedAmount.currency,
      });

      if (!paymentIntent) {
        return {
          success: false,
          error: 'Failed to create payment intent',
        };
      }

      // Store idempotency key if provided
      if (idempotencyKey) {
        await this.storeIdempotencyKey(idempotencyKey, paymentIntent.id);
      }

      // Create provider-specific payment
      const paymentData = await this.createProviderPayment(paymentIntent, request);

      if (!paymentData) {
        return {
          success: false,
          error: 'Failed to create provider payment',
        };
      }

      logger.info('Payment created successfully', { 
        paymentIntentId: paymentIntent.id,
        provider: request.provider 
      });

      return {
        success: true,
        payment_intent: paymentIntent,
        payment_data: paymentData,
      };
    } catch (error) {
      logError(error as Error, { action: 'create_payment', provider: request.provider });
      return {
        success: false,
        error: 'Payment creation failed due to server error',
      };
    }
  }

  private async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent | null> {
    try {
      const paymentIntentId = nanoid();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const { data: paymentIntent, error } = await this.supabase
        .from('payment_intents')
        .insert({
          id: paymentIntentId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          provider: request.provider,
          payment_method_id: request.payment_method_id,
          metadata: request.metadata || {},
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        logError(error, { action: 'create_payment_intent' });
        return null;
      }

      return paymentIntent as PaymentIntent;
    } catch (error) {
      logError(error as Error, { action: 'create_payment_intent' });
      return null;
    }
  }

  private async createProviderPayment(paymentIntent: PaymentIntent, request: PaymentRequest): Promise<StripePaymentData | YooKassaPaymentData | CoinGatePaymentData | null> {
    switch (request.provider) {
      case 'stripe':
        return this.createStripePayment(paymentIntent, request);
      case 'yookassa':
        return this.createYooKassaPayment(paymentIntent, request);
      case 'coingate':
        return this.createCoinGatePayment(paymentIntent, request);
      default:
        logError(new Error(`Unsupported payment provider: ${request.provider}`), { provider: request.provider });
        return null;
    }
  }

  // =============================================
  // STRIPE INTEGRATION
  // =============================================

  private async createStripePayment(paymentIntent: PaymentIntent, request: PaymentRequest): Promise<StripePaymentData | null> {
    try {
      const stripePaymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentIntent.amount * 100), // Convert to cents
        currency: paymentIntent.currency.toLowerCase(),
        metadata: {
          payment_intent_id: paymentIntent.id,
          ...request.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update payment intent with Stripe ID
      await this.supabase
        .from('payment_intents')
        .update({
          provider_payment_id: stripePaymentIntent.id,
          client_secret: stripePaymentIntent.client_secret,
        })
        .eq('id', paymentIntent.id);

      return {
        payment_intent_id: paymentIntent.id,
        client_secret: stripePaymentIntent.client_secret!,
        publishable_key: this.config.stripe.publishable_key,
      };
    } catch (error) {
      logError(error as Error, { action: 'create_stripe_payment', paymentIntentId: paymentIntent.id });
      return null;
    }
  }

  async handleStripeWebhook(payload: string, signature: string): Promise<boolean> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.stripe.webhook_secret
      );

      logger.info('Processing Stripe webhook', { eventType: event.type, eventId: event.id });

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.canceled':
          await this.handlePaymentCancellation(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          logger.info('Unhandled Stripe webhook event', { eventType: event.type });
      }

      return true;
    } catch (error) {
      logError(error as Error, { action: 'handle_stripe_webhook' });
      return false;
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await this.updatePaymentStatus(paymentIntent.id, 'succeeded');
      await this.createTransaction(paymentIntent);
      logger.info('Payment succeeded', { stripePaymentIntentId: paymentIntent.id });
    } catch (error) {
      logError(error as Error, { action: 'handle_payment_success', stripePaymentIntentId: paymentIntent.id });
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await this.updatePaymentStatus(paymentIntent.id, 'failed');
      logger.info('Payment failed', { stripePaymentIntentId: paymentIntent.id });
    } catch (error) {
      logError(error as Error, { action: 'handle_payment_failure', stripePaymentIntentId: paymentIntent.id });
    }
  }

  private async handlePaymentCancellation(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await this.updatePaymentStatus(paymentIntent.id, 'cancelled');
      logger.info('Payment cancelled', { stripePaymentIntentId: paymentIntent.id });
    } catch (error) {
      logError(error as Error, { action: 'handle_payment_cancellation', stripePaymentIntentId: paymentIntent.id });
    }
  }

  // =============================================
  // YOOKASSA INTEGRATION
  // =============================================

  private async createYooKassaPayment(paymentIntent: PaymentIntent, request: PaymentRequest): Promise<YooKassaPaymentData | null> {
    try {
      const yooKassaPayment = {
        amount: {
          value: paymentIntent.amount.toFixed(2),
          currency: paymentIntent.currency,
        },
        confirmation: {
          type: 'redirect',
          return_url: this.config.yookassa.success_url,
        },
        description: request.description,
        metadata: {
          payment_intent_id: paymentIntent.id,
          ...request.metadata,
        },
      };

      const response = await fetch('https://api.yookassa.ru/v3/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.yookassa.shop_id}:${this.config.yookassa.secret_key}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Idempotence-Key': nanoid(),
        },
        body: JSON.stringify(yooKassaPayment),
      });

      if (!response.ok) {
        throw new Error(`YooKassa API error: ${response.statusText}`);
      }

      const payment = await response.json();

      // Update payment intent with YooKassa ID
      await this.supabase
        .from('payment_intents')
        .update({
          provider_payment_id: payment.id,
        })
        .eq('id', paymentIntent.id);

      return {
        payment_id: payment.id,
        confirmation_url: payment.confirmation.confirmation_url,
        status: payment.status,
      };
    } catch (error) {
      logError(error as Error, { action: 'create_yookassa_payment', paymentIntentId: paymentIntent.id });
      return null;
    }
  }

  async handleYooKassaWebhook(payload: any): Promise<boolean> {
    try {
      logger.info('Processing YooKassa webhook', { event: payload.event });

      switch (payload.event) {
        case 'payment.succeeded':
          await this.handleYooKassaPaymentSuccess(payload.object);
          break;
        case 'payment.canceled':
          await this.handleYooKassaPaymentCancellation(payload.object);
          break;
        default:
          logger.info('Unhandled YooKassa webhook event', { event: payload.event });
      }

      return true;
    } catch (error) {
      logError(error as Error, { action: 'handle_yookassa_webhook' });
      return false;
    }
  }

  private async handleYooKassaPaymentSuccess(payment: any): Promise<void> {
    try {
      await this.updatePaymentStatus(payment.id, 'succeeded');
      await this.createTransaction(payment);
      logger.info('YooKassa payment succeeded', { yooKassaPaymentId: payment.id });
    } catch (error) {
      logError(error as Error, { action: 'handle_yookassa_payment_success', yooKassaPaymentId: payment.id });
    }
  }

  private async handleYooKassaPaymentCancellation(payment: any): Promise<void> {
    try {
      await this.updatePaymentStatus(payment.id, 'cancelled');
      logger.info('YooKassa payment cancelled', { yooKassaPaymentId: payment.id });
    } catch (error) {
      logError(error as Error, { action: 'handle_yookassa_payment_cancellation', yooKassaPaymentId: payment.id });
    }
  }

  // =============================================
  // COINGATE INTEGRATION
  // =============================================

  private async createCoinGatePayment(paymentIntent: PaymentIntent, request: PaymentRequest): Promise<CoinGatePaymentData | null> {
    try {
      const coinGatePayment = {
        order_id: paymentIntent.id,
        price_amount: paymentIntent.amount.toString(),
        price_currency: paymentIntent.currency,
        receive_currency: 'BTC',
        title: request.description,
        description: request.description,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/coingate`,
        success_url: this.config.coingate.success_url,
        cancel_url: this.config.coingate.cancel_url,
        token: nanoid(),
      };

      const response = await fetch('https://api.coingate.com/v2/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.coingate.api_key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(coinGatePayment),
      });

      if (!response.ok) {
        throw new Error(`CoinGate API error: ${response.statusText}`);
      }

      const payment = await response.json();

      // Update payment intent with CoinGate ID
      await this.supabase
        .from('payment_intents')
        .update({
          provider_payment_id: payment.id.toString(),
        })
        .eq('id', paymentIntent.id);

      return {
        payment_id: payment.id.toString(),
        payment_url: payment.payment_url,
        status: payment.status,
        lightning_network: payment.lightning_network ? {
          invoice: payment.lightning_network.invoice,
          expires_at: payment.lightning_network.expires_at,
        } : undefined,
      };
    } catch (error) {
      logError(error as Error, { action: 'create_coingate_payment', paymentIntentId: paymentIntent.id });
      return null;
    }
  }

  async handleCoinGateWebhook(payload: any): Promise<boolean> {
    try {
      logger.info('Processing CoinGate webhook', { event: payload.event });

      switch (payload.event) {
        case 'payment_paid':
          await this.handleCoinGatePaymentSuccess(payload.order);
          break;
        case 'payment_canceled':
          await this.handleCoinGatePaymentCancellation(payload.order);
          break;
        default:
          logger.info('Unhandled CoinGate webhook event', { event: payload.event });
      }

      return true;
    } catch (error) {
      logError(error as Error, { action: 'handle_coingate_webhook' });
      return false;
    }
  }

  private async handleCoinGatePaymentSuccess(order: any): Promise<void> {
    try {
      await this.updatePaymentStatus(order.id, 'succeeded');
      await this.createTransaction(order);
      logger.info('CoinGate payment succeeded', { coinGateOrderId: order.id });
    } catch (error) {
      logError(error as Error, { action: 'handle_coingate_payment_success', coinGateOrderId: order.id });
    }
  }

  private async handleCoinGatePaymentCancellation(order: any): Promise<void> {
    try {
      await this.updatePaymentStatus(order.id, 'cancelled');
      logger.info('CoinGate payment cancelled', { coinGateOrderId: order.id });
    } catch (error) {
      logError(error as Error, { action: 'handle_coingate_payment_cancellation', coinGateOrderId: order.id });
    }
  }

  // =============================================
  // REFUND PROCESSING
  // =============================================

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      logger.info('Processing refund', { 
        paymentIntentId: request.payment_intent_id, 
        amount: request.amount 
      });

      // Get payment intent
      const paymentIntent = await this.getPaymentIntent(request.payment_intent_id);
      if (!paymentIntent) {
        return {
          success: false,
          error: 'Payment intent not found',
        };
      }

      // Calculate refund amount
      const refundAmount = request.amount || paymentIntent.amount;

      // Process refund with provider
      const providerRefundId = await this.processProviderRefund(paymentIntent, refundAmount, request.reason);

      if (!providerRefundId) {
        return {
          success: false,
          error: 'Failed to process refund with provider',
        };
      }

      // Create refund record
      const refund = await this.createRefundRecord({
        payment_intent_id: request.payment_intent_id,
        amount: refundAmount,
        currency: paymentIntent.currency,
        provider: paymentIntent.provider,
        provider_refund_id: providerRefundId,
        reason: request.reason,
        metadata: request.metadata || {},
      });

      if (!refund) {
        return {
          success: false,
          error: 'Failed to create refund record',
        };
      }

      // Update payment status
      await this.updatePaymentStatus(paymentIntent.id, 'refunded');

      logger.info('Refund processed successfully', { 
        refundId: refund.id, 
        amount: refundAmount 
      });

      return {
        success: true,
        refund,
      };
    } catch (error) {
      logError(error as Error, { action: 'process_refund', paymentIntentId: request.payment_intent_id });
      return {
        success: false,
        error: 'Refund processing failed due to server error',
      };
    }
  }

  private async processProviderRefund(paymentIntent: PaymentIntent, amount: number, reason?: string): Promise<string | null> {
    switch (paymentIntent.provider) {
      case 'stripe':
        return this.processStripeRefund(paymentIntent, amount, reason);
      case 'yookassa':
        return this.processYooKassaRefund(paymentIntent, amount, reason);
      case 'coingate':
        return this.processCoinGateRefund(paymentIntent, amount, reason);
      default:
        logError(new Error(`Unsupported refund provider: ${paymentIntent.provider}`), { provider: paymentIntent.provider });
        return null;
    }
  }

  private async processStripeRefund(paymentIntent: PaymentIntent, amount: number, reason?: string): Promise<string | null> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntent.provider_payment_id!,
        amount: Math.round(amount * 100), // Convert to cents
        reason: reason as any,
      });

      return refund.id;
    } catch (error) {
      logError(error as Error, { action: 'process_stripe_refund', paymentIntentId: paymentIntent.id });
      return null;
    }
  }

  private async processYooKassaRefund(paymentIntent: PaymentIntent, amount: number, reason?: string): Promise<string | null> {
    try {
      const refund = {
        amount: {
          value: amount.toFixed(2),
          currency: paymentIntent.currency,
        },
        payment_id: paymentIntent.provider_payment_id!,
      };

      const response = await fetch('https://api.yookassa.ru/v3/refunds', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.yookassa.shop_id}:${this.config.yookassa.secret_key}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Idempotence-Key': nanoid(),
        },
        body: JSON.stringify(refund),
      });

      if (!response.ok) {
        throw new Error(`YooKassa refund API error: ${response.statusText}`);
      }

      const refundData = await response.json();
      return refundData.id;
    } catch (error) {
      logError(error as Error, { action: 'process_yookassa_refund', paymentIntentId: paymentIntent.id });
      return null;
    }
  }

  private async processCoinGateRefund(paymentIntent: PaymentIntent, amount: number, reason?: string): Promise<string | null> {
    try {
      // CoinGate doesn't support refunds for crypto payments
      // This would need to be handled manually
      logger.warn('CoinGate refunds not supported', { paymentIntentId: paymentIntent.id });
      return null;
    } catch (error) {
      logError(error as Error, { action: 'process_coingate_refund', paymentIntentId: paymentIntent.id });
      return null;
    }
  }

  // =============================================
  // INVOICE GENERATION
  // =============================================

  async generateInvoice(request: InvoiceRequest): Promise<InvoiceResponse> {
    try {
      logger.info('Generating invoice', { 
        userId: request.user_id, 
        paymentIntentId: request.payment_intent_id 
      });

      const invoiceId = nanoid();
      const invoiceNumber = `INV-${Date.now()}`;
      const dueDate = request.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      // Calculate totals
      const subtotal = request.items.reduce((sum, item) => sum + item.total_price, 0);
      const taxRate = request.tax_rate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      const { data: invoice, error } = await this.supabase
        .from('invoices')
        .insert({
          id: invoiceId,
          user_id: request.user_id,
          payment_intent_id: request.payment_intent_id,
          invoice_number: invoiceNumber,
          amount: subtotal,
          currency: 'USD', // Default currency
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'draft',
          due_date: dueDate,
          items: request.items,
          billing_address: request.billing_address,
        })
        .select()
        .single();

      if (error) {
        logError(error, { action: 'generate_invoice' });
        return {
          success: false,
          error: 'Failed to generate invoice',
        };
      }

      logger.info('Invoice generated successfully', { invoiceId, invoiceNumber });
      return {
        success: true,
        invoice: invoice as Invoice,
      };
    } catch (error) {
      logError(error as Error, { action: 'generate_invoice' });
      return {
        success: false,
        error: 'Invoice generation failed due to server error',
      };
    }
  }

  // =============================================
  // MULTI-CURRENCY SUPPORT
  // =============================================

  async convertCurrency(amount: number, fromCurrency: Currency, toCurrency: Currency): Promise<{ amount: number; currency: Currency; rate: number }> {
    try {
      if (fromCurrency === toCurrency) {
        return { amount, currency: toCurrency, rate: 1 };
      }

      // Get exchange rate
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
      if (!exchangeRate) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      const convertedAmount = amount * exchangeRate.rate;

      return {
        amount: convertedAmount,
        currency: toCurrency,
        rate: exchangeRate.rate,
      };
    } catch (error) {
      logError(error as Error, { action: 'convert_currency', fromCurrency, toCurrency });
      throw error;
    }
  }

  private async getExchangeRate(fromCurrency: Currency, toCurrency: Currency): Promise<ExchangeRate | null> {
    try {
      // Check cache first
      const { data: cachedRate } = await this.supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .gt('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1 hour cache
        .single();

      if (cachedRate) {
        return cachedRate as ExchangeRate;
      }

      // Fetch from external API
      const rate = await this.fetchExchangeRate(fromCurrency, toCurrency);
      if (!rate) {
        return null;
      }

      // Store in database
      await this.supabase
        .from('exchange_rates')
        .insert({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: rate.rate,
          timestamp: new Date().toISOString(),
          source: 'external',
        });

      return rate;
    } catch (error) {
      logError(error as Error, { action: 'get_exchange_rate', fromCurrency, toCurrency });
      return null;
    }
  }

  private async fetchExchangeRate(fromCurrency: Currency, toCurrency: Currency): Promise<ExchangeRate | null> {
    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
      );

      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rate = data.rates[toCurrency];

      if (!rate) {
        throw new Error(`Exchange rate not found for ${toCurrency}`);
      }

      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate,
        timestamp: new Date().toISOString(),
        source: 'manual',
      };
    } catch (error) {
      logError(error as Error, { action: 'fetch_exchange_rate', fromCurrency, toCurrency });
      return null;
    }
  }

  private getProviderBaseCurrency(provider: PaymentProvider): Currency {
    switch (provider) {
      case 'stripe':
        return 'USD';
      case 'yookassa':
        return 'RUB';
      case 'coingate':
        return 'BTC';
      case 'paypal':
        return 'USD';
      default:
        return 'USD';
    }
  }

  // =============================================
  // IDEMPOTENCY AND RETRY LOGIC
  // =============================================

  private async checkIdempotency(key: string): Promise<PaymentIntent | null> {
    try {
      const { data: idempotencyKey } = await this.supabase
        .from('idempotency_keys')
        .select('payment_intent_id')
        .eq('key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!idempotencyKey) {
        return null;
      }

      const { data: paymentIntent } = await this.supabase
        .from('payment_intents')
        .select('*')
        .eq('id', idempotencyKey.payment_intent_id)
        .single();

      return paymentIntent as PaymentIntent;
    } catch (error) {
      logError(error as Error, { action: 'check_idempotency', key });
      return null;
    }
  }

  private async storeIdempotencyKey(key: string, paymentIntentId: string): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.config.idempotency.key_expiry * 60 * 60 * 1000);

      await this.supabase
        .from('idempotency_keys')
        .insert({
          key,
          payment_intent_id: paymentIntentId,
          expires_at: expiresAt.toISOString(),
        });
    } catch (error) {
      logError(error as Error, { action: 'store_idempotency_key', key });
    }
  }

  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig = this.config.retry as RetryConfig
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.max_attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.max_attempts) {
          break;
        }

        const delay = Math.min(
          config.base_delay * Math.pow(2, attempt - 1),
          config.max_delay
        );

        logger.warn(`Operation failed, retrying in ${delay}ms`, { 
          attempt, 
          maxAttempts: config.max_attempts,
          error: lastError.message 
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async updatePaymentStatus(providerPaymentId: string, status: PaymentStatus): Promise<void> {
    try {
      await this.supabase
        .from('payment_intents')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_payment_id', providerPaymentId);
    } catch (error) {
      logError(error as Error, { action: 'update_payment_status', providerPaymentId });
    }
  }

  private async createTransaction(paymentData: any): Promise<void> {
    try {
      const transactionId = nanoid();
      
      await this.supabase
        .from('payment_transactions')
        .insert({
          id: transactionId,
          payment_intent_id: paymentData.metadata?.payment_intent_id || paymentData.id,
          user_id: paymentData.metadata?.user_id || '',
          amount: paymentData.amount || paymentData.price_amount,
          currency: paymentData.currency || paymentData.price_currency,
          provider: this.detectProvider(paymentData),
          provider_transaction_id: paymentData.id,
          status: 'succeeded',
          description: paymentData.description || 'Payment completed',
          metadata: paymentData.metadata || {},
        });
    } catch (error) {
      logError(error as Error, { action: 'create_transaction' });
    }
  }

  private detectProvider(paymentData: any): PaymentProvider {
    if (paymentData.client_secret) return 'stripe';
    if (paymentData.confirmation_url) return 'yookassa';
    if (paymentData.payment_url) return 'coingate';
    return 'stripe'; // Default
  }

  private async createRefundRecord(refundData: any): Promise<Refund | null> {
    try {
      const refundId = nanoid();
      
      const { data: refund, error } = await this.supabase
        .from('refunds')
        .insert({
          id: refundId,
          ...refundData,
        })
        .select()
        .single();

      if (error) {
        logError(error, { action: 'create_refund_record' });
        return null;
      }

      return refund as Refund;
    } catch (error) {
      logError(error as Error, { action: 'create_refund_record' });
      return null;
    }
  }

  private async getPaymentIntent(id: string): Promise<PaymentIntent | null> {
    try {
      const { data: paymentIntent, error } = await this.supabase
        .from('payment_intents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logError(error, { action: 'get_payment_intent', paymentIntentId: id });
        return null;
      }

      return paymentIntent as PaymentIntent;
    } catch (error) {
      logError(error as Error, { action: 'get_payment_intent', paymentIntentId: id });
      return null;
    }
  }
}
