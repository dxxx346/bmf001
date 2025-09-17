'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useProducts } from '@/hooks/useProducts'
import { useAuthContext } from '@/contexts/AuthContext'
import { Product } from '@/types/product'
import { MarketplaceProduct } from '@/hooks/useMarketplaceProducts'
import { ReviewWithRelations } from '@/types/review'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { ImageGallery } from '@/components/products/ImageGallery'
import { ProductInfo } from '@/components/products/ProductInfo'
import { ReviewSection } from '@/components/products/ReviewSection'
import { ReviewForm } from '@/components/products/ReviewForm'
import { ProductCard } from '@/components/products/ProductCard'
import { 
  Heart, 
  Share2, 
  Download, 
  ShoppingCart, 
  Star,
  ExternalLink,
  Shield,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductPageProps {
  params: { id: string }
}

export default function ProductPage({ params }: ProductPageProps) {
  const { id } = params
  const router = useRouter()
  const { user } = useAuthContext()
  const { 
    currentProduct, 
    recommendations, 
    isLoading, 
    error, 
    getProduct, 
    getRecommendations,
    clearError 
  } = useProducts()
  
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])

  const fetchReviews = useCallback(async () => {
    if (!currentProduct) return
    
    const abortController = new AbortController()
    setReviewsLoading(true)
    
    try {
      const response = await fetch(`/api/reviews?product_id=${currentProduct.id}&limit=10`, {
        signal: abortController.signal
      })
      const data = await response.json()
      
      if (response.ok) {
        setReviews(data.reviews || [])
      } else {
        console.error('Failed to fetch reviews:', data.message)
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch reviews:', error)
      }
    } finally {
      setReviewsLoading(false)
    }
    
    return () => {
      abortController.abort()
    }
  }, [currentProduct])

  const checkPurchaseStatus = useCallback(async () => {
    if (!currentProduct || !user) return
    
    const abortController = new AbortController()
    
    try {
      const response = await fetch(`/api/purchases/check?product_id=${currentProduct.id}`, {
        signal: abortController.signal
      })
      const data = await response.json()
      
      if (response.ok) {
        setHasPurchased(data.hasPurchased)
      } else {
        console.error('Failed to check purchase status:', data.message)
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to check purchase status:', error)
      }
    }
    
    return () => {
      abortController.abort()
    }
  }, [currentProduct, user])

  const handleAddToCart = useCallback(async () => {
    if (!currentProduct || !user) {
      // Redirect to login or show login modal
      router.push('/auth/login')
      return
    }
    
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: currentProduct.id, quantity: 1 })
      })
      
      if (response.ok) {
        // Show success message
        console.log('Added to cart successfully')
      } else {
        const errorData = await response.json()
        console.error('Failed to add to cart:', errorData.message)
      }
    } catch (error) {
      console.error('Failed to add to cart:', error)
    }
  }, [currentProduct, user, router])

  const handleBuyNow = useCallback(async () => {
    if (!currentProduct || !user) {
      // Redirect to login or show login modal
      router.push('/auth/login')
      return
    }
    
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_id: currentProduct.id,
          amount: currentProduct.price,
          currency: currentProduct.currency || 'USD'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Use Next.js router for navigation
        if (data.payment_url.startsWith('/')) {
          router.push(data.payment_url)
        } else {
          window.location.href = data.payment_url
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to create payment:', errorData.message)
      }
    } catch (error) {
      console.error('Failed to create payment:', error)
    }
  }, [currentProduct, user, router])

  const handleDownload = useCallback(async () => {
    if (!currentProduct || !hasPurchased) return
    
    try {
      const response = await fetch(`/api/products/${currentProduct.id}/download`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = currentProduct.title
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        console.error('Failed to download:', errorData.message)
      }
    } catch (error) {
      console.error('Failed to download:', error)
    }
  }, [currentProduct, hasPurchased])

  const handleShare = useCallback(async () => {
    if (navigator.share && currentProduct) {
      try {
        await navigator.share({
          title: currentProduct.title,
          text: currentProduct.short_description || currentProduct.description,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback to copying URL
      try {
        await navigator.clipboard.writeText(window.location.href)
        console.log('URL copied to clipboard')
      } catch (error) {
        console.error('Failed to copy URL:', error)
      }
    }
  }, [currentProduct])

  useEffect(() => {
    if (id) {
      getProduct(id)
      getRecommendations(id, undefined, 8)
    }
  }, [id, getProduct, getRecommendations])

  useEffect(() => {
    if (currentProduct) {
      fetchReviews()
      checkPurchaseStatus()
    }
  }, [currentProduct, user, fetchReviews, checkPurchaseStatus])

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Any cleanup needed when component unmounts
      setReviews([])
      setReviewsLoading(false)
      setShowReviewForm(false)
      setHasPurchased(false)
      setSimilarProducts([])
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <ErrorMessage 
            title="Error Loading Product"
            message={error}
          />
          <Button 
            onClick={() => {
              clearError()
              getProduct(id)
            }}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!currentProduct) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span>/</span>
            {(currentProduct as any).categories && (
              <>
                <a 
                  href={`/categories/${(currentProduct as any).categories.slug}`}
                  className="hover:text-blue-600"
                >
                  {(currentProduct as any).categories.name}
                </a>
                <span>/</span>
              </>
            )}
            <span className="text-gray-900 font-medium truncate">
              {currentProduct.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image Gallery */}
          <div className="lg:col-span-1">
            <ImageGallery 
              images={currentProduct.images || []}
              product={currentProduct}
            />
          </div>

          {/* Middle Column - Product Info */}
          <div className="lg:col-span-1">
            <ProductInfo 
              product={currentProduct}
              hasPurchased={hasPurchased}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          </div>

          {/* Right Column - Seller Info & Actions */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Seller Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Seller Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(currentProduct as any).shops && (
                    <>
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-lg">
                            {(currentProduct as any).shops.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {(currentProduct as any).shops.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {(currentProduct as any).shops.description || 'Digital Product Store'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/shops/${(currentProduct as any).shops?.id}`)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Store
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Follow
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Product Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Product Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Downloads</span>
                    <span className="font-semibold">{currentProduct.stats?.download_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Views</span>
                    <span className="font-semibold">{currentProduct.stats?.view_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Rating</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-semibold">
                        {currentProduct.stats?.average_rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reviews</span>
                    <span className="font-semibold">{currentProduct.stats?.review_count || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Security Badge */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Secure Purchase</h3>
                      <p className="text-sm text-green-700">
                        Your payment is protected and files are virus-scanned
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Rich Content Area */}
        {currentProduct.description && (
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Product Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentProduct.description }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* File Information */}
        {currentProduct.files && currentProduct.files.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>File Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentProduct.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Download className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{file.file_name}</p>
                          <p className="text-sm text-gray-600">
                            {file.file_type} • {(file.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      {hasPurchased && (
                        <Button
                          size="sm"
                          onClick={handleDownload}
                        >
                          Download
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-12">
          <ReviewSection 
            product={currentProduct}
            reviews={reviews}
            isLoading={reviewsLoading}
            onReviewSubmit={() => {
              setShowReviewForm(true)
            }}
          />
        </div>

        {/* Review Form Modal */}
        {showReviewForm && hasPurchased && (
          <ReviewForm
            product={currentProduct}
            onClose={() => setShowReviewForm(false)}
            onReviewSubmitted={() => {
              setShowReviewForm(false)
              fetchReviews()
            }}
          />
        )}

        {/* Similar Products */}
        {recommendations.length > 0 && (
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Similar Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recommendations.slice(0, 4).map((recommendation) => (
                    <ProductCard
                      key={recommendation.product.id}
                      product={recommendation.product as MarketplaceProduct}
                      variant="default"
                      showSeller={false}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
