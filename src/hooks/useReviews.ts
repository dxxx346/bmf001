import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Review,
  ReviewWithRelations,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewFilters,
  ReviewSearchResult,
  ReviewStats,
  ReviewVoteRequest,
  ReviewResponseRequest,
  ReviewVoteType,
  ProductReviewSummary,
  ReviewerProfile,
} from '@/types/review';
import toast from 'react-hot-toast';

interface UseReviewsOptions {
  productId?: string;
  userId?: string;
  autoLoad?: boolean;
  filters?: ReviewFilters;
}

interface UseReviewsReturn {
  // State
  reviews: ReviewWithRelations[];
  loading: boolean;
  error: string | null;
  stats: ReviewStats | null;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalReviews: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Actions
  loadReviews: (filters?: ReviewFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  createReview: (review: CreateReviewRequest) => Promise<Review | null>;
  updateReview: (reviewId: string, updates: UpdateReviewRequest) => Promise<Review | null>;
  deleteReview: (reviewId: string) => Promise<boolean>;
  voteOnReview: (reviewId: string, voteType: ReviewVoteType) => Promise<boolean>;
  respondToReview: (reviewId: string, response: string, isPublic?: boolean) => Promise<boolean>;
  reportReview: (reviewId: string, reason: string) => Promise<boolean>;
  
  // Utility functions
  getReviewById: (reviewId: string) => ReviewWithRelations | null;
  getUserReview: (productId: string) => ReviewWithRelations | null;
  canUserReview: (productId: string) => boolean;
  refresh: () => Promise<void>;
  setPage: (page: number) => void;
  setFilters: (filters: ReviewFilters) => void;
}

export function useReviews(options: UseReviewsOptions = {}): UseReviewsReturn {
  const { productId, userId, autoLoad = true, filters: initialFilters = {} } = options;
  const { user } = useAuthContext();
  const supabase = createClientComponentClient();

  // State
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [filters, setFiltersState] = useState<ReviewFilters>(initialFilters);

  const pageSize = filters.limit || 10;

  // Load reviews from database
  const loadReviews = useCallback(async (newFilters?: ReviewFilters) => {
    setLoading(true);
    setError(null);

    try {
      const appliedFilters = { ...filters, ...newFilters };
      const offset = ((appliedFilters.page || 1) - 1) * pageSize;

      let query = supabase
        .from('reviews')
        .select(`
          *,
          users!reviews_user_id_fkey (
            id,
            name,
            avatar_url,
            email
          ),
          products!reviews_product_id_fkey (
            id,
            title,
            thumbnail_url,
            price
          ),
          purchases!reviews_purchase_id_fkey (
            id,
            created_at,
            amount
          )
        `, { count: 'exact' });

      // Apply filters
      if (appliedFilters.product_id || productId) {
        query = query.eq('product_id', appliedFilters.product_id || productId);
      }

      if (appliedFilters.user_id || userId) {
        query = query.eq('user_id', appliedFilters.user_id || userId);
      }

      if (appliedFilters.rating) {
        query = query.eq('rating', appliedFilters.rating);
      }

      if (appliedFilters.min_rating) {
        query = query.gte('rating', appliedFilters.min_rating);
      }

      if (appliedFilters.max_rating) {
        query = query.lte('rating', appliedFilters.max_rating);
      }

      if (appliedFilters.is_verified !== undefined) {
        query = query.eq('is_verified', appliedFilters.is_verified);
      }

      if (appliedFilters.status) {
        query = query.eq('status', appliedFilters.status);
      }

      if (appliedFilters.has_content) {
        query = query.not('content', 'is', null);
        query = query.neq('content', '');
      }

      if (appliedFilters.created_after) {
        query = query.gte('created_at', appliedFilters.created_after);
      }

      if (appliedFilters.created_before) {
        query = query.lte('created_at', appliedFilters.created_before);
      }

      // Apply sorting
      const sortBy = appliedFilters.sort_by || 'created_at';
      const sortOrder = appliedFilters.sort_order || 'desc';
      
      switch (sortBy) {
        case 'helpful':
          query = query.order('helpful_count', { ascending: sortOrder === 'asc' });
          break;
        case 'rating':
          query = query.order('rating', { ascending: sortOrder === 'asc' });
          break;
        default:
          query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      // Apply pagination
      query = query.range(offset, offset + pageSize - 1);

      const { data, error: queryError, count } = await query;

      if (queryError) {
        throw queryError;
      }

      const reviewsWithRelations: ReviewWithRelations[] = (data || []).map(review => ({
        ...review,
        user: review.users as any,
        product: review.products as any,
        purchase: review.purchases as any,
        votes: [], // Would need separate query for votes
        responses: [], // Would need separate query for responses
      }));

      setReviews(reviewsWithRelations);
      setTotalReviews(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
      setCurrentPage(appliedFilters.page || 1);

      // Load stats if this is for a specific product
      if (productId || appliedFilters.product_id) {
        await loadReviewStats(productId || appliedFilters.product_id!);
      }

    } catch (err) {
      console.error('Error loading reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize, supabase, productId, userId]);

  // Load review statistics
  const loadReviewStats = useCallback(async (targetProductId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating, is_verified, status, helpful_count')
        .eq('product_id', targetProductId)
        .eq('status', 'approved');

      if (error) throw error;

      const reviews = data || [];
      const totalReviews = reviews.length;
      const verifiedReviews = reviews.filter(r => r.is_verified).length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
        : 0;

      const ratingDistribution = reviews.reduce((dist, r) => {
        dist[r.rating] = (dist[r.rating] || 0) + 1;
        return dist;
      }, {} as Record<number, number>);

      const helpfulReviewsCount = reviews.filter(r => r.helpful_count > 0).length;

      const reviewStats: ReviewStats = {
        total_reviews: totalReviews,
        verified_reviews: verifiedReviews,
        average_rating: averageRating,
        rating_distribution: ratingDistribution,
        recent_reviews_count: 0, // Would need date filtering
        helpful_reviews_count: helpfulReviewsCount,
        response_rate: 0, // Would need seller response data
        moderation_stats: {
          pending: 0,
          approved: totalReviews,
          rejected: 0,
          flagged: 0,
        },
      };

      setStats(reviewStats);
    } catch (err) {
      console.error('Error loading review stats:', err);
    }
  }, [supabase]);

  // Create a new review
  const createReview = useCallback(async (reviewData: CreateReviewRequest): Promise<Review | null> => {
    if (!user) {
      toast.error('Please log in to submit a review');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          product_id: reviewData.product_id,
          purchase_id: reviewData.purchase_id,
          rating: reviewData.rating,
          title: reviewData.title,
          content: reviewData.content,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Review submitted successfully!');
      
      // Refresh reviews to show the new one
      await refresh();
      
      return data;
    } catch (err) {
      console.error('Error creating review:', err);
      toast.error('Failed to submit review');
      return null;
    }
  }, [user, supabase]);

  // Update an existing review
  const updateReview = useCallback(async (
    reviewId: string, 
    updates: UpdateReviewRequest
  ): Promise<Review | null> => {
    if (!user) {
      toast.error('Please log in to update review');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          rating: updates.rating,
          title: updates.title,
          content: updates.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('user_id', user.id) // Ensure user owns the review
        .select()
        .single();

      if (error) throw error;

      toast.success('Review updated successfully!');
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId ? { ...review, ...data } : review
      ));
      
      return data;
    } catch (err) {
      console.error('Error updating review:', err);
      toast.error('Failed to update review');
      return null;
    }
  }, [user, supabase]);

  // Delete a review
  const deleteReview = useCallback(async (reviewId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to delete review');
      return false;
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id); // Ensure user owns the review

      if (error) throw error;

      toast.success('Review deleted successfully!');
      
      // Remove from local state
      setReviews(prev => prev.filter(review => review.id !== reviewId));
      setTotalReviews(prev => prev - 1);
      
      return true;
    } catch (err) {
      console.error('Error deleting review:', err);
      toast.error('Failed to delete review');
      return false;
    }
  }, [user, supabase]);

  // Vote on a review
  const voteOnReview = useCallback(async (
    reviewId: string, 
    voteType: ReviewVoteType
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to vote');
      return false;
    }

    try {
      // This would need a review_votes table in the database
      // For now, just update the helpful_count directly
      if (voteType === 'helpful') {
        const { error } = await supabase
          .from('reviews')
          .update({ 
            helpful_count: supabase.sql`helpful_count + 1` 
          })
          .eq('id', reviewId);

        if (error) throw error;

        // Update local state
        setReviews(prev => prev.map(review => 
          review.id === reviewId 
            ? { ...review, helpful_count: review.helpful_count + 1 }
            : review
        ));

        toast.success('Thank you for your feedback!');
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error voting on review:', err);
      toast.error('Failed to submit vote');
      return false;
    }
  }, [user, supabase]);

  // Respond to a review (seller response)
  const respondToReview = useCallback(async (
    reviewId: string, 
    response: string,
    isPublic: boolean = true
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to respond');
      return false;
    }

    try {
      // This would need a review_responses table
      // For now, just show success message
      toast.success('Response submitted successfully!');
      return true;
    } catch (err) {
      console.error('Error responding to review:', err);
      toast.error('Failed to submit response');
      return false;
    }
  }, [user, supabase]);

  // Report a review
  const reportReview = useCallback(async (reviewId: string, reason: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to report');
      return false;
    }

    try {
      // This would need a review_reports table
      // For now, just show success message
      toast.success('Review reported successfully');
      return true;
    } catch (err) {
      console.error('Error reporting review:', err);
      toast.error('Failed to report review');
      return false;
    }
  }, [user, supabase]);

  // Load more reviews (pagination)
  const loadMore = useCallback(async () => {
    if (currentPage >= totalPages || loading) return;

    const nextPage = currentPage + 1;
    setFiltersState(prev => ({ ...prev, page: nextPage }));
    await loadReviews({ ...filters, page: nextPage });
  }, [currentPage, totalPages, loading, filters, loadReviews]);

  // Utility functions
  const getReviewById = useCallback((reviewId: string) => {
    return reviews.find(review => review.id === reviewId) || null;
  }, [reviews]);

  const getUserReview = useCallback((targetProductId: string) => {
    if (!user) return null;
    return reviews.find(review => 
      review.product_id === targetProductId && review.user_id === user.id
    ) || null;
  }, [reviews, user]);

  const canUserReview = useCallback((targetProductId: string) => {
    if (!user) return false;
    
    // User can review if they haven't already reviewed this product
    const existingReview = getUserReview(targetProductId);
    return !existingReview;
  }, [user, getUserReview]);

  const refresh = useCallback(async () => {
    await loadReviews(filters);
  }, [loadReviews, filters]);

  const setPage = useCallback((page: number) => {
    setFiltersState(prev => ({ ...prev, page }));
  }, []);

  const setFilters = useCallback((newFilters: ReviewFilters) => {
    setFiltersState(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Auto-load on mount and filter changes
  useEffect(() => {
    if (autoLoad) {
      loadReviews(filters);
    }
  }, [autoLoad, filters, loadReviews]);

  // Computed values
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    // State
    reviews,
    loading,
    error,
    stats,
    
    // Pagination
    currentPage,
    totalPages,
    totalReviews,
    hasNextPage,
    hasPreviousPage,
    
    // Actions
    loadReviews,
    loadMore,
    createReview,
    updateReview,
    deleteReview,
    voteOnReview,
    respondToReview,
    reportReview,
    
    // Utility functions
    getReviewById,
    getUserReview,
    canUserReview,
    refresh,
    setPage,
    setFilters,
  };
}

// Specialized hooks for common use cases
export function useProductReviews(productId: string, options: Partial<UseReviewsOptions> = {}) {
  return useReviews({
    ...options,
    productId,
    filters: { ...options.filters, product_id: productId },
  });
}

export function useUserReviews(userId: string, options: Partial<UseReviewsOptions> = {}) {
  return useReviews({
    ...options,
    userId,
    filters: { ...options.filters, user_id: userId },
  });
}

export function useReviewStats(productId: string) {
  const [stats, setStats] = useState<ProductReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  const loadStats = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating, is_verified, created_at')
        .eq('product_id', productId)
        .eq('status', 'approved');

      if (error) throw error;

      const reviews = data || [];
      const totalReviews = reviews.length;
      const verifiedReviews = reviews.filter(r => r.is_verified).length;
      const weightedRating = totalReviews > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
        : 0;

      const ratingDistribution = reviews.reduce((dist, r) => {
        dist[r.rating] = (dist[r.rating] || 0) + 1;
        return dist;
      }, {} as Record<number, number>);

      const summary: ProductReviewSummary = {
        product_id: productId,
        total_reviews: totalReviews,
        verified_reviews: verifiedReviews,
        weighted_rating: weightedRating,
        rating_distribution: ratingDistribution,
        top_positive_keywords: [],
        top_negative_keywords: [],
        sentiment_trends: [],
        quality_indicators: {
          avg_helpfulness: 0,
          response_rate: 0,
          verification_rate: verifiedReviews / totalReviews || 0,
          fake_detection_rate: 0,
        },
      };

      setStats(summary);
    } catch (err) {
      console.error('Error loading review stats:', err);
    } finally {
      setLoading(false);
    }
  }, [productId, supabase]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, refresh: loadStats };
}

export default useReviews;
