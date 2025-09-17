# Security Implementation Guide

## Overview

This document provides a comprehensive overview of the security layers implemented in the digital marketplace platform. All security features have been designed to protect against common web vulnerabilities and attacks.

## 1. Rate Limiting (Redis-Based)

### Implementation
- **Location**: `src/lib/rate-limit.ts`
- **Middleware**: `src/middleware.ts`
- **Storage**: Redis (with memory fallback)

### Features
- Per-IP and per-user rate limiting
- Configurable time windows and request limits
- Different limits for different endpoint types
- Automatic cleanup of expired entries

### Configuration
```typescript
// Predefined configurations
rateLimitConfigs = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  api: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  // ... more configurations
}
```

### Usage in Routes
```typescript
const result = await rateLimiter.checkLimit(request, 'endpoint', config);
if (!result.success) {
  return new NextResponse('Too Many Requests', { status: 429 });
}
```

## 2. DDoS Protection with Cloudflare

### Configuration File
- **Location**: `cloudflare-config.md`
- **Setup**: Comprehensive Cloudflare rules and configurations

### Key Features
- Geographic restrictions
- Bot management and verification
- Custom firewall rules
- Rate limiting at edge level
- Under Attack Mode for emergencies

### Firewall Rules
1. **Block Known Bad IPs**: High-priority blocking of malicious sources
2. **API Rate Limiting**: Edge-level rate limiting for API endpoints
3. **Authentication Protection**: Extra protection for auth endpoints
4. **Bot Protection**: Challenge or block unverified bots
5. **Geographic Filtering**: Optional country-based restrictions

### Emergency Procedures
- Enable "Under Attack Mode" during active DDoS
- Increase security level to "High"
- Monitor real-time analytics
- Adjust rate limiting thresholds

## 3. Input Sanitization for XSS Prevention

### Implementation
- **Location**: `src/lib/security-utils.ts`
- **Library**: isomorphic-dompurify
- **Middleware**: `src/middleware/security.middleware.ts`

### Sanitization Functions
```typescript
// Basic sanitization (no HTML allowed)
sanitizeInput(input: string): string

// Rich text sanitization (limited HTML)
sanitizeRichText(input: string): string

// URL sanitization
sanitizeUrl(url: string): string

// File name sanitization
sanitizeFileName(fileName: string): string
```

### XSS Detection Patterns
- Script tags and JavaScript protocols
- Event handlers (onload, onerror, etc.)
- Object and embed tags
- Expression and eval functions

### Integration
```typescript
// Automatic sanitization in security middleware
const sanitizedData = sanitizeObjectStrings(requestBody);
```

## 4. SQL Injection Prevention

### Parameterized Queries
All database queries use Supabase's built-in parameterization:
```typescript
// Safe query example
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('id', productId)  // Automatically parameterized
  .eq('shop_id', shopId);
```

### Input Validation
- UUID format validation for all ID parameters
- Zod schemas for all request data
- Database identifier validation

### SQL Injection Detection
The security middleware detects common SQL injection patterns:
- UNION SELECT statements
- DROP/DELETE/INSERT attempts
- Boolean-based injections (1=1, OR/AND conditions)
- Comment-based injections

## 5. CORS Configuration

### Next.js Configuration
- **Location**: `next.config.ts`
- **Headers**: Configured for API routes
- **Origins**: Environment-based allowlist

### Settings
```typescript
headers: [
  {
    key: 'Access-Control-Allow-Origin',
    value: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS 
      : '*'
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'Content-Type, Authorization, X-API-Key, X-Requested-With'
  }
]
```

### Security Validation
- Origin header validation in security middleware
- CSRF protection for state-changing requests
- Preflight request handling

## 6. Content Security Policy (CSP) Headers

### Implementation
- **Location**: `src/middleware.ts` (addSecurityHeaders function)
- **Enforcement**: Strict CSP with specific allowlists

### CSP Directives
```csp
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https: blob:;
connect-src 'self' https://api.stripe.com https://*.supabase.co;
frame-src https://js.stripe.com https://checkout.stripe.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

### Additional Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security` (production only)

## 7. API Key Management for Partners

### Database Schema
- **Location**: `supabase/migrations/20241201000010_security_features.sql`
- **Tables**: api_keys, api_key_usage, security_events

### API Key Features
- Secure key generation with cryptographic randomness
- SHA-256 hashing for storage
- Permission-based access control
- Usage tracking and analytics
- Expiration dates
- Rate limiting per key

### Permissions System
```typescript
API_PERMISSIONS = {
  'products:read': 'Read product information',
  'products:create': 'Create new products',
  'shops:read': 'Read shop information',
  'analytics:read': 'Read analytics data',
  'admin:*': 'Full administrative access',
  '*': 'Full access to all resources'
}
```

### API Endpoints
- `POST /api/partner/api-keys` - Create new API key
- `GET /api/partner/api-keys` - List user's API keys
- `GET /api/partner/api-keys/[id]` - Get usage statistics
- `PATCH /api/partner/api-keys/[id]` - Update permissions
- `DELETE /api/partner/api-keys/[id]` - Revoke API key

### Usage Tracking
```typescript
// Automatic logging of API usage
{
  api_key_id: string,
  endpoint: string,
  method: string,
  ip_address: string,
  response_status: number,
  response_time_ms: number
}
```

## 8. Enhanced Security Middleware

### Security Middleware
- **Location**: `src/middleware/security.middleware.ts`
- **Features**: Multi-layer protection with configurable rules

### Protection Layers
1. **HTTP Method Validation**
2. **Origin Validation (CORS)**
3. **User-Agent Analysis**
4. **Request Size Limits**
5. **XSS Detection**
6. **SQL Injection Detection**
7. **Path Traversal Protection**
8. **Header Validation**

### Configuration Options
```typescript
SecurityConfig = {
  enableXssProtection: boolean,
  enableSqlInjectionProtection: boolean,
  enableCsrfProtection: boolean,
  maxRequestSize: number,
  allowedMethods: string[],
  allowedOrigins: string[],
  blockSuspiciousUserAgents: boolean
}
```

## 9. Database Security

### Row Level Security (RLS)
All security-related tables have RLS enabled:
- Users can only access their own API keys
- Admin users have elevated privileges
- Audit trail for all security events

### Security Functions
```sql
-- Check if IP is blacklisted
is_ip_blacklisted(ip_addr text) RETURNS boolean

-- Log security events
log_security_event(event_type, ip, user_id, ...) RETURNS uuid

-- Clean up old data
cleanup_security_data() RETURNS void

-- Get API key statistics
get_api_key_stats(key_id uuid) RETURNS jsonb
```

### Audit Tables
- `security_events` - All security incidents
- `login_attempts` - Failed/successful login tracking
- `api_key_usage` - API usage monitoring
- `ip_blacklist` - Blocked IP addresses

## 10. Monitoring and Alerting

### Security Event Logging
All security events are logged with:
- Event type and severity
- IP address and user agent
- User ID (if authenticated)
- Endpoint and method
- Additional details (JSON)
- Whether the request was blocked

### Alert Conditions
- Multiple failed login attempts
- Rate limit violations
- XSS/SQL injection attempts
- Suspicious user agent patterns
- Geographic anomalies
- Unusual API usage patterns

### Log Analysis
```typescript
// Example security event
{
  event_type: 'rate_limit_exceeded',
  ip_address: '192.168.1.1',
  user_id: 'uuid',
  severity: 'medium',
  details: {
    endpoint: '/api/auth/login',
    limit: 5,
    attempts: 10
  },
  blocked: true
}
```

## 11. Environment Variables

### Required Security Variables
```bash
# Rate limiting
REDIS_URL=redis://localhost:6379

# Cloudflare integration
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token

# CORS configuration
ALLOWED_ORIGINS=https://yourdomain.com

# Security features
ENABLE_CLOUDFLARE_PROTECTION=true
CLOUDFLARE_BYPASS_SECRET=random_secret

# Database
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 12. Testing Security Features

### Rate Limiting Tests
```bash
# Test API rate limiting
for i in {1..20}; do
  curl -X GET "https://yourdomain.com/api/products"
done

# Test authentication rate limiting
for i in {1..10}; do
  curl -X POST "https://yourdomain.com/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

### Security Headers Test
```bash
# Check security headers
curl -I "https://yourdomain.com/"

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
```

### XSS Protection Test
```bash
# Test XSS detection
curl -X GET "https://yourdomain.com/api/products?search=<script>alert('xss')</script>"
# Should return 400 Bad Request
```

## 13. Performance Considerations

### Rate Limiting
- Redis provides fast lookups (< 1ms)
- Memory fallback for development
- Sliding window algorithm for accuracy
- Automatic cleanup prevents memory bloat

### Security Middleware
- Early termination on security violations
- Minimal overhead for legitimate requests
- Configurable protection levels
- Efficient pattern matching

### Database Queries
- Indexed security tables for fast lookups
- Parameterized queries prevent injection
- Batch operations for bulk data
- Regular cleanup procedures

## 14. Maintenance and Updates

### Regular Tasks
- Review security logs weekly
- Update firewall rules monthly
- Rotate API keys quarterly
- Update dependency versions
- Monitor for new vulnerabilities

### Security Patches
- Monitor security advisories
- Test patches in staging environment
- Deploy security updates promptly
- Document all security changes

### Compliance
- Regular security audits
- Penetration testing
- Vulnerability assessments
- Security awareness training

## 15. Incident Response

### Security Incident Procedure
1. **Detection**: Automated alerts and monitoring
2. **Assessment**: Determine severity and impact
3. **Containment**: Block threats, enable protections
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update procedures and defenses

### Emergency Contacts
- Security team lead
- Infrastructure team
- Legal/compliance team
- External security consultants

This comprehensive security implementation provides multiple layers of protection against common web vulnerabilities and sophisticated attacks while maintaining good performance and user experience.
