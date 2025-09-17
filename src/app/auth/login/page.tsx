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
import { Separator } from '@/components/ui/separator'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { useAuthContext } from '@/contexts/AuthContext'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuthContext()
  const [showPassword, setShowPassword] = React.useState(false)
  
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const error = searchParams.get('error')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  })

  // Show error from URL params (e.g., from OAuth callback)
  React.useEffect(() => {
    if (error) {
      const errorMessages: Record<string, string> = {
        'callback_failed': 'Authentication failed. Please try again.',
        'access_denied': 'Access was denied. Please try again.',
        'server_error': 'Server error occurred. Please try again later.'
      }
      
      const message = errorMessages[error] || 'An error occurred during authentication.'
      toast.error(message)
    }
  }, [error])

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearErrors()
      
      const result = await signIn(data.email, data.password)
      
      if (result.success) {
        toast.success('Welcome back!')
        router.push(redirectTo)
      } else {
        // Handle specific error cases
        if (result.message.toLowerCase().includes('email')) {
          setError('email', { message: 'Invalid email address' })
        } else if (result.message.toLowerCase().includes('password')) {
          setError('password', { message: 'Invalid password' })
        } else {
          setError('root', { message: result.message })
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setError('root', { 
        message: error?.message || 'An unexpected error occurred. Please try again.' 
      })
    }
  }

  const handleOAuthSuccess = () => {
    router.push(redirectTo)
  }

  const handleOAuthError = (error: string) => {
    toast.error(error)
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your Digital Marketplace account"
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OAuth Buttons */}
          <OAuthButtons
            disabled={isSubmitting}
            onSuccess={handleOAuthSuccess}
            onError={handleOAuthError}
          />

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div>
              <Input
                {...register('email')}
                type="email"
                label="Email Address"
                placeholder="Enter your email"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div>
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
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
                autoComplete="current-password"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  id="rememberMe"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot password?
              </Link>
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
              loadingText="Signing in..."
              disabled={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link
                href={`/auth/register${redirectTo !== '/dashboard' ? `?redirectTo=${redirectTo}` : ''}`}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Additional Links */}
          <div className="text-center space-y-2">
            <div className="text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
