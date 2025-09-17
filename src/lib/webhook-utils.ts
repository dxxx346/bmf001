import { createServiceClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { nanoid } from 'nanoid/non-secure';
import crypto from 'crypto';

export interface WebhookSignature {
  provider: 'stripe' | 'yookassa' | 'coingate';
  signature: string;
  payload: string;
  secret: string;
}

export interface ProductAccess {
  user_id: string;
  product_id: string;
  purchase_id: string;
  payment_id: string;
  expires_at?: string;
  download_count: number;
}

export interface ReferralCommission {
  referral_id: string;
  referrer_id: string;
  product_id: string;
  purchase_id: string;
  commission_amount: number;
  commission_percent: number;
}

export interface EmailNotification {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export class WebhookUtils {
  private supabase = createServiceClient();

  // =============================================
  // SIGNATURE VERIFICATION
  // =============================================

  async verifySignature({ provider, signature, payload, secret }: WebhookSignature): Promise<boolean> {
    try {
      switch (provider) {
        case 'stripe':
          return this.verifyStripeSignature(signature, payload, secret);
        case 'yookassa':
          return this.verifyYooKassaSignature(signature, payload, secret);
        case 'coingate':
          return this.verifyCoinGateSignature(signature, payload, secret);
        default:
          logError(new Error(`Unsupported webhook provider: ${provider}`), { provider });
          return false;
      }
    } catch (error) {
      logError(error as Error, { action: 'verify_signature', provider });
      return false;
    }
  }

  private verifyStripeSignature(signature: string, payload: string, secret: string): boolean {
    try {
      const elements = signature.split(',');
      const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
      const v1 = elements.find(el => el.startsWith('v1='))?.split('=')[1];

      if (!timestamp || !v1) {
        return false;
      }

      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(v1, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logError(error as Error, { action: 'verify_stripe_signature' });
      return false;
    }
  }

  private verifyYooKassaSignature(signature: string, payload: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logError(error as Error, { action: 'verify_yookassa_signature' });
      return false;
    }
  }

  private verifyCoinGateSignature(signature: string, payload: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logError(error as Error, { action: 'verify_coingate_signature' });
      return false;
    }
  }

  // =============================================
  // PRODUCT ACCESS MANAGEMENT
  // =============================================

  async grantProductAccess(access: ProductAccess): Promise<boolean> {
    try {
      logger.info('Granting product access', { 
        userId: access.user_id, 
        productId: access.product_id,
        purchaseId: access.purchase_id 
      });

      // Create purchase record
      const { data: purchase, error: purchaseError } = await this.supabase
        .from('purchases')
        .insert({
          id: access.purchase_id,
          buyer_id: access.user_id,
          product_id: access.product_id,
          payment_id: access.payment_id,
          amount: 0, // Will be updated from payment data
          currency: 'USD', // Will be updated from payment data
          download_count: access.download_count,
          expires_at: access.expires_at,
          is_active: true,
        })
        .select()
        .single();

      if (purchaseError) {
        logError(purchaseError, { action: 'grant_product_access', purchaseId: access.purchase_id });
        return false;
      }

      // Update product sales count
      await this.supabase
        .from('products')
        .update({ 
          updated_at: new Date().toISOString() 
        })
        .eq('id', access.product_id);

      logger.info('Product access granted successfully', { 
        purchaseId: access.purchase_id,
        productId: access.product_id 
      });

      return true;
    } catch (error) {
      logError(error as Error, { action: 'grant_product_access' });
      return false;
    }
  }

  async revokeProductAccess(purchaseId: string): Promise<boolean> {
    try {
      logger.info('Revoking product access', { purchaseId });

      const { error } = await this.supabase
        .from('purchases')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (error) {
        logError(error, { action: 'revoke_product_access', purchaseId });
        return false;
      }

      logger.info('Product access revoked successfully', { purchaseId });
      return true;
    } catch (error) {
      logError(error as Error, { action: 'revoke_product_access', purchaseId });
      return false;
    }
  }

  // =============================================
  // REFERRAL COMMISSION PROCESSING
  // =============================================

  async processReferralCommission(commission: ReferralCommission): Promise<boolean> {
    try {
      logger.info('Processing referral commission', { 
        referralId: commission.referral_id,
        referrerId: commission.referrer_id,
        amount: commission.commission_amount 
      });

      // Update referral stats
      const { error: statsError } = await this.supabase.rpc('update_referral_stats', {
        referral_id: commission.referral_id,
        commission_amount: commission.commission_amount
      });

      if (statsError) {
        logError(statsError, { action: 'process_referral_commission', referralId: commission.referral_id });
        return false;
      }

      // Create commission record (if you have a commissions table)
      const { error: commissionError } = await this.supabase
        .from('referral_commissions')
        .insert({
          id: nanoid(),
          referral_id: commission.referral_id,
          referrer_id: commission.referrer_id,
          product_id: commission.product_id,
          purchase_id: commission.purchase_id,
          amount: commission.commission_amount,
          percent: commission.commission_percent,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (commissionError) {
        logger.warn('Commission record creation failed', { 
          error: commissionError,
          referralId: commission.referral_id 
        });
        // Don't fail the whole process for this
      }

      logger.info('Referral commission processed successfully', { 
        referralId: commission.referral_id,
        amount: commission.commission_amount 
      });

      return true;
    } catch (error) {
      logError(error as Error, { action: 'process_referral_commission' });
      return false;
    }
  }

  async findReferralByCode(referralCode: string, productId: string): Promise<ReferralCommission | null> {
    try {
      const { data: referral, error } = await this.supabase
        .from('referrals')
        .select(`
          id,
          referrer_id,
          product_id,
          reward_percent
        `)
        .eq('referral_code', referralCode)
        .eq('product_id', productId)
        .single();

      if (error || !referral) {
        logger.warn('Referral not found', { referralCode, productId });
        return null;
      }

      return {
        referral_id: referral.id,
        referrer_id: referral.referrer_id,
        product_id: referral.product_id,
        purchase_id: '', // Will be set when processing
        commission_amount: 0, // Will be calculated
        commission_percent: referral.reward_percent,
      };
    } catch (error) {
      logError(error as Error, { action: 'find_referral_by_code', referralCode });
      return null;
    }
  }

  // =============================================
  // EMAIL NOTIFICATIONS
  // =============================================

  async sendEmailNotification(notification: EmailNotification): Promise<boolean> {
    try {
      logger.info('Sending email notification', { 
        to: notification.to,
        template: notification.template 
      });

      // Store notification in database for processing by email service
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          id: nanoid(),
          user_id: notification.data.user_id || '',
          type: 'email',
          title: notification.subject,
          content: JSON.stringify({
            template: notification.template,
            data: notification.data,
          }),
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        logError(error, { action: 'send_email_notification' });
        return false;
      }

      logger.info('Email notification queued successfully', { 
        to: notification.to,
        template: notification.template 
      });

      return true;
    } catch (error) {
      logError(error as Error, { action: 'send_email_notification' });
      return false;
    }
  }

  async sendPaymentSuccessNotification(userId: string, productTitle: string, amount: number, currency: string): Promise<void> {
    const notification: EmailNotification = {
      to: '', // Will be fetched from user data
      subject: 'Payment Successful - Digital Product Access Granted',
      template: 'payment_success',
      data: {
        user_id: userId,
        product_title: productTitle,
        amount,
        currency,
        download_url: `${process.env.NEXT_PUBLIC_APP_URL}/downloads`,
      },
    };

    await this.sendEmailNotification(notification);
  }

  async sendReferralCommissionNotification(referrerId: string, productTitle: string, commissionAmount: number): Promise<void> {
    const notification: EmailNotification = {
      to: '', // Will be fetched from user data
      subject: 'New Referral Commission Earned',
      template: 'referral_commission',
      data: {
        user_id: referrerId,
        product_title: productTitle,
        commission_amount: commissionAmount,
        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/referrals`,
      },
    };

    await this.sendEmailNotification(notification);
  }

  // =============================================
  // AUDIT LOGGING
  // =============================================

  async logWebhookEvent(provider: string, eventType: string, data: any, success: boolean, error?: string): Promise<void> {
    try {
      await this.supabase
        .from('webhook_events')
        .insert({
          id: nanoid(),
          provider,
          event_type: eventType,
          data: JSON.stringify(data),
          success,
          error: error || null,
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
    } catch (logError) {
      // Don't fail the webhook for logging errors
      logger.warn('Failed to log webhook event', { 
        provider, 
        eventType, 
        error: logError 
      });
    }
  }

  async logPaymentEvent(paymentId: string, event: string, data: any): Promise<void> {
    try {
      await this.supabase
        .from('payment_events')
        .insert({
          id: nanoid(),
          payment_id: paymentId,
          event,
          data: JSON.stringify(data),
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      logger.warn('Failed to log payment event', { paymentId, event, error });
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  async getUserById(userId: string): Promise<any> {
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logError(error, { action: 'get_user_by_id', userId });
        return null;
      }

      return user;
    } catch (error) {
      logError(error as Error, { action: 'get_user_by_id', userId });
      return null;
    }
  }

  async getProductById(productId: string): Promise<any> {
    try {
      const { data: product, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        logError(error, { action: 'get_product_by_id', productId });
        return null;
      }

      return product;
    } catch (error) {
      logError(error as Error, { action: 'get_product_by_id', productId });
      return null;
    }
  }

  async updatePaymentStatus(paymentId: string, status: string, metadata?: any): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (metadata) {
        updateData.metadata = JSON.stringify(metadata);
      }

      const { error } = await this.supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) {
        logError(error, { action: 'update_payment_status', paymentId });
        return false;
      }

      return true;
    } catch (error) {
      logError(error as Error, { action: 'update_payment_status', paymentId });
      return false;
    }
  }
}
