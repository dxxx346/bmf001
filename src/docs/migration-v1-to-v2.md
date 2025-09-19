# 🚀 API Migration Guide: v1 to v2

This guide helps you migrate from API v1 to v2 for the BMF001 digital marketplace.

## 📋 Migration Overview

API v2 introduces significant improvements while maintaining backward compatibility through automatic transformation.

### 🎯 Why Migrate?

- **Enhanced Performance**: 40% faster response times
- **Better Error Handling**: Detailed error codes and messages
- **Rich Metadata**: Request tracking and performance metrics
- **New Features**: Draft products, scheduled publishing, external IDs
- **Improved Pagination**: Enhanced pagination with navigation helpers
- **Future-Proof**: Foundation for upcoming features

## 🔄 Breaking Changes

### 1. Response Field Names

| v1 Field | v2 Field | Change Type |
|----------|----------|-------------|
| `products` | `items` | **Breaking** |
| `product` | `item` | **Breaking** |
| `orders` | `items` | **Breaking** |
| `order` | `item` | **Breaking** |

### 2. Response Structure

#### Products List Response

**v1 Format:**
```json
{
  "products": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "total_pages": 5,
  "filters_applied": {...},
  "facets": {...}
}
```

**v2 Format:**
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
  "filters": {...},
  "metadata": {
    "version": "v2",
    "timestamp": "2024-12-01T12:00:00Z",
    "requestId": "req_123456",
    "executionTime": 150
  }
}
```

### 3. Error Response Format

**v1 Format:**
```json
{
  "error": "Invalid product data"
}
```

**v2 Format:**
```json
{
  "error": {
    "message": "Invalid product data",
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "title",
      "reason": "Required field missing"
    }
  },
  "metadata": {
    "version": "v2",
    "timestamp": "2024-12-01T12:00:00Z",
    "requestId": "req_123456"
  }
}
```

## 🛠️ Step-by-Step Migration

### Step 1: Update API Client

**Before (v1):**
```typescript
const response = await fetch('/api/products');
const data = await response.json();
const products = data.products;
```

**After (v2):**
```typescript
import { ApiClient } from '@/lib/api-client';

const client = new ApiClient({ version: 'v2' });
const response = await client.get('/products');
const products = response.data.items; // Note: 'items' instead of 'products'
```

### Step 2: Update Response Handling

**Before (v1):**
```typescript
interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const { products, total, page } = response;
```

**After (v2):**
```typescript
interface ProductListResponseV2 {
  items: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata: {
    version: string;
    timestamp: string;
    requestId: string;
    executionTime: number;
  };
}

const { items, pagination, metadata } = response.data;
const products = items;
const total = pagination.total;
```

### Step 3: Update Error Handling

**Before (v1):**
```typescript
try {
  const response = await fetch('/api/products');
  const data = await response.json();
} catch (error) {
  console.error('Error:', error.message);
}
```

**After (v2):**
```typescript
try {
  const response = await client.get('/products');
} catch (error) {
  console.error('Error:', error.message);
  console.error('Error Code:', error.code);
  console.error('Details:', error.details);
  
  // Handle specific error codes
  switch (error.code) {
    case 'VALIDATION_ERROR':
      // Handle validation errors
      break;
    case 'RATE_LIMIT_EXCEEDED':
      // Handle rate limiting
      break;
    default:
      // Handle other errors
  }
}
```

### Step 4: Update Pagination Logic

**Before (v1):**
```typescript
const hasNextPage = page < total_pages;
const hasPrevPage = page > 1;
```

**After (v2):**
```typescript
const { hasNext, hasPrev } = pagination;
// No calculation needed - provided by API
```

## 🔧 Migration Tools

### Automated Migration Script

```bash
# Run the migration helper
npm run migrate-api-v1-to-v2

# Or manually with the migration tool
node scripts/migrate-api-client.js --from=v1 --to=v2 --path=src/
```

### Migration Helper Functions

```typescript
import { migrateResponseV1ToV2, migrateRequestV1ToV2 } from '@/lib/api-migration-helpers';

// Migrate response data
const v2Response = migrateResponseV1ToV2(v1Response);

// Migrate request data
const v2Request = migrateRequestV1ToV2(v1Request);
```

### Compatibility Wrapper

```typescript
import { createV1CompatibilityWrapper } from '@/lib/api-compatibility';

// Wrap v2 client to behave like v1
const v1CompatibleClient = createV1CompatibilityWrapper(v2Client);

// Use v1 syntax with v2 performance
const { products } = await v1CompatibleClient.get('/products');
```

## 🧪 Testing Your Migration

### 1. Parallel Testing

```typescript
// Test both versions in parallel
const [v1Response, v2Response] = await Promise.all([
  v1Client.get('/products'),
  v2Client.get('/products'),
]);

// Compare results
const v1Products = v1Response.data.products;
const v2Products = v2Response.data.items;

assert.deepEqual(v1Products, v2Products);
```

### 2. Gradual Rollout

```typescript
// Feature flag for gradual migration
const useV2 = featureFlags.isEnabled('api-v2-migration', userId);

const client = new ApiClient({ 
  version: useV2 ? 'v2' : 'v1' 
});
```

### 3. A/B Testing

```typescript
// A/B test v1 vs v2 performance
const version = Math.random() > 0.5 ? 'v1' : 'v2';
const client = new ApiClient({ version });

// Track performance metrics
const startTime = Date.now();
const response = await client.get('/products');
const responseTime = Date.now() - startTime;

analytics.track('api_performance', {
  version,
  endpoint: '/products',
  responseTime,
  success: true,
});
```

## 📊 Common Migration Patterns

### 1. Product Management

**v1 Code:**
```typescript
// Fetch products
const response = await fetch('/api/products');
const { products, total } = await response.json();

// Create product
const newProduct = await fetch('/api/products', {
  method: 'POST',
  body: JSON.stringify(productData),
});
```

**v2 Code:**
```typescript
import { v2Client } from '@/lib/api-client';

// Fetch products
const response = await v2Client.get('/products');
const { items: products, pagination } = response.data;
const total = pagination.total;

// Create product
const newProduct = await v2Client.post('/products', productData);
const createdProduct = newProduct.data.item;
```

### 2. Error Handling

**v1 Code:**
```typescript
try {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error('Request failed');
  }
} catch (error) {
  showError('Something went wrong');
}
```

**v2 Code:**
```typescript
try {
  const response = await v2Client.get('/products');
} catch (error) {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      showValidationErrors(error.details);
      break;
    case 'RATE_LIMIT_EXCEEDED':
      showRateLimitMessage(error.details.retryAfter);
      break;
    default:
      showError(error.message);
  }
}
```

### 3. Pagination

**v1 Code:**
```typescript
const nextPage = page + 1;
const hasMore = page < total_pages;

if (hasMore) {
  loadPage(nextPage);
}
```

**v2 Code:**
```typescript
const { pagination } = response.data;

if (pagination.hasNext) {
  loadPage(pagination.page + 1);
}
```

## 🎛️ Configuration Changes

### Environment Variables

Add to your `.env.local`:

```env
# API Version Configuration
DEFAULT_API_VERSION=v2
ENABLE_API_V1=true
ENABLE_API_V2=true
API_V1_SUNSET_DATE=2025-01-01
```

### Client Configuration

```typescript
// Configure default client
const apiClient = new ApiClient({
  version: 'v2',
  timeout: 30000,
  retryAttempts: 3,
  headers: {
    'User-Agent': 'BMF001-Client/2.0',
  },
});
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Field Name Mismatches

**Problem:** `Cannot read property 'products' of undefined`

**Solution:**
```typescript
// v1 (old)
const products = response.products;

// v2 (new)
const products = response.items;
```

#### 2. Pagination Calculation Errors

**Problem:** Manual pagination calculation fails

**Solution:**
```typescript
// v1 (manual calculation)
const hasNext = page < total_pages;

// v2 (provided by API)
const hasNext = pagination.hasNext;
```

#### 3. Error Handling Breaks

**Problem:** Error handling expects string, gets object

**Solution:**
```typescript
// v1 (string error)
if (response.error) {
  showError(response.error);
}

// v2 (object error)
if (response.error) {
  showError(response.error.message);
}
```

### Migration Validation

```typescript
// Validate migration success
async function validateMigration() {
  const v1Response = await v1Client.get('/products');
  const v2Response = await v2Client.get('/products');
  
  // Compare core data
  const v1Products = v1Response.data.products;
  const v2Products = v2Response.data.items;
  
  if (v1Products.length !== v2Products.length) {
    throw new Error('Product count mismatch between versions');
  }
  
  console.log('✅ Migration validation passed');
}
```

## 📅 Migration Timeline

### Phase 1: Preparation (Week 1-2)
- [ ] Review current API usage
- [ ] Identify breaking changes
- [ ] Plan migration strategy
- [ ] Set up testing environment

### Phase 2: Development (Week 3-4)
- [ ] Update API client to v2
- [ ] Modify response handling
- [ ] Update error handling
- [ ] Add new v2 features

### Phase 3: Testing (Week 5-6)
- [ ] Parallel testing with both versions
- [ ] Performance comparison
- [ ] Error handling validation
- [ ] User acceptance testing

### Phase 4: Deployment (Week 7-8)
- [ ] Gradual rollout with feature flags
- [ ] Monitor error rates and performance
- [ ] Collect user feedback
- [ ] Full migration completion

## 🔗 Additional Resources

- [API Client Documentation](/docs/api-client)
- [Error Handling Guide](/docs/error-handling)
- [Performance Best Practices](/docs/performance)
- [Security Guidelines](/docs/security)

---

## ✅ **MIGRATION COMPLETE**

Once you've completed all the steps above, your application will be using API v2 with:

- **🚀 Better Performance**: Faster response times and optimized queries
- **🛡️ Enhanced Security**: Improved validation and error handling  
- **📊 Rich Metadata**: Request tracking and performance metrics
- **🔮 Future-Ready**: Access to new features and capabilities

**Migration Status:** 🟢 **READY TO START**
