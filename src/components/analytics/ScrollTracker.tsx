'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAnalytics } from './AnalyticsProvider';

interface ScrollTrackerProps {
  children: React.ReactNode;
  trackScrollDepth?: boolean;
  trackScrollTime?: boolean;
  scrollDepthThresholds?: number[];
  scrollTimeThresholds?: number[];
}

export function ScrollTracker({ 
  children, 
  trackScrollDepth = true,
  trackScrollTime = true,
  scrollDepthThresholds = [25, 50, 75, 90, 100],
  scrollTimeThresholds = [5, 10, 30, 60, 120] // seconds
}: ScrollTrackerProps) {
  const { trackCustomEvent } = useAnalytics();
  const [scrollDepth, setScrollDepth] = useState(0);
  const [scrollTime, setScrollTime] = useState(0);
  const [reachedThresholds, setReachedThresholds] = useState<Set<number>>(new Set());
  const [timeThresholds, setTimeThresholds] = useState<Set<number>>(new Set());
  const startTimeRef = useRef<number>(Date.now());
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const currentScrollDepth = Math.round((scrollTop / documentHeight) * 100);
    
    setScrollDepth(currentScrollDepth);

    // Track scroll depth milestones
    if (trackScrollDepth) {
      scrollDepthThresholds.forEach(threshold => {
        if (currentScrollDepth >= threshold && !reachedThresholds.has(threshold)) {
          setReachedThresholds(prev => new Set([...prev, threshold]));
          
          trackCustomEvent({
            eventType: 'scroll_depth',
            properties: {
              scroll_depth: threshold,
              page_url: window.location.href,
              page_path: window.location.pathname
            }
          });
        }
      });
    }
  }, [trackScrollDepth, scrollDepthThresholds, reachedThresholds, trackCustomEvent]);

  const handleTimeTracking = useCallback(() => {
    if (!trackScrollTime) return;

    const currentTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    setScrollTime(currentTime);

    // Track time milestones
    scrollTimeThresholds.forEach(threshold => {
      if (currentTime >= threshold && !timeThresholds.has(threshold)) {
        setTimeThresholds(prev => new Set([...prev, threshold]));
        
        trackCustomEvent({
          eventType: 'scroll_time',
          properties: {
            scroll_time: threshold,
            page_url: window.location.href,
            page_path: window.location.pathname
            }
          });
        }
      });
    }, [trackScrollTime, scrollTimeThresholds, timeThresholds, trackCustomEvent]);

  // Debounced scroll handler
  const debouncedScrollHandler = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      handleScroll();
    }, 100);
  }, [handleScroll]);

  // Track time every second
  useEffect(() => {
    if (!trackScrollTime) return;

    const interval = setInterval(handleTimeTracking, 1000);
    return () => clearInterval(interval);
  }, [handleTimeTracking, trackScrollTime]);

  // Track scroll events
  useEffect(() => {
    window.addEventListener('scroll', debouncedScrollHandler, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', debouncedScrollHandler);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [debouncedScrollHandler]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, track the current scroll depth and time
        trackCustomEvent({
          eventType: 'page_hidden',
          properties: {
            scroll_depth: scrollDepth,
            scroll_time: scrollTime,
            page_url: window.location.href,
            page_path: window.location.pathname
          }
        });
      } else {
        // Page is visible again, reset start time
        startTimeRef.current = Date.now();
        setScrollTime(0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scrollDepth, scrollTime, trackCustomEvent]);

  // Track when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      trackCustomEvent({
        eventType: 'page_leave',
        properties: {
          scroll_depth: scrollDepth,
          scroll_time: scrollTime,
          page_url: window.location.href,
          page_path: window.location.pathname
        }
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [scrollDepth, scrollTime, trackCustomEvent]);

  return <>{children}</>;
}

// Hook for tracking scroll on specific elements
export function useScrollTracking(
  elementRef: React.RefObject<HTMLElement>,
  options?: {
    trackScrollDepth?: boolean;
    scrollDepthThresholds?: number[];
    eventType?: string;
  }
) {
  const { trackCustomEvent } = useAnalytics();
  const [scrollDepth, setScrollDepth] = useState(0);
  const [reachedThresholds, setReachedThresholds] = useState<Set<number>>(new Set());

  const handleScroll = useCallback(() => {
    const element = elementRef.current;
    if (!element || !options?.trackScrollDepth) return;

    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight - element.clientHeight;
    const currentScrollDepth = Math.round((scrollTop / scrollHeight) * 100);
    
    setScrollDepth(currentScrollDepth);

    // Track scroll depth milestones
    const thresholds = options.scrollDepthThresholds || [25, 50, 75, 90, 100];
    thresholds.forEach(threshold => {
      if (currentScrollDepth >= threshold && !reachedThresholds.has(threshold)) {
        setReachedThresholds(prev => new Set([...prev, threshold]));
        
        trackCustomEvent({
          eventType: options.eventType || 'element_scroll_depth',
          properties: {
            scroll_depth: threshold,
            element_id: element.id || undefined,
            element_class: element.className || undefined,
            page_url: window.location.href,
            page_path: window.location.pathname
          }
        });
      }
    });
  }, [elementRef, options, reachedThresholds, trackCustomEvent]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !options?.trackScrollDepth) return;

    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [elementRef, handleScroll, options?.trackScrollDepth]);

  return { scrollDepth };
}
