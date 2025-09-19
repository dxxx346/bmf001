import { PaymentService } from '@/services/payment.service';
import { createServiceClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import {
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
  InvoiceRequest,
  PaymentMethodRequest,
  ExchangeRateRequest,
  WebhookEvent,
  PaymentProvider,
  PaymentStatus,
  Currency,
  PaymentIntent,
  PaymentMethod,
  Refund,
  Invoice,
} from '@/types/payment';

/**
 * Fixed Payment Service Unit Tests
 * Comprehensive tests with correct type definitions
 */

// Mock external dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('stripe');
jest.mock('nanoid/non-secure');

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  paymentMethods: {
    create: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    list: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
};

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
      order: jest.fn(() => ({
        limit: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

// Mock external API calls
global.fetch = jest.fn();

describe('PaymentService - Fixed Tests', () => {
  let paymentService: PaymentService;
  let mockNanoid: jest.Mock;

  // Define test data with correct types
  const mockPaymentIntent: PaymentIntent = {
    id: 'pi_test_123',
    amount: 2999,
    currency: 'USD',
    status: 'succeeded',
    provider: 'stripe',
    provider_payment_id: 'pi_stripe_123',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockPaymentRequest: PaymentRequest = {
    amount: 2999,
    currency: 'USD',
    provider: 'stripe',
    description: 'Test Product Purchase',
    billing_address: {
      name: 'John Doe',
      email: 'john@example.com',
      line1: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postal_code: '12345',
      country: 'US',
    },
    items: [
      {
        id: 'item-123',
        description: 'Test Product',
        quantity: 1,
        unit_price: 2999,
        total_price: 2999,
        tax_rate: 0,
        tax_amount: 0,
      },
    ],
    metadata: {
      order_id: 'order-123',
      source: 'web',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup mocks
    (createServiceClient as jest.Mock).mockReturnValue(mockSupabase);
    const { nanoid } = await import('nanoid/non-secure');
    mockNanoid = nanoid as jest.Mock;
    mockNanoid.mockReturnValue('test-id-12345');
    
    // Mock Stripe constructor
    jest.doMock('stripe', () => {
      return jest.fn().mockImplementation(() => mockStripe);
    });

    paymentService = new PaymentService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Payment Creation', () => {
    describe('Stripe Integration', () => {
      beforeEach(() => {
        mockPaymentRequest.provider = 'stripe';
      });

      it('should create payment intent successfully', async () => {
        // Mock successful payment intent creation
        const mockPaymentIntent = {
          id: 'pi_test_123',
          amount: 2999,
          currency: 'usd',
          status: 'requires_payment_method',
          client_secret: 'pi_test_123_secret',
        };

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: {
            id: 'payment-intent-123',
            amount: 2999,
            currency: 'USD',
            status: 'pending',
            provider: 'stripe',
            provider_payment_id: 'pi_test_123',
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        });

        mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

        const result = await paymentService.createPayment(mockPaymentRequest);

        expect(result.success).toBe(true);
        expect(result.payment_intent).toBeDefined();
        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
          amount: 2999,
          currency: 'usd',
          payment_method_types: ['card'],
          metadata: expect.objectContaining({
            order_id: 'order-123',
          }),
        });
      });

      it('should handle Stripe API errors', async () => {
        mockStripe.paymentIntents.create.mockRejectedValue(
          new Error('Your card was declined.')
        );

        const result = await paymentService.createPayment(mockPaymentRequest);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Payment creation failed');
        expect(logError).toHaveBeenCalled();
      });

      it('should handle invalid card errors', async () => {
        const stripeError = new Error('Your card number is invalid.');
        (stripeError as any).type = 'card_error';
        (stripeError as any).code = 'card_declined';

        mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

        const result = await paymentService.createPayment(mockPaymentRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('YooKassa Integration', () => {
      beforeEach(() => {
        mockPaymentRequest.provider = 'yookassa';
        mockPaymentRequest.currency = 'RUB';
      });

      it('should create YooKassa payment successfully', async () => {
        const mockYooKassaResponse = {
          id: 'yookassa-payment-123',
          status: 'pending',
          amount: { value: '2999.00', currency: 'RUB' },
          confirmation: {
            type: 'redirect',
            confirmation_url: 'https://yookassa.ru/checkout/payments/yookassa-payment-123',
          },
        };

        (fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockYooKassaResponse),
        });

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: {
            id: 'payment-intent-123',
            provider_payment_id: 'yookassa-payment-123',
            status: 'pending',
          },
          error: null,
        });

        const result = await paymentService.createPayment(mockPaymentRequest);

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
          'https://api.yookassa.ru/v3/payments',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Idempotence-Key': expect.any(String),
            }),
          })
        );
      });

      it('should handle YooKassa API errors', async () => {
        (fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            type: 'error',
            code: 'invalid_request',
            description: 'Invalid payment data',
          }),
        });

        const result = await paymentService.createPayment(mockPaymentRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('CoinGate Integration', () => {
      beforeEach(() => {
        mockPaymentRequest.provider = 'coingate';
        mockPaymentRequest.currency = 'BTC';
      });

      it('should create CoinGate payment successfully', async () => {
        const mockCoinGateResponse = {
          id: 12345,
          status: 'new',
          price_amount: 0.001,
          price_currency: 'BTC',
          receive_amount: 29.99,
          receive_currency: 'USD',
          payment_url: 'https://coingate.com/invoice/12345',
          token: 'coingate-token-123',
        };

        (fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockCoinGateResponse),
        });

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: {
            id: 'payment-intent-123',
            provider_payment_id: '12345',
            status: 'pending',
          },
          error: null,
        });

        const result = await paymentService.createPayment(mockPaymentRequest);

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
          'https://api.coingate.com/v2/orders',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': expect.stringContaining('Token'),
            }),
          })
        );
      });
    });
  });

  describe('Refund Processing', () => {
    const mockRefundRequest: RefundRequest = {
      payment_intent_id: 'pi_test_123',
      amount: 1500, // Partial refund
      reason: 'requested_by_customer',
      metadata: {
        reason_details: 'Customer not satisfied',
      },
    };

    describe('Stripe Refunds', () => {
      it('should process full refund successfully', async () => {
        const fullRefundRequest = { ...mockRefundRequest, amount: undefined }; // Full refund

        // Mock getting payment intent
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockPaymentIntent,
          error: null,
        });

        // Mock Stripe refund creation
        const mockRefund = {
          id: 're_test_123',
          amount: 2999,
          currency: 'usd',
          status: 'succeeded',
          charge: 'ch_test_123',
        };
        mockStripe.refunds.create.mockResolvedValue(mockRefund);

        // Mock refund record creation
        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: {
            id: 'refund-123',
            amount: mockRefund.amount,
            currency: 'USD',
            status: 'succeeded',
            provider: 'stripe',
            provider_refund_id: mockRefund.id,
            payment_intent_id: 'pi_test_123',
            reason: 'requested_by_customer',
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        });

        // Mock payment status update
        mockSupabase.from().update().eq().select().single.mockResolvedValue({
          data: { ...mockPaymentIntent, status: 'refunded' },
          error: null,
        });

        const result = await paymentService.processRefund(fullRefundRequest);

        expect(result.success).toBe(true);
        expect(result.refund).toBeDefined();
        expect(mockStripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_stripe_123',
          amount: 2999, // Full amount
          reason: 'requested_by_customer',
          metadata: expect.any(Object),
        });
      });

      it('should process partial refund successfully', async () => {
        // Mock getting payment intent
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockPaymentIntent,
          error: null,
        });

        // Mock Stripe partial refund
        const mockPartialRefund = {
          id: 're_test_123',
          amount: 1500,
          currency: 'usd',
          status: 'succeeded',
          charge: 'ch_test_123',
        };
        mockStripe.refunds.create.mockResolvedValue(mockPartialRefund);

        // Mock refund record creation
        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: {
            id: 'refund-123',
            amount: mockPartialRefund.amount,
            currency: 'USD',
            status: 'succeeded',
            provider: 'stripe',
            provider_refund_id: mockPartialRefund.id,
            payment_intent_id: 'pi_test_123',
            reason: 'requested_by_customer',
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        });

        const result = await paymentService.processRefund(mockRefundRequest);

        expect(result.success).toBe(true);
        expect(mockStripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_stripe_123',
          amount: 1500, // Partial amount
          reason: 'requested_by_customer',
          metadata: expect.any(Object),
        });
      });
    });
  });

  describe('Webhook Processing', () => {
    describe('Stripe Webhooks', () => {
      const mockStripeWebhookEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            amount: 2999,
            currency: 'usd',
          },
        },
        created: Date.now() / 1000,
        api_version: '2020-08-27',
      };

      it('should handle Stripe webhook successfully', async () => {
        const payload = JSON.stringify(mockStripeWebhookEvent);
        const signature = 'stripe-signature-123';

        mockStripe.webhooks.constructEvent.mockReturnValue(mockStripeWebhookEvent);

        const result = await paymentService.handleStripeWebhook(payload, signature);

        expect(result).toBe(true);
        expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
          payload,
          signature,
          expect.any(String)
        );
      });

      it('should reject invalid Stripe webhook signature', async () => {
        mockStripe.webhooks.constructEvent.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        const result = await paymentService.handleStripeWebhook(
          'invalid-payload',
          'invalid-signature'
        );

        expect(result).toBe(false);
      });
    });

    describe('YooKassa Webhooks', () => {
      it('should handle YooKassa webhook successfully', async () => {
        const payload = { type: 'payment.succeeded' };

        const result = await paymentService.handleYooKassaWebhook(payload);

        expect(result).toBe(true);
      });
    });

    describe('CoinGate Webhooks', () => {
      it('should handle CoinGate webhook successfully', async () => {
        const payload = { status: 'paid' };

        const result = await paymentService.handleCoinGateWebhook(payload);

        expect(result).toBe(true);
      });
    });
  });

  describe('Currency Conversion', () => {
    it('should return same currency without conversion', async () => {
      const result = await paymentService.convertCurrency(100, 'USD', 'USD');

      expect(result.amount).toBe(100);
      expect(result.currency).toBe('USD');
      expect(result.rate).toBe(1);
    });

    it('should convert between different currencies', async () => {
      // Mock exchange rate
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          from_currency: 'USD',
          to_currency: 'EUR',
          rate: 0.85,
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await paymentService.convertCurrency(100, 'USD', 'EUR');

      expect(result.amount).toBe(85); // 100 * 0.85
      expect(result.currency).toBe('EUR');
      expect(result.rate).toBe(0.85);
    });

    it('should handle conversion errors', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      await expect(
        paymentService.convertCurrency(100, 'USD', 'EUR')
      ).rejects.toThrow('Exchange rate not found');
    });
  });

  describe('Invoice Generation', () => {
    const mockInvoiceRequest: InvoiceRequest = {
      user_id: 'user-123',
      payment_intent_id: 'pi_test_123',
      billing_address: {
        name: 'John Doe',
        email: 'john@example.com',
        line1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US',
      },
      items: [
        {
          id: 'item-123',
          description: 'Test Product',
          quantity: 1,
          unit_price: 2999,
          total_price: 2999,
          tax_rate: 0,
          tax_amount: 0,
        },
      ],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    it('should generate invoice successfully', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockPaymentIntent,
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

      const result = await paymentService.generateInvoice(mockInvoiceRequest);

      expect(result.success).toBe(true);
      expect(result.invoice).toBeDefined();
      expect(result.invoice?.invoice_number).toMatch(/INV-\d{4}-\d{3}/);
    });

    it('should handle invoice generation errors', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Payment intent not found' },
      });

      const result = await paymentService.generateInvoice(mockInvoiceRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment intent not found');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle zero amount payments', async () => {
      const zeroAmountRequest = {
        ...mockPaymentRequest,
        amount: 0,
      };

      const result = await paymentService.createPayment(zeroAmountRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });

    it('should handle negative amounts', async () => {
      const negativeAmountRequest = {
        ...mockPaymentRequest,
        amount: -100,
      };

      const result = await paymentService.createPayment(negativeAmountRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });

    it('should handle database connection failures', async () => {
      mockSupabase.from().insert().select().single.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await paymentService.createPayment(mockPaymentRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('server error');
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete payment workflow', async () => {
      // 1. Create payment
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'pi_integration_test',
          status: 'requires_payment_method',
        },
        error: null,
      });

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_stripe_integration',
        status: 'requires_payment_method',
        client_secret: 'pi_secret_123',
      });

      const createResult = await paymentService.createPayment(mockPaymentRequest);
      expect(createResult.success).toBe(true);

      // 2. Process webhook
      const webhookPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123', status: 'succeeded' } },
      });

      const webhookResult = await paymentService.handleStripeWebhook(
        webhookPayload,
        'test-signature'
      );
      expect(webhookResult).toBe(true);

      // 3. Process refund
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          ...mockPaymentIntent,
          id: 'pi_integration_test',
          status: 'succeeded',
        },
        error: null,
      });

      mockStripe.refunds.create.mockResolvedValue({
        id: 're_integration_test',
        amount: 1000,
        status: 'succeeded',
      });

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'refund-123' },
        error: null,
      });

      const refundResult = await paymentService.processRefund({
        payment_intent_id: 'pi_integration_test',
        amount: 1000,
        reason: 'requested_by_customer',
      });

      expect(refundResult.success).toBe(true);
    });
  });
});
