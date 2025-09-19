import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { loginSchema, type LoginInput } from '@/lib/validation';
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      logger.warn('Login validation failed', {
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

    const credentials: LoginInput = validationResult.data;

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt login
    const result = await authService.login(credentials, ipAddress, userAgent);

    const duration = Date.now() - startTime;

    if (result.success && result.user && result.session) {
      logger.info('User login successful', {
        userId: result.user.id,
        email: credentials.email,
        duration,
        ip: ipAddress,
      });

      // Set secure HTTP-only cookies for session management
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

      // Set secure cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
      };

      // Set access token cookie (short-lived)
      response.cookies.set('access_token', result.session.access_token, {
        ...cookieOptions,
        maxAge: 15 * 60, // 15 minutes
      });

      // Set refresh token cookie (long-lived)
      response.cookies.set('refresh_token', result.session.refresh_token, {
        ...cookieOptions,
        maxAge: credentials.remember_me ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days or 7 days
      });

      // Set session ID cookie
      response.cookies.set('session_id', result.session.id, {
        ...cookieOptions,
        maxAge: credentials.remember_me ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      });

      return response;
    } else {
      logger.warn('User login failed', {
        email: credentials.email,
        reason: result.message,
        duration,
        ip: ipAddress,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.message,
          code: 'LOGIN_FAILED',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Login endpoint error', {
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