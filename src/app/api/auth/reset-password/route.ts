import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validation';
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
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      logger.warn('Reset password validation failed', {
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

    const credentials: ResetPasswordInput = validationResult.data;

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt password reset confirmation
    const result = await authService.confirmPasswordReset(credentials);

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info('Password reset successful', {
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
            'X-RateLimit-Limit': rateLimitConfigs.passwordReset.maxRequests.toString(),
            'X-RateLimit-Remaining': (rateLimitResult.remaining || 0).toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    } else {
      logger.warn('Password reset failed', {
        token: credentials.token.substring(0, 8) + '...',
        reason: result.message,
        duration,
        ip: ipAddress,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.message,
          code: 'RESET_PASSWORD_FAILED',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Reset password endpoint error', {
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
