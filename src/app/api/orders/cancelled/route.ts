import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.optionalAuth(request).then(async (context) => {
    try {
      const { searchParams } = new URL(request.url);
      const paymentIntentId = searchParams.get('payment_intent');
      const sessionId = searchParams.get('session_id');

      if (!paymentIntentId && !sessionId) {
        // Return generic cancellation data if no identifiers provided
        return NextResponse.json({
          order: {
            status: 'cancelled',
            reason: 'Payment was cancelled by user',
          }
        });
      }

      logger.info('Fetching cancelled order', {
        paymentIntentId,
        sessionId,
        userId: context.isAuthenticated ? context.userId : 'anonymous',
      });

      const supabase = createServiceClient();
      
      // Try to find the cancelled payment/order
      let query = supabase
        .from('payments')
        .select(`
          id,
          payment_intent_id,
          checkout_session_id,
          amount,
          currency,
          status,
          failure_reason,
          created_at
        `)
        .in('status', ['failed', 'cancelled']);

      if (context.isAuthenticated) {
        query = query.eq('user_id', context.userId);
      }

      if (paymentIntentId) {
        query = query.eq('payment_intent_id', paymentIntentId);
      } else if (sessionId) {
        query = query.eq('checkout_session_id', sessionId);
      }

      const { data: payments, error } = await query.single();

      if (error || !payments) {
        // Return generic cancellation data if payment not found
        return NextResponse.json({
          order: {
            status: 'cancelled',
            reason: 'Payment session not found or expired',
          }
        });
      }

      // Transform the data for frontend consumption
      const orderData = {
        id: payments.id,
        payment_intent_id: payments.payment_intent_id,
        amount: parseFloat(payments.amount),
        currency: payments.currency,
        status: payments.status,
        reason: payments.failure_reason || 'Payment was cancelled',
        created_at: payments.created_at,
      };

      logger.info('Cancelled payment retrieved', {
        paymentId: payments.id,
        status: payments.status,
        reason: payments.failure_reason,
      });

      return NextResponse.json({ order: orderData });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_cancelled_order_api',
        userId: context.isAuthenticated ? context.userId : 'anonymous'
      });
      
      // Return generic cancellation data on error
      return NextResponse.json({
        order: {
          status: 'cancelled',
          reason: 'Unable to retrieve payment information',
        }
      });
    }
  });
}
