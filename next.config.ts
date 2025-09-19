import type { NextConfig } from 'next';

// Bundle analyzer configuration
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? process.env.ALLOWED_ORIGINS || 'https://yourdomain.com'
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-API-Key, X-Requested-With',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours
          },
        ],
      },
      // Static assets caching headers
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=604800, immutable'
              : 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=2592000', // 30 days
          },
        ],
      },
      {
        source: '/videos/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=604800'
              : 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=2592000', // 30 days
          },
        ],
      },
      {
        source: '/documents/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
              : 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
          },
          {
            key: 'Content-Disposition',
            value: 'inline',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400', // 24 hours
          },
        ],
      },
    ];
  },

  // Webpack configuration for bundle optimization
  webpack: async (config, { isServer, dev }) => {
    // Security improvements
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      dns: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      util: false,
    };

    // Bundle optimization
    if (!dev) {
      // Optimize chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // Vendor chunk for stable third-party libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
              chunks: 'all',
            },
            // React chunk
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              reuseExistingChunk: true,
              chunks: 'all',
            },
            // UI libraries chunk
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|@headlessui|framer-motion|lucide-react)[\\/]/,
              name: 'ui-libs',
              priority: 15,
              reuseExistingChunk: true,
              chunks: 'all',
            },
            // Analytics and monitoring
            analytics: {
              test: /[\\/]node_modules[\\/](@tanstack|react-query|analytics)[\\/]/,
              name: 'analytics',
              priority: 12,
              reuseExistingChunk: true,
              chunks: 'all',
            },
            // Payment libraries
            payments: {
              test: /[\\/]node_modules[\\/](@stripe|stripe)[\\/]/,
              name: 'payments',
              priority: 12,
              reuseExistingChunk: true,
              chunks: 'all',
            },
            // Common utilities
            utils: {
              test: /[\\/]node_modules[\\/](date-fns|lodash|nanoid|clsx|class-variance-authority)[\\/]/,
              name: 'utils',
              priority: 8,
              reuseExistingChunk: true,
              chunks: 'all',
            },
            // Default chunk for remaining modules
            default: {
              minChunks: 2,
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
        // Minimize bundle size
        minimize: true,
        // Enable module concatenation
        concatenateModules: true,
        // Remove unused exports
        usedExports: true,
        // Enable side effects optimization
        sideEffects: false,
      };

      // Tree shaking optimization
      config.optimization.providedExports = true;
      config.optimization.innerGraph = true;
      
      // Remove moment.js locales to reduce bundle size
      const webpack = await import('webpack');
      config.plugins.push(
        new webpack.default.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /moment$/,
        })
      );
    }

    // Exclude server-side modules from client bundle
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        pg: 'commonjs pg',
        winston: 'commonjs winston',
        'pg-connection-string': 'commonjs pg-connection-string',
        pgpass: 'commonjs pgpass',
        ioredis: 'commonjs ioredis',
        bullmq: 'commonjs bullmq',
      });
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      // Replace heavy libraries with lighter alternatives
      'moment': 'date-fns',
      'lodash': 'lodash-es',
    };

    return config;
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Image optimization and CDN configuration
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
        port: '',
        pathname: '/**',
      },
    ],
    // CDN optimization settings
    minimumCacheTTL: process.env.NODE_ENV === 'production' ? 31536000 : 60, // 1 year in prod, 1 minute in dev
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // Custom loader for CDN
    loader: process.env.NODE_ENV === 'production' ? 'custom' : 'default',
    loaderFile: process.env.NODE_ENV === 'production' ? './src/lib/cdn-config.ts' : undefined,
    
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Image optimization quality
  },

  // Experimental features for security
  experimental: {
  },

  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      'pg': '/dev/null',
      'winston': '/dev/null', 
      'pg-connection-string': '/dev/null',
      'pgpass': '/dev/null',
    },
  },

  // Redirects for security
  async redirects() {
    return [
      {
        source: '/.env',
        destination: '/404',
        permanent: true,
      },
      {
        source: '/.env.local',
        destination: '/404',
        permanent: true,
      },
      {
        source: '/config',
        destination: '/404',
        permanent: true,
      },
    ];
  },

  // Disable X-Powered-By header
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Strict mode for better security
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
};

// Export with bundle analyzer
export default withBundleAnalyzer(nextConfig);
