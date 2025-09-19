/**
 * Duplicate Dependency Detector
 * Identifies and helps resolve duplicate dependencies in the bundle
 */

// =============================================
// KNOWN DUPLICATES AND SOLUTIONS
// =============================================

export const duplicateAnalysis = {
  // Common duplicate dependencies
  knownDuplicates: [
    {
      name: 'react',
      reason: 'Multiple versions from different packages',
      solution: 'Use resolutions in package.json to force single version',
      impact: '~45KB per duplicate'
    },
    {
      name: 'react-dom',
      reason: 'Multiple versions from different packages',
      solution: 'Use resolutions in package.json to force single version',
      impact: '~130KB per duplicate'
    },
    {
      name: 'lodash',
      reason: 'Both lodash and lodash-es imported',
      solution: 'Use only lodash-es for better tree shaking',
      impact: '~70KB savings'
    },
    {
      name: 'date-fns',
      reason: 'Full library imported instead of specific functions',
      solution: 'Import only needed functions',
      impact: '~60KB savings'
    },
    {
      name: '@radix-ui',
      reason: 'Multiple Radix UI packages with overlapping dependencies',
      solution: 'Optimize imports and use selective loading',
      impact: '~30KB per component'
    },
    {
      name: 'framer-motion',
      reason: 'Heavy animation library',
      solution: 'Use dynamic imports or lighter alternatives',
      impact: '~100KB'
    }
  ],

  // Package.json resolutions to fix duplicates
  recommendedResolutions: {
    'react': '^19.1.0',
    'react-dom': '^19.1.0',
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
    'lodash': '4.17.21',
    'date-fns': '^3.0.0'
  },

  // Webpack aliases to prevent duplicates
  webpackAliases: {
    'react': 'react',
    'react-dom': 'react-dom',
    'lodash': 'lodash-es',
    'moment': 'date-fns'
  }
}

// =============================================
// DEPENDENCY OPTIMIZATION
// =============================================

export class DependencyOptimizer {
  /**
   * Analyze package.json for optimization opportunities
   */
  static analyzePackageJson(packageJson: any): {
    duplicates: string[]
    heavyDependencies: string[]
    optimizationOpportunities: Array<{
      package: string
      currentSize: string
      alternative: string
      savings: string
    }>
  } {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    const heavyDependencies = [
      'framer-motion',
      'moment',
      'lodash',
      '@radix-ui/react-dialog',
      '@tanstack/react-query',
      'react-query',
      'chart.js',
      'recharts'
    ].filter(dep => dependencies[dep])

    const optimizationOpportunities = [
      {
        package: 'moment',
        currentSize: '~300KB',
        alternative: 'date-fns',
        savings: '~200KB'
      },
      {
        package: 'lodash',
        currentSize: '~530KB',
        alternative: 'lodash-es + tree shaking',
        savings: '~400KB'
      },
      {
        package: 'framer-motion',
        currentSize: '~100KB',
        alternative: 'CSS animations + selective imports',
        savings: '~70KB'
      }
    ].filter(opt => dependencies[opt.package])

    return {
      duplicates: this.findPotentialDuplicates(dependencies),
      heavyDependencies,
      optimizationOpportunities
    }
  }

  private static findPotentialDuplicates(dependencies: Record<string, string>): string[] {
    const duplicates: string[] = []
    
    // Check for both lodash and lodash-es
    if (dependencies['lodash'] && dependencies['lodash-es']) {
      duplicates.push('lodash/lodash-es')
    }
    
    // Check for moment and date-fns
    if (dependencies['moment'] && dependencies['date-fns']) {
      duplicates.push('moment/date-fns')
    }
    
    // Check for multiple React Query versions
    if (dependencies['react-query'] && dependencies['@tanstack/react-query']) {
      duplicates.push('react-query/@tanstack/react-query')
    }

    return duplicates
  }

  /**
   * Generate package.json optimizations
   */
  static generatePackageOptimizations(): {
    resolutions: Record<string, string>
    scriptsToAdd: Record<string, string>
    dependenciesToRemove: string[]
    dependenciesToAdd: Record<string, string>
  } {
    return {
      resolutions: duplicateAnalysis.recommendedResolutions,
      scriptsToAdd: {
        'bundle:analyze': 'ANALYZE=true npm run build',
        'bundle:size': 'npm run build && bundlesize',
        'deps:check': 'npm ls --depth=0',
        'deps:audit': 'npm audit --audit-level moderate'
      },
      dependenciesToRemove: [
        'moment', // Replace with date-fns
        'lodash', // Replace with lodash-es
      ],
      dependenciesToAdd: {
        'date-fns': '^3.0.0',
        'lodash-es': '^4.17.21',
        '@next/bundle-analyzer': '^14.0.0',
        'bundlesize': '^0.18.0'
      }
    }
  }
}

// =============================================
// TREE SHAKING OPTIMIZER
// =============================================

export class TreeShakingOptimizer {
  /**
   * Get optimized import statements
   */
  static getOptimizedImports(): Record<string, {
    original: string
    optimized: string
    savings: string
  }> {
    return {
      'date-fns': {
        original: "import * as dateFns from 'date-fns'",
        optimized: "import { format, parseISO, formatDistanceToNow } from 'date-fns'",
        savings: '~200KB'
      },
      'lodash': {
        original: "import _ from 'lodash'",
        optimized: "import { debounce, throttle, pick } from 'lodash-es'",
        savings: '~400KB'
      },
      'lucide-react': {
        original: "import * as Icons from 'lucide-react'",
        optimized: "import { Search, User, Settings } from 'lucide-react'",
        savings: '~150KB'
      },
      'framer-motion': {
        original: "import { motion, AnimatePresence } from 'framer-motion'",
        optimized: "import { motion } from 'framer-motion/dist/framer-motion'",
        savings: '~50KB'
      },
      '@radix-ui': {
        original: "import * from '@radix-ui/react-dialog'",
        optimized: "import { Dialog, DialogContent } from '@radix-ui/react-dialog'",
        savings: '~20KB per component'
      }
    }
  }

  /**
   * Generate webpack configuration for tree shaking
   */
  static getWebpackTreeShakingConfig(): any {
    return {
      optimization: {
        usedExports: true,
        providedExports: true,
        sideEffects: false,
        innerGraph: true,
        concatenateModules: true,
        minimize: true
      },
      resolve: {
        alias: {
          'lodash': 'lodash-es',
          'moment': 'date-fns'
        }
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            include: /node_modules/,
            sideEffects: false
          }
        ]
      }
    }
  }

  /**
   * Get Tailwind CSS purge configuration
   */
  static getTailwindPurgeConfig(): any {
    return {
      enabled: process.env.NODE_ENV === 'production',
      content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './public/**/*.html'
      ],
      options: {
        safelist: [
          // Dynamic classes that might be generated
          /^bg-(red|green|blue|yellow|purple|pink|indigo)-(50|100|500|600|700)$/,
          /^text-(red|green|blue|yellow|purple|pink|indigo)-(600|700|800)$/,
          /^border-(red|green|blue|yellow|purple|pink|indigo)-(200|300|500)$/,
          // Animation classes
          /^animate-/,
          // Responsive classes
          /^(sm|md|lg|xl|2xl):/
        ],
        blocklist: [
          // Remove unused utility classes
          /^debug-/,
          /^test-/
        ]
      }
    }
  }
}

export default {
  duplicateAnalysis,
  DependencyOptimizer,
  TreeShakingOptimizer
}
