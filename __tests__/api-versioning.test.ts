import { NextRequest, NextResponse } from 'next/server';
import { 
  extractApiVersion, 
  isVersionSupported, 
  getLatestVersion,
  apiVersionMiddleware,
  addVersionHeaders,
  createVersionedErrorResponse,
} from '@/middleware/api-version.middleware';
import { 
  migrateResponseV1ToV2, 
  migrateResponseV2ToV1,
  validateMigration,
  checkMigrationHealth,
} from '@/lib/api-migration-helpers';
import { ApiClient } from '@/lib/api-client';

/**
 * API Versioning Test Suite
 * Comprehensive tests for API versioning functionality
 */

describe('API Versioning', () => {
  describe('Version Extraction', () => {
    it('should extract version from URL path', () => {
      const request = new NextRequest('http://localhost:3000/api/v1/products');
      const version = extractApiVersion(request);
      expect(version).toBe('v1');
    });

    it('should extract version from Accept header', () => {
      const request = new NextRequest('http://localhost:3000/api/products', {
        headers: {
          'Accept': 'application/vnd.bmf001.v2+json',
        },
      });
      const version = extractApiVersion(request);
      expect(version).toBe('v2');
    });

    it('should extract version from API-Version header', () => {
      const request = new NextRequest('http://localhost:3000/api/products', {
        headers: {
          'API-Version': 'v1',
        },
      });
      const version = extractApiVersion(request);
      expect(version).toBe('v1');
    });

    it('should extract version from query parameter', () => {
      const request = new NextRequest('http://localhost:3000/api/products?version=v2');
      const version = extractApiVersion(request);
      expect(version).toBe('v2');
    });

    it('should return default version when no version specified', () => {
      const request = new NextRequest('http://localhost:3000/api/products');
      const version = extractApiVersion(request);
      expect(version).toBe('v2'); // DEFAULT_API_VERSION
    });
  });

  describe('Version Support', () => {
    it('should identify supported versions', () => {
      expect(isVersionSupported('v1')).toBe(true);
      expect(isVersionSupported('v2')).toBe(true);
      expect(isVersionSupported('v3')).toBe(false);
    });

    it('should return latest version', () => {
      const latest = getLatestVersion();
      expect(latest).toBe('v2');
    });
  });

  describe('Version Middleware', () => {
    it('should allow supported versions', () => {
      const request = new NextRequest('http://localhost:3000/api/v2/products');
      const response = apiVersionMiddleware(request);
      expect(response).toBeNull(); // Null means continue processing
    });

    it('should reject unsupported versions', () => {
      const request = new NextRequest('http://localhost:3000/api/v3/products');
      const response = apiVersionMiddleware(request);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(400);
    });

    it('should redirect unversioned requests to versioned paths', () => {
      const request = new NextRequest('http://localhost:3000/api/products');
      const response = apiVersionMiddleware(request);
      expect(response?.status).toBe(307); // Redirect
    });
  });

  describe('Version Headers', () => {
    it('should add version headers to response', () => {
      const nextResponse = NextResponse.json({ data: 'test' });
      const versionedResponse = addVersionHeaders(nextResponse, 'v2');
      
      expect(versionedResponse.headers.get('API-Version')).toBe('v2');
      expect(versionedResponse.headers.get('API-Version-Number')).toBe('2.0.0');
    });

    it('should add deprecation headers for v1', () => {
      const nextResponse = NextResponse.json({ data: 'test' });
      const versionedResponse = addVersionHeaders(nextResponse, 'v1');
      
      expect(versionedResponse.headers.get('Deprecation')).toBe('true');
      expect(versionedResponse.headers.get('Warning')).toContain('deprecated');
    });
  });

  describe('Error Responses', () => {
    it('should create versioned error response', () => {
      const request = new NextRequest('http://localhost:3000/api/v1/products');
      const errorResponse = createVersionedErrorResponse(
        'Test error',
        400,
        'v1'
      );
      
      expect(errorResponse.status).toBe(400);
      expect(errorResponse.headers.get('API-Version')).toBe('v1');
    });
  });
});

describe('Response Migration', () => {
  describe('v1 to v2 Migration', () => {
    it('should migrate product list response', () => {
      const v1Response = {
        products: [{ id: '1', title: 'Test Product' }],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
        filters_applied: { category: 'digital' },
      };

      const v2Response = migrateResponseV1ToV2(v1Response);
      
      expect(v2Response.items).toEqual(v1Response.products);
      expect(v2Response.pagination.total).toBe(v1Response.total);
      expect(v2Response.pagination.hasNext).toBe(false);
      expect(v2Response.metadata.version).toBe('v2');
    });

    it('should migrate single product response', () => {
      const v1Response = {
        product: { id: '1', title: 'Test Product' },
      };

      const v2Response = migrateResponseV1ToV2(v1Response);
      
      expect(v2Response.item).toEqual(v1Response.product);
      expect(v2Response.metadata.version).toBe('v2');
    });

    it('should migrate error response', () => {
      const v1Response = {
        error: 'Validation failed',
      };

      const v2Response = migrateResponseV1ToV2(v1Response);
      
      expect(v2Response.error.message).toBe('Validation failed');
      expect(v2Response.error.code).toBe('LEGACY_ERROR');
    });
  });

  describe('v2 to v1 Migration', () => {
    it('should migrate product list response back to v1', () => {
      const v2Response = {
        items: [{ id: '1', title: 'Test Product' }],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      const v1Response = migrateResponseV2ToV1(v2Response);
      
      expect(v1Response.products).toEqual(v2Response.items);
      expect(v1Response.total).toBe(v2Response.pagination.total);
      expect(v1Response.page).toBe(v2Response.pagination.page);
    });

    it('should migrate single item response back to v1', () => {
      const v2Response = {
        item: { id: '1', title: 'Test Product' },
      };

      const v1Response = migrateResponseV2ToV1(v2Response);
      
      expect(v1Response.product).toEqual(v2Response.item);
    });
  });
});

describe('API Client Versioning', () => {
  let v1Client: ApiClient;
  let v2Client: ApiClient;

  beforeEach(() => {
    v1Client = new ApiClient({ version: 'v1' });
    v2Client = new ApiClient({ version: 'v2' });
    
    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set correct version headers', () => {
    expect(v1Client.getVersion()).toBe('v1');
    expect(v2Client.getVersion()).toBe('v2');
  });

  it('should build correct URLs for different versions', () => {
    const v1Url = (v1Client as any).buildUrl('/products');
    const v2Url = (v2Client as any).buildUrl('/products');
    
    expect(v1Url).toContain('/api/v1/products');
    expect(v2Url).toContain('/api/v2/products');
  });

  it('should handle version migration', () => {
    expect(v1Client.getVersion()).toBe('v1');
    
    v1Client.setVersion('v2');
    expect(v1Client.getVersion()).toBe('v2');
  });

  it('should reject unsupported version migration', () => {
    expect(() => {
      v1Client.setVersion('v3' as any);
    }).toThrow('Unsupported API version');
  });
});

describe('Migration Validation', () => {
  let mockV1Client: any;
  let mockV2Client: any;

  beforeEach(() => {
    mockV1Client = {
      get: jest.fn(),
    };
    
    mockV2Client = {
      get: jest.fn(),
    };
  });

  it('should validate successful migration', async () => {
    // Mock v1 response
    mockV1Client.get.mockResolvedValue({
      data: {
        products: [{ id: '1', title: 'Test' }],
        total: 1,
        page: 1,
        total_pages: 1,
      },
    });

    // Mock v2 response
    mockV2Client.get.mockResolvedValue({
      data: {
        items: [{ id: '1', title: 'Test' }],
        pagination: {
          total: 1,
          page: 1,
          totalPages: 1,
        },
      },
    });

    const result = await validateMigration(
      mockV1Client,
      mockV2Client,
      '/products'
    );

    expect(result.success).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it('should detect migration differences', async () => {
    // Mock v1 response
    mockV1Client.get.mockResolvedValue({
      data: {
        products: [{ id: '1', title: 'Test' }],
        total: 1,
      },
    });

    // Mock v2 response with different data
    mockV2Client.get.mockResolvedValue({
      data: {
        items: [{ id: '1', title: 'Test' }, { id: '2', title: 'Test 2' }],
        pagination: {
          total: 2,
        },
      },
    });

    const result = await validateMigration(
      mockV1Client,
      mockV2Client,
      '/products'
    );

    expect(result.success).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
  });
});

describe('Migration Health Check', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should report healthy status when all versions work', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true }) // v1 health
      .mockResolvedValueOnce({ ok: true }); // v2 health

    const health = await checkMigrationHealth();
    
    expect(health.status).toBe('healthy');
    expect(health.issues).toHaveLength(0);
  });

  it('should report degraded status with issues', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // v1 health fails
      .mockResolvedValueOnce({ ok: true });  // v2 health ok

    const health = await checkMigrationHealth();
    
    expect(health.status).toBe('degraded');
    expect(health.issues.length).toBeGreaterThan(0);
  });

  it('should provide recommendations for issues', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false });

    const health = await checkMigrationHealth();
    
    expect(health.recommendations.length).toBeGreaterThan(0);
  });
});

describe('Backward Compatibility', () => {
  it('should handle v1 requests with v2 responses', () => {
    const v2Response = {
      items: [{ id: '1', title: 'Test Product' }],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    const v1Compatible = migrateResponseV2ToV1(v2Response);
    
    expect(v1Compatible.products).toEqual(v2Response.items);
    expect(v1Compatible.total).toBe(v2Response.pagination.total);
    expect(v1Compatible.page).toBe(v2Response.pagination.page);
  });

  it('should preserve unknown fields during migration', () => {
    const response = {
      customField: 'custom value',
      products: [{ id: '1' }],
    };

    const migrated = migrateResponseV1ToV2(response);
    expect(migrated.customField).toBe('custom value');
  });
});

describe('Error Handling', () => {
  it('should handle version-specific errors', () => {
    const v1Error = { error: 'Simple error message' };
    const v2Error = migrateResponseV1ToV2(v1Error);
    
    expect(v2Error.error.message).toBe('Simple error message');
    expect(v2Error.error.code).toBe('LEGACY_ERROR');
  });

  it('should preserve v2 error structure', () => {
    const v2Error = {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'title' },
      },
    };

    const migrated = migrateResponseV1ToV2(v2Error);
    expect(migrated).toEqual(v2Error);
  });
});

describe('Performance Testing', () => {
  it('should measure migration overhead', async () => {
    const largeResponse = {
      products: Array.from({ length: 1000 }, (_, i) => ({
        id: `product-${i}`,
        title: `Product ${i}`,
        price: Math.random() * 100,
      })),
      total: 1000,
      page: 1,
      total_pages: 50,
    };

    const startTime = Date.now();
    const migrated = migrateResponseV1ToV2(largeResponse);
    const migrationTime = Date.now() - startTime;

    expect(migrationTime).toBeLessThan(100); // Should be fast
    expect(migrated.items).toHaveLength(1000);
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should handle complete request-response cycle', async () => {
    const mockResponse = {
      items: [{ id: '1', title: 'Test Product' }],
      pagination: { total: 1, page: 1, totalPages: 1, hasNext: false, hasPrev: false },
      metadata: { version: 'v2', timestamp: new Date().toISOString(), requestId: 'test' },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/json',
        'API-Version': 'v2',
      }),
      json: () => Promise.resolve(mockResponse),
    });

    const client = new ApiClient({ version: 'v2' });
    const response = await client.get('/products');

    expect(response.data.items).toEqual(mockResponse.items);
    expect(response.version).toBe('v2');
  });
});
