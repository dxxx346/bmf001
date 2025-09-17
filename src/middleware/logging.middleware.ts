import { NextRequest, NextResponse } from 'next/server';
const nanoid = (() => { try { return require('nanoid/non-secure').nanoid } catch { return () => Math.random().toString(36).slice(2) } })();
import { createLogger, logApiRequest, logError, logPerformance } from '@/lib/logger';
import { sentryLogger } from '@/lib/sentry-logger';

// Request logging middleware
export function withLogging(handler: (req: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context?: any) => {
    const startTime = Date.now();
    const correlationId = req.headers.get('x-correlation-id') || nanoid();
    const logger = createLogger(correlationId);

    // Extract request information
    const method = req.method;
    const url = req.url;
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const referer = req.headers.get('referer') || 'direct';

    // Set correlation ID in Sentry
    sentryLogger.setCorrelationId(correlationId);

    // Log incoming request
    logger.info('Incoming API request', {
      method,
      url,
      userAgent,
      ip,
      referer,
      correlationId,
    });

    let response: NextResponse;
    let statusCode = 500;
    let error: Error | null = null;

    try {
      // Execute the handler
      response = await handler(req, context);
      statusCode = response.status;
    } catch (err) {
      error = err as Error;
      statusCode = 500;
      
      // Log error
      logError(error, {
        method,
        url,
        correlationId,
      }, correlationId);

      // Create error response
      response = NextResponse.json(
        { 
          error: 'Internal Server Error',
          correlationId,
          ...(process.env.NODE_ENV === 'development' && { message: error.message })
        },
        { status: 500 }
      );
    }

    // Calculate duration
    const duration = Date.now() - startTime;

    // Log API request completion
    logApiRequest(
      method,
      url,
      statusCode,
      duration,
      {
        userAgent,
        ip,
        referer,
        correlationId,
        error: error ? {
          name: error.name,
          message: error.message,
        } : undefined,
      },
      correlationId
    );

    // Log performance metrics
    logPerformance(
      'api_request',
      duration,
      {
        method,
        url,
        statusCode,
        correlationId,
      },
      correlationId
    );

    // Add correlation ID to response headers
    response.headers.set('x-correlation-id', correlationId);

    return response;
  };
}

// Enhanced logging middleware with more detailed metrics
export function withDetailedLogging(handler: (req: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context?: any) => {
    const startTime = Date.now();
    const correlationId = req.headers.get('x-correlation-id') || nanoid();
    const logger = createLogger(correlationId);

    // Extract detailed request information
    const method = req.method;
    const url = req.url;
    const pathname = new URL(url).pathname;
    const searchParams = new URL(url).searchParams;
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const referer = req.headers.get('referer') || 'direct';
    const contentType = req.headers.get('content-type') || 'unknown';
    const contentLength = req.headers.get('content-length') || '0';
    const acceptLanguage = req.headers.get('accept-language') || 'unknown';
    const acceptEncoding = req.headers.get('accept-encoding') || 'unknown';

    // Set correlation ID in Sentry
    sentryLogger.setCorrelationId(correlationId);

    // Log detailed incoming request
    logger.info('Incoming API request (detailed)', {
      method,
      url,
      pathname,
      searchParams: Object.fromEntries(searchParams),
      userAgent,
      ip,
      referer,
      contentType,
      contentLength: parseInt(contentLength),
      acceptLanguage,
      acceptEncoding,
      correlationId,
      timestamp: new Date().toISOString(),
    });

    let response: NextResponse;
    let statusCode = 500;
    let error: Error | null = null;
    let responseSize = 0;

    try {
      // Execute the handler
      response = await handler(req, context);
      statusCode = response.status;
      
      // Try to get response size
      try {
        const responseText = await response.clone().text();
        responseSize = new Blob([responseText]).size;
      } catch (e) {
        // Ignore if we can't get response size
      }
    } catch (err) {
      error = err as Error;
      statusCode = 500;
      
      // Log detailed error
      logError(error, {
        method,
        url,
        pathname,
        correlationId,
        userAgent,
        ip,
      }, correlationId);

      // Create error response
      response = NextResponse.json(
        { 
          error: 'Internal Server Error',
          correlationId,
          ...(process.env.NODE_ENV === 'development' && { message: error.message })
        },
        { status: 500 }
      );
    }

    // Calculate duration
    const duration = Date.now() - startTime;

    // Log detailed API request completion
    logApiRequest(
      method,
      url,
      statusCode,
      duration,
      {
        pathname,
        searchParams: Object.fromEntries(searchParams),
        userAgent,
        ip,
        referer,
        contentType,
        requestSize: parseInt(contentLength),
        responseSize,
        acceptLanguage,
        acceptEncoding,
        correlationId,
        error: error ? {
          name: error.name,
          message: error.message,
        } : undefined,
      },
      correlationId
    );

    // Log performance metrics
    logPerformance(
      'api_request_detailed',
      duration,
      {
        method,
        pathname,
        statusCode,
        requestSize: parseInt(contentLength),
        responseSize,
        correlationId,
      },
      correlationId
    );

    // Log business metrics based on endpoint
    if (pathname.includes('/auth/register')) {
      sentryLogger.trackBusinessMetric('user_registration_attempt', {
        method,
        userAgent,
        ip,
        correlationId,
      }, correlationId);
    } else if (pathname.includes('/auth/login')) {
      sentryLogger.trackBusinessMetric('user_login_attempt', {
        method,
        userAgent,
        ip,
        correlationId,
      }, correlationId);
    } else if (pathname.includes('/products/') && method === 'POST') {
      sentryLogger.trackBusinessMetric('product_creation_attempt', {
        method,
        pathname,
        correlationId,
      }, correlationId);
    } else if (pathname.includes('/purchases/') && method === 'POST') {
      sentryLogger.trackBusinessMetric('purchase_attempt', {
        method,
        pathname,
        correlationId,
      }, correlationId);
    }

    // Add correlation ID to response headers
    response.headers.set('x-correlation-id', correlationId);

    return response;
  };
}

// Database query logging wrapper
export function withDatabaseLogging<T extends any[], R>(
  queryName: string,
  queryFn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const correlationId = nanoid();
    const logger = createLogger(correlationId);

    logger.debug('Database query started', {
      queryName,
      correlationId,
      args: args.length > 0 ? args : undefined,
    });

    try {
      const result = await queryFn(...args);
      const duration = Date.now() - startTime;

      logger.debug('Database query completed', {
        queryName,
        duration,
        unit: 'ms',
        correlationId,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logError(error as Error, {
        queryName,
        duration,
        correlationId,
      }, correlationId);

      throw error;
    }
  };
}

// Performance monitoring wrapper
export function withPerformanceMonitoring<T extends any[], R>(
  operationName: string,
  operationFn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const correlationId = nanoid();
    const logger = createLogger(correlationId);

    logger.debug('Operation started', {
      operationName,
      correlationId,
    });

    try {
      const result = await operationFn(...args);
      const duration = Date.now() - startTime;

      logPerformance(
        operationName,
        duration,
        {
          correlationId,
          success: true,
        },
        correlationId
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logError(error as Error, {
        operationName,
        duration,
        correlationId,
      }, correlationId);

      logPerformance(
        operationName,
        duration,
        {
          correlationId,
          success: false,
          error: (error as Error).message,
        },
        correlationId
      );

      throw error;
    }
  };
}

// Rate limiting logging
export function logRateLimit(
  ip: string,
  endpoint: string,
  limit: number,
  remaining: number,
  resetTime: number,
  correlationId?: string
) {
  const logger = createLogger(correlationId);
  
  logger.warn('Rate limit warning', {
    ip,
    endpoint,
    limit,
    remaining,
    resetTime: new Date(resetTime).toISOString(),
    correlationId,
  });

  sentryLogger.trackSecurityEvent('rate_limit_warning', {
    ip,
    endpoint,
    limit,
    remaining,
    resetTime,
  }, correlationId);
}

// Security event logging
export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  correlationId?: string
) {
  const logger = createLogger(correlationId);
  
  logger.warn('Security event', {
    event,
    ...details,
    correlationId,
  });

  sentryLogger.trackSecurityEvent(event, details, correlationId);
}
