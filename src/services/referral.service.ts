import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { logError, logInfo } from '@/lib/logger';
import crypto from 'crypto';

interface ReferralCode {
  id: string;
  referral_code: string;
  reward_type: 'percentage' | 'fixed';
  reward_value: number;
  is_active: boolean;
  expires_at?: string;
}

interface CommissionTier {
  tier_level: number;
  tier_name: string;
  commission_percentage: number;
  bonus_amount: number;
  total_referrals: number;
  next_tier_level?: number;
  referrals_to_next_tier?: number;
}

interface ReferralTracking {
  id: string;
  referral_code: string;
  visitor_ip?: string;
  visitor_fingerprint: string;
  user_agent?: string;
  referrer_url?: string;
  landing_page?: string;
  country?: string;
  city?: string;
  cookie_value: string;
  expires_at: string;
}

interface FraudDetectionResult {
  is_suspicious: boolean;
  fraud_score: number;
  fraud_types: string[];
  details: Record<string, any>;
}

interface ConversionResult {
  conversion_id: string;
  commission_amount: number;
  fraud_score: number;
  is_verified: boolean;
  tier_level: number;
  tier_name: string;
}

interface ShortLink {
  id: string;
  short_code: string;
  original_url: string;
  title?: string;
  description?: string;
  click_count: number;
  expires_at?: string;
}

export class ReferralService {
  private supabase = createServiceClient();

  /**
   * Generate a unique referral code for a user and product/shop
   */
  async generateReferralCode(
    referrerId: string,
    productId?: string,
    shopId?: string,
    rewardType: 'percentage' | 'fixed' = 'percentage',
    rewardValue: number = 10,
    expiresInDays?: number
  ): Promise<ReferralCode> {
    try {
      // Generate unique referral code using database function
      const { data: codeData, error: codeError } = await this.supabase
        .rpc('generate_referral_code', { length_param: 8 });

      if (codeError) throw codeError;

      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await this.supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          product_id: productId,
          shop_id: shopId,
          referral_code: codeData,
          reward_type: rewardType,
          reward_value: rewardValue,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;

      logInfo('Referral code generated', {
        referrerId,
        productId,
        shopId,
        referralCode: codeData
      });

      return data;
    } catch (error) {
      logError(error as Error, { action: 'generate_referral_code', referrerId });
      throw error;
    }
  }

  /**
   * Get user's commission tier information
   */
  async getUserCommissionTier(userId: string): Promise<CommissionTier> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_commission_tier', { user_id: userId });

      if (error) throw error;

      return data[0];
    } catch (error) {
      logError(error as Error, { action: 'get_user_commission_tier', userId });
      throw error;
    }
  }

  /**
   * Create tracking cookie for referral link click
   */
  async createTrackingCookie(
    referralCode: string,
    request: {
      ip?: string;
      userAgent?: string;
      referrerUrl?: string;
      landingPage?: string;
      country?: string;
      city?: string;
    }
  ): Promise<ReferralTracking> {
    try {
      // Generate unique cookie value
      const cookieValue = crypto.randomBytes(32).toString('hex');
      
      // Create browser fingerprint
      const fingerprint = this.generateFingerprint(request.userAgent, request.ip);

      const { data, error } = await this.supabase
        .from('referral_tracking')
        .insert({
          referral_code: referralCode,
          visitor_ip: request.ip,
          visitor_fingerprint: fingerprint,
          user_agent: request.userAgent,
          referrer_url: request.referrerUrl,
          landing_page: request.landingPage,
          country: request.country,
          city: request.city,
          cookie_value: cookieValue,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select()
        .single();

      if (error) throw error;

      // Also track the click in referral_clicks table
      await this.trackReferralClick(referralCode, request);

      return data;
    } catch (error) {
      logError(error as Error, { action: 'create_tracking_cookie', referralCode });
      throw error;
    }
  }

  /**
   * Track referral click
   */
  async trackReferralClick(
    referralCode: string,
    request: {
      ip?: string;
      userAgent?: string;
      referrerUrl?: string;
    }
  ): Promise<void> {
    try {
      // Get referral ID from code
      const { data: referral, error: referralError } = await this.supabase
        .from('referrals')
        .select('id')
        .eq('referral_code', referralCode)
        .eq('is_active', true)
        .single();

      if (referralError || !referral) return;

      // Use database function to increment clicks
      const { error } = await this.supabase
        .rpc('increment_referral_clicks', {
          referral_id: referral.id,
          visitor_ip: request.ip,
          user_agent: request.userAgent,
          referrer_url: request.referrerUrl
        });

      if (error) throw error;
    } catch (error) {
      logError(error as Error, { action: 'track_referral_click', referralCode });
    }
  }

  /**
   * Process referral conversion when purchase is made
   */
  async processConversion(
    purchaseId: string,
    cookieValue?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConversionResult | null> {
    try {
      let referralId: string | null = null;
      let clickTime: string | null = null;

      // Find referral from cookie if provided
      if (cookieValue) {
        const { data: tracking, error: trackingError } = await this.supabase
          .from('referral_tracking')
          .select(`
            *,
            referrals!inner(id, referral_code)
          `)
          .eq('cookie_value', cookieValue)
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString())
          .single();

        if (!trackingError && tracking) {
          referralId = tracking.referrals.id;
          clickTime = tracking.created_at;

          // Mark tracking as converted
          await this.supabase
            .from('referral_tracking')
            .update({
              converted_at: new Date().toISOString(),
              purchase_id: purchaseId
            })
            .eq('id', tracking.id);
        }
      }

      if (!referralId) return null;

      // Process conversion with fraud detection
      const { data, error } = await this.supabase
        .rpc('process_referral_conversion_enhanced', {
          referral_id: referralId,
          purchase_id: purchaseId,
          ip_address: ipAddress,
          user_agent: userAgent,
          click_time: clickTime
        });

      if (error) throw error;

      logInfo('Referral conversion processed', {
        purchaseId,
        referralId,
        commissionAmount: data.commission_amount,
        fraudScore: data.fraud_score
      });

      return data;
    } catch (error) {
      logError(error as Error, { action: 'process_conversion', purchaseId });
      return null;
    }
  }

  /**
   * Analyze fraud patterns for a referral
   */
  async analyzeFraud(referralId: string): Promise<FraudDetectionResult> {
    try {
      const fraudTypes: string[] = [];
      const details: Record<string, any> = {};
      let fraudScore = 0;

      // Check for IP abuse
      const { data: ipClicks, error: ipError } = await this.supabase
        .from('referral_clicks')
        .select('visitor_ip, clicked_at')
        .eq('referral_id', referralId)
        .gte('clicked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!ipError && ipClicks) {
        const ipCounts = ipClicks.reduce((acc: Record<string, number>, click) => {
          if (click.visitor_ip) {
            acc[click.visitor_ip] = (acc[click.visitor_ip] || 0) + 1;
          }
          return acc;
        }, {});

        const suspiciousIPs = Object.entries(ipCounts).filter(([_, count]) => (count as number) > 10);
        if (suspiciousIPs.length > 0) {
          fraudTypes.push('ip_abuse');
          fraudScore += 0.3;
          details.suspicious_ips = suspiciousIPs;
        }
      }

      // Check for bot traffic patterns
      const { data: userAgents, error: uaError } = await this.supabase
        .from('referral_clicks')
        .select('user_agent, clicked_at')
        .eq('referral_id', referralId)
        .gte('clicked_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      if (!uaError && userAgents) {
        const botPatterns = [
          /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i
        ];
        
        const botClicks = userAgents.filter(click => 
          click.user_agent && botPatterns.some(pattern => pattern.test(click.user_agent))
        );

        if (botClicks.length > 0) {
          fraudTypes.push('bot_traffic');
          fraudScore += 0.2;
          details.bot_clicks = botClicks.length;
        }
      }

      // Check conversion patterns
      const { data: conversions, error: convError } = await this.supabase
        .from('referral_conversions')
        .select('created_at, ip_address')
        .eq('referral_id', referralId)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (!convError && conversions && conversions.length > 3) {
        fraudTypes.push('suspicious_pattern');
        fraudScore += 0.25;
        details.rapid_conversions = conversions.length;
      }

      return {
        is_suspicious: fraudScore >= 0.5,
        fraud_score: Math.min(fraudScore, 1.0),
        fraud_types: fraudTypes,
        details
      };
    } catch (error) {
      logError(error as Error, { action: 'analyze_fraud', referralId });
      return {
        is_suspicious: false,
        fraud_score: 0,
        fraud_types: [],
        details: {}
      };
    }
  }

  /**
   * Create short link for referral
   */
  async createShortLink(
    referralId: string,
    originalUrl: string,
    title?: string,
    description?: string,
    expiresInDays?: number
  ): Promise<ShortLink> {
    try {
      const { data: shortCode, error: codeError } = await this.supabase
        .rpc('create_short_link', {
          referral_id: referralId,
          original_url: originalUrl,
          title,
          description,
          expires_days: expiresInDays
        });

      if (codeError) throw codeError;

      const { data, error } = await this.supabase
        .from('short_links')
        .select('*')
        .eq('short_code', shortCode)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logError(error as Error, { action: 'create_short_link', referralId });
      throw error;
    }
  }

  /**
   * Track short link click and get redirect info
   */
  async trackShortLinkClick(shortCode: string): Promise<{
    redirectUrl: string;
    referralId: string;
    title?: string;
    description?: string;
  } | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('track_short_link_click', { short_code: shortCode });

      if (error) throw error;

      if (data.error) {
        return null;
      }

      return {
        redirectUrl: data.redirect_url,
        referralId: data.referral_id,
        title: data.title,
        description: data.description
      };
    } catch (error) {
      logError(error as Error, { action: 'track_short_link_click', shortCode });
      return null;
    }
  }

  /**
   * Get referral analytics for dashboard
   */
  async getReferralAnalytics(
    referrerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalClicks: number;
    uniqueClicks: number;
    totalConversions: number;
    totalEarned: number;
    conversionRate: number;
    averageOrderValue: number;
    topPerformingLinks: Array<{
      referral_code: string;
      clicks: number;
      conversions: number;
      earned: number;
    }>;
    dailyStats: Array<{
      date: string;
      clicks: number;
      conversions: number;
      revenue: number;
    }>;
  }> {
    try {
      const start = startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate?.toISOString() || new Date().toISOString();

      // Get overall stats
      const { data: overallStats, error: statsError } = await this.supabase
        .from('referrals')
        .select(`
          *,
          referral_stats(*),
          referral_conversions(*)
        `)
        .eq('referrer_id', referrerId)
        .gte('created_at', start)
        .lte('created_at', end);

      if (statsError) throw statsError;

      // Calculate totals
      const totalClicks = overallStats.reduce((sum, ref) => 
        sum + (ref.referral_stats?.[0]?.click_count || 0), 0);
      
      const uniqueClicks = totalClicks; // For simplicity, assuming all clicks are unique
      
      const totalConversions = overallStats.reduce((sum, ref) => 
        sum + (ref.referral_stats?.[0]?.conversion_count || 0), 0);
      
      const totalEarned = overallStats.reduce((sum, ref) => 
        sum + parseFloat(ref.referral_stats?.[0]?.total_earned || '0'), 0);

      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const averageOrderValue = totalConversions > 0 ? totalEarned / totalConversions : 0;

      // Get top performing links
      const topPerformingLinks = overallStats
        .filter(ref => ref.referral_stats?.[0])
        .map(ref => ({
          referral_code: ref.referral_code,
          clicks: ref.referral_stats[0].click_count || 0,
          conversions: ref.referral_stats[0].conversion_count || 0,
          earned: parseFloat(ref.referral_stats[0].total_earned || '0')
        }))
        .sort((a, b) => b.earned - a.earned)
        .slice(0, 10);

      // Get daily stats from analytics table
      const { data: dailyStats, error: dailyError } = await this.supabase
        .from('referral_analytics')
        .select(`
          date,
          clicks,
          conversions,
          revenue
        `)
        .in('referral_id', overallStats.map(ref => ref.id))
        .gte('date', start.split('T')[0])
        .lte('date', end.split('T')[0])
        .order('date');

      if (dailyError) throw dailyError;

      // Aggregate daily stats by date
      const dailyAggregated = dailyStats.reduce((acc: Record<string, any>, stat) => {
        const date = stat.date;
        if (!acc[date]) {
          acc[date] = { date, clicks: 0, conversions: 0, revenue: 0 };
        }
        acc[date].clicks += stat.clicks || 0;
        acc[date].conversions += stat.conversions || 0;
        acc[date].revenue += parseFloat(stat.revenue || '0');
        return acc;
      }, {});

      return {
        totalClicks,
        uniqueClicks,
        totalConversions,
        totalEarned,
        conversionRate,
        averageOrderValue,
        topPerformingLinks,
        dailyStats: Object.values(dailyAggregated)
      };
    } catch (error) {
      logError(error as Error, { action: 'get_referral_analytics', referrerId });
      throw error;
    }
  }

  /**
   * Generate commission payout for a referrer
   */
  async generateCommissionPayout(
    referrerId: string,
    periodStart: Date,
    periodEnd: Date,
    paymentMethod: string = 'bank_transfer'
  ): Promise<{
    payoutId: string;
    amount: number;
    currency: string;
  }> {
    try {
      // Calculate total earned commissions for the period
      const { data: conversions, error: convError } = await this.supabase
        .from('referral_conversions')
        .select(`
          commission_amount,
          referrals!inner(referrer_id)
        `)
        .eq('referrals.referrer_id', referrerId)
        .eq('is_verified', true)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      if (convError) throw convError;

      const totalAmount = conversions.reduce((sum, conv) => 
        sum + parseFloat(conv.commission_amount), 0);

      if (totalAmount <= 0) {
        throw new Error('No commissions to payout for this period');
      }

      // Create payout record
      const { data: payout, error: payoutError } = await this.supabase
        .from('commission_payouts')
        .insert({
          referrer_id: referrerId,
          amount: totalAmount,
          currency: 'USD',
          payment_method: paymentMethod,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (payoutError) throw payoutError;

      logInfo('Commission payout generated', {
        referrerId,
        amount: totalAmount,
        payoutId: payout.id
      });

      return {
        payoutId: payout.id,
        amount: totalAmount,
        currency: 'USD'
      };
    } catch (error) {
      logError(error as Error, { action: 'generate_commission_payout', referrerId });
      throw error;
    }
  }

  /**
   * Get pending payouts for processing
   */
  async getPendingPayouts(): Promise<Array<{
    id: string;
    referrer_id: string;
    amount: number;
    currency: string;
    payment_method: string;
    created_at: string;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('commission_payouts')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      logError(error as Error, { action: 'get_pending_payouts' });
      throw error;
    }
  }

  /**
   * Update payout status
   */
  async updatePayoutStatus(
    payoutId: string,
    status: 'processing' | 'paid' | 'failed' | 'cancelled',
    externalTransactionId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        processed_at: new Date().toISOString()
      };

      if (externalTransactionId) {
        updateData.external_transaction_id = externalTransactionId;
      }

      const { error } = await this.supabase
        .from('commission_payouts')
        .update(updateData)
        .eq('id', payoutId);

      if (error) throw error;

      logInfo('Payout status updated', { payoutId, status });
    } catch (error) {
      logError(error as Error, { action: 'update_payout_status', payoutId });
      throw error;
    }
  }

  /**
   * Generate browser fingerprint for tracking
   */
  private generateFingerprint(userAgent?: string, ip?: string): string {
    const data = `${userAgent || 'unknown'}_${ip || 'unknown'}_${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Clean up expired tracking cookies
   */
  async cleanupExpiredTracking(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('referral_tracking')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;

      logInfo('Expired tracking cookies cleaned up');
    } catch (error) {
      logError(error as Error, { action: 'cleanup_expired_tracking' });
    }
  }
}
