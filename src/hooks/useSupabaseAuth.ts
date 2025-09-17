import { useAuthContext } from '@/contexts/AuthContext';
import { User, Session } from '@supabase/supabase-js';
import { User as DatabaseUser } from '@/types/database';

// Main hook that exports all auth functionality
export function useAuth() {
  return useAuthContext();
}

// Convenience hooks for specific auth operations
export function useUser(): User | null {
  const { user } = useAuthContext();
  return user;
}

export function useProfile(): DatabaseUser | null {
  const { profile } = useAuthContext();
  return profile;
}

export function useSession(): Session | null {
  const { session } = useAuthContext();
  return session;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
}

export function useAuthLoading(): boolean {
  const { isLoading } = useAuthContext();
  return isLoading;
}

// Role-based hooks
export function useIsAdmin(): boolean {
  const { profile } = useAuthContext();
  return profile?.role === 'admin';
}

export function useIsSeller(): boolean {
  const { profile } = useAuthContext();
  return profile?.role === 'seller' || profile?.role === 'admin';
}

export function useIsPartner(): boolean {
  const { profile } = useAuthContext();
  return profile?.role === 'partner' || profile?.role === 'admin';
}

export function useIsBuyer(): boolean {
  const { profile } = useAuthContext();
  return profile?.role === 'buyer';
}

export function useUserRole(): string | null {
  const { profile } = useAuthContext();
  return profile?.role || null;
}

// Auth actions hooks
export function useSignUp() {
  const { signUp } = useAuthContext();
  return signUp;
}

export function useSignIn() {
  const { signIn } = useAuthContext();
  return signIn;
}

export function useSignOut() {
  const { signOut } = useAuthContext();
  return signOut;
}

export function useUpdateProfile() {
  const { updateProfile } = useAuthContext();
  return updateProfile;
}

export function useResetPassword() {
  const { resetPassword } = useAuthContext();
  return resetPassword;
}

export function useUpdatePassword() {
  const { updatePassword } = useAuthContext();
  return updatePassword;
}

export function useRefreshProfile() {
  const { refreshProfile } = useAuthContext();
  return refreshProfile;
}

// Combined hooks for common patterns
export function useAuthState() {
  const { user, profile, session, isAuthenticated, isLoading } = useAuthContext();
  return {
    user,
    profile,
    session,
    isAuthenticated,
    isLoading,
  };
}

export function useAuthActions() {
  const {
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    refreshProfile,
  } = useAuthContext();

  return {
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    refreshProfile,
  };
}

// Hook for checking specific permissions
export function useHasPermission(requiredRoles: string[]): boolean {
  const { profile } = useAuthContext();
  
  if (!profile) return false;
  
  return requiredRoles.includes(profile.role);
}

// Hook for redirecting based on auth state
export function useAuthRedirect() {
  const { isAuthenticated, profile, isLoading } = useAuthContext();

  const getRedirectPath = (): string | null => {
    if (isLoading) return null;

    if (!isAuthenticated) {
      return '/auth/login';
    }

    if (!profile) {
      return '/auth/setup-profile';
    }

    // Redirect based on role
    switch (profile.role) {
      case 'admin':
        return '/admin';
      case 'seller':
        return '/seller/dashboard';
      case 'partner':
        return '/partner/dashboard';
      case 'buyer':
      default:
        return '/dashboard';
    }
  };

  return {
    redirectPath: getRedirectPath(),
    shouldRedirect: !isLoading && (!isAuthenticated || !profile),
  };
}

// Export the main hook as default for backward compatibility
export default useAuth;
