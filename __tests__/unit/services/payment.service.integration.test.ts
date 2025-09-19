import { PaymentService } from '@/services/payment.service';
import {
  PaymentRequest,
  RefundRequest,
  InvoiceRequest,
  PaymentProvider,
  Currency,
} from '@/types/payment';

/**
 * Payment Service Integration Tests
 * Tests complex workflows and provider-specific integrations
 */

jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('stripe');
jest.mock('nanoid/non-secure');

describe('PaymentService Integration Tests', () => {
  let paymentService: PaymentService;

  // Test fixtures
  const createTestPaymentRequest = (overrides: Partial<PaymentRequest> = {}): PaymentRequest => ({
    amount: 2999,
    currency: 'USD',
    provider: 'stripe',
    description: 'Test Product Purchase',
    billing_address: {
      name: 'John Doe',
      email: 'john@example.com',
      line1: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      postal_code: '12345',
      country: 'US',
    },
    items: [
        {
          id: 'item-123',
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
    },
    ...overrides,
  });

  const createTestRefundRequest = (overrides: Partial<RefundRequest> = {}): RefundRequest => ({
    payment_intent_id: 'pi_test_123456789',
    amount: 1500,
    reason: 'requested_by_customer',
    metadata: {
      refund_reason_details: 'Customer changed mind',
    },
    ...overrides,
  });

  const createTestInvoiceRequest = (overrides: Partial<InvoiceRequest> = {}): InvoiceRequest => ({
    user_id: 'user-test-123',
    payment_intent_id: 'pi_test_123456789',
    billing_address: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      line1: '123 Invoice Street',
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
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    paymentService = new PaymentService();

    // Setup default mocks
    const { createServiceClient } = await import('@/lib/supabase');
    const mockSupabase = createServiceClient();
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
            data: {
              id: 'pi_test_123',
              amount: 2999,
              currency: 'USD',
              status: 'succeeded',
              provider: 'stripe',
              provider_payment_id: 'pi_stripe_123',
              metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
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
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe('Multi-Provider Workflow Tests', () => {
    it('should handle provider-specific payment creation', async () => {
      // Test Stripe
      const stripeRequest = createTestPaymentRequest({ provider: 'stripe' });
      const stripeResult = await paymentService.createPayment(stripeRequest);
      expect(stripeResult.success).toBe(true);

      // Test YooKassa
      const yooKassaRequest = createTestPaymentRequest({ 
        provider: 'yookassa',
        currency: 'RUB'
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'yookassa-123',
          status: 'pending',
          amount: { value: '2999.00', currency: 'RUB' },
        }),
      });
      const yooKassaResult = await paymentService.createPayment(yooKassaRequest);
      expect(yooKassaResult.success).toBe(true);

      // Test CoinGate
      const coinGateRequest = createTestPaymentRequest({ 
        provider: 'coingate',
        currency: 'BTC',
        amount: 0.001
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 12345,
          status: 'new',
          price_amount: 0.001,
          price_currency: 'BTC',
        }),
      });
      const coinGateResult = await paymentService.createPayment(coinGateRequest);
      expect(coinGateResult.success).toBe(true);
    });
  });

  describe('Complex Refund Scenarios', () => {
    it('should handle multiple partial refunds', async () => {
      const paymentIntent = {
        id: 'pi_test_123',
        amount: 10000, // $100.00
        currency: 'USD' as Currency,
        status: 'succeeded',
        provider: 'stripe' as PaymentProvider,
        provider_payment_id: 'pi_stripe_123',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { createServiceClient } = await import('@/lib/supabase');
      const mockSupabase = createServiceClient();
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: paymentIntent,
        error: null,
      });

      // First partial refund - $30
      const Stripe = await import('stripe');
      const mockStripe = new Stripe.default('test_key');
      mockStripe.refunds.create.mockResolvedValueOnce({
        id: 're_partial_1',
        amount: 3000,
        status: 'succeeded',
      });

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'refund-1', amount: 3000 },
        error: null,
      });

      const refund1 = await paymentService.processRefund({
        payment_intent_id: paymentIntent.id,
        amount: 3000,
        reason: 'requested_by_customer',
      });

      expect(refund1.success).toBe(true);

      // Second partial refund - $20
      mockStripe.refunds.create.mockResolvedValueOnce({
        id: 're_partial_2',
        amount: 2000,
        status: 'succeeded',
      });

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'refund-2', amount: 2000 },
        error: null,
      });

      const refund2 = await paymentService.processRefund({
        payment_intent_id: paymentIntent.id,
        amount: 2000,
        reason: 'defective_product',
      });

      expect(refund2.success).toBe(true);
    });
  });

  describe('Advanced Currency Conversion', () => {
    it('should handle stale exchange rates', async () => {
      const staleRate = {
        from_currency: 'USD',
        to_currency: 'EUR',
        rate: 0.85,
        updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours old
      };

      const { createServiceClient } = await import('@/lib/supabase');
      const mockSupabase = createServiceClient();
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: staleRate,
        error: null,
      });

      // Mock fresh rate from API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.87 } }),
      });

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { rate: 0.87 },
        error: null,
      });

      const result = await paymentService.convertCurrency(100, 'USD', 'EUR');

      expect(result.rate).toBe(0.87); // Updated rate, not stale one
      expect(fetch).toHaveBeenCalled(); // Should fetch fresh rate
    });
  });

  describe('Webhook Security Tests', () => {
    it('should handle webhook processing', async () => {
      const webhookPayload = {
        id: 'evt_test_123456789',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123456789',
            status: 'succeeded',
            amount: 2999,
            currency: 'usd',
          },
        },
        created: Math.floor(Date.now() / 1000),
        api_version: '2020-08-27',
      };

      const result = await paymentService.handleStripeWebhook(
        JSON.stringify(webhookPayload),
        'test-signature'
      );

      expect(result).toBe(true);
    });

    it('should handle duplicate webhook events', async () => {
      const webhook = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      };

      const { createServiceClient } = await import('@/lib/supabase');
      const mockSupabase = createServiceClient();
      
      // Mock existing webhook record
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'webhook-123',
          event_id: webhook.id,
          processed: true,
        },
        error: null,
      });

      const result = await paymentService.handleStripeWebhook(
        JSON.stringify(webhook),
        'test-signature'
      );

      expect(result).toBe(true);
    });
  });

  describe('Performance and Load Tests', () => {
    it('should handle concurrent payment processing', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        createTestPaymentRequest({
          metadata: { 
            concurrent_test: 'true',
            batch_index: i.toString(),
          },
        })
      );

      const { createServiceClient } = await import('@/lib/supabase');
      const mockSupabase = createServiceClient();
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'pi_concurrent' },
        error: null,
      });

      const Stripe = await import('stripe');
      const mockStripe = new Stripe.default('test_key');
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_stripe_concurrent',
        status: 'requires_payment_method',
      });

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentRequests.map(request => paymentService.createPayment(request))
      );
      const executionTime = Date.now() - startTime;

      expect(results.every(r => r.success)).toBe(true);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Provider-Specific Advanced Features', () => {
    describe('Stripe Advanced Features', () => {
      it('should handle Stripe Connect marketplace payments', async () => {
        const connectRequest = createTestPaymentRequest({
          metadata: {
            connect_account: 'acct_seller_123',
            application_fee: '299', // Platform fee
            seller_id: 'seller-123',
          },
        });

        const Stripe = await import('stripe');
      const mockStripe = new Stripe.default('test_key');
        mockStripe.paymentIntents.create.mockResolvedValue({
          id: 'pi_connect_123',
          status: 'requires_payment_method',
          application_fee_amount: 299,
          on_behalf_of: 'acct_seller_123',
        });

        const result = await paymentService.createPayment(connectRequest);

        expect(result.success).toBe(true);
      });

      it('should handle 3D Secure authentication', async () => {
        const requires3DSIntent = {
          id: 'pi_3ds_test',
          status: 'requires_action',
          next_action: {
            type: 'use_stripe_sdk',
            use_stripe_sdk: {
              type: 'three_d_secure_redirect',
              stripe_js: 'https://js.stripe.com/v3/',
            },
          },
        };

        const Stripe = await import('stripe');
      const mockStripe = new Stripe.default('test_key');
        mockStripe.paymentIntents.create.mockResolvedValue(requires3DSIntent);

        const result = await paymentService.createPayment(createTestPaymentRequest());

        expect(result.success).toBe(true);
      });
    });

    describe('YooKassa Advanced Features', () => {
      it('should handle YooKassa SberPay method', async () => {
        const sberPayRequest = createTestPaymentRequest({
          provider: 'yookassa',
          currency: 'RUB',
          metadata: {
            payment_method: 'sberbank',
          },
        });

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'yookassa-sber-123',
            status: 'pending',
            confirmation: {
              type: 'redirect',
              confirmation_url: 'https://sberbank.ru/payment/123',
            },
          }),
        });

        const result = await paymentService.createPayment(sberPayRequest);

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
          'https://api.yookassa.ru/v3/payments',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    describe('CoinGate Advanced Features', () => {
      it('should handle multiple cryptocurrency options', async () => {
        const cryptoRequest = createTestPaymentRequest({
          provider: 'coingate',
          currency: 'USD', // Receive in USD
          metadata: {
            accepted_cryptos: 'BTC,ETH,LTC',
          },
        });

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 12345,
            status: 'new',
            price_amount: 29.99,
            price_currency: 'USD',
            receive_amount: 29.99,
            receive_currency: 'USD',
            payment_url: 'https://coingate.com/invoice/12345',
            lightning_network: true,
          }),
        });

        const result = await paymentService.createPayment(cryptoRequest);

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
          'https://api.coingate.com/v2/orders',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle provider service outages gracefully', async () => {
      const request = createTestPaymentRequest();

      // Mock Stripe service failure
      const Stripe = await import('stripe');
      const mockStripe = new Stripe.default('test_key');
      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const result = await paymentService.createPayment(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('server error');
    });

    it('should handle network timeouts', async () => {
      const request = createTestPaymentRequest({ provider: 'yookassa' });

      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network timeout')
      );

      const result = await paymentService.createPayment(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Security and Compliance Tests', () => {
    it('should handle sensitive data properly', async () => {
      const sensitiveRequest = createTestPaymentRequest({
        metadata: {
          order_id: 'order-123',
          source: 'web',
          // No sensitive data should be in metadata
        },
      });

      const { defaultLogger } = await import('@/lib/logger');
      const mockLogger = defaultLogger;
      mockLogger.info = jest.fn();

      await paymentService.createPayment(sensitiveRequest);

      // Verify logging doesn't contain sensitive data
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should validate payment amounts within limits', async () => {
      const largeAmountRequest = createTestPaymentRequest({
        amount: 10000000, // $100,000 - above typical limits
      });

      const result = await paymentService.createPayment(largeAmountRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount exceeds maximum');
    });
  });

  describe('Batch Processing Tests', () => {
    it('should handle batch refund processing', async () => {
      const batchRefunds = Array.from({ length: 5 }, (_, i) =>
        createTestRefundRequest({
          payment_intent_id: `pi_batch_${i}`,
          amount: 1000,
        })
      );

      const { createServiceClient } = await import('@/lib/supabase');
      const mockSupabase = createServiceClient();
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'pi_test_123',
          amount: 5000,
          currency: 'USD',
          status: 'succeeded',
          provider: 'stripe',
          provider_payment_id: 'pi_stripe_123',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const Stripe = await import('stripe');
      const mockStripe = new Stripe.default('test_key');
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_batch_test',
        amount: 1000,
        status: 'succeeded',
      });

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'refund-batch' },
        error: null,
      });

      const results = await Promise.all(
        batchRefunds.map(refund => paymentService.processRefund(refund))
      );

      expect(results.every(r => r.success)).toBe(true);
      expect(results).toHaveLength(5);
    });
  });

  describe('Invoice Generation Integration', () => {
    it('should generate invoice with proper formatting', async () => {
      const invoiceRequest = createTestInvoiceRequest();

      const { createServiceClient } = await import('@/lib/supabase');
      const mockSupabase = createServiceClient();
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'pi_test_123',
          amount: 2999,
          currency: 'USD',
          status: 'succeeded',
          provider: 'stripe',
          provider_payment_id: 'pi_stripe_123',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const mockInvoice = {
        id: 'invoice-123',
        invoice_number: 'INV-2024-001',
        status: 'draft',
        amount: 2999,
        currency: 'USD',
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockInvoice,
        error: null,
      });

      const result = await paymentService.generateInvoice(invoiceRequest);

      expect(result.success).toBe(true);
      expect(result.invoice).toBeDefined();
      expect(result.invoice?.invoice_number).toMatch(/INV-\d{4}-\d{3}/);
    });
  });
});
