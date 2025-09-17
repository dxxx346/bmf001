import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analytics.service';
import { abTestingService } from '@/services/ab-testing.service';
const nanoid = (() => { try { return require('nanoid/non-secure').nanoid } catch { return () => Math.random().toString(36).slice(2) } })();
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { EventType } from '@/types/analytics';

interface AnalyticsContext {
  sessionId: string;
  userId?: string;
  userAgent: string;
  ipAddress?: string;
  utm?: Record<string, string>;
}

export class AnalyticsMiddleware {
  /**
   * Track page view
   */
  static async trackPageView(
    request: NextRequest,
    context: AnalyticsContext,
    additionalData?: {
      pageTitle?: string;
      loadTime?: number;
      viewportWidth?: number;
      viewportHeight?: number;
    }
  ): Promise<void> {
    try {
      const url = new URL(request.url);
      const referrer = request.headers.get('referer') || undefined;
      
      await analyticsService.trackPageView(
        url.toString(),
        additionalData?.pageTitle || '',
        context.userId,
        context.sessionId,
        {
          pagePath: url.pathname,
          referrer,
          loadTime: additionalData?.loadTime,
          viewportWidth: additionalData?.viewportWidth || 1920,
          viewportHeight: additionalData?.viewportHeight || 1080,
          userAgent: context.userAgent,
          ipAddress: context.ipAddress,
          utm: context.utm
        }
      );
    } catch (error) {
      logError(error as Error, { url: request.url });
    }
  }

  /**
   * Track product view
   */
  static async trackProductView(
    request: NextRequest,
    context: AnalyticsContext,
    productData: {
      productId: string;
      shopId: string;
      categoryId?: number;
      price: number;
      currency: string;
      viewDuration?: number;
      scrollDepth?: number;
    }
  ): Promise<void> {
    try {
      await analyticsService.trackProductView(
        productData.productId,
        '', // productName - not available in the interface
        productData.categoryId?.toString() || '', // category
        productData.price,
        context.userId,
        context.sessionId
      );
    } catch (error) {
      logError(error as Error, { productId: productData.productId });
    }
  }

  /**
   * Track cart events
   */
  static async trackCartEvent(
    request: NextRequest,
    context: AnalyticsContext,
    cartData: {
      eventType: 'cart_add' | 'cart_remove' | 'cart_abandon';
      productId: string;
      quantity: number;
      price: number;
      currency: string;
      cartValue: number;
      cartItemsCount: number;
    }
  ): Promise<void> {
    try {
      if (cartData.eventType === 'cart_add') {
        await analyticsService.trackAddToCart(
          cartData.productId,
          cartData.quantity,
          cartData.price,
          context.userId,
          context.sessionId
        );
      } else {
        // For cart_remove and cart_abandon, use custom event tracking
        await analyticsService.trackEvent(
          cartData.eventType as EventType,
          {
            product_id: cartData.productId,
            quantity: cartData.quantity,
            price: cartData.price,
            currency: cartData.currency,
            cart_value: cartData.cartValue,
            cart_items_count: cartData.cartItemsCount,
            user_id: context.userId,
            session_id: context.sessionId
          }
        );
      }
    } catch (error) {
      logError(error as Error, { eventType: cartData.eventType });
    }
  }

  /**
   * Track purchase
   */
  static async trackPurchase(
    request: NextRequest,
    context: AnalyticsContext,
    purchaseData: {
      orderId: string;
      productId: string;
      shopId: string;
      amount: number;
      currency: string;
      paymentMethod: string;
      discountCode?: string;
      referralCode?: string;
    }
  ): Promise<void> {
    try {
      await analyticsService.trackPurchase(
        purchaseData.orderId,
        [purchaseData.productId], // productIds array
        purchaseData.amount,
        purchaseData.currency,
        context.userId!,
        context.sessionId
      );
    } catch (error) {
      logError(error as Error, { orderId: purchaseData.orderId });
    }
  }

  /**
   * Track referral events
   */
  static async trackReferralEvent(
    request: NextRequest,
    context: AnalyticsContext,
    referralData: {
      eventType: 'referral_click' | 'referral_conversion';
      referralId: string;
      referrerId: string;
      productId?: string;
      shopId?: string;
      referralCode: string;
      commissionRate: number;
      conversionValue?: number;
    }
  ): Promise<void> {
    try {
      await analyticsService.trackEvent(
        referralData.eventType as EventType,
        {
          referral_id: referralData.referralId,
          referrer_id: referralData.referrerId,
          product_id: referralData.productId,
          shop_id: referralData.shopId,
          referral_code: referralData.referralCode,
          commission_rate: referralData.commissionRate,
          conversion_value: referralData.conversionValue,
          user_id: context.userId,
          session_id: context.sessionId
        }
      );
    } catch (error) {
      logError(error as Error, { referralId: referralData.referralId });
    }
  }

  /**
   * Handle A/B test assignment
   */
  static async handleABTestAssignment(
    request: NextRequest,
    context: AnalyticsContext,
    testId: string
  ): Promise<string | null> {
    try {
      if (!context.userId) {
        return null; // Only assign logged-in users
      }

      const assignment = await abTestingService.assignVariant(
        testId,
        context.userId
      );

      return assignment?.id || null;
    } catch (error) {
      logError(error as Error, { testId });
      return null;
    }
  }

  /**
   * Track A/B test conversion
   */
  static async trackABTestConversion(
    request: NextRequest,
    context: AnalyticsContext,
    testId: string,
    goalId: string,
    conversionValue?: number
  ): Promise<void> {
    try {
      if (!context.userId) {
        return; // Only track for logged-in users
      }

      await abTestingService.trackConversion(testId, context.userId, goalId, conversionValue);
    } catch (error) {
      logError(error as Error, { testId, goalId });
    }
  }

  /**
   * Extract analytics context from request
   */
  static extractContext(request: NextRequest, userId?: string): AnalyticsContext {
    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Extract UTM parameters from URL
    const url = new URL(request.url);
    const utm: Record<string, string> = {};
    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    
    utmParams.forEach(param => {
      const value = url.searchParams.get(param);
      if (value) {
        utm[param] = value;
      }
    });

    return {
      sessionId: this.getOrCreateSessionId(request),
      userId,
      userAgent,
      ipAddress: ipAddress === 'unknown' ? undefined : ipAddress,
      utm: Object.keys(utm).length > 0 ? utm : undefined
    };
  }

  /**
   * Get or create session ID
   */
  private static getOrCreateSessionId(request: NextRequest): string {
    // Try to get session ID from cookie
    const sessionCookie = request.cookies.get('analytics_session_id');
    if (sessionCookie?.value) {
      return sessionCookie.value;
    }

    // Create new session ID
    const sessionId = nanoid();
    
    // Set cookie in response (this will be handled by the calling code)
    return sessionId;
  }

  /**
   * Set session cookie
   */
  static setSessionCookie(response: NextResponse, sessionId: string): void {
    response.cookies.set('analytics_session_id', sessionId, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }

  /**
   * Track custom event
   */
  static async trackCustomEvent(
    request: NextRequest,
    context: AnalyticsContext,
    eventData: {
      eventType: string;
      properties: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await analyticsService.trackEvent(
        'custom' as EventType,
        {
          custom_event_type: eventData.eventType,
          ...eventData.properties,
          user_id: context.userId,
          session_id: context.sessionId
        },
        {
          page_url: request.url,
          page_title: '',
          referrer: request.headers.get('referer') || undefined,
          user_agent: context.userAgent,
          ip_address: context.ipAddress,
          device_type: this.parseUserAgent(context.userAgent).type as any,
          browser: this.parseUserAgent(context.userAgent).browser as any,
          os: this.parseUserAgent(context.userAgent).os as any,
          utm_source: context.utm?.utm_source,
          utm_medium: context.utm?.utm_medium,
          utm_campaign: context.utm?.utm_campaign,
          utm_term: context.utm?.utm_term,
          utm_content: context.utm?.utm_content
        }
      );
    } catch (error) {
      logError(error as Error, { eventType: eventData.eventType });
    }
  }

  /**
   * Parse user agent to extract device info
   */
  private static parseUserAgent(userAgent: string): {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  } {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Tablet/.test(userAgent);
    
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';
    
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    return { type: deviceType, os, browser };
  }

  /**
   * Track search queries
   */
  static async trackSearch(
    request: NextRequest,
    context: AnalyticsContext,
    searchData: {
      query: string;
      resultsCount: number;
      filters?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await this.trackCustomEvent(request, context, {
        eventType: 'search',
        properties: {
          search_query: searchData.query,
          results_count: searchData.resultsCount,
          filters: searchData.filters
        }
      });
    } catch (error) {
      logError(error as Error, { query: searchData.query });
    }
  }

  /**
   * Track user registration
   */
  static async trackRegistration(
    request: NextRequest,
    context: AnalyticsContext,
    registrationData: {
      method: 'email' | 'oauth' | 'phone';
      source?: string;
    }
  ): Promise<void> {
    try {
      await this.trackCustomEvent(request, context, {
        eventType: 'user_registration',
        properties: {
          registration_method: registrationData.method,
          source: registrationData.source
        }
      });
    } catch (error) {
      logError(error as Error, { method: registrationData.method });
    }
  }

  /**
   * Track user login
   */
  static async trackLogin(
    request: NextRequest,
    context: AnalyticsContext,
    loginData: {
      method: 'email' | 'oauth' | 'phone';
      isFirstLogin?: boolean;
    }
  ): Promise<void> {
    try {
      await this.trackCustomEvent(request, context, {
        eventType: 'user_login',
        properties: {
          login_method: loginData.method,
          is_first_login: loginData.isFirstLogin
        }
      });
    } catch (error) {
      logError(error as Error, { method: loginData.method });
    }
  }
}
