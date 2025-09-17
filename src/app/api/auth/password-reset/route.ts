import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    logger.info('Password reset API call', { action });

    if (action === 'request') {
      const result = await authService.requestPasswordReset(body);
      
      const response = NextResponse.json({
        message: result.message,
      });

      return authMiddleware.addSecurityHeaders(
        authMiddleware.addCORSHeaders(response)
      );
    }

    if (action === 'confirm') {
      const result = await authService.confirmPasswordReset(body);
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }

      const response = NextResponse.json({
        message: result.message,
      });

      return authMiddleware.addSecurityHeaders(
        authMiddleware.addCORSHeaders(response)
      );
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "request" or "confirm"' },
      { status: 400 }
    );
  } catch (error) {
    logError(error as Error, { action: 'password_reset_api' });
    return NextResponse.json(
      { error: 'Password reset failed due to server error' },
      { status: 500 }
    );
  }
}
