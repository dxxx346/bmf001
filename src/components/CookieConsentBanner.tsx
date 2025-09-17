'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Shield, Eye, BarChart, Zap } from 'lucide-react';

interface CookieCategory {
  id: number;
  category: string;
  name: string;
  description: string;
  is_essential: boolean;
  is_enabled_by_default: boolean;
  cookies: Array<{
    id: number;
    name: string;
    purpose: string;
    duration: string;
    provider: string;
  }>;
}

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  performance: boolean;
}

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: true,
    analytics: false,
    marketing: false,
    performance: false,
  });
  const [loading, setLoading] = useState(false);

  // Check if consent has already been given
  useEffect(() => {
    const checkConsent = () => {
      const consentCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('cookie_consent='));
      
      if (!consentCookie) {
        setIsVisible(true);
        fetchCookieCategories();
      }
    };

    checkConsent();
  }, []);

  const fetchCookieCategories = async () => {
    try {
      const response = await fetch('/api/privacy/cookies');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        
        // Set default preferences based on categories
        const defaultPrefs: any = {};
        data.categories.forEach((cat: CookieCategory) => {
          defaultPrefs[cat.category] = cat.is_essential || cat.is_enabled_by_default;
        });
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Failed to fetch cookie categories:', error);
    }
  };

  const handleAcceptAll = async () => {
    const allAccepted: any = {};
    categories.forEach(cat => {
      allAccepted[cat.category] = true;
    });
    
    await savePreferences(allAccepted);
  };

  const handleAcceptSelected = async () => {
    await savePreferences(preferences);
  };

  const handleRejectAll = async () => {
    const essentialOnly: any = {};
    categories.forEach(cat => {
      essentialOnly[cat.category] = cat.is_essential;
    });
    
    await savePreferences(essentialOnly);
  };

  const savePreferences = async (prefs: any) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/privacy/cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: prefs }),
      });

      if (response.ok) {
        setIsVisible(false);
        
        // Apply preferences to analytics and other services
        applyPreferences(prefs);
        
        // Show toast notification
        showToast('Cookie preferences saved successfully');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save cookie preferences:', error);
      showToast('Failed to save preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyPreferences = (prefs: any) => {
    // Apply analytics preferences
    if (prefs.analytics) {
      // Enable analytics tracking
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'granted',
        });
      }
    } else {
      // Disable analytics tracking
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'denied',
        });
      }
    }

    // Apply marketing preferences
    if (prefs.marketing) {
      // Enable marketing cookies
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
        });
      }
    } else {
      // Disable marketing cookies
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
      }
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Simple toast implementation - you can replace with your preferred toast library
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  const toggleCategory = (category: string) => {
    // Don't allow disabling essential cookies
    const categoryData = categories.find(cat => cat.category === category);
    if (categoryData?.is_essential) return;
    
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category as keyof CookiePreferences],
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'essential':
        return <Shield className="w-5 h-5" />;
      case 'functional':
        return <Settings className="w-5 h-5" />;
      case 'analytics':
        return <BarChart className="w-5 h-5" />;
      case 'marketing':
        return <Eye className="w-5 h-5" />;
      case 'performance':
        return <Zap className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              🍪 Cookie Preferences
            </h2>
            <p className="text-sm text-gray-600">
              We use cookies to enhance your experience and analyze our traffic.
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showDetails ? (
            /* Simple view */
            <div className="space-y-4">
              <p className="text-gray-700">
                We respect your privacy and give you control over your data. You can accept all cookies,
                customize your preferences, or reject non-essential cookies.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAcceptAll}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Accept All
                </button>
                
                <button
                  onClick={handleRejectAll}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Reject All
                </button>
                
                <button
                  onClick={() => setShowDetails(true)}
                  className="px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                >
                  Customize
                </button>
              </div>
            </div>
          ) : (
            /* Detailed view */
            <div className="space-y-6">
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(category.category)}
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {category.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {category.is_essential && (
                          <span className="text-xs text-gray-500 mr-2">Required</span>
                        )}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences[category.category as keyof CookiePreferences]}
                            onChange={() => toggleCategory(category.category)}
                            disabled={category.is_essential}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                    
                    {/* Cookie details */}
                    {category.cookies && category.cookies.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Cookies used:</h4>
                        <div className="space-y-1">
                          {category.cookies.map((cookie) => (
                            <div key={cookie.id} className="text-xs text-gray-600 flex justify-between">
                              <span className="font-medium">{cookie.name}</span>
                              <span>{cookie.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <button
                  onClick={handleAcceptSelected}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
                
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-600">
            You can change your preferences at any time in your{' '}
            <a href="/privacy-settings" className="text-blue-600 hover:underline">
              privacy settings
            </a>
            . For more information, see our{' '}
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/cookie-policy" className="text-blue-600 hover:underline">
              Cookie Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
