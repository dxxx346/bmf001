import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/services/monitoring.service';
import logger from '@/lib/logger';

export function withMonitoring(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let response: NextResponse;

    try {
      response = await handler(request);
    } catch (error) {
      // Record error
      monitoringService.recordError(error, {
        endpoint: request.nextUrl.pathname,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      });

      // Re-throw the error
      throw error;
    }

    // Record response time
    const duration = Date.now() - startTime;
    monitoringService.recordResponseTime(duration);

    // Record slow requests
    if (duration > 1000) { // More than 1 second
      logger.warn('Slow request detected', {
        endpoint: request.nextUrl.pathname,
        method: request.method,
        duration,
        userAgent: request.headers.get('user-agent'),
      });
    }

    // Record errors from response
    if (response.status >= 400) {
      monitoringService.recordError(
        new Error(`HTTP ${response.status}`),
        {
          endpoint: request.nextUrl.pathname,
          method: request.method,
          statusCode: response.status,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        }
      );
    }

    return response;
  };
}
