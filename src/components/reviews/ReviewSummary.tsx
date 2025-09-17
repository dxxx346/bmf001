'use client';

import React from 'react';
import { ProductReviewSummary } from '@/types/review';
import { Star, Shield, TrendingUp, Users } from 'lucide-react';

interface ReviewSummaryProps {
  summary: ProductReviewSummary;
  showDetailed?: boolean;
}

export function ReviewSummary({ summary, showDetailed = false }: ReviewSummaryProps) {
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${sizeClasses[size]} ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderRatingDistribution = () => {
    const total = summary.total_reviews;
    if (total === 0) return null;

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.rating_distribution[rating] || 0;
          const percentage = (count / total) * 100;
          
          return (
            <div key={rating} className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 w-12">
                <span>{rating}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-gray-600 w-12 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderQualityIndicators = () => {
    const indicators = [
      {
        label: 'Helpfulness',
        value: summary.quality_indicators.avg_helpfulness,
        icon: TrendingUp,
        color: 'text-green-600'
      },
      {
        label: 'Response Rate',
        value: summary.quality_indicators.response_rate,
        icon: Users,
        color: 'text-blue-600'
      },
      {
        label: 'Verified Rate',
        value: summary.quality_indicators.verification_rate,
        icon: Shield,
        color: 'text-purple-600'
      }
    ];

    return (
      <div className="grid grid-cols-3 gap-4">
        {indicators.map((indicator) => {
          const Icon = indicator.icon;
          const percentage = Math.round(indicator.value * 100);
          
          return (
            <div key={indicator.label} className="text-center">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mb-2`}>
                <Icon className={`w-4 h-4 ${indicator.color}`} />
              </div>
              <div className="text-lg font-semibold">{percentage}%</div>
              <div className="text-xs text-gray-600">{indicator.label}</div>
            </div>
          );
        })}
      </div>
    );
  };

  if (summary.total_reviews === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <div className="text-gray-400 mb-2">
          <Star className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Reviews Yet</h3>
        <p className="text-gray-600">Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Customer Reviews</h3>
        <div className="text-sm text-gray-600">
          {summary.total_reviews} review{summary.total_reviews > 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Rating */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {summary.weighted_rating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center mb-1">
            {renderStars(summary.weighted_rating, 'lg')}
          </div>
          <div className="text-sm text-gray-600">
            out of 5 stars
          </div>
        </div>

        <div className="flex-1">
          {renderRatingDistribution()}
        </div>
      </div>

      {/* Verification Info */}
      {summary.verified_reviews > 0 && (
        <div className="flex items-center gap-2 mb-4 text-sm text-green-600">
          <Shield className="w-4 h-4" />
          <span>
            {summary.verified_reviews} of {summary.total_reviews} reviews are from verified purchases
          </span>
        </div>
      )}

      {/* Quality Indicators */}
      {showDetailed && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Review Quality</h4>
          {renderQualityIndicators()}
        </div>
      )}

      {/* Keywords */}
      {showDetailed && (summary.top_positive_keywords.length > 0 || summary.top_negative_keywords.length > 0) && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Common Mentions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.top_positive_keywords.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-green-700 mb-2">Positive</h5>
                <div className="flex flex-wrap gap-1">
                  {summary.top_positive_keywords.slice(0, 6).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {summary.top_negative_keywords.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-red-700 mb-2">Areas for Improvement</h5>
                <div className="flex flex-wrap gap-1">
                  {summary.top_negative_keywords.slice(0, 6).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fake Review Detection Warning */}
      {showDetailed && summary.quality_indicators.fake_detection_rate > 0.1 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Review Quality Notice</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Our system has detected some reviews that may not meet quality standards. 
              We're reviewing them to ensure authenticity.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
