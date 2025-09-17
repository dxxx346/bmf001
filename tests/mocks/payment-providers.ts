import { PaymentIntent, PaymentResponse, RefundResponse } from '@/types/payment'

export class MockStripeProvider {
  private static instance: MockStripeProvider
  private paymentIntents: Map<string, any> = new Map()
  private customers: Map<string, any> = new Map()

  static getInstance(): MockStripeProvider {
    if (!MockStripeProvider.instance) {
      MockStripeProvider.instance = new MockStripeProvider()
    }
    return MockStripeProvider.instance
  }

  reset(): void {
    this.paymentIntents.clear()
    this.customers.clear()
  }

  // Mock Stripe SDK
  createMockStripe() {
    return {
      paymentIntents: {
        create: jest.fn().mockImplementation(async (params) => {
          const id = `pi_mock_${Date.now()}`
          const paymentIntent = {
            id,
            amount: params.amount,
            currency: params.currency,
            status: 'requires_payment_method',
            client_secret: `${id}_secret`,
            metadata: params.metadata || {},
            created: Math.floor(Date.now() / 1000),
          }
          this.paymentIntents.set(id, paymentIntent)
          return paymentIntent
        }),

        retrieve: jest.fn().mockImplementation(async (id) => {
          const paymentIntent = this.paymentIntents.get(id)
          if (!paymentIntent) {
            throw new Error('No such payment intent')
          }
          return paymentIntent
        }),

        confirm: jest.fn().mockImplementation(async (id, params) => {
          const paymentIntent = this.paymentIntents.get(id)
          if (!paymentIntent) {
            throw new Error('No such payment intent')
          }
          
          // Simulate success/failure based on amount
          const shouldFail = paymentIntent.amount === 666 // Test amount for failures
          
          paymentIntent.status = shouldFail ? 'failed' : 'succeeded'
          this.paymentIntents.set(id, paymentIntent)
          return paymentIntent
        }),

        cancel: jest.fn().mockImplementation(async (id) => {
          const paymentIntent = this.paymentIntents.get(id)
          if (!paymentIntent) {
            throw new Error('No such payment intent')
          }
          paymentIntent.status = 'canceled'
          this.paymentIntents.set(id, paymentIntent)
          return paymentIntent
        }),
      },

      customers: {
        create: jest.fn().mockImplementation(async (params) => {
          const id = `cus_mock_${Date.now()}`
          const customer = {
            id,
            email: params.email,
            name: params.name,
            metadata: params.metadata || {},
            created: Math.floor(Date.now() / 1000),
          }
          this.customers.set(id, customer)
          return customer
        }),

        retrieve: jest.fn().mockImplementation(async (id) => {
          const customer = this.customers.get(id)
          if (!customer) {
            throw new Error('No such customer')
          }
          return customer
        }),

        update: jest.fn().mockImplementation(async (id, params) => {
          const customer = this.customers.get(id)
          if (!customer) {
            throw new Error('No such customer')
          }
          Object.assign(customer, params)
          this.customers.set(id, customer)
          return customer
        }),
      },

      refunds: {
        create: jest.fn().mockImplementation(async (params) => {
          const id = `re_mock_${Date.now()}`
          return {
            id,
            amount: params.amount,
            payment_intent: params.payment_intent,
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
          }
        }),
      },

      webhooks: {
        constructEvent: jest.fn().mockImplementation((payload, signature, secret) => {
          // Mock webhook event construction
          return {
            id: `evt_mock_${Date.now()}`,
            type: 'payment_intent.succeeded',
            data: {
              object: JSON.parse(payload),
            },
            created: Math.floor(Date.now() / 1000),
          }
        }),
      },
    }
  }
}

export class MockYooKassaProvider {
  private static instance: MockYooKassaProvider
  private payments: Map<string, any> = new Map()

  static getInstance(): MockYooKassaProvider {
    if (!MockYooKassaProvider.instance) {
      MockYooKassaProvider.instance = new MockYooKassaProvider()
    }
    return MockYooKassaProvider.instance
  }

  reset(): void {
    this.payments.clear()
  }

  async createPayment(params: any): Promise<any> {
    const id = `mock_yookassa_${Date.now()}`
    const payment = {
      id,
      amount: params.amount,
      currency: params.currency,
      status: 'pending',
      confirmation: {
        type: 'redirect',
        confirmation_url: `https://yoomoney.ru/checkout/payments/v2/contract?orderId=${id}`,
      },
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    }
    this.payments.set(id, payment)
    return payment
  }

  async getPayment(id: string): Promise<any> {
    const payment = this.payments.get(id)
    if (!payment) {
      throw new Error('Payment not found')
    }
    return payment
  }

  async refundPayment(paymentId: string, amount: number): Promise<any> {
    const payment = this.payments.get(paymentId)
    if (!payment) {
      throw new Error('Payment not found')
    }
    
    return {
      id: `refund_mock_${Date.now()}`,
      payment_id: paymentId,
      amount: { value: amount, currency: payment.currency },
      status: 'succeeded',
      created_at: new Date().toISOString(),
    }
  }
}

export class MockCoinGateProvider {
  private static instance: MockCoinGateProvider
  private orders: Map<string, any> = new Map()

  static getInstance(): MockCoinGateProvider {
    if (!MockCoinGateProvider.instance) {
      MockCoinGateProvider.instance = new MockCoinGateProvider()
    }
    return MockCoinGateProvider.instance
  }

  reset(): void {
    this.orders.clear()
  }

  async createOrder(params: any): Promise<any> {
    const id = Date.now()
    const order = {
      id,
      order_id: params.order_id,
      price_amount: params.price_amount,
      price_currency: params.price_currency,
      receive_currency: params.receive_currency,
      status: 'new',
      payment_url: `https://coingate.com/invoice/${id}`,
      created_at: new Date().toISOString(),
    }
    this.orders.set(id.toString(), order)
    return order
  }

  async getOrder(id: string): Promise<any> {
    const order = this.orders.get(id)
    if (!order) {
      throw new Error('Order not found')
    }
    return order
  }

  async createRefund(orderId: string, params: any): Promise<any> {
    const order = this.orders.get(orderId)
    if (!order) {
      throw new Error('Order not found')
    }

    return {
      id: `refund_mock_${Date.now()}`,
      order_id: orderId,
      amount: params.amount,
      currency: params.currency,
      status: 'new',
      created_at: new Date().toISOString(),
    }
  }
}

// Mock payment responses for testing
export const mockPaymentResponses = {
  stripe: {
    success: {
      success: true,
      payment_intent: {
        id: 'pi_mock_success',
        amount: 1000,
        currency: 'USD',
        status: 'succeeded',
        provider: 'stripe',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as PaymentIntent,
      payment_data: undefined,
    } as PaymentResponse,
    
    failure: {
      success: false,
      error: 'Payment failed',
    } as PaymentResponse,
  },

  yookassa: {
    success: {
      success: true,
      payment_intent: {
        id: 'mock_yookassa_success',
        amount: 1000,
        currency: 'RUB',
        status: 'succeeded',
        provider: 'yookassa',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as PaymentIntent,
      payment_data: undefined,
    } as PaymentResponse,
  },

  coingate: {
    success: {
      success: true,
      payment_intent: {
        id: 'mock_coingate_success',
        amount: 1000,
        currency: 'USD',
        status: 'succeeded',
        provider: 'coingate',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as PaymentIntent,
      payment_data: undefined,
    } as PaymentResponse,
  },
}

// Mock refund responses
export const mockRefundResponses = {
  stripe: {
    success: {
      success: true,
      refund_id: 're_mock_success',
      amount: 1000,
      currency: 'USD',
      status: 'succeeded',
    } as RefundResponse,
  },

  yookassa: {
    success: {
      success: true,
      refund_id: 'refund_mock_success',
      amount: 1000,
      currency: 'RUB',
      status: 'succeeded',
    } as RefundResponse,
  },
}

// Reset all mock providers
export function resetAllMockProviders(): void {
  MockStripeProvider.getInstance().reset()
  MockYooKassaProvider.getInstance().reset()
  MockCoinGateProvider.getInstance().reset()
}
