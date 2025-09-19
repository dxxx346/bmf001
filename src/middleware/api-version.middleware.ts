import { NextRequest, NextResponse } from 'next/server';
import { defaultLogger as logger } from '@/lib/logger';

/**
 * API Versioning Middleware
 * Handles version routing, deprecation notices, and backward compatibility
 */

export interface ApiVersionConfig {
  version: string;
  deprecated?: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
  migrationGuide?: string;
  supportedUntil?: string;
}

export const API_VERSIONS: Record<string, ApiVersionConfig> = {
  'v1': {
    version: '1.0.0',
    deprecated: true,
    deprecationDate: '2024-06-01',
    sunsetDate: '2025-01-01',
    migrationGuide: '/docs/api/migration/v1-to-v2',
    supportedUntil: '2024-12-31',
  },
  'v2': {
    version: '2.0.0',
    deprecated: false,
  },
};

export const DEFAULT_API_VERSION = 'v2';
export const SUPPORTED_VERSIONS = Object.keys(API_VERSIONS);

/**
 * Extract API version from request
 */
export function extractApiVersion(request: NextRequest): string {
  // Check URL path first (e.g., /api/v1/products)
  const pathMatch = request.nextUrl.pathname.match(/^\/api\/(v\d+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Check Accept header (e.g., Accept: application/vnd.bmf001.v1+json)
  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/application\/vnd\.bmf001\.(v\d+)\+json/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }

  // Check API-Version header
  const versionHeader = request.headers.get('API-Version');
  if (versionHeader && SUPPORTED_VERSIONS.includes(versionHeader)) {
    return versionHeader;
  }

  // Check query parameter
  const versionParam = request.nextUrl.searchParams.get('version');
  if (versionParam && SUPPORTED_VERSIONS.includes(versionParam)) {
    return versionParam;
  }

  return DEFAULT_API_VERSION;
}

/**
 * Add version headers to response
 */
export function addVersionHeaders(
  response: NextResponse,
  version: string,
  originalPath?: string
): NextResponse {
  const versionConfig = API_VERSIONS[version];
  
  if (!versionConfig) {
    return response;
  }

  // Add standard version headers
  response.headers.set('API-Version', version);
  response.headers.set('API-Version-Number', versionConfig.version);
  response.headers.set('API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));

  // Add deprecation headers if applicable
  if (versionConfig.deprecated) {
    response.headers.set('Deprecation', 'true');
    
    if (versionConfig.deprecationDate) {
      response.headers.set('Deprecation-Date', versionConfig.deprecationDate);
    }
    
    if (versionConfig.sunsetDate) {
      response.headers.set('Sunset', versionConfig.sunsetDate);
    }
    
    if (versionConfig.migrationGuide) {
      response.headers.set('Link', `<${versionConfig.migrationGuide}>; rel="migration-guide"`);
    }
    
    if (versionConfig.supportedUntil) {
      response.headers.set('Support-Until', versionConfig.supportedUntil);
    }

    // Add warning header
    const warningMessage = `299 - "API version ${version} is deprecated. ` +
      `Please migrate to the latest version. ` +
      `${versionConfig.sunsetDate ? `This version will be sunset on ${versionConfig.sunsetDate}.` : ''}`.trim();
    
    response.headers.set('Warning', warningMessage);
  }

  // Add cache control for versioned responses
  response.headers.set('Vary', 'Accept, API-Version');
  
  // Log version usage for analytics
  if (originalPath) {
    logger.info('API version usage', {
      version,
      path: originalPath,
      deprecated: versionConfig.deprecated,
      userAgent: response.headers.get('user-agent'),
    });
  }

  return response;
}

/**
 * Check if version is supported
 */
export function isVersionSupported(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version);
}

/**
 * Get latest version
 */
export function getLatestVersion(): string {
  return SUPPORTED_VERSIONS
    .filter(v => !API_VERSIONS[v].deprecated)
    .sort()
    .pop() || DEFAULT_API_VERSION;
}

/**
 * Version compatibility checker
 */
export function checkVersionCompatibility(
  requestedVersion: string,
  requiredVersion: string
): boolean {
  const requestedNum = parseInt(requestedVersion.replace('v', ''));
  const requiredNum = parseInt(requiredVersion.replace('v', ''));
  
  return requestedNum >= requiredNum;
}

/**
 * Create version-aware error response
 */
export function createVersionedErrorResponse(
  message: string,
  status: number,
  version: string,
  details?: any
): NextResponse {
  const errorResponse = {
    error: {
      message,
      status,
      version,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    },
  };

  const response = NextResponse.json(errorResponse, { status });
  return addVersionHeaders(response, version);
}

/**
 * Main API version middleware
 */
export function apiVersionMiddleware(request: NextRequest): NextResponse | null {
  // Only process API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return null;
  }

  // Skip health checks and other system endpoints
  const skipVersioning = [
    '/api/health',
    '/api/docs',
    '/api/swagger',
  ];

  if (skipVersioning.some(path => request.nextUrl.pathname.startsWith(path))) {
    return null;
  }

  const requestedVersion = extractApiVersion(request);
  
  // Check if version is supported
  if (!isVersionSupported(requestedVersion)) {
    return createVersionedErrorResponse(
      `API version '${requestedVersion}' is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
      400,
      DEFAULT_API_VERSION,
      {
        supportedVersions: SUPPORTED_VERSIONS,
        latestVersion: getLatestVersion(),
      }
    );
  }

  // Check if version is sunset
  const versionConfig = API_VERSIONS[requestedVersion];
  if (versionConfig.sunsetDate) {
    const sunsetDate = new Date(versionConfig.sunsetDate);
    const now = new Date();
    
    if (now > sunsetDate) {
      return createVersionedErrorResponse(
        `API version '${requestedVersion}' has been sunset as of ${versionConfig.sunsetDate}. Please upgrade to ${getLatestVersion()}.`,
        410, // Gone
        requestedVersion,
        {
          sunsetDate: versionConfig.sunsetDate,
          migrationGuide: versionConfig.migrationGuide,
          latestVersion: getLatestVersion(),
        }
      );
    }
  }

  // If no explicit version in path, redirect to versioned path
  if (!request.nextUrl.pathname.match(/^\/api\/v\d+/)) {
    const versionedPath = `/api/${requestedVersion}${request.nextUrl.pathname.replace('/api', '')}`;
    const url = new URL(versionedPath, request.url);
    url.search = request.nextUrl.search;
    
    logger.info('Redirecting to versioned API path', {
      originalPath: request.nextUrl.pathname,
      versionedPath,
      version: requestedVersion,
    });
    
    return NextResponse.redirect(url);
  }

  return null;
}

/**
 * Version-aware response wrapper
 */
export function createVersionedResponse(
  data: any,
  request: NextRequest,
  status: number = 200
): NextResponse {
  const version = extractApiVersion(request);
  const response = NextResponse.json(data, { status });
  
  return addVersionHeaders(response, version, request.nextUrl.pathname);
}

/**
 * Backward compatibility layer
 */
export interface CompatibilityTransform {
  fromVersion: string;
  toVersion: string;
  requestTransform?: (data: any) => any;
  responseTransform?: (data: any) => any;
}

const COMPATIBILITY_TRANSFORMS: CompatibilityTransform[] = [
  {
    fromVersion: 'v1',
    toVersion: 'v2',
    requestTransform: (data: any) => {
      // Transform v1 request format to v2
      if (data.product) {
        return {
          ...data,
          item: data.product, // v2 uses 'item' instead of 'product'
          product: undefined,
        };
      }
      return data;
    },
    responseTransform: (data: any) => {
      // Transform v2 response format back to v1
      if (data.item) {
        return {
          ...data,
          product: data.item, // v1 expects 'product' instead of 'item'
          item: undefined,
        };
      }
      return data;
    },
  },
];

/**
 * Apply backward compatibility transforms
 */
export function applyCompatibilityTransform(
  data: any,
  fromVersion: string,
  toVersion: string,
  type: 'request' | 'response'
): any {
  const transform = COMPATIBILITY_TRANSFORMS.find(
    t => t.fromVersion === fromVersion && t.toVersion === toVersion
  );

  if (!transform) {
    return data;
  }

  const transformer = type === 'request' 
    ? transform.requestTransform 
    : transform.responseTransform;

  return transformer ? transformer(data) : data;
}

/**
 * Version negotiation for content type
 */
export function negotiateVersion(request: NextRequest): string {
  const acceptHeader = request.headers.get('Accept') || '';
  
  // Parse Accept header for version preferences
  const versionPreferences = acceptHeader
    .split(',')
    .map(type => type.trim())
    .filter(type => type.includes('vnd.bmf001'))
    .map(type => {
      const match = type.match(/application\/vnd\.bmf001\.(v\d+)\+json(?:;q=([0-9.]+))?/);
      if (match) {
        return {
          version: match[1],
          quality: parseFloat(match[2] || '1.0'),
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => (b?.quality || 0) - (a?.quality || 0));

  if (versionPreferences.length > 0 && versionPreferences[0]) {
    const preferredVersion = versionPreferences[0].version;
    if (isVersionSupported(preferredVersion)) {
      return preferredVersion;
    }
  }

  return extractApiVersion(request);
}

export default apiVersionMiddleware;
