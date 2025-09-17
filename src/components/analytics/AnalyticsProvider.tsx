'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
const nanoid = (() => { try { return require('nanoid/non-secure').nanoid } catch { return () => Math.random().toString(36).slice(2) } })();

interface AnalyticsContextType {
  sessionId: string;
  trackPageView: (data: PageViewData) => void;
  trackProductView: (data: ProductViewData) => void;
  trackCartEvent: (data: CartEventData) => void;
  trackPurchase: (data: PurchaseData) => void;
  trackReferralEvent: (data: ReferralEventData) => void;
  trackCustomEvent: (data: CustomEventData) => void;
  trackSearch: (data: SearchData) => void;
  trackClick: (data: ClickData) => void;
  trackConversion: (data: ConversionData) => void;
  getABTestVariant: (testId: string) => Promise<string | null>;
  trackABTestConversion: (testId: string, goalId: string, value?: number) => void;
}

interface PageViewData {
  pageUrl: string;
  pageTitle: string;
  pagePath: string;
  referrer?: string;
  loadTime?: number;
  viewportWidth: number;
  viewportHeight: number;
}

interface ProductViewData {
  productId: string;
  shopId: string;
  categoryId?: number;
  price: number;
  currency: string;
  viewDuration?: number;
  scrollDepth?: number;
}

interface CartEventData {
  eventType: 'cart_add' | 'cart_remove' | 'cart_abandon';
  productId: string;
  quantity: number;
  price: number;
  currency: string;
  cartValue: number;
  cartItemsCount: number;
}

interface PurchaseData {
  orderId: string;
  productId: string;
  shopId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  discountCode?: string;
  referralCode?: string;
}

interface ReferralEventData {
  eventType: 'referral_click' | 'referral_conversion';
  referralId: string;
  referrerId: string;
  productId?: string;
  shopId?: string;
  referralCode: string;
  commissionRate: number;
  conversionValue?: number;
}

interface CustomEventData {
  eventType: string;
  properties: Record<string, any>;
}

interface SearchData {
  query: string;
  resultsCount: number;
  filters?: Record<string, any>;
}

interface ClickData {
  elementId?: string;
  elementClass?: string;
  elementText?: string;
  elementType: string;
  pageUrl: string;
  positionX: number;
  positionY: number;
}

interface ConversionData {
  conversionType: 'purchase' | 'signup' | 'download' | 'subscription';
  conversionValue?: number;
  currency?: string;
  productId?: string;
  funnelStage: string;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize session ID
  useEffect(() => {
    const initializeSession = () => {
      // Try to get session ID from localStorage
      let storedSessionId = localStorage.getItem('analytics_session_id') || nanoid();
      
      if (!localStorage.getItem('analytics_session_id')) {
        localStorage.setItem('analytics_session_id', storedSessionId);
      }
      
      setSessionId(storedSessionId);
      setIsInitialized(true);
    };

    initializeSession();
  }, []);

  // Track page view on route change
  useEffect(() => {
    if (!isInitialized) return;

    const trackPageView = () => {
      const pageData: PageViewData = {
        pageUrl: window.location.href,
        pageTitle: document.title,
        pagePath: window.location.pathname,
        referrer: document.referrer || undefined,
        loadTime: performance.now(),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };

      sendAnalyticsEvent('page_view', pageData);
    };

    // Track initial page view
    trackPageView();

    // Track page views on navigation (for SPA)
    const handleRouteChange = () => {
      setTimeout(trackPageView, 100); // Small delay to ensure page is loaded
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [isInitialized]);

  // Send analytics event to API
  const sendAnalyticsEvent = useCallback(async (eventType: string, data: any) => {
    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: eventType,
          session_id: sessionId,
          user_id: user?.id,
          data
        }),
      });

      if (!response.ok) {
        console.error('Failed to send analytics event:', response.statusText);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, [sessionId, user?.id]);

  // Track page view
  const trackPageView = useCallback((data: PageViewData) => {
    sendAnalyticsEvent('page_view', data);
  }, [sendAnalyticsEvent]);

  // Track product view
  const trackProductView = useCallback((data: ProductViewData) => {
    sendAnalyticsEvent('product_view', data);
  }, [sendAnalyticsEvent]);

  // Track cart events
  const trackCartEvent = useCallback((data: CartEventData) => {
    sendAnalyticsEvent('cart_event', data);
  }, [sendAnalyticsEvent]);

  // Track purchase
  const trackPurchase = useCallback((data: PurchaseData) => {
    sendAnalyticsEvent('purchase', data);
  }, [sendAnalyticsEvent]);

  // Track referral events
  const trackReferralEvent = useCallback((data: ReferralEventData) => {
    sendAnalyticsEvent('referral_event', data);
  }, [sendAnalyticsEvent]);

  // Track custom events
  const trackCustomEvent = useCallback((data: CustomEventData) => {
    sendAnalyticsEvent('custom_event', data);
  }, [sendAnalyticsEvent]);

  // Track search
  const trackSearch = useCallback((data: SearchData) => {
    sendAnalyticsEvent('search', data);
  }, [sendAnalyticsEvent]);

  // Track clicks
  const trackClick = useCallback((data: ClickData) => {
    sendAnalyticsEvent('click', data);
  }, [sendAnalyticsEvent]);

  // Track conversions
  const trackConversion = useCallback((data: ConversionData) => {
    sendAnalyticsEvent('conversion', data);
  }, [sendAnalyticsEvent]);

  // Get A/B test variant
  const getABTestVariant = useCallback(async (testId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/analytics/ab-test/${testId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: user?.id
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.variant_id || null;
    } catch (error) {
      console.error('Failed to get A/B test variant:', error);
      return null;
    }
  }, [sessionId, user?.id]);

  // Track A/B test conversion
  const trackABTestConversion = useCallback((testId: string, goalId: string, value?: number) => {
    sendAnalyticsEvent('ab_test_conversion', {
      test_id: testId,
      goal_id: goalId,
      conversion_value: value
    });
  }, [sendAnalyticsEvent]);

  const value: AnalyticsContextType = {
    sessionId,
    trackPageView,
    trackProductView,
    trackCartEvent,
    trackPurchase,
    trackReferralEvent,
    trackCustomEvent,
    trackSearch,
    trackClick,
    trackConversion,
    getABTestVariant,
    trackABTestConversion
  };

  if (!isInitialized) {
    return <div>Loading analytics...</div>;
  }

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}
