import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analytics.service';
import { AnalyticsMiddleware } from '@/middleware/analytics.middleware';
import { z } from 'zod';

const TrackEventSchema = z.object({
  event_type: z.string(),
  session_id: z.string(),
  user_id: z.string().optional(),
  data: z.record(z.string(), z.any())
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, session_id, user_id, data } = TrackEventSchema.parse(body);

    const context = {
      sessionId: session_id,
      userId: user_id,
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 undefined,
      utm: extractUTMParams(request.url)
    };

    // Track different event types
    switch (event_type) {
      case 'page_view':
        await AnalyticsMiddleware.trackPageView(request, context, data as any);
        break;
      
      case 'product_view':
        await AnalyticsMiddleware.trackProductView(request, context, data as any);
        break;
      
      case 'cart_event':
        await AnalyticsMiddleware.trackCartEvent(request, context, data as any);
        break;
      
      case 'purchase':
        await AnalyticsMiddleware.trackPurchase(request, context, data as any);
        break;
      
      case 'referral_event':
        await AnalyticsMiddleware.trackReferralEvent(request, context, data as any);
        break;
      
      case 'search':
        await AnalyticsMiddleware.trackSearch(request, context, data as any);
        break;
      
      case 'click':
        await AnalyticsMiddleware.trackCustomEvent(request, context, {
          eventType: 'click',
          properties: data
        });
        break;
      
      case 'conversion':
        await AnalyticsMiddleware.trackCustomEvent(request, context, {
          eventType: 'conversion',
          properties: data
        });
        break;
      
      case 'custom_event':
        await AnalyticsMiddleware.trackCustomEvent(request, context, {
          eventType: data.event_type || 'custom',
          properties: data.properties || data
        });
        break;
      
      default:
        await AnalyticsMiddleware.trackCustomEvent(request, context, {
          eventType: event_type,
          properties: data
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

function extractUTMParams(url: string): Record<string, string> | undefined {
  try {
    const urlObj = new URL(url);
    const utm: Record<string, string> = {};
    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    
    utmParams.forEach(param => {
      const value = urlObj.searchParams.get(param);
      if (value) {
        utm[param] = value;
      }
    });

    return Object.keys(utm).length > 0 ? utm : undefined;
  } catch {
    return undefined;
  }
}
