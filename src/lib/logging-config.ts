import winston from 'winston';
import { nanoid } from 'nanoid/non-secure';
import DailyRotateFile from 'winston-daily-rotate-file';
import { createLogger } from './logger';
import { configureSentry } from './sentry-logger';

// Configure Sentry on import
configureSentry();

// Logging configuration
export const LOGGING_CONFIG = {
  // Log levels
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },

  // Log colors
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
  },

  // File rotation settings
  fileRotation: {
    maxSize: '20m',
    maxFiles: '14d',
    datePattern: 'YYYY-MM-DD',
  },

  // Log retention
  retention: {
    error: '30d',
    combined: '7d',
    access: '3d',
  },
};

// Create enhanced logger with file rotation
export const createEnhancedLogger = (correlationId?: string) => {
  const logger = createLogger(correlationId);

  // Add file transports for production
  if (process.env.NODE_ENV === 'production') {
    // Error logs with rotation
    logger.add(
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: LOGGING_CONFIG.fileRotation.datePattern,
        level: 'error',
        maxSize: LOGGING_CONFIG.fileRotation.maxSize,
        maxFiles: LOGGING_CONFIG.fileRotation.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
      })
    );

    // Combined logs with rotation
    logger.add(
      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: LOGGING_CONFIG.fileRotation.datePattern,
        maxSize: LOGGING_CONFIG.fileRotation.maxSize,
        maxFiles: LOGGING_CONFIG.fileRotation.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
      })
    );

    // Access logs with rotation
    logger.add(
      new DailyRotateFile({
        filename: 'logs/access-%DATE%.log',
        datePattern: LOGGING_CONFIG.fileRotation.datePattern,
        level: 'http',
        maxSize: LOGGING_CONFIG.fileRotation.maxSize,
        maxFiles: LOGGING_CONFIG.fileRotation.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    // Performance logs with rotation
    logger.add(
      new DailyRotateFile({
        filename: 'logs/performance-%DATE%.log',
        datePattern: LOGGING_CONFIG.fileRotation.datePattern,
        level: 'info',
        maxSize: LOGGING_CONFIG.fileRotation.maxSize,
        maxFiles: LOGGING_CONFIG.fileRotation.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    // Business metrics logs with rotation
    logger.add(
      new DailyRotateFile({
        filename: 'logs/business-%DATE%.log',
        datePattern: LOGGING_CONFIG.fileRotation.datePattern,
        level: 'info',
        maxSize: LOGGING_CONFIG.fileRotation.maxSize,
        maxFiles: LOGGING_CONFIG.fileRotation.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  return logger;
};

// Environment-specific logger configuration
export const getLoggerConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  return {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    silent: isTest,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      service: 'bmf001-marketplace',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    },
  };
};

// Log correlation ID middleware
export const withCorrelationId = async (req: any, res: any, next: any) => {
  let correlationId = req.headers['x-correlation-id'];
  if (!correlationId) {
    try {
      correlationId = nanoid();
    } catch {
      correlationId = Math.random().toString(36).slice(2);
    }
  }
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
};

// Log request/response middleware
export const logRequestResponse = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const correlationId = req.correlationId;
  const logger = createLogger(correlationId);

  // Log request
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    correlationId,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - startTime;
    
    logger.http('Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length'),
      correlationId,
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logging middleware
export const logError = (error: Error, req: any, res: any, next: any) => {
  const correlationId = req.correlationId;
  const logger = createLogger(correlationId);

  logger.error('Unhandled error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    },
    correlationId,
  });

  next(error);
};

// Performance monitoring middleware
export const performanceMonitoring = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const correlationId = req.correlationId;
  const logger = createLogger(correlationId);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request performance', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      correlationId,
    });
  });

  next();
};

// Database query logging
export const logDatabaseQuery = (query: string, params: any[], duration: number, correlationId?: string) => {
  const logger = createLogger(correlationId);
  
  logger.debug('Database query', {
    query: query.replace(/\s+/g, ' ').trim(),
    params,
    duration,
    correlationId,
  });
};

// Business event logging
export const logBusinessEvent = (event: string, data: any, correlationId?: string) => {
  const logger = createLogger(correlationId);
  
  logger.info('Business event', {
    event,
    data,
    correlationId,
  });
};

// Security event logging
export const logSecurityEvent = (event: string, data: any, correlationId?: string) => {
  const logger = createLogger(correlationId);
  
  logger.warn('Security event', {
    event,
    data,
    correlationId,
  });
};

// Export the enhanced logger as default
export default createEnhancedLogger;
