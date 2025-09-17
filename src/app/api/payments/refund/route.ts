import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const paymentService = new PaymentService();

export async function POST(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const body = await request.json();

      logger.info('Processing refund via API', { 
        userId: context.userId, 
        paymentIntentId: body.payment_intent_id,
        amount: body.amount 
      });

      const result = await paymentService.processRefund(body);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Refund processed successfully',
        refund: result.refund,
      }, { status: 201 });
    } catch (error) {
      logError(error as Error, { action: 'process_refund_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to process refund' },
        { status: 500 }
      );
    }
  });
}
