import { NextRequest, NextResponse } from 'next/server';
import { defaultLogger as logger } from '../lib/logger';
import { sanitizeInput, validateOrigin, validateUserAgent } from '../lib/security-utils';
import { z } from 'zod';

/**
 * Security middleware for additional protection layers
 */

export interface SecurityConfig {
  enableXssProtection?: boolean;
  enableSqlInjectionProtection?: boolean;
  enableCsrfProtection?: boolean;
  enableInputSanitization?: boolean;
  maxRequestSize?: number; // in bytes
  allowedMethods?: string[];
  allowedOrigins?: string[];
  blockSuspiciousUserAgents?: boolean;
}

const defaultSecurityConfig: SecurityConfig = {
  enableXssProtection: true,
  enableSqlInjectionProtection: true,
  enableCsrfProtection: true,
  enableInputSanitization: true,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedOrigins: process.env.NODE_ENV === 'production' 
    ? [process.env.ALLOWED_ORIGINS || 'https://yourdomain.com']
    : ['*'],
  blockSuspiciousUserAgents: true,
};

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultSecurityConfig, ...config };
  }

  async handle(request: NextRequest): Promise<NextResponse | null> {
    try {
      // 1. Method validation
      if (!this.config.allowedMethods?.includes(request.method)) {
        logger.warn('Blocked disallowed HTTP method', { 
          method: request.method,
          url: request.url 
        });
        return new NextResponse('Method Not Allowed', { status: 405 });
      }

      // 2. Origin validation for CORS
      if (this.config.enableCsrfProtection && request.method !== 'GET') {
        const origin = request.headers.get('origin');
        if (!validateOrigin(origin, this.config.allowedOrigins || [])) {
          logger.warn('Blocked request from unauthorized origin', { 
            origin,
            url: request.url 
          });
          return new NextResponse('Forbidden', { status: 403 });
        }
      }

      // 3. User-Agent validation
      if (this.config.blockSuspiciousUserAgents) {
        const userAgent = request.headers.get('user-agent');
        const { valid, isBot } = validateUserAgent(userAgent);
        
        if (!valid || (isBot && !this.isAllowedBot(userAgent))) {
          logger.warn('Blocked suspicious user agent', { 
            userAgent,
            url: request.url 
          });
          return new NextResponse('Forbidden', { status: 403 });
        }
      }

      // 4. Request size validation
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > (this.config.maxRequestSize || 0)) {
        logger.warn('Blocked oversized request', { 
          contentLength,
          maxSize: this.config.maxRequestSize,
          url: request.url 
        });
        return new NextResponse('Request Entity Too Large', { status: 413 });
      }

      // 5. XSS protection for query parameters and headers
      if (this.config.enableXssProtection) {
        const xssDetected = this.detectXss(request);
        if (xssDetected) {
          logger.warn('XSS attempt detected', { 
            url: request.url,
            referer: request.headers.get('referer')
          });
          return new NextResponse('Bad Request', { status: 400 });
        }
      }

      // 6. SQL injection protection
      if (this.config.enableSqlInjectionProtection) {
        const sqlInjectionDetected = this.detectSqlInjection(request);
        if (sqlInjectionDetected) {
          logger.warn('SQL injection attempt detected', { 
            url: request.url,
            referer: request.headers.get('referer')
          });
          return new NextResponse('Bad Request', { status: 400 });
        }
      }

      // 7. Path traversal protection
      if (this.detectPathTraversal(request)) {
        logger.warn('Path traversal attempt detected', { 
          url: request.url,
          pathname: new URL(request.url).pathname
        });
        return new NextResponse('Bad Request', { status: 400 });
      }

      // 8. Request headers validation
      const headerValidation = this.validateHeaders(request);
      if (!headerValidation.valid) {
        logger.warn('Invalid request headers', { 
          url: request.url,
          errors: headerValidation.errors
        });
        return new NextResponse('Bad Request', { status: 400 });
      }

      return null; // Continue to next middleware
    } catch (error) {
      logger.error('Security middleware error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  private isAllowedBot(userAgent: string | null): boolean {
    if (!userAgent) return false;
    
    const allowedBots = [
      /googlebot/i,
      /bingbot/i,
      /slurp/i, // Yahoo
      /duckduckbot/i,
      /baiduspider/i,
      /yandexbot/i,
      /facebookexternalhit/i,
      /twitterbot/i,
      /linkedinbot/i,
      /whatsapp/i,
      /telegrambot/i
    ];

    return allowedBots.some(pattern => pattern.test(userAgent));
  }

  private detectXss(request: NextRequest): boolean {
    const url = new URL(request.url);
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
      /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
      /<embed[\s\S]*?>/gi,
    ];

    // Check query parameters
    for (const [, value] of url.searchParams) {
      if (xssPatterns.some(pattern => pattern.test(value))) {
        return true;
      }
    }

    // Check specific headers
    const headersToCheck = ['referer', 'user-agent'];
    for (const headerName of headersToCheck) {
      const headerValue = request.headers.get(headerName);
      if (headerValue && xssPatterns.some(pattern => pattern.test(headerValue))) {
        return true;
      }
    }

    return false;
  }

  private detectSqlInjection(request: NextRequest): boolean {
    const url = new URL(request.url);
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\b(OR|AND)\s+['"]\w+['"]\s*=\s*['"]\w+['"])/gi,
      /(;|\s)+(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC)\s+/gi,
      /(\s|^)(OR|AND)\s+1\s*=\s*1/gi,
      /(\s|^)(OR|AND)\s+['"][\w\s]*['"]\s*=\s*['"][\w\s]*['"](\s|$)/gi,
      /UNION\s+(ALL\s+)?SELECT/gi,
      /\/\*[\s\S]*?\*\//gi, // SQL comments
      /--[\s\S]*$/gm, // SQL line comments
      /\bINFORMATION_SCHEMA\b/gi,
      /\bSYSTEM_USER\b/gi,
      /\bCONCAT\s*\(/gi,
      /\bCHAR\s*\(/gi,
      /\bASCII\s*\(/gi,
      /\bHEX\s*\(/gi,
      /\bUNHEX\s*\(/gi,
    ];

    // Check query parameters
    for (const [, value] of url.searchParams) {
      if (sqlPatterns.some(pattern => pattern.test(value))) {
        return true;
      }
    }

    // Check pathname for SQL injection
    if (sqlPatterns.some(pattern => pattern.test(url.pathname))) {
      return true;
    }

    return false;
  }

  private detectPathTraversal(request: NextRequest): boolean {
    const url = new URL(request.url);
    const traversalPatterns = [
      /\.\.[\/\\]/g,
      /\.\.[%][2f|2F|5c|5C]/g,
      /[%][2e|2E][%][2e|2E][%][2f|2F|5c|5C]/g,
      /\.{2,}/g,
      /[\/\\]\.{1,}[\/\\]/g,
    ];

    // Check pathname
    if (traversalPatterns.some(pattern => pattern.test(url.pathname))) {
      return true;
    }

    // Check query parameters
    for (const [, value] of url.searchParams) {
      if (traversalPatterns.some(pattern => pattern.test(value))) {
        return true;
      }
    }

    return false;
  }

  private validateHeaders(request: NextRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url',
    ];

    for (const headerName of suspiciousHeaders) {
      const headerValue = request.headers.get(headerName);
      if (headerValue && headerValue !== request.headers.get('host')) {
        errors.push(`Suspicious header: ${headerName}`);
      }
    }

    // Validate content-type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      if (!contentType) {
        errors.push('Missing content-type header');
      } else {
        const allowedContentTypes = [
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data',
          'text/plain'
        ];
        
        if (!allowedContentTypes.some(type => contentType.includes(type))) {
          errors.push(`Invalid content-type: ${contentType}`);
        }
      }
    }

    // Check for excessively long headers
    for (const [name, value] of request.headers.entries()) {
      if (name.length > 100 || (value && value.length > 4000)) {
        errors.push(`Header too long: ${name}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Request body validation schema
export const requestBodySchema = z.object({
  data: z.unknown().optional(),
}).catchall(z.unknown());

// Validate and sanitize request body
export async function validateRequestBody(request: NextRequest): Promise<{
  valid: boolean;
  data?: any;
  errors?: string[];
}> {
  try {
    const contentType = request.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return { valid: true }; // Skip validation for non-JSON requests
    }

    const body = await request.text();
    if (!body) {
      return { valid: true }; // Empty body is valid
    }

    // Parse JSON safely
    let jsonData;
    try {
      jsonData = JSON.parse(body);
    } catch (error) {
      return { 
        valid: false, 
        errors: ['Invalid JSON format'] 
      };
    }

    // Basic structure validation
    const validation = requestBodySchema.safeParse(jsonData);
    if (!validation.success) {
      return {
        valid: false,
        errors: validation.error.issues.map(issue => issue.message)
      };
    }

    // Sanitize string values recursively
    const sanitizedData = sanitizeObjectStrings(jsonData);

    return {
      valid: true,
      data: sanitizedData
    };
  } catch (error) {
    logger.error('Request body validation error:', error);
    return {
      valid: false,
      errors: ['Request body validation failed']
    };
  }
}

// Recursively sanitize string values in an object
function sanitizeObjectStrings(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeInput(key)] = sanitizeObjectStrings(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Export default security middleware instance
export const securityMiddleware = new SecurityMiddleware();

// Specialized middleware configurations
export const apiSecurityMiddleware = new SecurityMiddleware({
  enableCsrfProtection: true,
  maxRequestSize: 5 * 1024 * 1024, // 5MB for API
  blockSuspiciousUserAgents: true,
});

export const uploadSecurityMiddleware = new SecurityMiddleware({
  enableCsrfProtection: true,
  maxRequestSize: 100 * 1024 * 1024, // 100MB for file uploads
  allowedMethods: ['POST', 'PUT'],
  blockSuspiciousUserAgents: true,
});

export const authSecurityMiddleware = new SecurityMiddleware({
  enableCsrfProtection: true,
  enableXssProtection: true,
  enableSqlInjectionProtection: true,
  maxRequestSize: 1024 * 1024, // 1MB for auth
  blockSuspiciousUserAgents: true,
});
