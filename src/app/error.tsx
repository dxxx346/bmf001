'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';
import Link from 'next/link';

/**
 * Global Error Page (500)
 * Catches unhandled errors in the application
 */

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Global error caught:', error);
    
    // Send to error logging API
    fetch('/api/errors/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error_id: `global_error_${Date.now()}`,
        error_type: 'global_error',
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error);

    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          errorPage: true,
          digest: error.digest,
        },
        contexts: {
          page: {
            url: window.location.href,
            userAgent: navigator.userAgent,
          },
        },
      });
    }
  }, [error]);

  const handleReportError = () => {
    const subject = encodeURIComponent('Error Report - Application Error');
    const body = encodeURIComponent(`
Error Message: ${error.message}
Error Digest: ${error.digest || 'N/A'}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}

Please describe what you were doing when this error occurred:
[Your description here]
    `);
    
    window.open(`mailto:support@bmf001.com?subject=${subject}&body=${body}`);
  };

  const getErrorMessage = () => {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'Failed to load application resources. This is usually temporary.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to connect to our servers. Please check your internet connection.';
    }
    
    if (message.includes('timeout')) {
      return 'The request took too long to complete. Please try again.';
    }
    
    return 'An unexpected error occurred. Our team has been automatically notified.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto border-red-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            {getErrorMessage()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error ID */}
          {error.digest && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Error ID:</strong>{' '}
                <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                  {error.digest}
                </code>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Please include this ID when reporting the issue.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            
            <Button 
              asChild
              variant="outline" 
              className="flex-1"
            >
              <Link href="/" className="flex items-center justify-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
            
            <Button 
              onClick={handleReportError}
              variant="ghost"
              className="flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Report Issue
            </Button>
          </div>

          {/* Development Error Details */}
          {process.env.NODE_ENV === 'development' && (
            <details className="bg-gray-50 p-4 rounded-lg">
              <summary className="cursor-pointer font-medium text-gray-700 flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Development Error Details
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <strong>Error Message:</strong>
                  <pre className="mt-1 text-xs bg-gray-200 p-2 rounded overflow-x-auto">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 text-xs bg-gray-200 p-2 rounded overflow-x-auto max-h-40">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {error.digest && (
                  <div>
                    <strong>Error Digest:</strong>
                    <code className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                      {error.digest}
                    </code>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Help Text */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium text-blue-800 mb-1">What can you do?</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Try refreshing the page</li>
              <li>Check your internet connection</li>
              <li>Clear your browser cache and reload</li>
              <li>Try again in a few minutes</li>
              <li>If the problem persists, please report it to our support team</li>
            </ul>
          </div>

          {/* Support Contact */}
          <div className="text-center text-sm text-gray-500 border-t pt-4">
            Need immediate help?{' '}
            <Link href="/support" className="text-blue-600 hover:underline">
              Contact our support team
            </Link>
            {' '}or email us at{' '}
            <a href="mailto:support@bmf001.com" className="text-blue-600 hover:underline">
              support@bmf001.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
