// Authentication types for the digital marketplace

export type UserRole = 'buyer' | 'seller' | 'partner' | 'admin';

export type AuthProvider = 'email' | 'google' | 'github';

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  status: SessionStatus;
  user_agent?: string;
  ip_address?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  terms_accepted: boolean;
}

export interface OAuthCredentials {
  provider: AuthProvider;
  code: string;
  state?: string;
  redirect_uri: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface EmailVerificationConfirm {
  token: string;
}

export interface ProfileUpdate {
  name?: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  phone?: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface AuthResponse {
  user: AuthUser;
  session: AuthSession;
  success: boolean;
  message?: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface OAuthProviderConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: string[];
}

export interface AuthConfig {
  providers: {
    google?: OAuthProviderConfig;
    github?: OAuthProviderConfig;
  };
  jwt: {
    secret: string;
    expires_in: string;
    refresh_expires_in: string;
  };
  email: {
    verification_url: string;
    reset_url: string;
  };
  security: {
    max_login_attempts: number;
    lockout_duration: number;
    password_min_length: number;
    require_strong_password: boolean;
  };
}

export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason?: string;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  user_id?: string;
  event_type: 'login' | 'logout' | 'password_change' | 'email_verification' | 'password_reset' | 'suspicious_activity';
  ip_address: string;
  user_agent: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuthContext {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  lastActivity: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RevokeSessionRequest {
  session_id: string;
}

export interface SessionListResponse {
  sessions: AuthSession[];
  current_session_id: string;
}

export interface UserProfile extends AuthUser {
  bio?: string;
  website?: string;
  location?: string;
  phone?: string;
  social_links?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  preferences?: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      marketing: boolean;
    };
  };
}

// Additional types for compatibility
export type User = AuthUser;
export type LoginRequest = LoginCredentials;
export type RegisterRequest = RegisterCredentials;
export type SessionData = AuthSession;
export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};
