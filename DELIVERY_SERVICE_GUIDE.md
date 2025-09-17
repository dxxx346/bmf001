# File Delivery Service Guide

## Overview

The File Delivery Service is a comprehensive solution for secure file delivery in the digital marketplace. It provides secure temporary URLs, download tracking, CDN integration, zip generation, license key management, watermarking, and bandwidth monitoring.

## Features

### 🔐 Secure Temporary URLs
- Generate secure, time-limited download URLs (default 24 hours)
- URL signature verification for security
- Configurable expiration times (1-72 hours)
- Automatic cleanup of expired sessions

### 📊 Download Tracking & Limits
- Track download counts per session
- Set maximum download limits per user
- Monitor download patterns and analytics
- Prevent abuse with rate limiting

### 🌐 CDN Integration
- Support for multiple CDN providers (Cloudflare, AWS, Supabase)
- Automatic file caching for better performance
- Configurable CDN endpoints and regions
- Fallback to direct storage access

### 📦 Zip Generation
- Create zip files for multiple products
- Configurable compression levels
- Watermarking support for zip contents
- Temporary zip file cleanup

### 🔑 License Key Generation
- Generate unique license keys for software products
- Configurable key formats and lengths
- Checksum validation
- Expiration date support

### 🎨 Document Watermarking
- Add watermarks to downloaded files
- Configurable watermark position and style
- Support for text and image watermarks
- Multiple file format support

### 📈 Bandwidth Monitoring
- Track bandwidth usage per user
- Monthly bandwidth limits
- Usage analytics and reporting
- Automatic limit enforcement

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes     │    │  Delivery       │
│   Components    │◄──►│   /api/delivery  │◄──►│  Service        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Supabase      │    │      Redis       │    │   CDN Storage   │
│   Storage       │◄───┤   (Caching)      │◄───┤   (Optional)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Database Schema

### Core Tables

#### `download_sessions`
Stores active download sessions with expiration and limits.

```sql
CREATE TABLE download_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  file_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  license_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_download_at TIMESTAMP WITH TIME ZONE
);
```

#### `bandwidth_usage`
Tracks monthly bandwidth usage per user.

```sql
CREATE TABLE bandwidth_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  period TEXT NOT NULL, -- YYYY-MM format
  bytes_used BIGINT DEFAULT 0,
  limit_bytes BIGINT DEFAULT 10737418240, -- 10GB
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period)
);
```

#### `license_keys`
Stores generated license keys for software products.

```sql
CREATE TABLE license_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES products(id),
  user_id UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### Generate Download URL
```http
POST /api/delivery
Content-Type: application/json

{
  "productId": "uuid",
  "options": {
    "expiresIn": 24,
    "maxDownloads": 5,
    "watermark": true,
    "licenseKey": true,
    "cdnEnabled": true
  }
}
```

### Process Download
```http
GET /api/delivery/download/{sessionId}?sig={signature}
```

### Generate Zip File
```http
POST /api/delivery/download/zip
Content-Type: application/json

{
  "productIds": ["uuid1", "uuid2"],
  "options": {
    "expiresIn": 24,
    "maxDownloads": 3,
    "watermark": true
  }
}
```

### Get Bandwidth Usage
```http
GET /api/delivery?action=bandwidth
```

## Usage Examples

### Basic Download
```typescript
import { useDelivery } from '@/hooks/useDelivery';

function ProductPage({ productId }: { productId: string }) {
  const { generateDownloadUrl, loading, error } = useDelivery();

  const handleDownload = async () => {
    try {
      const result = await generateDownloadUrl(productId, {
        expiresIn: 24,
        maxDownloads: 5,
        watermark: true,
        licenseKey: true
      });
      
      window.open(result.url, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <button onClick={handleDownload} disabled={loading}>
      {loading ? 'Generating...' : 'Download'}
    </button>
  );
}
```

### Bulk Download
```typescript
import { useDelivery } from '@/hooks/useDelivery';

function CartPage({ productIds }: { productIds: string[] }) {
  const { generateZipFile, loading } = useDelivery();

  const handleBulkDownload = async () => {
    try {
      const result = await generateZipFile(productIds, {
        expiresIn: 24,
        maxDownloads: 3,
        zipFiles: true,
        watermark: true
      });
      
      window.open(result.zipUrl, '_blank');
    } catch (err) {
      console.error('Bulk download failed:', err);
    }
  };

  return (
    <button onClick={handleBulkDownload} disabled={loading}>
      Download All as ZIP
    </button>
  );
}
```

### Bandwidth Monitoring
```typescript
import { useBandwidthMonitor } from '@/hooks/useDelivery';

function BandwidthWidget() {
  const { 
    bandwidthUsage, 
    getUsagePercentage, 
    getFormattedUsage,
    isNearLimit,
    isOverLimit 
  } = useBandwidthMonitor();

  if (!bandwidthUsage) return null;

  return (
    <div className="bandwidth-widget">
      <h3>Bandwidth Usage</h3>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${getUsagePercentage()}%` }}
        />
      </div>
      <p>
        {getFormattedUsage().used} / {getFormattedUsage().limit}
      </p>
      {isNearLimit(80) && (
        <p className="warning">Approaching bandwidth limit</p>
      )}
      {isOverLimit() && (
        <p className="error">Bandwidth limit exceeded</p>
      )}
    </div>
  );
}
```

## Configuration

### Environment Variables

```env
# Delivery Service
DELIVERY_SECRET=your-secret-key-for-url-signing
NEXT_PUBLIC_APP_URL=https://your-domain.com

# CDN Configuration (Optional)
CDN_PROVIDER=cloudflare
CDN_ENDPOINT=https://your-cdn.com
CDN_API_KEY=your-cdn-api-key
CDN_REGION=us-east-1

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

### CDN Setup

#### Cloudflare
```typescript
const cdnConfig = {
  provider: 'cloudflare',
  endpoint: 'https://your-domain.com',
  apiKey: 'your-api-key',
  region: 'global'
};
```

#### AWS CloudFront
```typescript
const cdnConfig = {
  provider: 'aws',
  endpoint: 'https://d1234567890.cloudfront.net',
  apiKey: 'your-access-key',
  region: 'us-east-1'
};
```

## Security Features

### URL Signing
- All download URLs are signed with HMAC-SHA256
- Signature includes session ID and timestamp
- Automatic signature verification on download

### Access Control
- Row Level Security (RLS) policies
- User can only access their own downloads
- Product ownership verification

### Rate Limiting
- Download count limits per session
- Bandwidth limits per user per month
- Automatic cleanup of expired sessions

## Monitoring & Analytics

### Delivery Logs
All delivery events are logged for analytics:
- Download session creation
- Download processing
- Bandwidth usage
- Error tracking

### Analytics Queries
```sql
-- Top downloaded products
SELECT 
  p.title,
  COUNT(dl.id) as download_count
FROM delivery_logs dl
JOIN products p ON dl.product_id = p.id
WHERE dl.event = 'download_processed'
  AND dl.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.title
ORDER BY download_count DESC;

-- User bandwidth usage
SELECT 
  u.email,
  bu.bytes_used,
  bu.limit_bytes,
  ROUND((bu.bytes_used::DECIMAL / bu.limit_bytes::DECIMAL) * 100, 2) as usage_percentage
FROM bandwidth_usage bu
JOIN users u ON bu.user_id = u.id
WHERE bu.period = '2024-01'
ORDER BY bu.bytes_used DESC;
```

## Maintenance

### Cleanup Tasks
```typescript
// Clean up expired sessions (run daily)
await deliveryService.cleanupExpiredSessions();

// Clean up old delivery logs (run weekly)
await supabase.rpc('cleanup_old_delivery_logs');
```

### Monitoring Queries
```sql
-- Check for users near bandwidth limit
SELECT 
  u.email,
  bu.bytes_used,
  bu.limit_bytes,
  ROUND((bu.bytes_used::DECIMAL / bu.limit_bytes::DECIMAL) * 100, 2) as usage_percentage
FROM bandwidth_usage bu
JOIN users u ON bu.user_id = u.id
WHERE bu.period = TO_CHAR(NOW(), 'YYYY-MM')
  AND (bu.bytes_used::DECIMAL / bu.limit_bytes::DECIMAL) > 0.8;

-- Check active download sessions
SELECT COUNT(*) as active_sessions
FROM download_sessions
WHERE expires_at > NOW();
```

## Error Handling

### Common Errors
- `Product not purchased`: User doesn't own the product
- `Download session expired`: URL has expired
- `Download limit exceeded`: User exceeded max downloads
- `Bandwidth limit exceeded`: User exceeded monthly limit
- `File not found`: Product file missing from storage

### Error Recovery
- Automatic retry for transient errors
- Graceful degradation when CDN is unavailable
- Fallback to direct storage access
- User-friendly error messages

## Performance Optimization

### Caching Strategy
- Redis caching for download sessions
- CDN caching for frequently accessed files
- Database query optimization with proper indexes

### File Optimization
- Lazy loading of large files
- Streaming for large downloads
- Compression for zip files
- Progressive download for videos

## Testing

### Unit Tests
```typescript
describe('DeliveryService', () => {
  it('should generate secure download URL', async () => {
    const result = await deliveryService.generateDownloadUrl(
      'user-id',
      'product-id',
      { expiresIn: 24 }
    );
    
    expect(result.url).toContain('sig=');
    expect(result.expiresAt).toBeInstanceOf(Date);
  });
});
```

### Integration Tests
```typescript
describe('Download API', () => {
  it('should process download request', async () => {
    const response = await request(app)
      .get('/api/delivery/download/session-id?sig=signature')
      .expect(200);
    
    expect(response.headers['content-type']).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

1. **Downloads not working**
   - Check Redis connection
   - Verify Supabase storage permissions
   - Check URL signature validity

2. **CDN not serving files**
   - Verify CDN configuration
   - Check file caching status
   - Test direct storage access

3. **Bandwidth limits not enforced**
   - Check Redis connection
   - Verify bandwidth tracking queries
   - Check cleanup job execution

4. **License keys not generating**
   - Check database permissions
   - Verify license key table exists
   - Check key uniqueness constraints

### Debug Mode
Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

This will provide detailed logs for troubleshooting delivery issues.

## Future Enhancements

### Planned Features
- [ ] Video streaming for large files
- [ ] Advanced watermarking with images
- [ ] Download analytics dashboard
- [ ] Custom download pages
- [ ] API rate limiting
- [ ] Webhook notifications
- [ ] Download resumption
- [ ] File preview generation

### Performance Improvements
- [ ] Edge computing integration
- [ ] Advanced caching strategies
- [ ] Database sharding
- [ ] Microservice architecture
- [ ] Real-time monitoring
