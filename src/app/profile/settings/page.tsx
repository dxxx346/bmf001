'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DashboardLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectItem } from '@/components/ui/dropdown'
import { Separator } from '@/components/ui/separator'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { 
  profilePreferencesSchema, 
  type ProfilePreferencesFormData 
} from '@/lib/validations/auth'
import { 
  Bell, 
  Globe, 
  Moon, 
  Sun, 
  Monitor, 
  Eye, 
  EyeOff, 
  Mail,
  Smartphone,
  Shield,
  Trash2,
  Download,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    setValue
  } = useForm<ProfilePreferencesFormData>({
    resolver: zodResolver(profilePreferencesSchema),
    defaultValues: {
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: true,
        marketing: false,
        security: true
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPurchases: false,
        allowMessages: true
      }
    }
  })

  const watchedTheme = watch('theme')
  const watchedNotifications = watch('notifications')
  const watchedPrivacy = watch('privacy')

  const onSubmit = async (data: ProfilePreferencesFormData) => {
    try {
      // In a real app, you would save preferences to your backend
      console.log('Saving preferences:', data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Settings saved successfully!')
    } catch (error: any) {
      console.error('Settings save error:', error)
      toast.error('Failed to save settings')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)
      
      // In a real app, you would call your delete account API
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success('Account deletion initiated. You will receive an email confirmation.')
      setShowDeleteConfirm(false)
    } catch (error: any) {
      console.error('Account deletion error:', error)
      toast.error('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportData = async () => {
    try {
      // In a real app, you would call your data export API
      toast.success('Data export started. You will receive an email when ready.')
    } catch (error: any) {
      console.error('Data export error:', error)
      toast.error('Failed to export data')
    }
  }

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <DashboardLayout
      title="Account Settings"
      description="Manage your preferences and account settings"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the interface looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['light', 'dark', 'system'].map((theme) => (
                    <label key={theme} className="relative">
                      <input
                        {...register('theme')}
                        type="radio"
                        value={theme}
                        className="sr-only"
                      />
                      <div className={`
                        p-3 border-2 rounded-lg cursor-pointer transition-all text-center
                        ${watchedTheme === theme 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}>
                        <div className="flex flex-col items-center space-y-1">
                          {getThemeIcon(theme)}
                          <span className="text-xs font-medium capitalize">{theme}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Select
                  label="Language"
                  value="en"
                  placeholder="Select language"
                >
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <p className="text-xs text-gray-600">Receive notifications via email</p>
                  </div>
                </div>
                <input
                  {...register('notifications.email')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                    <p className="text-xs text-gray-600">Receive push notifications on your devices</p>
                  </div>
                </div>
                <input
                  {...register('notifications.push')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Marketing Emails</p>
                    <p className="text-xs text-gray-600">Receive emails about new features and offers</p>
                  </div>
                </div>
                <input
                  {...register('notifications.marketing')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Security Alerts</p>
                    <p className="text-xs text-gray-600">Get notified about security events</p>
                  </div>
                </div>
                <input
                  {...register('notifications.security')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>
              Control who can see your information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Select
                label="Profile Visibility"
                value={watchedPrivacy?.profileVisibility || 'public'}
                onValueChange={(value) => setValue('privacy.profileVisibility', value as any)}
              >
                <SelectItem value="public">Public - Anyone can see your profile</SelectItem>
                <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                <SelectItem value="friends">Friends - Only connections can see</SelectItem>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Show Email Address</p>
                  <p className="text-xs text-gray-600">Display your email on your public profile</p>
                </div>
                <input
                  {...register('privacy.showEmail')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Show Purchase History</p>
                  <p className="text-xs text-gray-600">Display your recent purchases on your profile</p>
                </div>
                <input
                  {...register('privacy.showPurchases')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Allow Messages</p>
                  <p className="text-xs text-gray-600">Let other users send you messages</p>
                </div>
                <input
                  {...register('privacy.allowMessages')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Export or delete your account data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportData}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </Button>
              
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900">Data Export</h4>
                  <p className="text-xs text-yellow-800 mt-1">
                    You can export all your data including purchases, favorites, and account information. 
                    The export will be sent to your email address.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            loadingText="Saving..."
            disabled={!isDirty || isSubmitting}
          >
            Save Settings
          </Button>
        </div>
      </form>

      {/* Delete Account Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action cannot be undone and you will lose all your data, purchases, and access to digital products."
        variant="danger"
        confirmText="Yes, Delete Account"
        cancelText="Cancel"
        loading={isDeleting}
      />
    </DashboardLayout>
  )
}
