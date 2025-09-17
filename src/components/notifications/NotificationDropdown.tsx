'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Bell, 
  CheckCheck, 
  Eye, 
  Trash2, 
  Settings, 
  ExternalLink,
  MessageSquare,
  Clock
} from 'lucide-react';
import { Notification } from '@/types/notifications';
import { NotificationItem, CompactNotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onClose: () => void;
  onMarkAsRead?: (id: string) => Promise<void>;
  onMarkAllAsRead?: () => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onViewAll?: () => void;
  className?: string;
  maxHeight?: string;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onViewAll,
  className,
  maxHeight = 'max-h-96'
}: NotificationDropdownProps) {
  
  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      // Default navigation to notifications page
      window.location.href = '/notifications';
    }
    onClose();
  };

  const handleMarkAllAsRead = async () => {
    if (onMarkAllAsRead) {
      await onMarkAllAsRead();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onClose();
  };

  return (
    <Card className={cn("w-80 shadow-lg border-gray-200", className)}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <CardTitle className="text-lg">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {unreadCount} new
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {unreadCount > 0 && onMarkAllAsRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              title="View all notifications"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Notifications List */}
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No notifications</h3>
            <p className="text-xs text-gray-500">
              You're all caught up! New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className={cn("overflow-y-auto", maxHeight)}>
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <CompactNotificationItem
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onDelete={onDelete}
                  onClick={handleNotificationClick}
                  showActions={false}
                  className="border-0 rounded-none hover:bg-gray-50"
                />
                {index < notifications.length - 1 && (
                  <Separator />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewAll}
                className="text-blue-600 hover:text-blue-700"
              >
                View All Notifications
              </Button>
              
              <Link href="/notifications/preferences">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-700"
                  onClick={onClose}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

// Floating notification dropdown for mobile
export function FloatingNotificationDropdown({
  isOpen,
  onClose,
  ...props
}: NotificationDropdownProps & { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      {/* Dropdown */}
      <div className="absolute top-16 left-4 right-4">
        <NotificationDropdown
          {...props}
          onClose={onClose}
          className="w-full"
          maxHeight="max-h-[70vh]"
        />
      </div>
    </div>
  );
}

export default NotificationDropdown;
