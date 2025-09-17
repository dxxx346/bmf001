'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useAnalytics } from './AnalyticsProvider';

interface ClickTrackerProps {
  children: React.ReactNode;
  trackAllClicks?: boolean;
  excludedSelectors?: string[];
  includedSelectors?: string[];
}

export function ClickTracker({ 
  children, 
  trackAllClicks = true,
  excludedSelectors = [],
  includedSelectors = []
}: ClickTrackerProps) {
  const { trackClick } = useAnalytics();
  const clickTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Check if click should be tracked
    if (!shouldTrackClick(target, trackAllClicks, excludedSelectors, includedSelectors)) {
      return;
    }

    // Debounce rapid clicks
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      const clickData = {
        elementId: target.id || undefined,
        elementClass: target.className || undefined,
        elementText: getElementText(target),
        elementType: target.tagName.toLowerCase(),
        pageUrl: window.location.href,
        positionX: event.clientX,
        positionY: event.clientY
      };

      trackClick(clickData);
    }, 100);
  }, [trackClick, trackAllClicks, excludedSelectors, includedSelectors]);

  useEffect(() => {
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, [handleClick]);

  return <>{children}</>;
}

function shouldTrackClick(
  element: HTMLElement, 
  trackAllClicks: boolean,
  excludedSelectors: string[],
  includedSelectors: string[]
): boolean {
  // If specific selectors are included, only track those
  if (includedSelectors.length > 0) {
    return includedSelectors.some(selector => element.matches(selector));
  }

  // Check excluded selectors
  if (excludedSelectors.some(selector => element.matches(selector))) {
    return false;
  }

  // Skip tracking for certain elements
  const skipElements = ['script', 'style', 'meta', 'link', 'title'];
  if (skipElements.includes(element.tagName.toLowerCase())) {
    return false;
  }

  // Skip if element has data-no-track attribute
  if (element.hasAttribute('data-no-track')) {
    return false;
  }

  return trackAllClicks;
}

function getElementText(element: HTMLElement): string {
  // Get text content, but limit length
  const text = element.textContent || '';
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
}

// Hook for tracking specific element clicks
export function useClickTracking(
  elementRef: React.RefObject<HTMLElement>,
  options?: {
    eventType?: string;
    properties?: Record<string, any>;
  }
) {
  const { trackClick, trackCustomEvent } = useAnalytics();

  const trackElementClick = useCallback((event: React.MouseEvent) => {
    const element = elementRef.current;
    if (!element) return;

    const clickData = {
      elementId: element.id || undefined,
      elementClass: element.className || undefined,
      elementText: getElementText(element),
      elementType: element.tagName.toLowerCase(),
      pageUrl: window.location.href,
      positionX: event.clientX,
      positionY: event.clientY
    };

    trackClick(clickData);

    // Track custom event if specified
    if (options?.eventType) {
      trackCustomEvent({
        eventType: options.eventType,
        properties: {
          ...options.properties,
          ...clickData
        }
      });
    }
  }, [elementRef, trackClick, trackCustomEvent, options]);

  return trackElementClick;
}
