import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      logger.info('Fetching partner payouts', { userId: context.userId });

      const supabase = createServiceClient();
      
      const { data: payouts, error } = await supabase
        .from('partner_payouts')
        .select('*')
        .eq('partner_id', context.userId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(error as Error, { action: 'get_partner_payouts', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch payouts' },
          { status: 500 }
        );
      }

      // Transform data for frontend
      const transformedPayouts = payouts?.map(payout => ({
        id: payout.id,
        amount: parseFloat(payout.amount),
        net_amount: parseFloat(payout.net_amount || payout.amount),
        fee_amount: parseFloat(payout.fee_amount || '0'),
        payment_method: payout.payment_method,
        payment_details: payout.payment_details || {},
        status: payout.status,
        created_at: payout.created_at,
        processed_at: payout.processed_at,
        completed_at: payout.completed_at,
        transaction_id: payout.transaction_id,
        failure_reason: payout.failure_reason,
        notes: payout.notes,
        batch_id: payout.batch_id,
      })) || [];

      logger.info('Partner payouts fetched successfully', { 
        userId: context.userId,
        payoutCount: transformedPayouts.length 
      });

      return NextResponse.json({ payouts: transformedPayouts });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_partner_payouts_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
