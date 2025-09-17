'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HeaderNotificationBell } from './NotificationBell';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { useAuthContext } from '@/contexts/AuthContext';

// Example integration for header component
export function HeaderNotificationIntegration() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { unreadCount } = useUnreadNotifications();

  const handleNotificationClick = () => {
    router.push('/notifications');
  };

  if (!user) return null;

  return (
    <HeaderNotificationBell
      onClick={handleNotificationClick}
      showBadge={true}
      maxBadgeCount={99}
      className="mr-4"
    />
  );
}

// Example usage in a layout component
export function LayoutWithNotifications({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Marketplace</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <HeaderNotificationIntegration />
              {/* Other header items */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}

// Example notification triggers for different events
export class NotificationTriggers {
  static async onOrderCreated(orderId: string, buyerId: string, orderDetails: any) {
    // This would be called from your order creation logic
    const { notificationService } = await import('@/services/notification.service');
    await notificationService.notifyOrderConfirmation(buyerId, orderId, orderDetails);
  }

  static async onPaymentReceived(sellerId: string, paymentId: string, amount: number, productTitle: string) {
    // This would be called from your payment webhook
    const { notificationService } = await import('@/services/notification.service');
    await notificationService.notifyPaymentReceived(sellerId, paymentId, amount, productTitle);
  }

  static async onReviewSubmitted(sellerId: string, reviewId: string, productTitle: string, rating: number) {
    // This would be called when a review is submitted
    const { notificationService } = await import('@/services/notification.service');
    await notificationService.notifyProductReview(sellerId, reviewId, productTitle, rating);
  }

  static async onReferralEarned(partnerId: string, referralId: string, amount: number, productTitle: string) {
    // This would be called when a referral commission is earned
    const { notificationService } = await import('@/services/notification.service');
    await notificationService.notifyReferralEarned(partnerId, referralId, amount, productTitle);
  }

  static async onShopStatusChange(sellerId: string, shopId: string, shopName: string, approved: boolean) {
    // This would be called when a shop is approved/rejected
    const { notificationService } = await import('@/services/notification.service');
    await notificationService.notifyShopApproval(sellerId, shopId, shopName, approved);
  }
}

export default HeaderNotificationIntegration;
