import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Product, ProductSearchFilters, ProductSearchResult } from '@/types/product';
import { ProductCategory } from '@/types/product';

export interface SearchFilters {
  query?: string;
  category_id?: number;
  subcategory_id?: number;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  file_types?: string[];
  tags?: string[];
  sort_by?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popularity';
  is_featured?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchState {
  results: Product[];
  categories: ProductCategory[];
  suggestions: string[];
  isLoading: boolean;
  isLoadingSuggestions: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface UseSearchReturn extends SearchState {
  filters: SearchFilters;
  setFilters: (filters: Partial<SearchFilters>) => void;
  updateFilter: (key: keyof SearchFilters, value: any) => void;
  clearFilters: () => void;
  search: (query?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  getSuggestions: (query: string) => Promise<void>;
  clearSuggestions: () => void;
  resetSearch: () => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  page: 1,
  limit: 20,
  sort_by: 'relevance',
};

export function useSearch(): UseSearchReturn {
  const [filters, setFiltersState] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [state, setState] = useState<SearchState>({
    results: [],
    categories: [],
    suggestions: [],
    isLoading: false,
    isLoadingSuggestions: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Debounce search query to avoid too many API calls
  const debouncedQuery = useDebounce(filters.query || '', 300);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== filters.query) return; // Avoid double search
    if (debouncedQuery || Object.keys(filters).some(key => key !== 'query' && filters[key as keyof SearchFilters] !== undefined)) {
      search();
    }
  }, [debouncedQuery, filters.category_id, filters.min_price, filters.max_price, filters.min_rating, filters.file_types, filters.sort_by, filters.is_featured]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      
      if (response.ok) {
        setState(prev => ({ ...prev, categories: data.data || [] }));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const search = useCallback(async (query?: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const searchFilters = {
        ...filters,
        ...(query !== undefined && { query }),
        page: query !== undefined ? 1 : filters.page, // Reset page when new query
      };

      const searchParams = new URLSearchParams();
      
      // Build search parameters
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              searchParams.set(key, value.join(','));
            }
          } else {
            searchParams.set(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/products/search?${searchParams.toString()}`);
      const data: ProductSearchResult = await response.json();

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const totalPages = Math.ceil(data.total / (searchFilters.limit || 20));

      setState(prev => ({
        ...prev,
        results: searchFilters.page === 1 ? data.products : [...prev.results, ...data.products],
        totalCount: data.total,
        currentPage: searchFilters.page || 1,
        totalPages,
        hasNextPage: (searchFilters.page || 1) < totalPages,
        hasPreviousPage: (searchFilters.page || 1) > 1,
        isLoading: false,
      }));

      // Update filters state if query was provided
      if (query !== undefined) {
        setFiltersState(prev => ({ ...prev, query, page: 1 }));
      }

    } catch (error) {
      console.error('Search error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed',
      }));
    }
  }, [filters]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!state.hasNextPage || state.isLoading) return;

    const nextPage = state.currentPage + 1;
    setFiltersState(prev => ({ ...prev, page: nextPage }));
    await search();
  }, [state.hasNextPage, state.isLoading, state.currentPage, search]);

  const getSuggestions = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, suggestions: [] }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoadingSuggestions: true }));

      const response = await fetch(`/api/products/suggestions?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (response.ok) {
        setState(prev => ({ 
          ...prev, 
          suggestions: data.suggestions || [],
          isLoadingSuggestions: false,
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          suggestions: [],
          isLoadingSuggestions: false,
        }));
      }
    } catch (error) {
      console.error('Suggestions error:', error);
      setState(prev => ({ 
        ...prev, 
        suggestions: [],
        isLoadingSuggestions: false,
      }));
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setState(prev => ({ ...prev, suggestions: [] }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFiltersState(prev => ({ 
      ...prev, 
      ...newFilters,
      page: 1, // Reset page when filters change
    }));
  }, []);

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFiltersState(prev => ({ 
      ...prev, 
      [key]: value,
      page: 1, // Reset page when filter changes
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setState(prev => ({
      ...prev,
      results: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      error: null,
    }));
  }, []);

  const resetSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      suggestions: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      error: null,
    }));
  }, []);

  return {
    ...state,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    search,
    loadMore,
    getSuggestions,
    clearSuggestions,
    resetSearch,
  };
}

