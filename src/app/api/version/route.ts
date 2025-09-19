import { NextRequest, NextResponse } from 'next/server';
import { 
  API_VERSIONS, 
  SUPPORTED_VERSIONS, 
  DEFAULT_API_VERSION,
  extractApiVersion,
  getLatestVersion 
} from '@/middleware/api-version.middleware';

/**
 * API Version Information Endpoint
 * Provides version metadata and compatibility information
 */

export async function GET(request: NextRequest) {
  const requestedVersion = extractApiVersion(request);
  const versionConfig = API_VERSIONS[requestedVersion];

  const response = {
    current: requestedVersion,
    supported: SUPPORTED_VERSIONS,
    latest: getLatestVersion(),
    default: DEFAULT_API_VERSION,
    deprecated: versionConfig?.deprecated || false,
    migrationGuide: versionConfig?.migrationGuide,
    sunsetDate: versionConfig?.sunsetDate,
    supportedUntil: versionConfig?.supportedUntil,
    versions: Object.entries(API_VERSIONS).map(([version, config]) => ({
      version,
      number: config.version,
      deprecated: config.deprecated || false,
      deprecationDate: config.deprecationDate,
      sunsetDate: config.sunsetDate,
      migrationGuide: config.migrationGuide,
      supportedUntil: config.supportedUntil,
    })),
    compatibility: {
      backwardCompatible: requestedVersion !== 'v1', // v2+ are backward compatible
      forwardCompatible: false, // No forward compatibility
      breaking_changes: getBreakingChanges(requestedVersion),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      server_version: process.env.NEXT_PUBLIC_BUILD_VERSION || 'unknown',
    },
  };

  const nextResponse = NextResponse.json(response);
  
  // Add version headers
  nextResponse.headers.set('API-Version', requestedVersion);
  nextResponse.headers.set('API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
  
  if (versionConfig?.deprecated) {
    nextResponse.headers.set('Deprecation', 'true');
    if (versionConfig.sunsetDate) {
      nextResponse.headers.set('Sunset', versionConfig.sunsetDate);
    }
  }

  return nextResponse;
}

/**
 * Get breaking changes between versions
 */
function getBreakingChanges(version: string): string[] {
  const breakingChanges: Record<string, string[]> = {
    'v1': [
      'Uses "product" field in responses',
      'Limited error handling',
      'No request metadata',
      'Basic pagination format',
    ],
    'v2': [
      'Uses "item" field instead of "product" in responses',
      'Enhanced error responses with codes and details',
      'Request metadata included in all responses',
      'Improved pagination with hasNext/hasPrev flags',
      'Support for draft products and scheduled publishing',
      'External ID support for integrations',
    ],
  };

  return breakingChanges[version] || [];
}
