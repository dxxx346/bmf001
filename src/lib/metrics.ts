import { createLogger, logPerformance, logBusinessMetric } from './logger';
import { sentryLogger } from './sentry-logger';

// Performance metrics collector
export class PerformanceMetrics {
  private static instance: PerformanceMetrics;
  private metrics: Map<string, { count: number; totalDuration: number; minDuration: number; maxDuration: number }> = new Map();

  static getInstance(): PerformanceMetrics {
    if (!PerformanceMetrics.instance) {
      PerformanceMetrics.instance = new PerformanceMetrics();
    }
    return PerformanceMetrics.instance;
  }

  // Record a performance metric
  record(operation: string, duration: number, metadata?: Record<string, any>, correlationId?: string) {
    const logger = createLogger(correlationId);
    
    // Log individual metric
    logPerformance(operation, duration, metadata, correlationId);

    // Update aggregated metrics
    const existing = this.metrics.get(operation) || { count: 0, totalDuration: 0, minDuration: Infinity, maxDuration: 0 };
    existing.count++;
    existing.totalDuration += duration;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    this.metrics.set(operation, existing);

    // Log to Sentry
    sentryLogger.trackPerformance(operation, duration, metadata, correlationId);
  }

  // Get aggregated metrics for an operation
  getMetrics(operation: string) {
    return this.metrics.get(operation);
  }

  // Get all metrics
  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Reset metrics
  reset() {
    this.metrics.clear();
  }

  // Log summary metrics
  logSummary(correlationId?: string) {
    const logger = createLogger(correlationId);
    
    for (const [operation, metrics] of this.metrics) {
      const avgDuration = metrics.totalDuration / metrics.count;
      
      logger.info('Performance summary', {
        operation,
        count: metrics.count,
        avgDuration: Math.round(avgDuration * 100) / 100,
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
        maxDuration: metrics.maxDuration,
        totalDuration: metrics.totalDuration,
        correlationId,
      });
    }
  }
}

// Business metrics collector
export class BusinessMetrics {
  private static instance: BusinessMetrics;
  private metrics: Map<string, { count: number; totalValue: number; metadata: any[] }> = new Map();

  static getInstance(): BusinessMetrics {
    if (!BusinessMetrics.instance) {
      BusinessMetrics.instance = new BusinessMetrics();
    }
    return BusinessMetrics.instance;
  }

  // Record a business metric
  record(event: string, value: number = 1, metadata?: Record<string, any>, correlationId?: string) {
    const logger = createLogger(correlationId);
    
    // Log individual metric
    logBusinessMetric(event, { value, ...metadata }, correlationId);

    // Update aggregated metrics
    const existing = this.metrics.get(event) || { count: 0, totalValue: 0, metadata: [] };
    existing.count++;
    existing.totalValue += value;
    if (metadata) {
      existing.metadata.push(metadata);
    }
    this.metrics.set(event, existing);

    // Log to Sentry
    sentryLogger.trackBusinessMetric(event, { value, ...metadata }, correlationId);
  }

  // Get aggregated metrics for an event
  getMetrics(event: string) {
    return this.metrics.get(event);
  }

  // Get all metrics
  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Reset metrics
  reset() {
    this.metrics.clear();
  }

  // Log summary metrics
  logSummary(correlationId?: string) {
    const logger = createLogger(correlationId);
    
    for (const [event, metrics] of this.metrics) {
      const avgValue = metrics.totalValue / metrics.count;
      
      logger.info('Business metrics summary', {
        event,
        count: metrics.count,
        totalValue: metrics.totalValue,
        avgValue: Math.round(avgValue * 100) / 100,
        correlationId,
      });
    }
  }
}

// Database query performance tracker
export class DatabaseMetrics {
  private static instance: DatabaseMetrics;
  private queryMetrics: Map<string, { count: number; totalDuration: number; minDuration: number; maxDuration: number }> = new Map();

  static getInstance(): DatabaseMetrics {
    if (!DatabaseMetrics.instance) {
      DatabaseMetrics.instance = new DatabaseMetrics();
    }
    return DatabaseMetrics.instance;
  }

  // Record a database query
  recordQuery(query: string, duration: number, metadata?: Record<string, any>, correlationId?: string) {
    const logger = createLogger(correlationId);
    const normalizedQuery = this.normalizeQuery(query);
    
    // Log individual query
    logger.debug('Database query', {
      query: normalizedQuery,
      duration,
      unit: 'ms',
      ...metadata,
      correlationId,
    });

    // Update aggregated metrics
    const existing = this.queryMetrics.get(normalizedQuery) || { count: 0, totalDuration: 0, minDuration: Infinity, maxDuration: 0 };
    existing.count++;
    existing.totalDuration += duration;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    this.queryMetrics.set(normalizedQuery, existing);

    // Log to Sentry
    sentryLogger.trackDatabaseQuery(query, duration, metadata, correlationId);
  }

  // Normalize query for aggregation (remove specific values)
  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .replace(/'[^']*'/g, "'?'") // Replace string literals
      .replace(/\d+/g, '?') // Replace numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Get slow queries (above threshold)
  getSlowQueries(threshold: number = 1000) {
    const slowQueries: Array<{ query: string; metrics: any }> = [];
    
    for (const [query, metrics] of this.queryMetrics) {
      const avgDuration = metrics.totalDuration / metrics.count;
      if (avgDuration > threshold) {
        slowQueries.push({
          query,
          metrics: {
            ...metrics,
            avgDuration: metrics.totalDuration / metrics.count,
          },
        });
      }
    }
    
    return slowQueries.sort((a, b) => b.metrics.avgDuration - a.metrics.avgDuration);
  }

  // Get query metrics
  getQueryMetrics(query: string) {
    return this.queryMetrics.get(query);
  }

  // Get all query metrics
  getAllQueryMetrics() {
    return Object.fromEntries(this.queryMetrics);
  }

  // Reset metrics
  reset() {
    this.queryMetrics.clear();
  }

  // Log summary metrics
  logSummary(correlationId?: string) {
    const logger = createLogger(correlationId);
    
    for (const [query, metrics] of this.queryMetrics) {
      const avgDuration = metrics.totalDuration / metrics.count;
      
      logger.info('Database query summary', {
        query,
        count: metrics.count,
        avgDuration: Math.round(avgDuration * 100) / 100,
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
        maxDuration: metrics.maxDuration,
        totalDuration: metrics.totalDuration,
        correlationId,
      });
    }
  }
}

// API response time tracker
export class ApiMetrics {
  private static instance: ApiMetrics;
  private endpointMetrics: Map<string, { count: number; totalDuration: number; minDuration: number; maxDuration: number; statusCodes: Map<number, number> }> = new Map();

  static getInstance(): ApiMetrics {
    if (!ApiMetrics.instance) {
      ApiMetrics.instance = new ApiMetrics();
    }
    return ApiMetrics.instance;
  }

  // Record an API request
  recordRequest(method: string, endpoint: string, duration: number, statusCode: number, metadata?: Record<string, any>, correlationId?: string) {
    const logger = createLogger(correlationId);
    const key = `${method} ${endpoint}`;
    
    // Log individual request
    logger.http('API request', {
      method,
      endpoint,
      duration,
      statusCode,
      unit: 'ms',
      ...metadata,
      correlationId,
    });

    // Update aggregated metrics
    const existing = this.endpointMetrics.get(key) || { 
      count: 0, 
      totalDuration: 0, 
      minDuration: Infinity, 
      maxDuration: 0, 
      statusCodes: new Map() 
    };
    existing.count++;
    existing.totalDuration += duration;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    
    const statusCount = existing.statusCodes.get(statusCode) || 0;
    existing.statusCodes.set(statusCode, statusCount + 1);
    
    this.endpointMetrics.set(key, existing);

    // Log to Sentry
    sentryLogger.trackApiRequest(method, endpoint, statusCode, duration, metadata, correlationId);
  }

  // Get endpoint metrics
  getEndpointMetrics(method: string, endpoint: string) {
    const key = `${method} ${endpoint}`;
    return this.endpointMetrics.get(key);
  }

  // Get all endpoint metrics
  getAllEndpointMetrics() {
    const result: Record<string, any> = {};
    
    for (const [key, metrics] of this.endpointMetrics) {
      result[key] = {
        ...metrics,
        statusCodes: Object.fromEntries(metrics.statusCodes),
        avgDuration: metrics.totalDuration / metrics.count,
      };
    }
    
    return result;
  }

  // Get slow endpoints (above threshold)
  getSlowEndpoints(threshold: number = 1000) {
    const slowEndpoints: Array<{ endpoint: string; metrics: any }> = [];
    
    for (const [endpoint, metrics] of this.endpointMetrics) {
      const avgDuration = metrics.totalDuration / metrics.count;
      if (avgDuration > threshold) {
        slowEndpoints.push({
          endpoint,
          metrics: {
            ...metrics,
            avgDuration,
            statusCodes: Object.fromEntries(metrics.statusCodes),
          },
        });
      }
    }
    
    return slowEndpoints.sort((a, b) => b.metrics.avgDuration - a.metrics.avgDuration);
  }

  // Reset metrics
  reset() {
    this.endpointMetrics.clear();
  }

  // Log summary metrics
  logSummary(correlationId?: string) {
    const logger = createLogger(correlationId);
    
    for (const [endpoint, metrics] of this.endpointMetrics) {
      const avgDuration = metrics.totalDuration / metrics.count;
      
      logger.info('API endpoint summary', {
        endpoint,
        count: metrics.count,
        avgDuration: Math.round(avgDuration * 100) / 100,
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
        maxDuration: metrics.maxDuration,
        totalDuration: metrics.totalDuration,
        statusCodes: Object.fromEntries(metrics.statusCodes),
        correlationId,
      });
    }
  }
}

// Export singleton instances
export const performanceMetrics = PerformanceMetrics.getInstance();
export const businessMetrics = BusinessMetrics.getInstance();
export const databaseMetrics = DatabaseMetrics.getInstance();
export const apiMetrics = ApiMetrics.getInstance();

// Utility functions for common metrics
export const trackUserRegistration = (userId: string, metadata?: Record<string, any>, correlationId?: string) => {
  businessMetrics.record('user_registration', 1, { userId, ...metadata }, correlationId);
};

export const trackUserLogin = (userId: string, metadata?: Record<string, any>, correlationId?: string) => {
  businessMetrics.record('user_login', 1, { userId, ...metadata }, correlationId);
};

export const trackProductView = (productId: string, userId?: string, metadata?: Record<string, any>, correlationId?: string) => {
  businessMetrics.record('product_view', 1, { productId, userId, ...metadata }, correlationId);
};

export const trackProductPurchase = (productId: string, userId: string, amount: number, metadata?: Record<string, any>, correlationId?: string) => {
  businessMetrics.record('product_purchase', amount, { productId, userId, ...metadata }, correlationId);
};

export const trackShopCreation = (shopId: string, userId: string, metadata?: Record<string, any>, correlationId?: string) => {
  businessMetrics.record('shop_creation', 1, { shopId, userId, ...metadata }, correlationId);
};

export const trackReferralClick = (referralId: string, productId: string, metadata?: Record<string, any>, correlationId?: string) => {
  businessMetrics.record('referral_click', 1, { referralId, productId, ...metadata }, correlationId);
};

export const trackReferralPurchase = (referralId: string, productId: string, amount: number, metadata?: Record<string, any>, correlationId?: string) => {
  businessMetrics.record('referral_purchase', amount, { referralId, productId, ...metadata }, correlationId);
};

export const trackPaymentSuccess = (paymentId: string, amount: number, provider: string, metadata?: Record<string, any>, correlationId?: string) => {
  businessMetrics.record('payment_success', amount, { paymentId, provider, ...metadata }, correlationId);
};

export const trackPaymentFailure = (paymentId: string, amount: number, provider: string, error: string, metadata?: Record<string, any>, correlationId?: string) => {
  businessMetrics.record('payment_failure', 1, { paymentId, provider, amount, error, ...metadata }, correlationId);
};
