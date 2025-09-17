import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const authService = new AuthService();

export async function GET(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      logger.info('Get profile API call', { userId: context.userId });

      const user = await authService.getUserProfile(context.userId);

      if (!user) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        );
      }

      const response = NextResponse.json({
        user,
      });

      return authMiddleware.addSecurityHeaders(
        authMiddleware.addCORSHeaders(response)
      );
    } catch (error) {
      logError(error as Error, { action: 'get_profile_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const body = await request.json();
      const { name, avatar_url, bio, website, location, phone } = body;

      logger.info('Update profile API call', { userId: context.userId, updates: Object.keys(body) });

      const result = await authService.updateProfile(context.userId, {
        name,
        avatar_url,
        bio,
        website,
        location,
        phone,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }

      const response = NextResponse.json({
        message: result.message,
        user: result.user,
      });

      return authMiddleware.addSecurityHeaders(
        authMiddleware.addCORSHeaders(response)
      );
    } catch (error) {
      logError(error as Error, { action: 'update_profile_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
  });
}
