import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ReviewService } from '@/services/review.service';
import { ReviewResponseRequest } from '@/types/review';

const reviewService = new ReviewService();

// POST /api/reviews/[id]/respond - Add seller response to review
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
    const { response_text, is_public } = body;

    // Validate response text
    if (!response_text || response_text.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Response text is required'
      }, { status: 400 });
    }

    if (response_text.length > 2000) {
      return NextResponse.json({
        success: false,
        error: 'Response text must be less than 2000 characters'
      }, { status: 400 });
    }

    const responseRequest: ReviewResponseRequest = {
      review_id: params.id,
      response_text,
      is_public: is_public ?? true
    };

    await reviewService.addSellerResponse(user.id, responseRequest);

    return NextResponse.json({
      success: true,
      message: 'Response added successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding response:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to add response';
    const statusCode = errorMessage.includes('not found') ? 404 : 
                      errorMessage.includes('Unauthorized') ? 403 : 500;

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode });
  }
}

// GET /api/reviews/[id]/respond - Get responses for a review
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    
    const { data: responses, error } = await supabase
      .from('review_responses')
      .select(`
        *,
        seller:users!review_responses_seller_id_fkey(id, name, avatar_url)
      `)
      .eq('review_id', params.id)
      .eq('is_public', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: responses || []
    });
  } catch (error) {
    console.error('Error getting responses:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get responses'
    }, { status: 500 });
  }
}
