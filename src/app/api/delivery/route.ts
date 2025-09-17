import { NextRequest, NextResponse } from 'next/server';
import { deliveryService } from '@/services/delivery.service';
import { createServerClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, options = {} } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get user from session
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Generate download URL
    const result = await deliveryService.generateDownloadUrl(
      user.id,
      productId,
      options
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Delivery generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not purchased') || error.message.includes('denied')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get user from session
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'bandwidth':
        const bandwidthUsage = await deliveryService.getBandwidthUsage(user.id);
        return NextResponse.json({
          success: true,
          data: bandwidthUsage,
        });

      case 'analytics':
        const period = searchParams.get('period') || new Date().toISOString().substring(0, 7);
        const analytics = await deliveryService.getDeliveryAnalytics(period);
        return NextResponse.json({
          success: true,
          data: analytics,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Delivery API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
