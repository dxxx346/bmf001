/**
 * Payment Service Test Utilities
 * Helper functions and utilities for payment service testing
 */

import { 
  PaymentRequest, 
  PaymentIntent, 
  PaymentMethod, 
  RefundRequest,
  InvoiceRequest,
  WebhookEvent,
  PaymentProvider,
  Currency,
} from '@/types/payment';

/**
 * Mock data generators
 */
export class PaymentMockFactory {
  static createPaymentRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
    return {
      amount: 2999,
      currency: 'USD',
      provider: 'stripe',
      description: 'Test Product Purchase',
      billing_address: {
        name: 'John Doe',
        email: 'john@example.com',
        line1: '123 Test Street',
        line2: 'Apt 4B',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US',
      },
      items: [
        {
          id: 'item-test-123',
          description: 'Test Digital Product',
          quantity: 1,
          unit_price: 2999,
          total_price: 2999,
          tax_rate: 0,
          tax_amount: 0,
        },
      ],
      metadata: {
        order_id: 'order-test-123',
        source: 'web',
        test_mode: 'true',
      },
      ...overrides,
    };
  }

  static createPaymentIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
    return {
      id: 'pi_test_123456789',
      amount: 2999,
      currency: 'USD',
      status: 'pending',
      provider: 'stripe',
      provider_payment_id: 'pi_stripe_123456789',
      metadata: {
        order_id: 'order-test-123',
        test_mode: 'true',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  static createPaymentMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
    return {
      id: 'pm_test_123456789',
      user_id: 'user-test-123',
      provider: 'stripe',
      type: 'card',
      provider_method_id: 'pm_stripe_123456789',
      is_default: false,
      is_active: true,
      last_four: '4242',
      brand: 'visa',
      expiry_month: 12,
      expiry_year: 2025,
      metadata: {
        country: 'US',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  static createRefundRequest(overrides: Partial<RefundRequest> = {}): RefundRequest {
    return {
      payment_intent_id: 'pi_test_123456789',
      amount: 1500, // Partial refund
      reason: 'requested_by_customer',
      metadata: {
        refund_reason_details: 'Customer changed mind',
        initiated_by: 'admin-user-123',
      },
      ...overrides,
    };
  }

  static createInvoiceRequest(overrides: Partial<InvoiceRequest> = {}): InvoiceRequest {
    return {
      user_id: 'user-test-123',
      payment_intent_id: 'pi_test_123456789',
      billing_address: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        line1: '123 Invoice Street',
        line2: 'Suite 100',
        city: 'Invoice City',
        state: 'IC',
        postal_code: '54321',
        country: 'US',
      },
      items: [
        {
          id: 'item-123',
          description: 'Premium Digital Product',
          quantity: 1,
          unit_price: 2999,
          total_price: 2999,
          tax_rate: 0.08,
          tax_amount: 240,
        },
      ],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      tax_rate: 0.08,
      ...overrides,
    };
  }

  static createWebhookEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
    return {
      id: 'evt_test_123456789',
      provider: 'stripe',
      event_type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123456789',
          status: 'succeeded',
          amount: 2999,
          currency: 'usd',
        },
      },
      processed: false,
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Generate test data for specific providers
   */
  static createStripeTestData() {
    return {
      paymentIntent: {
        id: 'pi_stripe_test_123',
        amount: 2999,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_stripe_test_123_secret_456',
        payment_method_types: ['card'],
        metadata: {
          order_id: 'order-stripe-123',
        },
      },
      paymentMethod: {
        id: 'pm_stripe_test_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
          country: 'US',
        },
        billing_details: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      refund: {
        id: 're_stripe_test_123',
        amount: 1500,
        currency: 'usd',
        status: 'succeeded',
        charge: 'ch_stripe_test_123',
        reason: 'requested_by_customer',
      },
    };
  }

  static createYooKassaTestData() {
    return {
      payment: {
        id: 'yookassa-payment-test-123',
        status: 'pending',
        amount: {
          value: '29.99',
          currency: 'USD',
        },
        confirmation: {
          type: 'redirect',
          confirmation_url: 'https://yookassa.ru/checkout/payments/yookassa-payment-test-123',
        },
        metadata: {
          order_id: 'order-yookassa-123',
        },
      },
      refund: {
        id: 'yookassa-refund-test-123',
        status: 'succeeded',
        amount: {
          value: '15.00',
          currency: 'USD',
        },
        payment_id: 'yookassa-payment-test-123',
      },
    };
  }

  static createCoinGateTestData() {
    return {
      order: {
        id: 12345,
        status: 'new',
        price_amount: 0.001,
        price_currency: 'BTC',
        receive_amount: 29.99,
        receive_currency: 'USD',
        payment_url: 'https://coingate.com/invoice/12345',
        token: 'coingate-token-test-123',
        lightning_network: true,
      },
      callback: {
        id: 12345,
        status: 'paid',
        price_amount: 0.001,
        price_currency: 'BTC',
        receive_amount: 29.99,
        receive_currency: 'USD',
        paid_amount: 0.001,
        paid_currency: 'BTC',
      },
    };
  }
}

/**
 * Mock setup utilities
 */
export class PaymentMockSetup {
  static setupSuccessfulStripeFlow() {
    const mockStripe = await import('stripe');
    
    mockStripe.paymentIntents.create.mockResolvedValue(
      PaymentMockFactory.createStripeTestData().paymentIntent
    );
    
    mockStripe.paymentIntents.confirm.mockResolvedValue({
      ...PaymentMockFactory.createStripeTestData().paymentIntent,
      status: 'succeeded',
    });
    
    mockStripe.refunds.create.mockResolvedValue(
      PaymentMockFactory.createStripeTestData().refund
    );
    
    mockStripe.webhooks.constructEvent.mockReturnValue(
      PaymentMockFactory.createWebhookEvent()
    );
  }

  static setupSuccessfulYooKassaFlow() {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(PaymentMockFactory.createYooKassaTestData().payment),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(PaymentMockFactory.createYooKassaTestData().refund),
      });
  }

  static setupSuccessfulCoinGateFlow() {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(PaymentMockFactory.createCoinGateTestData().order),
      });
  }

  static setupDatabaseMocks() {
    const { createServiceClient } = await import('@/lib/supabase');
    const mockSupabase = createServiceClient();
    
    // Default successful database operations
    mockSupabase.from.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { id: 'test-record-123' },
            error: null,
          }),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: PaymentMockFactory.createPaymentIntent(),
            error: null,
          }),
        })),
        order: jest.fn(() => ({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { updated: true },
              error: null,
            }),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      })),
    });

    return mockSupabase;
  }

  static setupFailureScenarios() {
    const mockStripe = await import('stripe');
    
    // Network errors
    mockStripe.paymentIntents.create.mockRejectedValueOnce(
      new Error('Network timeout')
    );
    
    // Card errors
    const cardError = new Error('Your card was declined.');
    (cardError as any).type = 'card_error';
    (cardError as any).code = 'card_declined';
    mockStripe.paymentIntents.create.mockRejectedValueOnce(cardError);
    
    // Rate limit errors
    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).status = 429;
    mockStripe.paymentIntents.create.mockRejectedValueOnce(rateLimitError);
  }
}

/**
 * Test assertion helpers
 */
export class PaymentTestAssertions {
  static assertSuccessfulPaymentResponse(response: any) {
    expect(response.success).toBe(true);
    expect(response.payment_intent).toBeDefined();
    expect(response.payment_intent.id).toMatch(/^pi_/);
    expect(response.error).toBeUndefined();
  }

  static assertFailedPaymentResponse(response: any, expectedError?: string) {
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    if (expectedError) {
      expect(response.error).toContain(expectedError);
    }
    expect(response.payment_intent).toBeUndefined();
  }

  static assertValidRefundResponse(response: any, expectedAmount?: number) {
    expect(response.success).toBe(true);
    expect(response.refund).toBeDefined();
    expect(response.refund.id).toBeDefined();
    if (expectedAmount) {
      expect(response.refund.amount).toBe(expectedAmount);
    }
  }

  static assertValidInvoiceResponse(response: any) {
    expect(response.success).toBe(true);
    expect(response.invoice).toBeDefined();
    expect(response.invoice.invoice_number).toMatch(/^INV-\d{4}-\d{3,}$/);
    expect(response.invoice.status).toBeDefined();
  }

  static assertValidWebhookVerification(result: any) {
    expect(result.valid).toBe(true);
    expect(result.event).toBeDefined();
    expect(result.event.type).toBeDefined();
    expect(result.error).toBeUndefined();
  }

  static assertProviderSpecificFields(response: any, provider: PaymentProvider) {
    switch (provider) {
      case 'stripe':
        expect(response.payment_data?.client_secret).toBeDefined();
        break;
      case 'yookassa':
        expect(response.payment_data?.confirmation_url).toBeDefined();
        break;
      case 'coingate':
        expect(response.payment_data?.payment_url).toBeDefined();
        break;
    }
  }
}

/**
 * Test data validation helpers
 */
export class PaymentTestValidators {
  static isValidPaymentAmount(amount: number): boolean {
    return amount > 0 && amount <= 999999999; // Max $9,999,999.99
  }

  static isValidCurrency(currency: string): boolean {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'RUB', 'BTC', 'ETH'];
    return validCurrencies.includes(currency);
  }

  static isValidPaymentMethodType(type: string): boolean {
    const validTypes = ['card', 'bank_transfer', 'crypto', 'sberbank', 'qiwi'];
    return validTypes.includes(type);
  }

  static isValidWebhookSignature(signature: string, provider: PaymentProvider): boolean {
    switch (provider) {
      case 'stripe':
        return signature.startsWith('t=') && signature.includes(',v1=');
      case 'yookassa':
        return signature.length > 10; // Basic validation
      case 'coingate':
        return signature.length > 10; // Basic validation
      default:
        return false;
    }
  }
}

/**
 * Performance testing utilities
 */
export class PaymentPerformanceHelpers {
  static async measureExecutionTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();
    const result = await operation();
    const executionTime = Date.now() - startTime;
    
    return { result, executionTime };
  }

  static async runConcurrentOperations<T>(
    operations: Array<() => Promise<T>>,
    maxConcurrency: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }

  static generateLoadTestData(count: number): PaymentRequest[] {
    return Array.from({ length: count }, (_, i) =>
      PaymentMockFactory.createPaymentRequest({
        metadata: {
          load_test: 'true',
          batch_index: i.toString(),
          timestamp: Date.now().toString(),
        },
      })
    );
  }
}

/**
 * Error simulation utilities
 */
export class PaymentErrorSimulator {
  static simulateNetworkError(): Error {
    const error = new Error('Network request failed');
    (error as any).code = 'NETWORK_ERROR';
    return error;
  }

  static simulateRateLimitError(): Error {
    const error = new Error('Rate limit exceeded');
    (error as any).status = 429;
    (error as any).code = 'RATE_LIMIT_EXCEEDED';
    return error;
  }

  static simulateCardDeclinedError(): Error {
    const error = new Error('Your card was declined.');
    (error as any).type = 'card_error';
    (error as any).code = 'card_declined';
    (error as any).decline_code = 'generic_decline';
    return error;
  }

  static simulateInsufficientFundsError(): Error {
    const error = new Error('Your card has insufficient funds.');
    (error as any).type = 'card_error';
    (error as any).code = 'card_declined';
    (error as any).decline_code = 'insufficient_funds';
    return error;
  }

  static simulateExpiredCardError(): Error {
    const error = new Error('Your card has expired.');
    (error as any).type = 'card_error';
    (error as any).code = 'expired_card';
    return error;
  }

  static simulateInvalidCvcError(): Error {
    const error = new Error('Your card\'s security code is incorrect.');
    (error as any).type = 'card_error';
    (error as any).code = 'incorrect_cvc';
    return error;
  }

  static simulateProviderServiceError(provider: PaymentProvider): Error {
    const errors = {
      stripe: new Error('Stripe service temporarily unavailable'),
      yookassa: new Error('YooKassa API is down for maintenance'),
      coingate: new Error('CoinGate service error'),
    };
    
    const error = errors[provider];
    (error as any).provider = provider;
    (error as any).code = 'SERVICE_UNAVAILABLE';
    return error;
  }
}

/**
 * Test environment setup
 */
export class PaymentTestEnvironment {
  static setupTestEnvironment() {
    // Set test environment variables
    Object.assign(process.env, {
      NODE_ENV: 'test',
      STRIPE_SECRET_KEY: 'sk_test_123456789',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      YOOKASSA_SHOP_ID: 'test-shop-123',
      YOOKASSA_SECRET_KEY: 'test-secret-key',
      COINGATE_API_TOKEN: 'test-coingate-token',
      COINGATE_WEBHOOK_SECRET: 'test-coingate-webhook-secret',
    });
  }

  static cleanupTestEnvironment() {
    // Clean up test data
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.YOOKASSA_SHOP_ID;
    delete process.env.COINGATE_API_TOKEN;
  }

  static mockExternalAPIs() {
    // Mock exchange rate API
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('exchangerate-api.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            result: 'success',
            base_code: 'USD',
            rates: {
              EUR: 0.85,
              GBP: 0.73,
              RUB: 75.5,
              JPY: 150,
            },
          }),
        });
      }
      
      if (url.includes('yookassa.ru')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(PaymentMockFactory.createYooKassaTestData().payment),
        });
      }
      
      if (url.includes('coingate.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(PaymentMockFactory.createCoinGateTestData().order),
        });
      }
      
      return Promise.reject(new Error('Unmocked API call'));
    });
  }
}

/**
 * Test coverage utilities
 */
export class PaymentTestCoverage {
  static getRequiredTestScenarios(): string[] {
    return [
      // Payment creation
      'successful_stripe_payment',
      'successful_yookassa_payment', 
      'successful_coingate_payment',
      'failed_payment_card_declined',
      'failed_payment_network_error',
      'failed_payment_invalid_amount',
      
      // Refund processing
      'successful_full_refund',
      'successful_partial_refund',
      'failed_refund_already_refunded',
      'failed_refund_insufficient_balance',
      
      // Webhook processing
      'valid_stripe_webhook',
      'valid_yookassa_webhook',
      'valid_coingate_webhook',
      'invalid_webhook_signature',
      'duplicate_webhook_event',
      
      // Currency conversion
      'same_currency_conversion',
      'different_currency_conversion',
      'failed_exchange_rate_fetch',
      'stale_exchange_rate_refresh',
      
      // Idempotency
      'duplicate_idempotency_key',
      'expired_idempotency_key',
      'new_idempotency_key',
      
      // Payment methods
      'create_payment_method',
      'list_payment_methods',
      'delete_payment_method',
      'invalid_payment_method_data',
      
      // Invoice generation
      'successful_invoice_generation',
      'failed_invoice_missing_payment',
      'unique_invoice_numbers',
      
      // Error handling
      'retry_on_network_error',
      'no_retry_on_card_error',
      'exponential_backoff',
      'max_retry_limit',
      
      // Edge cases
      'zero_amount_payment',
      'negative_amount_payment',
      'concurrent_payments',
      'provider_failover',
      'batch_processing',
    ];
  }

  static validateTestCoverage(executedTests: string[]): {
    coverage: number;
    missing: string[];
    extra: string[];
  } {
    const required = this.getRequiredTestScenarios();
    const missing = required.filter(test => !executedTests.includes(test));
    const extra = executedTests.filter(test => !required.includes(test));
    const coverage = ((required.length - missing.length) / required.length) * 100;
    
    return { coverage, missing, extra };
  }
}

const PaymentTestHelpers = {
  PaymentMockFactory,
  PaymentMockSetup,
  PaymentTestAssertions,
  PaymentTestValidators,
  PaymentPerformanceHelpers,
  PaymentErrorSimulator,
  PaymentTestEnvironment,
  PaymentTestCoverage,
};

export default PaymentTestHelpers;
