'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthContext } from '@/contexts/AuthContext'
import { resetPasswordSchema, type ResetPasswordFormData, getPasswordStrength } from '@/lib/validations/auth'
import { Lock, Eye, EyeOff, CheckCircle, X, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updatePassword } = useAuthContext()
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [resetComplete, setResetComplete] = React.useState(false)
  
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
    clearErrors
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      token: token || ''
    }
  })

  const watchedPassword = watch('password')
  const passwordStrength = watchedPassword ? getPasswordStrength(watchedPassword) : null

  // Redirect if no token
  React.useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token')
      router.push('/auth/forgot-password')
    }
  }, [token, router])

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      clearErrors()
      
      // In a real app, you would call your reset password API endpoint
      // For now, we&apos;ll use the updatePassword method (this would need to be adapted)
      const result = await updatePassword(data.password)
      
      if (result.success) {
        setResetComplete(true)
        toast.success('Password reset successfully!')
      } else {
        if (result.message.toLowerCase().includes('token')) {
          setError('token', { message: 'Invalid or expired reset token' })
        } else if (result.message.toLowerCase().includes('password')) {
          setError('password', { message: result.message })
        } else {
          setError('root', { message: result.message })
        }
      }
    } catch (error: any) {
      console.error('Reset password error:', error)
      setError('root', { 
        message: error?.message || 'An unexpected error occurred. Please try again.' 
      })
    }
  }

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 2) return 'bg-red-500'
    if (score <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = (score: number) => {
    if (score <= 2) return 'Weak'
    if (score <= 3) return 'Medium'
    return 'Strong'
  }

  if (resetComplete) {
    return (
      <AuthLayout
        title="Password reset successful"
        description="Your password has been updated"
      >
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Password Updated!</CardTitle>
              <CardDescription className="mt-2">
                Your password has been successfully reset. You can now sign in with your new password.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              Continue to Sign In
            </Button>
            
            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Return to homepage
              </Link>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your new password below"
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            {email && (
              <>
                Resetting password for{' '}
                <span className="font-medium text-gray-900">{email}</span>
              </>
            )}
            {!email && 'Enter your new password below'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Hidden Token Field */}
            <input {...register('token')} type="hidden" />

            {/* New Password Field */}
            <div>
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="New Password"
                placeholder="Enter your new password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                disabled={isSubmitting}
                autoComplete="new-password"
                autoFocus
              />
              
              {/* Password Strength Indicator */}
              {watchedPassword && passwordStrength && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {getPasswordStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-gray-500">
                      <p>Password should include:</p>
                      <ul className="mt-1 space-y-1">
                        {passwordStrength.feedback.map((item, index) => (
                          <li key={index} className="flex items-center space-x-1">
                            <X className="h-3 w-3 text-red-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <Input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirm New Password"
                placeholder="Confirm your new password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.confirmPassword?.message}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>

            {/* Token Error */}
            {errors.token && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.token.message}</p>
                <div className="mt-2">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    Request a new reset link
                  </Link>
                </div>
              </div>
            )}

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
              loadingText="Updating password..."
              disabled={isSubmitting}
            >
              Update Password
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

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 text-sm mb-2">Security Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Use a unique password you haven&apos;t used elsewhere</li>
              <li>• Include uppercase, lowercase, numbers, and symbols</li>
              <li>• Make it at least 8 characters long</li>
              <li>• Consider using a password manager</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
