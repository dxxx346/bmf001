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
      const idempotencyKey = req.headers.get('idempotency-key');

      logger.info('Creating payment via API', { 
        userId: context.userId, 
        provider: body.provider,
        amount: body.amount,
        currency: body.currency 
      });

      const result = await paymentService.createPayment(body, idempotencyKey || undefined);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Payment created successfully',
        payment_intent: result.payment_intent,
        payment_data: result.payment_data,
      }, { status: 201 });
    } catch (error) {
      logError(error as Error, { action: 'create_payment_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      );
    }
  });
}
