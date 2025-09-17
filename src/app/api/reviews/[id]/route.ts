import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ReviewService } from '@/services/review.service';
import { UpdateReviewRequest } from '@/types/review';

const reviewService = new ReviewService();

// GET /api/reviews/[id] - Get a specific review
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const review = await reviewService.getReviewById(params.id);

    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Error getting review:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get review'
    }, { status: 500 });
  }
}

// PUT /api/reviews/[id] - Update a review
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json() as UpdateReviewRequest;

    // Validate rating if provided
    if (body.rating && (body.rating < 1 || body.rating > 5)) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be between 1 and 5'
      }, { status: 400 });
    }

    const review = await reviewService.updateReview(user.id, params.id, body);

    return NextResponse.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update review';
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('unauthorized') ? 404 : 500;

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode });
  }
}

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user owns the review or is admin
    const review = await reviewService.getReviewById(params.id);
    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 });
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (review.user_id !== user.id && userData?.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to delete this review'
      }, { status: 403 });
    }

    // Soft delete by updating status
    const { error } = await supabase
      .from('reviews')
      .update({ 
        status: 'rejected',
        moderation_status: 'rejected',
        moderation_notes: 'Deleted by user'
      })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete review'
    }, { status: 500 });
  }
}
