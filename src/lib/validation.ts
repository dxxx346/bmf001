import { z } from 'zod';

// Common validation schemas
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password is too long')
  .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/^(?=.*\d)/, 'Password must contain at least one number')
  .regex(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character (@$!%*?&)');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters');

export const roleSchema = z.enum(['buyer', 'seller', 'partner', 'admin']);

// Authentication schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: roleSchema.optional().default('buyer'),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'Terms and conditions must be accepted',
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional().default(false),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio is too long').optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  location: z.string().max(100, 'Location is too long').optional(),
  phone: z.string().max(20, 'Phone number is too long').optional(),
});

// OAuth schemas
export const oauthCallbackSchema = z.object({
  provider: z.enum(['google', 'github']),
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  redirect_uri: z.string().url('Invalid redirect URI'),
});

// Session management schemas
export const revokeSessionSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
});

// Rate limiting schemas
export const rateLimitSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  limit: z.number().int().positive('Limit must be a positive integer'),
  window: z.number().int().positive('Window must be a positive integer'), // in seconds
});

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

// Success response schema
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// Auth response schemas
export const authResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    avatar_url: z.string().optional(),
    role: roleSchema,
    is_active: z.boolean(),
    email_verified: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    last_login_at: z.string().optional(),
  }).optional(),
  session: z.object({
    id: z.string(),
    user_id: z.string(),
    access_token: z.string(),
    refresh_token: z.string(),
    expires_at: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    status: z.enum(['active', 'expired', 'revoked']),
    user_agent: z.string().optional(),
    ip_address: z.string().optional(),
  }).optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;
export type RateLimitInput = z.infer<typeof rateLimitSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
