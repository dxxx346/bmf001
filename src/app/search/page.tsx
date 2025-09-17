'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SearchBar } from '@/components/search/SearchBar';
import { FilterSidebar } from '@/components/search/FilterSidebar';
import { SearchResults, SearchResultsSkeleton } from '@/components/search/SearchResults';
import { useSearch } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches] = useState<string[]>([
    'digital art',
    'website templates',
    'stock photos',
    'ui kits',
    'fonts',
  ]);

  const {
    results,
    categories,
    suggestions,
    isLoading,
    isLoadingSuggestions,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    search,
    loadMore,
    getSuggestions,
    clearSuggestions,
    resetSearch,
  } = useSearch();

  // Initialize filters from URL params on mount
  useEffect(() => {
    const initialFilters: any = {};
    
    // Get query from URL
    const query = searchParams.get('q');
    if (query) initialFilters.query = query;
    
    // Get category from URL
    const category = searchParams.get('category');
    if (category) initialFilters.category_id = parseInt(category);
    
    // Get price range from URL
    const minPrice = searchParams.get('min_price');
    if (minPrice) initialFilters.min_price = parseFloat(minPrice);
    
    const maxPrice = searchParams.get('max_price');
    if (maxPrice) initialFilters.max_price = parseFloat(maxPrice);
    
    // Get rating from URL
    const rating = searchParams.get('min_rating');
    if (rating) initialFilters.min_rating = parseInt(rating);
    
    // Get file types from URL
    const fileTypes = searchParams.get('file_types');
    if (fileTypes) initialFilters.file_types = fileTypes.split(',');
    
    // Get sort from URL
    const sort = searchParams.get('sort');
    if (sort) initialFilters.sort_by = sort;
    
    // Get featured filter from URL
    const featured = searchParams.get('featured');
    if (featured === 'true') initialFilters.is_featured = true;
    
    // Get page from URL
    const page = searchParams.get('page');
    if (page) initialFilters.page = parseInt(page);

    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }
  }, [searchParams, setFilters]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (error) {
        console.error('Failed to parse recent searches:', error);
      }
    }
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.query) params.set('q', filters.query);
    if (filters.category_id) params.set('category', filters.category_id.toString());
    if (filters.min_price) params.set('min_price', filters.min_price.toString());
    if (filters.max_price) params.set('max_price', filters.max_price.toString());
    if (filters.min_rating) params.set('min_rating', filters.min_rating.toString());
    if (filters.file_types?.length) params.set('file_types', filters.file_types.join(','));
    if (filters.sort_by && filters.sort_by !== 'relevance') params.set('sort', filters.sort_by);
    if (filters.is_featured) params.set('featured', 'true');
    if (filters.page && filters.page > 1) params.set('page', filters.page.toString());
    
    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  const handleSearch = (query: string) => {
    // Add to recent searches
    if (query.trim()) {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recent-searches', JSON.stringify(updated));
    }
    
    search(query);
    setIsMobileFiltersOpen(false);
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    updateFilter('page', page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    clearFilters();
    resetSearch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Search Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <SearchBar
                value={filters.query}
                suggestions={suggestions}
                recentSearches={recentSearches}
                trendingSearches={trendingSearches}
                isLoadingSuggestions={isLoadingSuggestions}
                onSearch={handleSearch}
                onSuggestionRequest={getSuggestions}
                onClearSuggestions={clearSuggestions}
                placeholder="Search for digital products, templates, graphics..."
                showSuggestions={true}
              />
            </div>
            
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden">
              <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                    {Object.entries(filters).filter(([key, value]) => {
                      if (key === 'query' || key === 'page' || key === 'limit' || key === 'sort_by') return false;
                      if (Array.isArray(value)) return value.length > 0;
                      return value !== undefined && value !== null && value !== '';
                    }).length > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {Object.entries(filters).filter(([key, value]) => {
                          if (key === 'query' || key === 'page' || key === 'limit' || key === 'sort_by') return false;
                          if (Array.isArray(value)) return value.length > 0;
                          return value !== undefined && value !== null && value !== '';
                        }).length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <FilterSidebar
                    filters={filters}
                    categories={categories}
                    onFiltersChange={handleFiltersChange}
                    onClearFilters={handleClearFilters}
                    onToggleCollapse={() => setIsMobileFiltersOpen(false)}
                    className="border-0 shadow-none h-full"
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar
                filters={filters}
                categories={categories}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 min-w-0">
            <SearchResults
              results={results}
              isLoading={isLoading}
              error={error}
              totalCount={totalCount}
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              filters={filters}
              onLoadMore={loadMore}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
            </div>
            <div className="lg:hidden">
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg border p-6 space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-4 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results Skeleton */}
          <div className="flex-1">
            <SearchResultsSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
