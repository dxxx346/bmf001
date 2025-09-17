'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import './admin.css';

export default function AdminPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (user?.role === 'admin') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
      setIsCheckingAuth(false);
    } else if (!isLoading && !isAuthenticated) {
      setIsAuthorized(false);
      setIsCheckingAuth(false);
    }
  }, [user, isLoading, isAuthenticated]);

  if (isCheckingAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage 
          title="Authentication Required" 
          message="Please log in to access the admin dashboard." 
        />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage 
          title="Access Denied" 
          message="You don&apos;t have permission to access the admin dashboard." 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminDashboard />
    </div>
  );
}
