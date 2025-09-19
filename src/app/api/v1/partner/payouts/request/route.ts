import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      const body = await req.json();
      const { 
        amount, 
        payment_method, 
        payment_details, 
        notes,
        payment_method_id 
      } = body;

      logger.info('Processing payout request', { 
        userId: context.userId, 
        amount,
        paymentMethod: payment_method 
      });

      const supabase = createServiceClient();

      // Validate minimum payout amount
      const minimumPayout = 50;
      if (amount < minimumPayout) {
        return NextResponse.json(
          { error: `Minimum payout amount is $${minimumPayout}` },
          { status: 400 }
        );
      }

      // Get partner's available balance
      const { data: totalStats } = await supabase
        .from('referral_stats')
        .select('total_earned')
        .eq('referral.referrer_id', context.userId);

      const totalEarnings = totalStats?.reduce((sum, stat) => sum + parseFloat(stat.total_earned), 0) || 0;

      // Get existing payout requests
      const { data: existingPayouts } = await supabase
        .from('partner_payouts')
        .select('amount')
        .eq('partner_id', context.userId);

      const totalRequested = existingPayouts?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const availableBalance = totalEarnings - totalRequested;

      // Validate sufficient balance
      if (amount > availableBalance) {
        return NextResponse.json(
          { error: 'Insufficient available balance' },
          { status: 400 }
        );
      }

      // Check for existing pending requests
      const { data: pendingPayouts } = await supabase
        .from('partner_payouts')
        .select('id')
        .eq('partner_id', context.userId)
        .in('status', ['pending', 'processing'])
        .limit(1);

      if (pendingPayouts && pendingPayouts.length > 0) {
        return NextResponse.json(
          { error: 'You already have a pending payout request' },
          { status: 400 }
        );
      }

      // Calculate fees
      const feeAmount = calculateProcessingFee(amount, payment_method);
      const netAmount = amount - feeAmount;

      // Create payout request
      const { data: newPayout, error: createError } = await supabase
        .from('partner_payouts')
        .insert({
          partner_id: context.userId,
          amount: amount.toString(),
          net_amount: netAmount.toString(),
          fee_amount: feeAmount.toString(),
          payment_method,
          payment_details,
          status: 'pending',
          notes,
          payment_method_id,
        })
        .select()
        .single();

      if (createError) {
        logError(createError as Error, { action: 'create_payout_request', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to create payout request' },
          { status: 500 }
        );
      }

      // Log payout request for audit
      logger.info('Payout request created successfully', { 
        payoutId: newPayout.id,
        userId: context.userId,
        amount,
        netAmount,
        paymentMethod: payment_method
      });

      // Send notification (would implement email/notification service)
      // await sendPayoutRequestNotification(context.userId, newPayout);

      return NextResponse.json({ 
        request: {
          id: newPayout.id,
          amount: parseFloat(newPayout.amount),
          net_amount: parseFloat(newPayout.net_amount),
          fee_amount: parseFloat(newPayout.fee_amount),
          payment_method: newPayout.payment_method,
          status: newPayout.status,
          created_at: newPayout.created_at,
        },
        message: 'Payout request submitted successfully' 
      }, { status: 201 });

    } catch (error) {
      logError(error as Error, { 
        action: 'create_payout_request_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Calculate processing fees based on payment method
function calculateProcessingFee(amount: number, paymentMethod: string): number {
  switch (paymentMethod) {
    case 'paypal':
      return amount * 0.03; // 3%
    case 'bank_transfer':
      return Math.min(5, amount * 0.02); // $5 or 2%, whichever is lower
    case 'crypto':
      return amount * 0.01; // 1%
    default:
      return 0;
  }
}
