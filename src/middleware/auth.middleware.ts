import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { UserRole } from '@/types/auth';

export interface AuthContext {
  user: any;
  session: any;
  isAuthenticated: boolean;
  userId: string;
  userRole: UserRole;
}

export class AuthMiddleware {
  private authService = new AuthService();

  async authenticate(request: NextRequest): Promise<{ context: AuthContext; response?: NextResponse }> {
    try {
      const authHeader = request.headers.get('authorization');
      const sessionId = request.headers.get('x-session-id');
      const ipAddress = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Default context for unauthenticated users
      const defaultContext: AuthContext = {
        user: null,
        session: null,
        isAuthenticated: false,
        userId: '',
        userRole: 'buyer',
      };

      // Check for session ID first
      if (sessionId) {
        const session = await this.validateSession(sessionId);
        if (session) {
          const user = await this.authService.getUserProfile(session.user_id);
          if (user && user.is_active) {
            return {
              context: {
                user,
                session,
                isAuthenticated: true,
                userId: user.id,
                userRole: user.role,
              },
            };
          }
        }
      }

      // Check for Bearer token
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = await this.validateToken(token);
        if (user && user.is_active) {
          return {
            context: {
              user,
              session: null,
              isAuthenticated: true,
              userId: user.id,
              userRole: user.role,
            },
          };
        }
      }

      // Check for cookies (if using cookie-based auth)
      const sessionCookie = request.cookies.get('session_id')?.value;
      if (sessionCookie) {
        const session = await this.validateSession(sessionCookie);
        if (session) {
          const user = await this.authService.getUserProfile(session.user_id);
          if (user && user.is_active) {
            return {
              context: {
                user,
                session,
                isAuthenticated: true,
                userId: user.id,
                userRole: user.role,
              },
            };
          }
        }
      }

      logger.info('Authentication failed', { 
        ip: ipAddress, 
        userAgent,
        hasAuthHeader: !!authHeader,
        hasSessionId: !!sessionId,
        hasSessionCookie: !!sessionCookie,
      });

      return { context: defaultContext };
    } catch (error) {
      logError(error as Error, { action: 'authenticate' });
      return { 
        context: {
          user: null,
          session: null,
          isAuthenticated: false,
          userId: '',
          userRole: 'buyer',
        }
      };
    }
  }

  async requireAuth(
    request: NextRequest,
    handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const { context } = await this.authenticate(request);

    if (!context.isAuthenticated) {
      logger.warn('Unauthenticated access attempt', {
        pathname: request.nextUrl.pathname,
        ip: this.getClientIP(request),
      });

      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(request, context);
  }

  async requireRole(
    roles: UserRole[],
    request: NextRequest,
    handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const { context } = await this.authenticate(request);

    if (!context.isAuthenticated) {
      logger.warn('Unauthenticated access attempt', {
        pathname: request.nextUrl.pathname,
        ip: this.getClientIP(request),
      });

      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!roles.includes(context.userRole)) {
      logger.warn('Insufficient permissions', {
        pathname: request.nextUrl.pathname,
        userId: context.userId,
        userRole: context.userRole,
        requiredRoles: roles,
        ip: this.getClientIP(request),
      });

      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request, context);
  }

  async requireAdmin(
    request: NextRequest,
    handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return this.requireRole(['admin'], request, handler);
  }

  async requireSeller(
    request: NextRequest,
    handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return this.requireRole(['seller', 'admin'], request, handler);
  }

  async requirePartner(
    request: NextRequest,
    handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return this.requireRole(['partner', 'admin'], request, handler);
  }

  async requireBuyer(
    request: NextRequest,
    handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return this.requireRole(['buyer', 'seller', 'partner', 'admin'], request, handler);
  }

  async optionalAuth(request: NextRequest): Promise<AuthContext> {
    const { context } = await this.authenticate(request);
    return context;
  }

  private async validateSession(sessionId: string): Promise<any> {
    try {
      const { data: session, error } = await this.authService['supabase']
        .from('user_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !session) {
        return null;
      }

      return session;
    } catch (error) {
      logError(error as Error, { action: 'validate_session', sessionId });
      return null;
    }
  }

  private async validateToken(token: string): Promise<any> {
    try {
      // This would validate the JWT token
      // For now, we'll use Supabase's built-in token validation
      const { data: { user }, error } = await this.authService['supabase'].auth.getUser(token);
      
      if (error || !user) {
        return null;
      }

      return await this.authService.getUserProfile(user.id);
    } catch (error) {
      logError(error as Error, { action: 'validate_token' });
      return null;
    }
  }

  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'
    );
  }

  // Rate limiting for authentication endpoints
  async rateLimitAuth(
    request: NextRequest,
    handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const ipAddress = this.getClientIP(request);
    const key = `auth_rate_limit:${ipAddress}`;
    
    // This would integrate with Redis for rate limiting
    // For now, we'll just pass through
    const { context } = await this.authenticate(request);
    return handler(request, context);
  }

  // Security headers for authentication endpoints
  addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    return response;
  }

  // CORS headers for authentication endpoints
  addCORSHeaders(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();
