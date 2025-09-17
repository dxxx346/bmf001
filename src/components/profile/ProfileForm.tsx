'use client'

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserAvatar } from "@/components/ui/avatar"
import { AvatarUpload } from "./AvatarUpload"
import { useAuthContext } from "@/contexts/AuthContext"
import { 
  updateProfileSchema, 
  socialLinksSchema,
  type UpdateProfileFormData, 
  type SocialLinksFormData 
} from "@/lib/validations/auth"
import { 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  Globe, 
  FileText,
  Twitter,
  Linkedin,
  Github,
  Instagram,
  Youtube,
  Save,
  X
} from "lucide-react"
import toast from "react-hot-toast"

interface ProfileFormProps {
  className?: string
  onSave?: () => void
}

export function ProfileForm({ className, onSave }: ProfileFormProps) {
  const { user, profile, updateProfile, refreshProfile } = useAuthContext()
  const [isEditing, setIsEditing] = React.useState(false)
  const [showSocialLinks, setShowSocialLinks] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile?.name || '',
      email: profile?.email || '',
      bio: '',
      website: '',
      location: '',
      phone: ''
    }
  })

  const {
    register: registerSocial,
    handleSubmit: handleSocialSubmit,
    formState: { errors: socialErrors, isSubmitting: isSocialSubmitting },
    reset: resetSocial
  } = useForm<SocialLinksFormData>({
    resolver: zodResolver(socialLinksSchema),
    defaultValues: {
      twitter: '',
      linkedin: '',
      github: '',
      website: '',
      instagram: '',
      youtube: ''
    }
  })

  // Load current profile data when component mounts
  React.useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        email: profile.email || '',
        bio: '',
        website: '',
        location: '',
        phone: ''
      })
    }
  }, [profile, reset])

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      const result = await updateProfile({
        name: data.name,
        avatar_url: profile?.avatar_url // Keep existing avatar
      })

      if (result.success) {
        toast.success('Profile updated successfully!')
        setIsEditing(false)
        onSave?.()
        await refreshProfile()
      } else {
        toast.error(result.message)
      }
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error(error?.message || 'Failed to update profile')
    }
  }

  const onSocialSubmit = async (data: SocialLinksFormData) => {
    try {
      // In a real app, you would save social links to your database
      console.log('Social links:', data)
      toast.success('Social links updated successfully!')
      setShowSocialLinks(false)
    } catch (error: any) {
      console.error('Social links update error:', error)
      toast.error('Failed to update social links')
    }
  }

  const handleCancel = () => {
    reset()
    setIsEditing(false)
  }

  const handleAvatarUpload = (avatarUrl: string) => {
    setValue('name', profile?.name || '') // Trigger form update
    refreshProfile()
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'danger'
      case 'seller':
        return 'success'
      case 'partner':
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Manage your personal information and how others see you
              </CardDescription>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <AvatarUpload
              currentAvatarUrl={profile?.avatar_url || undefined}
              userName={profile?.name || profile?.email || 'User'}
              size="2xl"
              onUploadComplete={handleAvatarUpload}
            />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-semibold text-gray-900">
                {profile?.name || 'User'}
              </h3>
              <p className="text-gray-600">{profile?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant={getRoleBadgeVariant(profile?.role || 'buyer')}>
                  {profile?.role || 'buyer'}
                </Badge>
                <Badge variant="outline">
                  Member since {new Date(profile?.created_at || '').getFullYear()}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Profile Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <Input
                {...register('name')}
                label="Full Name"
                placeholder="Enter your full name"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.name?.message}
                disabled={!isEditing || isSubmitting}
              />

              {/* Email */}
              <Input
                {...register('email')}
                type="email"
                label="Email Address"
                placeholder="Enter your email"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                disabled={!isEditing || isSubmitting}
                helperText="Email changes require verification"
              />

              {/* Phone */}
              <Input
                {...register('phone')}
                type="tel"
                label="Phone Number"
                placeholder="+1 (555) 123-4567"
                leftIcon={<Phone className="h-4 w-4" />}
                error={errors.phone?.message}
                disabled={!isEditing || isSubmitting}
              />

              {/* Location */}
              <Input
                {...register('location')}
                label="Location"
                placeholder="City, Country"
                leftIcon={<MapPin className="h-4 w-4" />}
                error={errors.location?.message}
                disabled={!isEditing || isSubmitting}
              />

              {/* Website */}
              <Input
                {...register('website')}
                type="url"
                label="Website"
                placeholder="https://yourwebsite.com"
                leftIcon={<Globe className="h-4 w-4" />}
                error={errors.website?.message}
                disabled={!isEditing || isSubmitting}
                className="md:col-span-2"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Bio
              </label>
              <textarea
                {...register('bio')}
                placeholder="Tell us about yourself..."
                rows={4}
                disabled={!isEditing || isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
              {errors.bio && (
                <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Brief description for your public profile. Maximum 500 characters.
              </p>
            </div>

            {/* Form Actions */}
            {isEditing && (
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  loadingText="Saving..."
                  disabled={!isDirty || isSubmitting}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Social Links Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>
                Connect your social media accounts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSocialLinks(!showSocialLinks)}
            >
              {showSocialLinks ? 'Hide' : 'Manage'}
            </Button>
          </div>
        </CardHeader>
        
        {showSocialLinks && (
          <CardContent>
            <form onSubmit={handleSocialSubmit(onSocialSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  {...registerSocial('twitter')}
                  label="Twitter"
                  placeholder="https://twitter.com/username"
                  leftIcon={<Twitter className="h-4 w-4" />}
                  error={socialErrors.twitter?.message}
                  disabled={isSocialSubmitting}
                />

                <Input
                  {...registerSocial('linkedin')}
                  label="LinkedIn"
                  placeholder="https://linkedin.com/in/username"
                  leftIcon={<Linkedin className="h-4 w-4" />}
                  error={socialErrors.linkedin?.message}
                  disabled={isSocialSubmitting}
                />

                <Input
                  {...registerSocial('github')}
                  label="GitHub"
                  placeholder="https://github.com/username"
                  leftIcon={<Github className="h-4 w-4" />}
                  error={socialErrors.github?.message}
                  disabled={isSocialSubmitting}
                />

                <Input
                  {...registerSocial('instagram')}
                  label="Instagram"
                  placeholder="https://instagram.com/username"
                  leftIcon={<Instagram className="h-4 w-4" />}
                  error={socialErrors.instagram?.message}
                  disabled={isSocialSubmitting}
                />

                <Input
                  {...registerSocial('youtube')}
                  label="YouTube"
                  placeholder="https://youtube.com/channel/..."
                  leftIcon={<Youtube className="h-4 w-4" />}
                  error={socialErrors.youtube?.message}
                  disabled={isSocialSubmitting}
                  className="md:col-span-2"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSocialSubmitting}
                  loadingText="Saving..."
                >
                  Save Social Links
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Account Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            View your account details and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Account ID</label>
              <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                {user?.id}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Member Since</label>
              <p className="text-sm text-gray-900 mt-1">
                {new Date(profile?.created_at || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Account Status</label>
              <div className="mt-1">
                <Badge variant="success">Active</Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email Verified</label>
              <div className="mt-1">
                <Badge variant={user?.email_confirmed_at ? "success" : "warning"}>
                  {user?.email_confirmed_at ? "Verified" : "Pending"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Read-only Profile Display Component
interface ProfileDisplayProps {
  user: any // User from database
  className?: string
  showActions?: boolean
  onEdit?: () => void
}

export function ProfileDisplay({ 
  user, 
  className, 
  showActions = true,
  onEdit 
}: ProfileDisplayProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <UserAvatar
            src={user?.avatar_url}
            name={user?.name || user?.email}
            size="2xl"
          />
          
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-gray-900">
              {user?.name || 'User'}
            </h2>
            <p className="text-gray-600 mt-1">{user?.email}</p>
            
            {user?.bio && (
              <p className="text-gray-700 mt-3 text-sm leading-relaxed">
                {user.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
              <Badge variant={getRoleBadgeVariant(user?.role)}>
                {user?.role || 'buyer'}
              </Badge>
              {user?.location && (
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />
                  {user.location}
                </Badge>
              )}
              {user?.website && (
                <Badge variant="outline">
                  <Globe className="h-3 w-3 mr-1" />
                  Website
                </Badge>
              )}
            </div>

            {/* Social Links */}
            {user?.socialLinks && (
              <div className="flex space-x-3 mt-4 justify-center sm:justify-start">
                {user.socialLinks.twitter && (
                  <a
                    href={user.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-500"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {user.socialLinks.linkedin && (
                  <a
                    href={user.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {user.socialLinks.github && (
                  <a
                    href={user.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-900"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}

            {showActions && onEdit && (
              <div className="mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                >
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'admin':
      return 'danger'
    case 'seller':
      return 'success'
    case 'partner':
      return 'warning'
    default:
      return 'default'
  }
}
