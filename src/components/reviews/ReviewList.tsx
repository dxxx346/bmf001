'use client';

import React, { useState } from 'react';
import { ReviewWithRelations, ReviewFilters, ReviewVoteType } from '@/types/review';
import { ReviewCard } from './ReviewCard';
import { useReviews, useProductReviews, useUserReviews } from '@/hooks/useReviews';
import { ChevronDown, Filter, SortAsc, SortDesc, MessageSquare, Star, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { cn } from '@/lib/utils';

interface ReviewListProps {
  productId?: string;
  shopId?: string;
  userId?: string;
  currentUserId?: string;
  initialFilters?: Partial<ReviewFilters>;
  showActions?: boolean;
  showSellerResponse?: boolean;
  showStats?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
  onVote?: (reviewId: string, voteType: ReviewVoteType) => Promise<void>;
  onReport?: (reviewId: string, reason: string) => void;
  onRespond?: (reviewId: string) => void;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
}

export function ReviewList({
  productId,
  shopId,
  userId,
  currentUserId,
  initialFilters = {},
  showActions = true,
  showSellerResponse = true,
  showStats = false,
  variant = 'default',
  className,
  onVote,
  onReport,
  onRespond,
  onEdit,
  onDelete
}: ReviewListProps) {
  const [showFilters, setShowFilters] = useState(false);
  
  // Use appropriate hook based on context
  const reviewsHook = productId 
    ? useProductReviews(productId, { filters: initialFilters })
    : userId
    ? useUserReviews(userId, { filters: initialFilters })
    : useReviews({ filters: initialFilters });

  const {
    reviews,
    loading,
    error,
    stats,
    currentPage,
    totalPages,
    totalReviews,
    hasNextPage,
    voteOnReview,
    reportReview,
    respondToReview,
    loadMore,
    setFilters,
    setPage,
  } = reviewsHook;

  const handleVote = async (reviewId: string, voteType: ReviewVoteType) => {
    if (onVote) {
      await onVote(reviewId, voteType);
    } else {
      await voteOnReview(reviewId, voteType);
    }
  };

  const handleReport = async (reviewId: string, reason: string) => {
    if (onReport) {
      onReport(reviewId, reason);
    } else {
      await reportReview(reviewId, reason);
    }
  };

  const handleRespond = async (reviewId: string) => {
    if (onRespond) {
      onRespond(reviewId);
    }
  };

  const handleSortChange = (sortBy: string) => {
    setFilters({
      sort_by: sortBy as any,
      sort_order: 'desc',
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({
      [key]: value,
    });
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <Select
                value=""
                onValueChange={(value) => handleFilterChange('rating', value ? parseInt(value) : undefined)}
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </Select>
            </div>

            {/* Verification Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Type
              </label>
              <Select
                value=""
                onValueChange={(value) => handleFilterChange('is_verified', value === '' ? undefined : value === 'true')}
              >
                <option value="">All Reviews</option>
                <option value="true">Verified Purchases Only</option>
                <option value="false">Non-Verified Only</option>
              </Select>
            </div>

            {/* Content Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <Select
                value=""
                onValueChange={(value) => handleFilterChange('has_content', value === '' ? undefined : value === 'true')}
              >
                <option value="">All Reviews</option>
                <option value="true">With Written Reviews</option>
                <option value="false">Ratings Only</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSortOptions = () => {
    const sortOptions = [
      { value: 'created_at', label: 'Most Recent', icon: Calendar },
      { value: 'rating', label: 'Rating', icon: Star },
      { value: 'helpful', label: 'Most Helpful', icon: TrendingUp }
    ];

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {sortOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <Button
              key={option.value}
              variant="outline"
              size="sm"
              onClick={() => handleSortChange(option.value)}
              className="flex items-center gap-2"
            >
              <IconComponent className="w-4 h-4" />
              {option.label}
            </Button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/6 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("", className)}>
        <ErrorMessage 
          title="Error Loading Reviews" 
          message={error} 
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Summary */}
      {showStats && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Review Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total_reviews}</div>
                <div className="text-sm text-gray-600">Total Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.average_rating.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.verified_reviews}</div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.helpful_reviews_count}</div>
                <div className="text-sm text-gray-600">Helpful</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Reviews ({totalReviews})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Customer feedback and ratings
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", showFilters && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Sort by:
        </div>
        {renderSortOptions()}
      </div>

      {/* Filters */}
      {renderFilters()}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-400 mb-4">
              <MessageSquare className="w-16 h-16 mx-auto" />
            </div>
            <CardTitle className="text-xl mb-2">No Reviews Found</CardTitle>
            <CardDescription>
              Be the first to review this product!
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={currentUserId}
              onVote={handleVote}
              onReport={handleReport}
              onRespond={handleRespond}
              onEdit={onEdit}
              onDelete={onDelete}
              showActions={showActions}
              showSellerResponse={showSellerResponse}
              variant={variant}
            />
          ))}

          {/* Load More Button */}
          {hasNextPage && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Load More Reviews'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
