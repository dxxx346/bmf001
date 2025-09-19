import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const authService = new AuthService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as 'google' | 'github';
    const redirectUri = searchParams.get('redirect_uri');

    if (!provider || !redirectUri) {
      return NextResponse.json(
        { error: 'Provider and redirect_uri are required' },
        { status: 400 }
      );
    }

    logger.info('OAuth URL request', { provider, redirectUri });

    const result = await authService.getOAuthUrl(provider, redirectUri);

    const response = NextResponse.json({
      url: result.url,
      state: result.state,
    });

    return authMiddleware.addSecurityHeaders(
      authMiddleware.addCORSHeaders(response)
    );
  } catch (error) {
    logError(error as Error, { action: 'oauth_url_api' });
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    logger.info('OAuth callback API call', { provider: body.provider, ip: ipAddress });

    const result = await authService.handleOAuthCallback(body, ipAddress, userAgent);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      message: result.message,
      user: result.user,
      session: result.session,
    });

    return authMiddleware.addSecurityHeaders(
      authMiddleware.addCORSHeaders(response)
    );
  } catch (error) {
    logError(error as Error, { action: 'oauth_callback_api' });
    return NextResponse.json(
      { error: 'OAuth authentication failed due to server error' },
      { status: 500 }
    );
  }
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
