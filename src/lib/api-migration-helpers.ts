/**
 * API Migration Helper Utilities
 * Provides functions to transform data between API versions
 */

import { defaultLogger as logger } from '@/lib/logger';

export interface MigrationContext {
  fromVersion: string;
  toVersion: string;
  endpoint: string;
  method: string;
}

/**
 * Transform v1 response to v2 format
 */
export function migrateResponseV1ToV2(v1Response: any): any {
  if (!v1Response || typeof v1Response !== 'object') {
    return v1Response;
  }

  // Handle product list responses
  if (v1Response.products) {
    return {
      items: v1Response.products,
      pagination: {
        page: v1Response.page || 1,
        limit: v1Response.limit || 20,
        total: v1Response.total || 0,
        totalPages: v1Response.total_pages || 0,
        hasNext: (v1Response.page || 1) < (v1Response.total_pages || 0),
        hasPrev: (v1Response.page || 1) > 1,
      },
      filters: v1Response.filters_applied || {},
      metadata: {
        version: 'v2',
        timestamp: new Date().toISOString(),
        requestId: `migrated_${Date.now()}`,
        executionTime: 0,
        migrated: true,
      },
    };
  }

  // Handle single product responses
  if (v1Response.product) {
    return {
      item: v1Response.product,
      metadata: {
        version: 'v2',
        timestamp: new Date().toISOString(),
        requestId: `migrated_${Date.now()}`,
        migrated: true,
      },
    };
  }

  // Handle order list responses
  if (v1Response.orders) {
    return {
      items: v1Response.orders,
      pagination: {
        page: v1Response.page || 1,
        limit: v1Response.limit || 20,
        total: v1Response.total || 0,
        totalPages: v1Response.total_pages || 0,
        hasNext: (v1Response.page || 1) < (v1Response.total_pages || 0),
        hasPrev: (v1Response.page || 1) > 1,
      },
      metadata: {
        version: 'v2',
        timestamp: new Date().toISOString(),
        requestId: `migrated_${Date.now()}`,
        migrated: true,
      },
    };
  }

  // Handle single order responses
  if (v1Response.order) {
    return {
      item: v1Response.order,
      metadata: {
        version: 'v2',
        timestamp: new Date().toISOString(),
        requestId: `migrated_${Date.now()}`,
        migrated: true,
      },
    };
  }

  // Handle error responses
  if (v1Response.error && typeof v1Response.error === 'string') {
    return {
      error: {
        message: v1Response.error,
        code: 'LEGACY_ERROR',
        details: {},
      },
      metadata: {
        version: 'v2',
        timestamp: new Date().toISOString(),
        requestId: `migrated_${Date.now()}`,
        migrated: true,
      },
    };
  }

  return v1Response;
}

/**
 * Transform v2 response to v1 format
 */
export function migrateResponseV2ToV1(v2Response: any): any {
  if (!v2Response || typeof v2Response !== 'object') {
    return v2Response;
  }

  // Handle item list responses
  if (v2Response.items && v2Response.pagination) {
    return {
      products: v2Response.items,
      total: v2Response.pagination.total,
      page: v2Response.pagination.page,
      limit: v2Response.pagination.limit,
      total_pages: v2Response.pagination.totalPages,
      filters_applied: v2Response.filters || {},
      facets: {
        categories: [],
        price_ranges: [],
        ratings: [],
        tags: [],
      },
    };
  }

  // Handle single item responses
  if (v2Response.item) {
    return {
      product: v2Response.item,
    };
  }

  // Handle error responses
  if (v2Response.error && typeof v2Response.error === 'object') {
    return {
      error: v2Response.error.message || 'An error occurred',
    };
  }

  return v2Response;
}

/**
 * Transform v1 request to v2 format
 */
export function migrateRequestV1ToV2(v1Request: any): any {
  if (!v1Request || typeof v1Request !== 'object') {
    return v1Request;
  }

  return {
    ...v1Request,
    metadata: {
      ...v1Request.metadata,
      legacy_request: true,
      original_version: 'v1',
      migrated_at: new Date().toISOString(),
    },
  };
}

/**
 * Transform v2 request to v1 format
 */
export function migrateRequestV2ToV1(v2Request: any): any {
  if (!v2Request || typeof v2Request !== 'object') {
    return v2Request;
  }

  // Remove v2-specific fields
  const { metadata, ...v1Request } = v2Request;
  return v1Request;
}

/**
 * Create compatibility wrapper for API client
 */
export function createV1CompatibilityWrapper(v2Client: any) {
  return {
    async get(endpoint: string, params?: any) {
      const response = await v2Client.get(endpoint, params);
      return {
        ...response,
        data: migrateResponseV2ToV1(response.data),
      };
    },

    async post(endpoint: string, data?: any) {
      const transformedData = migrateRequestV1ToV2(data);
      const response = await v2Client.post(endpoint, transformedData);
      return {
        ...response,
        data: migrateResponseV2ToV1(response.data),
      };
    },

    async put(endpoint: string, data?: any) {
      const transformedData = migrateRequestV1ToV2(data);
      const response = await v2Client.put(endpoint, transformedData);
      return {
        ...response,
        data: migrateResponseV2ToV1(response.data),
      };
    },

    async patch(endpoint: string, data?: any) {
      const transformedData = migrateRequestV1ToV2(data);
      const response = await v2Client.patch(endpoint, transformedData);
      return {
        ...response,
        data: migrateResponseV2ToV1(response.data),
      };
    },

    async delete(endpoint: string) {
      const response = await v2Client.delete(endpoint);
      return {
        ...response,
        data: migrateResponseV2ToV1(response.data),
      };
    },
  };
}

/**
 * Validate migration between versions
 */
export async function validateMigration(
  v1Client: any,
  v2Client: any,
  endpoint: string,
  params?: any
): Promise<{
  success: boolean;
  differences: string[];
  performance: {
    v1Time: number;
    v2Time: number;
    improvement: number;
  };
}> {
  const differences: string[] = [];
  
  try {
    // Test v1 endpoint
    const v1Start = Date.now();
    const v1Response = await v1Client.get(endpoint, params);
    const v1Time = Date.now() - v1Start;

    // Test v2 endpoint
    const v2Start = Date.now();
    const v2Response = await v2Client.get(endpoint, params);
    const v2Time = Date.now() - v2Start;

    // Transform v2 response to v1 format for comparison
    const transformedV2 = migrateResponseV2ToV1(v2Response.data);

    // Compare data structures
    const v1Data = v1Response.data;
    
    // Check for missing fields
    if (v1Data.products && transformedV2.products) {
      if (v1Data.products.length !== transformedV2.products.length) {
        differences.push(`Product count mismatch: v1=${v1Data.products.length}, v2=${transformedV2.products.length}`);
      }
    }

    // Check pagination
    if (v1Data.total !== transformedV2.total) {
      differences.push(`Total count mismatch: v1=${v1Data.total}, v2=${transformedV2.total}`);
    }

    const improvement = v1Time > 0 ? ((v1Time - v2Time) / v1Time) * 100 : 0;

    logger.info('Migration validation completed', {
      endpoint,
      v1Time,
      v2Time,
      improvement: `${improvement.toFixed(2)}%`,
      differences: differences.length,
    });

    return {
      success: differences.length === 0,
      differences,
      performance: {
        v1Time,
        v2Time,
        improvement,
      },
    };

  } catch (error) {
    logger.error('Migration validation failed', {
      endpoint,
      error: (error as Error).message,
    });

    return {
      success: false,
      differences: [`Validation failed: ${(error as Error).message}`],
      performance: {
        v1Time: 0,
        v2Time: 0,
        improvement: 0,
      },
    };
  }
}

/**
 * Batch validate multiple endpoints
 */
export async function batchValidateMigration(
  v1Client: any,
  v2Client: any,
  endpoints: string[]
): Promise<{
  overall: boolean;
  results: any[];
  summary: {
    totalEndpoints: number;
    successfulMigrations: number;
    averageImprovement: number;
  };
}> {
  const results: any[] = [];
  let totalImprovement = 0;
  let successCount = 0;

  for (const endpoint of endpoints) {
    const result = await validateMigration(v1Client, v2Client, endpoint);
    const resultWithEndpoint = {
      endpoint,
      success: result.success,
      differences: result.differences,
      performance: result.performance,
    };
    
    results.push(resultWithEndpoint);

    if (result.success) {
      successCount++;
      totalImprovement += result.performance.improvement;
    }
  }

  const averageImprovement = successCount > 0 ? totalImprovement / successCount : 0;

  return {
    overall: successCount === endpoints.length,
    results,
    summary: {
      totalEndpoints: endpoints.length,
      successfulMigrations: successCount,
      averageImprovement,
    },
  };
}

/**
 * Migration health check
 */
export async function checkMigrationHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check if v1 endpoints are still accessible
    const v1Health = await fetch('/api/v1/health').then(r => r.ok).catch(() => false);
    const v2Health = await fetch('/api/v2/health').then(r => r.ok).catch(() => false);

    if (!v1Health) {
      issues.push('v1 endpoints not accessible');
    }

    if (!v2Health) {
      issues.push('v2 endpoints not accessible');
      recommendations.push('Ensure v2 endpoints are properly deployed');
    }

    // Check for high v1 usage (indicating slow migration)
    // This would typically come from analytics
    const v1Usage = 0.7; // Placeholder - would come from real metrics
    
    if (v1Usage > 0.5) {
      issues.push('High v1 API usage detected');
      recommendations.push('Accelerate migration to v2');
      recommendations.push('Review migration blockers');
    }

    const status = issues.length === 0 ? 'healthy' : 
                  issues.length <= 2 ? 'degraded' : 'unhealthy';

    return {
      status,
      issues,
      recommendations,
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      issues: [`Health check failed: ${(error as Error).message}`],
      recommendations: ['Check API endpoint availability', 'Review server logs'],
    };
  }
}

const ApiMigrationHelpers = {
  migrateResponseV1ToV2,
  migrateResponseV2ToV1,
  migrateRequestV1ToV2,
  migrateRequestV2ToV1,
  createV1CompatibilityWrapper,
  validateMigration,
  batchValidateMigration,
  checkMigrationHealth,
};

export default ApiMigrationHelpers;
