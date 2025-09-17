import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { PaymentService } from '@/services/payment.service';
import { ReferralService } from '@/services/referral.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { z } from 'zod';
import { Currency, PaymentProvider } from '@/types/payment';
import { getReferralCookie } from '@/middleware/referral-tracking.middleware';

const productService = new ProductService();
const paymentService = new PaymentService();
const referralService = new ReferralService();

// Validation schema for purchase request
const purchaseRequestSchema = z.object({
  payment_method: z.enum(['stripe', 'yookassa', 'crypto']),
  currency: z.string().optional().default('USD'),
  referral_code: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  return authMiddleware.requireBuyer(request, async (req, context) => {
    try {
      const body = await req.json();
      
      // Validate request body
      const validationResult = purchaseRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { 
            error: 'Invalid request data',
            details: validationResult.error.issues 
          },
          { status: 400 }
        );
      }

      const { payment_method, currency, referral_code, metadata } = validationResult.data;

      logger.info('Product purchase request', { 
        productId, 
        buyerId: context.userId, 
        paymentMethod: payment_method 
      });

      // Get product details
      const product = await productService.getProduct(productId);
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      // Check if product is available for purchase
      if (product.status !== 'active') {
        return NextResponse.json(
          { error: 'Product is not available for purchase' },
          { status: 400 }
        );
      }

      // Check if user already owns this product
      const { data: existingPurchase } = await productService['supabase']
        .from('purchases')
        .select('id')
        .eq('buyer_id', context.userId)
        .eq('product_id', productId)
        .single();

      if (existingPurchase) {
        return NextResponse.json(
          { error: 'You already own this product' },
          { status: 400 }
        );
      }

      // Calculate final price (considering sale price)
      const finalPrice = product.sale_price || product.price;

      // Check for referral tracking cookie
      const referralCookie = getReferralCookie(req);
      let referralTrackingId: string | null = null;

      if (referralCookie || referral_code) {
        // Log referral tracking for later conversion processing
        referralTrackingId = referralCookie || null;
        logger.info('Purchase with referral tracking', {
          productId,
          buyerId: context.userId,
          referralCode: referral_code,
          trackingCookie: referralCookie
        });
      }

      // Create payment intent
      const paymentResult = await paymentService.createPayment({
        amount: finalPrice,
        currency: currency as Currency,
        provider: payment_method as PaymentProvider,
        product_id: productId,
        description: `Purchase: ${product.title}`,
        metadata: {
          product_title: product.title,
          product_id: productId,
          buyer_id: context.userId,
          referral_code: referral_code || '',
          referral_tracking_id: referralTrackingId || '',
          ...metadata,
        },
      });

      if (!paymentResult.success) {
        return NextResponse.json(
          { error: paymentResult.error },
          { status: 400 }
        );
      }

      logger.info('Payment intent created', { 
        productId, 
        buyerId: context.userId, 
        paymentIntentId: paymentResult.payment_intent?.id 
      });

      return NextResponse.json({
        message: 'Payment intent created successfully',
        payment_intent: paymentResult.payment_intent,
        product: {
          id: product.id,
          title: product.title,
          price: finalPrice,
          currency: product.currency,
        },
      });
    } catch (error) {
      logError(error as Error, { 
        action: 'purchase_product_api', 
        productId, 
        userId: context.userId 
      });
      return NextResponse.json(
        { error: 'Failed to process purchase request' },
        { status: 500 }
      );
    }
  });
}
