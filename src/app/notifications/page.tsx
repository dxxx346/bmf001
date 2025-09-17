'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  Calendar,
  Archive,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Star
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationType, NotificationPriority } from '@/types/notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type ViewMode = 'all' | 'unread' | 'read';
type FilterMode = 'all' | 'important' | 'orders' | 'payments' | 'reviews' | 'system';

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    totalNotifications,
    loadNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    isConnected,
    connectionError,
    refresh,
    setFilters
  } = useNotifications({ realTime: true });

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router]);

  // Apply filters when view/filter mode changes
  useEffect(() => {
    const filters: any = {};

    // View mode filters
    if (viewMode === 'unread') {
      filters.is_read = false;
    } else if (viewMode === 'read') {
      filters.is_read = true;
    }

    // Category filters
    if (filterMode === 'important') {
      // Would filter by priority
    } else if (filterMode === 'orders') {
      filters.type = 'order_confirmation';
    } else if (filterMode === 'payments') {
      filters.type = 'payment_received';
    } else if (filterMode === 'reviews') {
      filters.type = 'product_review';
    } else if (filterMode === 'system') {
      filters.type = 'system_maintenance';
    }

    setFilters(filters);
  }, [viewMode, filterMode, setFilters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ search: searchQuery || undefined });
  };

  const handleSelectNotification = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
  };

  const handleBulkMarkAsRead = async () => {
    const promises = Array.from(selectedNotifications)
      .map(id => notifications.find(n => n.id === id))
      .filter(n => n && !n.is_read)
      .map(n => markAsRead(n!.id));

    await Promise.all(promises);
    setSelectedNotifications(new Set());
    toast.success('Selected notifications marked as read');
  };

  const handleBulkDelete = async () => {
    const promises = Array.from(selectedNotifications).map(id => deleteNotification(id));
    await Promise.all(promises);
    setSelectedNotifications(new Set());
    toast.success('Selected notifications deleted');
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();

  const getViewModeStats = () => {
    return {
      all: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      read: notifications.filter(n => n.is_read).length,
    };
  };

  const viewStats = getViewModeStats();

  // Wrapper functions to match NotificationItem expected signatures
  const handleMarkAsRead = async (id: string): Promise<void> => {
    await markAsRead(id);
  };

  const handleDeleteNotification = async (id: string): Promise<void> => {
    await deleteNotification(id);
  };

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorMessage title="Error Loading Notifications" message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600">
                Stay updated with your marketplace activity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-gray-600">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            <Button
              variant="outline"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/notifications/preferences')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Connection Error */}
        {connectionError && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">
                  Real-time updates unavailable: {connectionError}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Mode Tabs */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {(['all', 'unread', 'read'] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="capitalize"
                  >
                    {mode} ({viewStats[mode]})
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Mark All Read
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteAllRead}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Clear Read
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>

              {/* Category Filter */}
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                className="h-10 px-3 py-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="important">Important</option>
                <option value="orders">Orders</option>
                <option value="payments">Payments</option>
                <option value="reviews">Reviews</option>
                <option value="system">System</option>
              </select>

              <Button
                variant={showFilters ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      onChange={(e) => setFilters({ priority: e.target.value as NotificationPriority })}
                      className="h-10 px-3 py-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date From
                    </label>
                    <Input
                      type="date"
                      onChange={(e) => setFilters({ date_from: e.target.value || undefined })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date To
                    </label>
                    <Input
                      type="date"
                      onChange={(e) => setFilters({ date_to: e.target.value || undefined })}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedNotifications.size} notification{selectedNotifications.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleBulkMarkAsRead}>
                    <Eye className="w-4 h-4 mr-2" />
                    Mark as Read
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <CardTitle className="text-xl mb-2">
                {viewMode === 'unread' ? 'No unread notifications' : 'No notifications found'}
              </CardTitle>
              <CardDescription>
                {searchQuery
                  ? 'Try adjusting your search terms or filters.'
                  : viewMode === 'unread'
                  ? "You're all caught up! New notifications will appear here."
                  : 'Notifications will appear here as you use the platform.'
                }
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {selectedNotifications.size > 0 
                    ? `${selectedNotifications.size} selected`
                    : 'Select all'
                  }
                </span>
              </div>

              <div className="text-sm text-gray-600">
                Showing {filteredNotifications.length} of {totalNotifications} notifications
              </div>
            </div>

            {/* Notifications */}
            {filteredNotifications.map((notification) => (
              <div key={notification.id} className="relative">
                <div className="absolute left-4 top-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={() => handleSelectNotification(notification.id)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDeleteNotification}
                  showActions={true}
                  variant="detailed"
                  className="ml-8"
                />
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-6">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    'Load More Notifications'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Notification Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalNotifications}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
                <div className="text-sm text-gray-600">Unread</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {notifications.filter(n => n.is_read).length}
                </div>
                <div className="text-sm text-gray-600">Read</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length}
                </div>
                <div className="text-sm text-gray-600">Important</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
