/**
 * Error Boundary System Configuration
 * Central configuration for error handling across the application
 */

import { ErrorHandlerConfig, ErrorRecoveryStrategy } from '@/types/error';

// Default configuration
export const DEFAULT_ERROR_CONFIG: ErrorHandlerConfig = {
  enableErrorBoundaries: true,
  enableApiErrorHandling: true,
  enableSentryIntegration: process.env.NODE_ENV === 'production',
  enableErrorLogging: true,
  enableUserFeedback: true,
  enablePerformanceMonitoring: true,
  errorRetentionDays: 90,
  maxRetryAttempts: 3,
  retryDelayMs: 1000,
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sentryEnvironment: process.env.NODE_ENV || 'development',
  alertThresholds: {
    criticalErrorCount: 5,
    highErrorRate: 0.05, // 5%
    errorSpikeMultiplier: 3,
  },
};

// Environment-specific configurations
export const ERROR_CONFIGS = {
  development: {
    ...DEFAULT_ERROR_CONFIG,
    enableSentryIntegration: false,
    enableErrorLogging: true,
    maxRetryAttempts: 2,
    alertThresholds: {
      criticalErrorCount: 1,
      highErrorRate: 0.1,
      errorSpikeMultiplier: 2,
    },
  },

  test: {
    ...DEFAULT_ERROR_CONFIG,
    enableErrorBoundaries: true,
    enableApiErrorHandling: true,
    enableSentryIntegration: false,
    enableErrorLogging: false,
    enableUserFeedback: false,
    enablePerformanceMonitoring: false,
    maxRetryAttempts: 1,
  },

  staging: {
    ...DEFAULT_ERROR_CONFIG,
    enableSentryIntegration: true,
    errorRetentionDays: 30,
    alertThresholds: {
      criticalErrorCount: 3,
      highErrorRate: 0.03,
      errorSpikeMultiplier: 2.5,
    },
  },

  production: {
    ...DEFAULT_ERROR_CONFIG,
    enableSentryIntegration: true,
    errorRetentionDays: 90,
    alertThresholds: {
      criticalErrorCount: 5,
      highErrorRate: 0.01, // 1%
      errorSpikeMultiplier: 3,
    },
  },
};

/**
 * Get configuration for current environment
 */
export function getErrorConfig(): ErrorHandlerConfig {
  const env = process.env.NODE_ENV as keyof typeof ERROR_CONFIGS;
  return ERROR_CONFIGS[env] || ERROR_CONFIGS.production;
}

/**
 * Validate error configuration
 */
export function validateErrorConfig(config: ErrorHandlerConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (config.enableSentryIntegration && !config.sentryDsn) {
    errors.push('Sentry DSN is required when Sentry integration is enabled');
  }

  if (config.maxRetryAttempts < 0 || config.maxRetryAttempts > 10) {
    errors.push('Max retry attempts must be between 0 and 10');
  }

  if (config.retryDelayMs < 100 || config.retryDelayMs > 10000) {
    errors.push('Retry delay must be between 100ms and 10000ms');
  }

  if (config.errorRetentionDays < 1 || config.errorRetentionDays > 365) {
    errors.push('Error retention days must be between 1 and 365');
  }

  // Warnings
  if (config.alertThresholds.highErrorRate > 0.1) {
    warnings.push('High error rate threshold is very high (>10%)');
  }

  if (config.errorRetentionDays < 30) {
    warnings.push('Error retention period is less than 30 days');
  }

  if (!config.enableErrorLogging && config.enableSentryIntegration) {
    warnings.push('Sentry integration enabled but error logging disabled');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Error boundary configurations for different page types
 */
export const PAGE_ERROR_CONFIGS = {
  dashboard: {
    enableRetry: true,
    maxRetries: 3,
    showErrorDetails: false,
    level: 'page' as const,
    context: 'dashboard',
  },

  product: {
    enableRetry: true,
    maxRetries: 2,
    showErrorDetails: false,
    level: 'page' as const,
    context: 'product_page',
  },

  checkout: {
    enableRetry: false, // Don't auto-retry payment operations
    maxRetries: 0,
    showErrorDetails: false,
    level: 'page' as const,
    context: 'checkout',
  },

  admin: {
    enableRetry: true,
    maxRetries: 3,
    showErrorDetails: true, // Show details for admin users
    level: 'page' as const,
    context: 'admin_panel',
  },

  search: {
    enableRetry: true,
    maxRetries: 2,
    showErrorDetails: false,
    level: 'section' as const,
    context: 'search_results',
  },
};

/**
 * User-friendly error messages mapping
 */
export const ERROR_MESSAGES = {
  // Network errors
  'NetworkError': 'Unable to connect to our servers. Please check your internet connection and try again.',
  'TypeError: Failed to fetch': 'Connection failed. Please check your internet connection.',
  'timeout': 'The request is taking longer than expected. Please try again.',
  
  // Authentication errors
  'Unauthorized': 'You need to sign in to access this resource.',
  'Forbidden': 'You don\'t have permission to perform this action.',
  'Invalid token': 'Your session has expired. Please sign in again.',
  
  // Validation errors
  'Validation failed': 'Please check your input and try again.',
  'Invalid input': 'The information you provided is invalid.',
  'Required field': 'Please fill in all required fields.',
  
  // Server errors
  'Internal Server Error': 'Our servers are experiencing issues. Our team has been notified.',
  'Service Unavailable': 'Service is temporarily unavailable. Please try again in a few minutes.',
  'Bad Gateway': 'Service is temporarily unavailable. Please try again later.',
  
  // Rate limiting
  'Rate limit exceeded': 'Too many requests. Please wait a moment and try again.',
  'Too Many Requests': 'You\'re making requests too quickly. Please slow down.',
  
  // File upload errors
  'File too large': 'The file you\'re trying to upload is too large.',
  'Invalid file type': 'This file type is not supported.',
  'Upload failed': 'File upload failed. Please try again.',
  
  // Payment errors
  'Payment failed': 'Payment could not be processed. Please try a different payment method.',
  'Card declined': 'Your card was declined. Please try a different card.',
  'Insufficient funds': 'Insufficient funds. Please check your account balance.',
  
  // Default fallbacks
  'ChunkLoadError': 'Failed to load application resources. Please refresh the page.',
  'Script error': 'A script error occurred. Please refresh the page.',
  'default': 'Something went wrong. Please try again or contact support if the problem persists.',
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: Error | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Check for exact matches first
  if (ERROR_MESSAGES[errorMessage as keyof typeof ERROR_MESSAGES]) {
    return ERROR_MESSAGES[errorMessage as keyof typeof ERROR_MESSAGES];
  }
  
  // Check for partial matches
  for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return message;
    }
  }
  
  return ERROR_MESSAGES.default;
}

/**
 * Determine error severity based on error details
 */
export function determineErrorSeverity(error: Error, context?: string): 'low' | 'medium' | 'high' | 'critical' {
  const message = error.message.toLowerCase();
  
  // Critical errors
  if (message.includes('out of memory') || 
      message.includes('maximum call stack') ||
      message.includes('script error') ||
      context === 'payment') {
    return 'critical';
  }
  
  // High severity errors
  if (message.includes('chunkloa') || 
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      context === 'checkout' ||
      context === 'dashboard') {
    return 'high';
  }
  
  // Medium severity errors
  if (message.includes('network') || 
      message.includes('timeout') ||
      message.includes('validation') ||
      context === 'product_page') {
    return 'medium';
  }
  
  // Low severity (default)
  return 'low';
}

/**
 * Check if error should be reported to Sentry
 */
export function shouldReportToSentry(error: Error, context?: string): boolean {
  const config = getErrorConfig();
  
  if (!config.enableSentryIntegration) {
    return false;
  }
  
  // Don't report certain error types in production
  if (config.sentryEnvironment === 'production') {
    const message = error.message.toLowerCase();
    
    // Skip common non-critical errors
    if (message.includes('chunkloa') ||
        message.includes('script error') ||
        message.includes('network error')) {
      return false;
    }
  }
  
  // Always report critical errors
  const severity = determineErrorSeverity(error, context);
  if (severity === 'critical' || severity === 'high') {
    return true;
  }
  
  return true;
}

/**
 * Initialize error handling system
 */
export function initializeErrorHandling() {
  const config = getErrorConfig();
  
  // Validate configuration
  const validation = validateErrorConfig(config);
  if (!validation.valid) {
    console.error('Invalid error configuration:', validation.errors);
    return false;
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Error configuration warnings:', validation.warnings);
  }
  
  // Initialize Sentry if enabled
  if (config.enableSentryIntegration && config.sentryDsn) {
    import('@/lib/sentry').then(({ initializeSentry }) => {
      initializeSentry({
        dsn: config.sentryDsn!,
        environment: config.sentryEnvironment,
        enableTracing: config.enablePerformanceMonitoring,
        enableProfiling: config.enablePerformanceMonitoring,
        enableUserFeedback: config.enableUserFeedback,
      });
    });
  }
  
  console.log('Error handling system initialized', {
    environment: config.sentryEnvironment,
    sentryEnabled: config.enableSentryIntegration,
    errorLoggingEnabled: config.enableErrorLogging,
  });
  
  return true;
}

export default getErrorConfig;
