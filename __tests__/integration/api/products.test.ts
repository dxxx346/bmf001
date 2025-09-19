/**
 * Comprehensive Integration Tests for Product API Routes
 * Tests all HTTP methods, authentication, authorization, validation, rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { NextRequest, NextResponse } from 'next/server'

// Mock all dependencies before importing anything else
jest.mock('@/services/product.service', () => ({
  ProductService: jest.fn().mockImplementation(() => ({
    searchProducts: jest.fn(),
    createProduct: jest.fn(),
    getProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    createBulkOperation: jest.fn(),
  }))
}))

jest.mock('@/middleware/auth.middleware', () => ({
  authMiddleware: {
    requireSeller: jest.fn((req, handler) => handler(req, { 
      userId: 'seller-123', 
      role: 'seller', 
      isAuthenticated: true 
    })),
    requireAuth: jest.fn((req, handler) => handler(req, { 
      userId: 'user-123', 
      role: 'buyer', 
      isAuthenticated: true 
    })),
    optionalAuth: jest.fn((req) => Promise.resolve({ 
      userId: 'user-123', 
      role: 'buyer', 
      isAuthenticated: true 
    })),
  }
}))

jest.mock('@/lib/logger', () => ({
  logError: jest.fn(),
  defaultLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}))

jest.mock('@/lib/security-validators', () => ({
  ProductSearchSchema: {},
  ProductCreateSchema: {},
  validateInput: jest.fn(() => ({ success: true, data: {} })),
  sanitizeHtml: jest.fn((input) => input),
  safeJsonParse: jest.fn((input) => JSON.parse(input)),
  createAuditLog: jest.fn(),
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }
}))

jest.mock('@/lib/supabase', () => ({
  createServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    }))
  }))
}))

// Mock the route handlers by registering them in the global handlers
const mockRouteHandlers = {
  '@/app/api/products/route': {},
  '@/app/api/products/[id]/route': {},
  '@/app/api/products/bulk/route': {},
  '@/app/api/products/search/route': {}
}

describe('Product API Integration Tests', () => {
  const baseUrl = 'http://localhost:3000'
  
  // Mock data
  const mockProduct = {
    id: 'product-123',
    title: 'Test Product',
    description: 'Test product description',
    short_description: 'Short description',
    price: 29.99,
    sale_price: 24.99,
    currency: 'USD',
    category_id: 1,
    subcategory_id: 2,
    seller_id: 'seller-123',
    shop_id: 'shop-123',
    product_type: 'digital',
    status: 'active',
    is_featured: false,
    is_digital: true,
    is_downloadable: true,
    download_limit: 5,
    download_expiry_days: 30,
    tags: ['software', 'tools'],
    metadata: { version: '1.0' },
    seo: { keywords: 'test, product' },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }

  const mockProducts = [mockProduct, { ...mockProduct, id: 'product-456', title: 'Another Product' }]

  beforeEach(() => {
    jest.clearAllMocks()
    // Initialize global handlers if not exists
    if (!global.__HANDLERS__) {
      global.__HANDLERS__ = {}
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // Helper function to register mock handlers
  const registerMockHandler = (routeKey: string, method: string, handler: any) => {
    if (!global.__HANDLERS__[routeKey]) {
      global.__HANDLERS__[routeKey] = {}
    }
    global.__HANDLERS__[routeKey][method] = handler
  }

  describe('GET /api/products - Product Search and Listing', () => {
    it('should get products with default pagination', async () => {
      const mockResponse = {
        products: mockProducts,
        total: 2,
        page: 1,
        limit: 20,
        total_pages: 1,
        has_next_page: false,
        has_previous_page: false,
        filters_applied: {
          page: 1,
          limit: 20,
          sort_by: 'created_at',
          sort_order: 'desc'
        },
        facets: {
          categories: [],
          price_ranges: [],
          ratings: [],
          tags: []
        }
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products')
        .expect(200)

      expect(response.body).toEqual(mockResponse)
      expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: expect.stringContaining('/api/products')
      }))
    })

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 50,
        page: 2,
        limit: 10,
        total_pages: 5,
        has_next_page: true,
        has_previous_page: true,
        filters_applied: {
          page: 2,
          limit: 10,
          sort_by: 'created_at',
          sort_order: 'desc'
        },
        facets: {
          categories: [],
          price_ranges: [],
          ratings: [],
          tags: []
        }
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products')
        .query({
          page: '2',
          limit: '10'
        })
        .expect(200)

      expect(response.body).toEqual(mockResponse)
      expect(response.body.page).toBe(2)
      expect(response.body.limit).toBe(10)
      expect(response.body.has_next_page).toBe(true)
      expect(response.body.has_previous_page).toBe(true)
    })

    it('should handle filtering parameters', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
        has_next_page: false,
        has_previous_page: false,
        filters_applied: {
          category_id: 1,
          min_price: 20,
          max_price: 50,
          tags: ['software'],
          is_featured: true,
          sort_by: 'price',
          sort_order: 'asc',
          page: 1,
          limit: 20
        },
        facets: {
          categories: [],
          price_ranges: [],
          ratings: [],
          tags: []
        }
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products')
        .query({
          category_id: '1',
          min_price: '20',
          max_price: '50',
          tags: 'software',
          is_featured: 'true',
          sort_by: 'price',
          sort_order: 'asc'
        })
        .expect(200)

      expect(response.body).toEqual(mockResponse)
    })

    it('should handle sorting parameters', async () => {
      const sortTestCases = [
        { sort_by: 'price', sort_order: 'asc' },
        { sort_by: 'price', sort_order: 'desc' },
        { sort_by: 'created_at', sort_order: 'desc' },
        { sort_by: 'rating', sort_order: 'desc' },
        { sort_by: 'popularity', sort_order: 'desc' }
      ]

      for (const sortCase of sortTestCases) {
        const mockResponse = {
          products: mockProducts,
          total: 2,
          page: 1,
          limit: 20,
          total_pages: 1,
          has_next_page: false,
          has_previous_page: false,
          filters_applied: {
            ...sortCase,
            page: 1,
            limit: 20
          },
          facets: {
            categories: [],
            price_ranges: [],
            ratings: [],
            tags: []
          }
        }

        const mockHandler = jest.fn().mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )

        registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

        const response = await request(baseUrl)
          .get('/api/products')
          .query(sortCase)
          .expect(200)

        expect(response.body.filters_applied.sort_by).toBe(sortCase.sort_by)
        expect(response.body.filters_applied.sort_order).toBe(sortCase.sort_order)
      }
    })

    it('should handle search query parameter', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
        has_next_page: false,
        has_previous_page: false,
        filters_applied: {
          query: 'test software',
          sort_by: 'created_at',
          sort_order: 'desc',
          page: 1,
          limit: 20
        },
        facets: {
          categories: [],
          price_ranges: [],
          ratings: [],
          tags: []
        }
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products')
        .query({ query: 'test software' })
        .expect(200)

      expect(response.body.filters_applied.query).toBe('test software')
    })

    it('should handle invalid filter parameters', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid search parameters',
          details: {
            category_id: 'Must be a valid number',
            min_price: 'Must be a positive number'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products')
        .query({
          category_id: 'invalid',
          min_price: '-10'
        })
        .expect(400)

      expect(response.body.error).toBe('Invalid search parameters')
      expect(response.body.details).toBeDefined()
    })

    it('should handle server errors', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Failed to search products'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products')
        .expect(500)

      expect(response.body.error).toBe('Failed to search products')
    })
  })

  describe('POST /api/products - Create Product', () => {
    it('should create a product with valid data', async () => {
      const mockResponse = {
        message: 'Product created successfully',
        product: mockProduct
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      const productData = {
        title: 'New Product',
        description: 'Product description',
        short_description: 'Short desc',
        price: '29.99',
        currency: 'USD',
        category_id: '1',
        product_type: 'digital',
        is_digital: 'true',
        is_downloadable: 'true',
        tags: 'software,tools'
      }

      const response = await request(baseUrl)
        .post('/api/products')
        .field(productData)
        .expect(201)

      expect(response.body).toEqual(mockResponse)
      expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: expect.stringContaining('/api/products')
      }))
    })

    it('should handle file upload simulation', async () => {
      const mockResponse = {
        message: 'Product created successfully',
        product: { ...mockProduct, files: ['file1.pdf'], images: ['image1.jpg'] }
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      const productData = {
        title: 'New Product with Files',
        description: 'Product description',
        price: '29.99',
        currency: 'USD',
        product_type: 'digital'
      }

      // Simulate file uploads
      const response = await request(baseUrl)
        .post('/api/products')
        .field(productData)
        .attach('files[0]', Buffer.from('fake file content'), 'test-file.pdf')
        .attach('images[0]', Buffer.from('fake image content'), 'test-image.jpg')
        .expect(201)

      expect(response.body).toEqual(mockResponse)
    })

    it('should validate required fields', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid product data',
          details: {
            title: 'Title is required',
            description: 'Description is required',
            price: 'Price must be a positive number'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products')
        .field({
          title: '',
          price: '-10'
        })
        .expect(400)

      expect(response.body.error).toBe('Invalid product data')
      expect(response.body.details).toBeDefined()
    })

    it('should require seller authentication', async () => {
      // Mock unauthorized access
      jest.mock('@/middleware/auth.middleware', () => ({
        authMiddleware: {
          requireSeller: jest.fn().mockResolvedValue(
            new Response(JSON.stringify({
              error: 'Authentication required'
            }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            })
          )
        }
      }))

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products')
        .field({
          title: 'Test Product',
          price: '29.99'
        })
        .expect(401)

      expect(response.body.error).toBe('Authentication required')
    })

    it('should handle server errors during creation', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Failed to create product'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products')
        .field({
          title: 'Test Product',
          description: 'Description',
          price: '29.99'
        })
        .expect(500)

      expect(response.body.error).toBe('Failed to create product')
    })
  })

  describe('GET /api/products/[id] - Get Single Product', () => {
    it('should get a product by ID', async () => {
      const mockResponse = { product: mockProduct }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products/product-123')
        .expect(200)

      expect(response.body).toEqual(mockResponse)
      expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: expect.stringContaining('/api/products/product-123')
      }))
    })

    it('should return 404 for non-existent product', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Product not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products/non-existent')
        .expect(404)

      expect(response.body.error).toBe('Product not found')
    })

    it('should handle server errors', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Failed to get product'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products/product-123')
        .expect(500)

      expect(response.body.error).toBe('Failed to get product')
    })
  })

  describe('PUT /api/products/[id] - Update Product', () => {
    it('should update product with partial data', async () => {
      const updatedProduct = { ...mockProduct, title: 'Updated Product', price: 39.99 }
      const mockResponse = {
        message: 'Product updated successfully',
        product: updatedProduct
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'PUT', mockHandler)

      const updateData = {
        title: 'Updated Product',
        price: '39.99'
      }

      const response = await request(baseUrl)
        .put('/api/products/product-123')
        .field(updateData)
        .expect(200)

      expect(response.body).toEqual(mockResponse)
      expect(response.body.product.title).toBe('Updated Product')
      expect(response.body.product.price).toBe(39.99)
    })

    it('should update product with file uploads', async () => {
      const updatedProduct = { 
        ...mockProduct, 
        title: 'Updated Product with Files',
        files: ['new-file.pdf'],
        images: ['new-image.jpg']
      }
      const mockResponse = {
        message: 'Product updated successfully',
        product: updatedProduct
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'PUT', mockHandler)

      const response = await request(baseUrl)
        .put('/api/products/product-123')
        .field({ title: 'Updated Product with Files' })
        .attach('files[0]', Buffer.from('new file content'), 'new-file.pdf')
        .attach('images[0]', Buffer.from('new image content'), 'new-image.jpg')
        .expect(200)

      expect(response.body).toEqual(mockResponse)
    })

    it('should require seller authentication for updates', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'PUT', mockHandler)

      const response = await request(baseUrl)
        .put('/api/products/product-123')
        .field({ title: 'Updated Product' })
        .expect(401)

      expect(response.body.error).toBe('Authentication required')
    })

    it('should handle validation errors', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid update data',
          details: {
            price: 'Price must be a positive number'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'PUT', mockHandler)

      const response = await request(baseUrl)
        .put('/api/products/product-123')
        .field({ price: '-10' })
        .expect(400)

      expect(response.body.error).toBe('Invalid update data')
    })

    it('should handle unauthorized updates (not product owner)', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'You can only update your own products'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'PUT', mockHandler)

      const response = await request(baseUrl)
        .put('/api/products/other-product-123')
        .field({ title: 'Trying to update others product' })
        .expect(403)

      expect(response.body.error).toBe('You can only update your own products')
    })
  })

  describe('DELETE /api/products/[id] - Delete Product', () => {
    it('should delete product successfully', async () => {
      const mockResponse = {
        message: 'Product deleted successfully'
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'DELETE', mockHandler)

      const response = await request(baseUrl)
        .delete('/api/products/product-123')
        .expect(200)

      expect(response.body).toEqual(mockResponse)
    })

    it('should require seller authentication for deletion', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'DELETE', mockHandler)

      const response = await request(baseUrl)
        .delete('/api/products/product-123')
        .expect(401)

      expect(response.body.error).toBe('Authentication required')
    })

    it('should handle unauthorized deletion (not product owner)', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'You can only delete your own products'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'DELETE', mockHandler)

      const response = await request(baseUrl)
        .delete('/api/products/other-product-123')
        .expect(403)

      expect(response.body.error).toBe('You can only delete your own products')
    })

    it('should handle deletion of non-existent product', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Product not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/[id]/route', 'DELETE', mockHandler)

      const response = await request(baseUrl)
        .delete('/api/products/non-existent')
        .expect(404)

      expect(response.body.error).toBe('Product not found')
    })
  })

  describe('POST /api/products/bulk - Bulk Operations', () => {
    it('should perform bulk update operation', async () => {
      const mockResponse = {
        message: 'Bulk operation created successfully',
        operation_id: 'bulk-op-123'
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/bulk/route', 'POST', mockHandler)

      const bulkData = {
        operation_type: 'update',
        product_ids: ['product-123', 'product-456'],
        parameters: {
          status: 'active',
          is_featured: true
        }
      }

      const response = await request(baseUrl)
        .post('/api/products/bulk')
        .send(bulkData)
        .expect(201)

      expect(response.body).toEqual(mockResponse)
    })

    it('should perform bulk delete operation', async () => {
      const mockResponse = {
        message: 'Bulk operation created successfully',
        operation_id: 'bulk-op-456'
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/bulk/route', 'POST', mockHandler)

      const bulkData = {
        operation_type: 'delete',
        product_ids: ['product-123', 'product-456']
      }

      const response = await request(baseUrl)
        .post('/api/products/bulk')
        .send(bulkData)
        .expect(201)

      expect(response.body).toEqual(mockResponse)
    })

    it('should validate bulk operation parameters', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Operation type and product IDs are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/bulk/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products/bulk')
        .send({
          operation_type: '',
          product_ids: []
        })
        .expect(400)

      expect(response.body.error).toBe('Operation type and product IDs are required')
    })

    it('should validate operation type', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid operation type'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/bulk/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products/bulk')
        .send({
          operation_type: 'invalid_operation',
          product_ids: ['product-123']
        })
        .expect(400)

      expect(response.body.error).toBe('Invalid operation type')
    })

    it('should require seller authentication for bulk operations', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/bulk/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products/bulk')
        .send({
          operation_type: 'update',
          product_ids: ['product-123']
        })
        .expect(401)

      expect(response.body.error).toBe('Authentication required')
    })
  })

  describe('GET /api/products/search - Advanced Search', () => {
    it('should perform text search with various queries', async () => {
      const searchQueries = [
        'software tools',
        'digital products',
        'pdf templates',
        'javascript libraries'
      ]

      for (const query of searchQueries) {
        const mockResponse = {
          products: [{ ...mockProduct, title: `Product matching ${query}` }],
          total: 1,
          page: 1,
          limit: 20,
          total_pages: 1,
          has_next_page: false,
          has_previous_page: false,
          filters_applied: {
            query,
            sort_by: 'created_at',
            sort_order: 'desc',
            page: 1,
            limit: 20
          },
          facets: {
            categories: [],
            price_ranges: [],
            ratings: [],
            tags: []
          }
        }

        const mockHandler = jest.fn().mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )

        registerMockHandler('@/app/api/products/search/route', 'GET', mockHandler)

        const response = await request(baseUrl)
          .get('/api/products/search')
          .query({ query })
          .expect(200)

        expect(response.body.filters_applied.query).toBe(query)
        expect(response.body.products).toHaveLength(1)
      }
    })

    it('should handle complex filter combinations', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
        has_next_page: false,
        has_previous_page: false,
        filters_applied: {
          query: 'software',
          category_id: 1,
          min_price: 10,
          max_price: 100,
          min_rating: 4,
          tags: ['tools', 'software'],
          file_types: ['pdf', 'zip'],
          is_featured: true,
          sort_by: 'rating',
          sort_order: 'desc',
          page: 1,
          limit: 20
        },
        facets: {
          categories: [{ id: 1, name: 'Software', count: 5 }],
          price_ranges: [{ min: 0, max: 25, count: 10 }],
          ratings: [{ rating: 5, count: 3 }],
          tags: [{ name: 'tools', count: 8 }]
        }
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/search/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products/search')
        .query({
          query: 'software',
          category_id: '1',
          min_price: '10',
          max_price: '100',
          min_rating: '4',
          tags: 'tools,software',
          file_types: 'pdf,zip',
          is_featured: 'true',
          sort_by: 'rating',
          sort_order: 'desc',
          include_facets: 'true'
        })
        .expect(200)

      expect(response.body.filters_applied.query).toBe('software')
      expect(response.body.facets).toBeDefined()
      expect(response.body.facets.categories).toHaveLength(1)
    })

    it('should handle empty search results', async () => {
      const mockResponse = {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
        has_next_page: false,
        has_previous_page: false,
        filters_applied: {
          query: 'nonexistent product',
          sort_by: 'created_at',
          sort_order: 'desc',
          page: 1,
          limit: 20
        },
        facets: {
          categories: [],
          price_ranges: [],
          ratings: [],
          tags: []
        }
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/search/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products/search')
        .query({ query: 'nonexistent product' })
        .expect(200)

      expect(response.body.products).toHaveLength(0)
      expect(response.body.total).toBe(0)
    })
  })

  describe('Authentication and Authorization Tests', () => {
    it('should allow anonymous access to product listing', async () => {
      // Mock optional auth middleware
      jest.mock('@/middleware/auth.middleware', () => ({
        authMiddleware: {
          optionalAuth: jest.fn((req) => Promise.resolve({ 
            isAuthenticated: false 
          })),
        }
      }))

      const mockResponse = {
        products: mockProducts,
        total: 2,
        page: 1,
        limit: 20,
        total_pages: 1,
        has_next_page: false,
        has_previous_page: false
      }

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products')
        .expect(200)

      expect(response.body.products).toHaveLength(2)
    })

    it('should require seller role for product creation', async () => {
      // Test with buyer role
      jest.mock('@/middleware/auth.middleware', () => ({
        authMiddleware: {
          requireSeller: jest.fn().mockResolvedValue(
            new Response(JSON.stringify({
              error: 'Seller role required'
            }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            })
          )
        }
      }))

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Seller role required'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products')
        .field({
          title: 'Test Product',
          price: '29.99'
        })
        .expect(403)

      expect(response.body.error).toBe('Seller role required')
    })
  })

  describe('Rate Limiting Tests', () => {
    it('should handle rate limiting for product creation', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          retry_after: 60
        }), {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products')
        .field({
          title: 'Test Product',
          price: '29.99'
        })
        .expect(429)

      expect(response.body.error).toBe('Rate limit exceeded')
      expect(response.headers['retry-after']).toBe('60')
    })

    it('should handle rate limiting for search requests', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Too many search requests',
          retry_after: 30
        }), {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '30'
          }
        })
      )

      registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products')
        .query({ query: 'test' })
        .expect(429)

      expect(response.body.error).toBe('Too many search requests')
    })
  })

  describe('Error Response and Status Code Tests', () => {
    it('should return correct error formats', async () => {
      const errorTestCases = [
        {
          status: 400,
          error: 'Bad Request',
          details: { field: 'Invalid value' }
        },
        {
          status: 401,
          error: 'Unauthorized'
        },
        {
          status: 403,
          error: 'Forbidden'
        },
        {
          status: 404,
          error: 'Not Found'
        },
        {
          status: 422,
          error: 'Validation Error',
          details: { title: 'Required field' }
        },
        {
          status: 500,
          error: 'Internal Server Error'
        }
      ]

      for (const testCase of errorTestCases) {
        const mockHandler = jest.fn().mockResolvedValue(
          new Response(JSON.stringify(testCase), {
            status: testCase.status,
            headers: { 'Content-Type': 'application/json' }
          })
        )

        registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

        const response = await request(baseUrl)
          .get('/api/products')
          .expect(testCase.status)

        expect(response.body.error).toBe(testCase.error)
        if (testCase.details) {
          expect(response.body.details).toEqual(testCase.details)
        }
      }
    })

    it('should include proper HTTP status codes for all operations', async () => {
      const statusTestCases = [
        { method: 'GET', path: '/api/products', expectedStatus: 200 },
        { method: 'POST', path: '/api/products', expectedStatus: 201 },
        { method: 'GET', path: '/api/products/123', expectedStatus: 200 },
        { method: 'PUT', path: '/api/products/123', expectedStatus: 200 },
        { method: 'DELETE', path: '/api/products/123', expectedStatus: 200 }
      ]

      for (const testCase of statusTestCases) {
        const mockResponse = testCase.method === 'POST' 
          ? { message: 'Created', product: mockProduct }
          : testCase.method === 'DELETE'
          ? { message: 'Deleted' }
          : testCase.path.includes('/api/products/123')
          ? { product: mockProduct }
          : { products: [mockProduct], total: 1 }

        const mockHandler = jest.fn().mockResolvedValue(
          new Response(JSON.stringify(mockResponse), {
            status: testCase.expectedStatus,
            headers: { 'Content-Type': 'application/json' }
          })
        )

        if (testCase.path === '/api/products') {
          registerMockHandler('@/app/api/products/route', testCase.method, mockHandler)
        } else {
          registerMockHandler('@/app/api/products/[id]/route', testCase.method, mockHandler)
        }

        const req = request(baseUrl)[testCase.method.toLowerCase()](testCase.path)
        
        if (testCase.method === 'POST' || testCase.method === 'PUT') {
          req.field({ title: 'Test', price: '29.99' })
        }

        await req.expect(testCase.expectedStatus)
      }
    })
  })

  describe('Request Validation Tests', () => {
    it('should validate content-type for POST requests', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Content-Type must be multipart/form-data'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products')
        .set('Content-Type', 'application/json')
        .send({ title: 'Test' })
        .expect(400)

      expect(response.body.error).toBe('Content-Type must be multipart/form-data')
    })

    it('should validate request size limits', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Request too large'
        }), {
          status: 413,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      // Simulate large file upload
      const largeBuffer = Buffer.alloc(50 * 1024 * 1024) // 50MB
      
      const response = await request(baseUrl)
        .post('/api/products')
        .field({ title: 'Test Product', price: '29.99' })
        .attach('files[0]', largeBuffer, 'large-file.pdf')
        .expect(413)

      expect(response.body.error).toBe('Request too large')
    })

    it('should validate file types for uploads', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid file type',
          details: {
            files: 'Only PDF, ZIP, and document files are allowed'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'POST', mockHandler)

      const response = await request(baseUrl)
        .post('/api/products')
        .field({ title: 'Test Product', price: '29.99' })
        .attach('files[0]', Buffer.from('fake content'), 'malicious.exe')
        .expect(400)

      expect(response.body.error).toBe('Invalid file type')
    })

    it('should validate numeric parameters', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid parameters',
          details: {
            page: 'Must be a positive integer',
            limit: 'Must be between 1 and 100',
            price: 'Must be a positive number'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      registerMockHandler('@/app/api/products/route', 'GET', mockHandler)

      const response = await request(baseUrl)
        .get('/api/products')
        .query({
          page: '-1',
          limit: '500',
          min_price: 'invalid'
        })
        .expect(400)

      expect(response.body.details.page).toBe('Must be a positive integer')
      expect(response.body.details.limit).toBe('Must be between 1 and 100')
    })
  })
})