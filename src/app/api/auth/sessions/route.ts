import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const authService = new AuthService();

export async function GET(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      logger.info('Get sessions API call', { userId: context.userId });

      const result = await authService.getUserSessions(context.userId);

      const response = NextResponse.json({
        sessions: result.sessions,
        current_session_id: result.current_session_id,
      });

      return authMiddleware.addSecurityHeaders(
        authMiddleware.addCORSHeaders(response)
      );
    } catch (error) {
      logError(error as Error, { action: 'get_sessions_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to get user sessions' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const body = await request.json();
      const { session_id } = body;

      if (!session_id) {
        return NextResponse.json(
          { error: 'Session ID is required' },
          { status: 400 }
        );
      }

      logger.info('Revoke session API call', { userId: context.userId, sessionId: session_id });

      const result = await authService.revokeSession({ session_id });

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
    } catch (error) {
      logError(error as Error, { action: 'revoke_session_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to revoke session' },
        { status: 500 }
      );
    }
  });
}
