import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { refreshTokenSchema, type RefreshTokenInput } from '@/lib/validation';
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limit';
import { defaultLogger as logger } from '@/lib/logger';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request,
      'auth',
      rateLimitConfigs.auth
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitConfigs.auth.message,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': rateLimitConfigs.auth.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // Get refresh token from cookies or request body
    const refreshTokenFromCookie = request.cookies.get('refresh_token')?.value;
    const body = await request.json().catch(() => ({}));
    
    const refreshToken = refreshTokenFromCookie || body.refresh_token;

    if (!refreshToken) {
      logger.warn('Refresh token missing', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN',
        },
        { status: 400 }
      );
    }

    // Validate refresh token format
    const validationResult = refreshTokenSchema.safeParse({ refresh_token: refreshToken });

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      logger.warn('Refresh token validation failed', {
        errors: validationResult.error.issues,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid refresh token format',
          code: 'VALIDATION_ERROR',
          details: { errors },
        },
        { status: 400 }
      );
    }

    const credentials: RefreshTokenInput = validationResult.data;

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt token refresh
    const result = await authService.refreshSession(credentials);

    const duration = Date.now() - startTime;

    if (result.success && result.user && result.session) {
      logger.info('Token refresh successful', {
        userId: result.user.id,
        duration,
        ip: ipAddress,
      });

      // Create response
      const response = NextResponse.json(
        {
          success: true,
          message: result.message,
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              avatar_url: result.user.avatar_url,
              role: result.user.role,
              is_active: result.user.is_active,
              email_verified: result.user.email_verified,
              last_login_at: result.user.last_login_at,
            },
            session: {
              id: result.session.id,
              expires_at: result.session.expires_at,
              status: result.session.status,
            },
          },
        },
        {
          status: 200,
          headers: {
            'X-RateLimit-Limit': rateLimitConfigs.auth.maxRequests.toString(),
            'X-RateLimit-Remaining': (rateLimitResult.remaining || 0).toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );

      // Update cookies with new tokens
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
      };

      // Set new access token cookie (short-lived)
      response.cookies.set('access_token', result.session.access_token, {
        ...cookieOptions,
        maxAge: 15 * 60, // 15 minutes
      });

      // Set new refresh token cookie (long-lived)
      response.cookies.set('refresh_token', result.session.refresh_token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      // Update session ID cookie
      response.cookies.set('session_id', result.session.id, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    } else {
      logger.warn('Token refresh failed', {
        reason: result.message,
        duration,
        ip: ipAddress,
      });

      // Clear invalid cookies
      const response = NextResponse.json(
        {
          success: false,
          error: result.message,
          code: 'REFRESH_FAILED',
        },
        { status: 401 }
      );

      // Clear all auth cookies on refresh failure
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
      };

      response.cookies.set('access_token', '', {
        ...cookieOptions,
        maxAge: 0,
        expires: new Date(0),
      });

      response.cookies.set('refresh_token', '', {
        ...cookieOptions,
        maxAge: 0,
        expires: new Date(0),
      });

      response.cookies.set('session_id', '', {
        ...cookieOptions,
        maxAge: 0,
        expires: new Date(0),
      });

      return response;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Refresh endpoint error', {
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
