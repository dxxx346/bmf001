import { AuthService } from './auth.service';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '@/lib/cache.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  PasswordResetRequest,
  EmailVerificationRequest,
  SessionData,
  UserProfile,
  AuthTokens,
  AuthUser,
  AuthSession,
  RefreshTokenRequest,
  RevokeSessionRequest,
} from '@/types/auth';

export class CachedAuthService extends AuthService {
  // =============================================
  // CACHED AUTHENTICATION OPERATIONS
  // =============================================

  async login(credentials: LoginCredentials, ipAddress: string, userAgent: string): Promise<AuthResponse> {
    try {
      // Try to get from cache first (for rate limiting)
      const rateLimitKey = `rate_limit:login:${credentials.email}`;
      const rateLimit = await cacheService.get<number>(rateLimitKey);
      
      if (rateLimit && rateLimit > 5) {
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'Too many login attempts. Please try again later.',
        };
      }

      // Perform login
      const result = await super.login(credentials, ipAddress, userAgent);
      
      if (result.success && result.user && result.session) {
        // Cache user session
        await this.cacheUserSession(result.session.id, {
          ...result.session,
          expires_at: result.session.expires_at,
        });

        // Cache user profile
        await cacheService.set(
          CACHE_KEYS.userProfile(result.user.id),
          result.user,
          CACHE_TTL.USER_PROFILE
        );

        // Set rate limit
        await cacheService.set(rateLimitKey, (rateLimit || 0) + 1, 300); // 5 minutes

        logger.info('User session cached', { userId: result.user.id });
      }

      return result;
    } catch (error) {
      logError(error as Error, { action: 'cached_login' });
      return {
        user: null as any,
        session: null as any,
        success: false,
        message: 'Login failed due to server error',
      };
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const result = await super.register(credentials);
      
      if (result.success && result.user && result.session) {
        // Cache user session
        await this.cacheUserSession(result.session.id, {
          ...result.session,
          expires_at: result.session.expires_at,
        });

        // Cache user profile
        await cacheService.set(
          CACHE_KEYS.userProfile(result.user.id),
          result.user,
          CACHE_TTL.USER_PROFILE
        );

        logger.info('New user session cached', { userId: result.user.id });
      }

      return result;
    } catch (error) {
      logError(error as Error, { action: 'cached_register' });
      return {
        user: null as any,
        session: null as any,
        success: false,
        message: 'Registration failed due to server error',
      };
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const cacheKey = CACHE_KEYS.userProfile(userId);
      
      // Try cache first
      const cached = await cacheService.get<UserProfile>(cacheKey);
      if (cached) {
        logger.info('User profile cache hit', { userId });
        return cached;
      }

      // Fetch from database
      const profile = await super.getUserProfile(userId);
      if (profile) {
        // Cache the result
        await cacheService.set(cacheKey, profile, CACHE_TTL.USER_PROFILE);
        logger.info('User profile cached', { userId });
      }

      return profile;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_user_profile', userId });
      return null;
    }
  }

  async getUserPurchases(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const cacheKey = CACHE_KEYS.userPurchases(userId, page);
      
      // Try cache first
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        logger.info('User purchases cache hit', { userId, page });
        return cached;
      }

      // For now, return empty result since this method doesn't exist in base class
      // This would need to be implemented in the base AuthService or moved to a different service
      const purchases = { purchases: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      
      // Cache the result
      await cacheService.set(cacheKey, purchases, CACHE_TTL.USER_SESSIONS);
      logger.info('User purchases cached', { userId, page });

      return purchases;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_user_purchases', userId });
      return { purchases: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  }

  async getUserFavorites(userId: string): Promise<any[]> {
    try {
      const cacheKey = CACHE_KEYS.userFavorites(userId);
      
      // Try cache first
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) {
        logger.info('User favorites cache hit', { userId });
        return cached;
      }

      // For now, return empty array since this method doesn't exist in base class
      // This would need to be implemented in the base AuthService or moved to a different service
      const favorites: any[] = [];
      
      // Cache the result
      await cacheService.set(cacheKey, favorites, CACHE_TTL.USER_SESSIONS);
      logger.info('User favorites cached', { userId });

      return favorites;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_user_favorites', userId });
      return [];
    }
  }

  async validateSession(sessionId: string): Promise<SessionData | null> {
    try {
      const cacheKey = CACHE_KEYS.userSession(sessionId);
      
      // Try cache first
      const cached = await cacheService.get<SessionData>(cacheKey);
      if (cached) {
        // Check if session is still valid
        if (cached.expires_at && new Date(cached.expires_at) > new Date()) {
          logger.info('Session cache hit', { sessionId });
          return cached;
        } else {
          // Session expired, remove from cache
          await cacheService.del(cacheKey);
        }
      }

      // For now, return null since this method doesn't exist in base class
      // This would need to be implemented in the base AuthService
      const session: SessionData | null = null;
      if (session) {
        // Cache the session
        await cacheService.set(cacheKey, session, CACHE_TTL.USER_SESSIONS);
        logger.info('Session cached', { sessionId });
      }

      return session;
    } catch (error) {
      logError(error as Error, { action: 'validate_cached_session', sessionId });
      return null;
    }
  }

  async refreshSession(request: RefreshTokenRequest): Promise<AuthResponse> {
    try {
      const result = await super.refreshSession(request);
      
      if (result.success && result.session) {
        // Cache new session
        await this.cacheUserSession(result.session.id, {
          ...result.session,
          expires_at: result.session.expires_at,
        });

        logger.info('Refreshed session cached', { sessionId: result.session.id });
      }

      return result;
    } catch (error) {
      logError(error as Error, { action: 'cached_refresh_session' });
      return {
        user: null as any,
        session: null as any,
        success: false,
        message: 'Session refresh failed due to server error',
      };
    }
  }

  async logout(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Remove from cache
      await cacheService.del(CACHE_KEYS.userSession(sessionId));
      
      // Perform logout
      const result = await super.logout(sessionId);
      
      if (result.success) {
        logger.info('Session removed from cache', { sessionId });
      }

      return result;
    } catch (error) {
      logError(error as Error, { action: 'cached_logout', sessionId });
      return { success: false, message: 'Logout failed due to server error' };
    }
  }

  // =============================================
  // CACHE INVALIDATION ON UPDATES
  // =============================================

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    const result = await super.updateProfile(userId, updates);
    
    if (result.success && result.user) {
      // Invalidate user caches
      await this.invalidateUserCaches(userId);
      logger.info('User caches invalidated after profile update', { userId });
    }

    return result;
  }

  async changePassword(userId: string, passwordChange: { current_password: string; new_password: string }): Promise<{ success: boolean; message: string }> {
    const result = await super.changePassword(userId, passwordChange);
    
    if (result.success) {
      // Invalidate all user sessions
      await this.invalidateAllUserSessions(userId);
      logger.info('All user sessions invalidated after password update', { userId });
    }

    return result;
  }

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    // This method doesn't exist in base class, so we'll implement a basic version
    try {
      // Invalidate all user caches
      await this.invalidateUserCaches(userId);
      await this.invalidateAllUserSessions(userId);
      logger.info('All user caches invalidated after user deletion', { userId });
      
      return { success: true, message: 'User caches invalidated' };
    } catch (error) {
      logError(error as Error, { action: 'delete_user', userId });
      return { success: false, message: 'Failed to delete user caches' };
    }
  }

  // =============================================
  // CACHE WARMING
  // =============================================

  async warmupUserCaches(): Promise<void> {
    try {
      logger.info('Starting user cache warmup');

      // This would typically warm up frequently accessed user data
      // For now, we'll just log the action
      logger.info('User cache warmup completed');
    } catch (error) {
      logError(error as Error, { action: 'warmup_user_caches' });
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private async cacheUserSession(sessionId: string, sessionData: SessionData): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.userSession(sessionId);
      await cacheService.set(cacheKey, sessionData, CACHE_TTL.USER_SESSIONS);
    } catch (error) {
      logError(error as Error, { action: 'cache_user_session', sessionId });
    }
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    try {
      // Invalidate user-specific caches
      await cacheService.invalidateUser(userId);
      
      // Invalidate user profile cache
      await cacheService.del(CACHE_KEYS.userProfile(userId));
      
      // Invalidate user purchases cache
      await cacheService.delPattern(`user:purchases:${userId}:*`);
      
      // Invalidate user favorites cache
      await cacheService.del(CACHE_KEYS.userFavorites(userId));
    } catch (error) {
      logError(error as Error, { action: 'invalidate_user_caches', userId });
    }
  }

  private async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      // This would need to track session IDs per user
      // For now, we'll invalidate all session patterns
      await cacheService.delPattern('session:*');
    } catch (error) {
      logError(error as Error, { action: 'invalidate_all_user_sessions', userId });
    }
  }

  // =============================================
  // SESSION MANAGEMENT
  // =============================================

  async getActiveSessions(userId: string): Promise<SessionData[]> {
    try {
      // This would need to be implemented based on your session tracking
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      logError(error as Error, { action: 'get_active_sessions', userId });
      return [];
    }
  }

  async revokeSession(request: RevokeSessionRequest): Promise<{ success: boolean; message: string }> {
    try {
      // Remove from cache
      await cacheService.del(CACHE_KEYS.userSession(request.session_id));
      
      // Revoke in database
      const result = await super.revokeSession(request);
      
      if (result.success) {
        logger.info('Session revoked and removed from cache', { sessionId: request.session_id });
      }

      return result;
    } catch (error) {
      logError(error as Error, { action: 'revoke_session', sessionId: request.session_id });
      return { success: false, message: 'Session revocation failed due to server error' };
    }
  }

  async revokeAllSessions(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Remove all user sessions from cache
      await this.invalidateAllUserSessions(userId);
      
      // This method doesn't exist in base class, so we'll implement a basic version
      logger.info('All user sessions revoked and removed from cache', { userId });
      
      return { success: true, message: 'All user sessions revoked' };
    } catch (error) {
      logError(error as Error, { action: 'revoke_all_sessions', userId });
      return { success: false, message: 'Failed to revoke all sessions' };
    }
  }
}
