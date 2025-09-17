import * as Sentry from '@sentry/nextjs';
import { createLogger } from './logger';

// Sentry configuration
export const configureSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
    beforeSend(event, hint) {
      // Add correlation ID to Sentry events
      if (hint?.originalException) {
        const error = hint.originalException as Error;
        if (error.message?.includes('correlationId:')) {
          const correlationId = error.message.match(/correlationId:([a-f0-9-]+)/)?.[1];
          if (correlationId) {
            event.tags = {
              ...event.tags,
              correlationId,
            };
          }
        }
      }
      return event;
    },
  });
};

// Sentry-integrated logger
export class SentryLogger {
  private logger = createLogger();

  error(message: string, error?: Error, context?: Record<string, any>, correlationId?: string) {
    // Log to Winston
    this.logger.error(message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      context,
      correlationId,
    });

    // Send to Sentry
    Sentry.withScope((scope) => {
      if (correlationId) {
        scope.setTag('correlationId', correlationId);
      }
      
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
      }

      if (error) {
        scope.setLevel('error');
        Sentry.captureException(error);
      } else {
        scope.setLevel('error');
        Sentry.captureMessage(message);
      }
    });
  }

  warn(message: string, context?: Record<string, any>, correlationId?: string) {
    this.logger.warn(message, { context, correlationId });

    Sentry.withScope((scope) => {
      if (correlationId) {
        scope.setTag('correlationId', correlationId);
      }
      
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
      }

      scope.setLevel('warning');
      Sentry.captureMessage(message);
    });
  }

  info(message: string, context?: Record<string, any>, correlationId?: string) {
    this.logger.info(message, { context, correlationId });
  }

  debug(message: string, context?: Record<string, any>, correlationId?: string) {
    this.logger.debug(message, { context, correlationId });
  }

  // Business metrics that should be tracked in Sentry
  trackBusinessMetric(event: string, data: Record<string, any>, correlationId?: string) {
    this.logger.info('Business metric', { event, ...data, correlationId });

    Sentry.addBreadcrumb({
      category: 'business',
      message: event,
      data,
      level: 'info',
    });
  }

  // Performance metrics
  trackPerformance(operation: string, duration: number, metadata?: Record<string, any>, correlationId?: string) {
    this.logger.info('Performance metric', { operation, duration, unit: 'ms', ...metadata, correlationId });

    Sentry.addBreadcrumb({
      category: 'performance',
      message: operation,
      data: { duration, ...metadata },
      level: 'info',
    });
  }

  // User activity tracking
  trackUserActivity(userId: string, action: string, metadata?: Record<string, any>, correlationId?: string) {
    this.logger.info('User activity', { userId, action, ...metadata, correlationId });

    Sentry.addBreadcrumb({
      category: 'user',
      message: action,
      data: { userId, ...metadata },
      level: 'info',
    });
  }

  // API request tracking
  trackApiRequest(method: string, url: string, statusCode: number, duration: number, metadata?: Record<string, any>, correlationId?: string) {
    this.logger.http('API request', { method, url, statusCode, duration, unit: 'ms', ...metadata, correlationId });

    Sentry.addBreadcrumb({
      category: 'http',
      message: `${method} ${url}`,
      data: { statusCode, duration, ...metadata },
      level: statusCode >= 400 ? 'error' : 'info',
    });
  }

  // Database query tracking
  trackDatabaseQuery(query: string, duration: number, metadata?: Record<string, any>, correlationId?: string) {
    this.logger.debug('Database query', { query: query.replace(/\s+/g, ' ').trim(), duration, unit: 'ms', ...metadata, correlationId });

    Sentry.addBreadcrumb({
      category: 'database',
      message: 'Database query',
      data: { query: query.replace(/\s+/g, ' ').trim(), duration, ...metadata },
      level: 'debug',
    });
  }

  // Payment tracking
  trackPayment(paymentId: string, action: string, metadata?: Record<string, any>, correlationId?: string) {
    this.logger.info('Payment activity', { paymentId, action, ...metadata, correlationId });

    Sentry.addBreadcrumb({
      category: 'payment',
      message: action,
      data: { paymentId, ...metadata },
      level: 'info',
    });
  }

  // Security event tracking
  trackSecurityEvent(event: string, metadata?: Record<string, any>, correlationId?: string) {
    this.logger.warn('Security event', { event, ...metadata, correlationId });

    Sentry.withScope((scope) => {
      if (correlationId) {
        scope.setTag('correlationId', correlationId);
      }
      
      if (metadata) {
        Object.keys(metadata).forEach(key => {
          scope.setContext(key, metadata[key]);
        });
      }

      scope.setLevel('warning');
      scope.setTag('security', true);
      Sentry.captureMessage(`Security event: ${event}`);
    });
  }

  // Set user context for Sentry
  setUserContext(user: { id: string; email?: string; role?: string }) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  // Clear user context
  clearUserContext() {
    Sentry.setUser(null);
  }

  // Set correlation ID for current scope
  setCorrelationId(correlationId: string) {
    Sentry.setTag('correlationId', correlationId);
  }

  // Capture exception with context
  captureException(error: Error, context?: Record<string, any>, correlationId?: string) {
    Sentry.withScope((scope) => {
      if (correlationId) {
        scope.setTag('correlationId', correlationId);
      }
      
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
      }

      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  // Capture message with context
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>, correlationId?: string) {
    Sentry.withScope((scope) => {
      if (correlationId) {
        scope.setTag('correlationId', correlationId);
      }
      
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
      }

      scope.setLevel(level);
      Sentry.captureMessage(message);
    });
  }
}

// Export singleton instance
export const sentryLogger = new SentryLogger();

// Export individual functions for convenience
export const {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
  trackBusinessMetric,
  trackPerformance,
  trackUserActivity,
  trackApiRequest,
  trackDatabaseQuery,
  trackPayment,
  trackSecurityEvent,
  setUserContext,
  clearUserContext,
  setCorrelationId,
  captureException,
  captureMessage,
} = sentryLogger;
