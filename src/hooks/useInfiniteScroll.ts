import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

interface UseInfiniteScrollReturn {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  reset: () => void;
}

export function useInfiniteScroll(
  fetchMore: () => Promise<boolean>, // Returns true if there are more items
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const {
    threshold = 1.0,
    rootMargin = '100px',
    enabled = true
  } = options;

  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage || !enabled) return;

    setIsFetchingNextPage(true);
    try {
      const hasMore = await fetchMore();
      setHasNextPage(hasMore);
    } catch (error) {
      console.error('Error fetching next page:', error);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [fetchMore, isFetchingNextPage, hasNextPage, enabled]);

  const reset = useCallback(() => {
    setHasNextPage(true);
    setIsFetchingNextPage(false);
  }, []);

  useEffect(() => {
    if (!enabled || !loadMoreRef.current) return;

    const currentRef = loadMoreRef.current;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(currentRef);

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage, threshold, rootMargin]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    loadMoreRef,
    reset,
  };
}

// Hook for paginated data fetching
interface UsePaginatedDataOptions<T> {
  pageSize?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

interface UsePaginatedDataReturn<T> {
  data: T[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: Error | null;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  refresh: () => void;
  reset: () => void;
}

export function usePaginatedData<T>(
  fetchFn: (page: number, limit: number) => Promise<{ items: T[]; hasMore: boolean; total?: number }>,
  options: UsePaginatedDataOptions<T> = {}
): UsePaginatedDataReturn<T> {
  const { pageSize = 20, enabled = true, onError } = options;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchMore = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;

    try {
      setError(null);
      const result = await fetchFn(page, pageSize);
      
      setData(prev => [...prev, ...result.items]);
      setPage(prev => prev + 1);
      setHasMore(result.hasMore);
      
      return result.hasMore;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      return false;
    }
  }, [fetchFn, page, pageSize, enabled, onError]);

  const {
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
    reset: resetInfiniteScroll
  } = useInfiniteScroll(fetchMore, { enabled: enabled && hasMore });

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    resetInfiniteScroll();

    try {
      const result = await fetchFn(1, pageSize);
      setData(result.items);
      setPage(2);
      setHasMore(result.hasMore);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pageSize, onError, resetInfiniteScroll]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setIsLoading(false);
    resetInfiniteScroll();
  }, [resetInfiniteScroll]);

  // Initial load
  useEffect(() => {
    if (enabled && data.length === 0 && !isLoading) {
      refresh();
    }
  }, [enabled, data.length, isLoading, refresh]);

  return {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    loadMoreRef,
    refresh,
    reset,
  };
}
