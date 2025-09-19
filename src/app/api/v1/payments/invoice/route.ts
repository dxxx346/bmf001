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

      logger.info('Generating invoice via API', { 
        userId: context.userId, 
        paymentIntentId: body.payment_intent_id 
      });

      const result = await paymentService.generateInvoice(body);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Invoice generated successfully',
        invoice: result.invoice,
      }, { status: 201 });
    } catch (error) {
      logError(error as Error, { action: 'generate_invoice_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to generate invoice' },
        { status: 500 }
      );
    }
  });
}
