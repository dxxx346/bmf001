'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { adminService, UserManagement } from '@/services/admin.service';
import { UserTable, UserFilters } from '@/components/admin/UserTable';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<UserFilters>({});
  
  const usersPerPage = 50;

  // Check admin authorization
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Load users data
  const loadUsers = useCallback(async (page: number = 1, userFilters: UserFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await adminService.getUsers(page, usersPerPage, userFilters);
      
      if (result) {
        setUsers(result.users);
        setTotalUsers(result.total);
        setTotalPages(Math.ceil(result.total / usersPerPage));
        setCurrentPage(page);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers(1, filters);
    }
  }, [user, loadUsers, filters]);

  // Handle user actions
  const handleUserAction = async (userId: string, action: string, data?: any) => {
    if (!user) return;

    try {
      let success = false;
      let message = '';

      switch (action) {
        case 'suspend':
          success = await adminService.updateUserStatus(userId, 'suspended', user.id, data?.reason);
          message = success ? 'User suspended successfully' : 'Failed to suspend user';
          break;
          
        case 'activate':
          success = await adminService.updateUserStatus(userId, 'active', user.id, data?.reason);
          message = success ? 'User activated successfully' : 'Failed to activate user';
          break;
          
        case 'ban':
          success = await adminService.updateUserStatus(userId, 'banned', user.id, data?.reason);
          message = success ? 'User banned successfully' : 'Failed to ban user';
          break;
          
        case 'edit':
          // Would need to implement user profile update in admin service
          success = true;
          message = 'User updated successfully';
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (success) {
        toast.success(message);
        // Reload users to reflect changes
        await loadUsers(currentPage, filters);
      } else {
        toast.error(message);
      }
    } catch (err) {
      console.error('Error performing user action:', err);
      toast.error('Failed to perform action');
    }
  };

  // Handle search
  const handleSearch = useCallback((query: string) => {
    const newFilters = { ...filters, search: query || undefined };
    setFilters(newFilters);
    loadUsers(1, newFilters);
  }, [filters, loadUsers]);

  // Handle filters
  const handleFilter = useCallback((newFilters: UserFilters) => {
    setFilters(newFilters);
    loadUsers(1, newFilters);
  }, [loadUsers]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadUsers(currentPage, filters);
  }, [loadUsers, currentPage, filters]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    loadUsers(page, filters);
  }, [loadUsers, filters]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (error && !users.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorMessage title="Error Loading Users" message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">
              Manage user accounts, roles, and permissions
            </p>
          </div>
        </div>

        {/* User Table */}
        <UserTable
          users={users}
          loading={loading}
          onUserAction={handleUserAction}
          onRefresh={handleRefresh}
          onSearch={handleSearch}
          onFilter={handleFilter}
          totalUsers={totalUsers}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
