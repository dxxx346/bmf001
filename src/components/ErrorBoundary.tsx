'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Comprehensive Error Boundary System
 * Handles JavaScript errors anywhere in the component tree
 */

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  lastErrorTime: Date | null;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  showErrorDetails?: boolean;
  level?: 'page' | 'section' | 'component';
  context?: string;
}

export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  buildVersion?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastErrorTime: new Date(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error details
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private async logError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorDetails: ErrorDetails = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack || undefined,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date(),
        userId: this.getUserId() || undefined,
        sessionId: this.getSessionId() || undefined,
        buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION,
      };

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Error Boundary Caught Error');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Error Details:', errorDetails);
        console.groupEnd();
      }

      // Send to error logging service
      await this.sendErrorLog(errorDetails);

      // Send to Sentry if configured
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            errorBoundary: {
              componentStack: errorInfo.componentStack,
              errorBoundaryLevel: this.props.level || 'component',
              errorBoundaryContext: this.props.context,
            },
          },
          tags: {
            errorBoundary: true,
            level: this.props.level || 'component',
          },
          extra: errorDetails,
        });
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  private async sendErrorLog(errorDetails: ErrorDetails) {
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error_id: this.state.errorId,
          level: this.props.level || 'component',
          context: this.props.context,
          ...errorDetails,
        }),
      });
    } catch (error) {
      console.error('Failed to send error log:', error);
    }
  }

  private getUserId(): string | undefined {
    // Try to get user ID from various sources
    try {
      const userHeader = document.querySelector('meta[name="user-id"]')?.getAttribute('content');
      if (userHeader) return userHeader;

      const localStorage = window.localStorage?.getItem('user_id');
      if (localStorage) return localStorage;

      return undefined;
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string | undefined {
    try {
      const sessionHeader = document.querySelector('meta[name="session-id"]')?.getAttribute('content');
      if (sessionHeader) return sessionHeader;

      const sessionStorage = window.sessionStorage?.getItem('session_id');
      if (sessionStorage) return sessionStorage;

      return undefined;
    } catch {
      return undefined;
    }
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
    }));

    // Exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportError = () => {
    const subject = encodeURIComponent(`Error Report - ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Message: ${this.state.error?.message}
URL: ${window.location.href}
Time: ${this.state.lastErrorTime?.toISOString()}
User Agent: ${navigator.userAgent}

Please describe what you were doing when this error occurred:
[Your description here]
    `);
    
    window.open(`mailto:support@bmf001.com?subject=${subject}&body=${body}`);
  };

  private getErrorMessage(): string {
    const { error } = this.state;
    const { level = 'component' } = this.props;

    if (!error) return 'An unexpected error occurred';

    // User-friendly error messages for common scenarios
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Unable to connect to our servers. Please check your internet connection and try again.';
    }

    if (errorMessage.includes('timeout')) {
      return 'The request is taking longer than expected. Please try again.';
    }

    if (errorMessage.includes('unauthorized') || errorMessage.includes('403')) {
      return 'You don\'t have permission to access this resource.';
    }

    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return 'The requested resource could not be found.';
    }

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return 'The provided information is invalid. Please check your input and try again.';
    }

    if (errorMessage.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    if (level === 'page') {
      return 'This page encountered an error and couldn\'t be displayed properly.';
    }

    if (level === 'section') {
      return 'This section encountered an error. Other parts of the page should still work.';
    }

    return 'Something went wrong. Please try again or contact support if the problem persists.';
  }

  private getErrorSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const { level = 'component' } = this.props;
    const { error } = this.state;

    if (level === 'page') return 'high';
    if (level === 'section') return 'medium';

    if (error?.message.includes('ChunkLoadError') || error?.message.includes('Loading chunk')) {
      return 'medium'; // Usually recoverable with refresh
    }

    if (error?.message.includes('Network') || error?.message.includes('fetch')) {
      return 'medium';
    }

    return 'low';
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { enableRetry = true, maxRetries = 3, showErrorDetails = false, level = 'component' } = this.props;
      const errorMessage = this.getErrorMessage();
      const errorSeverity = this.getErrorSeverity();
      const canRetry = enableRetry && this.state.retryCount < maxRetries;

      return (
        <div className="error-boundary-container">
          <Card className={`w-full max-w-2xl mx-auto my-8 ${
            errorSeverity === 'critical' ? 'border-red-500' :
            errorSeverity === 'high' ? 'border-red-400' :
            errorSeverity === 'medium' ? 'border-yellow-400' :
            'border-gray-300'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <AlertTriangle className={`h-6 w-6 ${
                  errorSeverity === 'critical' ? 'text-red-600' :
                  errorSeverity === 'high' ? 'text-red-500' :
                  errorSeverity === 'medium' ? 'text-yellow-500' :
                  'text-gray-500'
                }`} />
                <span>Oops! Something went wrong</span>
                <Badge variant={
                  errorSeverity === 'critical' ? 'danger' :
                  errorSeverity === 'high' ? 'danger' :
                  errorSeverity === 'medium' ? 'secondary' :
                  'outline'
                }>
                  {errorSeverity.toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>
                {errorMessage}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Actions */}
              <div className="flex flex-wrap gap-3">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                    {this.state.retryCount > 0 && (
                      <span className="text-xs">({this.state.retryCount}/{maxRetries})</span>
                    )}
                  </Button>
                )}

                <Button 
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>

                {level === 'page' && (
                  <Button 
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                )}

                <Button 
                  onClick={this.handleReportError}
                  variant="ghost"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Report Issue
                </Button>
              </div>

              {/* Error Details (Development/Debug) */}
              {showErrorDetails && this.state.error && (
                <details className="bg-gray-50 p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Technical Details
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <strong>Error ID:</strong> 
                      <code className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                        {this.state.errorId}
                      </code>
                    </div>
                    <div>
                      <strong>Error Message:</strong>
                      <pre className="mt-1 text-xs bg-gray-200 p-2 rounded overflow-x-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 text-xs bg-gray-200 p-2 rounded overflow-x-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 text-xs bg-gray-200 p-2 rounded overflow-x-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                    <div>
                      <strong>Context:</strong> {this.props.context || 'Unknown'}
                    </div>
                    <div>
                      <strong>Level:</strong> {this.props.level || 'component'}
                    </div>
                    <div>
                      <strong>Time:</strong> {this.state.lastErrorTime?.toLocaleString()}
                    </div>
                  </div>
                </details>
              )}

              {/* Help Text */}
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <p className="font-medium text-blue-800 mb-1">What can you do?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Try refreshing the page or clicking &quot;Try Again&quot;</li>
                  <li>Check your internet connection</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>If the problem persists, please report it to our support team</li>
                </ul>
              </div>

              {/* Retry Countdown */}
              {canRetry && this.state.retryCount > 0 && (
                <div className="text-center text-sm text-gray-600">
                  <RetryCountdown 
                    onRetry={this.handleRetry}
                    retryCount={this.state.retryCount}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Retry countdown component
function RetryCountdown({ 
  onRetry, 
  retryCount 
}: { 
  onRetry: () => void; 
  retryCount: number; 
}) {
  const [countdown, setCountdown] = React.useState(5);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onRetry();
    }
  }, [countdown, onRetry]);

  return (
    <div className="flex items-center gap-2">
      <span>Automatic retry in {countdown} seconds...</span>
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={() => setCountdown(0)}
      >
        Retry Now
      </Button>
    </div>
  );
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error boundary context
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { captureError, resetError };
}

// Specialized error boundaries for different scenarios
export function PageErrorBoundary({ children, context }: { children: ReactNode; context: string }) {
  return (
    <ErrorBoundary
      level="page"
      context={context}
      enableRetry={true}
      maxRetries={3}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
}

export function SectionErrorBoundary({ children, context }: { children: ReactNode; context: string }) {
  return (
    <ErrorBoundary
      level="section"
      context={context}
      enableRetry={true}
      maxRetries={2}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children, context }: { children: ReactNode; context: string }) {
  return (
    <ErrorBoundary
      level="component"
      context={context}
      enableRetry={false}
      maxRetries={0}
      showErrorDetails={process.env.NODE_ENV === 'development'}
      fallback={
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600">
            This component encountered an error and couldn&apos;t be displayed.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
