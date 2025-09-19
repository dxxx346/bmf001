import { createServiceClient } from '@/lib/supabase';
import { 
  Review, 
  ReviewWithRelations, 
  CreateReviewRequest, 
  UpdateReviewRequest,
  ReviewFilters,
  ReviewSearchResult,
  ReviewStats,
  ProductReviewSummary,
  ReviewQualityMetrics,
  ReviewerProfile,
  ReviewVoteRequest,
  ReviewResponseRequest,
  ReviewModerationRequest,
  MLDetectionResult,
  ReviewAnalytics
} from '@/types/review';
import Redis from 'ioredis';
import { safeJsonParse } from '@/lib/security-validators';

const redis = new Redis(process.env.REDIS_URL || '');

export class ReviewService {
  private supabase = createServiceClient();

  // Create a new review with verification checks
  async createReview(userId: string, data: CreateReviewRequest): Promise<Review> {
    // Verify purchase first
    const hasValidPurchase = await this.verifyPurchase(userId, data.product_id, data.purchase_id);
    
    // Check if user already reviewed this product
    const existingReview = await this.getReviewByUserAndProduct(userId, data.product_id);
    if (existingReview) {
      throw new Error('You have already reviewed this product');
    }

    // Check for spam patterns
    const spamScore = await this.checkSpamPatterns(userId, data.content || '');
    if (spamScore > 0.8) {
      throw new Error('Review flagged as potential spam');
    }

    const reviewData = {
      user_id: userId,
      product_id: data.product_id,
      purchase_id: data.purchase_id,
      rating: data.rating,
      title: data.title,
      content: data.content,
      is_verified: hasValidPurchase,
      status: 'pending' as const,
      moderation_status: 'pending' as const,
      ml_status: 'pending' as const
    };

    const { data: review, error } = await this.supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single();

    if (error) throw error;

    // Trigger ML analysis asynchronously
    this.scheduleMLAnalysis(review.id);

    // Invalidate cache
    await this.invalidateProductReviewCache(data.product_id);

    return review;
  }

  // Update an existing review
  async updateReview(userId: string, reviewId: string, data: UpdateReviewRequest): Promise<Review> {
    // Get existing review
    const existingReview = await this.getReviewById(reviewId);
    if (!existingReview || existingReview.user_id !== userId) {
      throw new Error('Review not found or unauthorized');
    }

    // Store edit history
    await this.storeEditHistory(reviewId, existingReview, data.edit_reason);

    const updateData = {
      ...data,
      edit_count: existingReview.edit_count + 1,
      last_edited_at: new Date().toISOString(),
      moderation_status: 'pending', // Re-moderate if content changed
      ml_status: data.content ? 'pending' : existingReview.ml_status
    };

    const { data: review, error } = await this.supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;

    // Re-trigger ML analysis if content changed
    if (data.content) {
      this.scheduleMLAnalysis(reviewId);
    }

    // Invalidate cache
    await this.invalidateProductReviewCache(review.product_id);

    return review;
  }

  // Verify if user has purchased the product
  async verifyPurchase(userId: string, productId: string, purchaseId?: string): Promise<boolean> {
    const query = this.supabase
      .from('purchases')
      .select('id')
      .eq('buyer_id', userId)
      .eq('product_id', productId)
      .eq('is_active', true);

    if (purchaseId) {
      query.eq('id', purchaseId);
    }

    const { data, error } = await query.single();
    
    return !error && !!data;
  }

  // Get review by user and product
  async getReviewByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (error) return null;
    return data;
  }

  // Get review by ID
  async getReviewById(reviewId: string): Promise<Review | null> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (error) return null;
    return data;
  }

  // Get reviews with relations
  async getReviewsWithRelations(filters: ReviewFilters): Promise<ReviewSearchResult> {
    let query = this.supabase
      .from('reviews')
      .select(`
        *,
        user:users!reviews_user_id_fkey(id, name, avatar_url),
        product:products!reviews_product_id_fkey(id, title, thumbnail_url, price),
        purchase:purchases!reviews_purchase_id_fkey(id, created_at, amount),
        votes:review_votes(*),
        responses:review_responses(*, seller:users!review_responses_seller_id_fkey(id, name, avatar_url))
      `);

    // Apply filters
    if (filters.product_id) query = query.eq('product_id', filters.product_id);
    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.rating) query = query.eq('rating', filters.rating);
    if (filters.min_rating) query = query.gte('rating', filters.min_rating);
    if (filters.max_rating) query = query.lte('rating', filters.max_rating);
    if (filters.is_verified !== undefined) query = query.eq('is_verified', filters.is_verified);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.moderation_status) query = query.eq('moderation_status', filters.moderation_status);
    if (filters.has_content) query = query.not('content', 'is', null);
    if (filters.created_after) query = query.gte('created_at', filters.created_after);
    if (filters.created_before) query = query.lte('created_at', filters.created_before);

    // Sorting
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data: reviews, error, count } = await query;

    if (error) throw error;

    // Calculate aggregations
    const aggregations = await this.calculateReviewAggregations(filters);

    return {
      reviews: reviews || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
      filters_applied: filters,
      aggregations
    };
  }

  // Calculate review aggregations
  async calculateReviewAggregations(filters: ReviewFilters) {
    const baseQuery = this.supabase
      .from('reviews')
      .select('rating, is_verified, response_count, ml_analysis');

    // Apply same filters as main query
    if (filters.product_id) baseQuery.eq('product_id', filters.product_id);
    if (filters.user_id) baseQuery.eq('user_id', filters.user_id);
    // ... apply other filters

    const { data } = await baseQuery;
    if (!data) return this.getEmptyAggregations();

    const total = data.length;
    const ratings = data.map(r => r.rating);
    const average_rating = ratings.reduce((sum, rating) => sum + rating, 0) / total || 0;
    
    const rating_distribution = ratings.reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const verification_rate = data.filter(r => r.is_verified).length / total;
    const response_rate = data.filter(r => r.response_count > 0).length / total;

    // Simple sentiment analysis based on rating
    const positive = data.filter(r => r.rating >= 4).length / total;
    const negative = data.filter(r => r.rating <= 2).length / total;
    const neutral = 1 - positive - negative;

    return {
      average_rating: Math.round(average_rating * 100) / 100,
      rating_distribution,
      verification_rate: Math.round(verification_rate * 100) / 100,
      response_rate: Math.round(response_rate * 100) / 100,
      sentiment_distribution: { positive, neutral, negative }
    };
  }

  // Get product review summary with caching
  async getProductReviewSummary(productId: string): Promise<ProductReviewSummary> {
    const cacheKey = `product_review_summary:${productId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      const parsed = safeJsonParse(cached);
      if (parsed) {
        return parsed as ProductReviewSummary;
      }
    }

    const { data: reviews } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .eq('moderation_status', 'approved');

    if (!reviews || reviews.length === 0) {
      return this.getEmptyProductSummary(productId);
    }

    const total_reviews = reviews.length;
    const verified_reviews = reviews.filter(r => r.is_verified).length;
    const ratings = reviews.map(r => r.rating);
    
    // Calculate weighted rating using our algorithm
    const weighted_rating = await this.calculateWeightedRating(productId);
    
    const rating_distribution = ratings.reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Extract keywords from review content
    const top_positive_keywords = await this.extractKeywords(
      reviews.filter(r => r.rating >= 4).map(r => r.content).join(' ')
    );
    
    const top_negative_keywords = await this.extractKeywords(
      reviews.filter(r => r.rating <= 2).map(r => r.content).join(' ')
    );

    const summary: ProductReviewSummary = {
      product_id: productId,
      total_reviews,
      verified_reviews,
      weighted_rating,
      rating_distribution,
      top_positive_keywords,
      top_negative_keywords,
      sentiment_trends: [], // Would implement with time-series data
      quality_indicators: {
        avg_helpfulness: reviews.reduce((sum, r) => sum + (r.helpful_count / Math.max(r.helpful_count + r.unhelpful_count, 1)), 0) / total_reviews,
        response_rate: reviews.filter(r => r.response_count > 0).length / total_reviews,
        verification_rate: verified_reviews / total_reviews,
        fake_detection_rate: reviews.filter(r => r.ml_score && r.ml_score > 0.7).length / total_reviews
      }
    };

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(summary));

    return summary;
  }

  // Calculate weighted rating using database function
  async calculateWeightedRating(productId: string): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('calculate_weighted_rating', { product_id_param: productId });

    if (error) throw error;
    return data || 0;
  }

  // Vote on a review
  async voteOnReview(userId: string, data: ReviewVoteRequest): Promise<void> {
    const { error } = await this.supabase
      .from('review_votes')
      .upsert({
        review_id: data.review_id,
        user_id: userId,
        vote_type: data.vote_type
      });

    if (error) throw error;

    // Check if review should be auto-flagged based on votes
    await this.checkAutoFlag(data.review_id);
  }

  // Add seller response to review
  async addSellerResponse(sellerId: string, data: ReviewResponseRequest): Promise<void> {
    // Verify seller owns the product
    const review = await this.getReviewById(data.review_id);
    if (!review) throw new Error('Review not found');

    const { data: product } = await this.supabase
      .from('products')
      .select('seller_id')
      .eq('id', review.product_id)
      .single();

    if (!product || product.seller_id !== sellerId) {
      throw new Error('Unauthorized to respond to this review');
    }

    const { error } = await this.supabase
      .from('review_responses')
      .insert({
        review_id: data.review_id,
        seller_id: sellerId,
        response_text: data.response_text,
        is_public: data.is_public ?? true
      });

    if (error) throw error;
  }

  // Check spam patterns
  async checkSpamPatterns(userId: string, content: string): Promise<number> {
    // Simple spam detection - would implement more sophisticated ML model
    let spamScore = 0;

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5) spamScore += 0.3;

    // Check for repeated phrases
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.5) {
      spamScore += 0.4;
    }

    // Check user's recent review frequency
    const recentReviews = await this.getUserRecentReviews(userId, 24); // Last 24 hours
    if (recentReviews.length > 5) spamScore += 0.5;

    return Math.min(spamScore, 1);
  }

  // Get user's recent reviews
  async getUserRecentReviews(userId: string, hours: number): Promise<Review[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since);

    if (error) return [];
    return data || [];
  }

  // Store edit history
  async storeEditHistory(reviewId: string, previousReview: Review, editReason?: string): Promise<void> {
    const { error } = await this.supabase
      .from('review_edit_history')
      .insert({
        review_id: reviewId,
        previous_title: previousReview.title,
        previous_content: previousReview.content,
        previous_rating: previousReview.rating,
        edit_reason: editReason,
        edited_by: previousReview.user_id
      });

    if (error) console.error('Failed to store edit history:', error);
  }

  // Schedule ML analysis
  private async scheduleMLAnalysis(reviewId: string): Promise<void> {
    // Add to job queue for ML processing
    await redis.lpush('ml_analysis_queue', JSON.stringify({
      review_id: reviewId,
      created_at: new Date().toISOString()
    }));
  }

  // Check if review should be auto-flagged
  async checkAutoFlag(reviewId: string): Promise<void> {
    const { data: votes } = await this.supabase
      .from('review_votes')
      .select('vote_type')
      .eq('review_id', reviewId);

    if (!votes) return;

    const spamVotes = votes.filter(v => v.vote_type === 'spam').length;
    const fakeVotes = votes.filter(v => v.vote_type === 'fake').length;

    if (spamVotes >= 3 || fakeVotes >= 3) {
      await this.supabase
        .from('review_moderation_queue')
        .insert({
          review_id: reviewId,
          priority: 2,
          reason: `Auto-flagged: ${spamVotes} spam votes, ${fakeVotes} fake votes`,
          auto_flagged: true
        });
    }
  }

  // Extract keywords from text
  async extractKeywords(text: string): Promise<string[]> {
    if (!text) return [];
    
    // Simple keyword extraction - would use more sophisticated NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  // Invalidate product review cache
  async invalidateProductReviewCache(productId: string): Promise<void> {
    const pattern = `product_review*${productId}*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  // Helper methods for empty states
  private getEmptyAggregations() {
    return {
      average_rating: 0,
      rating_distribution: {},
      verification_rate: 0,
      response_rate: 0,
      sentiment_distribution: { positive: 0, neutral: 0, negative: 0 }
    };
  }

  private getEmptyProductSummary(productId: string): ProductReviewSummary {
    return {
      product_id: productId,
      total_reviews: 0,
      verified_reviews: 0,
      weighted_rating: 0,
      rating_distribution: {},
      top_positive_keywords: [],
      top_negative_keywords: [],
      sentiment_trends: [],
      quality_indicators: {
        avg_helpfulness: 0,
        response_rate: 0,
        verification_rate: 0,
        fake_detection_rate: 0
      }
    };
  }

  // Get reviewer profile
  async getReviewerProfile(userId: string): Promise<ReviewerProfile> {
    const { data: reviews } = await this.supabase
      .from('reviews')
      .select(`
        *,
        purchase:purchases!reviews_purchase_id_fkey(*)
      `)
      .eq('user_id', userId);

    if (!reviews || reviews.length === 0) {
      return {
        user_id: userId,
        total_reviews: 0,
        verified_purchases: 0,
        average_rating_given: 0,
        helpful_votes_received: 0,
        credibility_score: 0,
        review_frequency: 0,
        categories_reviewed: [],
        last_review_date: '',
        flags: {
          is_trusted: false,
          is_suspicious: false,
          needs_monitoring: false
        }
      };
    }

    const total_reviews = reviews.length;
    const verified_purchases = reviews.filter(r => r.is_verified).length;
    const average_rating_given = reviews.reduce((sum, r) => sum + r.rating, 0) / total_reviews;
    const helpful_votes_received = reviews.reduce((sum, r) => sum + r.helpful_count, 0);
    
    // Calculate credibility score
    const verificationRate = verified_purchases / total_reviews;
    const helpfulnessRate = helpful_votes_received / total_reviews;
    const credibility_score = (verificationRate * 0.6 + helpfulnessRate * 0.4) * 100;

    const sortedReviews = reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const lastReviewDate = sortedReviews[0]?.created_at || '';

    return {
      user_id: userId,
      total_reviews,
      verified_purchases,
      average_rating_given: Math.round(average_rating_given * 100) / 100,
      helpful_votes_received,
      credibility_score: Math.round(credibility_score),
      review_frequency: this.calculateReviewFrequency(reviews),
      categories_reviewed: [], // Would need to join with products and categories
      last_review_date: lastReviewDate,
      flags: {
        is_trusted: credibility_score > 80 && total_reviews > 10,
        is_suspicious: credibility_score < 30 && total_reviews > 5,
        needs_monitoring: false // Would implement based on ML scores
      }
    };
  }

  // Calculate review frequency (reviews per month)
  private calculateReviewFrequency(reviews: Review[]): number {
    if (reviews.length < 2) return 0;
    
    const sorted = reviews.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const firstReview = new Date(sorted[0].created_at);
    const lastReview = new Date(sorted[sorted.length - 1].created_at);
    const monthsDiff = (lastReview.getTime() - firstReview.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return monthsDiff > 0 ? reviews.length / monthsDiff : 0;
  }
}
