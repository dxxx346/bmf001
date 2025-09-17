'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Package,
  CreditCard,
  Star,
  Users,
  Gift,
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Clock,
  MoreVertical
} from 'lucide-react';
import { Notification, NotificationType } from '@/types/notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClick?: (notification: Notification) => void;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  className?: string;
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  order_confirmation: <Package className="w-5 h-5 text-blue-600" />,
  order_shipped: <Package className="w-5 h-5 text-green-600" />,
  order_delivered: <CheckCircle className="w-5 h-5 text-green-600" />,
  payment_received: <CreditCard className="w-5 h-5 text-green-600" />,
  payment_failed: <AlertCircle className="w-5 h-5 text-red-600" />,
  product_purchased: <Package className="w-5 h-5 text-blue-600" />,
  product_review: <Star className="w-5 h-5 text-yellow-600" />,
  shop_approved: <CheckCircle className="w-5 h-5 text-green-600" />,
  shop_rejected: <AlertCircle className="w-5 h-5 text-red-600" />,
  referral_earned: <Gift className="w-5 h-5 text-purple-600" />,
  referral_payout: <CreditCard className="w-5 h-5 text-green-600" />,
  account_created: <Users className="w-5 h-5 text-blue-600" />,
  account_verified: <CheckCircle className="w-5 h-5 text-green-600" />,
  password_reset: <AlertCircle className="w-5 h-5 text-orange-600" />,
  security_alert: <AlertCircle className="w-5 h-5 text-red-600" />,
  system_maintenance: <Info className="w-5 h-5 text-gray-600" />,
  marketing_promotion: <Gift className="w-5 h-5 text-purple-600" />,
  newsletter: <Bell className="w-5 h-5 text-blue-600" />,
  custom: <Bell className="w-5 h-5 text-gray-600" />,
};

const priorityColors = {
  low: 'border-gray-200 bg-white',
  normal: 'border-gray-200 bg-white',
  high: 'border-orange-200 bg-orange-50',
  urgent: 'border-red-200 bg-red-50',
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
  variant = 'default',
  showActions = true,
  className
}: NotificationItemProps) {
  const [isActioning, setIsActioning] = useState(false);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActionUrl = (notification: Notification): string | null => {
    const data = notification.data || {};
    
    switch (notification.type) {
      case 'order_confirmation':
      case 'order_shipped':
      case 'order_delivered':
        return data.order_id ? `/buyer/purchases/${data.order_id}` : '/buyer/purchases';
      
      case 'payment_received':
      case 'payment_failed':
        return data.payment_id ? `/payments/${data.payment_id}` : '/payments';
      
      case 'product_purchased':
        return data.product_id ? `/products/${data.product_id}` : '/buyer/purchases';
      
      case 'product_review':
        return data.product_id ? `/products/${data.product_id}#reviews` : null;
      
      case 'shop_approved':
      case 'shop_rejected':
        return data.shop_id ? `/seller/shops/${data.shop_id}` : '/seller/dashboard';
      
      case 'referral_earned':
      case 'referral_payout':
        return '/partner/dashboard';
      
      case 'account_verified':
        return '/profile';
      
      default:
        return data.url || null;
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onMarkAsRead || notification.is_read || isActioning) return;

    setIsActioning(true);
    try {
      await onMarkAsRead(notification.id);
    } finally {
      setIsActioning(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete || isActioning) return;

    setIsActioning(true);
    try {
      await onDelete(notification.id);
    } finally {
      setIsActioning(false);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    } else {
      // Auto-mark as read when clicked
      if (!notification.is_read && onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
    }
  };

  const actionUrl = getActionUrl(notification);
  const icon = notificationIcons[notification.type] || notificationIcons.custom;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer",
          !notification.is_read && "bg-blue-50",
          className
        )}
        onClick={handleClick}
      >
        <div className="flex-shrink-0">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {notification.title}
            </p>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500">{formatTimeAgo(notification.created_at)}</p>
        </div>

        {showActions && (
          <div className="flex items-center gap-1">
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                disabled={isActioning}
                title="Mark as read"
              >
                <Eye className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isActioning}
              title="Delete"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md cursor-pointer",
      !notification.is_read && "ring-2 ring-blue-100",
      priorityColors[notification.priority || 'normal'],
      className
    )}>
      <CardContent className="p-4">
        {actionUrl ? (
          <Link href={actionUrl} onClick={handleClick}>
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                notification.priority === 'urgent' && "bg-red-100",
                notification.priority === 'high' && "bg-orange-100",
                (notification.priority === 'normal' || !notification.priority) && "bg-blue-100",
                notification.priority === 'low' && "bg-gray-100"
              )}>
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "text-sm font-medium text-gray-900 truncate",
                        !notification.is_read && "font-semibold"
                      )}>
                        {notification.title}
                      </h3>
                      
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </div>

                    {notification.message && (
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(notification.created_at)}</span>
                      
                      {notification.priority && notification.priority !== 'normal' && (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            notification.priority === 'urgent' && "bg-red-100 text-red-800",
                            notification.priority === 'high' && "bg-orange-100 text-orange-800",
                            notification.priority === 'low' && "bg-gray-100 text-gray-600"
                          )}
                        >
                          {notification.priority}
                        </Badge>
                      )}
                      
                      {actionUrl && (
                        <ExternalLink className="w-3 h-3 text-blue-500" />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {showActions && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.is_read && onMarkAsRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMarkAsRead}
                          disabled={isActioning}
                          title="Mark as read"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDelete}
                          disabled={isActioning}
                          title="Delete notification"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div onClick={handleClick}>
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                notification.priority === 'urgent' && "bg-red-100",
                notification.priority === 'high' && "bg-orange-100",
                (notification.priority === 'normal' || !notification.priority) && "bg-blue-100",
                notification.priority === 'low' && "bg-gray-100"
              )}>
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "text-sm font-medium text-gray-900 truncate",
                        !notification.is_read && "font-semibold"
                      )}>
                        {notification.title}
                      </h3>
                      
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </div>

                    {notification.message && (
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(notification.created_at)}</span>
                      
                      {notification.priority && notification.priority !== 'normal' && (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            notification.priority === 'urgent' && "bg-red-100 text-red-800",
                            notification.priority === 'high' && "bg-orange-100 text-orange-800",
                            notification.priority === 'low' && "bg-gray-100 text-gray-600"
                          )}
                        >
                          {notification.priority}
                        </Badge>
                      )}
                      
                      {actionUrl && (
                        <ExternalLink className="w-3 h-3 text-blue-500" />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {showActions && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.is_read && onMarkAsRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMarkAsRead}
                          disabled={isActioning}
                          title="Mark as read"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDelete}
                          disabled={isActioning}
                          title="Delete notification"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Preset variants for common use cases
export function CompactNotificationItem(props: Omit<NotificationItemProps, 'variant'>) {
  return <NotificationItem {...props} variant="compact" />;
}

export function DetailedNotificationItem(props: Omit<NotificationItemProps, 'variant'>) {
  return <NotificationItem {...props} variant="detailed" />;
}

export default NotificationItem;
