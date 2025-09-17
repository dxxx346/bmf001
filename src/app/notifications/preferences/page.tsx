'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Globe,
  Save,
  RefreshCw,
  Shield,
  Package,
  CreditCard,
  Star,
  Gift,
  AlertCircle,
  Info,
  Users
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotificationPreferences } from '@/hooks/useNotifications';
import { NotificationType, NotificationChannel } from '@/types/notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  types: {
    type: NotificationType;
    name: string;
    description: string;
    defaultChannels: NotificationChannel[];
  }[];
}

const notificationCategories: NotificationCategory[] = [
  {
    id: 'orders',
    name: 'Orders & Purchases',
    description: 'Updates about your orders and purchases',
    icon: <Package className="w-5 h-5" />,
    types: [
      {
        type: 'order_confirmation',
        name: 'Order Confirmation',
        description: 'When you place an order',
        defaultChannels: ['email', 'in_app'],
      },
      {
        type: 'order_shipped',
        name: 'Order Shipped',
        description: 'When your order is shipped',
        defaultChannels: ['email', 'push'],
      },
      {
        type: 'order_delivered',
        name: 'Order Delivered',
        description: 'When your order is delivered',
        defaultChannels: ['email', 'push'],
      },
      {
        type: 'product_purchased',
        name: 'Product Sold',
        description: 'When someone buys your product',
        defaultChannels: ['email', 'push'],
      },
    ],
  },
  {
    id: 'payments',
    name: 'Payments & Billing',
    description: 'Payment confirmations and billing updates',
    icon: <CreditCard className="w-5 h-5" />,
    types: [
      {
        type: 'payment_received',
        name: 'Payment Received',
        description: 'When you receive a payment',
        defaultChannels: ['email', 'push'],
      },
      {
        type: 'payment_failed',
        name: 'Payment Failed',
        description: 'When a payment fails',
        defaultChannels: ['email', 'push'],
      },
      {
        type: 'referral_payout',
        name: 'Referral Payout',
        description: 'When you receive referral earnings',
        defaultChannels: ['email', 'push'],
      },
    ],
  },
  {
    id: 'social',
    name: 'Reviews & Social',
    description: 'Reviews, ratings, and social interactions',
    icon: <Star className="w-5 h-5" />,
    types: [
      {
        type: 'product_review',
        name: 'New Review',
        description: 'When someone reviews your product',
        defaultChannels: ['email', 'in_app'],
      },
      {
        type: 'referral_earned',
        name: 'Referral Earned',
        description: 'When you earn from referrals',
        defaultChannels: ['email', 'push'],
      },
    ],
  },
  {
    id: 'account',
    name: 'Account & Security',
    description: 'Account updates and security alerts',
    icon: <Shield className="w-5 h-5" />,
    types: [
      {
        type: 'account_created',
        name: 'Account Created',
        description: 'Welcome message for new accounts',
        defaultChannels: ['email'],
      },
      {
        type: 'account_verified',
        name: 'Account Verified',
        description: 'When your account is verified',
        defaultChannels: ['email', 'in_app'],
      },
      {
        type: 'password_reset',
        name: 'Password Reset',
        description: 'Password reset confirmations',
        defaultChannels: ['email'],
      },
      {
        type: 'security_alert',
        name: 'Security Alert',
        description: 'Important security notifications',
        defaultChannels: ['email', 'push'],
      },
    ],
  },
  {
    id: 'system',
    name: 'System & Marketing',
    description: 'System updates and promotional content',
    icon: <Info className="w-5 h-5" />,
    types: [
      {
        type: 'system_maintenance',
        name: 'System Maintenance',
        description: 'Scheduled maintenance notifications',
        defaultChannels: ['email', 'in_app'],
      },
      {
        type: 'marketing_promotion',
        name: 'Promotions',
        description: 'Special offers and promotions',
        defaultChannels: ['email'],
      },
      {
        type: 'newsletter',
        name: 'Newsletter',
        description: 'Platform newsletters and updates',
        defaultChannels: ['email'],
      },
    ],
  },
];

const channelIcons: Record<NotificationChannel, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  sms: <Smartphone className="w-4 h-4" />,
  push: <Bell className="w-4 h-4" />,
  in_app: <Globe className="w-4 h-4" />,
  webhook: <Globe className="w-4 h-4" />,
};

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  
  const [localPreferences, setLocalPreferences] = useState<Record<string, Record<NotificationChannel, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router]);

  // Initialize local preferences
  useEffect(() => {
    const initialPrefs: Record<string, Record<NotificationChannel, boolean>> = {};
    
    notificationCategories.forEach(category => {
      category.types.forEach(typeConfig => {
        initialPrefs[typeConfig.type] = {
          email: typeConfig.defaultChannels.includes('email'),
          sms: typeConfig.defaultChannels.includes('sms'),
          push: typeConfig.defaultChannels.includes('push'),
          in_app: typeConfig.defaultChannels.includes('in_app'),
          webhook: false,
        };
      });
    });

    setLocalPreferences(initialPrefs);
  }, []);

  const handlePreferenceChange = (
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean
  ) => {
    setLocalPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: enabled,
      },
    }));
    setHasChanges(true);
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      // Convert to format expected by the hook
      const preferencesArray = Object.entries(localPreferences).map(([type, channels]) => ({
        type: type as NotificationType,
        ...channels,
      }));

      const success = await updatePreferences(preferencesArray);
      if (success) {
        setHasChanges(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    const defaultPrefs: Record<string, Record<NotificationChannel, boolean>> = {};
    
    notificationCategories.forEach(category => {
      category.types.forEach(typeConfig => {
        defaultPrefs[typeConfig.type] = {
          email: typeConfig.defaultChannels.includes('email'),
          sms: typeConfig.defaultChannels.includes('sms'),
          push: typeConfig.defaultChannels.includes('push'),
          in_app: typeConfig.defaultChannels.includes('in_app'),
          webhook: false,
        };
      });
    });

    setLocalPreferences(defaultPrefs);
    setHasChanges(true);
    toast.success('Reset to default preferences');
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/notifications')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
              <p className="text-gray-600 mt-1">
                Customize how and when you receive notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Unsaved changes
              </Badge>
            )}
            
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
            >
              Reset to Defaults
            </Button>
            
            <Button
              onClick={handleSavePreferences}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {notificationCategories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category.icon}
                  {category.name}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {category.types.map((typeConfig, index) => (
                  <div key={typeConfig.type}>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {typeConfig.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {typeConfig.description}
                        </p>
                      </div>

                      {/* Channel Toggles */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(['email', 'push', 'sms', 'in_app'] as NotificationChannel[]).map((channel) => {
                          const isEnabled = localPreferences[typeConfig.type]?.[channel] || false;
                          const isAvailable = channel !== 'sms'; // SMS might not be available
                          
                          return (
                            <div
                              key={channel}
                              className={cn(
                                "flex items-center gap-2 p-3 border rounded-lg transition-colors",
                                isEnabled && isAvailable ? "border-blue-500 bg-blue-50" : "border-gray-200",
                                !isAvailable && "opacity-50"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => handlePreferenceChange(
                                  typeConfig.type,
                                  channel,
                                  e.target.checked
                                )}
                                disabled={!isAvailable}
                                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex items-center gap-2">
                                {channelIcons[channel]}
                                <span className="text-sm font-medium capitalize">
                                  {channel.replace('_', ' ')}
                                </span>
                              </div>
                              {!isAvailable && (
                                <span className="text-xs text-gray-500 ml-auto">
                                  Coming soon
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {index < category.types.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Settings */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Additional notification and privacy settings
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Email Notifications
                </h4>
                <p className="text-sm text-gray-600">
                  Receive notifications via email
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Push Notifications
                </h4>
                <p className="text-sm text-gray-600">
                  Receive push notifications in your browser
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Marketing Communications
                </h4>
                <p className="text-sm text-gray-600">
                  Receive promotional emails and special offers
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={false}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Digest Mode
                </h4>
                <p className="text-sm text-gray-600">
                  Receive a daily summary instead of individual notifications
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={false}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">About Notification Preferences</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Changes take effect immediately after saving</li>
                  <li>• Critical security alerts cannot be disabled</li>
                  <li>• You can unsubscribe from emails using the link in any email</li>
                  <li>• Push notifications require browser permission</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
