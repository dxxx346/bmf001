import { NextRequest, NextResponse } from 'next/server';
import { extractApiVersion, applyCompatibilityTransform } from '@/middleware/api-version.middleware';
import { defaultLogger as logger } from '@/lib/logger';

/**
 * Backward Compatibility Middleware
 * Handles request/response transformations between API versions
 */

export interface CompatibilityRule {
  fromVersion: string;
  toVersion: string;
  endpoint: string | RegExp;
  requestTransform?: (data: any) => any;
  responseTransform?: (data: any) => any;
  headerTransform?: (headers: Headers) => Headers;
}

const COMPATIBILITY_RULES: CompatibilityRule[] = [
  // Products endpoint compatibility
  {
    fromVersion: 'v1',
    toVersion: 'v2',
    endpoint: /^\/products/,
    requestTransform: (data: any) => {
      if (!data) return data;
      
      // v1 to v2 request transformation
      return {
        ...data,
        // v2 expects additional metadata
        metadata: {
          ...data.metadata,
          legacy_request: true,
          original_version: 'v1',
        },
      };
    },
    responseTransform: (data: any) => {
      if (!data) return data;
      
      // v2 to v1 response transformation
      if (data.item) {
        // Transform v2 'item' back to v1 'product'
        return {
          product: data.item,
          total: data.pagination?.total,
          page: data.pagination?.page,
          limit: data.pagination?.limit,
          total_pages: data.pagination?.totalPages,
          filters_applied: data.filters,
          // Remove v2-specific fields
          facets: {
            categories: [],
            price_ranges: [],
            ratings: [],
            tags: [],
          },
        };
      }
      
      if (data.items) {
        // Transform v2 'items' back to v1 'products'
        return {
          products: data.items,
          total: data.pagination?.total,
          page: data.pagination?.page,
          limit: data.pagination?.limit,
          total_pages: data.pagination?.totalPages,
          filters_applied: data.filters,
          facets: {
            categories: [],
            price_ranges: [],
            ratings: [],
            tags: [],
          },
        };
      }
      
      return data;
    },
  },
  
  // Auth endpoint compatibility
  {
    fromVersion: 'v1',
    toVersion: 'v2',
    endpoint: /^\/auth/,
    responseTransform: (data: any) => {
      if (!data) return data;
      
      // v2 auth responses include additional security metadata
      // Transform back to v1 format
      if (data.user && data.session) {
        return {
          token: data.session.access_token,
          user: data.user,
          // Remove v2-specific session details
        };
      }
      
      return data;
    },
  },
  
  // Orders endpoint compatibility
  {
    fromVersion: 'v1',
    toVersion: 'v2',
    endpoint: /^\/orders/,
    responseTransform: (data: any) => {
      if (!data) return data;
      
      // Transform v2 order format back to v1
      if (data.items) {
        return {
          orders: data.items,
          total: data.pagination?.total,
          page: data.pagination?.page,
          limit: data.pagination?.limit,
          total_pages: data.pagination?.totalPages,
        };
      }
      
      if (data.item) {
        return {
          order: data.item,
        };
      }
      
      return data;
    },
  },
];

/**
 * Apply backward compatibility transformations
 */
export async function applyBackwardCompatibility(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const requestedVersion = extractApiVersion(request);
  
  // Only apply compatibility for v1 requests
  if (requestedVersion !== 'v1') {
    return response;
  }

  try {
    // Find applicable compatibility rule
    const rule = COMPATIBILITY_RULES.find(rule => 
      rule.fromVersion === requestedVersion &&
      (typeof rule.endpoint === 'string' 
        ? request.nextUrl.pathname.includes(rule.endpoint)
        : rule.endpoint.test(request.nextUrl.pathname.replace('/api/v1', ''))
      )
    );

    if (!rule || !rule.responseTransform) {
      return response;
    }

    // Clone the response to modify it
    const responseBody = await response.json();
    const transformedBody = rule.responseTransform(responseBody);

    // Create new response with transformed data
    const newResponse = NextResponse.json(transformedBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy headers from original response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });

    // Apply header transformations if specified
    if (rule.headerTransform) {
      rule.headerTransform(newResponse.headers);
    }

    // Add compatibility headers
    newResponse.headers.set('X-Compatibility-Applied', 'true');
    newResponse.headers.set('X-Original-Version', 'v2');
    newResponse.headers.set('X-Requested-Version', requestedVersion);

    logger.info('Backward compatibility applied', {
      requestedVersion,
      targetVersion: rule.toVersion,
      endpoint: request.nextUrl.pathname,
      ruleApplied: true,
    });

    return newResponse;

  } catch (error) {
    logger.error('Backward compatibility transformation failed', {
      error: (error as Error).message,
      requestedVersion,
      endpoint: request.nextUrl.pathname,
    });
    
    // Return original response if transformation fails
    return response;
  }
}

/**
 * Transform request data for forward compatibility
 */
export function transformRequestForCompatibility(
  request: NextRequest,
  data: any
): any {
  const requestedVersion = extractApiVersion(request);
  
  if (requestedVersion === 'v1') {
    const rule = COMPATIBILITY_RULES.find(rule => 
      rule.fromVersion === requestedVersion &&
      rule.requestTransform &&
      (typeof rule.endpoint === 'string' 
        ? request.nextUrl.pathname.includes(rule.endpoint)
        : rule.endpoint.test(request.nextUrl.pathname.replace('/api/v1', ''))
      )
    );

    if (rule?.requestTransform) {
      logger.info('Applying request compatibility transformation', {
        fromVersion: rule.fromVersion,
        toVersion: rule.toVersion,
        endpoint: request.nextUrl.pathname,
      });
      
      return rule.requestTransform(data);
    }
  }

  return data;
}

/**
 * Middleware to handle version routing and compatibility
 */
export async function versionCompatibilityMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  // Only process versioned API routes
  if (!request.nextUrl.pathname.startsWith('/api/v')) {
    return null;
  }

  const requestedVersion = extractApiVersion(request);
  
  // If requesting v1 but endpoint exists in v2, proxy to v2 with compatibility
  if (requestedVersion === 'v1') {
    const v2Path = request.nextUrl.pathname.replace('/api/v1', '/api/v2');
    
    try {
      // Check if v2 endpoint exists by making a test request
      const testUrl = new URL(v2Path, request.url);
      testUrl.search = request.nextUrl.search;
      
      // Create a new request for v2
      const v2Request = new Request(testUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      // Set v2 version in headers
      v2Request.headers.set('API-Version', 'v2');
      v2Request.headers.set('Accept', 'application/vnd.bmf001.v2+json');

      logger.info('Proxying v1 request to v2 endpoint', {
        originalPath: request.nextUrl.pathname,
        proxyPath: v2Path,
        method: request.method,
      });

      // This would be handled by the Next.js routing system
      // For now, we'll let the request continue and apply compatibility in the response
      return null;

    } catch (error) {
      logger.warn('v2 endpoint not available, using v1', {
        originalPath: request.nextUrl.pathname,
        error: (error as Error).message,
      });
      
      return null;
    }
  }

  return null;
}

export default versionCompatibilityMiddleware;
