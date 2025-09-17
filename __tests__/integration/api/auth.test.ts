/**
 * Integration Tests for Authentication API Routes
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import request from 'supertest'
import { NextRequest } from 'next/server'

// Import the route handlers for mocking
import * as registerRoute from '@/app/api/auth/register/route'
import * as loginRoute from '@/app/api/auth/login/route'
import * as logoutRoute from '@/app/api/auth/logout/route'
import * as refreshRoute from '@/app/api/auth/refresh/route'

// Mock the auth handlers
jest.mock('@/app/api/auth/register/route')
jest.mock('@/app/api/auth/login/route')
jest.mock('@/app/api/auth/logout/route')
jest.mock('@/app/api/auth/refresh/route')

describe('Authentication API Integration Tests', () => {
  const baseUrl = 'http://localhost:3000'
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'buyer'
      }

      // Mock the route handler
      const mockRegisterHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          user: {
            id: 'user123',
            email: userData.email,
            name: userData.name,
            role: userData.role
          }
        }), { 
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      
      ;(registerRoute as any).POST = mockRegisterHandler

      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        user: expect.objectContaining({
          id: expect.any(String),
          email: userData.email,
          name: userData.name,
          role: userData.role
        })
      })

      expect(mockRegisterHandler).toHaveBeenCalledWith(
        expect.any(NextRequest)
      )
    })

    it('should handle registration with existing email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'buyer'
      }

      const mockRegisterHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Email already exists'
        }), { 
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(registerRoute as any).POST = mockRegisterHandler

      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(userData)
        .expect(409)

      expect(response.body).toEqual({
        success: false,
        error: 'Email already exists'
      })
    })

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        name: '',
        role: 'invalid-role'
      }

      const mockRegisterHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: {
            email: 'Invalid email format',
            password: 'Password must be at least 8 characters',
            name: 'Name is required',
            role: 'Invalid role'
          }
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(registerRoute as any).POST = mockRegisterHandler

      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: expect.any(Object)
      })
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!'
      }

      const mockLoginHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          user: {
            id: 'user123',
            email: credentials.email,
            name: 'Test User',
            role: 'buyer'
          },
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(loginRoute as any).POST = mockLoginHandler

      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        user: expect.objectContaining({
          id: expect.any(String),
          email: credentials.email
        }),
        session: expect.objectContaining({
          access_token: expect.any(String),
          refresh_token: expect.any(String)
        })
      })
    })

    it('should reject invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      const mockLoginHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(loginRoute as any).POST = mockLoginHandler

      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid credentials'
      })
    })

    it('should handle missing credentials', async () => {
      const mockLoginHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Email and password are required'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(loginRoute as any).POST = mockLoginHandler

      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Email and password are required'
      })
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid session', async () => {
      const mockLogoutHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          message: 'Logged out successfully'
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(logoutRoute as any).POST = mockLogoutHandler

      const response = await request(baseUrl)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock-access-token')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Logged out successfully'
      })
    })

    it('should handle logout without authentication', async () => {
      const mockLogoutHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'No active session found'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(logoutRoute as any).POST = mockLogoutHandler

      const response = await request(baseUrl)
        .post('/api/auth/logout')
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: 'No active session found'
      })
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const refreshData = {
        refresh_token: 'valid-refresh-token'
      }

      const mockRefreshHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(refreshRoute as any).POST = mockRefreshHandler

      const response = await request(baseUrl)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        session: expect.objectContaining({
          access_token: expect.any(String),
          refresh_token: expect.any(String),
          expires_in: expect.any(Number)
        })
      })
    })

    it('should reject invalid refresh token', async () => {
      const refreshData = {
        refresh_token: 'invalid-refresh-token'
      }

      const mockRefreshHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Invalid refresh token'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      ;(refreshRoute as any).POST = mockRefreshHandler

      const response = await request(baseUrl)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid refresh token'
      })
    })
  })
})
