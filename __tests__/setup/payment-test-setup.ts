/**
 * Payment Service Test Setup
 * Global test configuration and setup for payment service tests
 */

import { PaymentTestEnvironment } from '../utils/payment-test-helpers';

// Global test setup
beforeAll(() => {
  PaymentTestEnvironment.setupTestEnvironment();
  PaymentTestEnvironment.mockExternalAPIs();
});

afterAll(() => {
  PaymentTestEnvironment.cleanupTestEnvironment();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
process.env.YOOKASSA_SHOP_ID = 'test-shop-123';
process.env.YOOKASSA_SECRET_KEY = 'test-secret-key';
process.env.COINGATE_API_TOKEN = 'test-coingate-token';
process.env.COINGATE_WEBHOOK_SECRET = 'test-coingate-webhook-secret';
process.env.NODE_ENV = 'test';

// Global fetch mock
global.fetch = jest.fn();

// Mock timers for testing retry logic
jest.useFakeTimers();

export {};
