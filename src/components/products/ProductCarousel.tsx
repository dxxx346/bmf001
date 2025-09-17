'use client'

import * as React from "react"
import { ProductCard, ProductCardSkeleton } from "./ProductCard"
import { Button } from "@/components/ui/button"
import { MarketplaceProduct } from "@/hooks/useMarketplaceProducts"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductCarouselProps {
  products: MarketplaceProduct[]
  title?: string
  description?: string
  loading?: boolean
  className?: string
  showControls?: boolean
  autoPlay?: boolean
  autoPlayInterval?: number
  itemsPerView?: {
    mobile: number
    tablet: number
    desktop: number
  }
  onProductClick?: (product: MarketplaceProduct) => void
}

export function ProductCarousel({
  products,
  title,
  description,
  loading = false,
  className,
  showControls = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  itemsPerView = {
    mobile: 1,
    tablet: 2,
    desktop: 4
  },
  onProductClick
}: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isHovered, setIsHovered] = React.useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const itemWidth = 100 / itemsPerView.desktop // Percentage width per item

  // Auto-play functionality
  React.useEffect(() => {
    if (!autoPlay || isHovered || loading || products.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const maxIndex = Math.max(0, products.length - itemsPerView.desktop)
        return prev >= maxIndex ? 0 : prev + 1
      })
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, isHovered, loading, products.length, itemsPerView.desktop])

  const canScrollLeft = currentIndex > 0
  const canScrollRight = currentIndex < Math.max(0, products.length - itemsPerView.desktop)

  const scrollTo = (index: number) => {
    const maxIndex = Math.max(0, products.length - itemsPerView.desktop)
    const newIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(newIndex)

    if (scrollContainerRef.current) {
      const scrollLeft = newIndex * (scrollContainerRef.current.scrollWidth / products.length)
      scrollContainerRef.current.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      })
    }
  }

  const scrollLeft = () => {
    scrollTo(currentIndex - 1)
  }

  const scrollRight = () => {
    scrollTo(currentIndex + 1)
  }

  const handleProductClick = (product: MarketplaceProduct) => {
    onProductClick?.(product)
  }

  const renderSkeletons = () => (
    <>
      {Array.from({ length: itemsPerView.desktop }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 px-3">
          <ProductCardSkeleton />
        </div>
      ))}
    </>
  )

  return (
    <div className={cn("relative", className)}>
      {/* Header */}
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-gray-600">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Carousel Container */}
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Navigation Buttons */}
        {showControls && !loading && products.length > itemsPerView.desktop && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg hover:shadow-xl transition-all",
                !canScrollLeft && "opacity-50 cursor-not-allowed"
              )}
              onClick={scrollLeft}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg hover:shadow-xl transition-all",
                !canScrollRight && "opacity-50 cursor-not-allowed"
              )}
              onClick={scrollRight}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Products Container */}
        <div
          ref={scrollContainerRef}
          className="overflow-hidden"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * itemWidth}%)`,
              width: `${(products.length / itemsPerView.desktop) * 100}%`
            }}
          >
            {loading ? (
              renderSkeletons()
            ) : (
              products.map((product) => (
                <div 
                  key={product.id} 
                  className="flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 px-3"
                >
                  <ProductCard
                    product={product}
                    onView={handleProductClick}
                    className="h-full"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dots Indicator */}
        {showControls && !loading && products.length > itemsPerView.desktop && (
          <div className="flex justify-center space-x-2 mt-6">
            {Array.from({ 
              length: Math.ceil(products.length / itemsPerView.desktop) 
            }).map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  i === Math.floor(currentIndex / itemsPerView.desktop)
                    ? "bg-blue-600 w-6"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}

// Responsive Carousel Hook
export function useCarouselResponsive() {
  const [itemsPerView, setItemsPerView] = React.useState({
    mobile: 1,
    tablet: 2,
    desktop: 4
  })

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      
      if (width < 640) {
        setItemsPerView(prev => ({ ...prev, current: prev.mobile }))
      } else if (width < 1024) {
        setItemsPerView(prev => ({ ...prev, current: prev.tablet }))
      } else {
        setItemsPerView(prev => ({ ...prev, current: prev.desktop }))
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return itemsPerView
}

// Featured Products Carousel
interface FeaturedCarouselProps {
  className?: string
}

export function FeaturedCarousel({ className }: FeaturedCarouselProps) {
  // This would use your useFeaturedProducts hook
  const products: MarketplaceProduct[] = [] // Replace with actual hook
  const loading = false // Replace with actual loading state

  return (
    <ProductCarousel
      products={products}
      loading={loading}
      title="Featured Products"
      description="Discover our handpicked selection of premium digital products"
      autoPlay={true}
      autoPlayInterval={6000}
      className={className}
    />
  )
}

// Category Carousel
interface CategoryCarouselProps {
  categoryId: number
  categoryName?: string
  className?: string
}

export function CategoryCarousel({ 
  categoryId, 
  categoryName, 
  className 
}: CategoryCarouselProps) {
  // This would use your useProductsByCategory hook
  const products: MarketplaceProduct[] = [] // Replace with actual hook
  const loading = false // Replace with actual loading state

  return (
    <ProductCarousel
      products={products}
      loading={loading}
      title={categoryName ? `${categoryName} Products` : 'Category Products'}
      showControls={true}
      className={className}
    />
  )
}
