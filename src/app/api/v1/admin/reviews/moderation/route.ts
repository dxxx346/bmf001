import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ReviewModerationService } from '@/services/review-moderation.service';
import { ReviewModerationRequest } from '@/types/review';

const moderationService = new ReviewModerationService();

// GET /api/admin/reviews/moderation - Get moderation queue
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') as any || undefined,
      priority: searchParams.get('priority') ? parseInt(searchParams.get('priority')!) : undefined,
      moderator_id: searchParams.get('moderator_id') || undefined,
      auto_flagged: searchParams.get('auto_flagged') === 'true' ? true : searchParams.get('auto_flagged') === 'false' ? false : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    };

    const result = await moderationService.getModerationQueue(filters);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting moderation queue:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get moderation queue'
    }, { status: 500 });
  }
}

// POST /api/admin/reviews/moderation - Add review to moderation queue
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

    const body = await request.json();
    const { review_id, reason, priority } = body;

    if (!review_id || !reason) {
      return NextResponse.json({
        success: false,
        error: 'Review ID and reason are required'
      }, { status: 400 });
    }

    const queueItem = await moderationService.addToModerationQueue(
      review_id,
      reason,
      user.id,
      priority || 2
    );

    return NextResponse.json({
      success: true,
      data: queueItem
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding to moderation queue:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add to moderation queue'
    }, { status: 500 });
  }
}
