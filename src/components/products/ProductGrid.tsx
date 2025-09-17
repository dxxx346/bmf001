'use client'

import * as React from "react"
import { ProductCard, ProductCardSkeleton } from "./ProductCard"
import { Button } from "@/components/ui/button"
import { Select, SelectItem } from "@/components/ui/dropdown"
import { Badge } from "@/components/ui/badge"
import { MarketplaceProduct, ProductFilters } from "@/hooks/useMarketplaceProducts"
import { useInfiniteScroll, usePaginatedData } from "@/hooks/useInfiniteScroll"
import { Grid, List, Filter, SortAsc, SortDesc } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductGridProps {
  products?: MarketplaceProduct[]
  loading?: boolean
  className?: string
  showFilters?: boolean
  showSorting?: boolean
  showViewToggle?: boolean
  emptyMessage?: string
  emptyDescription?: string
  onFiltersChange?: (filters: ProductFilters) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  // New props for infinite scroll
  enableInfiniteScroll?: boolean
  fetchProducts?: (page: number, limit: number, filters?: ProductFilters) => Promise<{ items: MarketplaceProduct[]; hasMore: boolean; total?: number }>
  initialFilters?: ProductFilters
}

type ViewMode = 'grid' | 'list'
type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'rating' | 'popular'

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' }
]

export function ProductGrid({
  products: externalProducts,
  loading: externalLoading = false,
  className,
  showFilters = true,
  showSorting = true,
  showViewToggle = true,
  emptyMessage = "No products found",
  emptyDescription = "Try adjusting your search or filters to find what you&apos;re looking for.",
  onFiltersChange,
  onLoadMore,
  hasMore: externalHasMore = false,
  loadingMore: externalLoadingMore = false,
  enableInfiniteScroll = false,
  fetchProducts,
  initialFilters = {}
}: ProductGridProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid')
  const [sortBy, setSortBy] = React.useState<SortOption>('newest')
  const [priceRange, setPriceRange] = React.useState<string>('')
  const [currentFilters, setCurrentFilters] = React.useState<ProductFilters>(initialFilters)

  // Infinite scroll implementation
  const infiniteScrollFetch = React.useCallback(
    (page: number, limit: number) => {
      if (!fetchProducts) return Promise.resolve({ items: [], hasMore: false });
      return fetchProducts(page, limit, currentFilters);
    },
    [fetchProducts, currentFilters]
  );

  const {
    data: infiniteProducts,
    isLoading: infiniteLoading,
    isFetchingNextPage: infiniteFetchingMore,
    hasNextPage: infiniteHasMore,
    loadMoreRef,
    refresh: refreshInfinite,
    error: infiniteError
  } = usePaginatedData(infiniteScrollFetch, {
    enabled: enableInfiniteScroll && !!fetchProducts,
    pageSize: 20,
    onError: (error) => console.error('Infinite scroll error:', error)
  });

  // Use infinite scroll data when enabled, otherwise use external props
  const products = enableInfiniteScroll ? infiniteProducts : (externalProducts || []);
  const loading = enableInfiniteScroll ? infiniteLoading : externalLoading;
  const loadingMore = enableInfiniteScroll ? infiniteFetchingMore : externalLoadingMore;
  const hasMore = enableInfiniteScroll ? infiniteHasMore : externalHasMore;

  const handleSortChange = (value: string) => {
    setSortBy(value as SortOption)
    
    const [sortField, sortOrder] = value.split('-')
    const filters: ProductFilters = {}
    
    switch (value) {
      case 'newest':
        filters.sort_by = 'created_at'
        filters.sort_order = 'desc'
        break
      case 'oldest':
        filters.sort_by = 'created_at'
        filters.sort_order = 'asc'
        break
      case 'price-low':
        filters.sort_by = 'price'
        filters.sort_order = 'asc'
        break
      case 'price-high':
        filters.sort_by = 'price'
        filters.sort_order = 'desc'
        break
      case 'rating':
        filters.sort_by = 'rating'
        filters.sort_order = 'desc'
        break
      case 'popular':
        filters.sort_by = 'popularity'
        filters.sort_order = 'desc'
        break
    }
    
    const newFilters = { ...currentFilters, ...filters }
    setCurrentFilters(newFilters)
    
    if (enableInfiniteScroll) {
      refreshInfinite()
    } else {
      onFiltersChange?.(filters)
    }
  }

  const handlePriceRangeChange = (value: string) => {
    setPriceRange(value)
    
    const filters: ProductFilters = {}
    
    switch (value) {
      case 'under-10':
        filters.price_max = 10
        break
      case '10-25':
        filters.price_min = 10
        filters.price_max = 25
        break
      case '25-50':
        filters.price_min = 25
        filters.price_max = 50
        break
      case '50-100':
        filters.price_min = 50
        filters.price_max = 100
        break
      case 'over-100':
        filters.price_min = 100
        break
      default:
        // Clear price filters
        break
    }
    
    const newFilters = { ...currentFilters, ...filters }
    setCurrentFilters(newFilters)
    
    if (enableInfiniteScroll) {
      refreshInfinite()
    } else {
      onFiltersChange?.(filters)
    }
  }

  const getGridClasses = () => {
    if (viewMode === 'list') {
      return "space-y-4"
    }
    
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
  }

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Filter className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {emptyMessage}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {emptyDescription}
      </p>
      <Button variant="outline" onClick={() => {
        setCurrentFilters({})
        if (enableInfiniteScroll) {
          refreshInfinite()
        } else {
          onFiltersChange?.({})
        }
      }}>
        Clear Filters
      </Button>
    </div>
  )

  const renderLoadingGrid = () => (
    <div className={getGridClasses()}>
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton 
          key={i} 
          variant={viewMode === 'list' ? 'compact' : 'default'} 
        />
      ))}
    </div>
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Controls */}
      {(showFilters || showSorting || showViewToggle) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 gap-4">
          {/* Filters */}
          {showFilters && (
            <div className="flex items-center space-x-4">
              <Select
                value={priceRange}
                onValueChange={handlePriceRangeChange}
                placeholder="Price Range"
              >
                <SelectItem value="">All Prices</SelectItem>
                <SelectItem value="under-10">Under $10</SelectItem>
                <SelectItem value="10-25">$10 - $25</SelectItem>
                <SelectItem value="25-50">$25 - $50</SelectItem>
                <SelectItem value="50-100">$50 - $100</SelectItem>
                <SelectItem value="over-100">Over $100</SelectItem>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-4">
            {/* Results Count */}
            <div className="text-sm text-gray-600">
              {!loading && (
                <span>
                  {products.length} product{products.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Sorting */}
            {showSorting && (
              <Select
                value={sortBy}
                onValueChange={handleSortChange}
                placeholder="Sort by"
              >
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            )}

            {/* View Toggle */}
            {showViewToggle && (
              <div className="flex items-center border border-gray-300 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-3"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products Grid/List */}
      {loading ? (
        renderLoadingGrid()
      ) : products.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className={getGridClasses()}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant={viewMode === 'list' ? 'compact' : 'default'}
              showSeller={true}
              showQuickActions={true}
            />
          ))}
        </div>
      )}

      {/* Load More / Infinite Scroll */}
      {enableInfiniteScroll ? (
        <>
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {loadingMore && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Loading more products...</span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        hasMore && (
          <div className="text-center pt-8">
            <Button
              variant="outline"
              onClick={onLoadMore}
              loading={loadingMore}
              loadingText="Loading more..."
              disabled={loadingMore}
            >
              Load More Products
            </Button>
          </div>
        )
      )}
    </div>
  )
}

// Filtered Product Grid with built-in filtering
interface FilteredProductGridProps extends Omit<ProductGridProps, 'products' | 'loading' | 'onFiltersChange'> {
  initialFilters?: ProductFilters
  categoryId?: number
}

export function FilteredProductGrid({
  initialFilters = {},
  categoryId,
  ...props
}: FilteredProductGridProps) {
  const [filters, setFilters] = React.useState<ProductFilters>({
    ...initialFilters,
    ...(categoryId && { category_id: categoryId })
  })

  // This would integrate with your useProducts hook
  const products: MarketplaceProduct[] = [] // Replace with actual hook
  const loading = false // Replace with actual loading state

  const handleFiltersChange = (newFilters: ProductFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  return (
    <ProductGrid
      products={products}
      loading={loading}
      onFiltersChange={handleFiltersChange}
      {...props}
    />
  )
}
