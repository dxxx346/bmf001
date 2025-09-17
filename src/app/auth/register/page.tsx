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
import { Badge } from '@/components/ui/badge'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { useAuthContext } from '@/contexts/AuthContext'
import { registerSchema, type RegisterFormData, getPasswordStrength } from '@/lib/validations/auth'
import { Mail, Lock, User, Eye, EyeOff, Store, ShoppingBag, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp } = useAuthContext()
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
    clearErrors
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'buyer',
      termsAccepted: false,
      marketingEmails: false
    }
  })

  const watchedPassword = watch('password')
  const watchedRole = watch('role')
  const passwordStrength = watchedPassword ? getPasswordStrength(watchedPassword) : null

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearErrors()
      
      const result = await signUp(data.email, data.password, {
        name: data.name,
        role: data.role
      })
      
      if (result.success) {
        toast.success('Registration successful! Please check your email to verify your account.')
        router.push('/auth/verify-email?email=' + encodeURIComponent(data.email))
      } else {
        // Handle specific error cases
        if (result.message.toLowerCase().includes('email')) {
          setError('email', { message: 'This email is already registered' })
        } else if (result.message.toLowerCase().includes('password')) {
          setError('password', { message: result.message })
        } else {
          setError('root', { message: result.message })
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error)
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

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'buyer':
        return 'Browse and purchase digital products from various sellers'
      case 'seller':
        return 'Create your shop and sell digital products to customers'
      default:
        return ''
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

  return (
    <AuthLayout
      title="Create your account"
      description="Join Digital Marketplace and start your journey"
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign Up</CardTitle>
          <CardDescription className="text-center">
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OAuth Buttons */}
          <OAuthButtons
            disabled={isSubmitting}
            onSuccess={handleOAuthSuccess}
            onError={handleOAuthError}
          />

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <div>
              <Input
                {...register('name')}
                type="text"
                label="Full Name"
                placeholder="Enter your full name"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.name?.message}
                disabled={isSubmitting}
                autoComplete="name"
              />
            </div>

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
                placeholder="Create a strong password"
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
                label="Confirm Password"
                placeholder="Confirm your password"
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

            {/* Role Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                I want to join as:
              </label>
              <div className="grid grid-cols-1 gap-3">
                <label className="relative">
                  <input
                    {...register('role')}
                    type="radio"
                    value="buyer"
                    className="sr-only"
                    disabled={isSubmitting}
                  />
                  <div className={`
                    p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${watchedRole === 'buyer' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}>
                    <div className="flex items-center space-x-3">
                      <ShoppingBag className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Buyer</span>
                          <Badge variant="default" size="sm">Recommended</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {getRoleDescription('buyer')}
                        </p>
                      </div>
                      {watchedRole === 'buyer' && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                </label>

                <label className="relative">
                  <input
                    {...register('role')}
                    type="radio"
                    value="seller"
                    className="sr-only"
                    disabled={isSubmitting}
                  />
                  <div className={`
                    p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${watchedRole === 'seller' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}>
                    <div className="flex items-center space-x-3">
                      <Store className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Seller</span>
                          <Badge variant="success" size="sm">Earn Money</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {getRoleDescription('seller')}
                        </p>
                      </div>
                      {watchedRole === 'seller' && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Terms and Marketing */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  {...register('termsAccepted')}
                  type="checkbox"
                  id="termsAccepted"
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="termsAccepted" className="text-sm text-gray-700">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.termsAccepted && (
                <p className="text-xs text-red-600 ml-7">{errors.termsAccepted.message}</p>
              )}

              <div className="flex items-start space-x-3">
                <input
                  {...register('marketingEmails')}
                  type="checkbox"
                  id="marketingEmails"
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="marketingEmails" className="text-sm text-gray-700">
                  I would like to receive marketing emails about new features, products, and special offers
                </label>
              </div>
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
              loadingText="Creating account..."
              disabled={isSubmitting}
            >
              Create Account
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href={`/auth/login${redirectTo !== '/dashboard' ? `?redirectTo=${redirectTo}` : ''}`}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in instead
              </Link>
            </p>
          </div>

          {/* Role Benefits */}
          {watchedRole === 'seller' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Seller Benefits</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4" />
                  <span>Create and manage your own shop</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4" />
                  <span>Upload and sell digital products</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4" />
                  <span>Access detailed sales analytics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4" />
                  <span>Manage customer relationships</span>
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
