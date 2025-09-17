'use client';

import React, { useState } from 'react';
import {
  MoreVertical,
  Edit2,
  Ban,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  ShoppingCart,
  Package,
  DollarSign,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { UserManagement } from '@/services/admin.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

interface UserTableProps {
  users: UserManagement[];
  loading: boolean;
  onUserAction: (userId: string, action: string, data?: any) => Promise<void>;
  onRefresh: () => void;
  onSearch: (query: string) => void;
  onFilter: (filters: UserFilters) => void;
  totalUsers: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
}

interface UserActionModalProps {
  user: UserManagement | null;
  action: 'suspend' | 'activate' | 'ban' | 'edit' | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data?: any) => Promise<void>;
  loading: boolean;
}

function UserActionModal({ user, action, isOpen, onClose, onConfirm, loading }: UserActionModalProps) {
  const [reason, setReason] = useState('');
  const [editData, setEditData] = useState({
    name: user?.name || '',
    role: user?.role || 'buyer',
  });

  const handleConfirm = async () => {
    if (action === 'edit') {
      await onConfirm(editData);
    } else {
      await onConfirm({ reason });
    }
    setReason('');
    onClose();
  };

  const getActionTitle = () => {
    switch (action) {
      case 'suspend': return 'Suspend User';
      case 'activate': return 'Activate User';
      case 'ban': return 'Ban User';
      case 'edit': return 'Edit User';
      default: return '';
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case 'suspend': return 'This will temporarily disable the user\'s account.';
      case 'activate': return 'This will restore the user\'s account access.';
      case 'ban': return 'This will permanently disable the user\'s account.';
      case 'edit': return 'Update user information and role.';
      default: return '';
    }
  };

  if (!user || !action) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getActionTitle()}
      description={getActionDescription()}
    >
      <div className="space-y-4">
        {/* User Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium">{user.name || 'No name'}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
            </div>
          </div>
        </div>

        {action === 'edit' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Enter user name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <Select
                value={editData.role}
                onValueChange={(value) => setEditData({ ...editData, role: value as any })}
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="partner">Partner</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason {action === 'ban' ? '(Required)' : '(Optional)'}
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter reason for ${action}...`}
              rows={3}
              required={action === 'ban'}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={action === 'ban' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={loading || (action === 'ban' && !reason.trim())}
          >
            {loading ? <LoadingSpinner size="sm" /> : `${getActionTitle()}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function UserTable({
  users,
  loading,
  onUserAction,
  onRefresh,
  onSearch,
  onFilter,
  totalUsers,
  currentPage,
  totalPages,
  onPageChange,
}: UserTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [actionModal, setActionModal] = useState<{
    user: UserManagement | null;
    action: 'suspend' | 'activate' | 'ban' | 'edit' | null;
  }>({ user: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<UserFilters>({});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const handleUserAction = async (user: UserManagement, action: string) => {
    setActionModal({ user, action: action as any });
  };

  const handleActionConfirm = async (data?: any) => {
    if (!actionModal.user || !actionModal.action) return;

    setActionLoading(true);
    try {
      await onUserAction(actionModal.user.id, actionModal.action, data);
      setActionModal({ user: null, action: null });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'seller': return 'bg-blue-100 text-blue-800';
      case 'partner': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'banned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage users, roles, and account status</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
            
            <div className="flex gap-2">
              <Select
                value={filters.role || ''}
                onValueChange={(value) => handleFilterChange('role', value)}
                placeholder="All Roles"
              >
                <option value="">All Roles</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="partner">Partner</option>
                <option value="admin">Admin</option>
              </Select>
              
              <Select
                value={filters.status || ''}
                onValueChange={(value) => handleFilterChange('status', value)}
                placeholder="All Status"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Bulk Suspend
                </Button>
                <Button size="sm" variant="outline">
                  Bulk Activate
                </Button>
                <Button size="sm" variant="outline">
                  Send Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Activity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Joined</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.name || 'No name'}
                          </div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          {!user.email_verified && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3 text-orange-500" />
                              <span className="text-xs text-orange-600">Unverified</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <Badge className={cn("capitalize", getRoleBadgeColor(user.role))}>
                        {user.role}
                      </Badge>
                    </td>
                    
                    <td className="px-4 py-4">
                      <Badge className={cn("capitalize", getStatusBadgeColor(user.status))}>
                        {user.status}
                      </Badge>
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          {user.total_purchases}
                        </div>
                        {user.role === 'seller' && (
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {user.total_sales}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(user.created_at)}
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction(user, 'edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        
                        {user.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUserAction(user, 'suspend')}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUserAction(user, 'activate')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction(user, 'ban')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalUsers)} of {totalUsers} users
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Action Modal */}
      <UserActionModal
        user={actionModal.user}
        action={actionModal.action}
        isOpen={!!actionModal.user && !!actionModal.action}
        onClose={() => setActionModal({ user: null, action: null })}
        onConfirm={handleActionConfirm}
        loading={actionLoading}
      />
    </div>
  );
}

export default UserTable;
