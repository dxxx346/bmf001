import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ReviewService } from '@/services/review.service';
import { CreateReviewRequest, ReviewFilters } from '@/types/review';

const reviewService = new ReviewService();

// GET /api/reviews - Get reviews with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: ReviewFilters = {
      product_id: searchParams.get('product_id') || undefined,
      shop_id: searchParams.get('shop_id') || undefined,
      user_id: searchParams.get('user_id') || undefined,
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      min_rating: searchParams.get('min_rating') ? parseInt(searchParams.get('min_rating')!) : undefined,
      max_rating: searchParams.get('max_rating') ? parseInt(searchParams.get('max_rating')!) : undefined,
      is_verified: searchParams.get('is_verified') === 'true' ? true : searchParams.get('is_verified') === 'false' ? false : undefined,
      has_content: searchParams.get('has_content') === 'true' ? true : searchParams.get('has_content') === 'false' ? false : undefined,
      has_responses: searchParams.get('has_responses') === 'true' ? true : searchParams.get('has_responses') === 'false' ? false : undefined,
      status: searchParams.get('status') as any || undefined,
      moderation_status: searchParams.get('moderation_status') as any || undefined,
      ml_status: searchParams.get('ml_status') as any || undefined,
      created_after: searchParams.get('created_after') || undefined,
      created_before: searchParams.get('created_before') || undefined,
      sort_by: searchParams.get('sort_by') as any || 'created_at',
      sort_order: searchParams.get('sort_order') as any || 'desc',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    };

    const result = await reviewService.getReviewsWithRelations(filters);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting reviews:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get reviews'
    }, { status: 500 });
  }
}

// POST /api/reviews - Create a new review
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

    const body = await request.json() as CreateReviewRequest;

    // Validate required fields
    if (!body.product_id || !body.rating) {
      return NextResponse.json({
        success: false,
        error: 'Product ID and rating are required'
      }, { status: 400 });
    }

    // Validate rating range
    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be between 1 and 5'
      }, { status: 400 });
    }

    const review = await reviewService.createReview(user.id, body);

    return NextResponse.json({
      success: true,
      data: review
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create review';
    const statusCode = errorMessage.includes('already reviewed') ? 409 : 
                      errorMessage.includes('spam') ? 429 : 500;

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode });
  }
}
