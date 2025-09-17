import { NextRequest, NextResponse } from 'next/server';
import { WebhookUtils, ReferralCommission } from '@/lib/webhook-utils';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { YooKassaWebhookEvent, WebhookProcessingResult } from '@/types/webhook';

const webhookUtils = new WebhookUtils();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let webhookEvent: YooKassaWebhookEvent | null = null;
  const paymentId = '';
  const userId = '';

  try {
    const payload = await request.json();
    const signature = request.headers.get('x-yookassa-signature');

    if (!signature) {
      logError(new Error('Missing YooKassa signature'), { action: 'yookassa_webhook' });
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify signature
    const payloadString = JSON.stringify(payload);
    const isValidSignature = await webhookUtils.verifySignature({
      provider: 'yookassa',
      signature,
      payload: payloadString,
      secret: process.env.YOOKASSA_WEBHOOK_SECRET!,
    });

    if (!isValidSignature) {
      logError(new Error('Invalid YooKassa signature'), { action: 'yookassa_webhook' });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook event
    webhookEvent = payload as YooKassaWebhookEvent;
    
    logger.info('Processing YooKassa webhook', { 
      event: webhookEvent.event,
      paymentId: webhookEvent.object.id,
      signature: signature.substring(0, 20) + '...' 
    });

    // Process webhook based on event type
    const result = await processYooKassaWebhook(webhookEvent);
    
    if (!result.success) {
      await webhookUtils.logWebhookEvent(
        'yookassa',
        webhookEvent.event,
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
      'yookassa',
      webhookEvent.event,
      webhookEvent,
      true
    );

    const processingTime = Date.now() - startTime;
    logger.info('YooKassa webhook processed successfully', { 
      event: webhookEvent.event,
      paymentId: webhookEvent.object.id,
      processingTimeMs: processingTime 
    });

    return NextResponse.json({ 
      received: true,
      paymentId: webhookEvent.object.id,
      processingTimeMs: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logError(error as Error, { 
      action: 'yookassa_webhook',
      event: webhookEvent?.event,
      processingTimeMs: processingTime
    });

    // Log failed webhook
    if (webhookEvent) {
      await webhookUtils.logWebhookEvent(
        'yookassa',
        webhookEvent.event,
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

async function processYooKassaWebhook(event: YooKassaWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    switch (event.event) {
      case 'payment.succeeded':
        return await handlePaymentSuccess(event);
      
      case 'payment.canceled':
        return await handlePaymentCancellation(event);
      
      case 'payment.waiting_for_capture':
        return await handlePaymentWaitingForCapture(event);
      
      case 'refund.succeeded':
        return await handleRefundSucceeded(event);
      
      default:
        logger.info('Unhandled YooKassa webhook event', { event: event.event });
        return { success: true, processed: false };
    }
  } catch (error) {
    logError(error as Error, { action: 'process_yookassa_webhook', event: event.event });
    return { 
      success: false, 
      processed: false, 
      error: (error as Error).message 
    };
  }
}

async function handlePaymentSuccess(event: YooKassaWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const payment = event.object;
    const metadata = payment.metadata || {};
    
    const userId = metadata.user_id;
    const productId = metadata.product_id;
    const referralCode = metadata.referral_code;
    const purchaseId = metadata.purchase_id || payment.id;

    if (!userId) {
      logError(new Error('Missing user_id in payment metadata'), { 
        paymentId: payment.id 
      });
      return { success: false, processed: false, error: 'Missing user_id' };
    }

    // Update payment status
    await webhookUtils.updatePaymentStatus(
      payment.id,
      'succeeded',
      {
        yookassa_payment_id: payment.id,
        amount_received: parseFloat(payment.amount.value),
        currency: payment.amount.currency,
        payment_method: undefined, // YooKassa payment method not available in this context
        created_at: payment.created_at,
      }
    );

    // Grant product access if product_id is provided
    if (productId) {
      const productAccess = {
        user_id: userId,
        product_id: productId,
        purchase_id: purchaseId,
        payment_id: payment.id,
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
          parseFloat(payment.amount.value),
          payment.amount.currency.toUpperCase()
        );
      }

      // Process referral commission if referral code exists
      if (referralCode) {
        const referral = await webhookUtils.findReferralByCode(referralCode, productId);
        if (referral) {
          const commissionAmount = parseFloat(payment.amount.value) * (referral.commission_percent / 100);
          
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
    await webhookUtils.logPaymentEvent(payment.id, 'payment_succeeded', {
      amount: payment.amount.value,
      currency: payment.amount.currency,
      payment_method: undefined, // YooKassa payment method not available in this context
      metadata,
    });

    logger.info('YooKassa payment succeeded and processed', { 
      paymentId: payment.id,
      userId,
      productId,
      referralCode: !!referralCode
    });

    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_yookassa_payment_success' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handlePaymentCancellation(event: YooKassaWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const payment = event.object;
    
    await webhookUtils.updatePaymentStatus(
      payment.id,
      'cancelled',
      {
        yookassa_payment_id: payment.id,
        cancellation_reason: 'user_cancelled',
        created_at: payment.created_at,
      }
    );

    // Log payment event
    await webhookUtils.logPaymentEvent(payment.id, 'payment_cancelled', {
      amount: payment.amount.value,
      currency: payment.amount.currency,
    });

    logger.info('YooKassa payment cancelled', { paymentId: payment.id });
    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_yookassa_payment_cancellation' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handlePaymentWaitingForCapture(event: YooKassaWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const payment = event.object;
    
    await webhookUtils.updatePaymentStatus(
      payment.id,
      'processing',
      {
        yookassa_payment_id: payment.id,
        status: 'waiting_for_capture',
        created_at: payment.created_at,
      }
    );

    logger.info('YooKassa payment waiting for capture', { paymentId: payment.id });
    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_yookassa_payment_waiting_for_capture' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handleRefundSucceeded(event: YooKassaWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const refund = event.object;
    
    // Update payment status to refunded
    // Note: YooKassa refund object structure may vary, using refund.id as payment reference
    await webhookUtils.updatePaymentStatus(
      refund.id, // Using refund.id as payment reference
      'refunded',
      {
        yookassa_refund_id: refund.id,
        refund_amount: parseFloat(refund.amount.value),
        refund_currency: refund.amount.currency,
        refund_status: 'succeeded',
        created_at: refund.created_at,
      }
    );

    // Revoke product access if this was a full refund
    // Note: Full refund logic would need to be implemented based on your business rules
    logger.info('Refund processed, product access should be reviewed', { 
      refundId: refund.id
    });

    // Log payment event
    await webhookUtils.logPaymentEvent(refund.id, 'refund_succeeded', {
      refund_id: refund.id,
      amount: refund.amount.value,
      currency: refund.amount.currency,
    });

    logger.info('YooKassa refund succeeded', { 
      refundId: refund.id
    });

    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_yookassa_refund_succeeded' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}
