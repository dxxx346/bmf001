'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { 
  NotificationPreference, 
  NotificationType, 
  NotificationChannel, 
  NotificationFrequency 
} from '@/types/notifications';
import { useAuth } from '@/hooks/useAuth';

interface NotificationPreferencesProps {
  className?: string;
}

interface PreferenceGroup {
  category: string;
  description: string;
  preferences: {
    type: NotificationType;
    label: string;
    description: string;
    channels: NotificationChannel[];
  }[];
}

const preferenceGroups: PreferenceGroup[] = [
  {
    category: 'Order & Payment',
    description: 'Notifications about your orders and payments',
    preferences: [
      {
        type: 'order_confirmation',
        label: 'Order Confirmation',
        description: 'When your order is confirmed',
        channels: ['email', 'in_app', 'push'],
      },
      {
        type: 'order_shipped',
        label: 'Order Shipped',
        description: 'When your order is shipped',
        channels: ['email', 'in_app', 'push', 'sms'],
      },
      {
        type: 'order_delivered',
        label: 'Order Delivered',
        description: 'When your order is delivered',
        channels: ['email', 'in_app', 'push'],
      },
      {
        type: 'payment_received',
        label: 'Payment Received',
        description: 'When your payment is processed',
        channels: ['email', 'in_app'],
      },
      {
        type: 'payment_failed',
        label: 'Payment Failed',
        description: 'When your payment fails',
        channels: ['email', 'in_app', 'sms'],
      },
    ],
  },
  {
    category: 'Products & Reviews',
    description: 'Notifications about products and reviews',
    preferences: [
      {
        type: 'product_purchased',
        label: 'Product Purchased',
        description: 'When you purchase a product',
        channels: ['email', 'in_app'],
      },
      {
        type: 'product_review',
        label: 'Product Reviews',
        description: 'When someone reviews your products',
        channels: ['email', 'in_app'],
      },
    ],
  },
  {
    category: 'Shop & Business',
    description: 'Notifications for shop owners and sellers',
    preferences: [
      {
        type: 'shop_approved',
        label: 'Shop Approved',
        description: 'When your shop is approved',
        channels: ['email', 'in_app'],
      },
      {
        type: 'shop_rejected',
        label: 'Shop Rejected',
        description: 'When your shop application is rejected',
        channels: ['email', 'in_app'],
      },
    ],
  },
  {
    category: 'Referrals & Rewards',
    description: 'Notifications about referral earnings',
    preferences: [
      {
        type: 'referral_earned',
        label: 'Referral Earned',
        description: 'When you earn from referrals',
        channels: ['email', 'in_app'],
      },
      {
        type: 'referral_payout',
        label: 'Referral Payout',
        description: 'When referral payouts are processed',
        channels: ['email', 'in_app'],
      },
    ],
  },
  {
    category: 'Account & Security',
    description: 'Important account and security notifications',
    preferences: [
      {
        type: 'account_created',
        label: 'Account Created',
        description: 'Welcome message for new accounts',
        channels: ['email'],
      },
      {
        type: 'account_verified',
        label: 'Account Verified',
        description: 'When your account is verified',
        channels: ['email', 'in_app'],
      },
      {
        type: 'password_reset',
        label: 'Password Reset',
        description: 'Password reset instructions',
        channels: ['email'],
      },
      {
        type: 'security_alert',
        label: 'Security Alerts',
        description: 'Important security notifications',
        channels: ['email', 'in_app', 'sms'],
      },
    ],
  },
  {
    category: 'System & Marketing',
    description: 'System updates and promotional content',
    preferences: [
      {
        type: 'system_maintenance',
        label: 'System Maintenance',
        description: 'Scheduled maintenance notifications',
        channels: ['email', 'in_app'],
      },
      {
        type: 'marketing_promotion',
        label: 'Promotions',
        description: 'Special offers and promotions',
        channels: ['email', 'in_app'],
      },
      {
        type: 'newsletter',
        label: 'Newsletter',
        description: 'Weekly newsletter and updates',
        channels: ['email'],
      },
    ],
  },
];

const channelLabels: Record<NotificationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  in_app: 'In-App',
  webhook: 'Webhook',
};

const frequencyOptions: { value: NotificationFrequency; label: string }[] = [
  { value: 'immediate', label: 'Immediately' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'never', label: 'Never' },
];

export default function NotificationPreferences({ className = '' }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  // Load preferences
  const loadPreferences = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${(user as any).access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      } else {
        setError('Failed to load preferences');
      }
    } catch (error) {
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  // Save preferences
  const savePreferences = async () => {
    if (!user || saving) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(user as any).access_token}`,
        },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Failed to save preferences');
      }
    } catch (error) {
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Get preference for type and channel
  const getPreference = (type: NotificationType, channel: NotificationChannel) => {
    return preferences.find(p => p.type === type && p.channel === channel);
  };

  // Update preference
  const updatePreference = (
    type: NotificationType,
    channel: NotificationChannel,
    isEnabled: boolean,
    frequency: NotificationFrequency = 'immediate'
  ) => {
    setPreferences(prev => {
      const existing = prev.find(p => p.type === type && p.channel === channel);
      
      if (existing) {
        return prev.map(p => 
          p.type === type && p.channel === channel
            ? { ...p, is_enabled: isEnabled, frequency }
            : p
        );
      } else {
        return [...prev, {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: user!.id,
          type,
          channel,
          is_enabled: isEnabled,
          frequency,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }];
      }
    });
  };

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [user]);

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Notification Preferences
        </h1>
        <p className="text-gray-600">
          Manage how and when you receive notifications from our platform.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Preferences saved successfully!</p>
        </div>
      )}

      <div className="space-y-8">
        {preferenceGroups.map((group) => (
          <div key={group.category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {group.category}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {group.description}
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {group.preferences.map((pref) => (
                <div key={pref.type} className="p-6">
                  <div className="mb-4">
                    <h3 className="text-md font-medium text-gray-900">
                      {pref.label}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {pref.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {pref.channels.map((channel) => {
                      const preference = getPreference(pref.type, channel);
                      const isEnabled = preference?.is_enabled ?? false;
                      const frequency = preference?.frequency ?? 'immediate';

                      return (
                        <div key={channel} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {channelLabels[channel]}
                            </span>
                            <button
                              role="switch"
                              aria-checked={isEnabled}
                              onClick={() => 
                                updatePreference(pref.type, channel, !isEnabled, frequency)
                              }
                              className={`${
                                isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                            >
                              <span
                                className={`${
                                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                              />
                            </button>
                          </div>

                          {isEnabled && channel === 'email' && (
                            <select
                              value={frequency}
                              onChange={(e) => 
                                updatePreference(
                                  pref.type, 
                                  channel, 
                                  true, 
                                  e.target.value as NotificationFrequency
                                )
                              }
                              className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              {frequencyOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              // Enable all email notifications
              preferenceGroups.forEach(group => {
                group.preferences.forEach(pref => {
                  if (pref.channels.includes('email')) {
                    updatePreference(pref.type, 'email', true);
                  }
                });
              });
            }}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Enable All Email
          </button>
          <button
            onClick={() => {
              // Disable all marketing notifications
              ['marketing_promotion', 'newsletter'].forEach(type => {
                ['email', 'in_app'].forEach(channel => {
                  updatePreference(type as NotificationType, channel as NotificationChannel, false);
                });
              });
            }}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Disable Marketing
          </button>
          <button
            onClick={() => {
              // Enable critical notifications only
              setPreferences([]);
              ['security_alert', 'payment_failed', 'order_confirmation'].forEach(type => {
                ['email', 'in_app'].forEach(channel => {
                  updatePreference(type as NotificationType, channel as NotificationChannel, true);
                });
              });
            }}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Critical Only
          </button>
        </div>
      </div>
    </div>
  );
}
