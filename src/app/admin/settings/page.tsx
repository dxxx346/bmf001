'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Shield,
  Zap,
  Globe,
  Mail,
  Database,
  CreditCard,
  Users,
  Package,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { adminService, PlatformSettings } from '@/services/admin.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SettingsCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  settings: PlatformSettings[];
}

interface SettingValue {
  key: string;
  value: any;
  hasChanged: boolean;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [settings, setSettings] = useState<PlatformSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('general');
  const [changedSettings, setChangedSettings] = useState<Map<string, SettingValue>>(new Map());
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());

  // Check admin authorization
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Load settings data
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await adminService.getPlatformSettings();
      
      if (result) {
        setSettings(result);
      } else {
        // Mock data for demonstration
        const mockSettings: PlatformSettings[] = [
          // General Settings
          {
            id: '1',
            key: 'platform_name',
            value: 'Digital Marketplace',
            type: 'string',
            description: 'The name of your marketplace platform',
            category: 'general',
            is_public: true,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '2',
            key: 'platform_description',
            value: 'The best marketplace for digital products',
            type: 'string',
            description: 'Short description of your platform',
            category: 'general',
            is_public: true,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '3',
            key: 'support_email',
            value: 'support@marketplace.com',
            type: 'string',
            description: 'Email address for customer support',
            category: 'general',
            is_public: true,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '4',
            key: 'maintenance_mode',
            value: false,
            type: 'boolean',
            description: 'Enable maintenance mode to disable public access',
            category: 'general',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },

          // Payment Settings
          {
            id: '5',
            key: 'commission_rate',
            value: 5.0,
            type: 'number',
            description: 'Platform commission rate (percentage)',
            category: 'payments',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '6',
            key: 'minimum_payout',
            value: 10.0,
            type: 'number',
            description: 'Minimum amount for seller payouts',
            category: 'payments',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '7',
            key: 'stripe_public_key',
            value: 'pk_test_...',
            type: 'string',
            description: 'Stripe publishable key',
            category: 'payments',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '8',
            key: 'stripe_secret_key',
            value: 'sk_test_...',
            type: 'string',
            description: 'Stripe secret key (keep secure)',
            category: 'payments',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },

          // Security Settings
          {
            id: '9',
            key: 'require_email_verification',
            value: true,
            type: 'boolean',
            description: 'Require email verification for new accounts',
            category: 'security',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '10',
            key: 'max_login_attempts',
            value: 5,
            type: 'number',
            description: 'Maximum login attempts before account lockout',
            category: 'security',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '11',
            key: 'session_timeout',
            value: 24,
            type: 'number',
            description: 'Session timeout in hours',
            category: 'security',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },

          // Feature Settings
          {
            id: '12',
            key: 'enable_reviews',
            value: true,
            type: 'boolean',
            description: 'Allow customers to leave product reviews',
            category: 'features',
            is_public: true,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '13',
            key: 'enable_referrals',
            value: true,
            type: 'boolean',
            description: 'Enable referral/affiliate system',
            category: 'features',
            is_public: true,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '14',
            key: 'max_file_size',
            value: 100,
            type: 'number',
            description: 'Maximum file size for uploads (MB)',
            category: 'limits',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
          {
            id: '15',
            key: 'max_products_per_seller',
            value: 1000,
            type: 'number',
            description: 'Maximum number of products per seller',
            category: 'limits',
            is_public: false,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          },
        ];
        
        setSettings(mockSettings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user?.role === 'admin') {
      loadSettings();
    }
  }, [user, loadSettings]);

  // Handle setting value change
  const handleSettingChange = (key: string, value: any) => {
    const newChangedSettings = new Map(changedSettings);
    newChangedSettings.set(key, { key, value, hasChanged: true });
    setChangedSettings(newChangedSettings);
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!user || changedSettings.size === 0) return;

    setSaving(true);
    try {
      const promises = Array.from(changedSettings.values()).map(setting =>
        adminService.updatePlatformSetting(setting.key, setting.value, user.id)
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every(result => result);

      if (allSuccessful) {
        toast.success(`${changedSettings.size} settings updated successfully`);
        setChangedSettings(new Map());
        await loadSettings(); // Reload to get fresh data
      } else {
        toast.error('Some settings failed to update');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle secret visibility
  const toggleSecretVisibility = (key: string) => {
    const newShowSecrets = new Set(showSecrets);
    if (newShowSecrets.has(key)) {
      newShowSecrets.delete(key);
    } else {
      newShowSecrets.add(key);
    }
    setShowSecrets(newShowSecrets);
  };

  // Get setting value (either changed or original)
  const getSettingValue = (setting: PlatformSettings) => {
    const changed = changedSettings.get(setting.key);
    return changed ? changed.value : setting.value;
  };

  // Check if setting has changed
  const hasSettingChanged = (key: string) => {
    return changedSettings.has(key);
  };

  // Categories configuration
  const categories: SettingsCategory[] = [
    {
      id: 'general',
      name: 'General',
      description: 'Basic platform settings',
      icon: <Globe className="w-5 h-5" />,
      settings: settings.filter(s => s.category === 'general'),
    },
    {
      id: 'payments',
      name: 'Payments',
      description: 'Payment and commission settings',
      icon: <CreditCard className="w-5 h-5" />,
      settings: settings.filter(s => s.category === 'payments'),
    },
    {
      id: 'security',
      name: 'Security',
      description: 'Security and authentication settings',
      icon: <Shield className="w-5 h-5" />,
      settings: settings.filter(s => s.category === 'security'),
    },
    {
      id: 'features',
      name: 'Features',
      description: 'Platform features and functionality',
      icon: <Zap className="w-5 h-5" />,
      settings: settings.filter(s => s.category === 'features'),
    },
    {
      id: 'limits',
      name: 'Limits',
      description: 'Platform limits and restrictions',
      icon: <Database className="w-5 h-5" />,
      settings: settings.filter(s => s.category === 'limits'),
    },
  ];

  const activeSettings = categories.find(c => c.id === activeCategory)?.settings || [];

  const renderSettingInput = (setting: PlatformSettings) => {
    const value = getSettingValue(setting);
    const isSecret = setting.key.includes('secret') || setting.key.includes('private');
    const showSecret = showSecrets.has(setting.key);

    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value) || 0)}
            className="max-w-xs"
          />
        );

      case 'string':
        if (setting.description.toLowerCase().includes('email')) {
          return (
            <Input
              type="email"
              value={value}
              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
              className="max-w-md"
            />
          );
        }
        
        if (isSecret) {
          return (
            <div className="flex items-center gap-2 max-w-md">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={value}
                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSecretVisibility(setting.key)}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          );
        }
        
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="max-w-md"
          />
        );

      case 'json':
        return (
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleSettingChange(setting.key, parsed);
              } catch {
                handleSettingChange(setting.key, e.target.value);
              }
            }}
            rows={4}
            className="max-w-md font-mono text-sm"
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="max-w-md"
          />
        );
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (error && !settings.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorMessage title="Error Loading Settings" message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/dashboard')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
              <p className="text-gray-600 mt-1">
                Configure your marketplace platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {changedSettings.size > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {changedSettings.size} unsaved changes
              </Badge>
            )}
            
            <Button
              variant="outline"
              onClick={loadSettings}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button
              onClick={handleSaveSettings}
              disabled={saving || changedSettings.size === 0}
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Category Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                        activeCategory === category.id
                          ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {category.icon}
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-xs text-gray-500">{category.settings.length} settings</div>
                      </div>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {categories.find(c => c.id === activeCategory)?.icon}
                  {categories.find(c => c.id === activeCategory)?.name} Settings
                </CardTitle>
                <CardDescription>
                  {categories.find(c => c.id === activeCategory)?.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : activeSettings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No settings found in this category
                  </div>
                ) : (
                  activeSettings.map((setting, index) => (
                    <div key={setting.id}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium text-gray-900">
                                {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </label>
                              {hasSettingChanged(setting.key) && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                  Changed
                                </Badge>
                              )}
                              {!setting.is_public && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                                  Private
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {setting.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          {renderSettingInput(setting)}
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Last updated: {new Date(setting.updated_at).toLocaleString()} by {setting.updated_by}
                        </div>
                      </div>
                      
                      {index < activeSettings.length - 1 && (
                        <Separator className="mt-6" />
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
