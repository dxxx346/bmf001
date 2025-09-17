import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
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

    // Get session ID from cookies or request body
    const sessionId = request.cookies.get('session_id')?.value || 
                     (await request.json().catch(() => ({}))).session_id;

    if (!sessionId) {
      logger.warn('Logout attempt without session ID', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required',
          code: 'MISSING_SESSION_ID',
        },
        { status: 400 }
      );
    }

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt logout
    const result = await authService.logout(sessionId);

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info('User logout successful', {
        sessionId,
        duration,
        ip: ipAddress,
      });

      // Create response
      const response = NextResponse.json(
        {
          success: true,
          message: result.message,
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

      // Clear all auth cookies
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
    } else {
      logger.warn('User logout failed', {
        sessionId,
        reason: result.message,
        duration,
        ip: ipAddress,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.message,
          code: 'LOGOUT_FAILED',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Logout endpoint error', {
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