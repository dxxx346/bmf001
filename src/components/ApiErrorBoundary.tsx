'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'react-hot-toast';

/**
 * API Error Boundary for Async Operations
 * Handles errors from API calls and async operations
 */

export interface ApiError {
  id: string;
  message: string;
  status?: number;
  code?: string;
  timestamp: Date;
  endpoint?: string;
  method?: string;
  retryable: boolean;
  userMessage: string;
}

export interface ApiErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ApiError, retry: () => void) => ReactNode;
  onError?: (error: ApiError) => void;
  enableRetry?: boolean;
  enableToasts?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

export interface UseApiErrorBoundaryReturn {
  error: ApiError | null;
  isLoading: boolean;
  retry: () => void;
  clearError: () => void;
  executeAsync: <T>(
    operation: () => Promise<T>,
    options?: {
      endpoint?: string;
      method?: string;
      showToast?: boolean;
      retryable?: boolean;
    }
  ) => Promise<T>;
}

export function ApiErrorBoundary({
  children,
  fallback,
  onError,
  enableRetry = true,
  enableToasts = true,
  retryDelay = 1000,
  maxRetries = 3,
}: ApiErrorBoundaryProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const createApiError = (
    originalError: any,
    endpoint?: string,
    method?: string
  ): ApiError => {
    const errorId = `api_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let status: number | undefined;
    let code: string | undefined;
    let message = 'An unexpected error occurred';
    let retryable = true;
    let userMessage = 'Something went wrong. Please try again.';

    if (originalError?.response) {
      // HTTP error response
      status = originalError.response.status;
      code = originalError.response.statusText;
      message = originalError.response.data?.message || originalError.message;
      
      switch (status) {
        case 400:
          userMessage = 'Invalid request. Please check your input and try again.';
          retryable = false;
          break;
        case 401:
          userMessage = 'You need to sign in to access this resource.';
          retryable = false;
          break;
        case 403:
          userMessage = 'You don&apos;t have permission to perform this action.';
          retryable = false;
          break;
        case 404:
          userMessage = 'The requested resource was not found.';
          retryable = false;
          break;
        case 429:
          userMessage = 'Too many requests. Please wait a moment and try again.';
          retryable = true;
          break;
        case 500:
          userMessage = 'Server error. Our team has been notified.';
          retryable = true;
          break;
        case 502:
        case 503:
        case 504:
          userMessage = 'Service temporarily unavailable. Please try again in a moment.';
          retryable = true;
          break;
        default:
          userMessage = `Request failed with status ${status}. Please try again.`;
      }
    } else if (originalError?.name === 'TypeError' && originalError?.message?.includes('fetch')) {
      // Network error
      message = 'Network error';
      userMessage = 'Unable to connect to our servers. Please check your internet connection.';
      retryable = true;
    } else if (originalError?.name === 'AbortError') {
      // Request timeout
      message = 'Request timeout';
      userMessage = 'Request timed out. Please try again.';
      retryable = true;
    } else if (originalError?.message) {
      message = originalError.message;
      
      // Check for specific error patterns
      if (message.toLowerCase().includes('timeout')) {
        userMessage = 'Request timed out. Please try again.';
        retryable = true;
      } else if (message.toLowerCase().includes('network')) {
        userMessage = 'Network error. Please check your connection and try again.';
        retryable = true;
      } else if (message.toLowerCase().includes('validation')) {
        userMessage = 'Invalid data provided. Please check your input.';
        retryable = false;
      }
    }

    return {
      id: errorId,
      message,
      status,
      code,
      timestamp: new Date(),
      endpoint,
      method,
      retryable,
      userMessage,
    };
  };

  const handleError = (error: ApiError) => {
    setError(error);
    setRetryCount(0);

    // Show toast notification if enabled
    if (enableToasts) {
      toast.error(error.userMessage, {
        id: error.id,
        duration: 5000,
      });
    }

    // Call custom error handler
    if (onError) {
      onError(error);
    }

    // Log error
    logApiError(error);
  };

  const retry = async () => {
    if (!error || !enableRetry || retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    // Exponential backoff
    const delay = retryDelay * Math.pow(2, retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));

    setError(null);
    setIsRetrying(false);
  };

  const clearError = () => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  };

  // Provide context to children
  const contextValue = {
    error,
    isLoading: isRetrying,
    retry,
    clearError,
    executeAsync: async <T,>(
      operation: () => Promise<T>,
      options?: {
        endpoint?: string;
        method?: string;
        showToast?: boolean;
        retryable?: boolean;
      }
    ): Promise<T> => {
      try {
        clearError();
        return await operation();
      } catch (err) {
        const apiError = createApiError(err, options?.endpoint, options?.method);
        if (options?.retryable !== undefined) {
          apiError.retryable = options.retryable;
        }
        handleError(apiError);
        throw err;
      }
    },
  };

  if (error && fallback) {
    return <>{fallback(error, retry)}</>;
  }

  return (
    <ApiErrorContext.Provider value={contextValue}>
      {children}
    </ApiErrorContext.Provider>
  );
}

// Context for API error handling
const ApiErrorContext = React.createContext<UseApiErrorBoundaryReturn | null>(null);

export function useApiErrorBoundary(): UseApiErrorBoundaryReturn {
  const context = React.useContext(ApiErrorContext);
  if (!context) {
    throw new Error('useApiErrorBoundary must be used within an ApiErrorBoundary');
  }
  return context;
}

// Hook for handling async operations with error boundary
export function useAsyncOperation<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<T | null>(null);
  const { executeAsync } = useApiErrorBoundary();

  const execute = async (
    operation: () => Promise<T>,
    options?: {
      endpoint?: string;
      method?: string;
      showToast?: boolean;
      retryable?: boolean;
    }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await executeAsync(operation, options);
      setData(result);
      return result;
    } catch (err) {
      // Error is already handled by executeAsync
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setData(null);
    setIsLoading(false);
  };

  return {
    execute,
    isLoading,
    error,
    data,
    reset,
  };
}

// Network status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection speed
    const connection = (navigator as any).connection;
    if (connection) {
      const checkConnectionSpeed = () => {
        setIsSlowConnection(connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
      };
      
      checkConnectionSpeed();
      connection.addEventListener('change', checkConnectionSpeed);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSlowConnection };
}

// Network status indicator component
export function NetworkStatusIndicator() {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  if (!isOnline) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>No Internet Connection</AlertTitle>
        <AlertDescription>
          You&apos;re currently offline. Some features may not work properly.
        </AlertDescription>
      </Alert>
    );
  }

  if (isSlowConnection) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <Wifi className="h-4 w-4" />
        <AlertTitle>Slow Connection</AlertTitle>
        <AlertDescription>
          Your internet connection appears to be slow. Some operations may take longer than usual.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// Error logging function
async function logApiError(error: ApiError) {
  try {
    await fetch('/api/errors/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error_id: error.id,
        error_type: 'api_error',
        message: error.message,
        status_code: error.status,
        endpoint: error.endpoint,
        method: error.method,
        user_message: error.userMessage,
        retryable: error.retryable,
        timestamp: error.timestamp.toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href,
      }),
    });
  } catch (loggingError) {
    console.error('Failed to log API error:', loggingError);
  }
}
