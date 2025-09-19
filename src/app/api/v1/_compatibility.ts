import { NextRequest, NextResponse } from 'next/server';

/**
 * API v1 Compatibility Layer
 * This file provides backward compatibility for v1 API endpoints
 */

export function withV1Compatibility(handler: (request: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Add v1-specific headers
      const response = await handler(request, context);
      
      if (response instanceof NextResponse) {
        response.headers.set('API-Version', 'v1');
        response.headers.set('API-Version-Number', '1.0.0');
        response.headers.set('Deprecation', 'true');
        response.headers.set('Deprecation-Date', '2024-06-01');
        response.headers.set('Sunset', '2025-01-01');
        response.headers.set('Link', '</docs/api/migration/v1-to-v2>; rel="migration-guide"');
        response.headers.set('Warning', '299 - "API version v1 is deprecated. Please migrate to v2."');
      }
      
      return response;
    } catch (error) {
      console.error('v1 API error:', error);
      throw error;
    }
  };
}

export default withV1Compatibility;
