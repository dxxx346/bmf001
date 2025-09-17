'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthContext } from '@/contexts/AuthContext'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { resetPassword } = useAuthContext()
  const [emailSent, setEmailSent] = React.useState(false)
  const [sentEmail, setSentEmail] = React.useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    getValues
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      clearErrors()
      
      const result = await resetPassword(data.email)
      
      if (result.success) {
        setSentEmail(data.email)
        setEmailSent(true)
        toast.success('Password reset email sent!')
      } else {
        // Handle specific error cases
        if (result.message.toLowerCase().includes('email') || 
            result.message.toLowerCase().includes('user not found')) {
          setError('email', { message: 'No account found with this email address' })
        } else {
          setError('root', { message: result.message })
        }
      }
    } catch (error: any) {
      console.error('Forgot password error:', error)
      setError('root', { 
        message: error?.message || 'An unexpected error occurred. Please try again.' 
      })
    }
  }

  const handleResendEmail = async () => {
    const email = getValues('email') || sentEmail
    if (email) {
      const result = await resetPassword(email)
      if (result.success) {
        toast.success('Reset email sent again!')
      } else {
        toast.error('Failed to resend email. Please try again.')
      }
    }
  }

  if (emailSent) {
    return (
      <AuthLayout
        title="Check your email"
        description="We've sent you a password reset link"
      >
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription className="mt-2">
                We&apos;ve sent a password reset link to:
              </CardDescription>
              <div className="mt-2 px-3 py-2 bg-gray-100 rounded-md">
                <p className="text-sm font-medium text-gray-900">{sentEmail}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Click the link in the email to reset your password. The link will expire in 24 hours.
              </p>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  className="w-full"
                >
                  Resend Email
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

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button
                  onClick={handleResendEmail}
                  className="text-blue-600 hover:text-blue-500 underline"
                >
                  try again
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="No worries, we&apos;ll send you reset instructions"
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div>
              <Input
                {...register('email')}
                type="email"
                label="Email Address"
                placeholder="Enter your email address"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                disabled={isSubmitting}
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Root Error Display */}
            {errors.root && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isSubmitting}
              loadingText="Sending reset email..."
              disabled={isSubmitting}
            >
              Send Reset Email
            </Button>
          </form>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Remember your password?{' '}
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-500"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
