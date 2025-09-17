/**
 * Notification System Usage Examples
 * 
 * This file demonstrates how to use the notification system
 * in various scenarios throughout the application.
 */

import { notificationService } from '@/services/notification.service';
import { NotificationType, NotificationChannel } from '@/types/notifications';

/**
 * Example 1: Send order confirmation notification
 */
export async function sendOrderConfirmation(
  userId: string,
  orderData: {
    order_id: string;
    total_amount: number;
    currency: string;
    items: Array<{ name: string; price: number }>;
  }
) {
  try {
    // Send email notification
    await notificationService.createNotification({
      user_id: userId,
      type: 'order_confirmation',
      channel: 'email',
      title: `Order Confirmation - ${orderData.order_id}`,
      template_id: 'order_confirmation_email',
      data: orderData,
    });

    // Send in-app notification for immediate awareness
    await notificationService.createNotification({
      user_id: userId,
      type: 'order_confirmation',
      channel: 'in_app',
      title: 'Order Confirmed',
      message: `Your order ${orderData.order_id} has been confirmed!`,
      data: orderData,
    });

    console.log(`Order confirmation sent for ${orderData.order_id}`);
  } catch (error) {
    console.error('Failed to send order confirmation:', error);
  }
}

/**
 * Example 2: Send payment notification with multiple channels
 */
export async function sendPaymentNotification(
  userId: string,
  paymentData: {
    amount: number;
    currency: string;
    payment_method: string;
    transaction_id: string;
    status: 'succeeded' | 'failed';
  }
) {
  const notificationType: NotificationType = paymentData.status === 'succeeded' 
    ? 'payment_received' 
    : 'payment_failed';

  const channels: NotificationChannel[] = paymentData.status === 'succeeded'
    ? ['email', 'in_app', 'push']  // Success: all channels
    : ['email', 'in_app', 'sms'];  // Failed: include SMS for urgency

  try {
    // Send notifications on all relevant channels
    await Promise.all(
      channels.map(channel => 
        notificationService.createNotification({
          user_id: userId,
          type: notificationType,
          channel,
          priority: paymentData.status === 'failed' ? 'high' : 'normal',
          title: paymentData.status === 'succeeded' 
            ? 'Payment Received' 
            : 'Payment Failed',
          template_id: `${notificationType}_${channel}`,
          data: paymentData,
        })
      )
    );

    console.log(`Payment ${paymentData.status} notification sent for ${paymentData.transaction_id}`);
  } catch (error) {
    console.error('Failed to send payment notification:', error);
  }
}

/**
 * Example 3: Send security alert (critical notification)
 */
export async function sendSecurityAlert(
  userId: string,
  alertData: {
    alert_type: string;
    ip_address: string;
    location?: string;
    user_agent?: string;
    action_required: boolean;
    action_url?: string;
  }
) {
  try {
    // Send via all available channels for maximum reach
    const channels: NotificationChannel[] = ['email', 'in_app', 'sms', 'push'];
    
    await Promise.all(
      channels.map(channel =>
        notificationService.createNotification({
          user_id: userId,
          type: 'security_alert',
          channel,
          priority: 'urgent',
          title: 'Security Alert',
          template_id: `security_alert_${channel}`,
          data: {
            ...alertData,
            alert_time: new Date().toISOString(),
          },
        })
      )
    );

    console.log(`Security alert sent for user ${userId}: ${alertData.alert_type}`);
  } catch (error) {
    console.error('Failed to send security alert:', error);
  }
}

/**
 * Example 4: Send referral commission notification
 */
export async function sendReferralEarned(
  referrerId: string,
  commissionData: {
    commission_amount: number;
    currency: string;
    commission_rate: number;
    product_name: string;
    purchase_amount: number;
  }
) {
  try {
    // Email with detailed information
    await notificationService.createNotification({
      user_id: referrerId,
      type: 'referral_earned',
      channel: 'email',
      title: `You earned ${commissionData.commission_amount} ${commissionData.currency}!`,
      template_id: 'referral_earned_email',
      data: {
        ...commissionData,
        commission_date: new Date().toISOString(),
      },
    });

    // Push notification for immediate awareness
    await notificationService.createNotification({
      user_id: referrerId,
      type: 'referral_earned',
      channel: 'push',
      title: 'Commission Earned!',
      template_id: 'referral_earned_push',
      data: commissionData,
    });

    console.log(`Referral commission notification sent: ${commissionData.commission_amount} ${commissionData.currency}`);
  } catch (error) {
    console.error('Failed to send referral commission notification:', error);
  }
}

/**
 * Example 5: Send marketing promotion (with user preferences check)
 */
export async function sendMarketingPromotion(
  userIds: string[],
  promotionData: {
    promotion_title: string;
    promotion_subtitle: string;
    promotion_description: string;
    discount_amount: number;
    discount_type: 'percentage' | 'fixed';
    promo_code: string;
    promotion_url: string;
    expiry_date: string;
    featured_products?: Array<{
      name: string;
      price: number;
      image?: string;
      url: string;
    }>;
  }
) {
  try {
    // Filter users who have marketing notifications enabled
    const eligibleUsers = [];
    
    for (const userId of userIds) {
      const preferences = await notificationService.getUserPreferences(userId);
      const marketingPref = preferences.find(
        p => p.type === 'marketing_promotion' && p.channel === 'email'
      );
      
      if (!marketingPref || marketingPref.is_enabled) {
        (eligibleUsers as any[]).push(userId as any);
      }
    }

    // Send bulk notifications
    await notificationService.sendBulkNotifications(
      eligibleUsers,
      'marketing_promotion_email',
      'email',
      promotionData
    );

    console.log(`Marketing promotion sent to ${eligibleUsers.length} users`);
  } catch (error) {
    console.error('Failed to send marketing promotion:', error);
  }
}

/**
 * Example 6: Send scheduled notification
 */
export async function scheduleMaintenanceNotification(
  userIds: string[],
  maintenanceData: {
    maintenance_date: string;
    duration: string;
    affected_services: string[];
    alternative_access?: string;
  },
  scheduledTime: Date
) {
  try {
    await Promise.all(
      userIds.map(userId =>
        notificationService.createNotification({
          user_id: userId,
          type: 'system_maintenance',
          channel: 'email',
          title: 'Scheduled Maintenance Notice',
          data: maintenanceData,
          scheduled_at: scheduledTime.toISOString(),
        })
      )
    );

    console.log(`Maintenance notification scheduled for ${userIds.length} users at ${scheduledTime}`);
  } catch (error) {
    console.error('Failed to schedule maintenance notification:', error);
  }
}

/**
 * Example 7: Handle webhook notifications
 */
export async function sendWebhookNotification(
  webhookUrl: string,
  eventData: {
    event_type: string;
    user_id: string;
    timestamp: string;
    data: Record<string, any>;
  }
) {
  try {
    await notificationService.createNotification({
      user_id: eventData.user_id,
      type: 'custom',
      channel: 'webhook',
      title: `Webhook: ${eventData.event_type}`,
      data: {
        webhook_url: webhookUrl,
        ...eventData,
      },
    });

    console.log(`Webhook notification sent for event: ${eventData.event_type}`);
  } catch (error) {
    console.error('Failed to send webhook notification:', error);
  }
}

/**
 * Example 8: Register device for push notifications
 */
export async function registerDeviceForNotifications(
  userId: string,
  deviceData: {
    token: string;
    platform: 'ios' | 'android' | 'web';
    device_name?: string;
    app_version?: string;
  }
) {
  try {
    const response = await fetch('/api/notifications/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`, // Replace with actual auth token
      },
      body: JSON.stringify(deviceData),
    });

    if (response.ok) {
      console.log('Device registered for push notifications');
    } else {
      throw new Error('Failed to register device');
    }
  } catch (error) {
    console.error('Failed to register device:', error);
  }
}

/**
 * Example 9: Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Array<{
    type: NotificationType;
    channel: NotificationChannel;
    is_enabled: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  }>
) {
  try {
    await notificationService.updateUserPreferences(userId, preferences);
    console.log('Notification preferences updated successfully');
  } catch (error) {
    console.error('Failed to update preferences:', error);
  }
}

/**
 * Example 10: Check notification system health
 */
export async function checkNotificationHealth() {
  try {
    const health = await notificationService.healthCheck();
    
    console.log('Notification System Health:', {
      email: health.email ? '✅ Healthy' : '❌ Down',
      sms: health.sms ? '✅ Healthy' : '❌ Down',
      push: health.push ? '✅ Healthy' : '❌ Down',
      database: health.database ? '✅ Healthy' : '❌ Down',
      redis: health.redis ? '✅ Healthy' : '❌ Down',
    });

    return health;
  } catch (error) {
    console.error('Failed to check notification health:', error);
    return null;
  }
}
