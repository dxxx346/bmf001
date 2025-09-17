import { createServiceClient } from '@/lib/supabase';
import { 
  ReviewModerationQueue, 
  ModerationQueueWithRelations,
  ReviewModerationRequest,
  ReviewModerationStats,
  ReviewModerationStatus,
  Review
} from '@/types/review';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || '');

export class ReviewModerationService {
  private supabase = createServiceClient();

  // Add review to moderation queue
  async addToModerationQueue(
    reviewId: string, 
    reason: string, 
    reporterId?: string, 
    priority: number = 1,
    autoFlagged: boolean = false,
    mlConfidence?: number
  ): Promise<ReviewModerationQueue> {
    const { data, error } = await this.supabase
      .from('review_moderation_queue')
      .insert({
        review_id: reviewId,
        priority: Math.max(1, Math.min(5, priority)), // Ensure priority is 1-5
        reason,
        reporter_id: reporterId,
        auto_flagged: autoFlagged,
        ml_confidence: mlConfidence,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Add to Redis queue for real-time processing
    await this.addToRedisQueue(data);

    // Notify moderators if high priority
    if (priority >= 4) {
      await this.notifyModerators(data);
    }

    return data;
  }

  // Get moderation queue with filters and pagination
  async getModerationQueue(filters: {
    status?: ReviewModerationStatus;
    priority?: number;
    moderator_id?: string;
    auto_flagged?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    items: ModerationQueueWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    let query = this.supabase
      .from('review_moderation_queue')
      .select(`
        *,
        review:reviews!review_moderation_queue_review_id_fkey(
          *,
          user:users!reviews_user_id_fkey(id, name, email),
          product:products!reviews_product_id_fkey(id, title, thumbnail_url)
        ),
        reporter:users!review_moderation_queue_reporter_id_fkey(id, name, email),
        moderator:users!review_moderation_queue_moderator_id_fkey(id, name, email)
      `);

    // Apply filters
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.moderator_id) query = query.eq('moderator_id', filters.moderator_id);
    if (filters.auto_flagged !== undefined) query = query.eq('auto_flagged', filters.auto_flagged);

    // Order by priority (high first) then creation date
    query = query.order('priority', { ascending: false })
                 .order('created_at', { ascending: true });

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      limit
    };
  }

  // Assign moderator to queue item
  async assignModerator(queueItemId: string, moderatorId: string): Promise<void> {
    const { error } = await this.supabase
      .from('review_moderation_queue')
      .update({
        moderator_id: moderatorId,
        assigned_at: new Date().toISOString()
      })
      .eq('id', queueItemId)
      .eq('status', 'pending'); // Only assign if still pending

    if (error) throw error;

    // Update Redis queue
    await this.updateRedisQueue(queueItemId, { moderator_id: moderatorId });
  }

  // Process moderation decision
  async processModeration(
    queueItemId: string, 
    moderatorId: string, 
    decision: ReviewModerationRequest
  ): Promise<void> {
    // Get queue item
    const { data: queueItem, error: queueError } = await this.supabase
      .from('review_moderation_queue')
      .select('*')
      .eq('id', queueItemId)
      .single();

    if (queueError || !queueItem) {
      throw new Error('Moderation queue item not found');
    }

    // Verify moderator is assigned or is admin
    if (queueItem.moderator_id !== moderatorId) {
      // Check if user is admin
      const { data: moderator } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', moderatorId)
        .single();

      if (!moderator || moderator.role !== 'admin') {
        throw new Error('Unauthorized to moderate this review');
      }
    }

    // Update review status
    const { error: reviewError } = await this.supabase
      .from('reviews')
      .update({
        moderation_status: decision.status,
        moderation_notes: decision.notes,
        moderated_by: moderatorId,
        moderated_at: new Date().toISOString()
      })
      .eq('id', queueItem.review_id);

    if (reviewError) throw reviewError;

    // Update queue item
    const { error: updateError } = await this.supabase
      .from('review_moderation_queue')
      .update({
        status: decision.status,
        notes: decision.notes,
        resolved_at: new Date().toISOString()
      })
      .eq('id', queueItemId);

    if (updateError) throw updateError;

    // Remove from Redis queue
    await this.removeFromRedisQueue(queueItemId);

    // Handle post-moderation actions
    await this.handlePostModerationActions(queueItem.review_id, decision.status, moderatorId);

    // Update moderator stats
    await this.updateModeratorStats(moderatorId);
  }

  // Get moderation statistics
  async getModerationStats(): Promise<ReviewModerationStats> {
    const [queueStats, performanceStats] = await Promise.all([
      this.getQueueStats(),
      this.getPerformanceStats()
    ]);

    return {
      ...queueStats,
      ...performanceStats
    };
  }

  // Get queue statistics
  private async getQueueStats() {
    const { data: queueData } = await this.supabase
      .from('review_moderation_queue')
      .select('status, auto_flagged, priority');

    if (!queueData) {
      return {
        queue_size: 0,
        pending_reviews: 0,
        flagged_reviews: 0,
        auto_flagged_reviews: 0
      };
    }

    const queue_size = queueData.length;
    const pending_reviews = queueData.filter(item => item.status === 'pending').length;
    const flagged_reviews = queueData.filter(item => item.status === 'flagged').length;
    const auto_flagged_reviews = queueData.filter(item => item.auto_flagged).length;

    return {
      queue_size,
      pending_reviews,
      flagged_reviews,
      auto_flagged_reviews
    };
  }

  // Get performance statistics
  private async getPerformanceStats() {
    // Get average resolution time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: resolvedItems } = await this.supabase
      .from('review_moderation_queue')
      .select('created_at, resolved_at, moderator_id')
      .not('resolved_at', 'is', null)
      .gte('created_at', thirtyDaysAgo);

    if (!resolvedItems || resolvedItems.length === 0) {
      return {
        avg_resolution_time: 0,
        moderator_workload: {}
      };
    }

    // Calculate average resolution time in hours
    const resolutionTimes = resolvedItems.map(item => {
      const created = new Date(item.created_at).getTime();
      const resolved = new Date(item.resolved_at!).getTime();
      return (resolved - created) / (1000 * 60 * 60); // Convert to hours
    });

    const avg_resolution_time = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;

    // Calculate moderator workload
    const moderator_workload = resolvedItems.reduce((acc, item) => {
      if (item.moderator_id) {
        acc[item.moderator_id] = (acc[item.moderator_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      avg_resolution_time: Math.round(avg_resolution_time * 100) / 100,
      moderator_workload
    };
  }

  // Auto-assign moderators based on workload
  async autoAssignModerators(): Promise<void> {
    // Get pending queue items without assigned moderators
    const { data: pendingItems } = await this.supabase
      .from('review_moderation_queue')
      .select('id, priority')
      .eq('status', 'pending')
      .is('moderator_id', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (!pendingItems || pendingItems.length === 0) return;

    // Get available moderators
    const { data: moderators } = await this.supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'moderator'])
      .eq('is_active', true);

    if (!moderators || moderators.length === 0) return;

    // Get current workload for each moderator
    const workloads = await this.getCurrentModeratorWorkloads(moderators.map(m => m.id));

    // Sort moderators by current workload (least busy first)
    const sortedModerators = moderators.sort((a, b) => 
      (workloads[a.id] || 0) - (workloads[b.id] || 0)
    );

    // Assign items to moderators in round-robin fashion
    for (let i = 0; i < pendingItems.length; i++) {
      const moderator = sortedModerators[i % sortedModerators.length];
      await this.assignModerator(pendingItems[i].id, moderator.id);
    }
  }

  // Get current workload for moderators
  private async getCurrentModeratorWorkloads(moderatorIds: string[]): Promise<Record<string, number>> {
    const { data } = await this.supabase
      .from('review_moderation_queue')
      .select('moderator_id')
      .eq('status', 'pending')
      .in('moderator_id', moderatorIds);

    if (!data) return {};

    return data.reduce((acc, item) => {
      if (item.moderator_id) {
        acc[item.moderator_id] = (acc[item.moderator_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }

  // Handle actions after moderation decision
  private async handlePostModerationActions(
    reviewId: string, 
    status: ReviewModerationStatus, 
    moderatorId: string
  ): Promise<void> {
    switch (status) {
      case 'approved':
        await this.handleApprovedReview(reviewId);
        break;
      case 'rejected':
        await this.handleRejectedReview(reviewId);
        break;
      case 'flagged':
        await this.handleFlaggedReview(reviewId);
        break;
      case 'spam':
        await this.handleSpamReview(reviewId, moderatorId);
        break;
    }
  }

  // Handle approved review
  private async handleApprovedReview(reviewId: string): Promise<void> {
    // Update review status to approved
    await this.supabase
      .from('reviews')
      .update({ status: 'approved' })
      .eq('id', reviewId);

    // Trigger incentive processing
    await this.processReviewIncentives(reviewId);

    // Update product rating
    const { data: review } = await this.supabase
      .from('reviews')
      .select('product_id')
      .eq('id', reviewId)
      .single();

    if (review) {
      await this.updateProductRating(review.product_id);
    }
  }

  // Handle rejected review
  private async handleRejectedReview(reviewId: string): Promise<void> {
    // Update review status to rejected
    await this.supabase
      .from('reviews')
      .update({ status: 'rejected' })
      .eq('id', reviewId);

    // Notify user about rejection (optional)
    await this.notifyUserOfRejection(reviewId);
  }

  // Handle flagged review
  private async handleFlaggedReview(reviewId: string): Promise<void> {
    // Keep review in pending state but flag for further review
    await this.supabase
      .from('reviews')
      .update({ status: 'pending' })
      .eq('id', reviewId);

    // Add to high-priority queue for admin review
    await this.addToModerationQueue(
      reviewId,
      'Flagged by moderator for admin review',
      undefined,
      5,
      false
    );
  }

  // Handle spam review
  private async handleSpamReview(reviewId: string, moderatorId: string): Promise<void> {
    // Mark as spam
    await this.supabase
      .from('reviews')
      .update({ 
        status: 'rejected',
        moderation_status: 'spam'
      })
      .eq('id', reviewId);

    // Get reviewer info for potential account action
    const { data: review } = await this.supabase
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .single();

    if (review) {
      await this.checkUserForSpamPattern(review.user_id);
    }
  }

  // Check user for spam patterns
  private async checkUserForSpamPattern(userId: string): Promise<void> {
    const { data: userReviews } = await this.supabase
      .from('reviews')
      .select('moderation_status')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!userReviews) return;

    const spamCount = userReviews.filter(r => r.moderation_status === 'spam').length;
    const totalReviews = userReviews.length;

    // If more than 50% of recent reviews are spam, flag user
    if (totalReviews >= 3 && spamCount / totalReviews > 0.5) {
      await this.flagUserAccount(userId, 'High spam review rate detected');
    }
  }

  // Flag user account
  private async flagUserAccount(userId: string, reason: string): Promise<void> {
    // This would integrate with user management system
    console.log(`Flagging user ${userId} for: ${reason}`);
    // Implementation would depend on user management service
  }

  // Process review incentives
  private async processReviewIncentives(reviewId: string): Promise<void> {
    // This would be handled by the incentive service
    await redis.lpush('incentive_processing_queue', JSON.stringify({
      review_id: reviewId,
      created_at: new Date().toISOString()
    }));
  }

  // Update product rating
  private async updateProductRating(productId: string): Promise<void> {
    // Trigger recalculation of product rating
    await this.supabase.rpc('calculate_weighted_rating', { 
      product_id_param: productId 
    });
  }

  // Notify user of rejection
  private async notifyUserOfRejection(reviewId: string): Promise<void> {
    const { data: review } = await this.supabase
      .from('reviews')
      .select('user_id, product_id, moderation_notes')
      .eq('id', reviewId)
      .single();

    if (review) {
      await this.supabase
        .from('notifications')
        .insert({
          user_id: review.user_id,
          type: 'review_rejected',
          title: 'Review Rejected',
          message: `Your review has been rejected. ${review.moderation_notes || ''}`,
          data: { review_id: reviewId, product_id: review.product_id }
        });
    }
  }

  // Update moderator statistics
  private async updateModeratorStats(moderatorId: string): Promise<void> {
    // Update Redis cache with moderator performance metrics
    const key = `moderator_stats:${moderatorId}`;
    const stats = await redis.hgetall(key);
    
    const totalProcessed = parseInt(stats.total_processed || '0') + 1;
    const today = new Date().toDateString();
    const todayKey = `today_${today}`;
    const todayProcessed = parseInt(stats[todayKey] || '0') + 1;

    await redis.hmset(key, {
      total_processed: totalProcessed.toString(),
      [todayKey]: todayProcessed.toString(),
      last_activity: new Date().toISOString()
    });

    // Set expiry for daily stats (keep for 30 days)
    await redis.expire(key, 30 * 24 * 60 * 60);
  }

  // Redis queue management
  private async addToRedisQueue(queueItem: ReviewModerationQueue): Promise<void> {
    const queueKey = `moderation_queue:priority_${queueItem.priority}`;
    await redis.lpush(queueKey, JSON.stringify(queueItem));
    
    // Set expiry to prevent queue buildup
    await redis.expire(queueKey, 7 * 24 * 60 * 60); // 7 days
  }

  private async updateRedisQueue(queueItemId: string, updates: Partial<ReviewModerationQueue>): Promise<void> {
    // This is a simplified implementation
    // In practice, you might want to use a more sophisticated approach
    const queueKeys = await redis.keys('moderation_queue:priority_*');
    
    for (const queueKey of queueKeys) {
      const items = await redis.lrange(queueKey, 0, -1);
      for (let i = 0; i < items.length; i++) {
        const item = JSON.parse(items[i]);
        if (item.id === queueItemId) {
          const updatedItem = { ...item, ...updates };
          await redis.lset(queueKey, i, JSON.stringify(updatedItem));
          return;
        }
      }
    }
  }

  private async removeFromRedisQueue(queueItemId: string): Promise<void> {
    const queueKeys = await redis.keys('moderation_queue:priority_*');
    
    for (const queueKey of queueKeys) {
      const items = await redis.lrange(queueKey, 0, -1);
      for (const item of items) {
        const parsedItem = JSON.parse(item);
        if (parsedItem.id === queueItemId) {
          await redis.lrem(queueKey, 1, item);
          return;
        }
      }
    }
  }

  // Notify moderators of high-priority items
  private async notifyModerators(queueItem: ReviewModerationQueue): Promise<void> {
    // Get all moderators
    const { data: moderators } = await this.supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'moderator'])
      .eq('is_active', true);

    if (!moderators) return;

    // Send notifications
    const notifications = moderators.map(moderator => ({
      user_id: moderator.id,
      type: 'high_priority_moderation',
      title: 'High Priority Review Flagged',
      message: `A high priority review needs moderation: ${queueItem.reason}`,
      data: { queue_item_id: queueItem.id, review_id: queueItem.review_id }
    }));

    await this.supabase
      .from('notifications')
      .insert(notifications);
  }

  // Bulk moderation actions
  async bulkModerate(
    queueItemIds: string[], 
    moderatorId: string, 
    decision: ReviewModerationStatus,
    notes?: string
  ): Promise<void> {
    // Process each item
    for (const queueItemId of queueItemIds) {
      try {
        await this.processModeration(queueItemId, moderatorId, {
          review_id: '', // Will be fetched in processModeration
          status: decision,
          notes
        });
      } catch (error) {
        console.error(`Failed to moderate queue item ${queueItemId}:`, error);
      }
    }
  }

  // Get moderator performance report
  async getModeratorPerformance(moderatorId: string, days: number = 30): Promise<{
    total_processed: number;
    avg_resolution_time: number;
    accuracy_score: number;
    categories_breakdown: Record<string, number>;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: processedItems } = await this.supabase
      .from('review_moderation_queue')
      .select('created_at, resolved_at, status, reason')
      .eq('moderator_id', moderatorId)
      .not('resolved_at', 'is', null)
      .gte('created_at', since);

    if (!processedItems || processedItems.length === 0) {
      return {
        total_processed: 0,
        avg_resolution_time: 0,
        accuracy_score: 0,
        categories_breakdown: {}
      };
    }

    const total_processed = processedItems.length;
    
    // Calculate average resolution time
    const resolutionTimes = processedItems.map(item => {
      const created = new Date(item.created_at).getTime();
      const resolved = new Date(item.resolved_at!).getTime();
      return (resolved - created) / (1000 * 60 * 60);
    });
    const avg_resolution_time = resolutionTimes.reduce((sum, time) => sum + time, 0) / total_processed;

    // Calculate accuracy score (simplified - would need feedback mechanism)
    const accuracy_score = 95; // Placeholder

    // Categories breakdown
    const categories_breakdown = processedItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_processed,
      avg_resolution_time: Math.round(avg_resolution_time * 100) / 100,
      accuracy_score,
      categories_breakdown
    };
  }
}
