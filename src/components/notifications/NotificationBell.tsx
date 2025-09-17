'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { useAuthContext } from '@/contexts/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  maxBadgeCount?: number;
  onClick?: () => void;
  variant?: 'icon' | 'button';
}

export function NotificationBell({
  className,
  size = 'md',
  showBadge = true,
  maxBadgeCount = 99,
  onClick,
  variant = 'icon'
}: NotificationBellProps) {
  const { user } = useAuthContext();
  const { unreadCount, recentNotifications, loading } = useUnreadNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const prevUnreadCount = useRef(unreadCount);

  // Animate bell when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      setHasNewNotifications(true);
      const timer = setTimeout(() => setHasNewNotifications(false), 2000);
      return () => clearTimeout(timer);
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const formatBadgeCount = (count: number) => {
    if (count === 0) return '';
    if (count > maxBadgeCount) return `${maxBadgeCount}+`;
    return count.toString();
  };

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  const BellIcon = hasNewNotifications ? BellRing : Bell;
  const badgeCount = formatBadgeCount(unreadCount);

  if (variant === 'button') {
    return (
      <div ref={bellRef} className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className={cn(
            buttonSizeClasses[size],
            "relative",
            hasNewNotifications && "animate-pulse",
            className
          )}
          title={`${unreadCount} unread notifications`}
          disabled={loading}
        >
          <BellIcon className={cn(
            sizeClasses[size],
            hasNewNotifications && "animate-bounce",
            unreadCount > 0 ? "text-blue-600" : "text-gray-600"
          )} />
          
          {showBadge && unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full"
            >
              {badgeCount}
            </Badge>
          )}
        </Button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 z-50">
            <NotificationDropdown
              notifications={recentNotifications}
              unreadCount={unreadCount}
              onClose={() => setIsOpen(false)}
              onMarkAsRead={async (id) => console.log('Mark as read:', id)}
              onViewAll={() => {
                setIsOpen(false);
                // Navigate to notifications page
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={handleClick}
        className={cn(
          "relative p-2 text-gray-600 hover:text-gray-900 transition-colors",
          hasNewNotifications && "animate-pulse",
          className
        )}
        title={`${unreadCount} unread notifications`}
        disabled={loading}
      >
        <BellIcon className={cn(
          sizeClasses[size],
          hasNewNotifications && "animate-bounce",
          unreadCount > 0 ? "text-blue-600" : "text-gray-600"
        )} />
        
        {showBadge && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full">
            {badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50">
          <NotificationDropdown
            notifications={recentNotifications}
            unreadCount={unreadCount}
            onClose={() => setIsOpen(false)}
            onMarkAsRead={async (id) => console.log('Mark as read:', id)}
            onViewAll={() => {
              setIsOpen(false);
              // Navigate to notifications page
            }}
          />
        </div>
      )}
    </div>
  );
}

// Preset variants
export function HeaderNotificationBell(props: Omit<NotificationBellProps, 'variant' | 'size'>) {
  return (
    <NotificationBell
      {...props}
      variant="icon"
      size="md"
    />
  );
}

export function MobileNotificationBell(props: Omit<NotificationBellProps, 'variant' | 'size'>) {
  return (
    <NotificationBell
      {...props}
      variant="button"
      size="sm"
    />
  );
}

export default NotificationBell;
