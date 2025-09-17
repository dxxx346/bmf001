'use client';

import { useState } from 'react';
import { 
  Grid, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  Search as SearchIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { cn } from '@/lib/utils';
import { SearchFilters } from '@/hooks/useSearch';
import { MarketplaceProduct } from '@/hooks/useMarketplaceProducts';

interface SearchResultsProps {
  results: MarketplaceProduct[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  filters: SearchFilters;
  onLoadMore: () => void;
  onPageChange: (page: number) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';

export function SearchResults({
  results,
  isLoading,
  error,
  totalCount,
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  filters,
  onLoadMore,
  onPageChange,
  className,
}: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const formatResultsCount = () => {
    if (totalCount === 0) return 'No results';
    if (totalCount === 1) return '1 result';
    return `${totalCount.toLocaleString()} results`;
  };

  const formatResultsRange = () => {
    const start = (currentPage - 1) * (filters.limit || 20) + 1;
    const end = Math.min(currentPage * (filters.limit || 20), totalCount);
    return `${start}-${end}`;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages: number[] = [];
      const showPages = 5;
      const halfShow = Math.floor(showPages / 2);
      
      let start = Math.max(1, currentPage - halfShow);
      let end = Math.min(totalPages, currentPage + halfShow);
      
      // Adjust if we&apos;re near the beginning or end
      if (end - start + 1 < showPages) {
        if (start === 1) {
          end = Math.min(totalPages, start + showPages - 1);
        } else {
          start = Math.max(1, end - showPages + 1);
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage || isLoading}
          className="flex items-center space-x-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        {pageNumbers[0] > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={isLoading}
            >
              1
            </Button>
            {pageNumbers[0] > 2 && (
              <span className="px-2 py-1 text-gray-500">...</span>
            )}
          </>
        )}

        {pageNumbers.map(page => (
          <Button
            key={page}
            variant={page === currentPage ? "primary" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            disabled={isLoading}
            className={cn(
              page === currentPage && "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {page}
          </Button>
        ))}

        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="px-2 py-1 text-gray-500">...</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={isLoading}
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || isLoading}
          className="flex items-center space-x-1"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderLoadMore = () => {
    if (!hasNextPage || totalPages <= 1) return null;

    return (
      <div className="flex justify-center mt-8">
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Load More Products</span>
        </Button>
      </div>
    );
  };

  const renderResults = () => {
    if (isLoading && results.length === 0) {
      return (
        <div className="space-y-6">
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          )}>
            {Array.from({ length: 8 }, (_, i) => (
              <ProductCardSkeleton 
                key={i} 
                variant={viewMode === 'list' ? 'compact' : 'default'} 
              />
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="p-8 text-center">
          <CardContent>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Search Error
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (results.length === 0) {
      return (
        <Card className="p-8 text-center">
          <CardContent>
            <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600 mb-4">
              {filters.query 
                ? `No results for "${filters.query}". Try adjusting your search terms or filters.`
                : 'No products match your current filters. Try adjusting your criteria.'
              }
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>Suggestions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your spelling</li>
                <li>Try more general keywords</li>
                <li>Remove some filters</li>
                <li>Browse our popular categories</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        )}>
          {results.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant={viewMode === 'list' ? 'compact' : 'default'}
              showSeller={true}
              showQuickActions={true}
            />
          ))}
        </div>

        {/* Loading more indicator */}
        {isLoading && results.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="flex items-center space-x-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more products...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {formatResultsCount()}
              {filters.query && (
                <span className="font-normal text-gray-600">
                  {' '}for "{filters.query}"
                </span>
              )}
            </h2>
            {totalCount > 0 && (
              <p className="text-sm text-gray-500">
                Showing {formatResultsRange()} of {totalCount.toLocaleString()} products
              </p>
            )}
          </div>
          
          {/* Active filters indicator */}
          {Object.entries(filters).some(([key, value]) => {
            if (key === 'query' || key === 'page' || key === 'limit' || key === 'sort_by') return false;
            if (Array.isArray(value)) return value.length > 0;
            return value !== undefined && value !== null && value !== '';
          }) && (
            <Badge variant="secondary" className="text-xs">
              Filtered
            </Badge>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 hidden sm:inline">View:</span>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none border-0"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none border-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {renderResults()}

      {/* Pagination */}
      {renderPagination()}

      {/* Load More Button (alternative to pagination) */}
      {/* {renderLoadMore()} */}
    </div>
  );
}

// Results skeleton for loading state
export function SearchResultsSkeleton({ viewMode = 'grid' }: { viewMode?: ViewMode }) {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
      </div>

      {/* Results skeleton */}
      <div className={cn(
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      )}>
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton 
            key={i} 
            variant={viewMode === 'list' ? 'compact' : 'default'} 
          />
        ))}
      </div>
    </div>
  );
}
