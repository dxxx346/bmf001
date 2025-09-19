import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Home, LogIn, ArrowLeft, Lock } from 'lucide-react';

/**
 * Custom 403 Unauthorized Page
 * Displayed when user doesn't have permission to access a resource
 */

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto border-orange-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center">
            <Shield className="h-12 w-12 text-orange-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Access Denied
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            You don&apos;t have permission to access this resource.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Access Requirements */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-800 mb-2">Access Requirements</h3>
                <p className="text-orange-700 text-sm mb-3">
                  This page requires special permissions. You might need to:
                </p>
                <ul className="list-disc list-inside text-sm text-orange-700 space-y-1">
                  <li>Sign in to your account</li>
                  <li>Upgrade your account type</li>
                  <li>Contact an administrator for access</li>
                  <li>Verify your email address</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/auth/login" className="flex items-center justify-center gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="flex-1">
              <Link href="/" className="flex items-center justify-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
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

          {/* Account Types */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-800 mb-3">Account Types & Permissions</h3>
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Buyer Account</p>
                  <p className="text-sm text-gray-600">Browse and purchase products</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/auth/register">Sign Up</Link>
                </Button>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Seller Account</p>
                  <p className="text-sm text-gray-600">Sell products and manage shop</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/auth/register?type=seller">Become Seller</Link>
                </Button>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Partner Account</p>
                  <p className="text-sm text-gray-600">Earn commissions through referrals</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/auth/register?type=partner">Join Partners</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Support Contact */}
          <div className="text-center text-sm text-gray-500 border-t pt-4">
            Need help with account access?{' '}
            <Link href="/support" className="text-blue-600 hover:underline">
              Contact Support
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
