import { NextRequest, NextResponse } from 'next/server';
import { gdprService } from '@/services/gdpr.service';
import { createServerClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reason, immediate = false, scheduledFor } = body;

    // Parse scheduled date if provided
    let scheduledDate: Date | undefined;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduled date' },
          { status: 400 }
        );
      }

      // Ensure scheduled date is in the future
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Create deletion request
    const result = await gdprService.createUserDeletionRequest({
      userId: user.id,
      reason,
      immediate,
      scheduledFor: scheduledDate,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    logger.info('User deletion request created via API', { 
      userId: user.id, 
      deletionId: result.deletionId,
      immediate,
      reason 
    });

    return NextResponse.json({
      success: true,
      deletionId: result.deletionId,
      message: result.message,
    });

  } catch (error) {
    logger.error('Error in deletion API endpoint', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's deletion requests
    const { data: deletions, error } = await supabase
      .from('user_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch deletion requests', { error: error.message, userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch deletion requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deletions: deletions || [],
    });

  } catch (error) {
    logger.error('Error fetching deletion requests', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deletionId = searchParams.get('id');

    if (!deletionId) {
      return NextResponse.json(
        { error: 'Deletion ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership and cancel deletion request
    const { data: deletion, error: fetchError } = await supabase
      .from('user_deletion_requests')
      .select('*')
      .eq('id', deletionId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !deletion) {
      return NextResponse.json(
        { error: 'Deletion request not found or cannot be cancelled' },
        { status: 404 }
      );
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('user_deletion_requests')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deletionId);

    if (updateError) {
      logger.error('Failed to cancel deletion request', { error: updateError.message, deletionId });
      return NextResponse.json(
        { error: 'Failed to cancel deletion request' },
        { status: 500 }
      );
    }

    // Log audit entry
    await gdprService.createAuditLog({
      userId: user.id,
      tableName: 'user_deletion_requests',
      recordId: deletionId,
      action: 'update',
      newValues: { status: 'cancelled' },
    });

    logger.info('Deletion request cancelled', { deletionId, userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Deletion request has been cancelled',
    });

  } catch (error) {
    logger.error('Error cancelling deletion request', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
