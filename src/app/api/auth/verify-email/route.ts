import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { verifyEmailSchema, type VerifyEmailInput } from '@/lib/validation';
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limit';
import { defaultLogger as logger } from '@/lib/logger';

const authService = new AuthService();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request,
      'emailVerification',
      rateLimitConfigs.emailVerification
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitConfigs.emailVerification.message,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '300',
            'X-RateLimit-Limit': rateLimitConfigs.emailVerification.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // Get token from query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      logger.warn('Email verification token missing', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Verification token is required',
          code: 'MISSING_TOKEN',
        },
        { status: 400 }
      );
    }

    // Validate token format
    const validationResult = verifyEmailSchema.safeParse({ token });

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      logger.warn('Email verification token validation failed', {
        errors: validationResult.error.issues,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid verification token format',
          code: 'VALIDATION_ERROR',
          details: { errors },
        },
        { status: 400 }
      );
    }

    const credentials: VerifyEmailInput = validationResult.data;

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt email verification
    const result = await authService.verifyEmail(credentials);

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info('Email verification successful', {
        token: credentials.token.substring(0, 8) + '...',
        duration,
        ip: ipAddress,
      });

      // Redirect to success page or return success response
      const redirectUrl = process.env.NEXT_PUBLIC_APP_URL + '/auth/verify-email/success';
      
      return NextResponse.redirect(redirectUrl, {
        status: 302,
        headers: {
          'X-RateLimit-Limit': rateLimitConfigs.emailVerification.maxRequests.toString(),
          'X-RateLimit-Remaining': (rateLimitResult.remaining || 0).toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      });
    } else {
      logger.warn('Email verification failed', {
        token: credentials.token.substring(0, 8) + '...',
        reason: result.message,
        duration,
        ip: ipAddress,
      });

      // Redirect to error page or return error response
      const redirectUrl = process.env.NEXT_PUBLIC_APP_URL + '/auth/verify-email/error?message=' + 
        encodeURIComponent(result.message);
      
      return NextResponse.redirect(redirectUrl, {
        status: 302,
        headers: {
          'X-RateLimit-Limit': rateLimitConfigs.emailVerification.maxRequests.toString(),
          'X-RateLimit-Remaining': (rateLimitResult.remaining || 0).toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Email verification endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Redirect to error page on server error
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL + '/auth/verify-email/error?message=' + 
      encodeURIComponent('An error occurred during email verification');
    
    return NextResponse.redirect(redirectUrl, {
      status: 302,
    });
  }
}

// Handle POST method for API-style verification
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request,
      'emailVerification',
      rateLimitConfigs.emailVerification
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitConfigs.emailVerification.message,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '300',
            'X-RateLimit-Limit': rateLimitConfigs.emailVerification.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = verifyEmailSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      logger.warn('Email verification validation failed', {
        errors: validationResult.error.issues,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: { errors },
        },
        { status: 400 }
      );
    }

    const credentials: VerifyEmailInput = validationResult.data;

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt email verification
    const result = await authService.verifyEmail(credentials);

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info('Email verification successful (API)', {
        token: credentials.token.substring(0, 8) + '...',
        duration,
        ip: ipAddress,
      });

      return NextResponse.json(
        {
          success: true,
          message: result.message,
        },
        {
          status: 200,
          headers: {
            'X-RateLimit-Limit': rateLimitConfigs.emailVerification.maxRequests.toString(),
            'X-RateLimit-Remaining': (rateLimitResult.remaining || 0).toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    } else {
      logger.warn('Email verification failed (API)', {
        token: credentials.token.substring(0, 8) + '...',
        reason: result.message,
        duration,
        ip: ipAddress,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.message,
          code: 'VERIFICATION_FAILED',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Email verification endpoint error (API)', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  );
}