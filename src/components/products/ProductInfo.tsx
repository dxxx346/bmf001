'use client'

import { useState } from 'react'
import { Product } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Star, 
  Heart, 
  Share2, 
  ShoppingCart, 
  Download, 
  Clock, 
  Shield, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Tag,
  Calendar,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductInfoProps {
  product: Product
  hasPurchased?: boolean
  onAddToCart: () => void
  onBuyNow: () => void
  onDownload: () => void
  onShare: () => void
  className?: string
}

export function ProductInfo({ 
  product, 
  hasPurchased = false,
  onAddToCart, 
  onBuyNow, 
  onDownload, 
  onShare,
  className 
}: ProductInfoProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)

  const handleAddToCart = async () => {
    setIsAddingToCart(true)
    try {
      await onAddToCart()
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleBuyNow = async () => {
    setIsBuyingNow(true)
    try {
      await onBuyNow()
    } finally {
      setIsBuyingNow(false)
    }
  }

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderRating = () => {
    if (!product.stats?.average_rating) return null

    const rating = product.stats.average_rating
    const reviewCount = product.stats.review_count || 0

    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < Math.floor(rating)
                  ? "text-yellow-500 fill-current"
                  : "text-gray-300"
              )}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-gray-900">
          {rating.toFixed(1)}
        </span>
        <span className="text-sm text-gray-600">
          ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
        </span>
      </div>
    )
  }

  const renderPrice = () => {
    const hasSalePrice = product.sale_price && product.sale_price < product.price
    const discount = hasSalePrice 
      ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
      : 0

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <span className="text-3xl font-bold text-gray-900">
            {formatPrice(hasSalePrice ? product.sale_price! : product.price, product.currency)}
          </span>
          {hasSalePrice && (
            <Badge className="bg-red-100 text-red-800 border-red-200">
              -{discount}% OFF
            </Badge>
          )}
        </div>
        {hasSalePrice && (
          <div className="flex items-center space-x-2">
            <span className="text-lg text-gray-500 line-through">
              {formatPrice(product.price, product.currency)}
            </span>
            <span className="text-sm text-gray-600">
              You save {formatPrice(product.price - product.sale_price!, product.currency)}
            </span>
          </div>
        )}
      </div>
    )
  }

  const renderFileInfo = () => {
    if (!product.files || product.files.length === 0) return null

    const totalSize = product.files.reduce((sum, file) => sum + file.file_size, 0)
    const fileTypes = [...new Set(product.files.map(file => file.file_type))]

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Download className="h-4 w-4" />
          <span>
            {product.files.length} file{product.files.length !== 1 ? 's' : ''} • {formatFileSize(totalSize)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {fileTypes.map((type) => (
            <Badge key={type} variant="outline" className="text-xs">
              {type.toUpperCase()}
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  const renderAvailability = () => {
    if (product.status === 'active') {
      return (
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Available for purchase</span>
        </div>
      )
    } else if (product.status === 'inactive') {
      return (
        <div className="flex items-center space-x-2 text-yellow-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Temporarily unavailable</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center space-x-2 text-gray-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Not available</span>
        </div>
      )
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Product Title and Rating */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            {product.title}
          </h1>
          {product.short_description && (
            <p className="text-lg text-gray-600 mt-2">
              {product.short_description}
            </p>
          )}
        </div>

        {renderRating()}
      </div>

      <Separator />

      {/* Price */}
      <div>
        {renderPrice()}
      </div>

      <Separator />

      {/* Product Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Category:</span>
            <span className="font-medium">
              {product.category_id ? `Category ${product.category_id}` : 'Uncategorized'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Published:</span>
            <span className="font-medium">
              {formatDate(product.published_at || product.created_at)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Views:</span>
            <span className="font-medium">
              {product.stats?.view_count || 0}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Download className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Downloads:</span>
            <span className="font-medium">
              {product.stats?.download_count || 0}
            </span>
          </div>
        </div>

        {renderFileInfo()}
      </div>

      <Separator />

      {/* Availability */}
      <div>
        {renderAvailability()}
      </div>

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-4">
        {hasPurchased ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">You own this product</span>
            </div>
            <Button 
              onClick={onDownload}
              className="w-full"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Files
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex space-x-3">
              <Button 
                onClick={handleBuyNow}
                disabled={isBuyingNow || product.status !== 'active'}
                loading={isBuyingNow}
                className="flex-1"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Buy Now
              </Button>
              <Button 
                onClick={handleAddToCart}
                disabled={isAddingToCart || product.status !== 'active'}
                loading={isAddingToCart}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsFavorited(!isFavorited)}
                className={cn(
                  "flex-1",
                  isFavorited && "bg-red-50 text-red-600 border-red-200"
                )}
              >
                <Heart className={cn(
                  "h-4 w-4 mr-2",
                  isFavorited && "fill-current"
                )} />
                {isFavorited ? 'Favorited' : 'Add to Favorites'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onShare}
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Security and Guarantee */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Shield className="h-6 w-6 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-blue-900">Secure Purchase</h3>
              <p className="text-sm text-blue-700">
                Your payment is protected by industry-standard encryption. 
                All files are virus-scanned before delivery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instant Access */}
      {product.is_digital && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Clock className="h-6 w-6 text-green-600 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-green-900">Instant Access</h3>
                <p className="text-sm text-green-700">
                  Download immediately after purchase. No waiting, no shipping fees.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Metadata */}
      {(product.metadata?.license_type || product.metadata?.support_included) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Additional Information</h3>
            <div className="space-y-2 text-sm">
              {product.metadata.license_type && (
                <div className="flex justify-between">
                  <span className="text-gray-600">License:</span>
                  <span className="font-medium">{product.metadata.license_type}</span>
                </div>
              )}
              {product.metadata.support_included !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Support:</span>
                  <span className="font-medium">
                    {product.metadata.support_included ? 'Included' : 'Not included'}
                  </span>
                </div>
              )}
              {product.metadata.warranty_period && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Warranty:</span>
                  <span className="font-medium">{product.metadata.warranty_period} days</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
