import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const paymentService = new PaymentService();

export async function POST(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const body = await req.json();
      
      const {
        amount,
        currency,
        provider,
        payment_method_type,
        billing_address,
        cart_items,
        order_notes,
        metadata,
      } = body;

      // Validate required fields
      if (!amount || !currency || !provider || !billing_address) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Validate amount
      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be greater than 0' },
          { status: 400 }
        );
      }

      logger.info('Creating payment intent', {
        userId: context.userId,
        amount,
        currency,
        provider,
        itemCount: cart_items?.length || 0,
      });

      // Create payment request
      const paymentRequest = {
        amount,
        currency: currency.toUpperCase(),
        provider,
        payment_method_type: payment_method_type || 'card',
        user_id: context.userId,
        billing_address,
        line_items: cart_items?.map((item: any) => ({
          name: item.product_title || `Product ${item.product_id}`,
          description: item.description || '',
          quantity: item.quantity,
          amount: Math.round(item.price * 100), // Convert to cents
          currency: currency.toUpperCase(),
        })) || [],
        metadata: {
          ...metadata,
          user_id: context.userId,
          order_notes,
        },
      };

      // Create payment with the service
      const result = await paymentService.createPayment(paymentRequest);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Payment creation failed' },
          { status: 400 }
        );
      }

      logger.info('Payment intent created successfully', {
        paymentIntentId: result.payment_intent?.id,
        provider,
        userId: context.userId,
      });

      return NextResponse.json({
        success: true,
        payment_intent: result.payment_intent,
        payment_data: result.payment_data,
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'create_payment_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
