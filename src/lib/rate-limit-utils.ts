import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware, RateLimitRule, RateLimitConfig } from '@/middleware/rate-limit.middleware';

/**
 * Utility functions for rate limiting
 */

/**
 * Apply rate limiting to an API route handler
 * @param handler - The original API route handler
 * @param customRule - Optional custom rate limit rule
 * @returns Enhanced handler with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  customRule?: RateLimitRule
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Apply custom rule temporarily if provided
    if (customRule) {
      const originalRule = rateLimitMiddleware['config'].rules[request.nextUrl.pathname];
      rateLimitMiddleware['config'].rules[request.nextUrl.pathname] = customRule;
      
      try {
        const rateLimitResponse = await rateLimitMiddleware.handle(request);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
        return await handler(request);
      } finally {
        // Restore original rule
        if (originalRule) {
          rateLimitMiddleware['config'].rules[request.nextUrl.pathname] = originalRule;
        } else {
          delete rateLimitMiddleware['config'].rules[request.nextUrl.pathname];
        }
      }
    }

    // Use default rate limiting
    const rateLimitResponse = await rateLimitMiddleware.handle(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return await handler(request);
  };
}

/**
 * Create a rate-limited API handler with specific configuration
 * @param config - Rate limiting configuration
 * @param handler - The API route handler
 * @returns Rate-limited handler
 */
export function createRateLimitedHandler(
  config: Partial<RateLimitConfig>,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  const customMiddleware = new (rateLimitMiddleware.constructor as any)(config);
  
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await customMiddleware.handle(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return await handler(request);
  };
}

/**
 * Predefined rate limit configurations for common use cases
 */
export const rateLimitConfigs = {
  // Strict limits for authentication endpoints
  auth: {
    requests: 5,
    window: 60, // 1 minute
  } as RateLimitRule,

  // Moderate limits for payment endpoints
  payment: {
    requests: 10,
    window: 60, // 1 minute
  } as RateLimitRule,

  // Hourly limits for resource creation
  creation: {
    requests: 20,
    window: 3600, // 1 hour
  } as RateLimitRule,

  // Standard limits for general API usage
  api: {
    requests: 100,
    window: 60, // 1 minute
  } as RateLimitRule,

  // High limits for read-only operations
  readonly: {
    requests: 200,
    window: 60, // 1 minute
  } as RateLimitRule,

  // Very strict limits for sensitive operations
  sensitive: {
    requests: 3,
    window: 300, // 5 minutes
  } as RateLimitRule,
};

/**
 * Helper function to check rate limit status without consuming a request
 * @param request - The incoming request
 * @param rule - Rate limit rule to check against
 * @returns Rate limit status
 */
export async function checkRateLimitStatus(
  request: NextRequest,
  rule?: RateLimitRule
) {
  const clientId = getClientIdentifier(request);
  const effectiveRule = rule || rateLimitConfigs.api;
  
  return await rateLimitMiddleware.getStatus(clientId, effectiveRule);
}

/**
 * Reset rate limit for a specific client (admin function)
 * @param request - The request to identify the client
 * @returns Success status
 */
export async function resetRateLimit(request: NextRequest): Promise<boolean> {
  const clientId = getClientIdentifier(request);
  return await rateLimitMiddleware.reset(clientId);
}

/**
 * Get client identifier for rate limiting
 * @param request - The incoming request
 * @returns Client identifier string
 */
function getClientIdentifier(request: NextRequest): string {
  const ip = getClientIP(request);
  const authHeader = request.headers.get('authorization');
  const sessionId = request.headers.get('x-session-id');
  const sessionCookie = request.cookies.get('session_id')?.value;

  // Use user-based limiting if authenticated
  if (authHeader || sessionId || sessionCookie) {
    const userKey = authHeader || sessionId || sessionCookie;
    return `user:${Buffer.from(userKey!).toString('base64').slice(0, 32)}`;
  }

  // Fall back to IP-based limiting
  return `ip:${ip}`;
}

/**
 * Get client IP address from request
 * @param request - The incoming request
 * @returns IP address string
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-client-ip') ||
    'unknown'
  );
}

/**
 * Create a rate limit response with proper headers
 * @param limit - Request limit
 * @param remaining - Remaining requests
 * @param reset - Reset timestamp
 * @param retryAfter - Retry after seconds
 * @returns NextResponse with rate limit exceeded
 */
export function createRateLimitResponse(
  limit: number,
  remaining: number,
  reset: number,
  retryAfter: number = 60
): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Middleware wrapper for easy integration with Next.js middleware
 * @param request - The incoming request
 * @returns NextResponse or null to continue
 */
export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  return await rateLimitMiddleware.handle(request);
}

/**
 * Type guard to check if a response is a rate limit response
 * @param response - Response to check
 * @returns True if it's a rate limit response
 */
export function isRateLimitResponse(response: NextResponse): boolean {
  return response.status === 429;
}

/**
 * Extract rate limit information from response headers
 * @param response - Response with rate limit headers
 * @returns Rate limit information
 */
export function extractRateLimitInfo(response: NextResponse) {
  return {
    limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
    remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
    reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
    retryAfter: parseInt(response.headers.get('Retry-After') || '0'),
  };
}
