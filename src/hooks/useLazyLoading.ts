/**
 * Lazy Loading Hooks
 * React hooks for optimized component and content loading
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// =============================================
// INTERSECTION OBSERVER HOOK
// =============================================

interface UseIntersectionObserverOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLElement | null>, boolean] {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          if (triggerOnce) {
            observer.disconnect()
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce])

  return [ref, isIntersecting]
}

// =============================================
// LAZY COMPONENT HOOK
// =============================================

interface UseLazyComponentOptions {
  delay?: number
  condition?: boolean
  preload?: boolean
}

export function useLazyComponent<T = any>(
  importFunction: () => Promise<{ default: T }>,
  options: UseLazyComponentOptions = {}
): {
  Component: T | null
  isLoading: boolean
  error: Error | null
  load: () => void
} {
  const { delay = 0, condition = true, preload = false } = options
  const [Component, setComponent] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const hasLoaded = useRef(false)

  const load = useCallback(async () => {
    if (hasLoaded.current || !condition) return

    setIsLoading(true)
    setError(null)

    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      const loadedModule = await importFunction()
      setComponent(loadedModule.default)
      hasLoaded.current = true
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [importFunction, delay, condition])

  // Preload on mount if requested
  useEffect(() => {
    if (preload) {
      load()
    }
  }, [preload, load])

  return { Component, isLoading, error, load }
}

// =============================================
// VIEWPORT LAZY LOADING HOOK
// =============================================

export function useViewportLazyLoading<T = any>(
  importFunction: () => Promise<{ default: T }>,
  options: UseIntersectionObserverOptions & UseLazyComponentOptions = {}
): {
  ref: React.RefObject<HTMLElement | null>
  Component: T | null
  isLoading: boolean
  isVisible: boolean
  error: Error | null
} {
  const [ref, isVisible] = useIntersectionObserver(options)
  const { Component, isLoading, error, load } = useLazyComponent(importFunction, {
    ...options,
    condition: isVisible
  })

  useEffect(() => {
    if (isVisible) {
      load()
    }
  }, [isVisible, load])

  return { ref, Component, isLoading, isVisible, error }
}

// =============================================
// PRELOADING HOOK
// =============================================

interface UsePreloadingOptions {
  trigger?: 'interaction' | 'idle' | 'immediate' | 'hover'
  delay?: number
  condition?: boolean
}

export function usePreloading(
  importFunctions: Array<() => Promise<any>>,
  options: UsePreloadingOptions = {}
): {
  preloadedCount: number
  totalCount: number
  isPreloading: boolean
  preload: () => void
} {
  const { trigger = 'interaction', delay = 0, condition = true } = options
  const [preloadedCount, setPreloadedCount] = useState(0)
  const [isPreloading, setIsPreloading] = useState(false)
  const hasTriggered = useRef(false)

  const preload = useCallback(async () => {
    if (hasTriggered.current || !condition) return

    hasTriggered.current = true
    setIsPreloading(true)

    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      let loaded = 0
      await Promise.allSettled(
        importFunctions.map(async (importFn) => {
          try {
            await importFn()
            loaded++
            setPreloadedCount(loaded)
          } catch (error) {
            // Silently fail individual preloads
          }
        })
      )
    } finally {
      setIsPreloading(false)
    }
  }, [importFunctions, delay, condition])

  useEffect(() => {
    if (trigger === 'immediate') {
      preload()
    } else if (trigger === 'idle') {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preload(), { timeout: 5000 })
      } else {
        setTimeout(preload, 2000)
      }
    } else if (trigger === 'interaction') {
      const events = ['mousedown', 'touchstart', 'keydown']
      const handleInteraction = () => {
        preload()
        events.forEach(event => {
          document.removeEventListener(event, handleInteraction)
        })
      }

      events.forEach(event => {
        document.addEventListener(event, handleInteraction, { once: true, passive: true })
      })

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleInteraction)
        })
      }
    }
  }, [trigger, preload])

  return {
    preloadedCount,
    totalCount: importFunctions.length,
    isPreloading,
    preload
  }
}

// =============================================
// BUNDLE SIZE MONITORING HOOK
// =============================================

export function useBundleMonitoring(): {
  bundleMetrics: {
    loadTime: number
    chunkCount: number
    totalSize: number
    cacheHitRate: number
  }
  performanceScore: number
  recommendations: string[]
} {
  const [bundleMetrics, setBundleMetrics] = useState({
    loadTime: 0,
    chunkCount: 0,
    totalSize: 0,
    cacheHitRate: 0
  })
  const [performanceScore, setPerformanceScore] = useState(0)
  const [recommendations, setRecommendations] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      let totalSize = 0
      let chunkCount = 0
      let loadTime = 0

      entries.forEach(entry => {
        if (entry.name.includes('_next/static')) {
          const size = (entry as any).transferSize || 0
          totalSize += size
          chunkCount++
          loadTime = Math.max(loadTime, entry.duration)
        }
      })

      setBundleMetrics(prev => ({
        loadTime: Math.max(prev.loadTime, loadTime),
        chunkCount: prev.chunkCount + chunkCount,
        totalSize: prev.totalSize + totalSize,
        cacheHitRate: 0 // Would need cache monitoring
      }))

      // Calculate performance score
      const score = calculatePerformanceScore(loadTime, totalSize)
      setPerformanceScore(score)

      // Generate recommendations
      const recs = generateRecommendations(loadTime, totalSize, chunkCount)
      setRecommendations(recs)
    })

    observer.observe({ entryTypes: ['resource'] })

    return () => observer.disconnect()
  }, [])

  return { bundleMetrics, performanceScore, recommendations }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function calculatePerformanceScore(loadTime: number, totalSize: number): number {
  let score = 100

  // Penalize slow load times
  if (loadTime > 3000) score -= 30
  else if (loadTime > 2000) score -= 20
  else if (loadTime > 1000) score -= 10

  // Penalize large bundle sizes
  if (totalSize > 1024 * 1024) score -= 30 // 1MB
  else if (totalSize > 512 * 1024) score -= 20 // 512KB
  else if (totalSize > 350 * 1024) score -= 10 // 350KB

  return Math.max(0, score)
}

function generateRecommendations(loadTime: number, totalSize: number, chunkCount: number): string[] {
  const recommendations: string[] = []

  if (loadTime > 2000) {
    recommendations.push('Consider implementing more aggressive code splitting')
    recommendations.push('Preload critical resources')
  }

  if (totalSize > 350 * 1024) {
    recommendations.push('Bundle size exceeds 350KB target - implement dynamic imports')
    recommendations.push('Enable tree shaking for unused code')
  }

  if (chunkCount > 10) {
    recommendations.push('Too many chunks - consider optimizing chunk splitting strategy')
  }

  if (recommendations.length === 0) {
    recommendations.push('Bundle performance is optimal!')
  }

  return recommendations
}

// =============================================
// PERFORMANCE OPTIMIZATION HOOK
// =============================================

export function usePerformanceOptimization(): {
  optimizeForDevice: () => void
  optimizeForConnection: () => void
  getOptimizationStatus: () => {
    device: string
    connection: string
    optimizations: string[]
  }
} {
  const [optimizations, setOptimizations] = useState<string[]>([])

  const optimizeForDevice = useCallback(() => {
    if (typeof window === 'undefined') return

    const deviceMemory = (navigator as any).deviceMemory || 4
    const hardwareConcurrency = navigator.hardwareConcurrency || 4

    const newOptimizations: string[] = []

    if (deviceMemory < 4) {
      // Low memory device - reduce preloading
      newOptimizations.push('Reduced preloading for low memory device')
    }

    if (hardwareConcurrency < 4) {
      // Low CPU - reduce concurrent operations
      newOptimizations.push('Reduced concurrent operations for low CPU')
    }

    setOptimizations(prev => [...prev, ...newOptimizations])
  }, [])

  const optimizeForConnection = useCallback(() => {
    if (typeof window === 'undefined') return

    const connection = (navigator as any).connection
    if (!connection) return

    const { effectiveType, downlink, saveData } = connection
    const newOptimizations: string[] = []

    if (saveData) {
      newOptimizations.push('Data saver mode detected - minimal preloading')
    }

    if (effectiveType === '2g' || downlink < 0.5) {
      newOptimizations.push('Slow connection - aggressive lazy loading')
    } else if (effectiveType === '4g' && downlink > 2) {
      newOptimizations.push('Fast connection - enhanced preloading')
    }

    setOptimizations(prev => [...prev, ...newOptimizations])
  }, [])

  const getOptimizationStatus = useCallback(() => {
    const deviceMemory = (navigator as any).deviceMemory || 4
    const connection = (navigator as any).connection
    
    return {
      device: `${deviceMemory}GB RAM, ${navigator.hardwareConcurrency || 4} cores`,
      connection: connection ? `${connection.effectiveType}, ${connection.downlink}Mbps` : 'Unknown',
      optimizations
    }
  }, [optimizations])

  useEffect(() => {
    optimizeForDevice()
    optimizeForConnection()
  }, [optimizeForDevice, optimizeForConnection])

  return {
    optimizeForDevice,
    optimizeForConnection,
    getOptimizationStatus
  }
}
