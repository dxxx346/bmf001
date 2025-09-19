/**
 * Rate Limiting Middleware Examples
 * 
 * This file demonstrates various ways to use the rate limiting middleware
 * in different scenarios throughout the application.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  withRateLimit, 
  createRateLimitedHandler, 
  rateLimitConfigs,
  checkRateLimitStatus,
  resetRateLimit,
} from '@/lib/rate-limit-utils';
import { 
  rateLimitMiddleware,
  strictRateLimitMiddleware,
  lenientRateLimitMiddleware,
} from '@/middleware/rate-limit.middleware';

// ===== EXAMPLE 1: Basic API Route with Rate Limiting =====

/**
 * Example: Login API endpoint with strict rate limiting
 * File: src/app/api/auth/login/route.ts
 */
export const loginHandler = withRateLimit(
  async (request: NextRequest) => {
    // Your login logic here
    const body = await request.json();
    
    // Simulate authentication
    console.log('Processing login for:', body.email);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Login successful' 
    });
  },
  rateLimitConfigs.auth // 5 requests per minute
);

// Usage in route.ts:
// export const POST = loginHandler;

// ===== EXAMPLE 2: Custom Rate Limit Configuration =====

/**
 * Example: Payment processing with custom rate limiting
 * File: src/app/api/payments/create-intent/route.ts
 */
export const paymentHandler = createRateLimitedHandler(
  {
    rules: {
      '/api/payments/create-intent': {
        requests: 10,
        window: 60, // 1 minute
      },
    },
    exemptRoles: ['admin'],
    enableExponentialBackoff: true,
    maxBackoffMultiplier: 4,
  },
  async (request: NextRequest) => {
    const body = await request.json();
    
    // Your payment processing logic
    console.log('Processing payment for amount:', body.amount);
    
    return NextResponse.json({ 
      success: true, 
      clientSecret: 'pi_example_secret' 
    });
  }
);

// ===== EXAMPLE 3: Product Creation with Hourly Limits =====

/**
 * Example: Product creation with hourly rate limiting
 * File: src/app/api/products/create/route.ts
 */
export const createProductHandler = withRateLimit(
  async (request: NextRequest) => {
    const body = await request.json();
    
    // Your product creation logic
    console.log('Creating product:', body.title);
    
    return NextResponse.json({ 
      success: true, 
      productId: 'prod_123' 
    });
  },
  rateLimitConfigs.creation // 20 requests per hour
);

// ===== EXAMPLE 4: Different Rate Limits for Different User Types =====

/**
 * Example: API endpoint with role-based rate limiting
 */
export async function roleBasedRateLimitHandler(request: NextRequest) {
  // Check user role (this would come from your auth system)
  const userRole = request.headers.get('x-user-role');
  
  let middleware;
  switch (userRole) {
    case 'admin':
      // No rate limiting for admins
      return await handleRequest(request);
    
    case 'premium':
      // Lenient limits for premium users
      middleware = lenientRateLimitMiddleware;
      break;
    
    case 'basic':
    default:
      // Strict limits for basic users
      middleware = strictRateLimitMiddleware;
      break;
  }
  
  const rateLimitResponse = await middleware.handle(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  return await handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  return NextResponse.json({ message: 'Request processed successfully' });
}

// ===== EXAMPLE 5: Rate Limit Status Checking =====

/**
 * Example: Check rate limit status without consuming a request
 * File: src/app/api/rate-limit/status/route.ts
 */
export async function rateLimitStatusHandler(request: NextRequest) {
  try {
    const status = await checkRateLimitStatus(request, rateLimitConfigs.api);
    
    return NextResponse.json({
      rateLimit: {
        limit: status.limit,
        remaining: status.remaining,
        reset: new Date(status.reset * 1000).toISOString(),
        success: status.success,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check rate limit status' },
      { status: 500 }
    );
  }
}

// ===== EXAMPLE 6: Admin Rate Limit Reset =====

/**
 * Example: Admin endpoint to reset rate limits
 * File: src/app/api/admin/rate-limit/reset/route.ts
 */
export async function resetRateLimitHandler(request: NextRequest) {
  try {
    // Verify admin role (implement your own auth check)
    const isAdmin = await verifyAdminRole(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const success = await resetRateLimit(request);
    
    return NextResponse.json({
      success,
      message: success 
        ? 'Rate limit reset successfully' 
        : 'Failed to reset rate limit',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset rate limit' },
      { status: 500 }
    );
  }
}

// Mock admin verification function
async function verifyAdminRole(request: NextRequest): Promise<boolean> {
  // Implement your admin verification logic here
  const authHeader = request.headers.get('authorization');
  // ... verification logic
  return true; // Placeholder
}

// ===== EXAMPLE 7: File Upload with Special Rate Limiting =====

/**
 * Example: File upload endpoint with size-based rate limiting
 * File: src/app/api/upload/route.ts
 */
export const fileUploadHandler = createRateLimitedHandler(
  {
    rules: {
      '/api/upload': {
        requests: 10,
        window: 300, // 5 minutes
      },
    },
    keyGenerator: (request) => {
      // Custom key generator for file uploads
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      const userId = request.headers.get('x-user-id') || 'anonymous';
      return `upload:${userId}:${ip}`;
    },
    onExceeded: async (request, limit) => {
      return new NextResponse(
        JSON.stringify({
          error: 'Upload rate limit exceeded',
          message: `You can upload maximum ${limit.requests} files per ${limit.window / 60} minutes.`,
          nextUploadAllowed: Date.now() + (limit.window * 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': limit.window.toString(),
          },
        }
      );
    },
  },
  async (request: NextRequest) => {
    // Your file upload logic
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('Uploading file:', file?.name);
    
    return NextResponse.json({ 
      success: true, 
      fileId: 'file_123',
      fileName: file?.name,
    });
  }
);

// ===== EXAMPLE 8: Webhook Endpoint with High Rate Limits =====

/**
 * Example: Webhook endpoint with high rate limits
 * File: src/app/api/webhooks/stripe/route.ts
 */
export const webhookHandler = withRateLimit(
  async (request: NextRequest) => {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    // Your webhook processing logic
    console.log('Processing webhook with signature:', signature);
    
    return NextResponse.json({ received: true });
  },
  {
    requests: 1000, // High limit for webhooks
    window: 60, // 1 minute
    skipSuccessfulRequests: false,
    skipFailedRequests: true, // Don't count failed webhook attempts
  }
);

// ===== EXAMPLE 9: Search API with Burst Handling =====

/**
 * Example: Search API that allows bursts but has overall limits
 * File: src/app/api/search/route.ts
 */
export const searchHandler = createRateLimitedHandler(
  {
    rules: {
      '/api/search': {
        requests: 50,
        window: 60, // 50 requests per minute
      },
    },
    // Custom configuration for search
    enableExponentialBackoff: false, // Allow consistent search behavior
  },
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    // Your search logic
    console.log('Searching for:', query);
    
    return NextResponse.json({ 
      results: [],
      query,
      total: 0,
    });
  }
);

// ===== EXAMPLE 10: Health Check with No Rate Limiting =====

/**
 * Example: Health check endpoint that bypasses rate limiting
 * File: src/app/api/health/route.ts
 */
export async function healthCheckHandler(request: NextRequest) {
  // Health checks should not be rate limited
  // This endpoint doesn't use the rate limiting middleware
  
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

// ===== EXAMPLE 11: Custom Middleware Integration =====

/**
 * Example: Custom middleware that combines rate limiting with other checks
 */
export async function customMiddleware(request: NextRequest) {
  // 1. Apply rate limiting first
  const rateLimitResponse = await rateLimitMiddleware.handle(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // 2. Apply other security checks
  if (await isIPBlocked(request)) {
    return NextResponse.json(
      { error: 'IP address blocked' },
      { status: 403 }
    );
  }
  
  // 3. Continue to the actual handler
  return null; // Continue processing
}

async function isIPBlocked(request: NextRequest): Promise<boolean> {
  // Implement IP blocking logic
  return false; // Placeholder
}

// ===== EXAMPLE 12: Rate Limiting with Custom Headers =====

/**
 * Example: API that adds custom rate limit headers
 */
export const customHeadersHandler = withRateLimit(
  async (request: NextRequest) => {
    const response = NextResponse.json({ message: 'Success' });
    
    // Add custom headers
    response.headers.set('X-API-Version', '1.0');
    response.headers.set('X-Request-ID', crypto.randomUUID());
    
    return response;
  },
  rateLimitConfigs.api
);

// Export all handlers for easy import
export const handlers = {
  login: loginHandler,
  payment: paymentHandler,
  createProduct: createProductHandler,
  roleBasedRateLimit: roleBasedRateLimitHandler,
  rateLimitStatus: rateLimitStatusHandler,
  resetRateLimit: resetRateLimitHandler,
  fileUpload: fileUploadHandler,
  webhook: webhookHandler,
  search: searchHandler,
  healthCheck: healthCheckHandler,
  customHeaders: customHeadersHandler,
};
