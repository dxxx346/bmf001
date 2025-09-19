/**
 * Tree Shaking Utilities
 * Helps optimize imports and remove unused code
 */

// =============================================
// OPTIMIZED LIBRARY IMPORTS
// =============================================

// Lodash tree-shakeable imports
export const pick = (obj: any, keys: string[]) => {
  const result: any = {}
  keys.forEach(key => {
    if (key in obj) result[key] = obj[key]
  })
  return result
}

export const omit = (obj: any, keys: string[]) => {
  const result = { ...obj }
  keys.forEach(key => delete result[key])
  return result
}

export const debounce = (func: (...args: any[]) => any, wait: number) => {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const throttle = (func: (...args: any[]) => any, limit: number) => {
  let inThrottle: boolean
  return function executedFunction(...args: any[]) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// =============================================
// ICON OPTIMIZATION
// =============================================

// Tree-shakeable icon imports
export const iconImports = {
  // Only import specific icons instead of entire icon libraries
  ChevronDown: () => import('lucide-react/dist/esm/icons/chevron-down').then(mod => mod.ChevronDown),
  ChevronUp: () => import('lucide-react/dist/esm/icons/chevron-up').then(mod => mod.ChevronUp),
  Search: () => import('lucide-react/dist/esm/icons/search').then(mod => mod.Search),
  User: () => import('lucide-react/dist/esm/icons/user').then(mod => mod.User),
  ShoppingCart: () => import('lucide-react/dist/esm/icons/shopping-cart').then(mod => mod.ShoppingCart),
  Heart: () => import('lucide-react/dist/esm/icons/heart').then(mod => mod.Heart),
  Star: () => import('lucide-react/dist/esm/icons/star').then(mod => mod.Star),
  Download: () => import('lucide-react/dist/esm/icons/download').then(mod => mod.Download),
  Upload: () => import('lucide-react/dist/esm/icons/upload').then(mod => mod.Upload),
  Settings: () => import('lucide-react/dist/esm/icons/settings').then(mod => mod.Settings),
  Menu: () => import('lucide-react/dist/esm/icons/menu').then(mod => mod.Menu),
  X: () => import('lucide-react/dist/esm/icons/x').then(mod => mod.X),
  Plus: () => import('lucide-react/dist/esm/icons/plus').then(mod => mod.Plus),
  Minus: () => import('lucide-react/dist/esm/icons/minus').then(mod => mod.Minus),
  Edit: () => import('lucide-react/dist/esm/icons/edit').then(mod => mod.Edit),
  Trash: () => import('lucide-react/dist/esm/icons/trash').then(mod => mod.Trash),
  Eye: () => import('lucide-react/dist/esm/icons/eye').then(mod => mod.Eye),
  EyeOff: () => import('lucide-react/dist/esm/icons/eye-off').then(mod => mod.EyeOff)
}

// =============================================
// DEPENDENCY ANALYSIS
// =============================================

export class DependencyAnalyzer {
  /**
   * Analyze import usage and suggest optimizations
   */
  static analyzeImports(): {
    heavyLibraries: string[]
    optimizationSuggestions: string[]
    treeshakingOpportunities: string[]
  } {
    return {
      heavyLibraries: [
        'framer-motion', // 100KB+ - Use selective imports
        '@radix-ui/react-*', // 50KB+ per component - Use selective imports
        'react-query', // 40KB+ - Use specific imports
        'date-fns', // 30KB+ - Use specific functions only
        'lucide-react' // 25KB+ - Use individual icon imports
      ],
      optimizationSuggestions: [
        'Replace full library imports with selective imports',
        'Use dynamic imports for heavy components',
        'Implement code splitting for different user roles',
        'Remove unused CSS classes with Tailwind purging',
        'Use lighter alternatives for heavy libraries'
      ],
      treeshakingOpportunities: [
        'Import specific functions from date-fns instead of entire library',
        'Import specific icons from lucide-react instead of entire icon set',
        'Use selective imports for Radix UI components',
        'Import specific utilities from lodash-es instead of full library',
        'Use tree-shakeable imports for React Query'
      ]
    }
  }

  /**
   * Get optimized import suggestions
   */
  static getOptimizedImports(): Record<string, string> {
    return {
      // Instead of: import * as Icons from 'lucide-react'
      'lucide-react': 'import { SpecificIcon } from "lucide-react"',
      
      // Instead of: import _ from 'lodash'
      'lodash': 'import { debounce, throttle } from "lodash-es"',
      
      // Instead of: import * as dateFns from 'date-fns'
      'date-fns': 'import { format, parseISO } from "date-fns"',
      
      // Instead of: import { QueryClient } from '@tanstack/react-query'
      '@tanstack/react-query': 'import { useQuery } from "@tanstack/react-query"',
      
      // Instead of: import * as RadixUI from '@radix-ui/react-*'
      '@radix-ui': 'import { Dialog } from "@radix-ui/react-dialog"'
    }
  }
}

// =============================================
// BUNDLE SIZE TRACKING
// =============================================

export class BundleSizeTracker {
  private static readonly TARGET_SIZES = {
    initial: 350 * 1024, // 350KB
    route: 100 * 1024,   // 100KB per route
    component: 50 * 1024, // 50KB per component
    vendor: 200 * 1024   // 200KB for vendors
  }

  /**
   * Check if component should be dynamically imported
   */
  static shouldBeDynamic(componentSize: number, usage: 'critical' | 'above-fold' | 'below-fold'): boolean {
    switch (usage) {
      case 'critical':
        return false // Always load critical components
      case 'above-fold':
        return componentSize > this.TARGET_SIZES.component
      case 'below-fold':
        return componentSize > 10 * 1024 // 10KB threshold for below-fold
    }
  }

  /**
   * Get size recommendations
   */
  static getSizeRecommendations(currentSize: number): {
    status: 'good' | 'warning' | 'critical'
    message: string
    suggestions: string[]
  } {
    const targetSize = this.TARGET_SIZES.initial
    const percentage = (currentSize / targetSize) * 100

    if (percentage <= 100) {
      return {
        status: 'good',
        message: `Bundle size is optimal (${(currentSize / 1024).toFixed(1)}KB / ${targetSize / 1024}KB)`,
        suggestions: [
          'Consider implementing preloading for better user experience',
          'Monitor bundle size with each deployment'
        ]
      }
    } else if (percentage <= 130) {
      return {
        status: 'warning',
        message: `Bundle size is above target (${(currentSize / 1024).toFixed(1)}KB / ${targetSize / 1024}KB)`,
        suggestions: [
          'Implement dynamic imports for heavy components',
          'Enable tree shaking for unused code',
          'Consider code splitting for different routes'
        ]
      }
    } else {
      return {
        status: 'critical',
        message: `Bundle size significantly exceeds target (${(currentSize / 1024).toFixed(1)}KB / ${targetSize / 1024}KB)`,
        suggestions: [
          'Immediately implement dynamic imports',
          'Remove unused dependencies',
          'Split vendor chunks',
          'Enable aggressive tree shaking',
          'Consider removing heavy libraries'
        ]
      }
    }
  }
}

// =============================================
// OPTIMIZATION HELPERS
// =============================================

export const optimizationHelpers = {
  /**
   * Create optimized import statement
   */
  createOptimizedImport: (library: string, imports: string[]): string => {
    return `import { ${imports.join(', ')} } from "${library}"`
  },

  /**
   * Generate dynamic import with proper loading
   */
  createDynamicImport: (path: string, options: {
    ssr?: boolean
    loading?: string
    loadingType?: 'skeleton' | 'spinner' | 'custom'
  } = {}) => {
    const { ssr = false, loading = 'Loading...', loadingType = 'spinner' } = options
    
    return `dynamic(() => import('${path}'), {
  loading: () => <${loadingType === 'skeleton' ? 'ComponentSkeleton' : 'DynamicLoading'} text="${loading}" />,
  ssr: ${ssr}
})`
  },

  /**
   * Get tree shaking configuration
   */
  getTreeShakingConfig: () => ({
    sideEffects: false,
    usedExports: true,
    providedExports: true,
    innerGraph: true,
    concatenateModules: true
  }),

  /**
   * Get chunk optimization configuration
   */
  getChunkConfig: () => ({
    chunks: 'all',
    minSize: 20000,
    maxSize: 244000,
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10,
        reuseExistingChunk: true
      },
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
        name: 'react',
        priority: 20,
        reuseExistingChunk: true
      },
      common: {
        minChunks: 2,
        priority: -10,
        reuseExistingChunk: true
      }
    }
  })
}

export default {
  pick,
  omit,
  debounce,
  throttle,
  iconImports,
  DependencyAnalyzer,
  BundleSizeTracker,
  optimizationHelpers
}
