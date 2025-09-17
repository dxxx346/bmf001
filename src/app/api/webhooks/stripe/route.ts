import { NextRequest, NextResponse } from 'next/server';
import { WebhookUtils, ReferralCommission } from '@/lib/webhook-utils';
import { ReferralService } from '@/services/referral.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { StripeWebhookEvent, WebhookProcessingResult } from '@/types/webhook';
import Stripe from 'stripe';

const webhookUtils = new WebhookUtils();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let webhookEvent: StripeWebhookEvent | null = null;
  const paymentId = '';
  const userId = '';

  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logError(new Error('Missing Stripe signature'), { action: 'stripe_webhook' });
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify signature
    const isValidSignature = await webhookUtils.verifySignature({
      provider: 'stripe',
      signature,
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });

    if (!isValidSignature) {
      logError(new Error('Invalid Stripe signature'), { action: 'stripe_webhook' });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook event
    webhookEvent = JSON.parse(payload) as StripeWebhookEvent;
    
    logger.info('Processing Stripe webhook', { 
      eventType: webhookEvent.type, 
      eventId: webhookEvent.id,
      signature: signature.substring(0, 20) + '...' 
    });

    // Process webhook based on event type
    const result = await processStripeWebhook(webhookEvent);
    
    if (!result.success) {
      await webhookUtils.logWebhookEvent(
        'stripe',
        webhookEvent.type,
        webhookEvent,
        false,
        result.error
      );
      
      return NextResponse.json({ 
        error: 'Webhook processing failed',
        details: result.error 
      }, { status: 400 });
    }

    // Log successful processing
    await webhookUtils.logWebhookEvent(
      'stripe',
      webhookEvent.type,
      webhookEvent,
      true
    );

    const processingTime = Date.now() - startTime;
    logger.info('Stripe webhook processed successfully', { 
      eventType: webhookEvent.type,
      processingTimeMs: processingTime 
    });

    return NextResponse.json({ 
      received: true,
      eventId: webhookEvent.id,
      processingTimeMs: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logError(error as Error, { 
      action: 'stripe_webhook',
      eventType: webhookEvent?.type,
      processingTimeMs: processingTime
    });

    // Log failed webhook
    if (webhookEvent) {
      await webhookUtils.logWebhookEvent(
        'stripe',
        webhookEvent.type,
        webhookEvent,
        false,
        (error as Error).message
      );
    }

    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        processingTimeMs: processingTime
      },
      { status: 500 }
    );
  }
}

async function processStripeWebhook(event: StripeWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        return await handlePaymentSuccess(event);
      
      case 'payment_intent.payment_failed':
        return await handlePaymentFailure(event);
      
      case 'payment_intent.canceled':
        return await handlePaymentCancellation(event);
      
      case 'payment_intent.requires_action':
        return await handlePaymentRequiresAction(event);
      
      case 'invoice.payment_succeeded':
        return await handleInvoicePaymentSucceeded(event);
      
      case 'invoice.payment_failed':
        return await handleInvoicePaymentFailed(event);
      
      default:
        logger.info('Unhandled Stripe webhook event', { eventType: event.type });
        return { success: true, processed: false };
    }
  } catch (error) {
    logError(error as Error, { action: 'process_stripe_webhook', eventType: event.type });
    return { 
      success: false, 
      processed: false, 
      error: (error as Error).message 
    };
  }
}

async function handlePaymentSuccess(event: StripeWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata || {};
    
    const userId = metadata.user_id;
    const productId = metadata.product_id;
    const referralCode = metadata.referral_code;
    const purchaseId = metadata.purchase_id || paymentIntent.id;

    if (!userId) {
      logError(new Error('Missing user_id in payment metadata'), { 
        paymentIntentId: paymentIntent.id 
      });
      return { success: false, processed: false, error: 'Missing user_id' };
    }

    // Update payment status
    await webhookUtils.updatePaymentStatus(
      paymentIntent.id,
      'succeeded',
      {
        stripe_payment_intent_id: paymentIntent.id,
        amount_received: paymentIntent.amount_received,
        currency: paymentIntent.currency,
        payment_method: paymentIntent.payment_method,
      }
    );

    // Grant product access if product_id is provided
    if (productId) {
      const productAccess = {
        user_id: userId,
        product_id: productId,
        purchase_id: purchaseId,
        payment_id: paymentIntent.id,
        download_count: 0,
        expires_at: undefined, // No expiration for digital products
      };

      const accessGranted = await webhookUtils.grantProductAccess(productAccess);
      if (!accessGranted) {
        logError(new Error('Failed to grant product access'), { 
          userId, 
          productId, 
          purchaseId 
        });
        return { success: false, processed: false, error: 'Failed to grant product access' };
      }

      // Get product details for notifications
      const product = await webhookUtils.getProductById(productId);
      if (product) {
        // Send success notification
        await webhookUtils.sendPaymentSuccessNotification(
          userId,
          product.title,
          paymentIntent.amount / 100, // Convert from cents
          paymentIntent.currency.toUpperCase()
        );
      }

      // Process referral commission with enhanced tracking
      const referralTrackingId = metadata.referral_tracking_id;
      
      if (referralCode || referralTrackingId) {
        const referralService = new ReferralService();
        
        try {
          // Process conversion with fraud detection
          const conversionResult = await referralService.processConversion(
            purchaseId,
            referralTrackingId,
            metadata.client_ip,
            metadata.user_agent
          );
          
          if (conversionResult) {
            logger.info('Referral conversion processed', {
              purchaseId,
              conversionId: conversionResult.conversion_id,
              commissionAmount: conversionResult.commission_amount,
              isVerified: conversionResult.is_verified,
              fraudScore: conversionResult.fraud_score
            });
          }
        } catch (referralError) {
          logError(referralError as Error, {
            action: 'process_referral_conversion',
            purchaseId,
            referralCode,
            referralTrackingId
          });
        }
        
        // Fallback to legacy referral processing if needed
        const referral = await webhookUtils.findReferralByCode(referralCode, productId);
        if (referral) {
          const commissionAmount = (paymentIntent.amount / 100) * (referral.commission_percent / 100);
          
          const commission: ReferralCommission = {
            referral_id: referral.referral_id,
            referrer_id: referral.referrer_id,
            product_id: productId,
            purchase_id: purchaseId,
            commission_amount: commissionAmount,
            commission_percent: referral.commission_percent,
          };

          await webhookUtils.processReferralCommission(commission);

          // Send referral commission notification
          if (product) {
            await webhookUtils.sendReferralCommissionNotification(
              referral.referrer_id,
              product.title,
              commissionAmount
            );
          }
        }
      }
    }

    // Log payment event
    await webhookUtils.logPaymentEvent(paymentIntent.id, 'payment_succeeded', {
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      payment_method: paymentIntent.payment_method,
      metadata,
    });

    logger.info('Payment succeeded and processed', { 
      paymentIntentId: paymentIntent.id,
      userId,
      productId,
      referralCode: !!referralCode
    });

    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_payment_success' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handlePaymentFailure(event: StripeWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    await webhookUtils.updatePaymentStatus(
      paymentIntent.id,
      'failed',
      {
        stripe_payment_intent_id: paymentIntent.id,
        failure_reason: paymentIntent.last_payment_error?.message,
        failure_code: paymentIntent.last_payment_error?.code,
      }
    );

    // Log payment event
    await webhookUtils.logPaymentEvent(paymentIntent.id, 'payment_failed', {
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      failure_reason: paymentIntent.last_payment_error?.message,
    });

    logger.info('Payment failed', { 
      paymentIntentId: paymentIntent.id,
      failureReason: paymentIntent.last_payment_error?.message 
    });

    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_payment_failure' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handlePaymentCancellation(event: StripeWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    await webhookUtils.updatePaymentStatus(
      paymentIntent.id,
      'cancelled',
      {
        stripe_payment_intent_id: paymentIntent.id,
        cancellation_reason: 'user_cancelled',
      }
    );

    // Log payment event
    await webhookUtils.logPaymentEvent(paymentIntent.id, 'payment_cancelled', {
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    logger.info('Payment cancelled', { paymentIntentId: paymentIntent.id });
    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_payment_cancellation' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handlePaymentRequiresAction(event: StripeWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    await webhookUtils.updatePaymentStatus(
      paymentIntent.id,
      'processing',
      {
        stripe_payment_intent_id: paymentIntent.id,
        requires_action: true,
        next_action: paymentIntent.next_action?.type,
      }
    );

    logger.info('Payment requires action', { 
      paymentIntentId: paymentIntent.id,
      nextAction: paymentIntent.next_action?.type 
    });

    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_payment_requires_action' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handleInvoicePaymentSucceeded(event: StripeWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const invoice = event.data.object as Stripe.Invoice;
    
    logger.info('Invoice payment succeeded', { 
      invoiceId: invoice.id
    });

    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_invoice_payment_succeeded' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handleInvoicePaymentFailed(event: StripeWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const invoice = event.data.object as Stripe.Invoice;
    
    logger.info('Invoice payment failed', { 
      invoiceId: invoice.id
    });

    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_invoice_payment_failed' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}