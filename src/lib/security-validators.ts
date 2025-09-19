import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Security validation schemas and utilities
 * This module provides comprehensive input validation and sanitization
 */

// =============================================
// VALIDATION SCHEMAS
// =============================================

export const ProductSearchSchema = z.object({
  query: z.string().max(200).optional().transform(val => val ? sanitizeSearchQuery(val) : undefined),
  category_id: z.number().int().positive().optional(),
  subcategory_id: z.number().int().positive().optional(),
  min_price: z.number().min(0).max(999999.99).optional(),
  max_price: z.number().min(0).max(999999.99).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  max_rating: z.number().min(0).max(5).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  file_types: z.array(z.enum(['image', 'video', 'audio', 'document', 'archive', 'code', 'other'])).optional(),
  status: z.array(z.enum(['active', 'inactive', 'draft'])).optional(),
  is_featured: z.boolean().optional(),
  is_on_sale: z.boolean().optional(),
  seller_id: z.string().uuid().optional(),
  shop_id: z.string().uuid().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'price', 'rating', 'name', 'updated_at', 'popularity']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const ProductCreateSchema = z.object({
  title: z.string().min(1).max(200).transform(sanitizeHtml),
  description: z.string().max(5000).transform(sanitizeHtml),
  short_description: z.string().max(500).transform(sanitizeHtml),
  price: z.number().min(0).max(999999.99),
  sale_price: z.number().min(0).max(999999.99).optional(),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/).default('USD'),
  category_id: z.number().int().positive().optional(),
  subcategory_id: z.number().int().positive().optional(),
  product_type: z.enum(['digital', 'physical', 'service']).default('digital'),
  is_digital: z.boolean().default(true),
  is_downloadable: z.boolean().default(true),
  download_limit: z.number().int().min(0).max(1000).optional(),
  download_expiry_days: z.number().int().min(1).max(3650).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  seo: z.object({
    title: z.string().max(60).optional(),
    description: z.string().max(160).optional(),
    keywords: z.array(z.string().max(50)).max(10).optional(),
  }).default({}),
});

export const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).transform(sanitizeHtml),
  content: z.string().max(2000).transform(sanitizeHtml),
  is_anonymous: z.boolean().default(false),
});

export const UserUpdateSchema = z.object({
  name: z.string().max(100).transform(sanitizeHtml).optional(),
  bio: z.string().max(500).transform(sanitizeHtml).optional(),
  website: z.string().url().max(200).optional(),
  social_links: z.record(z.string(), z.string().url()).optional(),
});

// =============================================
// SANITIZATION FUNCTIONS
// =============================================

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize search queries to prevent SQL injection
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  // Remove potentially dangerous characters
  return query
    .replace(/['"\\;]/g, '') // Remove quotes, backslashes, semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*|\*\//g, '') // Remove block comments
    .replace(/%/g, '') // Remove wildcard characters
    .trim()
    .slice(0, 200); // Limit length
}

/**
 * Sanitize file names
 */
export function sanitizeFileName(filename: string): string {
  if (!filename) return '';
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .slice(0, 255); // Limit length
}

/**
 * Validate and sanitize JSON input
 */
export function safeJsonParse<T>(input: string, schema?: z.ZodSchema<T>): T | null {
  try {
    const parsed = JSON.parse(input);
    
    if (schema) {
      const result = schema.safeParse(parsed);
      return result.success ? result.data : null;
    }
    
    return parsed;
  } catch (error) {
    return null;
  }
}

/**
 * Escape SQL identifiers (table names, column names)
 */
export function escapeSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Rate limiting for sensitive operations
 */
export function validateRateLimit(operations: number, timeWindow: number, maxOperations: number): boolean {
  return operations <= maxOperations;
}

// =============================================
// CONTENT SECURITY POLICY
// =============================================

export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https:",
    "connect-src 'self' https://api.stripe.com wss:",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

// =============================================
// INPUT VALIDATION MIDDLEWARE
// =============================================

export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.safeParse(input);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }
    
    return {
      success: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`),
    };
  } catch (error) {
    return {
      success: false,
      errors: ['Validation failed'],
    };
  }
}

// =============================================
// AUDIT LOGGING
// =============================================

export interface SecurityAuditLog {
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  metadata?: Record<string, unknown>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export function createAuditLog(log: SecurityAuditLog): SecurityAuditLog {
  return {
    ...log,
    metadata: {
      timestamp: new Date().toISOString(),
      ...log.metadata,
    },
  };
}
