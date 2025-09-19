# 🔄 API Versioning Documentation

This document describes the API versioning strategy for the BMF001 digital marketplace, including version management, deprecation policies, and migration guides.

## 📋 Overview

The BMF001 API uses semantic versioning with a clear deprecation and sunset policy to ensure backward compatibility while allowing for API evolution.

### Current Versions

| Version | Status | Release Date | Deprecation Date | Sunset Date | Support Until |
|---------|--------|--------------|------------------|-------------|---------------|
| **v1** | 🟡 Deprecated | 2024-01-01 | 2024-06-01 | 2025-01-01 | 2024-12-31 |
| **v2** | 🟢 Current | 2024-06-01 | - | - | - |

## 🎯 Version Selection

### 1. URL Path (Recommended)

```http
GET /api/v1/products
GET /api/v2/products
```

### 2. Accept Header

```http
Accept: application/vnd.bmf001.v1+json
Accept: application/vnd.bmf001.v2+json
```

### 3. API-Version Header

```http
API-Version: v1
API-Version: v2
```

### 4. Query Parameter

```http
GET /api/products?version=v1
GET /api/products?version=v2
```

## 📊 Version Comparison

### API v1 (Deprecated)

#### Features:
- ✅ Basic CRUD operations
- ✅ Simple pagination
- ✅ Basic error responses
- ✅ Standard HTTP status codes

#### Response Format:
```json
{
  "products": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### Limitations:
- ❌ Limited error details
- ❌ No request metadata
- ❌ Basic pagination info
- ❌ No draft product support
- ❌ Limited filtering options

### API v2 (Current)

#### Features:
- ✅ Enhanced CRUD operations
- ✅ Rich pagination metadata
- ✅ Detailed error responses with codes
- ✅ Request tracking and metadata
- ✅ Draft product support
- ✅ Scheduled publishing
- ✅ External ID support
- ✅ Advanced filtering
- ✅ Performance metrics

#### Response Format:
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "version": "v2",
    "timestamp": "2024-12-01T12:00:00Z",
    "requestId": "req_123456",
    "executionTime": 150
  }
}
```

#### Improvements:
- ✅ Consistent field naming (`items` instead of `products`)
- ✅ Rich error responses with error codes
- ✅ Request tracking with unique IDs
- ✅ Performance metrics
- ✅ Enhanced pagination metadata
- ✅ Better filtering and sorting options

## 🔧 Version Headers

### Response Headers

All API responses include version information:

```http
API-Version: v2
API-Version-Number: 2.0.0
API-Supported-Versions: v1, v2
```

### Deprecation Headers (v1 only)

```http
Deprecation: true
Deprecation-Date: 2024-06-01
Sunset: 2025-01-01
Support-Until: 2024-12-31
Warning: 299 - "API version v1 is deprecated. Please migrate to v2."
Link: </docs/api/migration/v1-to-v2>; rel="migration-guide"
```

### Caching Headers

```http
Vary: Accept, API-Version
Cache-Control: public, max-age=300
```

## 🚀 Using the API Client

### Basic Usage

```typescript
import { ApiClient, v1Client, v2Client } from '@/lib/api-client';

// Use default client (v2)
const client = new ApiClient();

// Use specific version
const v1 = new ApiClient({ version: 'v1' });
const v2 = new ApiClient({ version: 'v2' });

// Or use pre-configured clients
const products = await v2Client.get('/products');
```

### Version Migration

```typescript
import { apiVersionUtils } from '@/lib/api-client';

// Check version support
if (apiVersionUtils.isVersionSupported('v2')) {
  // Migrate client to v2
  apiVersionUtils.migrateClient(client, 'v2');
}
```

### Error Handling

```typescript
try {
  const response = await client.get('/products');
  
  // Check for deprecation warnings
  if (response.deprecated) {
    console.warn('API version deprecated:', response.migrationGuide);
  }
  
  return response.data;
} catch (error) {
  if (error.status === 410) {
    // Version sunset
    console.error('API version no longer supported');
  }
}
```

## 📈 Version Lifecycle

### 1. Introduction Phase
- New version released
- Parallel support with previous version
- Migration documentation provided
- Backward compatibility maintained

### 2. Adoption Phase
- Encourage migration to new version
- Provide migration tools and guides
- Monitor usage metrics
- Support both versions

### 3. Deprecation Phase
- Mark old version as deprecated
- Add deprecation headers
- Provide sunset timeline
- Continue full support

### 4. Sunset Phase
- Stop accepting new integrations
- Provide migration assistance
- Send sunset notifications
- Maintain critical bug fixes only

### 5. End of Life
- Version no longer supported
- Return 410 Gone status
- Redirect to migration guide

## 🔄 Backward Compatibility

### Automatic Compatibility

The API automatically handles compatibility between versions:

```typescript
// v1 request to v2 endpoint
GET /api/v1/products

// Automatically transformed to:
GET /api/v2/products
// Response transformed back to v1 format
```

### Manual Compatibility

```typescript
import { applyCompatibilityTransform } from '@/middleware/api-version.middleware';

// Transform v1 request to v2 format
const v2Data = applyCompatibilityTransform(v1Data, 'v1', 'v2', 'request');

// Transform v2 response to v1 format
const v1Response = applyCompatibilityTransform(v2Response, 'v2', 'v1', 'response');
```

## 🛠️ Implementation Examples

### Version-Aware Endpoint

```typescript
import { createVersionedResponse, extractApiVersion } from '@/middleware/api-version.middleware';

export async function GET(request: NextRequest) {
  const version = extractApiVersion(request);
  const data = await fetchData();
  
  // Return version-appropriate response
  return createVersionedResponse(data, request);
}
```

### Version-Specific Logic

```typescript
export async function POST(request: NextRequest) {
  const version = extractApiVersion(request);
  const data = await request.json();
  
  if (version === 'v1') {
    // v1-specific handling
    return handleV1Request(data);
  } else {
    // v2+ handling with new features
    return handleV2Request(data);
  }
}
```

### Deprecation Notices

```typescript
import { addVersionHeaders } from '@/middleware/api-version.middleware';

export async function GET(request: NextRequest) {
  const data = await fetchData();
  const response = NextResponse.json(data);
  
  // Automatically adds deprecation headers for v1
  return addVersionHeaders(response, extractApiVersion(request));
}
```

## 📋 Migration Checklist

### For API Consumers

- [ ] **Check current version usage**
  ```bash
  curl -H "Accept: application/vnd.bmf001.v1+json" /api/products
  ```

- [ ] **Review deprecation headers**
  ```bash
  curl -I /api/v1/products
  # Look for: Deprecation, Sunset, Warning headers
  ```

- [ ] **Test with v2 endpoints**
  ```bash
  curl -H "Accept: application/vnd.bmf001.v2+json" /api/products
  ```

- [ ] **Update client code**
  ```typescript
  // Old
  const response = await fetch('/api/products');
  
  // New
  const client = new ApiClient({ version: 'v2' });
  const response = await client.get('/products');
  ```

- [ ] **Handle new response format**
  ```typescript
  // v1 format
  const products = response.products;
  
  // v2 format
  const products = response.items;
  ```

### For API Providers

- [ ] **Implement version middleware**
- [ ] **Add deprecation headers**
- [ ] **Create migration documentation**
- [ ] **Set up monitoring for version usage**
- [ ] **Plan sunset timeline**

## 🔍 Monitoring & Analytics

### Version Usage Metrics

```sql
-- Check version usage distribution
SELECT 
  version,
  COUNT(*) as requests,
  COUNT(DISTINCT user_id) as unique_users
FROM api_usage_logs 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY version;
```

### Deprecation Warnings

```sql
-- Monitor deprecation warning responses
SELECT 
  endpoint,
  COUNT(*) as deprecated_requests
FROM api_usage_logs 
WHERE version = 'v1' 
AND created_at >= NOW() - INTERVAL '1 day'
GROUP BY endpoint
ORDER BY deprecated_requests DESC;
```

### Migration Progress

```sql
-- Track migration progress
SELECT 
  DATE(created_at) as date,
  version,
  COUNT(*) as requests
FROM api_usage_logs 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), version
ORDER BY date, version;
```

## 🚨 Error Responses

### Version Not Supported

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "message": "API version 'v3' is not supported",
    "status": 400,
    "version": "v2",
    "details": {
      "supportedVersions": ["v1", "v2"],
      "latestVersion": "v2"
    }
  }
}
```

### Version Sunset

```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": {
    "message": "API version 'v1' has been sunset as of 2025-01-01",
    "status": 410,
    "version": "v1",
    "details": {
      "sunsetDate": "2025-01-01",
      "migrationGuide": "/docs/api/migration/v1-to-v2",
      "latestVersion": "v2"
    }
  }
}
```

## 🔗 Related Endpoints

### Version Information

```http
GET /api/version
```

Returns complete version information and compatibility matrix.

### Health Check

```http
GET /api/health
```

Includes version health and compatibility status.

### Migration Guide

```http
GET /api/docs/migration/v1-to-v2
```

Interactive migration guide with code examples.

## 📚 Best Practices

### 1. Version Selection Strategy

```typescript
// ✅ Good: Explicit version selection
const client = new ApiClient({ version: 'v2' });

// ❌ Bad: Relying on default version
const client = new ApiClient(); // Uses default, may change
```

### 2. Error Handling

```typescript
// ✅ Good: Handle version-specific errors
try {
  const response = await client.get('/products');
} catch (error) {
  if (error.status === 410) {
    // Handle sunset version
    migrateToLatestVersion();
  }
}
```

### 3. Deprecation Monitoring

```typescript
// ✅ Good: Monitor deprecation warnings
const response = await client.get('/products');
if (response.deprecated) {
  analytics.track('deprecated_api_usage', {
    version: response.version,
    migrationGuide: response.migrationGuide,
  });
}
```

### 4. Graceful Migration

```typescript
// ✅ Good: Gradual migration with fallback
async function fetchProducts() {
  try {
    // Try v2 first
    return await v2Client.get('/products');
  } catch (error) {
    if (error.status === 404) {
      // Fallback to v1
      return await v1Client.get('/products');
    }
    throw error;
  }
}
```

## 🔒 Security Considerations

### Version-Specific Security

- **Rate Limiting**: Different limits per version
- **Authentication**: Enhanced security in newer versions
- **Input Validation**: Stricter validation in v2
- **Error Disclosure**: Reduced error details in production

### Compatibility Security

- **Data Transformation**: Secure transformation between versions
- **Header Validation**: Validate version-specific headers
- **Access Control**: Version-based access restrictions

## 📊 Performance Impact

### Compatibility Overhead

- **Request Transformation**: ~5-10ms overhead
- **Response Transformation**: ~10-20ms overhead
- **Version Detection**: ~1-2ms overhead
- **Header Processing**: ~1-2ms overhead

### Optimization Strategies

- **Caching**: Cache version metadata
- **Lazy Loading**: Load compatibility rules on-demand
- **Async Processing**: Transform responses asynchronously
- **Monitoring**: Track performance impact

---

## ✅ **IMPLEMENTATION STATUS**

- **🟢 Version Routing**: Fully implemented
- **🟢 Deprecation Headers**: Automatic header injection
- **🟢 Backward Compatibility**: Automatic transformation
- **🟢 Client Library**: Version-aware API client
- **🟢 Documentation**: Comprehensive guides
- **🟢 Migration Tools**: Automated migration scripts

**API Versioning Status:** 🟢 **PRODUCTION READY**
