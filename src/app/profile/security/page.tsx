'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DashboardLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Modal } from '@/components/ui/modal'
import { useAuthContext } from '@/contexts/AuthContext'
import { 
  changePasswordSchema, 
  twoFactorSchema,
  type ChangePasswordFormData,
  type TwoFactorFormData,
  getPasswordStrength
} from '@/lib/validations/auth'
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  Smartphone,
  Key,
  AlertTriangle,
  CheckCircle,
  X,
  Copy,
  QrCode,
  RefreshCw,
  Clock,
  Globe,
  Monitor
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SecurityPage() {
  const { user, updatePassword } = useAuthContext()
  const [show2FASetup, setShow2FASetup] = React.useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false)
  const [showPasswords, setShowPasswords] = React.useState({
    current: false,
    new: false,
    confirm: false
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    }
  })

  const {
    register: register2FA,
    handleSubmit: handle2FASubmit,
    formState: { errors: errors2FA, isSubmitting: isSubmitting2FA },
    reset: reset2FA
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: ''
    }
  })

  const watchedNewPassword = watch('newPassword')
  const passwordStrength = watchedNewPassword ? getPasswordStrength(watchedNewPassword) : null

  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    try {
      const result = await updatePassword(data.newPassword)
      
      if (result.success) {
        toast.success('Password updated successfully!')
        reset()
      } else {
        toast.error(result.message)
      }
    } catch (error: any) {
      console.error('Password change error:', error)
      toast.error('Failed to update password')
    }
  }

  const on2FASubmit = async (data: TwoFactorFormData) => {
    try {
      // In a real app, you would verify the 2FA code
      console.log('2FA code:', data.code)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setTwoFactorEnabled(true)
      setShow2FASetup(false)
      toast.success('Two-factor authentication enabled!')
      reset2FA()
    } catch (error: any) {
      console.error('2FA setup error:', error)
      toast.error('Failed to enable two-factor authentication')
    }
  }

  const handleDisable2FA = async () => {
    try {
      // In a real app, you would disable 2FA
      setTwoFactorEnabled(false)
      toast.success('Two-factor authentication disabled')
    } catch (error: any) {
      console.error('2FA disable error:', error)
      toast.error('Failed to disable two-factor authentication')
    }
  }

  const activeSessions = [
    {
      id: '1',
      device: 'MacBook Pro',
      browser: 'Chrome',
      location: 'San Francisco, CA',
      lastActive: '2 minutes ago',
      current: true
    },
    {
      id: '2',
      device: 'iPhone 15',
      browser: 'Safari',
      location: 'San Francisco, CA',
      lastActive: '1 hour ago',
      current: false
    },
    {
      id: '3',
      device: 'Windows PC',
      browser: 'Edge',
      location: 'New York, NY',
      lastActive: '3 days ago',
      current: false
    }
  ]

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

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  return (
    <DashboardLayout
      title="Security Settings"
      description="Manage your account security and authentication methods"
    >
      <div className="space-y-6">
        {/* Security Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Security Overview</CardTitle>
            <CardDescription>
              Your account security status at a glance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email Verified</p>
                  <p className="text-xs text-gray-600">Your email is confirmed</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${twoFactorEnabled ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <Shield className={`h-5 w-5 ${twoFactorEnabled ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Two-Factor Auth</p>
                  <p className="text-xs text-gray-600">
                    {twoFactorEnabled ? 'Enabled' : 'Not enabled'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Lock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Strong Password</p>
                  <p className="text-xs text-gray-600">Password is secure</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Login Alerts</p>
                  <p className="text-xs text-gray-600">Monitoring enabled</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
              <Input
                {...register('currentPassword')}
                type={showPasswords.current ? 'text' : 'password'}
                label="Current Password"
                placeholder="Enter your current password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.currentPassword?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('newPassword')}
                type={showPasswords.new ? 'text' : 'password'}
                label="New Password"
                placeholder="Enter your new password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.newPassword?.message}
                disabled={isSubmitting}
              />

              {/* Password Strength Indicator */}
              {watchedNewPassword && passwordStrength && (
                <div className="space-y-2">
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
                </div>
              )}

              <Input
                {...register('confirmNewPassword')}
                type={showPasswords.confirm ? 'text' : 'password'}
                label="Confirm New Password"
                placeholder="Confirm your new password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.confirmNewPassword?.message}
                disabled={isSubmitting}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  loadingText="Updating..."
                >
                  Update Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${twoFactorEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Smartphone className={`h-5 w-5 ${twoFactorEnabled ? 'text-green-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Authenticator App
                  </p>
                  <p className="text-xs text-gray-600">
                    {twoFactorEnabled 
                      ? 'Two-factor authentication is enabled'
                      : 'Use an authenticator app for secure login'
                    }
                  </p>
                </div>
              </div>
              <div>
                {twoFactorEnabled ? (
                  <div className="flex space-x-2">
                    <Badge variant="success">Enabled</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisable2FA}
                    >
                      Disable
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShow2FASetup(true)}
                  >
                    Enable
                  </Button>
                )}
              </div>
            </div>

            {twoFactorEnabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900">2FA Enabled</h4>
                    <p className="text-xs text-green-800 mt-1">
                      Your account is protected with two-factor authentication. 
                      You'll need your authenticator app to sign in.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Manage where you&apos;re signed in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Monitor className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {session.device}
                        </p>
                        {session.current && (
                          <Badge variant="success" size="sm">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        {session.browser} • {session.location}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last active: {session.lastActive}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.success('Session terminated')
                      }}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
              
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.success('All other sessions terminated')
                  }}
                >
                  Revoke All Other Sessions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Security Recommendations</CardTitle>
            <CardDescription>
              Follow these best practices to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Use a strong, unique password</p>
                  <p className="text-xs text-gray-600">Your password meets our security requirements</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable two-factor authentication</p>
                  <p className="text-xs text-gray-600">
                    {twoFactorEnabled 
                      ? 'Great! Your account has 2FA protection'
                      : 'Add an extra layer of security to your account'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Keep your email secure</p>
                  <p className="text-xs text-gray-600">Your email address is verified and secure</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Review active sessions regularly</p>
                  <p className="text-xs text-gray-600">Check for any unauthorized access to your account</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        title="Enable Two-Factor Authentication"
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <QrCode className="h-16 w-16 text-gray-600" />
            </div>
            <p className="text-sm text-gray-600">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Can't scan? Enter this code manually:
            </p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 px-3 py-2 bg-white border rounded text-sm font-mono">
                JBSWY3DPEHPK3PXP
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText('JBSWY3DPEHPK3PXP')
                  toast.success('Code copied to clipboard')
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <form onSubmit={handle2FASubmit(on2FASubmit)} className="space-y-4">
            <Input
              {...register2FA('code')}
              label="Verification Code"
              placeholder="Enter 6-digit code from your app"
              error={errors2FA.code?.message}
              disabled={isSubmitting2FA}
              autoComplete="one-time-code"
              className="text-center text-lg tracking-widest"
              maxLength={6}
            />

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShow2FASetup(false)}
                disabled={isSubmitting2FA}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting2FA}
                loadingText="Verifying..."
              >
                Enable 2FA
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
