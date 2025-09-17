import { createServiceClient } from '@/lib/supabase';
import { 
  ReviewIncentive, 
  ReviewIncentiveClaim, 
  ReviewIncentiveRequest,
  ReviewIncentiveStats,
  IncentiveType,
  IncentiveClaimStatus,
  Review
} from '@/types/review';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || '');

export class ReviewIncentiveService {
  private supabase = createServiceClient();

  // Create a new review incentive program
  async createIncentive(userId: string, data: ReviewIncentiveRequest): Promise<ReviewIncentive> {
    // Validate user permissions
    await this.validateIncentiveCreator(userId, data.product_id, data.shop_id);

    const incentiveData = {
      product_id: data.product_id,
      shop_id: data.shop_id,
      incentive_type: data.incentive_type,
      incentive_value: data.incentive_value,
      minimum_rating: data.minimum_rating,
      minimum_words: data.minimum_words || 10,
      requires_verification: data.requires_verification ?? true,
      max_uses: data.max_uses,
      expires_at: data.expires_at,
      created_by: userId,
      is_active: true
    };

    const { data: incentive, error } = await this.supabase
      .from('review_incentives')
      .insert(incentiveData)
      .select()
      .single();

    if (error) throw error;

    // Cache active incentives
    await this.cacheActiveIncentives();

    return incentive;
  }

  // Get incentives for a product or shop
  async getIncentives(filters: {
    product_id?: string;
    shop_id?: string;
    is_active?: boolean;
    incentive_type?: IncentiveType;
  }): Promise<ReviewIncentive[]> {
    let query = this.supabase
      .from('review_incentives')
      .select('*');

    if (filters.product_id) query = query.eq('product_id', filters.product_id);
    if (filters.shop_id) query = query.eq('shop_id', filters.shop_id);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
    if (filters.incentive_type) query = query.eq('incentive_type', filters.incentive_type);

    // Filter out expired incentives
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Check if a review qualifies for incentives
  async checkReviewEligibility(reviewId: string): Promise<{
    eligible: boolean;
    incentives: ReviewIncentive[];
    reasons: string[];
  }> {
    const review = await this.getReviewById(reviewId);
    if (!review) {
      return { eligible: false, incentives: [], reasons: ['Review not found'] };
    }

    // Get active incentives for the product
    const incentives = await this.getIncentives({
      product_id: review.product_id,
      is_active: true
    });

    const eligibleIncentives: ReviewIncentive[] = [];
    const reasons: string[] = [];

    for (const incentive of incentives) {
      const eligibilityCheck = await this.checkIncentiveEligibility(review, incentive);
      if (eligibilityCheck.eligible) {
        eligibleIncentives.push(incentive);
      } else {
        reasons.push(...eligibilityCheck.reasons);
      }
    }

    return {
      eligible: eligibleIncentives.length > 0,
      incentives: eligibleIncentives,
      reasons: reasons
    };
  }

  // Process incentive claims for a review
  async processReviewIncentives(reviewId: string): Promise<void> {
    const eligibility = await this.checkReviewEligibility(reviewId);
    
    if (!eligibility.eligible) {
      console.log(`Review ${reviewId} not eligible for incentives:`, eligibility.reasons);
      return;
    }

    const review = await this.getReviewById(reviewId);
    if (!review) return;

    // Process each eligible incentive
    for (const incentive of eligibility.incentives) {
      try {
        await this.claimIncentive(incentive.id, reviewId, review.user_id);
      } catch (error) {
        console.error(`Failed to claim incentive ${incentive.id} for review ${reviewId}:`, error);
      }
    }
  }

  // Claim an incentive for a review
  async claimIncentive(incentiveId: string, reviewId: string, userId: string): Promise<ReviewIncentiveClaim> {
    // Check if already claimed
    const existingClaim = await this.getExistingClaim(incentiveId, reviewId);
    if (existingClaim) {
      throw new Error('Incentive already claimed for this review');
    }

    // Get incentive details
    const incentive = await this.getIncentiveById(incentiveId);
    if (!incentive) {
      throw new Error('Incentive not found');
    }

    // Check usage limits
    if (incentive.max_uses && incentive.current_uses >= incentive.max_uses) {
      throw new Error('Incentive usage limit reached');
    }

    // Create claim
    const claimData = {
      incentive_id: incentiveId,
      review_id: reviewId,
      user_id: userId,
      claimed_value: incentive.incentive_value,
      status: 'pending' as IncentiveClaimStatus
    };

    const { data: claim, error } = await this.supabase
      .from('review_incentive_claims')
      .insert(claimData)
      .select()
      .single();

    if (error) throw error;

    // Update incentive usage count
    await this.supabase
      .from('review_incentives')
      .update({ current_uses: incentive.current_uses + 1 })
      .eq('id', incentiveId);

    // Add to processing queue
    await this.addToProcessingQueue(claim);

    return claim;
  }

  // Process pending incentive claims
  async processPendingClaims(): Promise<void> {
    const { data: pendingClaims } = await this.supabase
      .from('review_incentive_claims')
      .select(`
        *,
        incentive:review_incentives(*),
        review:reviews(*),
        user:users(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (!pendingClaims || pendingClaims.length === 0) return;

    for (const claim of pendingClaims) {
      try {
        await this.processClaim(claim);
      } catch (error) {
        console.error(`Failed to process claim ${claim.id}:`, error);
        await this.markClaimFailed(claim.id, error.message);
      }
    }
  }

  // Process individual claim
  private async processClaim(claim: any): Promise<void> {
    // Validate the claim is still valid
    const validation = await this.validateClaim(claim);
    if (!validation.valid) {
      await this.rejectClaim(claim.id, validation.reason || 'Invalid claim');
      return;
    }

    // Process based on incentive type
    switch (claim.incentive.incentive_type) {
      case 'points':
        await this.awardPoints(claim.user_id, claim.claimed_value);
        break;
      case 'discount':
        await this.createDiscountCode(claim.user_id, claim.claimed_value);
        break;
      case 'cashback':
        await this.processCashback(claim.user_id, claim.claimed_value);
        break;
      case 'badge':
        await this.awardBadge(claim.user_id, claim.incentive.id);
        break;
    }

    // Mark claim as approved
    await this.approveClaim(claim.id);

    // Send notification to user
    await this.notifyUserOfReward(claim.user_id, claim);
  }

  // Award points to user
  private async awardPoints(userId: string, points: number): Promise<void> {
    // Update user points balance
    const { data: user } = await this.supabase
      .from('users')
      .select('metadata')
      .eq('id', userId)
      .single();

    const currentPoints = user?.metadata?.points || 0;
    const newPoints = currentPoints + points;

    await this.supabase
      .from('users')
      .update({
        metadata: {
          ...user?.metadata,
          points: newPoints
        }
      })
      .eq('id', userId);

    // Log points transaction
    await this.logPointsTransaction(userId, points, 'review_incentive');
  }

  // Create discount code
  private async createDiscountCode(userId: string, discountPercent: number): Promise<void> {
    const discountCode = this.generateDiscountCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store discount code (would integrate with your discount system)
    await this.supabase
      .from('discount_codes')
      .insert({
        code: discountCode,
        user_id: userId,
        discount_percent: discountPercent,
        expires_at: expiresAt.toISOString(),
        source: 'review_incentive',
        is_active: true
      });
  }

  // Process cashback
  private async processCashback(userId: string, amount: number): Promise<void> {
    // Add to user's cashback balance
    const { data: user } = await this.supabase
      .from('users')
      .select('metadata')
      .eq('id', userId)
      .single();

    const currentCashback = user?.metadata?.cashback_balance || 0;
    const newBalance = currentCashback + amount;

    await this.supabase
      .from('users')
      .update({
        metadata: {
          ...user?.metadata,
          cashback_balance: newBalance
        }
      })
      .eq('id', userId);

    // Log cashback transaction
    await this.logCashbackTransaction(userId, amount, 'review_incentive');
  }

  // Award badge to user
  private async awardBadge(userId: string, incentiveId: string): Promise<void> {
    const badge = {
      user_id: userId,
      badge_type: 'reviewer',
      badge_name: 'Verified Reviewer',
      description: 'Earned for writing quality reviews',
      earned_at: new Date().toISOString(),
      source: 'review_incentive',
      source_id: incentiveId
    };

    await this.supabase
      .from('user_badges')
      .insert(badge);
  }

  // Validate claim eligibility
  private async validateClaim(claim: any): Promise<{ valid: boolean; reason?: string }> {
    // Check if incentive is still active
    if (!claim.incentive.is_active) {
      return { valid: false, reason: 'Incentive is no longer active' };
    }

    // Check expiry
    if (claim.incentive.expires_at && new Date(claim.incentive.expires_at) < new Date()) {
      return { valid: false, reason: 'Incentive has expired' };
    }

    // Check usage limits
    if (claim.incentive.max_uses && claim.incentive.current_uses > claim.incentive.max_uses) {
      return { valid: false, reason: 'Incentive usage limit exceeded' };
    }

    // Check review still meets criteria
    const review = claim.review;
    if (review.status !== 'approved' || review.moderation_status !== 'approved') {
      return { valid: false, reason: 'Review is not approved' };
    }

    // Check minimum rating
    if (claim.incentive.minimum_rating && review.rating < claim.incentive.minimum_rating) {
      return { valid: false, reason: 'Review rating below minimum requirement' };
    }

    // Check minimum words
    if (claim.incentive.minimum_words && review.content) {
      const wordCount = review.content.split(/\s+/).length;
      if (wordCount < claim.incentive.minimum_words) {
        return { valid: false, reason: 'Review content below minimum word requirement' };
      }
    }

    // Check verification requirement
    if (claim.incentive.requires_verification && !review.is_verified) {
      return { valid: false, reason: 'Review is not from verified purchase' };
    }

    return { valid: true };
  }

  // Check individual incentive eligibility
  private async checkIncentiveEligibility(review: Review, incentive: ReviewIncentive): Promise<{
    eligible: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    // Check if review is approved
    if (review.status !== 'approved' || review.moderation_status !== 'approved') {
      reasons.push('Review must be approved');
    }

    // Check minimum rating
    if (incentive.minimum_rating && review.rating < incentive.minimum_rating) {
      reasons.push(`Minimum rating of ${incentive.minimum_rating} required`);
    }

    // Check minimum words
    if (incentive.minimum_words && review.content) {
      const wordCount = review.content.split(/\s+/).length;
      if (wordCount < incentive.minimum_words) {
        reasons.push(`Minimum ${incentive.minimum_words} words required`);
      }
    }

    // Check verification requirement
    if (incentive.requires_verification && !review.is_verified) {
      reasons.push('Verified purchase required');
    }

    // Check usage limits
    if (incentive.max_uses && incentive.current_uses >= incentive.max_uses) {
      reasons.push('Incentive usage limit reached');
    }

    // Check expiry
    if (incentive.expires_at && new Date(incentive.expires_at) < new Date()) {
      reasons.push('Incentive has expired');
    }

    // Check if already claimed
    const existingClaim = await this.getExistingClaim(incentive.id, review.id);
    if (existingClaim) {
      reasons.push('Already claimed');
    }

    return {
      eligible: reasons.length === 0,
      reasons
    };
  }

  // Get incentive statistics
  async getIncentiveStats(filters: {
    product_id?: string;
    shop_id?: string;
    created_by?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ReviewIncentiveStats> {
    let incentiveQuery = this.supabase
      .from('review_incentives')
      .select('*');

    let claimQuery = this.supabase
      .from('review_incentive_claims')
      .select('*');

    // Apply filters
    if (filters.product_id) {
      incentiveQuery = incentiveQuery.eq('product_id', filters.product_id);
    }
    if (filters.shop_id) {
      incentiveQuery = incentiveQuery.eq('shop_id', filters.shop_id);
    }
    if (filters.created_by) {
      incentiveQuery = incentiveQuery.eq('created_by', filters.created_by);
    }
    if (filters.date_from) {
      incentiveQuery = incentiveQuery.gte('created_at', filters.date_from);
      claimQuery = claimQuery.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      incentiveQuery = incentiveQuery.lte('created_at', filters.date_to);
      claimQuery = claimQuery.lte('created_at', filters.date_to);
    }

    const [{ data: incentives }, { data: claims }] = await Promise.all([
      incentiveQuery,
      claimQuery
    ]);

    const total_incentives = incentives?.length || 0;
    const active_incentives = incentives?.filter(i => i.is_active).length || 0;
    const total_claims = claims?.length || 0;
    const approved_claims = claims?.filter(c => c.status === 'approved').length || 0;
    const approval_rate = total_claims > 0 ? (approved_claims / total_claims) * 100 : 0;
    const total_value_distributed = claims
      ?.filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + c.claimed_value, 0) || 0;

    // Calculate conversion rate (claims / eligible reviews)
    // This would need more complex logic to determine eligible reviews
    const conversion_rate = 15; // Placeholder

    return {
      total_incentives,
      active_incentives,
      total_claims,
      approval_rate,
      total_value_distributed,
      conversion_rate
    };
  }

  // Update incentive
  async updateIncentive(
    incentiveId: string, 
    userId: string, 
    updates: Partial<ReviewIncentiveRequest>
  ): Promise<ReviewIncentive> {
    // Validate ownership
    const incentive = await this.getIncentiveById(incentiveId);
    if (!incentive || incentive.created_by !== userId) {
      throw new Error('Incentive not found or unauthorized');
    }

    const { data, error } = await this.supabase
      .from('review_incentives')
      .update(updates)
      .eq('id', incentiveId)
      .select()
      .single();

    if (error) throw error;

    // Update cache
    await this.cacheActiveIncentives();

    return data;
  }

  // Deactivate incentive
  async deactivateIncentive(incentiveId: string, userId: string): Promise<void> {
    await this.updateIncentive(incentiveId, userId, { is_active: false } as unknown as Partial<ReviewIncentiveRequest>);
  }

  // Helper methods

  private async getReviewById(reviewId: string): Promise<Review | null> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (error) return null;
    return data;
  }

  private async getIncentiveById(incentiveId: string): Promise<ReviewIncentive | null> {
    const { data, error } = await this.supabase
      .from('review_incentives')
      .select('*')
      .eq('id', incentiveId)
      .single();

    if (error) return null;
    return data;
  }

  private async getExistingClaim(incentiveId: string, reviewId: string): Promise<ReviewIncentiveClaim | null> {
    const { data, error } = await this.supabase
      .from('review_incentive_claims')
      .select('*')
      .eq('incentive_id', incentiveId)
      .eq('review_id', reviewId)
      .single();

    if (error) return null;
    return data;
  }

  private async validateIncentiveCreator(userId: string, productId?: string, shopId?: string): Promise<void> {
    if (productId) {
      const { data: product } = await this.supabase
        .from('products')
        .select('seller_id')
        .eq('id', productId)
        .single();

      if (!product || product.seller_id !== userId) {
        throw new Error('Unauthorized to create incentive for this product');
      }
    }

    if (shopId) {
      const { data: shop } = await this.supabase
        .from('shops')
        .select('owner_id')
        .eq('id', shopId)
        .single();

      if (!shop || shop.owner_id !== userId) {
        throw new Error('Unauthorized to create incentive for this shop');
      }
    }
  }

  private async addToProcessingQueue(claim: ReviewIncentiveClaim): Promise<void> {
    await redis.lpush('incentive_claims_queue', JSON.stringify({
      claim_id: claim.id,
      created_at: new Date().toISOString()
    }));
  }

  private async approveClaim(claimId: string): Promise<void> {
    await this.supabase
      .from('review_incentive_claims')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString()
      })
      .eq('id', claimId);
  }

  private async rejectClaim(claimId: string, reason: string): Promise<void> {
    await this.supabase
      .from('review_incentive_claims')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
        // Could add rejection_reason field to store reason
      })
      .eq('id', claimId);
  }

  private async markClaimFailed(claimId: string, error: string): Promise<void> {
    // Log error and possibly retry later
    console.error(`Claim ${claimId} failed:`, error);
  }

  private async cacheActiveIncentives(): Promise<void> {
    const { data: incentives } = await this.supabase
      .from('review_incentives')
      .select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (incentives) {
      await redis.setex('active_incentives', 3600, JSON.stringify(incentives));
    }
  }

  private generateDiscountCode(): string {
    return 'REVIEW' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private async logPointsTransaction(userId: string, points: number, source: string): Promise<void> {
    // This would integrate with a points/loyalty system
    console.log(`Awarded ${points} points to user ${userId} from ${source}`);
  }

  private async logCashbackTransaction(userId: string, amount: number, source: string): Promise<void> {
    // This would integrate with a cashback/wallet system
    console.log(`Added ${amount} cashback to user ${userId} from ${source}`);
  }

  private async notifyUserOfReward(userId: string, claim: any): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'incentive_earned',
        title: 'Review Reward Earned!',
        message: `You've earned a ${claim.incentive.incentive_type} reward for your review!`,
        data: {
          claim_id: claim.id,
          incentive_type: claim.incentive.incentive_type,
          value: claim.claimed_value
        }
      });

    if (error) {
      console.error('Failed to send reward notification:', error);
    }
  }

  // Bulk operations
  async bulkCreateIncentives(
    userId: string, 
    incentives: ReviewIncentiveRequest[]
  ): Promise<ReviewIncentive[]> {
    const results: ReviewIncentive[] = [];

    for (const incentiveData of incentives) {
      try {
        const incentive = await this.createIncentive(userId, incentiveData);
        results.push(incentive);
      } catch (error) {
        console.error('Failed to create incentive:', error);
      }
    }

    return results;
  }

  // Get user's earned incentives
  async getUserIncentiveHistory(userId: string, limit: number = 50): Promise<ReviewIncentiveClaim[]> {
    const { data, error } = await this.supabase
      .from('review_incentive_claims')
      .select(`
        *,
        incentive:review_incentives(*),
        review:reviews(product_id, title)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Get incentive leaderboard
  async getIncentiveLeaderboard(period: 'week' | 'month' | 'year' = 'month'): Promise<Array<{
    user_id: string;
    user_name: string;
    total_earned: number;
    claim_count: number;
  }>> {
    const startDate = this.getStartDateForPeriod(period);

    const { data, error } = await this.supabase
      .from('review_incentive_claims')
      .select(`
        user_id,
        claimed_value,
        user:users(name)
      `)
      .eq('status', 'approved')
      .gte('processed_at', startDate);

    if (error) throw error;

    // Aggregate by user
    const userStats = data?.reduce((acc, claim) => {
      const userId = claim.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          user_name: claim.user.name || 'Anonymous',
          total_earned: 0,
          claim_count: 0
        };
      }
      acc[userId].total_earned += claim.claimed_value;
      acc[userId].claim_count += 1;
      return acc;
    }, {} as Record<string, any>) || {};

    return Object.values(userStats as Record<string, any>)
      .sort((a: any, b: any) => b.total_earned - a.total_earned)
      .slice(0, 50);
  }

  private getStartDateForPeriod(period: 'week' | 'month' | 'year'): string {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    }
  }
}
