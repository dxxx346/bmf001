import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ReviewModerationService } from '@/services/review-moderation.service';
import { ReviewModerationRequest } from '@/types/review';

const moderationService = new ReviewModerationService();

// PUT /api/admin/reviews/moderation/[id] - Process moderation decision
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    
    // Get current user and verify admin/moderator role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'moderator'].includes(userData.role)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({
        success: false,
        error: 'Moderation status is required'
      }, { status: 400 });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'flagged', 'spam'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid moderation status'
      }, { status: 400 });
    }

    const decision: ReviewModerationRequest = {
      review_id: '', // Will be fetched by the service
      status,
      notes
    };

    await moderationService.processModeration(params.id, user.id, decision);

    return NextResponse.json({
      success: true,
      message: 'Moderation decision processed successfully'
    });
  } catch (error) {
    console.error('Error processing moderation:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to process moderation';
    const statusCode = errorMessage.includes('not found') ? 404 : 
                      errorMessage.includes('Unauthorized') ? 403 : 500;

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode });
  }
}

// POST /api/admin/reviews/moderation/[id]/assign - Assign moderator
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    const supabase = createServiceClient();
    
    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Admin role required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { moderator_id } = body;

    if (!moderator_id) {
      return NextResponse.json({
        success: false,
        error: 'Moderator ID is required'
      }, { status: 400 });
    }

    await moderationService.assignModerator(params.id, moderator_id);

    return NextResponse.json({
      success: true,
      message: 'Moderator assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning moderator:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to assign moderator'
    }, { status: 500 });
  }
}
