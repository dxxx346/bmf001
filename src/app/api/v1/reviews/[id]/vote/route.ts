import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ReviewService } from '@/services/review.service';
import { ReviewVoteRequest } from '@/types/review';

const reviewService = new ReviewService();

// POST /api/reviews/[id]/vote - Vote on a review
export async function POST(
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

    const body = await request.json();
    const { vote_type } = body;

    // Validate vote type
    const validVoteTypes = ['helpful', 'unhelpful', 'spam', 'fake'];
    if (!vote_type || !validVoteTypes.includes(vote_type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid vote type. Must be one of: helpful, unhelpful, spam, fake'
      }, { status: 400 });
    }

    // Check if review exists
    const review = await reviewService.getReviewById(params.id);
    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 });
    }

    // Prevent users from voting on their own reviews
    if (review.user_id === user.id) {
      return NextResponse.json({
        success: false,
        error: 'Cannot vote on your own review'
      }, { status: 400 });
    }

    const voteRequest: ReviewVoteRequest = {
      review_id: params.id,
      vote_type
    };

    await reviewService.voteOnReview(user.id, voteRequest);

    return NextResponse.json({
      success: true,
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    console.error('Error voting on review:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record vote'
    }, { status: 500 });
  }
}

// DELETE /api/reviews/[id]/vote - Remove vote on a review
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

    // Remove the vote
    const { error } = await supabase
      .from('review_votes')
      .delete()
      .eq('review_id', params.id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Vote removed successfully'
    });
  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove vote'
    }, { status: 500 });
  }
}
