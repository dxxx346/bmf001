import winston from 'winston';
import { TransformableInfo } from 'logform';
import { createLogger } from './logger';

// Datadog transport configuration
export const createDatadogTransport = () => {
  if (!process.env.DATADOG_API_KEY) {
    console.warn('DATADOG_API_KEY not found, skipping Datadog transport');
    return null;
  }

  // For production, you would typically use @datadog/winston
  // This is a simplified version for demonstration
  return new winston.transports.Http({
    host: 'http-intake.logs.datadoghq.com',
    path: `/api/v2/logs?dd-api-key=${process.env.DATADOG_API_KEY}&ddsource=nodejs&service=bmf001-marketplace`,
    ssl: true,
    format: winston.format.json(),
  });
};

// LogTail transport configuration
export const createLogTailTransport = () => {
  if (!process.env.LOGTAIL_TOKEN) {
    console.warn('LOGTAIL_TOKEN not found, skipping LogTail transport');
    return null;
  }

  return new winston.transports.Http({
    host: 'https://in.logtail.com',
    path: `/${process.env.LOGTAIL_TOKEN}`,
    ssl: true,
    format: winston.format.json(),
  });
};

// Custom transport for structured logging to external services
export class StructuredLogTransport extends (winston as any).Transport {
  private logBuffer: any[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(options: any = {}) {
    super(options);
    
    // Flush logs every 5 seconds or when buffer reaches 100 entries
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 5000);
  }

  log(info: TransformableInfo, callback: () => void) {
    setImmediate(() => {
      (this as any).emit('logged', info);
    });

    // Add to buffer
    this.logBuffer.push({
      timestamp: new Date().toISOString(),
      correlationId: info.correlationId,
      service: info.service || 'bmf001-marketplace',
      environment: info.environment || process.env.NODE_ENV || 'development',
      ...info,
    });

    // Flush if buffer is full
    if (this.logBuffer.length >= 100) {
      this.flushLogs();
    }

    callback();
  }

  private async flushLogs() {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Send to external logging service
      await this.sendToExternalService(logsToFlush);
    } catch (error) {
      console.error('Failed to send logs to external service:', error);
      // Re-add logs to buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  private async sendToExternalService(logs: any[]) {
    // This would be implemented based on your chosen logging service
    // For now, we'll just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Would send logs to external service:', logs.length, 'logs');
    }
  }

  close() {
    clearInterval(this.flushInterval);
    this.flushLogs();
  }
}

// Enhanced logger with external transports
export const createEnhancedLogger = (correlationId?: string) => {
  const logger = createLogger(correlationId);
  
  // Add external transports in production
  if (process.env.NODE_ENV === 'production') {
    const datadogTransport = createDatadogTransport();
    if (datadogTransport) {
      logger.add(datadogTransport);
    }

    const logTailTransport = createLogTailTransport();
    if (logTailTransport) {
      logger.add(logTailTransport);
    }

    // Add structured log transport
    logger.add(new StructuredLogTransport() as any);
  }

  return logger;
};

// Log aggregation utilities
export const logAggregation = {
  // Send logs to multiple services
  async sendToMultipleServices(logs: any[]) {
    const services: Promise<any>[] = [];
    
    if (process.env.DATADOG_API_KEY) {
      services.push(this.sendToDatadog(logs));
    }
    
    if (process.env.LOGTAIL_TOKEN) {
      services.push(this.sendToLogTail(logs));
    }
    
    if (process.env.LOGSTASH_URL) {
      services.push(this.sendToLogstash(logs));
    }

    // Send to all services in parallel
    await Promise.allSettled(services);
  },

  async sendToDatadog(logs: any[]) {
    if (!process.env.DATADOG_API_KEY) return;

    try {
      const response = await fetch(`https://http-intake.logs.datadoghq.com/api/v2/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.DATADOG_API_KEY,
          'DD-SOURCE': 'nodejs',
          'DD-SERVICE': 'bmf001-marketplace',
          'DD-TAGS': `env:${process.env.NODE_ENV || 'development'}`,
        },
        body: JSON.stringify({
          logs: logs.map(log => ({
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            correlationId: log.correlationId,
            service: log.service,
            environment: log.environment,
            ...log,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to Datadog:', error);
    }
  },

  async sendToLogTail(logs: any[]) {
    if (!process.env.LOGTAIL_TOKEN) return;

    try {
      const response = await fetch(`https://in.logtail.com/${process.env.LOGTAIL_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logs.map(log => ({
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            correlationId: log.correlationId,
            service: log.service,
            environment: log.environment,
            ...log,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`LogTail API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to LogTail:', error);
    }
  },

  async sendToLogstash(logs: any[]) {
    if (!process.env.LOGSTASH_URL) return;

    try {
      const response = await fetch(process.env.LOGSTASH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logs.map(log => ({
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            correlationId: log.correlationId,
            service: log.service,
            environment: log.environment,
            ...log,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Logstash API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to Logstash:', error);
    }
  },
};

// Environment variables documentation
export const LOGGING_ENV_VARS = {
  DATADOG_API_KEY: 'Datadog API key for log aggregation',
  LOGTAIL_TOKEN: 'LogTail token for log aggregation',
  LOGSTASH_URL: 'Logstash endpoint URL for log aggregation',
  LOG_LEVEL: 'Log level (error, warn, info, debug)',
  NODE_ENV: 'Environment (development, production)',
};
