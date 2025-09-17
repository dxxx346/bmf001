'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAnalytics } from './AnalyticsProvider';

interface ABTestWrapperProps {
  testId: string;
  variants: {
    [key: string]: React.ReactNode;
  };
  defaultVariant?: string;
  onVariantChange?: (variant: string) => void;
  children?: React.ReactNode;
}

export function ABTestWrapper({ 
  testId, 
  variants, 
  defaultVariant,
  onVariantChange,
  children 
}: ABTestWrapperProps) {
  const { getABTestVariant, trackABTestConversion } = useAnalytics();
  const [currentVariant, setCurrentVariant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const assignVariant = async () => {
      try {
        const variant = await getABTestVariant(testId);
        if (variant && variants[variant]) {
          setCurrentVariant(variant);
          onVariantChange?.(variant);
        } else if (defaultVariant && variants[defaultVariant]) {
          setCurrentVariant(defaultVariant);
          onVariantChange?.(defaultVariant);
        } else {
          // Fallback to first available variant
          const firstVariant = Object.keys(variants)[0];
          if (firstVariant) {
            setCurrentVariant(firstVariant);
            onVariantChange?.(firstVariant);
          }
        }
      } catch (error) {
        console.error('Failed to assign A/B test variant:', error);
        // Fallback to default or first variant
        const fallbackVariant = defaultVariant || Object.keys(variants)[0];
        if (fallbackVariant) {
          setCurrentVariant(fallbackVariant);
          onVariantChange?.(fallbackVariant);
        }
      } finally {
        setIsLoading(false);
      }
    };

    assignVariant();
  }, [testId, variants, defaultVariant, getABTestVariant, onVariantChange]);

  // Track conversion for the current variant
  const trackConversion = useCallback((goalId: string, value?: number) => {
    if (currentVariant) {
      trackABTestConversion(testId, goalId, value);
    }
  }, [testId, currentVariant, trackABTestConversion]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!currentVariant || !variants[currentVariant]) {
    return <>{children}</>;
  }

  return (
    <div data-test-id={testId} data-variant={currentVariant}>
      {variants[currentVariant]}
    </div>
  );
}

// Hook for A/B testing
export function useABTest(testId: string, variants: string[], defaultVariant?: string) {
  const { getABTestVariant, trackABTestConversion } = useAnalytics();
  const [currentVariant, setCurrentVariant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const assignVariant = async () => {
      try {
        const variant = await getABTestVariant(testId);
        if (variant && variants.includes(variant)) {
          setCurrentVariant(variant);
        } else if (defaultVariant && variants.includes(defaultVariant)) {
          setCurrentVariant(defaultVariant);
        } else {
          setCurrentVariant(variants[0]);
        }
      } catch (error) {
        console.error('Failed to assign A/B test variant:', error);
        setCurrentVariant(defaultVariant || variants[0]);
      } finally {
        setIsLoading(false);
      }
    };

    assignVariant();
  }, [testId, variants, defaultVariant, getABTestVariant]);

  const trackConversion = useCallback((goalId: string, value?: number) => {
    if (currentVariant) {
      trackABTestConversion(testId, goalId, value);
    }
  }, [testId, currentVariant, trackABTestConversion]);

  return {
    variant: currentVariant,
    isLoading,
    trackConversion
  };
}

// Component for tracking A/B test conversions
interface ABTestConversionTrackerProps {
  testId: string;
  goalId: string;
  trigger: 'click' | 'view' | 'custom';
  value?: number;
  children: React.ReactNode;
  className?: string;
}

export function ABTestConversionTracker({ 
  testId, 
  goalId, 
  trigger, 
  value,
  children, 
  className 
}: ABTestConversionTrackerProps) {
  const { trackABTestConversion } = useAnalytics();

  const handleConversion = useCallback(() => {
    trackABTestConversion(testId, goalId, value);
  }, [testId, goalId, value, trackABTestConversion]);

  useEffect(() => {
    if (trigger === 'view') {
      handleConversion();
    }
  }, [trigger, handleConversion]);

  if (trigger === 'click') {
    return (
      <div 
        className={className}
        onClick={handleConversion}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

// Hook for tracking A/B test events
export function useABTestTracking(testId: string) {
  const { trackABTestConversion } = useAnalytics();

  const trackEvent = useCallback((goalId: string, value?: number) => {
    trackABTestConversion(testId, goalId, value);
  }, [testId, trackABTestConversion]);

  return { trackEvent };
}
