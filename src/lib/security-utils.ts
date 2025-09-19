/**
 * Security Utilities
 * Quick-access functions for common security operations
 */

import { NextRequest } from 'next/server';
import { securityAuditService } from '@/services/security-audit.service';
import { validateInput, sanitizeHtml, safeJsonParse } from './security-validators';
import { z } from 'zod';
import crypto from 'crypto';

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  const prefix = 'pk_';
  const randomBytes = crypto.randomBytes(32);
  const keyBody = randomBytes.toString('base64url');
  return `${prefix}${keyBody}`;
}

/**
 * Hash an API key for secure storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Securely compare two strings (constant-time comparison)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Sanitize input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return sanitizeHtml(input);
}

/**
 * Validate request origin
 */
export function validateOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
}

/**
 * Validate user agent to detect suspicious requests
 */
export function validateUserAgent(userAgent: string): boolean {
  if (!userAgent || userAgent.trim() === '') {
    return false;
  }
  
  // Block known bad user agents
  const blockedPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /postman/i,
  ];
  
  return !blockedPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Extract client information from request
 */
export function getClientInfo(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') || 
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    userId: request.headers.get('x-user-id') || undefined,
  };
}

/**
 * Quick security audit logging
 */
export async function logSecurityEvent(
  request: NextRequest,
  event: {
    action: string;
    resource_type: string;
    resource_id?: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, unknown>;
  }
) {
  const { ipAddress, userAgent, userId } = getClientInfo(request);
  
  await securityAuditService.logSecurityEvent({
    user_id: userId,
    event_type: 'suspicious_activity',
    action: event.action,
    resource_type: event.resource_type,
    resource_id: event.resource_id,
    ip_address: ipAddress,
    user_agent: userAgent,
    risk_level: event.risk_level,
    metadata: event.metadata,
  });
}

/**
 * Validate request input with security logging
 */
export async function validateRequestInput<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  input: unknown,
  resourceType: string
): Promise<{
  success: boolean;
  data?: T;
  errors?: string[];
}> {
  const validation = validateInput(schema, input);
  
  if (!validation.success) {
    await logSecurityEvent(request, {
      action: 'invalid_input',
      resource_type: resourceType,
      risk_level: 'medium',
      metadata: {
        errors: validation.errors,
        input_preview: JSON.stringify(input).slice(0, 200),
      },
    });
  }
  
  return validation;
}

/**
 * Safe JSON parsing with security logging
 */
export async function safeJsonParseWithLogging<T>(
  request: NextRequest,
  jsonString: string,
  schema?: z.ZodSchema<T>,
  resourceType = 'json_data'
): Promise<T | null> {
  try {
    const result = safeJsonParse(jsonString, schema);
    
    if (!result && jsonString.trim()) {
      await logSecurityEvent(request, {
        action: 'invalid_json_parse',
        resource_type: resourceType,
        risk_level: 'low',
        metadata: {
          json_preview: jsonString.slice(0, 100),
        },
      });
    }
    
    return result;
  } catch (error) {
    await logSecurityEvent(request, {
      action: 'json_parse_error',
      resource_type: resourceType,
      risk_level: 'medium',
      metadata: {
        error: (error as Error).message,
        json_preview: jsonString.slice(0, 100),
      },
    });
    
    return null;
  }
}

/**
 * Detect and log potential SQL injection attempts
 */
export async function detectSQLInjection(
  request: NextRequest,
  input: string,
  fieldName: string
): Promise<boolean> {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(;|\s)+(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC)\s+/gi,
    /UNION\s+(ALL\s+)?SELECT/gi,
    /\/\*[\s\S]*?\*\//gi, // SQL comments
    /--[\s\S]*$/gm, // SQL line comments
  ];

  const hasSQLInjection = sqlPatterns.some(pattern => pattern.test(input));
  
  if (hasSQLInjection) {
    await securityAuditService.logSQLInjectionAttempt(
      input,
      fieldName,
      request.headers.get('x-user-id') || undefined,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );
  
  return true;
}

  return false;
}

/**
 * Detect and log potential XSS attempts
 */
export async function detectXSS(
  request: NextRequest,
  input: string,
  fieldName: string
): Promise<boolean> {
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /<img[^>]+src[^>]*>.*onerror/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ];

  const hasXSS = xssPatterns.some(pattern => pattern.test(input));
  
  if (hasXSS) {
    await securityAuditService.logXSSAttempt(
      input,
      fieldName,
      request.headers.get('x-user-id') || undefined,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );
    
    return true;
  }
  
  return false;
}

/**
 * Comprehensive input security check
 */
export async function securityCheckInput(
  request: NextRequest,
  input: string,
  fieldName: string
): Promise<{
  safe: boolean;
  sanitized: string;
  threats: string[];
}> {
  const threats: string[] = [];
  
  // Check for SQL injection
  if (await detectSQLInjection(request, input, fieldName)) {
    threats.push('sql_injection');
  }
  
  // Check for XSS
  if (await detectXSS(request, input, fieldName)) {
    threats.push('xss');
  }
  
  // Sanitize the input
  const sanitized = sanitizeHtml(input);
  
  return {
    safe: threats.length === 0,
    sanitized,
    threats,
  };
}

/**
 * Rate limit check with security logging
 */
export async function checkRateLimit(
  request: NextRequest,
  endpoint: string,
  limit: number
): Promise<boolean> {
  // This would integrate with your rate limiting middleware
  // For now, we'll just log if needed
  
  const { ipAddress, userAgent, userId } = getClientInfo(request);
  
  // Placeholder for rate limit check
  const isRateLimited = false; // Replace with actual rate limit check
  
  if (isRateLimited) {
    await securityAuditService.logRateLimitViolation(
      endpoint,
      limit,
      userId,
      ipAddress,
      userAgent
    );
  }
  
  return !isRateLimited;
}

/**
 * Check if IP should be blocked
 */
export async function shouldBlockRequest(request: NextRequest): Promise<boolean> {
  const { ipAddress } = getClientInfo(request);
  return await securityAuditService.shouldBlockIP(ipAddress);
}

/**
 * Security middleware wrapper
 */
export function withSecurity<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: {
    checkRateLimit?: boolean;
    checkIPBlock?: boolean;
    logAccess?: boolean;
    resourceType?: string;
  } = {}
) {
  return async (...args: T): Promise<R> => {
    const request = args[0] as NextRequest;
    
    // Check IP blocking
    if (options.checkIPBlock && await shouldBlockRequest(request)) {
      throw new Error('IP blocked due to suspicious activity');
    }
    
    // Log access if requested
    if (options.logAccess) {
      await logSecurityEvent(request, {
        action: 'api_access',
        resource_type: options.resourceType || 'api',
        risk_level: 'low',
      });
    }
    
    return handler(...args);
  };
}

/**
 * Security headers for responses
 */
export const SECURITY_HEADERS = {
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
} as const;

/**
 * Apply security headers to response
 */
export function addSecurityHeaders(response: Response): Response {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}