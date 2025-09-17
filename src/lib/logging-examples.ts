// Examples of how to integrate logging into existing API routes and services

import { createLogger } from './logger';
import { sentryLogger } from './sentry-logger';
import { 
  trackUserRegistration,
  trackUserLogin,
  trackProductPurchase,
  trackPaymentSuccess,
  performanceMetrics,
  businessMetrics
} from './metrics';

// Example 1: Authentication API Route
export async function logAuthRequest(
  action: 'login' | 'register' | 'logout',
  userId?: string,
  email?: string,
  success: boolean = true,
  error?: Error,
  correlationId?: string
) {
  const logger = createLogger(correlationId);

  if (action === 'register' && success) {
    trackUserRegistration(userId!, { email, source: 'api' }, correlationId);
  }

  if (action === 'login' && success) {
    trackUserLogin(userId!, { email, method: 'email' }, correlationId);
  }

  if (success) {
    logger.info(`User ${action} successful`, { userId, email, correlationId });
  } else {
    logger.error(`User ${action} failed`, { 
      userId, 
      email, 
      error: error?.message,
      correlationId 
    });
    
    if (error) {
      sentryLogger.captureException(error, { action, userId, email }, correlationId);
    }
  }
}

// Example 2: Product Service Integration
export async function logProductOperation(
  operation: 'create' | 'update' | 'delete' | 'view' | 'purchase',
  productId: string,
  userId?: string,
  metadata?: Record<string, any>,
  correlationId?: string
) {
  const logger = createLogger(correlationId);

  logger.info(`Product ${operation}`, {
    productId,
    userId,
    operation,
    ...metadata,
    correlationId,
  });

  if (operation === 'purchase' && userId) {
    trackProductPurchase(productId, userId, metadata?.amount || 0, metadata, correlationId);
  }

  if (operation === 'view') {
    businessMetrics.record('product_view', 1, { productId, userId, ...metadata }, correlationId);
  }
}

// Example 3: Payment Service Integration
export async function logPaymentOperation(
  operation: 'initiate' | 'process' | 'complete' | 'fail' | 'refund',
  paymentId: string,
  amount: number,
  currency: string = 'USD',
  provider: string,
  userId?: string,
  metadata?: Record<string, any>,
  correlationId?: string
) {
  const logger = createLogger(correlationId);

  logger.info(`Payment ${operation}`, {
    paymentId,
    amount,
    currency,
    provider,
    userId,
    operation,
    ...metadata,
    correlationId,
  });

  if (operation === 'complete') {
    trackPaymentSuccess(paymentId, amount, provider, { userId, currency, ...metadata }, correlationId);
  }

  if (operation === 'fail') {
    businessMetrics.record('payment_failure', 1, {
      paymentId,
      amount,
      provider,
      userId,
      ...metadata,
    }, correlationId);
  }

  // Set user context for Sentry
  if (userId) {
    sentryLogger.setUserContext({ id: userId });
  }
}

// Example 4: Database Operation Wrapper
export async function logDatabaseOperation<T>(
  operation: string,
  query: string,
  operationFn: () => Promise<T>,
  correlationId?: string
): Promise<T> {
  const logger = createLogger(correlationId);
  const startTime = Date.now();

  logger.debug(`Database ${operation} started`, {
    query: query.replace(/\s+/g, ' ').trim(),
    correlationId,
  });

  try {
    const result = await operationFn();
    const duration = Date.now() - startTime;

    logger.debug(`Database ${operation} completed`, {
      query: query.replace(/\s+/g, ' ').trim(),
      duration,
      success: true,
      correlationId,
    });

    // Track performance
    performanceMetrics.record(`db_${operation}`, duration, { query }, correlationId);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`Database ${operation} failed`, {
      query: query.replace(/\s+/g, ' ').trim(),
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId,
    });

    // Track error in Sentry
    sentryLogger.captureException(error as Error, {
      operation: `db_${operation}`,
      query: query.replace(/\s+/g, ' ').trim(),
    }, correlationId);

    throw error;
  }
}

// Example 5: Shop Management Integration
export async function logShopOperation(
  operation: 'create' | 'update' | 'delete' | 'view',
  shopId: string,
  userId: string,
  metadata?: Record<string, any>,
  correlationId?: string
) {
  const logger = createLogger(correlationId);

  logger.info(`Shop ${operation}`, {
    shopId,
    userId,
    operation,
    ...metadata,
    correlationId,
  });

  if (operation === 'create') {
    businessMetrics.record('shop_creation', 1, { shopId, userId, ...metadata }, correlationId);
  }

  if (operation === 'view') {
    businessMetrics.record('shop_view', 1, { shopId, userId, ...metadata }, correlationId);
  }
}

// Example 6: Referral System Integration
export async function logReferralOperation(
  operation: 'click' | 'purchase' | 'signup',
  referralId: string,
  productId?: string,
  userId?: string,
  amount?: number,
  metadata?: Record<string, any>,
  correlationId?: string
) {
  const logger = createLogger(correlationId);

  logger.info(`Referral ${operation}`, {
    referralId,
    productId,
    userId,
    amount,
    operation,
    ...metadata,
    correlationId,
  });

  if (operation === 'click') {
    businessMetrics.record('referral_click', 1, { referralId, productId, ...metadata }, correlationId);
  }

  if (operation === 'purchase' && amount) {
    businessMetrics.record('referral_purchase', amount, { referralId, productId, userId, ...metadata }, correlationId);
  }
}

// Example 7: Error Handling Wrapper
export async function withErrorLogging<T>(
  operation: string,
  operationFn: () => Promise<T>,
  context?: Record<string, any>,
  correlationId?: string
): Promise<T> {
  const logger = createLogger(correlationId);

  try {
    logger.debug(`${operation} started`, { ...context, correlationId });
    const result = await operationFn();
    logger.debug(`${operation} completed`, { ...context, correlationId });
    return result;
  } catch (error) {
    logger.error(`${operation} failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      ...context,
      correlationId,
    });

    sentryLogger.captureException(error as Error, {
      operation,
      ...context,
    }, correlationId);

    throw error;
  }
}

// Example 8: Performance Monitoring Wrapper
export async function withPerformanceMonitoring<T>(
  operation: string,
  operationFn: () => Promise<T>,
  metadata?: Record<string, any>,
  correlationId?: string
): Promise<T> {
  const startTime = Date.now();
  const logger = createLogger(correlationId);

  try {
    logger.debug(`${operation} started`, { ...metadata, correlationId });
    const result = await operationFn();
    const duration = Date.now() - startTime;

    logger.debug(`${operation} completed`, { 
      duration, 
      ...metadata, 
      correlationId 
    });

    // Track performance
    performanceMetrics.record(operation, duration, metadata, correlationId);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`${operation} failed`, {
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...metadata,
      correlationId,
    });

    // Track failed performance
    performanceMetrics.record(`${operation}_failed`, duration, { 
      ...metadata, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, correlationId);

    throw error;
  }
}

// Example 9: API Route Integration Helper
export function createApiLogger(correlationId?: string) {
  const logger = createLogger(correlationId);

  return {
    logRequest: (method: string, url: string, metadata?: Record<string, any>) => {
      logger.info('API request', { method, url, ...metadata, correlationId });
    },

    logResponse: (method: string, url: string, statusCode: number, duration: number, metadata?: Record<string, any>) => {
      logger.info('API response', { 
        method, 
        url, 
        statusCode, 
        duration, 
        ...metadata, 
        correlationId 
      });
    },

    logError: (error: Error, method: string, url: string, metadata?: Record<string, any>) => {
      logger.error('API error', {
        error: error.message,
        method,
        url,
        ...metadata,
        correlationId,
      });

      sentryLogger.captureException(error, {
        method,
        url,
        ...metadata,
      }, correlationId);
    },

    trackBusinessEvent: (event: string, data: Record<string, any>) => {
      businessMetrics.record(event, 1, data, correlationId);
    },
  };
}
