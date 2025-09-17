import { z } from 'zod'

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  )

// Email validation schema
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase()

// Name validation schema
const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')

// User role schema
const userRoleSchema = z.enum(['buyer', 'seller'], {
  message: 'Please select a valid role'
})

// Login form validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
})

// Registration form validation schema
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: userRoleSchema,
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  }),
  marketingEmails: z.boolean().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Forgot password form validation schema
export const forgotPasswordSchema = z.object({
  email: emailSchema
})

// Reset password form validation schema
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  token: z.string().min(1, 'Reset token is required')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Update profile form validation schema
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal(''))
})

// Profile preferences schema
export const profilePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system'], {
    message: 'Please select a valid theme'
  }),
  language: z.string().min(1, 'Language is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    marketing: z.boolean(),
    security: z.boolean()
  }),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private', 'friends']),
    showEmail: z.boolean(),
    showPurchases: z.boolean(),
    allowMessages: z.boolean()
  })
})

// Account settings schema
export const accountSettingsSchema = z.object({
  twoFactorEnabled: z.boolean(),
  loginNotifications: z.boolean(),
  sessionTimeout: z.number().min(15).max(1440), // 15 minutes to 24 hours
  allowMultipleSessions: z.boolean(),
  requirePasswordForSensitiveActions: z.boolean()
})

// Avatar upload schema
export const avatarUploadSchema = z.object({
  file: z.any()
    .refine((file) => file instanceof File, 'Please select a file')
    .refine((file) => file?.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file?.type),
      'Only JPEG, PNG, and WebP images are allowed'
    )
})

// Social links schema
export const socialLinksSchema = z.object({
  twitter: z.string().url('Please enter a valid Twitter URL').optional().or(z.literal('')),
  linkedin: z.string().url('Please enter a valid LinkedIn URL').optional().or(z.literal('')),
  github: z.string().url('Please enter a valid GitHub URL').optional().or(z.literal('')),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  instagram: z.string().url('Please enter a valid Instagram URL').optional().or(z.literal('')),
  youtube: z.string().url('Please enter a valid YouTube URL').optional().or(z.literal(''))
})

// Change password form validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string().min(1, 'Please confirm your new password')
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"]
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"]
})

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
})

// Two-factor authentication schema
export const twoFactorSchema = z.object({
  code: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Verification code must contain only numbers')
})

// OAuth callback schema
export const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional()
})

// Type exports for form data
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
export type EmailVerificationFormData = z.infer<typeof emailVerificationSchema>
export type TwoFactorFormData = z.infer<typeof twoFactorSchema>
export type OAuthCallbackData = z.infer<typeof oauthCallbackSchema>
export type ProfilePreferencesFormData = z.infer<typeof profilePreferencesSchema>
export type AccountSettingsFormData = z.infer<typeof accountSettingsSchema>
export type AvatarUploadFormData = z.infer<typeof avatarUploadSchema>
export type SocialLinksFormData = z.infer<typeof socialLinksSchema>

// Validation helper functions
export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success
}

export const validatePassword = (password: string): boolean => {
  return passwordSchema.safeParse(password).success
}

export const getPasswordStrength = (password: string): {
  score: number
  feedback: string[]
} => {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  else feedback.push('At least 8 characters')

  if (/[a-z]/.test(password)) score += 1
  else feedback.push('One lowercase letter')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('One uppercase letter')

  if (/\d/.test(password)) score += 1
  else feedback.push('One number')

  if (/[@$!%*?&]/.test(password)) score += 1
  else feedback.push('One special character')

  return { score, feedback }
}
