'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isResending, setIsResending] = React.useState(false)
  
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  // If there&apos;s a token, this is an email verification attempt
  React.useEffect(() => {
    if (token) {
      // Handle email verification
      handleEmailVerification(token)
    }
  }, [token])

  const handleEmailVerification = async (verificationToken: string) => {
    try {
      // In a real app, you would verify the token with your API
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Email verified successfully!')
        router.push('/auth/login?message=email_verified')
      } else {
        toast.error(result.message || 'Email verification failed')
        // Stay on the page to show error state
      }
    } catch (error) {
      console.error('Email verification error:', error)
      toast.error('Email verification failed. Please try again.')
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email address is required')
      return
    }

    try {
      setIsResending(true)
      
      // In a real app, you would call your resend verification API
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Verification email sent!')
      } else {
        toast.error(result.message || 'Failed to resend verification email')
      }
    } catch (error) {
      console.error('Resend verification error:', error)
      toast.error('Failed to resend verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  // If verifying with token, show loading state
  if (token) {
    return (
      <AuthLayout
        title="Verifying your email"
        description="Please wait while we verify your email address"
      >
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Verifying your email...
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  This should only take a moment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Verify your email"
      description="Check your inbox for a verification link"
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="mt-2">
              We&apos;ve sent a verification link to:
            </CardDescription>
            {email && (
              <div className="mt-2 px-3 py-2 bg-gray-100 rounded-md">
                <p className="text-sm font-medium text-gray-900">{email}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Click the verification link in the email to activate your account. 
              The link will expire in 24 hours.
            </p>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleResendVerification}
                loading={isResending}
                loadingText="Sending..."
                disabled={!email || isResending}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend Verification Email
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 text-sm mb-2">Didn&apos;t receive the email?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure {email || 'your email'} is correct</li>
              <li>• Wait a few minutes for the email to arrive</li>
              <li>• Click &quot;Resend&quot; to get a new verification email</li>
            </ul>
          </div>

          {/* Status Indicators */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <Badge variant="warning" size="sm">Pending</Badge>
              <span className="text-gray-600">Email verification required</span>
            </div>
            <div className="text-xs text-gray-500">
              You&apos;ll need to verify your email before you can access all features.
            </div>
          </div>

          {/* Alternative Actions */}
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              Wrong email address?{' '}
              <Link
                href="/auth/register"
                className="text-blue-600 hover:text-blue-500"
              >
                Sign up again
              </Link>
            </p>
            <p className="text-xs text-gray-500">
              Need help?{' '}
              <Link
                href="/contact"
                className="text-blue-600 hover:text-blue-500"
              >
                Contact support
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
