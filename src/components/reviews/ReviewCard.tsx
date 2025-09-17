'use client';

import React, { useState } from 'react';
import { ReviewWithRelations, ReviewVoteType } from '@/types/review';
import { formatDistanceToNow } from '@/lib/date';
import { ThumbsUp, ThumbsDown, Flag, MessageCircle, Shield, AlertTriangle, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { RatingStars } from './RatingStars';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

interface ReviewCardProps {
  review: ReviewWithRelations;
  currentUserId?: string;
  onVote?: (reviewId: string, voteType: ReviewVoteType) => Promise<void>;
  onReport?: (reviewId: string, reason: string) => void;
  onRespond?: (reviewId: string) => void;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
  showActions?: boolean;
  showSellerResponse?: boolean;
  showProductInfo?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function ReviewCard({
  review,
  currentUserId,
  onVote,
  onReport,
  onRespond,
  onEdit,
  onDelete,
  showActions = true,
  showSellerResponse = true,
  showProductInfo = false,
  variant = 'default',
  className
}: ReviewCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const handleVote = async (voteType: ReviewVoteType) => {
    if (!onVote || !currentUserId || isVoting) return;
    
    setIsVoting(true);
    try {
      await onVote(review.id, voteType);
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleReport = () => {
    if (!onReport || !reportReason.trim()) return;
    
    onReport(review.id, reportReason);
    setShowReportModal(false);
    setReportReason('');
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const getStatusBadges = () => {
    const badges = [];
    
    if (review.is_verified) {
      badges.push(
        <Badge key="verified" variant="secondary" className="bg-green-100 text-green-800">
          <Shield className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }

    if (review.ml_status === 'suspicious' || review.ml_status === 'fake') {
      badges.push(
        <Badge key="flagged" variant="secondary" className="bg-orange-100 text-orange-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Under Review
        </Badge>
      );
    }

    if (review.status === 'pending') {
      badges.push(
        <Badge key="pending" variant="secondary" className="bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      );
    }

    return badges;
  };

  const isOwnReview = currentUserId === review.user_id;
  const helpfulnessRatio = (review.helpful_count + review.unhelpful_count) > 0 
    ? review.helpful_count / (review.helpful_count + review.unhelpful_count) 
    : 0;

  if (variant === 'compact') {
    return (
      <div className={cn("bg-white border border-gray-200 rounded-lg p-4", className)}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            {review.user.avatar_url ? (
              <img
                src={review.user.avatar_url}
                alt={review.user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-gray-600">
                {review.user.name?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <RatingStars rating={review.rating} size="sm" />
              {getStatusBadges().slice(0, 1)}
            </div>
            
            <div className="text-sm text-gray-900 font-medium mb-1">
              {review.user.name || 'Anonymous'}
            </div>
            
            {review.title && (
              <div className="text-sm font-medium text-gray-900 mb-1">{review.title}</div>
            )}
            
            {review.content && (
              <p className="text-sm text-gray-700 line-clamp-2">{review.content}</p>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
              {review.helpful_count > 0 && (
                <span className="text-xs text-gray-500">{review.helpful_count} found helpful</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg shadow-sm", 
      variant === 'detailed' ? 'p-6' : 'p-4', 
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            {review.user.avatar_url ? (
              <img
                src={review.user.avatar_url}
                alt={review.user.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <span className="text-gray-600 font-medium">
                {review.user.name?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {review.user.name || 'Anonymous'}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(review.created_at)}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <RatingStars rating={review.rating} size="md" />
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadges()}
          </div>
        </div>
      </div>

      {/* Review Content */}
      <div className="mb-4">
        {review.title && (
          <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
        )}
        {review.content && (
          <p className="text-gray-700 leading-relaxed">{review.content}</p>
        )}
        
        {review.edit_count > 0 && (
            <div className="text-sm text-gray-500 mt-2">
              Edited {review.edit_count} time{review.edit_count > 1 ? 's' : ''}
              {review.last_edited_at && (
                <span> • Last edited {formatDate(review.last_edited_at)}</span>
              )}
            </div>
        )}
      </div>

      {/* Seller Responses */}
      {showSellerResponse && review.responses && review.responses.length > 0 && (
        <div className="mb-4 bg-gray-50 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Seller Response
          </h5>
          {review.responses.map((response) => (
            <div key={response.id} className="text-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{(response as any).seller?.name}</span>
                <span className="text-xs text-gray-500">
                  {formatDate(response.created_at)}
                </span>
                {response.is_edited && (
                  <span className="text-xs text-gray-500">• edited</span>
                )}
              </div>
              <p className="text-sm">{response.response_text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {showActions && currentUserId && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            {/* Own review actions */}
            {isOwnReview ? (
              <div className="flex items-center gap-2">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(review.id)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(review.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Helpful/Unhelpful votes */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote('helpful')}
                    disabled={isVoting}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    Helpful ({review.helpful_count})
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote('unhelpful')}
                    disabled={isVoting}
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    ({review.unhelpful_count})
                  </Button>
                </div>

                {/* Helpfulness indicator */}
                {(review.helpful_count + review.unhelpful_count) > 5 && (
                  <div className="text-sm text-gray-500">
                    {Math.round(helpfulnessRatio * 100)}% found this helpful
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Report button (for non-own reviews) */}
            {!isOwnReview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReportModal(true)}
                className="text-gray-600 hover:text-red-600"
              >
                <Flag className="w-4 h-4 mr-1" />
                Report
              </Button>
            )}

            {/* Respond button (for sellers) */}
            {onRespond && !isOwnReview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRespond(review.id)}
                className="text-blue-600 hover:text-blue-700"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Respond
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report Review"
        description="Help us maintain quality by reporting inappropriate content"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for reporting
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a reason</option>
              <option value="spam">Spam or promotional content</option>
              <option value="fake">Fake review</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="misleading">Misleading information</option>
              <option value="harassment">Harassment or abuse</option>
              <option value="copyright">Copyright violation</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowReportModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReport}
              disabled={!reportReason.trim()}
            >
              Submit Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
