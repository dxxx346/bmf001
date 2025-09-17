/**
 * Integration Tests for Payments API Routes
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import request from 'supertest'
import { NextRequest } from 'next/server'

// Import the route handlers for mocking
import * as paymentsRoute from '@/app/api/payments/route'
import * as refundRoute from '@/app/api/payments/refund/route'
import * as webhookRoute from '@/app/api/webhooks/stripe/route'

// Mock the payment handlers
jest.mock('@/app/api/payments/route')
jest.mock('@/app/api/payments/refund/route')
jest.mock('@/app/api/webhooks/stripe/route')

describe('Payments API Integration Tests', () => {
  const baseUrl = 'http://localhost:3000'
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST /api/payments', () => {
    it('should create a Stripe payment successfully', async () => {
      const paymentData = {
        provider: 'stripe',
        amount: 2999, // $29.99
        currency: 'USD',
        product_id: 'prod123',
        metadata: {
          userId: 'user123',
          productId: 'prod123'
        }
      }

      const mockPaymentHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          payment: {
            id: 'payment123',
            provider: 'stripe',
            amount: 2999,
            currency: 'USD',
            status: 'pending',
            client_secret: 'pi_test_client_secret_123',
            external_id: 'pi_stripe_123'
          }
        }), { 
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(paymentsRoute as any).POST = mockPaymentHandler

      const response = await request(baseUrl)
        .post('/api/payments')
        .set('Authorization', 'Bearer mock-token')
        .send(paymentData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        payment: expect.objectContaining({
          id: expect.any(String),
          provider: 'stripe',
          amount: 2999,
          currency: 'USD',
          status: 'pending',
          client_secret: expect.any(String)
        })
      })
    })

    it('should create a YooKassa payment successfully', async () => {
      const paymentData = {
        provider: 'yookassa',
        amount: 5000, // 50.00 RUB
        currency: 'RUB',
        product_id: 'prod123'
      }

      const mockPaymentHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          payment: {
            id: 'payment124',
            provider: 'yookassa',
            amount: 5000,
            currency: 'RUB',
            status: 'pending',
            confirmation_url: 'https://yookassa.ru/confirm/123',
            external_id: 'yk_payment_123'
          }
        }), { 
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(paymentsRoute as any).POST = mockPaymentHandler

      const response = await request(baseUrl)
        .post('/api/payments')
        .set('Authorization', 'Bearer mock-token')
        .send(paymentData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        payment: expect.objectContaining({
          id: expect.any(String),
          provider: 'yookassa',
          amount: 5000,
          currency: 'RUB',
          confirmation_url: expect.any(String)
        })
      })
    })

    it('should create a CoinGate payment successfully', async () => {
      const paymentData = {
        provider: 'coingate',
        amount: 10000, // $100.00
        currency: 'USD',
        product_id: 'prod123'
      }

      const mockPaymentHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          payment: {
            id: 'payment125',
            provider: 'coingate',
            amount: 10000,
            currency: 'USD',
            status: 'pending',
            payment_url: 'https://coingate.com/pay/123',
            external_id: 'cg_order_123'
          }
        }), { 
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(paymentsRoute as any).POST = mockPaymentHandler

      const response = await request(baseUrl)
        .post('/api/payments')
        .set('Authorization', 'Bearer mock-token')
        .send(paymentData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        payment: expect.objectContaining({
          id: expect.any(String),
          provider: 'coingate',
          amount: 10000,
          currency: 'USD',
          payment_url: expect.any(String)
        })
      })
    })

    it('should require authentication', async () => {
      const paymentData = {
        provider: 'stripe',
        amount: 2999,
        currency: 'USD',
        product_id: 'prod123'
      }

      const mockPaymentHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Authentication required'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(paymentsRoute as any).POST = mockPaymentHandler

      const response = await request(baseUrl)
        .post('/api/payments')
        .send(paymentData)
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      })
    })

    it('should validate payment data', async () => {
      const invalidPaymentData = {
        provider: 'invalid-provider',
        amount: -100,
        currency: 'INVALID'
      }

      const mockPaymentHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: {
            provider: 'Must be one of: stripe, yookassa, coingate',
            amount: 'Amount must be positive',
            currency: 'Invalid currency code'
          }
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(paymentsRoute as any).POST = mockPaymentHandler

      const response = await request(baseUrl)
        .post('/api/payments')
        .set('Authorization', 'Bearer mock-token')
        .send(invalidPaymentData)
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: expect.any(Object)
      })
    })
  })

  describe('GET /api/payments', () => {
    it('should fetch user payments with pagination', async () => {
      const mockGetPaymentsHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          payments: [
            {
              id: 'payment1',
              provider: 'stripe',
              amount: 2999,
              currency: 'USD',
              status: 'succeeded',
              created_at: new Date().toISOString()
            },
            {
              id: 'payment2',
              provider: 'yookassa',
              amount: 5000,
              currency: 'RUB',
              status: 'pending',
              created_at: new Date().toISOString()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(paymentsRoute as any).GET = mockGetPaymentsHandler

      const response = await request(baseUrl)
        .get('/api/payments?page=1&limit=10')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        payments: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            provider: expect.any(String),
            amount: expect.any(Number),
            status: expect.any(String)
          })
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: expect.any(Number)
        })
      })
    })

    it('should filter payments by status', async () => {
      const mockGetPaymentsHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          payments: [
            {
              id: 'payment1',
              provider: 'stripe',
              amount: 2999,
              status: 'succeeded'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(paymentsRoute as any).GET = mockGetPaymentsHandler

      const response = await request(baseUrl)
        .get('/api/payments?status=succeeded')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body.payments).toHaveLength(1)
      expect(response.body.payments[0].status).toBe('succeeded')
    })
  })

  describe('POST /api/payments/refund', () => {
    it('should process refund successfully', async () => {
      const refundData = {
        payment_id: 'payment123',
        amount: 2999,
        reason: 'Customer request'
      }

      const mockRefundHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          refund: {
            id: 'refund123',
            payment_id: 'payment123',
            amount: 2999,
            status: 'succeeded',
            reason: 'Customer request',
            external_id: 're_stripe_123'
          }
        }), { 
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(refundRoute as any).POST = mockRefundHandler

      const response = await request(baseUrl)
        .post('/api/payments/refund')
        .set('Authorization', 'Bearer mock-admin-token')
        .send(refundData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        refund: expect.objectContaining({
          id: expect.any(String),
          payment_id: 'payment123',
          amount: 2999,
          status: 'succeeded'
        })
      })
    })

    it('should require admin privileges for refunds', async () => {
      const refundData = {
        payment_id: 'payment123',
        amount: 2999
      }

      const mockRefundHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Admin privileges required'
        }), { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(refundRoute as any).POST = mockRefundHandler

      const response = await request(baseUrl)
        .post('/api/payments/refund')
        .set('Authorization', 'Bearer mock-user-token')
        .send(refundData)
        .expect(403)

      expect(response.body).toEqual({
        success: false,
        error: 'Admin privileges required'
      })
    })

    it('should validate refund amount', async () => {
      const refundData = {
        payment_id: 'payment123',
        amount: 5000 // More than original payment
      }

      const mockRefundHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Refund amount exceeds payment amount'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(refundRoute as any).POST = mockRefundHandler

      const response = await request(baseUrl)
        .post('/api/payments/refund')
        .set('Authorization', 'Bearer mock-admin-token')
        .send(refundData)
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Refund amount exceeds payment amount'
      })
    })
  })

  describe('POST /api/webhooks/stripe', () => {
    it('should handle successful payment webhook', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_stripe_123',
            amount: 2999,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              userId: 'user123',
              productId: 'prod123'
            }
          }
        }
      }

      const mockWebhookHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          received: true,
          processed: true
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(webhookRoute as any).POST = mockWebhookHandler

      const response = await request(baseUrl)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid-signature')
        .send(webhookData)
        .expect(200)

      expect(response.body).toEqual({
        received: true,
        processed: true
      })
    })

    it('should handle failed payment webhook', async () => {
      const webhookData = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_stripe_failed',
            amount: 2999,
            currency: 'usd',
            status: 'failed',
            last_payment_error: {
              message: 'Your card was declined.'
            }
          }
        }
      }

      const mockWebhookHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          received: true,
          processed: true
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(webhookRoute as any).POST = mockWebhookHandler

      const response = await request(baseUrl)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid-signature')
        .send(webhookData)
        .expect(200)

      expect(response.body).toEqual({
        received: true,
        processed: true
      })
    })

    it('should reject webhooks with invalid signature', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } }
      }

      const mockWebhookHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid signature'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(webhookRoute as any).POST = mockWebhookHandler

      const response = await request(baseUrl)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send(webhookData)
        .expect(400)

      expect(response.body).toEqual({
        error: 'Invalid signature'
      })
    })
  })
})
