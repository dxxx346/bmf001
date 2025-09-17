import { createServiceClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  CreateNotificationRequest,
  BulkNotificationRequest,
  NotificationTemplate,
  TemplateContext,
} from '@/types/notifications';

export class NotificationService {
  private supabase = createServiceClient();

  // =============================================
  // CORE NOTIFICATION FUNCTIONS
  // =============================================

  async createNotification(request: CreateNotificationRequest): Promise<Notification | null> {
    try {
      logger.info('Creating notification', { 
        userId: request.user_id, 
        type: request.type,
        channel: request.channel 
      });

      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: request.user_id,
          type: request.type,
          title: request.title,
          message: request.message,
          data: request.data || {},
          priority: request.priority || 'normal',
          channel: request.channel,
          scheduled_at: request.scheduled_at,
          expires_at: request.expires_at,
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Notification created successfully', { notificationId: data.id });
      return data;
    } catch (error) {
      logError(error as Error, { action: 'create_notification', request });
      return null;
    }
  }

  async bulkCreateNotifications(request: BulkNotificationRequest): Promise<boolean> {
    try {
      logger.info('Creating bulk notifications', { 
        userCount: request.user_ids.length,
        templateId: request.template_id 
      });

      // Get template if specified
      const template: NotificationTemplate | null = null;
      if (request.template_id) {
        // Would fetch from notification_templates table
        // For now, use basic template
      }

      const notifications = request.user_ids.map(userId => ({
        user_id: userId,
        type: 'custom' as NotificationType,
        title: 'Bulk Notification',
        message: 'You have a new notification',
        data: request.data || {},
        priority: request.priority || 'normal',
        channel: request.channel,
        scheduled_at: request.scheduled_at,
      }));

      const { error } = await this.supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      logger.info('Bulk notifications created successfully', { 
        count: notifications.length 
      });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'bulk_create_notifications', request });
      return false;
    }
  }

  // =============================================
  // SPECIFIC NOTIFICATION TYPES
  // =============================================

  async notifyOrderConfirmation(
    userId: string,
    orderId: string,
    orderDetails: any
  ): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: 'order_confirmation',
      channel: 'in_app',
      priority: 'normal',
      title: 'Order Confirmed',
      message: `Your order #${orderId.slice(0, 8)} has been confirmed.`,
      data: {
        order_id: orderId,
        ...orderDetails,
      },
    });
  }

  async notifyPaymentReceived(
    sellerId: string,
    paymentId: string,
    amount: number,
    productTitle: string
  ): Promise<void> {
    await this.createNotification({
      user_id: sellerId,
      type: 'payment_received',
      channel: 'in_app',
      priority: 'high',
      title: 'Payment Received',
      message: `You received $${amount.toFixed(2)} for "${productTitle}".`,
      data: {
        payment_id: paymentId,
        amount,
        product_title: productTitle,
      },
    });
  }

  async notifyProductReview(
    sellerId: string,
    reviewId: string,
    productTitle: string,
    rating: number
  ): Promise<void> {
    await this.createNotification({
      user_id: sellerId,
      type: 'product_review',
      channel: 'in_app',
      priority: 'normal',
      title: 'New Review',
      message: `"${productTitle}" received a ${rating}-star review.`,
      data: {
        review_id: reviewId,
        product_title: productTitle,
        rating,
      },
    });
  }

  async notifyReferralEarned(
    partnerId: string,
    referralId: string,
    amount: number,
    productTitle: string
  ): Promise<void> {
    await this.createNotification({
      user_id: partnerId,
      type: 'referral_earned',
      channel: 'in_app',
      priority: 'normal',
      title: 'Referral Commission Earned',
      message: `You earned $${amount.toFixed(2)} from referring "${productTitle}".`,
      data: {
        referral_id: referralId,
        amount,
        product_title: productTitle,
      },
    });
  }

  async notifyShopApproval(
    sellerId: string,
    shopId: string,
    shopName: string,
    approved: boolean
  ): Promise<void> {
    await this.createNotification({
      user_id: sellerId,
      type: approved ? 'shop_approved' : 'shop_rejected',
      channel: 'in_app',
      priority: 'high',
      title: approved ? 'Shop Approved' : 'Shop Rejected',
      message: approved
        ? `Your shop "${shopName}" has been approved and is now live.`
        : `Your shop "${shopName}" application needs attention.`,
      data: {
        shop_id: shopId,
        shop_name: shopName,
        approved,
      },
    });
  }

  async notifySecurityAlert(
    userId: string,
    alertType: string,
    details: any
  ): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: 'security_alert',
      channel: 'in_app',
      priority: 'urgent',
      title: 'Security Alert',
      message: `Important security notification: ${alertType}`,
      data: {
        alert_type: alertType,
        ...details,
      },
    });
  }

  async notifySystemMaintenance(
    userIds: string[],
    maintenanceDetails: any
  ): Promise<void> {
    await this.bulkCreateNotifications({
      user_ids: userIds,
      template_id: 'system_maintenance',
      channel: 'in_app',
      priority: 'normal',
      data: maintenanceDetails,
    });
  }

  // =============================================
  // NOTIFICATION MANAGEMENT
  // =============================================

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      logger.info('Notification marked as read', { notificationId, userId });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'mark_notification_read', notificationId });
      return false;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      logger.info('All notifications marked as read', { userId });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'mark_all_notifications_read', userId });
      return false;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      logger.info('Notification deleted', { notificationId, userId });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'delete_notification', notificationId });
      return false;
    }
  }

  async deleteAllRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('is_read', true);

      if (error) throw error;

      logger.info('All read notifications deleted', { userId });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'delete_all_read_notifications', userId });
      return false;
    }
  }

  // =============================================
  // NOTIFICATION PREFERENCES
  // =============================================

  async getUserPreferences(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('type, channel, is_enabled, frequency')
        .eq('user_id', userId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logError(error as Error, { action: 'get_user_preferences', userId });
      return [];
    }
  }

  async updateUserPreferences(userId: string, preferences: any[]): Promise<boolean> {
    try {
      // First, delete existing preferences for this user
      await this.supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', userId);

      // Then insert new preferences
      const preferencesToInsert = preferences.map(pref => ({
        user_id: userId,
        type: pref.type,
        channel: pref.channel,
        is_enabled: pref.is_enabled,
        frequency: pref.frequency || 'immediate'
      }));

      const { error } = await this.supabase
        .from('notification_preferences')
        .insert(preferencesToInsert);

      if (error) throw error;

      logger.info('User preferences updated successfully', { 
        userId, 
        preferencesCount: preferences.length 
      });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'update_user_preferences', userId });
      return false;
    }
  }

  // =============================================
  // NOTIFICATION ANALYTICS
  // =============================================

  async getNotificationStats(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('type, is_read, priority, created_at')
        .eq('user_id', userId);

      if (error) throw error;

      const notifications = data || [];
      const total = notifications.length;
      const unread = notifications.filter(n => !n.is_read).length;
      const byType = notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        unread,
        read: total - unread,
        by_type: byType,
        by_priority: notifications.reduce((acc, n) => {
          acc[n.priority || 'normal'] = (acc[n.priority || 'normal'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      logError(error as Error, { action: 'get_notification_stats', userId });
      return null;
    }
  }

  // =============================================
  // UNSUBSCRIBE MANAGEMENT
  // =============================================

  async processUnsubscribe(token: string): Promise<void> {
    try {
      logger.info('Processing unsubscribe request', { token: token.substring(0, 8) + '...' });

      // Get token details
      const { data: unsubscribeToken, error: fetchError } = await this.supabase
        .from('unsubscribe_tokens')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !unsubscribeToken) {
        throw new Error('Invalid or expired unsubscribe token');
      }

      // Mark token as used
      const { error: updateError } = await this.supabase
        .from('unsubscribe_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', unsubscribeToken.id);

      if (updateError) throw updateError;

      // Update user notification preferences
      await this.updateNotificationPreferences(
        unsubscribeToken.user_id,
        unsubscribeToken.type,
        unsubscribeToken.channel,
        false
      );

      logger.info('Unsubscribe processed successfully', {
        userId: unsubscribeToken.user_id,
        type: unsubscribeToken.type,
        channel: unsubscribeToken.channel,
      });
    } catch (error) {
      logError(error as Error, { action: 'process_unsubscribe', token: token.substring(0, 8) + '...' });
      throw error;
    }
  }

  private async updateNotificationPreferences(
    userId: string,
    type: string | null,
    channel: string | null,
    enabled: boolean
  ): Promise<void> {
    try {
      // This would update user notification preferences
      // For now, we'll just log the action
      logger.info('Would update notification preferences', {
        userId,
        type,
        channel,
        enabled,
      });

      // In a full implementation, you might:
      // 1. Update a user_notification_preferences table
      // 2. Set global unsubscribe flags
      // 3. Update specific channel/type preferences
    } catch (error) {
      logError(error as Error, { action: 'update_notification_preferences', userId });
      throw error;
    }
  }

  // =============================================
  // CLEANUP AND MAINTENANCE
  // =============================================

  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await this.supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('is_read', true)
        .select('id');

      if (error) throw error;

      const deletedCount = data?.length || 0;
      logger.info('Old notifications cleaned up', { deletedCount, daysOld });
      
      return deletedCount;
    } catch (error) {
      logError(error as Error, { action: 'cleanup_old_notifications', daysOld });
      return 0;
    }
  }
}

export const notificationService = new NotificationService();