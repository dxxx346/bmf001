import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../lib/supabase';
import { defaultLogger as logger } from '../lib/logger';

export interface AuthContext {
  userId: string;
  userRole: string;
  isAuthenticated: boolean;
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      userId: '',
      userRole: '',
      isAuthenticated: false,
    };
  }

  return {
    userId: session.user.id,
    userRole: session.user.user_metadata?.role || 'buyer',
    isAuthenticated: true,
  };
}

export function requireAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authContext = await getAuthContext();

    if (!authContext.isAuthenticated) {
      logger.warn('Authentication required', {
        pathname: request.nextUrl.pathname,
        ip:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown',
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    return handler(request, authContext);
  };
}

export function requireRole(roles: string[]) {
  return (
    handler: (
      request: NextRequest,
      context: AuthContext
    ) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest) => {
      const authContext = await getAuthContext();

      if (!authContext.isAuthenticated) {
        logger.warn('Authentication required', {
          pathname: request.nextUrl.pathname,
          ip:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
        });
        return new NextResponse('Unauthorized', { status: 401 });
      }

      if (!roles.includes(authContext.userRole)) {
        logger.warn('Insufficient permissions', {
          pathname: request.nextUrl.pathname,
          userRole: authContext.userRole,
          requiredRoles: roles,
          ip:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
        });
        return new NextResponse('Forbidden', { status: 403 });
      }

      return handler(request, authContext);
    };
  };
}
