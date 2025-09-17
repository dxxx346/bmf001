import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import crypto from 'crypto';

/**
 * Input sanitization utilities for XSS prevention
 */

// XSS prevention through input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Basic HTML sanitization using DOMPurify
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  });
}

// More permissive sanitization for rich text content
export function sanitizeRichText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'
    ],
    ALLOWED_ATTR: ['class'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
    FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style'],
  });
}

// URL sanitization
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

// File name sanitization
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') {
    return '';
  }
  
  // Remove path traversal attempts and dangerous characters
  return fileName
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove Windows forbidden characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
    .replace(/^\.+/, '') // Remove leading dots
    .trim()
    .substring(0, 255); // Limit length
}

/**
 * SQL injection prevention utilities
 */

// Validate UUID format to prevent SQL injection in UUID parameters
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Validate and sanitize database identifiers (table names, column names)
export function validateIdentifier(identifier: string): boolean {
  // Only allow alphanumeric characters and underscores
  const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return identifierRegex.test(identifier) && identifier.length <= 63;
}

// Safe SQL LIKE pattern escaping
export function escapeLikePattern(pattern: string): string {
  return pattern
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/%/g, '\\%') // Escape percent signs
    .replace(/_/g, '\\_'); // Escape underscores
}

/**
 * General validation utilities
 */

// Email validation with additional security checks
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Additional checks
  if (email.length > 254) return false; // RFC 5321 limit
  if (email.includes('..')) return false; // Consecutive dots
  if (email.startsWith('.') || email.endsWith('.')) return false; // Leading/trailing dots
  
  return true;
}

// Phone number validation and sanitization
export function sanitizePhoneNumber(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }
  
  // Remove all non-digit characters except + at the beginning
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure + is only at the beginning
  if (cleaned.includes('+')) {
    const parts = cleaned.split('+');
    if (parts.length === 2 && parts[0] === '') {
      return '+' + parts[1];
    }
    return parts.join('').replace(/\+/g, '');
  }
  
  return cleaned;
}

/**
 * Cryptographic utilities
 */

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Generate API key
export function generateApiKey(): string {
  const prefix = 'pk_';
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return prefix + randomPart;
}

// Hash API key for storage
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Generate salt for password hashing
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Secure comparison function to prevent timing attacks
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
 * Content validation utilities
 */

// Validate JSON input safely
export function validateJsonInput(input: unknown): boolean {
  try {
    if (typeof input === 'string') {
      JSON.parse(input);
    }
    return true;
  } catch {
    return false;
  }
}

// Validate and sanitize search queries
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }
  
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/['";]/g, '') // Remove SQL injection characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100); // Limit length
}

// Validate file upload metadata
export function validateFileMetadata(metadata: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate file name
  const sanitizedName = sanitizeFileName(metadata.name);
  if (!sanitizedName || sanitizedName !== metadata.name) {
    errors.push('Invalid file name');
  }
  
  // Validate file size (max 100MB)
  if (metadata.size > 100 * 1024 * 1024) {
    errors.push('File size too large');
  }
  
  // Validate MIME type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/zip',
    'application/json', 'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/wav'
  ];
  
  if (!allowedTypes.includes(metadata.type)) {
    errors.push('File type not allowed');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Request validation utilities
 */

// Validate request origin for CORS
export function validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return true; // Same-origin requests don't have origin header
  
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      return origin.endsWith('.' + domain) || origin === domain;
    }
    return origin === allowed;
  });
}

// Validate User-Agent to detect potential bots/scrapers
export function validateUserAgent(userAgent: string | null): { valid: boolean; isBot: boolean } {
  if (!userAgent) {
    return { valid: false, isBot: true };
  }
  
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /go-http/i,
    /postman/i, /insomnia/i
  ];
  
  const isBot = botPatterns.some(pattern => pattern.test(userAgent));
  
  return {
    valid: userAgent.length > 0 && userAgent.length < 1000,
    isBot
  };
}

// Rate limiting key generation
export function generateRateLimitKey(
  ip: string,
  userId?: string,
  endpoint?: string
): string {
  const parts = [ip];
  if (userId) parts.push(userId);
  if (endpoint) parts.push(endpoint);
  
  return parts.join(':');
}

// Input length validation
export function validateInputLength(
  input: string,
  minLength: number = 0,
  maxLength: number = 1000
): { valid: boolean; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' };
  }
  
  if (input.length < minLength) {
    return { valid: false, error: `Input must be at least ${minLength} characters` };
  }
  
  if (input.length > maxLength) {
    return { valid: false, error: `Input must be no more than ${maxLength} characters` };
  }
  
  return { valid: true };
}
