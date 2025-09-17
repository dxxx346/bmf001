import { NextRequest, NextResponse } from 'next/server';
import { WebhookUtils, ReferralCommission } from '@/lib/webhook-utils';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { CoinGateWebhookEvent, WebhookProcessingResult } from '@/types/webhook';

const webhookUtils = new WebhookUtils();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let webhookEvent: CoinGateWebhookEvent | null = null;
  const paymentId = '';
  const userId = '';

  try {
    const payload = await request.json();
    const signature = request.headers.get('x-coingate-signature');

    if (!signature) {
      logError(new Error('Missing CoinGate signature'), { action: 'coingate_webhook' });
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify signature
    const payloadString = JSON.stringify(payload);
    const isValidSignature = await webhookUtils.verifySignature({
      provider: 'coingate',
      signature,
      payload: payloadString,
      secret: process.env.COINGATE_WEBHOOK_SECRET!,
    });

    if (!isValidSignature) {
      logError(new Error('Invalid CoinGate signature'), { action: 'coingate_webhook' });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook event
    webhookEvent = payload as CoinGateWebhookEvent;
    
    logger.info('Processing CoinGate webhook', { 
      orderId: webhookEvent.order_id,
      status: webhookEvent.status,
      signature: signature.substring(0, 20) + '...' 
    });

    // Process webhook based on event type
    const result = await processCoinGateWebhook(webhookEvent);
    
    if (!result.success) {
      await webhookUtils.logWebhookEvent(
        'coingate',
        webhookEvent.status,
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
      'coingate',
      webhookEvent.status,
      webhookEvent,
      true
    );

    const processingTime = Date.now() - startTime;
    logger.info('CoinGate webhook processed successfully', { 
      orderId: webhookEvent.order_id,
      status: webhookEvent.status,
      processingTimeMs: processingTime 
    });

    return NextResponse.json({ 
      received: true,
      orderId: webhookEvent.order_id,
      processingTimeMs: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logError(error as Error, { 
      action: 'coingate_webhook',
      orderId: webhookEvent?.order_id,
      processingTimeMs: processingTime
    });

    // Log failed webhook
    if (webhookEvent) {
      await webhookUtils.logWebhookEvent(
        'coingate',
        webhookEvent.status,
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

async function processCoinGateWebhook(event: CoinGateWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    switch (event.status) {
      case 'paid':
        return await handlePaymentSuccess(event);
      
      case 'canceled':
        return await handlePaymentCancellation(event);
      
      case 'expired':
        return await handlePaymentExpiration(event);
      
      case 'refunded':
        return await handleRefund(event);
      
      case 'confirming':
        return await handlePaymentConfirming(event);
      
      default:
        logger.info('Unhandled CoinGate webhook status', { status: event.status });
        return { success: true, processed: false };
    }
  } catch (error) {
    logError(error as Error, { action: 'process_coingate_webhook', status: event.status });
    return { 
      success: false, 
      processed: false, 
      error: (error as Error).message 
    };
  }
}

async function handlePaymentSuccess(event: CoinGateWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const order = event;
    
    // Extract metadata from order_id or token
    const metadata = {
      user_id: order.order_id.split('_')[0], // Assuming format: user_id_product_id
      product_id: order.order_id.split('_')[1],
      referral_code: order.token, // Using token as referral code if needed
    };
    
    const userId = metadata.user_id;
    const productId = metadata.product_id;
    const referralCode = metadata.referral_code;
    const purchaseId = order.order_id;

    if (!userId) {
      logError(new Error('Missing user_id in order metadata'), { 
        orderId: order.order_id 
      });
      return { success: false, processed: false, error: 'Missing user_id' };
    }

    // Update payment status
    await webhookUtils.updatePaymentStatus(
      order.order_id,
      'succeeded',
      {
        coingate_order_id: order.id.toString(),
        amount_received: order.receive_amount,
        currency_received: order.receive_currency,
        price_amount: order.price_amount,
        price_currency: order.price_currency,
        payment_url: order.payment_url,
        created_at: order.created_at,
        lightning_network: order.lightning_network,
      }
    );

    // Grant product access if product_id is provided
    if (productId) {
      const productAccess = {
        user_id: userId,
        product_id: productId,
        purchase_id: purchaseId,
        payment_id: order.order_id,
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
          order.price_amount,
          order.price_currency.toUpperCase()
        );
      }

      // Process referral commission if referral code exists
      if (referralCode) {
        const referral = await webhookUtils.findReferralByCode(referralCode, productId);
        if (referral) {
          const commissionAmount = order.price_amount * (referral.commission_percent / 100);
          
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
    await webhookUtils.logPaymentEvent(order.order_id, 'payment_succeeded', {
      amount: order.price_amount,
      currency: order.price_currency,
      receive_amount: order.receive_amount,
      receive_currency: order.receive_currency,
      payment_url: order.payment_url,
    });

    logger.info('CoinGate payment succeeded and processed', { 
      orderId: order.order_id,
      userId,
      productId,
      referralCode: !!referralCode
    });

    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_coingate_payment_success' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handlePaymentCancellation(event: CoinGateWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const order = event;
    
    await webhookUtils.updatePaymentStatus(
      order.order_id,
      'cancelled',
      {
        coingate_order_id: order.id.toString(),
        cancellation_reason: 'user_cancelled',
        created_at: order.created_at,
      }
    );

    // Log payment event
    await webhookUtils.logPaymentEvent(order.order_id, 'payment_cancelled', {
      amount: order.price_amount,
      currency: order.price_currency,
    });

    logger.info('CoinGate payment cancelled', { orderId: order.order_id });
    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_coingate_payment_cancellation' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handlePaymentExpiration(event: CoinGateWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const order = event;
    
    await webhookUtils.updatePaymentStatus(
      order.order_id,
      'expired',
      {
        coingate_order_id: order.id.toString(),
        expiration_reason: 'payment_timeout',
        created_at: order.created_at,
      }
    );

    // Log payment event
    await webhookUtils.logPaymentEvent(order.order_id, 'payment_expired', {
      amount: order.price_amount,
      currency: order.price_currency,
    });

    logger.info('CoinGate payment expired', { orderId: order.order_id });
    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_coingate_payment_expiration' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handleRefund(event: CoinGateWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const order = event;
    
    // Update payment status to refunded
    await webhookUtils.updatePaymentStatus(
      order.order_id,
      'refunded',
      {
        coingate_order_id: order.id.toString(),
        refund_amount: order.price_amount,
        refund_currency: order.price_currency,
        refund_status: 'succeeded',
        created_at: order.created_at,
      }
    );

    // Revoke product access for refunded payments
    logger.info('CoinGate refund processed, product access should be revoked', { 
      orderId: order.order_id 
    });

    // Log payment event
    await webhookUtils.logPaymentEvent(order.order_id, 'refund_succeeded', {
      amount: order.price_amount,
      currency: order.price_currency,
    });

    logger.info('CoinGate refund succeeded', { orderId: order.order_id });
    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_coingate_refund' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}

async function handlePaymentConfirming(event: CoinGateWebhookEvent): Promise<WebhookProcessingResult> {
  try {
    const order = event;
    
    await webhookUtils.updatePaymentStatus(
      order.order_id,
      'processing',
      {
        coingate_order_id: order.id.toString(),
        status: 'confirming',
        created_at: order.created_at,
      }
    );

    logger.info('CoinGate payment confirming', { orderId: order.order_id });
    return { success: true, processed: true };
  } catch (error) {
    logError(error as Error, { action: 'handle_coingate_payment_confirming' });
    return { success: false, processed: false, error: (error as Error).message };
  }
}
