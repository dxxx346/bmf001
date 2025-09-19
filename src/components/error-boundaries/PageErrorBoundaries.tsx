'use client';

import React, { ReactNode } from 'react';
import { ErrorBoundary, PageErrorBoundary, SectionErrorBoundary } from '@/components/ErrorBoundary';
import { ApiErrorBoundary } from '@/components/ApiErrorBoundary';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

/**
 * Specialized Error Boundaries for Different Page Sections
 */

// Dashboard Error Boundary
export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary context="dashboard">
      <ApiErrorBoundary
        enableRetry={true}
        enableToasts={true}
        fallback={(error, retry) => (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Dashboard Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{error.userMessage}</p>
              <div className="flex gap-2">
                <Button onClick={retry} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </PageErrorBoundary>
  );
}

// Product Page Error Boundary
export function ProductPageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary context="product_page">
      <ApiErrorBoundary
        enableRetry={true}
        enableToasts={true}
        fallback={(error, retry) => (
          <div className="min-h-[400px] flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Product Load Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Unable to load product details. {error.userMessage}
                </p>
                <div className="flex gap-2">
                  <Button onClick={retry} size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/products">Browse Products</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </PageErrorBoundary>
  );
}

// Shop Page Error Boundary
export function ShopPageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary context="shop_page">
      <ApiErrorBoundary
        enableRetry={true}
        enableToasts={true}
        fallback={(error, retry) => (
          <div className="min-h-[400px] flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Shop Load Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Unable to load shop information. {error.userMessage}
                </p>
                <div className="flex gap-2">
                  <Button onClick={retry} size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/shops">Browse Shops</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </PageErrorBoundary>
  );
}

// Checkout Error Boundary
export function CheckoutErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary context="checkout">
      <ApiErrorBoundary
        enableRetry={true}
        enableToasts={true}
        maxRetries={2}
        fallback={(error, retry) => (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Checkout Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                There was an issue processing your checkout. {error.userMessage}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Don&apos;t worry:</strong> Your payment has not been processed. 
                  You can safely try again.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={retry} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/cart">Return to Cart</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </PageErrorBoundary>
  );
}

// Admin Panel Error Boundary
export function AdminErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary context="admin_panel">
      <ApiErrorBoundary
        enableRetry={true}
        enableToasts={false} // Disable toasts in admin panel
        fallback={(error, retry) => (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Admin Panel Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">{error.userMessage}</p>
              <p className="text-sm text-gray-500 mb-4">
                Error ID: <code className="bg-gray-200 px-1 rounded">{error.id}</code>
              </p>
              <div className="flex gap-2">
                <Button onClick={retry} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin">Admin Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </PageErrorBoundary>
  );
}

// Search Results Error Boundary
export function SearchErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <SectionErrorBoundary context="search_results">
      <ApiErrorBoundary
        enableRetry={true}
        enableToasts={true}
        fallback={(error, retry) => (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Search Error
            </h3>
            <p className="text-gray-600 mb-4">
              Unable to load search results. {error.userMessage}
            </p>
            <Button onClick={retry} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </SectionErrorBoundary>
  );
}

// Product List Error Boundary
export function ProductListErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <SectionErrorBoundary context="product_list">
      <ApiErrorBoundary
        enableRetry={true}
        enableToasts={true}
        fallback={(error, retry) => (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-2">
              Unable to Load Products
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              {error.userMessage}
            </p>
            <Button onClick={retry} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </SectionErrorBoundary>
  );
}

// Payment Error Boundary
export function PaymentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <SectionErrorBoundary context="payment">
      <ApiErrorBoundary
        enableRetry={false} // Don't auto-retry payments
        enableToasts={true}
        fallback={(error, retry) => (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Payment Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                {error.userMessage}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Important:</strong> No payment has been processed. 
                  Please contact support if you need assistance.
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/support">Contact Support</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/cart">Return to Cart</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </SectionErrorBoundary>
  );
}

// File Upload Error Boundary
export function FileUploadErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <SectionErrorBoundary context="file_upload">
      <ApiErrorBoundary
        enableRetry={true}
        enableToasts={true}
        maxRetries={2}
        fallback={(error, retry) => (
          <div className="border-2 border-dashed border-red-300 bg-red-50 rounded-lg p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-2">
              Upload Error
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              {error.userMessage}
            </p>
            <Button onClick={retry} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Upload Again
            </Button>
          </div>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </SectionErrorBoundary>
  );
}

// Generic Section Error Boundary
export function GenericSectionErrorBoundary({ 
  children, 
  context,
  title = "Section Error",
  description = "This section encountered an error."
}: { 
  children: ReactNode; 
  context: string;
  title?: string;
  description?: string;
}) {
  return (
    <SectionErrorBoundary context={context}>
      <ApiErrorBoundary
        enableRetry={true}
        enableToasts={true}
        fallback={(error, retry) => (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h4 className="font-medium text-gray-900">{title}</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {description} {error.userMessage}
            </p>
            <Button onClick={retry} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}
      >
        {children}
      </ApiErrorBoundary>
    </SectionErrorBoundary>
  );
}
