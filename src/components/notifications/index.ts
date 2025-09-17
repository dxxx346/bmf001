// Notification System Components
export { NotificationBell, HeaderNotificationBell, MobileNotificationBell } from './NotificationBell';
export { NotificationDropdown, FloatingNotificationDropdown } from './NotificationDropdown';
export { 
  NotificationItem, 
  CompactNotificationItem, 
  DetailedNotificationItem 
} from './NotificationItem';
export { 
  NotificationProvider, 
  useNotificationContext, 
  withNotifications 
} from './NotificationProvider';
export { 
  HeaderNotificationIntegration, 
  LayoutWithNotifications, 
  NotificationTriggers 
} from './NotificationIntegration';

// Re-export types for convenience
export type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationPreference,
  CreateNotificationRequest,
  UpdatePreferencesRequest,
} from '@/types/notifications';
