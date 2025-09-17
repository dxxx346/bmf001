// Review and Rating System Types

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type ReviewModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'spam';
export type ReviewVoteType = 'helpful' | 'unhelpful' | 'spam' | 'fake';
export type IncentiveType = 'points' | 'discount' | 'cashback' | 'badge';
export type MLDetectionStatus = 'pending' | 'clean' | 'suspicious' | 'fake' | 'error';
export type IncentiveClaimStatus = 'pending' | 'approved' | 'rejected' | 'expired';

// Core Review Interface
export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  purchase_id?: string;
  rating: number; // 1-5
  title?: string;
  content?: string;
  status: ReviewStatus;
  is_verified: boolean;
  helpful_count: number;
  unhelpful_count: number;
  spam_count: number;
  fake_count: number;
  moderation_status: ReviewModerationStatus;
  moderation_notes?: string;
  moderated_by?: string;
  moderated_at?: string;
  ml_score?: number;
  ml_status: MLDetectionStatus;
  ml_analysis: Record<string, any>;
  response_count: number;
  edit_count: number;
  last_edited_at?: string;
  created_at: string;
  updated_at: string;
}

// Review with populated relationships
export interface ReviewWithRelations extends Review {
  user: {
    id: string;
    name: string;
    avatar_url?: string;
    email?: string;
  };
  product: {
    id: string;
    title: string;
    thumbnail_url?: string;
    price: number;
  };
  purchase?: {
    id: string;
    created_at: string;
    amount: number;
  };
  votes: ReviewVote[];
  responses: ReviewResponse[];
  moderator?: {
    id: string;
    name: string;
  };
}

// Review Vote Interface
export interface ReviewVote {
  id: string;
  review_id: string;
  user_id: string;
  vote_type: ReviewVoteType;
  created_at: string;
  updated_at: string;
}

// Seller Response Interface
export interface ReviewResponse {
  id: string;
  review_id: string;
  seller_id: string;
  response_text: string;
  is_public: boolean;
  is_edited: boolean;
  edit_count: number;
  created_at: string;
  updated_at: string;
}

// Review Response with Relations
export interface ReviewResponseWithRelations extends ReviewResponse {
  seller: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

// Review Moderation Queue Interface
export interface ReviewModerationQueue {
  id: string;
  review_id: string;
  priority: number; // 1-5
  reason: string;
  reporter_id?: string;
  moderator_id?: string;
  status: ReviewModerationStatus;
  notes?: string;
  auto_flagged: boolean;
  ml_confidence?: number;
  assigned_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

// Moderation Queue with Relations
export interface ModerationQueueWithRelations extends ReviewModerationQueue {
  review: ReviewWithRelations;
  reporter?: {
    id: string;
    name: string;
    email: string;
  };
  moderator?: {
    id: string;
    name: string;
    email: string;
  };
}

// Review Incentive Interface
export interface ReviewIncentive {
  id: string;
  product_id?: string;
  shop_id?: string;
  incentive_type: IncentiveType;
  incentive_value: number;
  minimum_rating?: number;
  minimum_words: number;
  requires_verification: boolean;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Review Incentive Claim Interface
export interface ReviewIncentiveClaim {
  id: string;
  incentive_id: string;
  review_id: string;
  user_id: string;
  claimed_value: number;
  status: IncentiveClaimStatus;
  processed_at?: string;
  created_at: string;
}

// ML Features Interface
export interface ReviewMLFeatures {
  id: string;
  review_id: string;
  features: {
    text_length: number;
    sentiment_score: number;
    readability_score: number;
    spam_indicators: number;
    duplicate_content_score: number;
    user_history_score: number;
    timing_patterns: number;
    linguistic_features: Record<string, number>;
  };
  model_version: string;
  confidence_score: number;
  predictions: {
    is_fake: number;
    is_spam: number;
    is_bot: number;
    overall_quality: number;
  };
  created_at: string;
}

// Review Analytics Interface
export interface ReviewAnalytics {
  id: string;
  product_id: string;
  period_start: string;
  period_end: string;
  total_reviews: number;
  verified_reviews: number;
  average_rating: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  helpful_votes: number;
  unhelpful_votes: number;
  response_rate: number;
  sentiment_score?: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  created_at: string;
  updated_at: string;
}

// Review Edit History Interface
export interface ReviewEditHistory {
  id: string;
  review_id: string;
  previous_title?: string;
  previous_content?: string;
  previous_rating?: number;
  edit_reason?: string;
  edited_by: string;
  created_at: string;
}

// Request/Response Types
export interface CreateReviewRequest {
  product_id: string;
  rating: number;
  title?: string;
  content?: string;
  purchase_id?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  content?: string;
  edit_reason?: string;
}

export interface ReviewVoteRequest {
  review_id: string;
  vote_type: ReviewVoteType;
}

export interface ReviewResponseRequest {
  review_id: string;
  response_text: string;
  is_public?: boolean;
}

export interface ReviewModerationRequest {
  review_id: string;
  status: ReviewModerationStatus;
  notes?: string;
}

export interface ReviewIncentiveRequest {
  product_id?: string;
  shop_id?: string;
  incentive_type: IncentiveType;
  incentive_value: number;
  minimum_rating?: number;
  minimum_words?: number;
  requires_verification?: boolean;
  max_uses?: number;
  expires_at?: string;
}

export interface ReviewFilters {
  product_id?: string;
  shop_id?: string;
  user_id?: string;
  rating?: number;
  min_rating?: number;
  max_rating?: number;
  is_verified?: boolean;
  has_content?: boolean;
  has_responses?: boolean;
  status?: ReviewStatus;
  moderation_status?: ReviewModerationStatus;
  ml_status?: MLDetectionStatus;
  created_after?: string;
  created_before?: string;
  sort_by?: 'rating' | 'helpful' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ReviewSearchResult {
  reviews: ReviewWithRelations[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  filters_applied: ReviewFilters;
  aggregations: {
    average_rating: number;
    rating_distribution: Record<number, number>;
    verification_rate: number;
    response_rate: number;
    sentiment_distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
}

export interface ReviewStats {
  total_reviews: number;
  verified_reviews: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
  recent_reviews_count: number;
  helpful_reviews_count: number;
  response_rate: number;
  moderation_stats: {
    pending: number;
    approved: number;
    rejected: number;
    flagged: number;
  };
}

export interface ReviewModerationStats {
  queue_size: number;
  pending_reviews: number;
  flagged_reviews: number;
  auto_flagged_reviews: number;
  avg_resolution_time: number;
  moderator_workload: Record<string, number>;
}

export interface ReviewIncentiveStats {
  total_incentives: number;
  active_incentives: number;
  total_claims: number;
  approval_rate: number;
  total_value_distributed: number;
  conversion_rate: number;
}

export interface MLDetectionResult {
  review_id: string;
  is_fake_probability: number;
  is_spam_probability: number;
  is_bot_probability: number;
  overall_score: number;
  confidence: number;
  features_analyzed: string[];
  recommendations: string[];
}

export interface ReviewQualityMetrics {
  helpfulness_ratio: number;
  verification_status: boolean;
  content_quality_score: number;
  reviewer_credibility: number;
  recency_factor: number;
  response_engagement: number;
  overall_quality_score: number;
}

export interface ProductReviewSummary {
  product_id: string;
  total_reviews: number;
  verified_reviews: number;
  weighted_rating: number;
  rating_distribution: Record<number, number>;
  top_positive_keywords: string[];
  top_negative_keywords: string[];
  sentiment_trends: Array<{
    period: string;
    sentiment: number;
    review_count: number;
  }>;
  quality_indicators: {
    avg_helpfulness: number;
    response_rate: number;
    verification_rate: number;
    fake_detection_rate: number;
  };
}

export interface ReviewerProfile {
  user_id: string;
  total_reviews: number;
  verified_purchases: number;
  average_rating_given: number;
  helpful_votes_received: number;
  credibility_score: number;
  review_frequency: number;
  categories_reviewed: string[];
  last_review_date: string;
  flags: {
    is_trusted: boolean;
    is_suspicious: boolean;
    needs_monitoring: boolean;
  };
}

export interface ReviewBulkOperation {
  operation_type: 'approve' | 'reject' | 'flag' | 'delete';
  review_ids: string[];
  reason?: string;
  notes?: string;
}

export interface ReviewExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  filters: ReviewFilters;
  include_responses: boolean;
  include_votes: boolean;
  include_ml_data: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ReviewNotification {
  id: string;
  type: 'new_review' | 'review_response' | 'review_flagged' | 'incentive_earned';
  user_id: string;
  review_id?: string;
  product_id?: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface ReviewTemplate {
  id: string;
  name: string;
  template_text: string;
  category: string;
  is_active: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
}

export interface ReviewReminder {
  id: string;
  user_id: string;
  product_id: string;
  purchase_id: string;
  reminder_count: number;
  last_reminded_at?: string;
  completed: boolean;
  created_at: string;
}
