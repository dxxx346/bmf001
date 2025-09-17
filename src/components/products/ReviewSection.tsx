'use client'

import { useState, useEffect, useCallback } from 'react'
import { Product } from '@/types/product'
import { ReviewWithRelations, ReviewFilters } from '@/types/review'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewSectionProps {
  product: Product
  reviews: ReviewWithRelations[]
  isLoading?: boolean
  onReviewSubmit: () => void
  className?: string
}

interface ReviewFiltersState {
  rating?: number
  sortBy: 'newest' | 'oldest' | 'helpful' | 'rating'
  verifiedOnly: boolean
  hasContent: boolean
}

interface ReviewStats {
  averageRating: number
  totalReviews: number
  ratingDistribution: Record<number, number>
  verifiedReviews: number
}

export function ReviewSection({ 
  product, 
  reviews, 
  isLoading = false,
  onReviewSubmit,
  className 
}: ReviewSectionProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReviews, setTotalReviews] = useState(0)
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [filters, setFilters] = useState<ReviewFiltersState>({
    sortBy: 'newest',
    verifiedOnly: false,
    hasContent: false
  })
  const [showFilters, setShowFilters] = useState(false)
  const [filteredReviews, setFilteredReviews] = useState<ReviewWithRelations[]>(reviews)

  const reviewsPerPage = 5

  const fetchReviewStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/reviews/analytics?product_id=${product.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setReviewStats(data.stats)
        setTotalReviews(data.stats.totalReviews)
        setTotalPages(Math.ceil(data.stats.totalReviews / reviewsPerPage))
      }
    } catch (error) {
      console.error('Failed to fetch review stats:', error)
    }
  }, [product.id, reviewsPerPage])

  const applyFilters = useCallback(() => {
    let filtered = [...reviews]

    // Apply rating filter
    if (filters.rating) {
      filtered = filtered.filter(review => review.rating === filters.rating)
    }

    // Apply verified filter
    if (filters.verifiedOnly) {
      filtered = filtered.filter(review => review.is_verified)
    }

    // Apply content filter
    if (filters.hasContent) {
      filtered = filtered.filter(review => review.content && review.content.trim().length > 0)
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'helpful':
        filtered.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0))
        break
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating)
        break
    }

    setFilteredReviews(filtered)
    setTotalPages(Math.ceil(filtered.length / reviewsPerPage))
    setCurrentPage(1)
  }, [reviews, filters, reviewsPerPage])

  useEffect(() => {
    fetchReviewStats()
  }, [fetchReviewStats])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const handleFilterChange = (newFilters: Partial<ReviewFiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleVote = async (reviewId: string, voteType: 'helpful' | 'unhelpful') => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType })
      })

      if (response.ok) {
        // Refresh reviews to show updated vote counts
        fetchReviewStats()
      }
    } catch (error) {
      console.error('Failed to vote on review:', error)
    }
  }

  const renderStarRating = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }

    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              sizeClasses[size],
              i < rating
                ? "text-yellow-500 fill-current"
                : "text-gray-300"
            )}
          />
        ))}
      </div>
    )
  }

  const renderRatingDistribution = () => {
    if (!reviewStats?.ratingDistribution) return null

    const total = reviewStats.totalReviews
    const distribution = reviewStats.ratingDistribution

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = distribution[rating] || 0
          const percentage = total > 0 ? (count / total) * 100 : 0

          return (
            <div key={rating} className="flex items-center space-x-2 text-sm">
              <span className="w-4 text-center">{rating}</span>
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-right text-gray-600">{count}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderReviewCard = (review: ReviewWithRelations) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return (
      <Card key={review.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Review Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {review.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {review.user.name}
                    </span>
                    {review.is_verified && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified Purchase
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {renderStarRating(review.rating, 'sm')}
                    <span>•</span>
                    <span>{formatDate(review.created_at)}</span>
                  </div>
                </div>
              </div>
              
              {review.moderation_status === 'flagged' && (
                <Badge variant="danger" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Flagged
                </Badge>
              )}
            </div>

            {/* Review Content */}
            {review.title && (
              <h4 className="font-semibold text-gray-900">
                {review.title}
              </h4>
            )}
            
            {review.content && (
              <p className="text-gray-700 leading-relaxed">
                {review.content}
              </p>
            )}

            {/* Review Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote(review.id, 'helpful')}
                  className="text-gray-600 hover:text-green-600"
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Helpful ({review.helpful_count || 0})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote(review.id, 'unhelpful')}
                  className="text-gray-600 hover:text-red-600"
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  ({review.unhelpful_count || 0})
                </Button>
                {review.response_count > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {review.response_count} response{review.response_count !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </div>

            {/* Seller Response */}
            {review.responses && review.responses.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    Response from {(review.responses[0] as any)?.seller?.name || 'Seller'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(review.responses[0].created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  {review.responses[0].response_text}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages: number[] = []
    const maxVisiblePages = 5
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        
        {pages.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "primary" : "outline"}
            size="sm"
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    )
  }

  const currentReviews = filteredReviews.slice(
    (currentPage - 1) * reviewsPerPage,
    currentPage * reviewsPerPage
  )

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Customer Reviews</CardTitle>
            <Button onClick={onReviewSubmit} variant="outline">
              Write a Review
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Review Summary */}
          {reviewStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Rating */}
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900">
                  {reviewStats.averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {renderStarRating(Math.round(reviewStats.averageRating), 'lg')}
                </div>
                <div className="text-sm text-gray-600">
                  Based on {reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-900 mb-3">Rating Distribution</h4>
                {renderRatingDistribution()}
              </div>
            </div>
          )}

          <Separator />

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>

            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Rating Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating
                    </label>
                    <select
                      value={filters.rating || ''}
                      onChange={(e) => handleFilterChange({ 
                        rating: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All ratings</option>
                      <option value="5">5 stars</option>
                      <option value="4">4 stars</option>
                      <option value="3">3 stars</option>
                      <option value="2">2 stars</option>
                      <option value="1">1 star</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort by
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange({ 
                        sortBy: e.target.value as ReviewFiltersState['sortBy'] 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="helpful">Most helpful</option>
                      <option value="rating">Highest rating</option>
                    </select>
                  </div>

                  {/* Verified Only */}
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="verifiedOnly"
                      checked={filters.verifiedOnly}
                      onChange={(e) => handleFilterChange({ verifiedOnly: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="verifiedOnly" className="text-sm text-gray-700">
                      Verified purchases only
                    </label>
                  </div>

                  {/* Has Content */}
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="hasContent"
                      checked={filters.hasContent}
                      onChange={(e) => handleFilterChange({ hasContent: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="hasContent" className="text-sm text-gray-700">
                      With written review
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reviews List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : currentReviews.length > 0 ? (
            <div className="space-y-4">
              {currentReviews.map(renderReviewCard)}
              {renderPagination()}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
              <p className="text-gray-600 mb-4">
                {filters.rating || filters.verifiedOnly || filters.hasContent
                  ? "Try adjusting your filters to see more reviews."
                  : "Be the first to review this product!"
                }
              </p>
              <Button onClick={onReviewSubmit} variant="outline">
                Write the First Review
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
