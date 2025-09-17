/**
 * Integration Tests for Products API Routes
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import request from 'supertest'
import { NextRequest } from 'next/server'

// Import the route handlers for mocking
import * as productsRoute from '@/app/api/products/route'
import * as productByIdRoute from '@/app/api/products/[id]/route'
import * as bulkProductsRoute from '@/app/api/products/bulk/route'

// Mock the product handlers
jest.mock('@/app/api/products/route')
jest.mock('@/app/api/products/[id]/route')
jest.mock('@/app/api/products/bulk/route')

describe('Products API Integration Tests', () => {
  const baseUrl = 'http://localhost:3000'
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET /api/products', () => {
    it('should fetch products with pagination', async () => {
      const mockProductsHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          products: [
            {
              id: 'prod1',
              title: 'Test Product 1',
              description: 'Test description',
              price: 29.99,
              category: 'Software',
              seller_id: 'seller1',
              shop_id: 'shop1'
            },
            {
              id: 'prod2',
              title: 'Test Product 2',
              description: 'Test description 2',
              price: 49.99,
              category: 'Games',
              seller_id: 'seller2',
              shop_id: 'shop2'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productsRoute as any).GET = mockProductsHandler

      const response = await request(baseUrl)
        .get('/api/products?page=1&limit=20')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        products: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            price: expect.any(Number)
          })
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 20,
          total: expect.any(Number)
        })
      })
    })

    it('should filter products by category', async () => {
      const mockProductsHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          products: [
            {
              id: 'prod1',
              title: 'Software Product',
              category: 'Software',
              price: 29.99
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productsRoute as any).GET = mockProductsHandler

      const response = await request(baseUrl)
        .get('/api/products?category=Software')
        .expect(200)

      expect(response.body.products).toHaveLength(1)
      expect(response.body.products[0].category).toBe('Software')
    })

    it('should search products by query', async () => {
      const mockProductsHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          products: [
            {
              id: 'prod1',
              title: 'JavaScript Course',
              description: 'Learn JavaScript programming',
              price: 39.99
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productsRoute as any).GET = mockProductsHandler

      const response = await request(baseUrl)
        .get('/api/products?q=JavaScript')
        .expect(200)

      expect(response.body.products).toHaveLength(1)
      expect(response.body.products[0].title).toContain('JavaScript')
    })
  })

  describe('POST /api/products', () => {
    it('should create a new product with valid data', async () => {
      const productData = {
        title: 'New Product',
        description: 'Product description',
        price: 99.99,
        category_id: 1,
        shop_id: 'shop123',
        file_url: 'https://example.com/file.pdf',
        thumbnail_url: 'https://example.com/thumb.jpg'
      }

      const mockCreateHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          product: {
            id: 'new-prod-123',
            ...productData,
            seller_id: 'seller123',
            created_at: new Date().toISOString()
          }
        }), { 
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productsRoute as any).POST = mockCreateHandler

      const response = await request(baseUrl)
        .post('/api/products')
        .set('Authorization', 'Bearer mock-token')
        .send(productData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        product: expect.objectContaining({
          id: expect.any(String),
          title: productData.title,
          price: productData.price
        })
      })
    })

    it('should require authentication', async () => {
      const productData = {
        title: 'New Product',
        description: 'Product description',
        price: 99.99
      }

      const mockCreateHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Authentication required'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productsRoute as any).POST = mockCreateHandler

      const response = await request(baseUrl)
        .post('/api/products')
        .send(productData)
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      })
    })

    it('should validate required fields', async () => {
      const invalidProductData = {
        title: '', // Empty title
        price: -10 // Invalid price
      }

      const mockCreateHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: {
            title: 'Title is required',
            price: 'Price must be positive'
          }
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productsRoute as any).POST = mockCreateHandler

      const response = await request(baseUrl)
        .post('/api/products')
        .set('Authorization', 'Bearer mock-token')
        .send(invalidProductData)
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: expect.any(Object)
      })
    })
  })

  describe('GET /api/products/[id]', () => {
    it('should fetch a specific product', async () => {
      const productId = 'prod123'

      const mockGetProductHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          product: {
            id: productId,
            title: 'Specific Product',
            description: 'Product description',
            price: 59.99,
            seller: {
              id: 'seller123',
              name: 'Test Seller'
            },
            shop: {
              id: 'shop123',
              name: 'Test Shop'
            }
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productByIdRoute as any).GET = mockGetProductHandler

      const response = await request(baseUrl)
        .get(`/api/products/${productId}`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        product: expect.objectContaining({
          id: productId,
          title: expect.any(String),
          seller: expect.any(Object),
          shop: expect.any(Object)
        })
      })
    })

    it('should return 404 for non-existent product', async () => {
      const productId = 'non-existent'

      const mockGetProductHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Product not found'
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productByIdRoute as any).GET = mockGetProductHandler

      const response = await request(baseUrl)
        .get(`/api/products/${productId}`)
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Product not found'
      })
    })
  })

  describe('PUT /api/products/[id]', () => {
    it('should update a product successfully', async () => {
      const productId = 'prod123'
      const updateData = {
        title: 'Updated Product Title',
        price: 79.99
      }

      const mockUpdateHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          product: {
            id: productId,
            ...updateData,
            updated_at: new Date().toISOString()
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productByIdRoute as any).PUT = mockUpdateHandler

      const response = await request(baseUrl)
        .put(`/api/products/${productId}`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        product: expect.objectContaining({
          id: productId,
          title: updateData.title,
          price: updateData.price
        })
      })
    })

    it('should require seller ownership', async () => {
      const productId = 'prod123'
      const updateData = { title: 'Unauthorized Update' }

      const mockUpdateHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Not authorized to update this product'
        }), { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productByIdRoute as any).PUT = mockUpdateHandler

      const response = await request(baseUrl)
        .put(`/api/products/${productId}`)
        .set('Authorization', 'Bearer wrong-seller-token')
        .send(updateData)
        .expect(403)

      expect(response.body).toEqual({
        success: false,
        error: 'Not authorized to update this product'
      })
    })
  })

  describe('DELETE /api/products/[id]', () => {
    it('should delete a product successfully', async () => {
      const productId = 'prod123'

      const mockDeleteHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          message: 'Product deleted successfully'
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productByIdRoute as any).DELETE = mockDeleteHandler

      const response = await request(baseUrl)
        .delete(`/api/products/${productId}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Product deleted successfully'
      })
    })

    it('should require seller ownership for deletion', async () => {
      const productId = 'prod123'

      const mockDeleteHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Not authorized to delete this product'
        }), { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (productByIdRoute as any).DELETE = mockDeleteHandler

      const response = await request(baseUrl)
        .delete(`/api/products/${productId}`)
        .set('Authorization', 'Bearer wrong-seller-token')
        .expect(403)

      expect(response.body).toEqual({
        success: false,
        error: 'Not authorized to delete this product'
      })
    })
  })

  describe('POST /api/products/bulk', () => {
    it('should handle bulk product operations', async () => {
      const bulkData = {
        operation: 'update',
        product_ids: ['prod1', 'prod2', 'prod3'],
        updates: {
          status: 'inactive'
        }
      }

      const mockBulkHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          message: 'Bulk operation completed',
          processed: 3,
          failed: 0
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (bulkProductsRoute as any).POST = mockBulkHandler

      const response = await request(baseUrl)
        .post('/api/products/bulk')
        .set('Authorization', 'Bearer mock-token')
        .send(bulkData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Bulk operation completed',
        processed: 3,
        failed: 0
      })
    })

    it('should validate bulk operation data', async () => {
      const invalidBulkData = {
        operation: 'invalid-operation',
        product_ids: []
      }

      const mockBulkHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Invalid bulk operation',
          details: {
            operation: 'Must be one of: update, delete, activate, deactivate',
            product_ids: 'At least one product ID is required'
          }
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      (bulkProductsRoute as any).POST = mockBulkHandler

      const response = await request(baseUrl)
        .post('/api/products/bulk')
        .set('Authorization', 'Bearer mock-token')
        .send(invalidBulkData)
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid bulk operation',
        details: expect.any(Object)
      })
    })
  })
})
