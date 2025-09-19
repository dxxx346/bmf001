import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Search, ArrowLeft, FileQuestion } from 'lucide-react';

/**
 * Custom 404 Not Found Page
 * Displayed when a page or resource cannot be found
 */

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
            <FileQuestion className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">What happened?</h3>
            <p className="text-gray-600 text-sm">
              The page you requested doesn&apos;t exist or may have been moved. This could happen if:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>You typed the URL incorrectly</li>
              <li>You clicked on a broken or outdated link</li>
              <li>The page has been moved or deleted</li>
              <li>You don&apos;t have permission to access this page</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/" className="flex items-center justify-center gap-2">
                <Home className="h-4 w-4" />
                Go to Homepage
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="flex-1">
              <Link href="/search" className="flex items-center justify-center gap-2">
                <Search className="h-4 w-4" />
                Search Products
              </Link>
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>

          {/* Popular Links */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-800 mb-3">Popular Pages</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link 
                href="/products" 
                className="text-blue-600 hover:text-blue-800 text-sm hover:underline"
              >
                Browse Products
              </Link>
              <Link 
                href="/categories" 
                className="text-blue-600 hover:text-blue-800 text-sm hover:underline"
              >
                Categories
              </Link>
              <Link 
                href="/sellers" 
                className="text-blue-600 hover:text-blue-800 text-sm hover:underline"
              >
                Top Sellers
              </Link>
              <Link 
                href="/dashboard" 
                className="text-blue-600 hover:text-blue-800 text-sm hover:underline"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="text-center text-sm text-gray-500">
            Still can&apos;t find what you&apos;re looking for?{' '}
            <Link href="/support" className="text-blue-600 hover:underline">
              Contact Support
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
