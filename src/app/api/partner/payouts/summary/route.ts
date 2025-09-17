import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      logger.info('Fetching partner payout summary', { userId: context.userId });

      const supabase = createServiceClient();
      
      // Get total earnings from referral stats
      const { data: totalStats, error: statsError } = await supabase
        .from('referral_stats')
        .select('total_earned')
        .eq('referral.referrer_id', context.userId);

      if (statsError) {
        logError(statsError as Error, { action: 'get_total_earnings_for_summary' });
      }

      const totalEarnings = totalStats?.reduce((sum, stat) => sum + parseFloat(stat.total_earned), 0) || 0;

      // Get payout history
      const { data: payouts, error: payoutsError } = await supabase
        .from('partner_payouts')
        .select('amount, status, created_at, completed_at')
        .eq('partner_id', context.userId)
        .order('created_at', { ascending: false });

      if (payoutsError) {
        logError(payoutsError as Error, { action: 'get_payouts_for_summary' });
      }

      // Calculate summary data
      const totalPaid = payouts?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

      const pendingAmount = payouts?.filter(p => p.status === 'pending' || p.status === 'processing')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

      const totalRequested = payouts?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

      const availableBalance = Math.max(totalEarnings - totalRequested, 0);

      // Get last successful payout
      const lastPayout = payouts?.find(p => p.status === 'completed');

      // Calculate next payout date (1st of next month)
      const now = new Date();
      const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const summary = {
        available_balance: availableBalance,
        pending_amount: pendingAmount,
        total_paid: totalPaid,
        total_requested: totalRequested,
        next_payout_date: nextPayoutDate.toISOString(),
        minimum_payout: 50,
        last_payout_amount: lastPayout ? parseFloat(lastPayout.amount) : undefined,
        last_payout_date: lastPayout?.completed_at,
      };

      logger.info('Partner payout summary calculated', { 
        userId: context.userId,
        availableBalance,
        totalPaid,
        pendingAmount
      });

      return NextResponse.json(summary);

    } catch (error) {
      logError(error as Error, { 
        action: 'get_partner_payout_summary_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
