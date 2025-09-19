import React from 'react';
import { ApplicationError, ErrorRecoveryStrategy, RecoveryAction } from '@/types/error';
import { defaultLogger as logger } from '@/lib/logger';
import { toast } from 'react-hot-toast';

/**
 * Error Recovery Service
 * Implements intelligent error recovery strategies and retry mechanisms
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
}

export interface RecoveryResult {
  success: boolean;
  attempts: number;
  totalTime: number;
  strategy: string;
  error?: Error;
}

export class ErrorRecoveryService {
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private retryAttempts = new Map<string, number>();

  constructor() {
    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies() {
    // Network error recovery
    this.addRecoveryStrategy({
      type: 'retry',
      condition: (error) => 
        error.type === 'network' || 
        error.message.toLowerCase().includes('network') ||
        error.message.toLowerCase().includes('fetch'),
      action: async (error) => {
        logger.info('Applying network error recovery', { errorId: error.id });
        await this.delay(1000); // Wait before retry
      },
      priority: 1,
    });

    // Chunk loading error recovery
    this.addRecoveryStrategy({
      type: 'retry',
      condition: (error) => 
        error.message.includes('ChunkLoadError') ||
        error.message.includes('Loading chunk'),
      action: async () => {
        logger.info('Applying chunk load error recovery');
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
      priority: 2,
    });

    // Authentication error recovery
    this.addRecoveryStrategy({
      type: 'redirect',
      condition: (error) => 
        error.type === 'authorization' ||
        error.message.toLowerCase().includes('unauthorized') ||
        error.message.toLowerCase().includes('401'),
      action: async () => {
        logger.info('Applying authentication error recovery');
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login?redirectTo=' + encodeURIComponent(window.location.pathname);
        }
      },
      priority: 3,
    });

    // Rate limit error recovery
    this.addRecoveryStrategy({
      type: 'retry',
      condition: (error) => 
        error.message.toLowerCase().includes('rate limit') ||
        error.message.toLowerCase().includes('429'),
      action: async () => {
        logger.info('Applying rate limit error recovery');
        await this.delay(5000); // Wait 5 seconds for rate limit
      },
      priority: 4,
    });

    // Validation error recovery
    this.addRecoveryStrategy({
      type: 'fallback',
      condition: (error) => 
        error.type === 'validation' ||
        error.message.toLowerCase().includes('validation') ||
        error.message.toLowerCase().includes('invalid'),
      action: async (error) => {
        logger.info('Applying validation error recovery', { errorId: error.id });
        toast.error('Please check your input and try again');
      },
      priority: 5,
    });
  }

  /**
   * Add a custom recovery strategy
   */
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy) {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Attempt to recover from an error
   */
  async recoverFromError(error: ApplicationError): Promise<RecoveryResult> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;

    // Find applicable recovery strategy
    const strategy = this.recoveryStrategies.find(s => s.condition(error));
    
    if (!strategy) {
      logger.warn('No recovery strategy found for error', { 
        errorId: error.id, 
        errorType: error.type 
      });
      
      return {
        success: false,
        attempts: 0,
        totalTime: Date.now() - startTime,
        strategy: 'none',
        error: new Error('No recovery strategy available'),
      };
    }

    logger.info('Attempting error recovery', {
      errorId: error.id,
      strategy: strategy.type,
      retryable: error.retryable,
    });

    try {
      await strategy.action(error);
      
      return {
        success: true,
        attempts: 1,
        totalTime: Date.now() - startTime,
        strategy: strategy.type,
      };
    } catch (recoveryError) {
      logger.error('Error recovery failed', {
        errorId: error.id,
        strategy: strategy.type,
        recoveryError,
      });

      return {
        success: false,
        attempts: 1,
        totalTime: Date.now() - startTime,
        strategy: strategy.type,
        error: recoveryError as Error,
      };
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    errorContext?: string
  ): Promise<T> {
    const finalConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBackoff: true,
      jitter: true,
      ...config,
    };

    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Reset retry count on success
        if (errorContext) {
          this.retryAttempts.delete(errorContext);
        }
        
        logger.debug('Operation succeeded', { 
          attempt, 
          context: errorContext 
        });
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        logger.warn('Operation failed, retrying', {
          attempt,
          maxAttempts: finalConfig.maxAttempts,
          error: error,
          context: errorContext,
        });

        // Don't wait after the last attempt
        if (attempt < finalConfig.maxAttempts) {
          const delay = this.calculateDelay(attempt, finalConfig);
          await this.delay(delay);
        }
      }
    }

    // Track retry attempts
    if (errorContext) {
      const currentAttempts = this.retryAttempts.get(errorContext) || 0;
      this.retryAttempts.set(errorContext, currentAttempts + finalConfig.maxAttempts);
    }

    logger.error('Operation failed after all retry attempts', {
      maxAttempts: finalConfig.maxAttempts,
      context: errorContext,
      finalError: lastError,
    });

    throw lastError || new Error('Operation failed after all retry attempts');
  }

  /**
   * Check if an error is recoverable
   */
  isRecoverable(error: ApplicationError): boolean {
    // Non-recoverable error types
    const nonRecoverableTypes = ['authorization', 'validation'];
    if (nonRecoverableTypes.includes(error.type)) {
      return false;
    }

    // Non-recoverable HTTP status codes
    const nonRecoverableStatuses = [400, 401, 403, 404, 422];
    if (error.metadata?.statusCode && 
        nonRecoverableStatuses.includes(error.metadata.statusCode as number)) {
      return false;
    }

    // Check if error is explicitly marked as non-retryable
    if (!error.retryable) {
      return false;
    }

    // Check retry attempts
    const context = error.context || error.id;
    const attempts = this.retryAttempts.get(context) || 0;
    
    return attempts < 10; // Max 10 total retry attempts per context
  }

  /**
   * Get recommended recovery action
   */
  getRecoveryAction(error: ApplicationError): RecoveryAction {
    if (!this.isRecoverable(error)) {
      if (error.type === 'authorization') {
        return 'redirect_home';
      }
      if (error.type === 'validation') {
        return 'show_fallback';
      }
      return 'contact_support';
    }

    if (error.message.includes('ChunkLoadError')) {
      return 'reload_page';
    }

    if (error.type === 'network') {
      return 'retry';
    }

    if (error.message.toLowerCase().includes('cache')) {
      return 'clear_cache';
    }

    return 'retry';
  }

  /**
   * Execute recovery action
   */
  async executeRecoveryAction(
    action: RecoveryAction, 
    error: ApplicationError,
    onSuccess?: () => void
  ): Promise<boolean> {
    try {
      switch (action) {
        case 'retry':
          // Handled by calling component
          return true;

        case 'reload_page':
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
          return true;

        case 'clear_cache':
          if (typeof window !== 'undefined') {
            if ('caches' in window) {
              await caches.keys().then(names => {
                return Promise.all(names.map(name => caches.delete(name)));
              });
            }
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }
          return true;

        case 'redirect_home':
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
          return true;

        case 'show_fallback':
          // Handled by calling component
          return true;

        case 'contact_support':
          if (typeof window !== 'undefined') {
            window.open('/support', '_blank');
          }
          return false; // Don't consider this as recovery

        case 'none':
        default:
          return false;
      }
    } catch (recoveryError) {
      logger.error('Recovery action failed', {
        action,
        errorId: error.id,
        recoveryError,
      });
      return false;
    }
  }

  /**
   * Calculate delay for retry attempts
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay;

    if (config.exponentialBackoff) {
      delay = Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay);
    }

    if (config.jitter) {
      // Add random jitter (±25%)
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.max(100, Math.floor(delay)); // Minimum 100ms delay
  }

  /**
   * Delay utility function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics
   */
  getRetryStatistics(): Record<string, number> {
    return Object.fromEntries(this.retryAttempts);
  }

  /**
   * Clear retry statistics
   */
  clearRetryStatistics(context?: string) {
    if (context) {
      this.retryAttempts.delete(context);
    } else {
      this.retryAttempts.clear();
    }
  }

  /**
   * Check if error is a known pattern
   */
  isKnownErrorPattern(error: ApplicationError): boolean {
    const knownPatterns = [
      /ChunkLoadError/,
      /Loading chunk \d+ failed/,
      /NetworkError/,
      /Failed to fetch/,
      /timeout/i,
      /rate limit/i,
    ];

    return knownPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Get error recovery suggestions
   */
  getRecoverySuggestions(error: ApplicationError): string[] {
    const suggestions: string[] = [];

    if (error.type === 'network') {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      suggestions.push('Disable any VPN or proxy');
    }

    if (error.message.includes('ChunkLoadError')) {
      suggestions.push('Clear your browser cache');
      suggestions.push('Disable browser extensions');
      suggestions.push('Try using an incognito/private window');
    }

    if (error.type === 'authorization') {
      suggestions.push('Sign out and sign back in');
      suggestions.push('Check if your account has the required permissions');
      suggestions.push('Contact an administrator');
    }

    if (error.type === 'validation') {
      suggestions.push('Check that all required fields are filled');
      suggestions.push('Verify that your input is in the correct format');
      suggestions.push('Try using different values');
    }

    if (suggestions.length === 0) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache');
      suggestions.push('Contact support if the problem persists');
    }

    return suggestions;
  }
}

// Singleton instance
export const errorRecoveryService = new ErrorRecoveryService();

// Utility functions for common recovery scenarios
export const recoveryUtils = {
  /**
   * Retry API call with exponential backoff
   */
  retryApiCall: async <T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    maxRetries = 3
  ): Promise<T> => {
    return errorRecoveryService.retryWithBackoff(
      apiCall,
      { maxAttempts: maxRetries },
      endpoint
    );
  },

  /**
   * Recover from chunk loading errors
   */
  recoverChunkLoadError: () => {
    logger.info('Recovering from chunk load error');
    
    if (typeof window !== 'undefined') {
      // Clear module cache
      if ('webpackChunkName' in window) {
        delete (window as any).webpackChunkName;
      }
      
      // Reload the page
      window.location.reload();
    }
  },

  /**
   * Recover from authentication errors
   */
  recoverAuthError: () => {
    logger.info('Recovering from authentication error');
    
    if (typeof window !== 'undefined') {
      // Clear auth tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.clear();
      
      // Redirect to login
      window.location.href = '/auth/login?redirectTo=' + encodeURIComponent(window.location.pathname);
    }
  },

  /**
   * Recover from network errors
   */
  recoverNetworkError: async () => {
    logger.info('Recovering from network error');
    
    if (typeof window !== 'undefined') {
      // Check if online
      if (!navigator.onLine) {
        toast.error('You appear to be offline. Please check your internet connection.');
        return false;
      }

      // Test connectivity
      try {
        await fetch('/api/health', { method: 'HEAD' });
        return true;
      } catch {
        toast.error('Unable to connect to our servers. Please try again in a moment.');
        return false;
      }
    }
    
    return false;
  },

  /**
   * Recover from payment errors
   */
  recoverPaymentError: (errorCode?: string) => {
    logger.info('Recovering from payment error', { errorCode });
    
    switch (errorCode) {
      case 'card_declined':
        toast.error('Your card was declined. Please try a different payment method.');
        break;
      case 'insufficient_funds':
        toast.error('Insufficient funds. Please check your account balance.');
        break;
      case 'expired_card':
        toast.error('Your card has expired. Please update your payment information.');
        break;
      default:
        toast.error('Payment failed. Please try again or contact support.');
    }
    
    // Redirect to payment page
    if (typeof window !== 'undefined') {
      window.location.href = '/checkout/payment';
    }
  },

  /**
   * Clear application cache
   */
  clearCache: async () => {
    logger.info('Clearing application cache');
    
    try {
      // Clear service worker cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear IndexedDB (if used)
      if ('indexedDB' in window) {
        // This would clear IndexedDB if you're using it
      }

      toast.success('Cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      toast.error('Failed to clear cache');
      return false;
    }
  },
};

// Error recovery hooks
export function useErrorRecovery() {
  const [isRecovering, setIsRecovering] = React.useState(false);
  const [recoveryHistory, setRecoveryHistory] = React.useState<RecoveryResult[]>([]);

  const recover = async (error: ApplicationError): Promise<boolean> => {
    setIsRecovering(true);
    
    try {
      const result = await errorRecoveryService.recoverFromError(error);
      
      setRecoveryHistory(prev => [...prev, result].slice(-10)); // Keep last 10 results
      
      if (result.success) {
        toast.success('Error recovered successfully');
      } else {
        toast.error('Unable to recover from error');
      }
      
      return result.success;
    } catch (error) {
      logger.error('Error recovery failed:', error);
      toast.error('Recovery attempt failed');
      return false;
    } finally {
      setIsRecovering(false);
    }
  };

  const clearHistory = () => {
    setRecoveryHistory([]);
  };

  return {
    recover,
    isRecovering,
    recoveryHistory,
    clearHistory,
  };
}

// React hook for retry functionality
export function useRetry() {
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const retry = async <T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      const result = await errorRecoveryService.retryWithBackoff(
        operation,
        config,
        `retry_${Date.now()}`
      );
      
      setRetryCount(0); // Reset on success
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsRetrying(false);
    }
  };

  const reset = () => {
    setRetryCount(0);
    setIsRetrying(false);
  };

  return {
    retry,
    retryCount,
    isRetrying,
    reset,
  };
}

export default ErrorRecoveryService;
