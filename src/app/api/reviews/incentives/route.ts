import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ReviewIncentiveService } from '@/services/review-incentive.service';
import { ReviewIncentiveRequest } from '@/types/review';

const incentiveService = new ReviewIncentiveService();

// GET /api/reviews/incentives - Get incentives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      product_id: searchParams.get('product_id') || undefined,
      shop_id: searchParams.get('shop_id') || undefined,
      is_active: searchParams.get('is_active') === 'false' ? false : true,
      incentive_type: searchParams.get('incentive_type') as any || undefined
    };

    const incentives = await incentiveService.getIncentives(filters);

    return NextResponse.json({
      success: true,
      data: incentives
    });
  } catch (error) {
    console.error('Error getting incentives:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get incentives'
    }, { status: 500 });
  }
}

// POST /api/reviews/incentives - Create incentive
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if user is seller/admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['seller', 'admin'].includes(userData.role)) {
      return NextResponse.json({
        success: false,
        error: 'Seller or admin role required'
      }, { status: 403 });
    }

    const body = await request.json() as ReviewIncentiveRequest;

    // Validate required fields
    if (!body.incentive_type || !body.incentive_value) {
      return NextResponse.json({
        success: false,
        error: 'Incentive type and value are required'
      }, { status: 400 });
    }

    // Validate incentive value
    if (body.incentive_value <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Incentive value must be positive'
      }, { status: 400 });
    }

    // Must specify either product_id or shop_id
    if (!body.product_id && !body.shop_id) {
      return NextResponse.json({
        success: false,
        error: 'Either product_id or shop_id must be specified'
      }, { status: 400 });
    }

    const incentive = await incentiveService.createIncentive(user.id, body);

    return NextResponse.json({
      success: true,
      data: incentive
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating incentive:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create incentive';
    const statusCode = errorMessage.includes('Unauthorized') ? 403 : 500;

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode });
  }
}
