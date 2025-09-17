import winston from 'winston';
import { nanoid } from 'nanoid/non-secure';

// Use a lightweight uuid fallback to avoid ESM nanoid issues under Jest
const uuidv4 = () => {
  try {
    return nanoid();
  } catch {
    return Math.random().toString(36).slice(2);
  }
};

// Log levels configuration
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Custom log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Custom format for structured JSON logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, ...meta } = info;
    return JSON.stringify({
      timestamp,
      level,
      message,
      correlationId: correlationId || 'no-correlation-id',
      ...meta,
    });
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}] [${correlationId || 'no-correlation-id'}] ${message} ${metaStr}`;
  })
);

// Create the logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  defaultMeta: {
    service: 'bmf001-marketplace',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
    }),
  ],
});

// Add file transports for production
if (process.env.NODE_ENV === 'production') {
  // Error logs
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined logs
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create a child logger with correlation ID
export const createLogger = (correlationId?: string) => {
  return logger.child({ correlationId: correlationId || uuidv4() });
};

// Default logger instance
export const defaultLogger = createLogger();

// Performance metrics logger
export const performanceLogger = createLogger('performance');

// Business metrics logger
export const businessLogger = createLogger('business');

// Error logger
export const errorLogger = createLogger('error');

// API request logger
export const apiLogger = createLogger('api');

// Database query logger
export const dbLogger = createLogger('database');

// Payment logger
export const paymentLogger = createLogger('payment');

// User activity logger
export const userLogger = createLogger('user');

// Shop activity logger
export const shopLogger = createLogger('shop');

// Product activity logger
export const productLogger = createLogger('product');

// Referral logger
export const referralLogger = createLogger('referral');

// Webhook logger
export const webhookLogger = createLogger('webhook');

// Job queue logger
export const jobLogger = createLogger('job');

// Cache logger
export const cacheLogger = createLogger('cache');

// Security logger
export const securityLogger = createLogger('security');

// Export the main logger
export default logger;
export { logger };

// Utility functions for common logging patterns
export const logError = (error: Error, context?: Record<string, any>, correlationId?: string) => {
  const logger = correlationId ? createLogger(correlationId) : errorLogger;
  logger.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  });
};

export const logInfo = (message: string, data?: Record<string, any>, correlationId?: string) => {
  const loggerInstance = correlationId ? createLogger(correlationId) : defaultLogger;
  loggerInstance.info(message, data);
};

export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : performanceLogger;
  logger.info('Performance metric', {
    operation,
    duration,
    unit: 'ms',
    ...metadata,
  });
};

export const logBusinessMetric = (
  event: string,
  data: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : businessLogger;
  logger.info('Business metric', {
    event,
    ...data,
  });
};

export const logApiRequest = (
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : apiLogger;
  logger.http('API request', {
    method,
    url,
    statusCode,
    duration,
    unit: 'ms',
    ...metadata,
  });
};

export const logDatabaseQuery = (
  query: string,
  duration: number,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : dbLogger;
  logger.debug('Database query', {
    query: query.replace(/\s+/g, ' ').trim(),
    duration,
    unit: 'ms',
    ...metadata,
  });
};

export const logUserActivity = (
  userId: string,
  action: string,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : userLogger;
  logger.info('User activity', {
    userId,
    action,
    ...metadata,
  });
};

export const logShopActivity = (
  shopId: string,
  action: string,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : shopLogger;
  logger.info('Shop activity', {
    shopId,
    action,
    ...metadata,
  });
};

export const logProductActivity = (
  productId: string,
  action: string,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : productLogger;
  logger.info('Product activity', {
    productId,
    action,
    ...metadata,
  });
};

export const logPaymentActivity = (
  paymentId: string,
  action: string,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : paymentLogger;
  logger.info('Payment activity', {
    paymentId,
    action,
    ...metadata,
  });
};

export const logReferralActivity = (
  referralId: string,
  action: string,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : referralLogger;
  logger.info('Referral activity', {
    referralId,
    action,
    ...metadata,
  });
};

export const logWebhookActivity = (
  webhookType: string,
  action: string,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : webhookLogger;
  logger.info('Webhook activity', {
    webhookType,
    action,
    ...metadata,
  });
};

export const logJobActivity = (
  jobId: string,
  queueName: string,
  action: string,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : jobLogger;
  logger.info('Job activity', {
    jobId,
    queueName,
    action,
    ...metadata,
  });
};

export const logCacheActivity = (
  operation: string,
  key: string,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : cacheLogger;
  logger.debug('Cache activity', {
    operation,
    key,
    ...metadata,
  });
};

export const logSecurityEvent = (
  event: string,
  metadata?: Record<string, any>,
  correlationId?: string
) => {
  const logger = correlationId ? createLogger(correlationId) : securityLogger;
  logger.warn('Security event', {
    event,
    ...metadata,
  });
};