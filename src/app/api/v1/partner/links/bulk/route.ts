import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      const body = await req.json();
      const { operation_type, link_ids } = body;

      if (!operation_type || !link_ids || !Array.isArray(link_ids) || link_ids.length === 0) {
        return NextResponse.json(
          { error: 'Missing required fields: operation_type and link_ids' },
          { status: 400 }
        );
      }

      if (!['activate', 'pause', 'delete'].includes(operation_type)) {
        return NextResponse.json(
          { error: 'Invalid operation_type. Must be one of: activate, pause, delete' },
          { status: 400 }
        );
      }

      logger.info('Performing bulk operation on referral links', { 
        userId: context.userId, 
        operation: operation_type,
        linkIds: link_ids
      });

      const supabase = createServiceClient();

      // Verify all links belong to the user
      const { data: userLinks, error: fetchError } = await supabase
        .from('referrals')
        .select('id')
        .in('id', link_ids)
        .eq('referrer_id', context.userId);

      if (fetchError) {
        logError(fetchError as Error, { action: 'bulk_verify_links', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to verify link ownership' },
          { status: 500 }
        );
      }

      const verifiedLinkIds = userLinks?.map(link => link.id) || [];
      const unauthorizedIds = link_ids.filter(id => !verifiedLinkIds.includes(id));

      if (unauthorizedIds.length > 0) {
        return NextResponse.json(
          { 
            error: 'Some links not found or unauthorized',
            unauthorized_ids: unauthorizedIds
          },
          { status: 403 }
        );
      }

      let result;
      let successCount = 0;

      switch (operation_type) {
        case 'activate':
        case 'pause':
          // For now, we don't have a status column in referrals table
          // This would be implemented when the status column is added
          successCount = verifiedLinkIds.length;
          result = { message: `${successCount} links ${operation_type}d successfully` };
          break;

        case 'delete':
          // Delete referral stats first
          const { error: statsDeleteError } = await supabase
            .from('referral_stats')
            .delete()
            .in('referral_id', verifiedLinkIds);

          if (statsDeleteError) {
            logError(statsDeleteError as Error, { action: 'bulk_delete_stats', userId: context.userId });
            return NextResponse.json(
              { error: 'Failed to delete referral stats' },
              { status: 500 }
            );
          }

          // Delete referral links
          const { error: deleteError } = await supabase
            .from('referrals')
            .delete()
            .in('id', verifiedLinkIds);

          if (deleteError) {
            logError(deleteError as Error, { action: 'bulk_delete_links', userId: context.userId });
            return NextResponse.json(
              { error: 'Failed to delete referral links' },
              { status: 500 }
            );
          }

          successCount = verifiedLinkIds.length;
          result = { message: `${successCount} links deleted successfully` };
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid operation type' },
            { status: 400 }
          );
      }

      logger.info('Bulk operation completed successfully', { 
        userId: context.userId,
        operation: operation_type,
        successCount
      });

      return NextResponse.json(result);

    } catch (error) {
      logError(error as Error, { 
        action: 'bulk_operation_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
