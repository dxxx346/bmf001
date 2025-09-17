import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/middleware/logging.middleware';
import { createLogger } from '@/lib/logger';
import { sentryLogger } from '@/lib/sentry-logger';
import { 
  trackUserRegistration, 
  trackProductPurchase, 
  trackPaymentSuccess,
  performanceMetrics,
  businessMetrics 
} from '@/lib/metrics';

// Example API route with comprehensive logging
async function handler(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') || 'example-123';
  const logger = createLogger(correlationId);

  try {
    // Log incoming request details
    logger.info('Processing example request', {
      method: req.method,
      url: req.url,
      correlationId,
    });

    // Simulate some business logic
    const startTime = Date.now();
    
    // Example: User registration tracking
    trackUserRegistration('user-123', {
      email: 'user@example.com',
      source: 'api',
    }, correlationId);

    // Example: Product purchase tracking
    trackProductPurchase('product-456', 'user-123', 99.99, {
      currency: 'USD',
      paymentMethod: 'stripe',
    }, correlationId);

    // Example: Payment success tracking
    trackPaymentSuccess('payment-789', 99.99, 'stripe', {
      transactionId: 'txn_123456789',
    }, correlationId);

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    const duration = Date.now() - startTime;

    // Log performance metrics
    performanceMetrics.record('example_processing', duration, {
      operation: 'example_request',
    }, correlationId);

    // Log business metrics
    businessMetrics.record('example_event', 1, {
      type: 'api_call',
      endpoint: '/api/example-logging',
    }, correlationId);

    // Set user context in Sentry
    sentryLogger.setUserContext({
      id: 'user-123',
      email: 'user@example.com',
      role: 'buyer',
    });

    // Log success
    logger.info('Example request completed successfully', {
      duration,
      correlationId,
    });

    return NextResponse.json({
      success: true,
      message: 'Example request processed successfully',
      correlationId,
      duration,
    });

  } catch (error) {
    // Log error with context
    logger.error('Example request failed', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      correlationId,
    });

    // Track error in Sentry
    sentryLogger.captureException(error as Error, {
      endpoint: '/api/example-logging',
      method: req.method,
    }, correlationId);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal Server Error',
        correlationId,
      },
      { status: 500 }
    );
  }
}

// Export the handler wrapped with logging middleware
export const GET = withLogging(handler);
export const POST = withLogging(handler);
