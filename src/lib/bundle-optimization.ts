/**
 * Bundle Optimization Utilities
 * Client-side utilities for optimal loading and performance
 */

// =============================================
// PRELOADING UTILITIES
// =============================================

export class BundleOptimizer {
  private static preloadedModules = new Set<string>()
  private static loadingModules = new Map<string, Promise<any>>()

  /**
   * Preload module for faster subsequent loading
   */
  static async preloadModule(importFunction: () => Promise<any>, moduleId: string): Promise<void> {
    if (this.preloadedModules.has(moduleId)) {
      return // Already preloaded
    }

    if (this.loadingModules.has(moduleId)) {
      return this.loadingModules.get(moduleId) // Already loading
    }

    const loadPromise = importFunction()
      .then(module => {
        this.preloadedModules.add(moduleId)
        this.loadingModules.delete(moduleId)
        return module
      })
      .catch(error => {
        this.loadingModules.delete(moduleId)
        console.warn(`Failed to preload module ${moduleId}:`, error)
      })

    this.loadingModules.set(moduleId, loadPromise)
    return loadPromise
  }

  /**
   * Preload components based on user role
   */
  static preloadByRole(role: 'buyer' | 'seller' | 'partner' | 'admin'): void {
    if (typeof window === 'undefined') return

    const rolePreloads = {
      buyer: [
        () => import('@/components/buyer/DownloadButton'),
        () => import('@/components/buyer/OrderCard'),
        () => import('@/app/buyer/dashboard/page')
      ],
      seller: [
        () => import('@/components/seller/ProductForm'),
        () => import('@/components/seller/FileUpload'),
        () => import('@/app/seller/dashboard/page')
      ],
      partner: [
        () => import('@/components/partner/CommissionTable'),
        () => import('@/components/partner/EarningsChart'),
        () => import('@/app/partner/dashboard/page')
      ],
      admin: [
        () => import('@/components/admin/ModerationQueue'),
        () => import('@/components/analytics/ProductPerformance'),
        () => import('@/app/admin/dashboard/page')
      ]
    }

    const preloads = rolePreloads[role] || []
    preloads.forEach((importFn, index) => {
      this.preloadModule(importFn, `${role}-${index}`)
    })
  }

  /**
   * Preload on user interaction
   */
  static setupInteractionPreloading(): void {
    if (typeof window === 'undefined') return

    let hasPreloaded = false

    const preloadOnInteraction = () => {
      if (hasPreloaded) return
      hasPreloaded = true

      // Preload common heavy components
      this.preloadModule(() => import('@/components/analytics/RevenueChart'), 'revenue-chart')
      this.preloadModule(() => import('@/components/seller/ProductForm'), 'product-form')
      this.preloadModule(() => import('@/components/partner/CommissionTable'), 'commission-table')
    }

    // Preload on first meaningful interaction
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll']
    events.forEach(event => {
      document.addEventListener(event, preloadOnInteraction, { 
        once: true, 
        passive: true 
      })
    })

    // Fallback: preload after 3 seconds
    setTimeout(preloadOnInteraction, 3000)
  }

  /**
   * Preload components in viewport
   */
  static setupViewportPreloading(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            const preloadId = element.dataset.preload
            
            if (preloadId) {
              this.preloadByPreloadId(preloadId)
              observer.unobserve(element)
            }
          }
        })
      },
      { rootMargin: '50px' }
    )

    // Observe elements with data-preload attribute
    document.querySelectorAll('[data-preload]').forEach(el => {
      observer.observe(el)
    })
  }

  private static preloadByPreloadId(preloadId: string): void {
    const preloadMap: Record<string, () => Promise<any>> = {
      'seller-dashboard': () => import('@/app/seller/dashboard/page'),
      'buyer-dashboard': () => import('@/app/buyer/dashboard/page'),
      'partner-dashboard': () => import('@/app/partner/dashboard/page'),
      'admin-dashboard': () => import('@/app/admin/dashboard/page'),
      'product-form': () => import('@/components/seller/ProductForm'),
      'commission-table': () => import('@/components/partner/CommissionTable'),
      'analytics-chart': () => import('@/components/analytics/ProductPerformance'),
      'file-upload': () => import('@/components/seller/FileUpload')
    }

    const importFn = preloadMap[preloadId]
    if (importFn) {
      this.preloadModule(importFn, preloadId)
    }
  }

  /**
   * Get preloading status
   */
  static getPreloadStatus(): {
    preloaded: string[]
    loading: string[]
    total: number
  } {
    return {
      preloaded: Array.from(this.preloadedModules),
      loading: Array.from(this.loadingModules.keys()),
      total: this.preloadedModules.size + this.loadingModules.size
    }
  }
}

// =============================================
// RESOURCE HINTS
// =============================================

export class ResourceHints {
  /**
   * Add preload hints for critical resources
   */
  static addPreloadHints(): void {
    if (typeof window === 'undefined') return

    const criticalResources = [
      // Critical CSS
      { href: '/_next/static/css/app.css', as: 'style' },
      // Critical fonts
      { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
      // Critical images
      { href: '/images/logo.svg', as: 'image' }
    ]

    criticalResources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource.href
      link.as = resource.as
      if (resource.type) link.type = resource.type
      if (resource.crossorigin) link.crossOrigin = resource.crossorigin
      
      document.head.appendChild(link)
    })
  }

  /**
   * Add prefetch hints for likely next pages
   */
  static addPrefetchHints(userRole?: string): void {
    if (typeof window === 'undefined') return

    const rolePrefetches = {
      buyer: [
        '/buyer/orders',
        '/buyer/favorites',
        '/search'
      ],
      seller: [
        '/seller/products',
        '/seller/analytics',
        '/seller/shops'
      ],
      partner: [
        '/partner/links',
        '/partner/earnings',
        '/partner/analytics'
      ],
      admin: [
        '/admin/users',
        '/admin/products',
        '/admin/analytics'
      ]
    }

    const prefetches = userRole ? rolePrefetches[userRole as keyof typeof rolePrefetches] || [] : []
    
    prefetches.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = href
      document.head.appendChild(link)
    })
  }

  /**
   * Add DNS prefetch for external domains
   */
  static addDNSPrefetch(): void {
    if (typeof window === 'undefined') return

    const domains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'api.stripe.com',
      'js.stripe.com'
    ]

    domains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = `//${domain}`
      document.head.appendChild(link)
    })
  }
}

// =============================================
// LAZY LOADING UTILITIES
// =============================================

export class LazyLoader {
  private static observer: IntersectionObserver | null = null

  /**
   * Initialize intersection observer for lazy loading
   */
  static init(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            this.loadElement(element)
            this.observer?.unobserve(element)
          }
        })
      },
      {
        rootMargin: '100px', // Start loading 100px before element enters viewport
        threshold: 0.1
      }
    )
  }

  /**
   * Observe element for lazy loading
   */
  static observe(element: HTMLElement): void {
    if (this.observer) {
      this.observer.observe(element)
    }
  }

  /**
   * Load element content
   */
  private static loadElement(element: HTMLElement): void {
    const lazyType = element.dataset.lazy
    
    switch (lazyType) {
      case 'image':
        this.loadLazyImage(element as HTMLImageElement)
        break
      case 'component':
        this.loadLazyComponent(element)
        break
      case 'iframe':
        this.loadLazyIframe(element as HTMLIFrameElement)
        break
    }
  }

  private static loadLazyImage(img: HTMLImageElement): void {
    const src = img.dataset.src
    if (src) {
      img.src = src
      img.classList.remove('lazy')
      img.classList.add('loaded')
    }
  }

  private static loadLazyComponent(element: HTMLElement): void {
    const componentId = element.dataset.component
    if (componentId) {
      // Trigger component loading
      element.dispatchEvent(new CustomEvent('lazyload', { detail: { componentId } }))
    }
  }

  private static loadLazyIframe(iframe: HTMLIFrameElement): void {
    const src = iframe.dataset.src
    if (src) {
      iframe.src = src
      iframe.classList.remove('lazy')
    }
  }

  /**
   * Cleanup observer
   */
  static destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}

// =============================================
// PERFORMANCE MONITORING
// =============================================

export class PerformanceMonitor {
  /**
   * Monitor bundle loading performance
   */
  static monitorBundlePerformance(): void {
    if (typeof window === 'undefined') return

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach(entry => {
        if (entry.name.includes('_next/static')) {
          const size = (entry as any).transferSize || 0
          const duration = entry.duration
          
          if (size > 100 * 1024) { // Log chunks larger than 100KB
            console.log(`📦 Large chunk loaded: ${entry.name.split('/').pop()} - ${(size / 1024).toFixed(1)}KB in ${duration.toFixed(1)}ms`)
          }
        }
      })
    })

    observer.observe({ entryTypes: ['resource'] })

    // Monitor Core Web Vitals
    this.monitorCoreWebVitals()
  }

  /**
   * Monitor Core Web Vitals
   */
  static monitorCoreWebVitals(): void {
    if (typeof window === 'undefined') return

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      
      console.log(`🎯 LCP: ${lastEntry.startTime.toFixed(1)}ms`)
      
      if (lastEntry.startTime > 2500) {
        console.warn('⚠️ LCP is slow - consider optimizing largest content element')
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay (FID) - approximated with First Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        console.log(`⚡ FCP: ${entry.startTime.toFixed(1)}ms`)
        
        if (entry.startTime > 1800) {
          console.warn('⚠️ FCP is slow - consider reducing bundle size')
        }
      })
    }).observe({ entryTypes: ['first-contentful-paint'] })

    // Cumulative Layout Shift (CLS) - monitor layout shifts
    let clsScore = 0
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsScore += (entry as any).value
        }
      })
      
      if (clsScore > 0.1) {
        console.warn(`⚠️ CLS score: ${clsScore.toFixed(3)} - consider fixing layout shifts`)
      }
    }).observe({ entryTypes: ['layout-shift'] })
  }

  /**
   * Optimize loading based on connection speed
   */
  static optimizeForConnection(): void {
    if (typeof window === 'undefined') return

    const connection = (navigator as any).connection
    if (!connection) return

    const { effectiveType, downlink } = connection

    // Adjust loading strategy based on connection
    if (effectiveType === '4g' && downlink > 1.5) {
      // Fast connection - preload more aggressively
      BundleOptimizer.preloadModule(() => import('@/components/analytics/ProductPerformance'), 'analytics-aggressive')
      BundleOptimizer.preloadModule(() => import('@/components/seller/ProductForm'), 'product-form-aggressive')
    } else if (effectiveType === '3g' || downlink < 1) {
      // Slow connection - minimal preloading
      console.log('🐌 Slow connection detected - reducing preloading')
    }
  }
}

// =============================================
// CHUNK LOADING OPTIMIZATION
// =============================================

export class ChunkLoader {
  private static chunkCache = new Map<string, any>()

  /**
   * Load chunk with caching
   */
  static async loadChunk(chunkName: string, importFunction: () => Promise<any>): Promise<any> {
    if (this.chunkCache.has(chunkName)) {
      return this.chunkCache.get(chunkName)
    }

    try {
      const loadedModule = await importFunction()
      this.chunkCache.set(chunkName, loadedModule)
      return loadedModule
    } catch (error) {
      console.error(`Failed to load chunk ${chunkName}:`, error)
      throw error
    }
  }

  /**
   * Preload critical chunks
   */
  static preloadCriticalChunks(): void {
    if (typeof window === 'undefined') return

    const criticalChunks = [
      { name: 'ui-components', import: () => import('@/components/ui/button') }
    ]

    criticalChunks.forEach(({ name, import: importFn }) => {
      this.loadChunk(name, importFn).catch(() => {
        // Silently fail for preloading
      })
    })
  }

  /**
   * Get chunk loading statistics
   */
  static getStats(): {
    cachedChunks: number
    totalSize: number
    hitRate: number
  } {
    return {
      cachedChunks: this.chunkCache.size,
      totalSize: 0, // Would need to track actual sizes
      hitRate: 0 // Would need to track cache hits
    }
  }
}

// =============================================
// ASSET OPTIMIZATION
// =============================================

export class AssetOptimizer {
  /**
   * Optimize image loading
   */
  static optimizeImages(): void {
    if (typeof window === 'undefined') return

    // Add loading="lazy" to images that don't have it
    const images = document.querySelectorAll('img:not([loading])')
    images.forEach(img => {
      (img as HTMLImageElement).loading = 'lazy'
    })

    // Add decoding="async" for better performance
    const allImages = document.querySelectorAll('img')
    allImages.forEach(img => {
      (img as HTMLImageElement).decoding = 'async'
    })
  }

  /**
   * Preload critical CSS
   */
  static preloadCriticalCSS(): void {
    if (typeof window === 'undefined') return

    const criticalCSS = [
      '/_next/static/css/app.css'
    ]

    criticalCSS.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = href
      document.head.appendChild(link)
    })
  }

  /**
   * Optimize font loading
   */
  static optimizeFonts(): void {
    if (typeof window === 'undefined') return

    // Add font-display: swap to improve loading performance
    const style = document.createElement('style')
    style.textContent = `
      @font-face {
        font-family: 'Inter';
        font-display: swap;
      }
    `
    document.head.appendChild(style)
  }
}

// =============================================
// INITIALIZATION
// =============================================

export function initializeBundleOptimization(options: {
  userRole?: 'buyer' | 'seller' | 'partner' | 'admin'
  enablePreloading?: boolean
  enableMonitoring?: boolean
} = {}): void {
  if (typeof window === 'undefined') return

  const {
    userRole,
    enablePreloading = true,
    enableMonitoring = true
  } = options

  // Initialize lazy loading
  LazyLoader.init()

  // Setup resource hints
  ResourceHints.addDNSPrefetch()
  ResourceHints.addPreloadHints()
  
  if (userRole) {
    ResourceHints.addPrefetchHints(userRole)
  }

  // Setup preloading
  if (enablePreloading) {
    BundleOptimizer.setupInteractionPreloading()
    BundleOptimizer.setupViewportPreloading()
    PerformanceMonitor.optimizeForConnection()
    
    if (userRole) {
      BundleOptimizer.preloadByRole(userRole)
    }
  }

  // Setup monitoring
  if (enableMonitoring) {
    PerformanceMonitor.monitorBundlePerformance()
  }

  // Optimize assets
  AssetOptimizer.optimizeImages()
  AssetOptimizer.preloadCriticalCSS()
  AssetOptimizer.optimizeFonts()

  // Preload critical chunks
  ChunkLoader.preloadCriticalChunks()

  console.log('🚀 Bundle optimization initialized')
}

// Cleanup function
export function cleanupBundleOptimization(): void {
  LazyLoader.destroy()
}

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  // Initialize with basic optimizations
  document.addEventListener('DOMContentLoaded', () => {
    initializeBundleOptimization({
      enablePreloading: true,
      enableMonitoring: process.env.NODE_ENV === 'development'
    })
  })

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanupBundleOptimization)
}

const BundleOptimizationUtils = {
  BundleOptimizer,
  ResourceHints,
  LazyLoader,
  ChunkLoader,
  AssetOptimizer,
  PerformanceMonitor,
  initializeBundleOptimization,
  cleanupBundleOptimization
};

export default BundleOptimizationUtils;
