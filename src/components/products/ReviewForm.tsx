'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/types/product'
import { CreateReviewRequest } from '@/types/review'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { 
  Star, 
  X, 
  CheckCircle, 
  AlertCircle,
  MessageSquare,
  ThumbsUp,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewFormProps {
  product: Product
  onClose: () => void
  onReviewSubmitted: () => void
  className?: string
}

interface ReviewFormData {
  rating: number
  title: string
  content: string
  wouldRecommend: boolean | null
}

interface ReviewFormErrors {
  rating?: string
  title?: string
  content?: string
  general?: string
}

export function ReviewForm({ 
  product, 
  onClose, 
  onReviewSubmitted,
  className 
}: ReviewFormProps) {
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 0,
    title: '',
    content: '',
    wouldRecommend: null
  })
  const [errors, setErrors] = useState<ReviewFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasExistingReview, setHasExistingReview] = useState(false)

  useEffect(() => {
    checkExistingReview()
  }, [product.id])

  const checkExistingReview = async () => {
    try {
      const response = await fetch(`/api/reviews?product_id=${product.id}&user_review=true`)
      const data = await response.json()
      
      if (response.ok && data.reviews.length > 0) {
        setHasExistingReview(true)
        const existingReview = data.reviews[0]
        setFormData({
          rating: existingReview.rating,
          title: existingReview.title || '',
          content: existingReview.content || '',
          wouldRecommend: null
        })
      }
    } catch (error) {
      console.error('Failed to check existing review:', error)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: ReviewFormErrors = {}

    if (formData.rating === 0) {
      newErrors.rating = 'Please select a rating'
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Please provide a title for your review'
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters long'
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters'
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Please write a review'
    } else if (formData.content.length < 10) {
      newErrors.content = 'Review must be at least 10 characters long'
    } else if (formData.content.length > 2000) {
      newErrors.content = 'Review must be less than 2000 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const reviewData: CreateReviewRequest = {
        product_id: product.id,
        rating: formData.rating,
        title: formData.title.trim(),
        content: formData.content.trim()
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      setIsSuccess(true)
      
      // Close modal after a short delay
      setTimeout(() => {
        onReviewSubmitted()
        onClose()
      }, 2000)

    } catch (error) {
      console.error('Review submission error:', error)
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to submit review'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof ReviewFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field as keyof ReviewFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const renderStarRating = (rating: number, size: 'sm' | 'md' | 'lg' = 'md', interactive = false) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8'
    }

    const displayRating = interactive ? Math.max(rating, hoveredRating) : rating

    return (
      <div className={cn("flex items-center", interactive && "cursor-pointer")}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              sizeClasses[size],
              i < displayRating
                ? "text-yellow-500 fill-current"
                : "text-gray-300",
              interactive && "hover:text-yellow-400 transition-colors"
            )}
            onClick={interactive ? () => handleInputChange('rating', i + 1) : undefined}
            onMouseEnter={interactive ? () => setHoveredRating(i + 1) : undefined}
            onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
          />
        ))}
      </div>
    )
  }

  const getRatingLabel = (rating: number) => {
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    }
    return labels[rating as keyof typeof labels] || ''
  }

  if (isSuccess) {
    return (
      <Modal isOpen={true} onClose={onClose} size="default">
        <div className="text-center py-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Submitted!</h2>
          <p className="text-gray-600">
            Thank you for your review. It will be published after moderation.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      <Card className="max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {hasExistingReview ? 'Edit Your Review' : 'Write a Review'}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Share your experience with {product.title}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {errors.general && (
            <ErrorMessage title="Error" message={errors.general} />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Overall Rating *
              </Label>
              <div className="space-y-2">
                {renderStarRating(formData.rating, 'lg', true)}
                {formData.rating > 0 && (
                  <p className="text-sm text-gray-600">
                    {getRatingLabel(formData.rating)}
                  </p>
                )}
              </div>
              {errors.rating && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.rating}
                </p>
              )}
            </div>

            {/* Review Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-medium">
                Review Title *
              </Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Summarize your experience in a few words"
                maxLength={100}
                className={cn(
                  errors.title && "border-red-500 focus:border-red-500 focus:ring-red-500"
                )}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{errors.title}</span>
                <span>{formData.title.length}/100</span>
              </div>
            </div>

            {/* Review Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-base font-medium">
                Your Review *
              </Label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Tell others about your experience with this product. What did you like? What could be improved?"
                rows={6}
                maxLength={2000}
                className={cn(
                  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none",
                  errors.content && "border-red-500 focus:border-red-500 focus:ring-red-500"
                )}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{errors.content}</span>
                <span>{formData.content.length}/2000</span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Would you recommend this product to others?
              </Label>
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant={formData.wouldRecommend === true ? "primary" : "outline"}
                  size="sm"
                  onClick={() => handleInputChange('wouldRecommend', true)}
                  className="flex items-center space-x-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Yes</span>
                </Button>
                <Button
                  type="button"
                  variant={formData.wouldRecommend === false ? "primary" : "outline"}
                  size="sm"
                  onClick={() => handleInputChange('wouldRecommend', false)}
                  className="flex items-center space-x-2"
                >
                  <ThumbsUp className="h-4 w-4 rotate-180" />
                  <span>No</span>
                </Button>
              </div>
            </div>

            {/* Review Guidelines */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <h4 className="font-medium mb-2">Review Guidelines:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Be honest and constructive in your feedback</li>
                    <li>• Focus on the product quality and your experience</li>
                    <li>• Avoid personal attacks or inappropriate language</li>
                    <li>• Your review will be moderated before publication</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : hasExistingReview ? (
                  'Update Review'
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Modal>
  )
}
