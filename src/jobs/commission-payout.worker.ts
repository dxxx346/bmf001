import { Job } from 'bullmq';
import { ReferralService } from '@/services/referral.service';
import { logError, logInfo } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase';
import { addCommissionPayoutJob, addBulkCommissionPayoutsJob } from '@/jobs/queue';

export interface CommissionPayoutJobData {
  referrerId: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod?: string;
  minimumPayout?: number;
}

export interface BulkPayoutJobData {
  periodStart: string;
  periodEnd: string;
  minimumPayout?: number;
  paymentMethod?: string;
}

/**
 * Process individual commission payout for a referrer
 */
export async function processCommissionPayout(job: Job<CommissionPayoutJobData>) {
  const { referrerId, periodStart, periodEnd, paymentMethod = 'bank_transfer', minimumPayout = 50 } = job.data;
  
  try {
    logInfo('Processing commission payout', { referrerId, periodStart, periodEnd });
    
    const referralService = new ReferralService();
    const supabase = createServiceClient();
    
    // Check if user exists and has the partner role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', referrerId)
      .single();
    
    if (userError || !user) {
      throw new Error(`User not found: ${referrerId}`);
    }
    
    if (user.role !== 'partner') {
      throw new Error(`User ${referrerId} is not a partner`);
    }
    
    // Calculate earned commissions for the period
    const { data: conversions, error: convError } = await supabase
      .from('referral_conversions')
      .select(`
        commission_amount,
        referrals!inner(referrer_id)
      `)
      .eq('referrals.referrer_id', referrerId)
      .eq('is_verified', true)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);
    
    if (convError) throw convError;
    
    const totalAmount = conversions.reduce((sum, conv) => 
      sum + parseFloat(conv.commission_amount), 0);
    
    // Check minimum payout threshold
    if (totalAmount < minimumPayout) {
      logInfo('Payout amount below minimum threshold', { 
        referrerId, 
        totalAmount, 
        minimumPayout 
      });
      return {
        success: false,
        reason: 'below_minimum',
        amount: totalAmount,
        minimumPayout
      };
    }
    
    // Check for existing pending payout for this period
    const { data: existingPayout, error: existingError } = await supabase
      .from('commission_payouts')
      .select('id, status')
      .eq('referrer_id', referrerId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .in('status', ['pending', 'processing'])
      .single();
    
    if (!existingError && existingPayout) {
      logInfo('Payout already exists for this period', { 
        referrerId, 
        payoutId: existingPayout.id 
      });
      return {
        success: false,
        reason: 'already_exists',
        payoutId: existingPayout.id
      };
    }
    
    // Generate payout
    const payout = await referralService.generateCommissionPayout(
      referrerId,
      new Date(periodStart),
      new Date(periodEnd),
      paymentMethod
    );
    
    // Send notification to user
    await supabase
      .from('notifications')
      .insert({
        user_id: referrerId,
        type: 'commission_payout',
        title: 'Commission Payout Processed',
        message: `Your commission payout of $${totalAmount.toFixed(2)} has been processed and will be paid soon.`,
        data: {
          payoutId: payout.payoutId,
          amount: payout.amount,
          currency: payout.currency,
          periodStart,
          periodEnd
        }
      });
    
    logInfo('Commission payout processed successfully', {
      referrerId,
      payoutId: payout.payoutId,
      amount: payout.amount
    });
    
    return {
      success: true,
      payoutId: payout.payoutId,
      amount: payout.amount,
      currency: payout.currency
    };
    
  } catch (error) {
    logError(error as Error, { 
      action: 'process_commission_payout', 
      referrerId,
      periodStart,
      periodEnd 
    });
    throw error;
  }
}

/**
 * Process bulk commission payouts for all eligible referrers
 */
export async function processBulkCommissionPayouts(job: Job<BulkPayoutJobData>) {
  const { periodStart, periodEnd, minimumPayout = 50, paymentMethod = 'bank_transfer' } = job.data;
  
  try {
    logInfo('Processing bulk commission payouts', { periodStart, periodEnd, minimumPayout });
    
    const supabase = createServiceClient();
    
    // Get all partners with verified conversions in the period
    const { data: eligibleReferrers, error: referrersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        referrals!inner(
          id,
          referral_conversions!inner(
            commission_amount,
            is_verified,
            created_at
          )
        )
      `)
      .eq('role', 'partner')
      .eq('is_active', true)
      .eq('referrals.referral_conversions.is_verified', true)
      .gte('referrals.referral_conversions.created_at', periodStart)
      .lte('referrals.referral_conversions.created_at', periodEnd);
    
    if (referrersError) throw referrersError;
    
    const results = {
      total: 0,
      processed: 0,
      skipped: 0,
      failed: 0,
      totalAmount: 0,
      details: [] as Array<{
        referrerId: string;
        email: string;
        amount: number;
        status: 'processed' | 'skipped' | 'failed';
        reason?: string;
        payoutId?: string;
      }>
    };
    
    // Process each eligible referrer
    for (const referrer of eligibleReferrers) {
      results.total++;
      
      try {
        // Calculate total earnings for this referrer
        const totalEarnings = referrer.referrals.reduce((sum: number, referral: any) => 
          sum + referral.referral_conversions.reduce((convSum: number, conv: any) =>
            convSum + parseFloat(conv.commission_amount), 0), 0);
        
        if (totalEarnings >= minimumPayout) {
          // Create individual payout job
          const payoutJob = await addCommissionPayoutJob({
            referrerId: referrer.id,
            periodStart,
            periodEnd,
            paymentMethod,
            minimumPayout
          });
          
          results.processed++;
          results.totalAmount += totalEarnings;
          results.details.push({
            referrerId: referrer.id,
            email: referrer.email,
            amount: totalEarnings,
            status: 'processed'
          });
          
          logInfo('Queued individual payout job', {
            referrerId: referrer.id,
            amount: totalEarnings,
            jobId: payoutJob?.id
          });
        } else {
          results.skipped++;
          results.details.push({
            referrerId: referrer.id,
            email: referrer.email,
            amount: totalEarnings,
            status: 'skipped',
            reason: 'below_minimum'
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          referrerId: referrer.id,
          email: referrer.email,
          amount: 0,
          status: 'failed',
          reason: (error as Error).message
        });
        
        logError(error as Error, {
          action: 'bulk_payout_individual',
          referrerId: referrer.id
        });
      }
    }
    
    logInfo('Bulk commission payouts completed', results);
    
    return results;
    
  } catch (error) {
    logError(error as Error, { 
      action: 'process_bulk_commission_payouts',
      periodStart,
      periodEnd 
    });
    throw error;
  }
}

/**
 * Schedule monthly commission payouts
 */
export async function scheduleMonthlyPayouts() {
  try {
    logInfo('Scheduling monthly commission payouts');
    
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodStart = lastMonth.toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    
    // Add bulk payout job to queue
    await addBulkCommissionPayoutsJob({
      periodStart,
      periodEnd,
      minimumPayout: 50,
      paymentMethod: 'bank_transfer'
    });
    
    logInfo('Monthly commission payouts scheduled', {
      periodStart,
      periodEnd
    });
    
  } catch (error) {
    logError(error as Error, { action: 'schedule_monthly_payouts' });
    throw error;
  }
}

/**
 * Process payout through external payment provider
 */
export async function processPaymentProvider(
  payoutId: string,
  provider: 'stripe' | 'paypal' | 'bank_transfer'
) {
  try {
    logInfo('Processing payout through payment provider', { payoutId, provider });
    
    const supabase = createServiceClient();
    const referralService = new ReferralService();
    
    // Get payout details
    const { data: payout, error: payoutError } = await supabase
      .from('commission_payouts')
      .select(`
        *,
        users!inner(email, name)
      `)
      .eq('id', payoutId)
      .eq('status', 'pending')
      .single();
    
    if (payoutError || !payout) {
      throw new Error(`Payout not found or not in pending status: ${payoutId}`);
    }
    
    // Update status to processing
    await referralService.updatePayoutStatus(payoutId, 'processing');
    
    let externalTransactionId: string | undefined;
    
    try {
      switch (provider) {
        case 'stripe':
          externalTransactionId = await processStripeTransfer(payout);
          break;
        case 'paypal':
          externalTransactionId = await processPayPalTransfer(payout);
          break;
        case 'bank_transfer':
          externalTransactionId = await processBankTransfer(payout);
          break;
        default:
          throw new Error(`Unsupported payment provider: ${provider}`);
      }
      
      // Update status to paid
      await referralService.updatePayoutStatus(payoutId, 'paid', externalTransactionId);
      
      // Send success notification
      await supabase
        .from('notifications')
        .insert({
          user_id: payout.referrer_id,
          type: 'payout_completed',
          title: 'Commission Paid',
          message: `Your commission payment of $${payout.amount} has been sent successfully.`,
          data: {
            payoutId,
            amount: payout.amount,
            provider,
            transactionId: externalTransactionId
          }
        });
      
      logInfo('Payout processed successfully', {
        payoutId,
        provider,
        amount: payout.amount,
        transactionId: externalTransactionId
      });
      
      return {
        success: true,
        transactionId: externalTransactionId
      };
      
    } catch (processingError) {
      // Update status to failed
      await referralService.updatePayoutStatus(payoutId, 'failed');
      
      // Send failure notification
      await supabase
        .from('notifications')
        .insert({
          user_id: payout.referrer_id,
          type: 'payout_failed',
          title: 'Commission Payment Failed',
          message: `There was an issue processing your commission payment. Please contact support.`,
          data: {
            payoutId,
            amount: payout.amount,
            provider,
            error: (processingError as Error).message
          }
        });
      
      throw processingError;
    }
    
  } catch (error) {
    logError(error as Error, { action: 'process_payment_provider', payoutId, provider });
    throw error;
  }
}

/**
 * Process Stripe transfer (placeholder)
 */
async function processStripeTransfer(payout: any): Promise<string> {
  // Implementation would integrate with Stripe API for transfers
  // This is a placeholder for the actual Stripe integration
  
  // For now, simulate successful transfer
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `stripe_${Date.now()}`;
}

/**
 * Process PayPal transfer (placeholder)
 */
async function processPayPalTransfer(payout: any): Promise<string> {
  // Implementation would integrate with PayPal API for payouts
  // This is a placeholder for the actual PayPal integration
  
  // For now, simulate successful transfer
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `paypal_${Date.now()}`;
}

/**
 * Process bank transfer (placeholder)
 */
async function processBankTransfer(payout: any): Promise<string> {
  // Implementation would integrate with banking API or manual processing
  // This is a placeholder for the actual bank transfer integration
  
  // For now, simulate successful transfer
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `bank_${Date.now()}`;
}
