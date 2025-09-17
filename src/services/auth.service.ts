import { createServiceClient, createServerClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { nanoid } from 'nanoid/non-secure';
import {
  AuthUser,
  AuthSession,
  LoginCredentials,
  RegisterCredentials,
  OAuthCredentials,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailVerificationRequest,
  EmailVerificationConfirm,
  ProfileUpdate,
  PasswordChange,
  AuthResponse,
  AuthError,
  UserRole,
  AuthProvider,
  SessionStatus,
  LoginAttempt,
  SecurityEvent,
  RefreshTokenRequest,
  RevokeSessionRequest,
  SessionListResponse,
  UserProfile,
} from '@/types/auth';

export class AuthService {
  private supabase = createServiceClient();
  private serverSupabase = createServerClient();

  // =============================================
  // REGISTRATION & LOGIN
  // =============================================

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      logger.info('User registration attempt', { email: credentials.email });

      // Validate input
      const validation = this.validateRegistration(credentials);
      if (!validation.valid) {
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: validation.error,
        };
      }

      // Check if user already exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('id, email')
        .eq('email', credentials.email)
        .single();

      if (existingUser) {
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'User with this email already exists',
        };
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
            role: credentials.role || 'buyer',
          },
        },
      });

      if (authError) {
        logError(authError, { action: 'register_auth', email: credentials.email });
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: authError.message,
        };
      }

      if (!authData.user) {
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'Failed to create user',
        };
      }

      // Create user profile in our database
      const { data: userProfile, error: profileError } = await this.supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: credentials.email,
          name: credentials.name,
          role: credentials.role || 'buyer',
          is_active: true,
          email_verified: false,
        })
        .select()
        .single();

      if (profileError) {
        logError(profileError, { action: 'register_profile', userId: authData.user.id });
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'Failed to create user profile',
        };
      }

      // Send email verification
      await this.sendEmailVerification(credentials.email);

      // Log security event
      await this.logSecurityEvent({
        user_id: authData.user.id,
        event_type: 'login',
        ip_address: 'unknown',
        user_agent: 'unknown',
        details: { action: 'registration' },
      });

      logger.info('User registered successfully', { userId: authData.user.id, email: credentials.email });

      return {
        user: userProfile as AuthUser,
        session: null as any,
        success: true,
        message: 'Registration successful. Please check your email for verification.',
      };
    } catch (error) {
      logError(error as Error, { action: 'register', email: credentials.email });
      return {
        user: null as any,
        session: null as any,
        success: false,
        message: 'Registration failed due to server error',
      };
    }
  }

  async login(credentials: LoginCredentials, ipAddress: string, userAgent: string): Promise<AuthResponse> {
    try {
      logger.info('User login attempt', { email: credentials.email, ip: ipAddress });

      // Check for too many failed attempts
      const isLocked = await this.checkAccountLockout(credentials.email, ipAddress);
      if (isLocked) {
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'Account temporarily locked due to too many failed attempts',
        };
      }

      // Validate input
      const validation = this.validateLogin(credentials);
      if (!validation.valid) {
        await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, validation.error);
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: validation.error,
        };
      }

      // Authenticate with Supabase
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) {
        await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, authError.message);
        logError(authError, { action: 'login_auth', email: credentials.email });
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'Invalid email or password',
        };
      }

      if (!authData.user || !authData.session) {
        await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, 'No user or session returned');
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'Login failed',
        };
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !userProfile) {
        logError(profileError || new Error('Profile fetch failed'), { action: 'login_profile', userId: authData.user.id });
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'Failed to load user profile',
        };
      }

      // Check if user is active
      if (!userProfile.is_active) {
        await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, 'Account deactivated');
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'Account is deactivated',
        };
      }

      // Create session record
      const session = await this.createSession(
        authData.user.id,
        authData.session.access_token,
        authData.session.refresh_token,
        authData.session.expires_at?.toString() || '',
        ipAddress,
        userAgent
      );

      // Update last login
      await this.updateLastLogin(authData.user.id);

      // Log successful login
      await this.logLoginAttempt(credentials.email, ipAddress, userAgent, true);
      await this.logSecurityEvent({
        user_id: authData.user.id,
        event_type: 'login',
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { method: 'email_password' },
      });

      logger.info('User logged in successfully', { userId: authData.user.id, email: credentials.email });

      return {
        user: userProfile as AuthUser,
        session,
        success: true,
        message: 'Login successful',
      };
    } catch (error) {
      logError(error as Error, { action: 'login', email: credentials.email });
      return {
        user: null as any,
        session: null as any,
        success: false,
        message: 'Login failed due to server error',
      };
    }
  }

  async logout(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('User logout attempt', { sessionId });

      // Revoke session
      const { error } = await this.supabase
        .from('user_sessions')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        logError(error, { action: 'logout', sessionId });
        return { success: false, message: 'Failed to logout' };
      }

      // Sign out from Supabase
      await this.supabase.auth.signOut();

      logger.info('User logged out successfully', { sessionId });
      return { success: true, message: 'Logout successful' };
    } catch (error) {
      logError(error as Error, { action: 'logout', sessionId });
      return { success: false, message: 'Logout failed due to server error' };
    }
  }

  // =============================================
  // OAUTH INTEGRATION
  // =============================================

  async getOAuthUrl(provider: AuthProvider, redirectUri: string): Promise<{ url: string; state: string }> {
    try {
      const state = nanoid(32);
      
      let url: string;
      switch (provider) {
        case 'google':
          url = this.buildGoogleOAuthUrl(redirectUri, state);
          break;
        case 'github':
          url = this.buildGitHubOAuthUrl(redirectUri, state);
          break;
        default:
          throw new Error(`Unsupported OAuth provider: ${provider}`);
      }

      logger.info('OAuth URL generated', { provider, state });
      return { url, state };
    } catch (error) {
      logError(error as Error, { action: 'get_oauth_url', provider });
      throw error;
    }
  }

  async handleOAuthCallback(credentials: OAuthCredentials, ipAddress: string, userAgent: string): Promise<AuthResponse> {
    try {
      logger.info('OAuth callback handling', { provider: credentials.provider, ip: ipAddress });

      let authData: any;
      let error: any;

      switch (credentials.provider) {
        case 'google':
          ({ data: authData, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: credentials.redirect_uri,
            },
          }));
          break;
        case 'github':
          ({ data: authData, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
              redirectTo: credentials.redirect_uri,
            },
          }));
          break;
        default:
          throw new Error(`Unsupported OAuth provider: ${credentials.provider}`);
      }

      if (error || !authData.user) {
        logError(error, { action: 'oauth_callback', provider: credentials.provider });
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'OAuth authentication failed',
        };
      }

      // Get or create user profile
      let userProfile = await this.getUserProfile(authData.user.id);
      if (!userProfile) {
        userProfile = await this.createOAuthUserProfile(authData.user, credentials.provider);
      }

      // Create session
      const session = await this.createSession(
        authData.user.id,
        authData.session.access_token,
        authData.session.refresh_token,
        authData.session.expires_at,
        ipAddress,
        userAgent
      );

      // Update last login
      await this.updateLastLogin(authData.user.id);

      // Log security event
      await this.logSecurityEvent({
        user_id: authData.user.id,
        event_type: 'login',
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { method: 'oauth', provider: credentials.provider },
      });

      logger.info('OAuth login successful', { userId: authData.user.id, provider: credentials.provider });

      return {
        user: userProfile,
        session,
        success: true,
        message: 'OAuth login successful',
      };
    } catch (error) {
      logError(error as Error, { action: 'oauth_callback', provider: credentials.provider });
      return {
        user: null as any,
        session: null as any,
        success: false,
        message: 'OAuth authentication failed due to server error',
      };
    }
  }

  // =============================================
  // PASSWORD RESET
  // =============================================

  async requestPasswordReset(request: PasswordResetRequest): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Password reset request', { email: request.email });

      // Check if user exists
      const { data: user } = await this.supabase
        .from('users')
        .select('id, email, name')
        .eq('email', request.email)
        .single();

      if (!user) {
        // Don't reveal if user exists or not
        return { success: true, message: 'If an account with that email exists, a password reset link has been sent.' };
      }

      // Generate reset token
      const resetToken = nanoid(64);
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token
      const { error } = await this.supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          used: false,
        });

      if (error) {
        logError(error, { action: 'password_reset_token', userId: user.id });
        return { success: false, message: 'Failed to generate reset token' };
      }

      // Send reset email
      await this.sendPasswordResetEmail(user.email, user.name, resetToken);

      // Log security event
      await this.logSecurityEvent({
        user_id: user.id,
        event_type: 'password_reset',
        ip_address: 'unknown',
        user_agent: 'unknown',
        details: { email: request.email },
      });

      logger.info('Password reset email sent', { userId: user.id, email: request.email });
      return { success: true, message: 'If an account with that email exists, a password reset link has been sent.' };
    } catch (error) {
      logError(error as Error, { action: 'request_password_reset', email: request.email });
      return { success: false, message: 'Password reset request failed due to server error' };
    }
  }

  async confirmPasswordReset(confirm: PasswordResetConfirm): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Password reset confirmation', { token: confirm.token.substring(0, 8) + '...' });

      // Validate token
      const { data: tokenData, error: tokenError } = await this.supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', confirm.token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        return { success: false, message: 'Invalid or expired reset token' };
      }

      // Validate new password
      const validation = this.validatePassword(confirm.new_password);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'Invalid password' };
      }

      // Update password in Supabase Auth
      const { error: updateError } = await this.supabase.auth.admin.updateUserById(
        tokenData.user_id,
        { password: confirm.new_password }
      );

      if (updateError) {
        logError(updateError, { action: 'password_reset_update', userId: tokenData.user_id });
        return { success: false, message: 'Failed to update password' };
      }

      // Mark token as used
      await this.supabase
        .from('password_reset_tokens')
        .update({ used: true, updated_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      // Revoke all sessions
      await this.supabase
        .from('user_sessions')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('user_id', tokenData.user_id);

      // Log security event
      await this.logSecurityEvent({
        user_id: tokenData.user_id,
        event_type: 'password_change',
        ip_address: 'unknown',
        user_agent: 'unknown',
        details: { method: 'password_reset' },
      });

      logger.info('Password reset successful', { userId: tokenData.user_id });
      return { success: true, message: 'Password has been reset successfully' };
    } catch (error) {
      logError(error as Error, { action: 'confirm_password_reset' });
      return { success: false, message: 'Password reset confirmation failed due to server error' };
    }
  }

  // =============================================
  // EMAIL VERIFICATION
  // =============================================

  async sendEmailVerification(email: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Sending email verification', { email });

      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        logError(error, { action: 'send_email_verification', email });
        return { success: false, message: 'Failed to send verification email' };
      }

      logger.info('Email verification sent', { email });
      return { success: true, message: 'Verification email sent' };
    } catch (error) {
      logError(error as Error, { action: 'send_email_verification', email });
      return { success: false, message: 'Failed to send verification email due to server error' };
    }
  }

  async verifyEmail(confirm: EmailVerificationConfirm): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Email verification attempt', { token: confirm.token.substring(0, 8) + '...' });

      const { data, error } = await this.supabase.auth.verifyOtp({
        token_hash: confirm.token,
        type: 'email',
      });

      if (error || !data.user) {
        logError(error || new Error('Email verification failed'), { action: 'verify_email' });
        return { success: false, message: 'Invalid or expired verification token' };
      }

      // Update user profile
      await this.supabase
        .from('users')
        .update({ 
          email_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.user.id);

      // Log security event
      await this.logSecurityEvent({
        user_id: data.user.id,
        event_type: 'email_verification',
        ip_address: 'unknown',
        user_agent: 'unknown',
        details: { email: data.user.email },
      });

      logger.info('Email verified successfully', { userId: data.user.id });
      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      logError(error as Error, { action: 'verify_email' });
      return { success: false, message: 'Email verification failed due to server error' };
    }
  }

  // =============================================
  // SESSION MANAGEMENT
  // =============================================

  async refreshSession(request: RefreshTokenRequest): Promise<AuthResponse> {
    try {
      logger.info('Session refresh attempt', { token: request.refresh_token.substring(0, 8) + '...' });

      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: request.refresh_token,
      });

      if (error || !data.session || !data.user) {
        logError(error || new Error('Session refresh failed'), { action: 'refresh_session' });
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'Invalid refresh token',
        };
      }

      // Get user profile
      const userProfile = await this.getUserProfile(data.user.id);
      if (!userProfile) {
        return {
          user: null as any,
          session: null as any,
          success: false,
          message: 'User profile not found',
        };
      }

      // Update session
      const session = await this.updateSession(
        data.session.access_token,
        data.session.refresh_token,
        data.session.expires_at?.toString() || ''
      );

      logger.info('Session refreshed successfully', { userId: data.user.id });
      return {
        user: userProfile,
        session,
        success: true,
        message: 'Session refreshed successfully',
      };
    } catch (error) {
      logError(error as Error, { action: 'refresh_session' });
      return {
        user: null as any,
        session: null as any,
        success: false,
        message: 'Session refresh failed due to server error',
      };
    }
  }

  async revokeSession(request: RevokeSessionRequest): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Session revocation attempt', { sessionId: request.session_id });

      const { error } = await this.supabase
        .from('user_sessions')
        .update({ 
          status: 'revoked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.session_id);

      if (error) {
        logError(error, { action: 'revoke_session', sessionId: request.session_id });
        return { success: false, message: 'Failed to revoke session' };
      }

      logger.info('Session revoked successfully', { sessionId: request.session_id });
      return { success: true, message: 'Session revoked successfully' };
    } catch (error) {
      logError(error as Error, { action: 'revoke_session', sessionId: request.session_id });
      return { success: false, message: 'Session revocation failed due to server error' };
    }
  }

  async getUserSessions(userId: string): Promise<SessionListResponse> {
    try {
      const { data: sessions, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        logError(error, { action: 'get_user_sessions', userId });
        return { sessions: [], current_session_id: '' };
      }

      return {
        sessions: sessions as AuthSession[],
        current_session_id: sessions[0]?.id || '',
      };
    } catch (error) {
      logError(error as Error, { action: 'get_user_sessions', userId });
      return { sessions: [], current_session_id: '' };
    }
  }

  // =============================================
  // USER PROFILE MANAGEMENT
  // =============================================

  async getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return null;
      }

      return user as AuthUser;
    } catch (error) {
      logError(error as Error, { action: 'get_user_profile', userId });
      return null;
    }
  }

  async updateProfile(userId: string, updates: ProfileUpdate): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    try {
      logger.info('Profile update attempt', { userId, updates: Object.keys(updates) });

      const { data: user, error } = await this.supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logError(error, { action: 'update_profile', userId });
        return { success: false, message: 'Failed to update profile' };
      }

      logger.info('Profile updated successfully', { userId });
      return { success: true, message: 'Profile updated successfully', user: user as AuthUser };
    } catch (error) {
      logError(error as Error, { action: 'update_profile', userId });
      return { success: false, message: 'Profile update failed due to server error' };
    }
  }

  async changePassword(userId: string, passwordChange: PasswordChange): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Password change attempt', { userId });

      // Verify current password
      const { data: user } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const { error: verifyError } = await this.supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordChange.current_password,
      });

      if (verifyError) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Validate new password
      const validation = this.validatePassword(passwordChange.new_password);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'Invalid password' };
      }

      // Update password
      const { error: updateError } = await this.supabase.auth.admin.updateUserById(userId, {
        password: passwordChange.new_password,
      });

      if (updateError) {
        logError(updateError, { action: 'change_password', userId });
        return { success: false, message: 'Failed to update password' };
      }

      // Revoke all sessions except current
      await this.supabase
        .from('user_sessions')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .neq('id', 'current_session_id'); // This would need to be passed in

      // Log security event
      await this.logSecurityEvent({
        user_id: userId,
        event_type: 'password_change',
        ip_address: 'unknown',
        user_agent: 'unknown',
        details: { method: 'password_change' },
      });

      logger.info('Password changed successfully', { userId });
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      logError(error as Error, { action: 'change_password', userId });
      return { success: false, message: 'Password change failed due to server error' };
    }
  }

  // =============================================
  // ROLE-BASED ACCESS CONTROL
  // =============================================

  async hasRole(userId: string, requiredRoles: UserRole[]): Promise<boolean> {
    try {
      const user = await this.getUserProfile(userId);
      if (!user) return false;

      return requiredRoles.includes(user.role);
    } catch (error) {
      logError(error as Error, { action: 'has_role', userId, requiredRoles });
      return false;
    }
  }

  async requireRole(userId: string, requiredRoles: UserRole[]): Promise<{ allowed: boolean; message: string }> {
    const hasRequiredRole = await this.hasRole(userId, requiredRoles);
    
    if (!hasRequiredRole) {
      return {
        allowed: false,
        message: 'Insufficient permissions for this action',
      };
    }

    return { allowed: true, message: 'Access granted' };
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private validateRegistration(credentials: RegisterCredentials): { valid: boolean; error?: string } {
    if (!credentials.email || !credentials.password || !credentials.name) {
      return { valid: false, error: 'All fields are required' };
    }

    if (!this.isValidEmail(credentials.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    const passwordValidation = this.validatePassword(credentials.password);
    if (!passwordValidation.valid) {
      return { valid: false, error: passwordValidation.error };
    }

    if (!credentials.terms_accepted) {
      return { valid: false, error: 'Terms and conditions must be accepted' };
    }

    return { valid: true };
  }

  private validateLogin(credentials: LoginCredentials): { valid: boolean; error?: string } {
    if (!credentials.email || !credentials.password) {
      return { valid: false, error: 'Email and password are required' };
    }

    if (!this.isValidEmail(credentials.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  private validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { valid: false, error: 'Password must contain at least one special character' };
    }

    return { valid: true };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async checkAccountLockout(email: string, ipAddress: string): Promise<boolean> {
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    const { data: attempts } = await this.supabase
      .from('login_attempts')
      .select('*')
      .eq('email', email)
      .eq('success', false)
      .gte('created_at', new Date(Date.now() - lockoutDuration).toISOString())
      .order('created_at', { ascending: false });

    return Boolean(attempts && attempts.length >= maxAttempts);
  }

  private async logLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    try {
      await this.supabase.from('login_attempts').insert({
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        success,
        failure_reason: failureReason,
      });
    } catch (error) {
      logError(error as Error, { action: 'log_login_attempt' });
    }
  }

  private async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<void> {
    try {
      await this.supabase.from('security_events').insert({
        user_id: event.user_id,
        event_type: event.event_type,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        details: event.details,
      });
    } catch (error) {
      logError(error as Error, { action: 'log_security_event' });
    }
  }

  private async createSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: string,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthSession> {
    const sessionId = nanoid(32);
    const expiresAtDate = new Date(expiresAt);

    const { data: session, error } = await this.supabase
      .from('user_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAtDate.toISOString(),
        status: 'active',
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (error) {
      logError(error, { action: 'create_session', userId });
      throw new Error('Failed to create session');
    }

    return session as AuthSession;
  }

  private async updateSession(
    accessToken: string,
    refreshToken: string,
    expiresAt: string
  ): Promise<AuthSession> {
    const expiresAtDate = new Date(expiresAt);

    const { data: session, error } = await this.supabase
      .from('user_sessions')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAtDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('refresh_token', refreshToken)
      .select()
      .single();

    if (error) {
      logError(error, { action: 'update_session' });
      throw new Error('Failed to update session');
    }

    return session as AuthSession;
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      logError(error as Error, { action: 'update_last_login', userId });
    }
  }

  private async createOAuthUserProfile(user: any, provider: AuthProvider): Promise<AuthUser> {
    const { data: profile, error } = await this.supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        avatar_url: user.user_metadata?.avatar_url,
        role: 'buyer',
        is_active: true,
        email_verified: true,
      })
      .select()
      .single();

    if (error) {
      logError(error, { action: 'create_oauth_user_profile', userId: user.id });
      throw new Error('Failed to create OAuth user profile');
    }

    return profile as AuthUser;
  }

  private buildGoogleOAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private buildGitHubOAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  private async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll just log it
    logger.info('Password reset email would be sent', { email, name, token: token.substring(0, 8) + '...' });
  }
}
