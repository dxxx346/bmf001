'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, authHelpers, onAuthStateChange } from '@/lib/supabase/client';
import { User as DatabaseUser } from '@/types/database';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  profile: DatabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, metadata?: { name?: string; role?: string }) => Promise<{ success: boolean; message: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<{ success: boolean; message: string }>;
  updateProfile: (updates: { name?: string; avatar_url?: string }) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; message: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DatabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!session;

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<DatabaseUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { session: currentSession } = await authHelpers.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Fetch user profile
          const userProfile = await fetchUserProfile(currentSession.user.id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata?: { name?: string; role?: string }) => {
    try {
      setIsLoading(true);
      const { data, error } = await authHelpers.signUp(email, password, metadata);

      if (error) {
        toast.error(error.message);
        return { success: false, message: error.message };
      }

      toast.success('Registration successful! Please check your email to verify your account.');
      return { success: true, message: 'Registration successful! Please check your email to verify your account.' };
    } catch (error: any) {
      const message = error?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await authHelpers.signIn(email, password);

      if (error) {
        toast.error(error.message);
        return { success: false, message: error.message };
      }

      toast.success('Welcome back!');
      return { success: true, message: 'Welcome back!' };
    } catch (error: any) {
      const message = error?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      setIsLoading(true);
      const { data, error } = await authHelpers.signInWithOAuth(provider);

      if (error) {
        toast.error(error.message);
        return { success: false, message: error.message };
      }

      return { success: true, message: `Redirecting to ${provider}...` };
    } catch (error: any) {
      const message = error?.message || 'OAuth login failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await authHelpers.signOut();

      if (error) {
        toast.error(error.message);
        return { success: false, message: error.message };
      }

      toast.success('Goodbye!');
      return { success: true, message: 'Goodbye!' };
    } catch (error: any) {
      const message = error?.message || 'Logout failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: { name?: string; avatar_url?: string }) => {
    try {
      setIsLoading(true);
      
      // Update auth user metadata
      const { data: authData, error: authError } = await authHelpers.updateProfile(updates);
      
      if (authError) {
        toast.error(authError.message);
        return { success: false, message: authError.message };
      }

      // Update database profile
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .update({
            name: updates.name,
            avatar_url: updates.avatar_url,
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) {
          toast.error('Failed to update profile');
          return { success: false, message: 'Failed to update profile' };
        }

        setProfile(data);
      }

      toast.success('Profile updated successfully!');
      return { success: true, message: 'Profile updated successfully!' };
    } catch (error: any) {
      const message = error?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await authHelpers.resetPassword(email);

      if (error) {
        toast.error(error.message);
        return { success: false, message: error.message };
      }

      toast.success('Password reset email sent!');
      return { success: true, message: 'Password reset email sent!' };
    } catch (error: any) {
      const message = error?.message || 'Password reset failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await authHelpers.updatePassword(password);

      if (error) {
        toast.error(error.message);
        return { success: false, message: error.message };
      }

      toast.success('Password updated successfully!');
      return { success: true, message: 'Password updated successfully!' };
    } catch (error: any) {
      const message = error?.message || 'Password update failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchUserProfile(user.id);
      setProfile(userProfile);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    isAuthenticated,
    isLoading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: string[]
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, profile, isLoading } = useAuthContext();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access this page.</p>
            <a
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Login
            </a>
          </div>
        </div>
      );
    }

    if (requiredRoles && profile && !requiredRoles.includes(profile.role)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to access this page.</p>
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Hook for role-based access control
export function useRoleAccess(requiredRoles: string[]): {
  hasAccess: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isPartner: boolean;
  isBuyer: boolean;
} {
  const { profile } = useAuthContext();

  if (!profile) {
    return {
      hasAccess: false,
      isAdmin: false,
      isSeller: false,
      isPartner: false,
      isBuyer: false,
    };
  }

  const hasAccess = requiredRoles.includes(profile.role);
  const isAdmin = profile.role === 'admin';
  const isSeller = profile.role === 'seller';
  const isPartner = profile.role === 'partner';
  const isBuyer = profile.role === 'buyer';

  return {
    hasAccess,
    isAdmin,
    isSeller,
    isPartner,
    isBuyer,
  };
}
