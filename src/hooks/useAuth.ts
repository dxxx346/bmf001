import { useState, useEffect, useCallback } from 'react';
import { AuthUser, AuthSession, AuthError, LoginCredentials, RegisterCredentials, ProfileUpdate } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<{ success: boolean; message: string }>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ success: boolean; message: string; user?: AuthUser }>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Check for existing session
      const sessionId = localStorage.getItem('session_id');
      if (sessionId) {
        const response = await fetch('/api/auth/profile', {
          headers: {
            'X-Session-ID': sessionId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setState(prev => ({
            ...prev,
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          }));
          return;
        }
      }

      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Auth initialization error:', error);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        error: {
          code: 'INIT_ERROR',
          message: 'Failed to initialize authentication',
        },
      }));
    }
  };

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; message: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: {
            code: 'LOGIN_ERROR',
            message: data.error || 'Login failed',
          },
        }));
        return { success: false, message: data.error || 'Login failed' };
      }

      // Store session
      if (data.session?.id) {
        localStorage.setItem('session_id', data.session.id);
      }

      setState(prev => ({
        ...prev,
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Login failed due to network error',
        },
      }));
      return { success: false, message: 'Login failed due to network error' };
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials): Promise<{ success: boolean; message: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: {
            code: 'REGISTER_ERROR',
            message: data.error || 'Registration failed',
          },
        }));
        return { success: false, message: data.error || 'Registration failed' };
      }

      setState(prev => ({
        ...prev,
        user: data.user,
        isAuthenticated: false, // User needs to verify email
        isLoading: false,
        error: null,
      }));

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Registration error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: {
          code: 'REGISTER_ERROR',
          message: 'Registration failed due to network error',
        },
      }));
      return { success: false, message: 'Registration failed due to network error' };
    }
  }, []);

  const logout = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const sessionId = localStorage.getItem('session_id');
      if (sessionId) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
        });
      }

      // Clear local storage
      localStorage.removeItem('session_id');

      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }));

      return { success: true, message: 'Logout successful' };
    } catch (error) {
      console.error('Logout error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Logout failed due to network error',
        },
      }));
      return { success: false, message: 'Logout failed due to network error' };
    }
  }, []);

  const updateProfile = useCallback(async (updates: ProfileUpdate): Promise<{ success: boolean; message: string; user?: AuthUser }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const sessionId = localStorage.getItem('session_id');
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: {
            code: 'UPDATE_PROFILE_ERROR',
            message: data.error || 'Profile update failed',
          },
        }));
        return { success: false, message: data.error || 'Profile update failed' };
      }

      setState(prev => ({
        ...prev,
        user: data.user,
        isLoading: false,
        error: null,
      }));

      return { success: true, message: data.message, user: data.user };
    } catch (error) {
      console.error('Profile update error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: {
          code: 'UPDATE_PROFILE_ERROR',
          message: 'Profile update failed due to network error',
        },
      }));
      return { success: false, message: 'Profile update failed due to network error' };
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const sessionId = localStorage.getItem('session_id');
      if (!sessionId) return;

      const response = await fetch('/api/auth/profile', {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
        }));
      } else {
        // Session expired, logout
        localStorage.removeItem('session_id');
        setState(prev => ({
          ...prev,
          user: null,
          session: null,
          isAuthenticated: false,
        }));
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    refreshSession,
  };
}
