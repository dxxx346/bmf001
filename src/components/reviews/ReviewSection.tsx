'use client';

import React, { useState } from 'react';
import { Plus, Star, MessageSquare } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useProductReviews } from '@/hooks/useReviews';
import { ReviewList } from './ReviewList';
import { ReviewForm } from './ReviewForm';
import { ProductRating } from './RatingStars';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ReviewSectionProps {
  productId: string;
  productTitle: string;
  sellerId: string;
  userPurchaseId?: string;
  className?: string;
}

export function ReviewSection({
  productId,
  productTitle,
  sellerId,
  userPurchaseId,
  className
}: ReviewSectionProps) {
  const { user } = useAuthContext();
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  const {
    reviews,
    loading,
    error,
    stats,
    totalReviews,
    createReview,
    voteOnReview,
    reportReview,
    getUserReview,
    canUserReview,
  } = useProductReviews(productId);

  const userReview = getUserReview(productId);
  const canReview = user && canUserReview(productId) && userPurchaseId;
  const isSeller = user?.id === sellerId;

  const handleSubmitReview = async (reviewData: any) => {
    const success = await createReview(reviewData);
    if (success) {
      setShowReviewForm(false);
    }
  };

  const handleRespond = (reviewId: string) => {
    // Navigate to seller response interface
    console.log('Respond to review:', reviewId);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Review Summary Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Customer Reviews
              </CardTitle>
              <CardDescription>
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'} for this product
              </CardDescription>
            </div>
            
            {canReview && (
              <Button onClick={() => setShowReviewForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Write Review
              </Button>
            )}
          </div>
        </CardHeader>
        
        {stats && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Rating */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.average_rating.toFixed(1)}
                  </div>
                  <div>
                    <ProductRating 
                      rating={stats.average_rating} 
                      reviewCount={stats.total_reviews}
                      size="lg"
                    />
                    <div className="text-sm text-gray-600 mt-1">
                      Based on {stats.total_reviews} reviews
                    </div>
                  </div>
                </div>
                
                {stats.verified_reviews > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {stats.verified_reviews} verified purchases
                  </Badge>
                )}
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Rating Breakdown</h4>
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.rating_distribution[rating] || 0;
                  const percentage = stats.total_reviews > 0 
                    ? (count / stats.total_reviews) * 100 
                    : 0;
                  
                  return (
                    <div key={rating} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-gray-600">{rating} ★</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-gray-600 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* User's Review */}
      {userReview && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Your Review</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewList
              productId={productId}
              currentUserId={user?.id}
              initialFilters={{ user_id: user?.id }}
              showActions={true}
              showSellerResponse={true}
              variant="compact"
            />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* All Reviews */}
      <ReviewList
        productId={productId}
        currentUserId={user?.id}
        showActions={true}
        showSellerResponse={true}
        showStats={false}
        onRespond={isSeller ? handleRespond : undefined}
        variant="default"
      />

      {/* Review Form Modal */}
      <Modal
        isOpen={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        title="Write a Review"
        description={`Share your experience with ${productTitle}`}
      >
        <ReviewForm
          productId={productId}
          productTitle={productTitle}
          purchaseId={userPurchaseId}
          isVerifiedPurchase={!!userPurchaseId}
          onSubmit={handleSubmitReview}
          onCancel={() => setShowReviewForm(false)}
          variant="modal"
        />
      </Modal>
    </div>
  );
}

// Compact version for product cards
export function CompactReviewSection({
  productId,
  averageRating,
  reviewCount,
  className
}: {
  productId: string;
  averageRating: number;
  reviewCount: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ProductRating 
        rating={averageRating} 
        reviewCount={reviewCount}
        size="sm"
      />
      {reviewCount === 0 && (
        <span className="text-sm text-gray-500">No reviews yet</span>
      )}
    </div>
  );
}

// Inline review form for quick reviews
export function InlineReviewForm({
  productId,
  productTitle,
  userPurchaseId,
  onSubmit,
  className
}: {
  productId: string;
  productTitle: string;
  userPurchaseId?: string;
  onSubmit?: (review: any) => Promise<void>;
  className?: string;
}) {
  const { createReview } = useProductReviews(productId);

  const handleSubmit = async (reviewData: any) => {
    if (onSubmit) {
      await onSubmit(reviewData);
    } else {
      await createReview(reviewData);
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Leave a Review</CardTitle>
        <CardDescription>
          Share your experience with other customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ReviewForm
          productId={productId}
          productTitle={productTitle}
          purchaseId={userPurchaseId}
          isVerifiedPurchase={!!userPurchaseId}
          onSubmit={handleSubmit}
          variant="inline"
        />
      </CardContent>
    </Card>
  );
}

export default ReviewSection;
