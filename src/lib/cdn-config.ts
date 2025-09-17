// CDN Configuration for Static Assets
// Supports Cloudflare, AWS CloudFront, and Vercel Edge Network

interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'vercel';
  baseUrl: string;
  zones: {
    images: string;
    videos: string;
    documents: string;
    assets: string;
  };
  caching: {
    browserTTL: number;
    edgeTTL: number;
    staleWhileRevalidate: number;
  };
  optimization: {
    imageFormats: string[];
    videoFormats: string[];
    compression: boolean;
    minification: boolean;
  };
}

// Environment-specific CDN configurations
export const cdnConfigs: Record<string, CDNConfig> = {
  development: {
    provider: 'vercel',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    zones: {
      images: '/images',
      videos: '/videos',
      documents: '/documents',
      assets: '/assets',
    },
    caching: {
      browserTTL: 300, // 5 minutes
      edgeTTL: 3600, // 1 hour
      staleWhileRevalidate: 86400, // 24 hours
    },
    optimization: {
      imageFormats: ['webp', 'avif', 'jpeg', 'png'],
      videoFormats: ['mp4', 'webm'],
      compression: true,
      minification: true,
    },
  },

  production: {
    provider: 'cloudflare',
    baseUrl: process.env.CLOUDFLARE_CDN_URL || process.env.NEXT_PUBLIC_APP_URL || '',
    zones: {
      images: '/cdn/images',
      videos: '/cdn/videos',
      documents: '/cdn/documents',
      assets: '/cdn/assets',
    },
    caching: {
      browserTTL: 31536000, // 1 year
      edgeTTL: 2592000, // 30 days
      staleWhileRevalidate: 604800, // 7 days
    },
    optimization: {
      imageFormats: ['avif', 'webp', 'jpeg', 'png'],
      videoFormats: ['mp4', 'webm', 'av1'],
      compression: true,
      minification: true,
    },
  },
};

// Get current CDN configuration
export function getCDNConfig(): CDNConfig {
  const env = process.env.NODE_ENV || 'development';
  return cdnConfigs[env] || cdnConfigs.development;
}

// CDN URL builder
export class CDNUrlBuilder {
  private config: CDNConfig;
  
  constructor() {
    this.config = getCDNConfig();
  }
  
  // Build optimized image URL
  buildImageUrl(
    path: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      blur?: number;
      sharpen?: boolean;
    }
  ): string {
    const baseUrl = `${this.config.baseUrl}${this.config.zones.images}`;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    if (!options || this.config.provider === 'vercel') {
      return `${baseUrl}/${cleanPath}`;
    }
    
    // Cloudflare Image Resizing
    if (this.config.provider === 'cloudflare') {
      const params = new URLSearchParams();
      
      if (options.width) params.set('width', options.width.toString());
      if (options.height) params.set('height', options.height.toString());
      if (options.quality) params.set('quality', Math.min(options.quality, 100).toString());
      if (options.format && options.format !== 'auto') params.set('format', options.format);
      if (options.fit) params.set('fit', options.fit);
      if (options.blur) params.set('blur', Math.min(options.blur, 250).toString());
      if (options.sharpen) params.set('sharpen', '1');
      
      const queryString = params.toString();
      return `${baseUrl}/${cleanPath}${queryString ? `?${queryString}` : ''}`;
    }
    
    return `${baseUrl}/${cleanPath}`;
  }
  
  // Build video URL
  buildVideoUrl(path: string, options?: {
    quality?: 'auto' | 'hd' | 'sd' | 'low';
    format?: 'auto' | 'mp4' | 'webm' | 'av1';
  }): string {
    const baseUrl = `${this.config.baseUrl}${this.config.zones.videos}`;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    if (!options || this.config.provider === 'vercel') {
      return `${baseUrl}/${cleanPath}`;
    }
    
    // Add video optimization parameters for supported providers
    const params = new URLSearchParams();
    
    if (options.quality && options.quality !== 'auto') {
      params.set('quality', options.quality);
    }
    
    if (options.format && options.format !== 'auto') {
      params.set('format', options.format);
    }
    
    const queryString = params.toString();
    return `${baseUrl}/${cleanPath}${queryString ? `?${queryString}` : ''}`;
  }
  
  // Build document URL
  buildDocumentUrl(path: string): string {
    const baseUrl = `${this.config.baseUrl}${this.config.zones.documents}`;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/${cleanPath}`;
  }
  
  // Build static asset URL
  buildAssetUrl(path: string): string {
    const baseUrl = `${this.config.baseUrl}${this.config.zones.assets}`;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/${cleanPath}`;
  }
  
  // Build URL with cache busting
  buildCacheBustedUrl(path: string, version?: string): string {
    const url = this.buildAssetUrl(path);
    const cacheBuster = version || process.env.NEXT_PUBLIC_APP_VERSION || Date.now().toString();
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${cacheBuster}`;
  }
}

// Cloudflare-specific configurations
export class CloudflareManager {
  private apiToken: string;
  private zoneId: string;
  private accountId: string;
  
  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID || '';
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  }
  
  // Purge cache for specific URLs
  async purgeCache(urls: string[]): Promise<{ success: boolean; errors?: string[] }> {
    if (!this.apiToken || !this.zoneId) {
      return { success: false, errors: ['Missing Cloudflare configuration'] };
    }
    
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: urls,
          }),
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          errors: result.errors?.map((e: any) => e.message) || ['Unknown error'],
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Network error'],
      };
    }
  }
  
  // Purge entire cache
  async purgeAllCache(): Promise<{ success: boolean; errors?: string[] }> {
    if (!this.apiToken || !this.zoneId) {
      return { success: false, errors: ['Missing Cloudflare configuration'] };
    }
    
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            purge_everything: true,
          }),
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          errors: result.errors?.map((e: any) => e.message) || ['Unknown error'],
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Network error'],
      };
    }
  }
  
  // Get analytics data
  async getAnalytics(
    startDate: string,
    endDate: string
  ): Promise<{
    success: boolean;
    data?: any;
    errors?: string[];
  }> {
    if (!this.apiToken || !this.zoneId) {
      return { success: false, errors: ['Missing Cloudflare configuration'] };
    }
    
    try {
      const params = new URLSearchParams({
        since: startDate,
        until: endDate,
      });
      
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/analytics/dashboard?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          errors: result.errors?.map((e: any) => e.message) || ['Unknown error'],
        };
      }
      
      return { success: true, data: result.result };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Network error'],
      };
    }
  }
}

// CDN performance monitoring
export class CDNMonitor {
  private config: CDNConfig;
  
  constructor() {
    this.config = getCDNConfig();
  }
  
  // Test CDN performance
  async testPerformance(testUrls: string[]): Promise<{
    averageLatency: number;
    results: Array<{
      url: string;
      latency: number;
      status: number;
      success: boolean;
    }>;
  }> {
    const results = await Promise.all(
      testUrls.map(async (url) => {
        const start = Date.now();
        
        try {
          const response = await fetch(url, { method: 'HEAD' });
          const latency = Date.now() - start;
          
          return {
            url,
            latency,
            status: response.status,
            success: response.ok,
          };
        } catch (error) {
          return {
            url,
            latency: Date.now() - start,
            status: 0,
            success: false,
          };
        }
      })
    );
    
    const successfulResults = results.filter(r => r.success);
    const averageLatency = successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length
      : 0;
    
    return {
      averageLatency,
      results,
    };
  }
  
  // Monitor cache hit rates
  async getCacheStats(): Promise<{
    hitRate: number;
    missRate: number;
    totalRequests: number;
  }> {
    // This would typically integrate with your CDN provider's API
    // For now, return mock data
    return {
      hitRate: 0.85, // 85% cache hit rate
      missRate: 0.15, // 15% cache miss rate
      totalRequests: 1000000,
    };
  }
}

// Export utilities
export const cdnUrlBuilder = new CDNUrlBuilder();
export const cloudflareManager = new CloudflareManager();
export const cdnMonitor = new CDNMonitor();

// Next.js integration helpers
export const nextImageLoader = ({ src, width, quality }: {
  src: string;
  width: number;
  quality?: number;
}) => {
  return cdnUrlBuilder.buildImageUrl(src, {
    width,
    quality: quality || 75,
    format: 'auto',
  });
};

// React hook for CDN URLs
export function useCDNUrl() {
  return {
    buildImageUrl: cdnUrlBuilder.buildImageUrl.bind(cdnUrlBuilder),
    buildVideoUrl: cdnUrlBuilder.buildVideoUrl.bind(cdnUrlBuilder),
    buildDocumentUrl: cdnUrlBuilder.buildDocumentUrl.bind(cdnUrlBuilder),
    buildAssetUrl: cdnUrlBuilder.buildAssetUrl.bind(cdnUrlBuilder),
    buildCacheBustedUrl: cdnUrlBuilder.buildCacheBustedUrl.bind(cdnUrlBuilder),
  };
}
