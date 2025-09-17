'use client';

import React, { useState } from 'react';
import { CreateReviewRequest, ReviewIncentive } from '@/types/review';
import { Gift, Shield, AlertCircle, Send, X } from 'lucide-react';
import { InteractiveRating } from './RatingStars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

interface ReviewFormProps {
  productId: string;
  productTitle: string;
  purchaseId?: string;
  isVerifiedPurchase: boolean;
  availableIncentives?: ReviewIncentive[];
  onSubmit: (review: CreateReviewRequest) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  variant?: 'default' | 'modal' | 'inline';
}

export function ReviewForm({
  productId,
  productTitle,
  purchaseId,
  isVerifiedPurchase,
  availableIncentives = [],
  onSubmit,
  onCancel,
  className,
  variant = 'default'
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (content.trim().length < 10) {
      newErrors.content = 'Review must be at least 10 characters long';
    }

    if (content.length > 2000) {
      newErrors.content = 'Review must be less than 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const reviewData: CreateReviewRequest = {
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
        purchase_id: purchaseId
      };

      await onSubmit(reviewData);
    } catch (error) {
      console.error('Error submitting review:', error);
      setErrors({ submit: 'Failed to submit review. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = (rating: number) => {
    const ratingTexts = {
      1: 'Terrible',
      2: 'Poor', 
      3: 'Average',
      4: 'Good',
      5: 'Excellent'
    };
    return ratingTexts[rating as keyof typeof ratingTexts] || '';
  };


  const getEligibleIncentives = () => {
    return availableIncentives.filter(incentive => {
      if (incentive.minimum_rating && rating < incentive.minimum_rating) return false;
      if (incentive.minimum_words && content.trim().split(/\s+/).length < incentive.minimum_words) return false;
      if (incentive.requires_verification && !isVerifiedPurchase) return false;
      return true;
    });
  };

  const eligibleIncentives = getEligibleIncentives();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Write a Review
        </h3>
        <p className="text-sm text-gray-600">
          Share your experience with <span className="font-medium">{productTitle}</span>
        </p>
        
        {isVerifiedPurchase && (
          <div className="flex items-center gap-2 mt-2 text-green-600 text-sm">
            <Shield className="w-4 h-4" />
            <span>Verified Purchase</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Rating *
          </label>
          <div className="space-y-2">
            <InteractiveRating
              rating={rating}
              onChange={setRating}
              size="xl"
              onHover={setHoverRating}
            />
            {(rating > 0 || hoverRating > 0) && (
              <div className="text-sm text-gray-600">
                {getRatingText(hoverRating || rating)}
              </div>
            )}
          </div>
          {errors.rating && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.rating}
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Review Title (Optional)
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            maxLength={100}
          />
          <div className="text-xs text-gray-500 mt-1">
            {title.length}/100 characters
          </div>
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Review *
          </label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell others about your experience with this product..."
            rows={5}
            maxLength={2000}
            className={cn(errors.content && 'border-red-500')}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Minimum 10 characters</span>
            <span>{content.length}/2000</span>
          </div>
          {errors.content && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.content}
            </p>
          )}
        </div>

        {/* Available Incentives */}
        {availableIncentives.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Available Rewards
            </h4>
            <div className="space-y-2">
              {availableIncentives.map((incentive) => {
                const isEligible = eligibleIncentives.includes(incentive);
                return (
                  <div
                    key={incentive.id}
                    className={`text-sm p-2 rounded ${
                      isEligible 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {incentive.incentive_value} {incentive.incentive_type}
                        {incentive.minimum_rating && ` (${incentive.minimum_rating}+ stars)`}
                        {incentive.minimum_words && ` (${incentive.minimum_words}+ words)`}
                        {incentive.requires_verification && ' (verified only)'}
                      </span>
                      {isEligible && (
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                          Eligible!
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Review Guidelines
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Be honest and helpful to other customers</li>
            <li>• Focus on the product, not shipping or customer service</li>
            <li>• Avoid promotional content or spam</li>
            <li>• Respect others and use appropriate language</li>
          </ul>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="flex-1"
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Review
              </>
            )}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
