'use client'

import * as React from "react"
import Link from "next/link"
import { ProductImage } from "@/components/ui/optimized-image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/avatar"
import { 
  Heart, 
  ShoppingCart, 
  Star, 
  Eye,
  Download,
  ExternalLink
} from "lucide-react"
import { useAuthContext } from "@/contexts/AuthContext"
import { useFavoritesStore } from "@/lib/store"
import { 
  MarketplaceProduct, 
  useProductActions, 
  formatPrice, 
  getProductUrl,
  getShopUrl 
} from "@/hooks/useMarketplaceProducts"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

interface ProductCardProps {
  product: MarketplaceProduct
  className?: string
  variant?: 'default' | 'compact' | 'detailed'
  showSeller?: boolean
  showQuickActions?: boolean
  onView?: (product: MarketplaceProduct) => void
}

export function ProductCard({
  product,
  className,
  variant = 'default',
  showSeller = true,
  showQuickActions = true,
  onView
}: ProductCardProps) {
  const { user } = useAuthContext()
  const { isFavorite } = useFavoritesStore()
  const { addToCart, toggleFavorite, addToRecentlyViewed, isAddingToCart, isTogglingFavorite } = useProductActions()

  const isProductFavorited = isFavorite(product.id)
  const productUrl = getProductUrl(product)
  const shopUrl = product.shops ? getShopUrl(product.shops) : '#'

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product)
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      toast.error('Please sign in to add favorites')
      return
    }

    toggleFavorite({ product, userId: user.id })
  }

  const handleView = () => {
    addToRecentlyViewed(product)
    onView?.(product)
  }

  const renderRating = () => {
    if (!product.average_rating) return null

    return (
      <div className="flex items-center space-x-1">
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-3 w-3",
                i < Math.floor(product.average_rating || 0)
                  ? "text-yellow-500 fill-current"
                  : "text-gray-300"
              )}
            />
          ))}
        </div>
        <span className="text-xs text-gray-600">
          {product.average_rating?.toFixed(1)}
        </span>
        {product.review_count && (
          <span className="text-xs text-gray-500">
            ({product.review_count})
          </span>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Card className={cn("group cursor-pointer hover:shadow-md transition-all", className)}>
        <Link href={productUrl} onClick={handleView}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {/* Thumbnail */}
              <div className="flex-shrink-0">
                <div className="relative h-16 w-16 bg-gray-100 rounded-lg overflow-hidden">
                  {product.thumbnail_url ? (
                    <ProductImage
                      src={product.thumbnail_url}
                      alt={product.title}
                      fill
                      variant="thumbnail"
                      className="object-cover rounded-lg"
                      fallback={
                        <div className="h-full w-full flex items-center justify-center">
                          <Download className="h-6 w-6 text-gray-400" />
                        </div>
                      }
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Download className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {product.title}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {product.description}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-blue-600">
                    {formatPrice(product.price)}
                  </span>
                  {renderRating()}
                </div>
              </div>

              {/* Quick Actions */}
              {showQuickActions && (
                <div className="flex flex-col space-y-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleToggleFavorite}
                    disabled={isTogglingFavorite}
                  >
                    <Heart className={cn(
                      "h-4 w-4",
                      isProductFavorited ? "fill-red-500 text-red-500" : "text-gray-400"
                    )} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "group cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200",
      className
    )}>
      <Link href={productUrl} onClick={handleView}>
        <div className="relative overflow-hidden">
          {/* Product Image */}
          <div className="relative aspect-video w-full bg-gray-100 overflow-hidden">
            {product.thumbnail_url ? (
              <ProductImage
                src={product.thumbnail_url}
                alt={product.title}
                fill
                variant="card"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                fallback={
                  <div className="h-full w-full flex items-center justify-center">
                    <Download className="h-12 w-12 text-gray-400" />
                  </div>
                }
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Download className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Overlay Actions */}
          {showQuickActions && (
            <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="bg-white/90 hover:bg-white"
                onClick={handleToggleFavorite}
                disabled={isTogglingFavorite}
              >
                <Heart className={cn(
                  "h-4 w-4",
                  isProductFavorited ? "fill-red-500 text-red-500" : "text-gray-600"
                )} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="bg-white/90 hover:bg-white"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Quick view functionality
                }}
              >
                <Eye className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          )}

          {/* Category Badge */}
          {product.categories && (
            <div className="absolute top-2 left-2">
              <Badge variant="outline" size="sm" className="bg-white/90">
                {product.categories.name}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title and Description */}
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {product.title}
            </h3>
            {variant === 'detailed' && product.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {product.description}
              </p>
            )}
          </div>

          {/* Rating */}
          {renderRating()}

          {/* Seller Info */}
          {showSeller && product.shops && (
            <div className="flex items-center space-x-2">
              <UserAvatar
                name={product.shops.name}
                size="xs"
              />
              <Link
                href={shopUrl}
                className="text-xs text-gray-600 hover:text-blue-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {product.shops.name}
              </Link>
            </div>
          )}

          {/* Price and Actions */}
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-blue-600">
              {formatPrice(product.price)}
            </span>
            
            {showQuickActions && (
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                loading={isAddingToCart}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Add to Cart
              </Button>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

// Product Card Skeleton for loading states
export function ProductCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <div className="aspect-video w-full bg-gray-200 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}
