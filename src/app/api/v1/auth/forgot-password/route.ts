import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validation';
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limit';
import { defaultLogger as logger } from '@/lib/logger';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request,
      'passwordReset',
      rateLimitConfigs.passwordReset
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitConfigs.passwordReset.message,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': rateLimitConfigs.passwordReset.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      logger.warn('Forgot password validation failed', {
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

    const credentials: ForgotPasswordInput = validationResult.data;

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt password reset request
    const result = await authService.requestPasswordReset(credentials);

    const duration = Date.now() - startTime;

    // Always return success to prevent email enumeration
    // The actual result is logged but not exposed to the client
    if (result.success) {
      logger.info('Password reset request successful', {
        email: credentials.email,
        duration,
        ip: ipAddress,
      });
    } else {
      logger.warn('Password reset request failed', {
        email: credentials.email,
        reason: result.message,
        duration,
        ip: ipAddress,
      });
    }

    // Always return the same success message to prevent email enumeration
    return NextResponse.json(
      {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimitConfigs.passwordReset.maxRequests.toString(),
          'X-RateLimit-Remaining': (rateLimitResult.remaining || 0).toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Forgot password endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Return generic success message even on error to prevent email enumeration
    return NextResponse.json(
      {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
      { status: 200 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  );
}

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
