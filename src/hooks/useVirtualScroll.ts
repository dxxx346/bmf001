import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  enabled?: boolean;
}

interface VirtualItem {
  index: number;
  start: number;
  end: number;
}

interface UseVirtualScrollReturn {
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  visibleItems: VirtualItem[];
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
  getItemProps: (index: number) => {
    key: string;
    style: React.CSSProperties;
  };
}

export function useVirtualScroll<T>(
  items: T[],
  options: UseVirtualScrollOptions
): UseVirtualScrollReturn {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    enabled = true
  } = options;

  // Validate inputs
  if (itemHeight <= 0) {
    throw new Error('itemHeight must be greater than 0');
  }
  if (containerHeight <= 0) {
    throw new Error('containerHeight must be greater than 0');
  }
  if (overscan < 0) {
    throw new Error('overscan must be non-negative');
  }

  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  const startIndex = useMemo(() => {
    if (!enabled || !items || items.length === 0) return 0;
    return Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  }, [scrollTop, itemHeight, overscan, enabled, items.length]);

  const endIndex = useMemo(() => {
    if (!enabled || !items || items.length === 0) return 0;
    return Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length, enabled]);

  const visibleItems = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }
    if (!enabled) {
      return items.map((_, index) => ({
        index,
        start: index * itemHeight,
        end: (index + 1) * itemHeight,
      }));
    }

    const itemsToRender: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      itemsToRender.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
      });
    }
    return itemsToRender;
  }, [startIndex, endIndex, itemHeight, enabled, items]);

  const getItemProps = useCallback((index: number) => {
    return {
      key: `virtual-item-${index}`,
      style: {
        position: 'absolute' as const,
        top: index * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      },
    };
  }, [itemHeight]);

  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement || !enabled) return;

    const handleScroll = () => {
      setScrollTop(scrollElement.scrollTop);
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [enabled]);

  return {
    totalHeight,
    startIndex,
    endIndex,
    visibleItems,
    scrollElementRef,
    getItemProps,
  };
}

// Hook for variable height items
interface UseVirtualScrollVariableOptions {
  estimateItemHeight: (index: number) => number;
  containerHeight: number;
  overscan?: number;
  enabled?: boolean;
}

interface VariableVirtualItem {
  index: number;
  start: number;
  end: number;
  height: number;
}

interface UseVirtualScrollVariableReturn {
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  visibleItems: VariableVirtualItem[];
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
  getItemProps: (index: number) => {
    key: string;
    style: React.CSSProperties;
  };
  measureItem: (index: number, height: number) => void;
}

export function useVirtualScrollVariable<T>(
  items: T[],
  options: UseVirtualScrollVariableOptions
): UseVirtualScrollVariableReturn {
  const {
    estimateItemHeight,
    containerHeight,
    overscan = 5,
    enabled = true
  } = options;

  // Validate inputs
  if (containerHeight <= 0) {
    throw new Error('containerHeight must be greater than 0');
  }
  if (overscan < 0) {
    throw new Error('overscan must be non-negative');
  }
  if (typeof estimateItemHeight !== 'function') {
    throw new Error('estimateItemHeight must be a function');
  }

  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map());
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const itemOffsets = useMemo(() => {
    const offsets = new Map<number, number>();
    let offset = 0;
    
    for (let i = 0; i < items.length; i++) {
      offsets.set(i, offset);
      const height = measuredHeights.get(i) ?? estimateItemHeight(i);
      offset += height;
    }
    
    return offsets;
  }, [items.length, measuredHeights, estimateItemHeight]);

  const totalHeight = useMemo(() => {
    if (!items || items.length === 0) return 0;
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += measuredHeights.get(i) ?? estimateItemHeight(i);
    }
    return height;
  }, [items.length, measuredHeights, estimateItemHeight]);

  const startIndex = useMemo(() => {
    if (!enabled || !items || items.length === 0) return 0;
    
    let start = 0;
    let end = items.length - 1;
    
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const offset = itemOffsets.get(mid) ?? 0;
      
      if (offset < scrollTop) {
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }
    
    return Math.max(0, start - overscan);
  }, [scrollTop, itemOffsets, items.length, overscan, enabled]);

  const endIndex = useMemo(() => {
    if (!enabled || !items || items.length === 0) return 0;
    
    let index = startIndex;
    let currentOffset = itemOffsets.get(startIndex) ?? 0;
    
    while (index < items.length && currentOffset < scrollTop + containerHeight) {
      const height = measuredHeights.get(index) ?? estimateItemHeight(index);
      if (height <= 0) {
        console.warn(`Invalid height (${height}) for item at index ${index}`);
        break;
      }
      currentOffset += height;
      index++;
    }
    
    return Math.min(items.length - 1, index + overscan);
  }, [startIndex, itemOffsets, scrollTop, containerHeight, items.length, measuredHeights, estimateItemHeight, overscan, enabled]);

  const visibleItems = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }
    if (!enabled) {
      let offset = 0;
      return items.map((_, index) => {
        const height = measuredHeights.get(index) ?? estimateItemHeight(index);
        const item = {
          index,
          start: offset,
          end: offset + height,
          height,
        };
        offset += height;
        return item;
      });
    }

    const itemsToRender: VariableVirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const start = itemOffsets.get(i) ?? 0;
      const height = measuredHeights.get(i) ?? estimateItemHeight(i);
      itemsToRender.push({
        index: i,
        start,
        end: start + height,
        height,
      });
    }
    return itemsToRender;
  }, [startIndex, endIndex, itemOffsets, measuredHeights, estimateItemHeight, enabled, items]);

  const getItemProps = useCallback((index: number) => {
    const start = itemOffsets.get(index) ?? 0;
    const height = measuredHeights.get(index) ?? estimateItemHeight(index);
    
    return {
      key: `virtual-item-${index}`,
      style: {
        position: 'absolute' as const,
        top: start,
        left: 0,
        right: 0,
        height,
      },
    };
  }, [itemOffsets, measuredHeights, estimateItemHeight]);

  const measureItem = useCallback((index: number, height: number) => {
    if (index < 0 || height <= 0) {
      console.warn(`Invalid measurement: index=${index}, height=${height}`);
      return;
    }
    setMeasuredHeights(prev => {
      if (prev.get(index) !== height) {
        const next = new Map(prev);
        next.set(index, height);
        return next;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement || !enabled) return;

    const handleScroll = () => {
      setScrollTop(scrollElement.scrollTop);
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [enabled]);

  return {
    totalHeight,
    startIndex,
    endIndex,
    visibleItems,
    scrollElementRef,
    getItemProps,
    measureItem,
  };
}
