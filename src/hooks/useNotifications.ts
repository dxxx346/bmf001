import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuthContext } from '@/contexts/AuthContext';
import { Notification, NotificationType, NotificationChannel, NotificationPriority } from '@/types/notifications';
import toast from 'react-hot-toast';

interface UseNotificationsOptions {
  autoLoad?: boolean;
  realTime?: boolean;
  limit?: number;
  types?: NotificationType[];
  unreadOnly?: boolean;
}

interface NotificationFilters {
  type?: NotificationType;
  is_read?: boolean;
  priority?: NotificationPriority;
  search?: string;
  date_from?: string;
  date_to?: string;
}

interface UseNotificationsReturn {
  // State
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Pagination
  currentPage: number;
  totalNotifications: number;
  
  // Actions
  loadNotifications: (filters?: NotificationFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  deleteAllRead: () => Promise<boolean>;
  
  // Real-time
  isConnected: boolean;
  connectionError: string | null;
  
  // Utility
  getNotificationById: (id: string) => Notification | null;
  getUnreadNotifications: () => Notification[];
  refresh: () => Promise<void>;
  setFilters: (filters: NotificationFilters) => void;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    autoLoad = true,
    realTime = true,
    limit = 20,
    types = [],
    unreadOnly = false
  } = options;

  const { user } = useAuthContext();
  const supabase = createClientComponentClient();
  
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [filters, setFiltersState] = useState<NotificationFilters>({});
  
  // Real-time connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Load notifications from database
  const loadNotifications = useCallback(async (newFilters?: NotificationFilters, reset: boolean = true) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const appliedFilters = { ...filters, ...newFilters };
      const offset = reset ? 0 : notifications.length;

      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Apply filters
      if (appliedFilters.type) {
        query = query.eq('type', appliedFilters.type);
      }

      if (appliedFilters.is_read !== undefined) {
        query = query.eq('is_read', appliedFilters.is_read);
      }

      if (appliedFilters.priority) {
        query = query.eq('priority', appliedFilters.priority);
      }

      if (appliedFilters.date_from) {
        query = query.gte('created_at', appliedFilters.date_from);
      }

      if (appliedFilters.date_to) {
        query = query.lte('created_at', appliedFilters.date_to);
      }

      if (types.length > 0) {
        query = query.in('type', types);
      }

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      // Apply pagination and sorting
      query = query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      const { data, error: queryError, count } = await query;

      if (queryError) {
        throw queryError;
      }

      const newNotifications = data || [];

      if (reset) {
        setNotifications(newNotifications);
        setCurrentPage(1);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
        setCurrentPage(prev => prev + 1);
      }

      setTotalNotifications(count || 0);
      setHasMore(newNotifications.length === limit);

      // Update unread count
      const unreadResult = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadCount(unreadResult.count || 0);

    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user, supabase, filters, notifications.length, limit, types, unreadOnly]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadNotifications(filters, false);
  }, [hasMore, loading, loadNotifications, filters]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, [user, supabase]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
      toast.success('All notifications marked as read');

      return true;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark notifications as read');
      return false;
    }
  }, [user, supabase]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotalNotifications(prev => prev - 1);

      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      toast.success('Notification deleted');
      return true;
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Failed to delete notification');
      return false;
    }
  }, [user, supabase, notifications]);

  // Delete all read notifications
  const deleteAllRead = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(n => !n.is_read));
      setTotalNotifications(prev => prev - notifications.filter(n => n.is_read).length);

      toast.success('Read notifications deleted');
      return true;
    } catch (err) {
      console.error('Error deleting read notifications:', err);
      toast.error('Failed to delete notifications');
      return false;
    }
  }, [user, supabase, notifications]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !realTime) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          setTotalNotifications(prev => prev + 1);
          
          // Show toast for important notifications
          if (newNotification.priority === 'high' || newNotification.priority === 'urgent') {
            toast.success(newNotification.title);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          
          setNotifications(prev =>
            prev.map(notification =>
              notification.id === updatedNotification.id ? updatedNotification : notification
            )
          );
          
          // Update unread count if read status changed
          if (updatedNotification.is_read && !payload.old.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          
          setNotifications(prev => prev.filter(n => n.id !== deletedId));
          setTotalNotifications(prev => prev - 1);
          
          if (!payload.old.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionError('Failed to connect to real-time notifications');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user, realTime, supabase]);

  // Utility functions
  const getNotificationById = useCallback((id: string) => {
    return notifications.find(notification => notification.id === id) || null;
  }, [notifications]);

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(notification => !notification.is_read);
  }, [notifications]);

  const refresh = useCallback(async () => {
    await loadNotifications(filters, true);
  }, [loadNotifications, filters]);

  const setFilters = useCallback((newFilters: NotificationFilters) => {
    setFiltersState(newFilters);
    loadNotifications(newFilters, true);
  }, [loadNotifications]);

  // Auto-load on mount
  useEffect(() => {
    if (user && autoLoad) {
      loadNotifications({}, true);
    }
  }, [user, autoLoad, loadNotifications]);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    
    // Pagination
    currentPage,
    totalNotifications,
    
    // Actions
    loadNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    
    // Real-time
    isConnected,
    connectionError,
    
    // Utility
    getNotificationById,
    getUnreadNotifications,
    refresh,
    setFilters,
  };
}

// Specialized hook for unread notifications (for bell icon)
export function useUnreadNotifications() {
  const { user } = useAuthContext();
  const supabase = createClientComponentClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get unread count
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (countError) throw countError;

      // Get recent unread notifications for preview
      const { data: recent, error: recentError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      setUnreadCount(count || 0);
      setRecentNotifications(recent || []);
    } catch (err) {
      console.error('Error loading unread notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Set up real-time subscription for unread count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setUnreadCount(prev => prev + 1);
          setRecentNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          
          // Update unread count if read status changed
          if (updatedNotification.is_read && !payload.old.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
            setRecentNotifications(prev => 
              prev.filter(n => n.id !== updatedNotification.id)
            );
          }
        }
      )
      .subscribe();

    // Load initial data
    loadUnreadCount();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, loadUnreadCount]);

  return {
    unreadCount,
    recentNotifications,
    loading,
    refresh: loadUnreadCount,
  };
}

// Hook for notification preferences
export function useNotificationPreferences() {
  const { user } = useAuthContext();
  const supabase = createClientComponentClient();
  const [preferences, setPreferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // This would load from notification_preferences table
      // For now, return default preferences
      const defaultPreferences = [
        { type: 'order_confirmation', email: true, push: true, sms: false },
        { type: 'payment_received', email: true, push: true, sms: false },
        { type: 'product_review', email: true, push: false, sms: false },
        { type: 'referral_earned', email: true, push: true, sms: false },
        { type: 'marketing_promotion', email: false, push: false, sms: false },
      ];

      setPreferences(defaultPreferences);
    } catch (err) {
      console.error('Error loading notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  const updatePreferences = useCallback(async (newPreferences: any[]) => {
    if (!user) return false;

    try {
      // This would update the notification_preferences table
      setPreferences(newPreferences);
      toast.success('Notification preferences updated');
      return true;
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      toast.error('Failed to update preferences');
      return false;
    }
  }, [user, supabase]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    updatePreferences,
    refresh: loadPreferences,
  };
}

export default useNotifications;
