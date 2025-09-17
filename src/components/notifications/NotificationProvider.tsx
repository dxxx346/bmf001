'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification, NotificationType } from '@/types/notifications';
import { notificationService } from '@/services/notification.service';
import toast from 'react-hot-toast';

interface NotificationContextType {
  // State from hook
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  
  // Real-time status
  isConnected: boolean;
  connectionError: string | null;
  
  // Actions
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  
  // Utility
  getUnreadNotifications: () => Notification[];
  hasUnreadOfType: (type: NotificationType) => boolean;
  
  // Service methods
  createNotification: (userId: string, type: NotificationType, title: string, message?: string, data?: any) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const notificationHook = useNotifications({ 
    realTime: true, 
    limit: 50,
    autoLoad: true 
  });

  const {
    notifications,
    unreadCount,
    loading,
    error,
    isConnected,
    connectionError,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    getUnreadNotifications,
  } = notificationHook;

  // Enhanced utility functions
  const hasUnreadOfType = (type: NotificationType): boolean => {
    return notifications.some(n => n.type === type && !n.is_read);
  };

  const createNotification = async (
    userId: string,
    type: NotificationType,
    title: string,
    message?: string,
    data?: any
  ): Promise<void> => {
    try {
      await notificationService.createNotification({
        user_id: userId,
        type,
        channel: 'in_app',
        title,
        message,
        data,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Show toast for high priority notifications
  useEffect(() => {
    const highPriorityUnread = notifications.filter(
      n => !n.is_read && (n.priority === 'high' || n.priority === 'urgent')
    );

    highPriorityUnread.forEach(notification => {
      if (notification.priority === 'urgent') {
        toast.error(notification.title, {
          duration: 8000,
          icon: '🚨',
        });
      } else if (notification.priority === 'high') {
        toast.success(notification.title, {
          duration: 5000,
          icon: '⚠️',
        });
      }
    });
  }, [notifications]);

  const contextValue: NotificationContextType = {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    
    // Real-time
    isConnected,
    connectionError,
    
    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    
    // Utility
    getUnreadNotifications,
    hasUnreadOfType,
    
    // Service
    createNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}

// HOC for components that need notification context
export function withNotifications<P extends object>(
  Component: React.ComponentType<P>
) {
  return function NotificationWrappedComponent(props: P) {
    return (
      <NotificationProvider>
        <Component {...props} />
      </NotificationProvider>
    );
  };
}

export default NotificationProvider;
