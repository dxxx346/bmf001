/**
 * Versioned API Client
 * Provides version-aware HTTP client for BMF001 marketplace API
 */

import { ApiVersionConfig, SUPPORTED_VERSIONS, DEFAULT_API_VERSION } from '@/middleware/api-version.middleware';

export type ApiVersion = 'v1' | 'v2';

export interface ApiClientConfig {
  baseUrl?: string;
  version?: ApiVersion;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  apiKey?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  version: string;
  deprecated?: boolean;
  migrationGuide?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
  version?: string;
}

export class ApiClient {
  private baseUrl: string;
  private version: ApiVersion;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    this.version = config.version || DEFAULT_API_VERSION as ApiVersion;
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': `application/vnd.bmf001.${this.version}+json`,
      'API-Version': this.version,
      ...config.headers,
    };

    if (config.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${config.apiKey}`;
    }
  }

  /**
   * Set API version
   */
  setVersion(version: ApiVersion): void {
    if (!SUPPORTED_VERSIONS.includes(version)) {
      throw new Error(`Unsupported API version: ${version}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`);
    }
    
    this.version = version;
    this.defaultHeaders['Accept'] = `application/vnd.bmf001.${version}+json`;
    this.defaultHeaders['API-Version'] = version;
  }

  /**
   * Get current API version
   */
  getVersion(): ApiVersion {
    return this.version;
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${apiKey}`;
  }

  /**
   * Remove API key
   */
  removeApiKey(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Build URL with version
   */
  private buildUrl(endpoint: string): string {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    // If endpoint already includes version, use as-is
    if (cleanEndpoint.startsWith('v1/') || cleanEndpoint.startsWith('v2/')) {
      return `${this.baseUrl}/api/${cleanEndpoint}`;
    }
    
    // Add version prefix
    return `${this.baseUrl}/api/${this.version}/${cleanEndpoint}`;
  }

  /**
   * Parse response and extract version info
   */
  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const version = response.headers.get('API-Version') || this.version;
    const deprecated = response.headers.get('Deprecation') === 'true';
    const migrationGuide = response.headers.get('Link')?.match(/<([^>]+)>;\s*rel="migration-guide"/)?.[1];

    let data: T;
    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as unknown as T;
    }

    if (!response.ok) {
      const error: ApiError = {
        message: typeof data === 'object' && data && 'message' in data 
          ? (data as any).message 
          : `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        code: typeof data === 'object' && data && 'code' in data ? (data as any).code : undefined,
        details: data,
        version,
      };
      throw error;
    }

    return {
      data,
      status: response.status,
      headers: response.headers,
      version,
      deprecated,
      migrationGuide,
    };
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const headers = { ...this.defaultHeaders, ...options.headers };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers,
          signal: controller.signal,
          ...options,
        });

        clearTimeout(timeoutId);
        return await this.parseResponse<T>(response);
        
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx) except for rate limiting (429)
        if (error instanceof Error && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500 && status !== 429) {
            throw error;
          }
        }

        // Don't retry on the last attempt
        if (attempt === this.retryAttempts) {
          break;
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    return this.makeRequest<T>('GET', url);
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', endpoint, {
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', endpoint, {
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PATCH', endpoint, {
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', endpoint);
  }

  /**
   * Upload file
   */
  async upload<T = any>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type']; // Let browser set multipart boundary

    return this.makeRequest<T>('POST', endpoint, {
      body: formData,
      headers,
    });
  }

  /**
   * Download file
   */
  async download(endpoint: string): Promise<Blob> {
    const response = await this.makeRequest<Blob>('GET', endpoint);
    return response.data;
  }

  /**
   * Check API health and version compatibility
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    supportedVersions: string[];
    deprecated?: boolean;
    migrationGuide?: string;
  }> {
    try {
      const response = await this.makeRequest<any>('GET', '/health');
      
      return {
        status: 'healthy',
        version: response.version,
        supportedVersions: SUPPORTED_VERSIONS,
        deprecated: response.deprecated,
        migrationGuide: response.migrationGuide,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        version: this.version,
        supportedVersions: SUPPORTED_VERSIONS,
      };
    }
  }

  /**
   * Get version info
   */
  async getVersionInfo(): Promise<{
    current: string;
    supported: string[];
    latest: string;
    deprecated: boolean;
    migrationGuide?: string;
    sunsetDate?: string;
  }> {
    const response = await this.makeRequest<any>('GET', '/version');
    return response.data;
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

/**
 * Create versioned API client
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

/**
 * Version-specific client factories
 */
export const v1Client = new ApiClient({ version: 'v1' });
export const v2Client = new ApiClient({ version: 'v2' });

/**
 * Utility functions for version management
 */
export const apiVersionUtils = {
  /**
   * Check if version is supported
   */
  isVersionSupported(version: string): boolean {
    return SUPPORTED_VERSIONS.includes(version);
  },

  /**
   * Get latest version
   */
  getLatestVersion(): string {
    return SUPPORTED_VERSIONS.filter(v => v !== 'v1').sort().pop() || 'v2';
  },

  /**
   * Compare versions
   */
  compareVersions(a: string, b: string): number {
    const aNum = parseInt(a.replace('v', ''));
    const bNum = parseInt(b.replace('v', ''));
    return aNum - bNum;
  },

  /**
   * Migrate client to newer version
   */
  migrateClient(client: ApiClient, targetVersion: ApiVersion): void {
    if (!this.isVersionSupported(targetVersion)) {
      throw new Error(`Cannot migrate to unsupported version: ${targetVersion}`);
    }
    
    const currentVersion = client.getVersion();
    if (this.compareVersions(targetVersion, currentVersion) <= 0) {
      throw new Error(`Cannot migrate to older or same version: ${targetVersion}`);
    }
    
    client.setVersion(targetVersion);
  },
};

/**
 * Hook for React components
 */
export function useApiClient(version?: ApiVersion): ApiClient {
  if (typeof window === 'undefined') {
    // Server-side: return default client
    return version ? new ApiClient({ version }) : apiClient;
  }

  // Client-side: return configured client
  // Note: For React hooks, import React in the component that uses this
  return version ? new ApiClient({ version }) : apiClient;
}

// Type-safe API endpoints
export interface ApiEndpoints {
  // Auth endpoints
  auth: {
    login: (credentials: { email: string; password: string }) => Promise<ApiResponse<{ token: string; user: any }>>;
    register: (userData: any) => Promise<ApiResponse<{ token: string; user: any }>>;
    logout: () => Promise<ApiResponse<{ success: boolean }>>;
    refresh: () => Promise<ApiResponse<{ token: string }>>;
  };
  
  // Products endpoints
  products: {
    list: (params?: any) => Promise<ApiResponse<{ products: any[]; total: number }>>;
    get: (id: string) => Promise<ApiResponse<any>>;
    create: (product: any) => Promise<ApiResponse<any>>;
    update: (id: string, product: any) => Promise<ApiResponse<any>>;
    delete: (id: string) => Promise<ApiResponse<{ success: boolean }>>;
    search: (query: string, filters?: any) => Promise<ApiResponse<{ products: any[]; total: number }>>;
  };
  
  // Orders endpoints
  orders: {
    list: (params?: any) => Promise<ApiResponse<{ orders: any[]; total: number }>>;
    get: (id: string) => Promise<ApiResponse<any>>;
    create: (order: any) => Promise<ApiResponse<any>>;
    update: (id: string, order: any) => Promise<ApiResponse<any>>;
  };
}

/**
 * Create type-safe API client
 */
export function createTypedApiClient(client: ApiClient): ApiEndpoints {
  return {
    auth: {
      login: (credentials) => client.post('/auth/login', credentials),
      register: (userData) => client.post('/auth/register', userData),
      logout: () => client.post('/auth/logout'),
      refresh: () => client.post('/auth/refresh'),
    },
    
    products: {
      list: (params) => client.get('/products', params),
      get: (id) => client.get(`/products/${id}`),
      create: (product) => client.post('/products', product),
      update: (id, product) => client.put(`/products/${id}`, product),
      delete: (id) => client.delete(`/products/${id}`),
      search: (query, filters) => client.get('/products/search', { query, ...filters }),
    },
    
    orders: {
      list: (params) => client.get('/orders', params),
      get: (id) => client.get(`/orders/${id}`),
      create: (order) => client.post('/orders', order),
      update: (id, order) => client.put(`/orders/${id}`, order),
    },
  };
}

export default ApiClient;
