'use client'

import * as React from "react"
import { AlertCircle, RefreshCw, Home, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  enableReporting?: boolean
  level?: 'page' | 'section' | 'component'
}

interface ErrorFallbackProps {
  error: Error
  errorInfo: React.ErrorInfo
  resetError: () => void
  errorId: string
  level: 'page' | 'section' | 'component'
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error)
      console.error('Error Info:', errorInfo)
    }

    // Call onError callback
    this.props.onError?.(error, errorInfo)

    // Report error to monitoring service
    if (this.props.enableReporting) {
      this.reportError(error, errorInfo)
    }
  }

  private reportError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // Report to your error monitoring service (e.g., Sentry, LogRocket)
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        level: this.props.level || 'component'
      }

      // Send to your error reporting endpoint
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      }).catch(() => {
        // Silently fail if error reporting fails
      })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          errorId={this.state.errorId}
          level={this.props.level || 'component'}
        />
      )
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ 
  error, 
  errorInfo, 
  resetError, 
  errorId, 
  level 
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false)

  const getErrorTitle = () => {
    switch (level) {
      case 'page':
        return 'Page Error'
      case 'section':
        return 'Section Error'
      default:
        return 'Component Error'
    }
  }

  const getErrorMessage = () => {
    switch (level) {
      case 'page':
        return 'Sorry, something went wrong with this page.'
      case 'section':
        return 'This section encountered an error.'
      default:
        return 'This component encountered an error.'
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{getErrorTitle()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">
          {getErrorMessage()} We've been notified and are working to fix this issue.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={resetError} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Try Again
          </Button>
          
          {level === 'page' && (
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline" 
              size="sm"
            >
              <Home className="h-4 w-4 mr-1" />
              Go Home
            </Button>
          )}
          
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="ghost"
            size="sm"
          >
            <Bug className="h-4 w-4 mr-1" />
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        {showDetails && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2 text-sm">
              <div>
                <strong>Error ID:</strong> <code className="bg-gray-200 px-1 rounded">{errorId}</code>
              </div>
              <div>
                <strong>Message:</strong> {error.message}
              </div>
              {process.env.NODE_ENV === 'development' && (
                <>
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                      {error.stack}
                    </pre>
                  </div>
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Specialized error fallbacks
export function PageErrorFallback(props: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <DefaultErrorFallback {...props} />
    </div>
  )
}

export function SectionErrorFallback(props: ErrorFallbackProps) {
  return (
    <div className="w-full p-4">
      <DefaultErrorFallback {...props} />
    </div>
  )
}

export function ComponentErrorFallback({ error, resetError, errorId }: ErrorFallbackProps) {
  return (
    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
      <div className="flex items-center space-x-2 text-red-700 mb-2">
        <AlertCircle className="h-4 w-4" />
        <span className="font-medium">Component Error</span>
      </div>
      <p className="text-sm text-red-600 mb-3">
        This component failed to render: {error.message}
      </p>
      <Button onClick={resetError} size="sm" variant="outline">
        <RefreshCw className="h-3 w-3 mr-1" />
        Retry
      </Button>
    </div>
  )
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  // Throw error to nearest error boundary
  if (error) {
    throw error
  }

  return { handleError, resetError }
}

// Async error boundary hook
export function useAsyncErrorHandler() {
  const { handleError } = useErrorHandler()

  const asyncHandler = React.useCallback(
    <T extends any[], R>(fn: (...args: T) => Promise<R>) => {
      return async (...args: T): Promise<R | void> => {
        try {
          return await fn(...args)
        } catch (error) {
          handleError(error instanceof Error ? error : new Error(String(error)))
        }
      }
    },
    [handleError]
  )

  return asyncHandler
}
