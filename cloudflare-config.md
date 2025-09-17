# Cloudflare DDoS Protection Configuration

This document outlines the recommended Cloudflare configuration for protecting your digital marketplace from DDoS attacks and other security threats.

## 1. DNS & Proxy Settings

### DNS Records
```
Type    Name              Value                   Proxy Status
A       @                 YOUR_SERVER_IP          Proxied (Orange Cloud)
A       www               YOUR_SERVER_IP          Proxied (Orange Cloud)
A       api               YOUR_SERVER_IP          Proxied (Orange Cloud)
CNAME   cdn               cdn.yourdomain.com      Proxied (Orange Cloud)
```

### Proxy Settings
- **Proxy Status**: Enable for all public-facing subdomains
- **Development Mode**: Disable in production
- **Under Attack Mode**: Enable during active DDoS attacks

## 2. Security Settings

### SSL/TLS Configuration
```
SSL/TLS Mode: Full (Strict)
Always Use HTTPS: On
HSTS Settings:
  - Enable HSTS: On
  - Max Age: 12 months
  - Include subdomains: On
  - Preload: On
  - No-Sniff header: On
```

### Security Level
```
Security Level: High
Challenge Passage: 30 minutes
Browser Integrity Check: On
```

## 3. Firewall Rules

### High-Priority Rules (Order: 1-5)

#### 1. Block Known Bad IPs
```javascript
// Rule 1: Block known malicious IPs
(ip.src in $blocked_ips)
Action: Block
```

#### 2. Rate Limiting for API Endpoints
```javascript
// Rule 2: API Rate Limiting
(http.request.uri.path matches "^/api/") and 
(rate("10r/1m", keys(cf.connecting_ip)))
Action: Challenge (Managed Challenge)
```

#### 3. Authentication Endpoint Protection
```javascript
// Rule 3: Protect authentication endpoints
(http.request.uri.path matches "^/api/auth/") and 
(rate("5r/5m", keys(cf.connecting_ip)))
Action: Block
```

#### 4. Bot Protection
```javascript
// Rule 4: Block obvious bots
(cf.bot_management.score < 30) and 
not (cf.bot_management.verified_bot)
Action: Block
```

#### 5. Geographic Restrictions (Optional)
```javascript
// Rule 5: Block specific countries (if needed)
(ip.geoip.country in {"CN" "RU" "KP"}) and 
not (cf.bot_management.verified_bot)
Action: Challenge (Managed Challenge)
```

### Medium-Priority Rules (Order: 6-10)

#### 6. File Upload Protection
```javascript
// Rule 6: Protect file upload endpoints
(http.request.uri.path matches "^/api/products/") and 
(http.request.method eq "POST") and 
(rate("3r/1m", keys(cf.connecting_ip)))
Action: Challenge (JS Challenge)
```

#### 7. Admin Area Protection
```javascript
// Rule 7: Extra protection for admin areas
(http.request.uri.path matches "^/admin/") and 
(rate("10r/1m", keys(cf.connecting_ip)))
Action: Challenge (Managed Challenge)
```

#### 8. Suspicious User Agent Blocking
```javascript
// Rule 8: Block suspicious user agents
(http.user_agent contains "bot" or 
 http.user_agent contains "crawler" or 
 http.user_agent contains "spider") and 
not (cf.bot_management.verified_bot)
Action: Challenge (Managed Challenge)
```

## 4. Rate Limiting Rules

### Global Rate Limiting
```javascript
// Global rate limit per IP
Rule: All traffic
Threshold: 100 requests per 1 minute
Period: 1 minute
Action: Simulate (then change to Block after testing)
```

### API-Specific Rate Limiting
```javascript
// API rate limiting
Match: http.request.uri.path matches "^/api/"
Threshold: 30 requests per 1 minute
Period: 1 minute
Action: Block
Duration: 10 minutes
```

### Authentication Rate Limiting
```javascript
// Authentication endpoints
Match: http.request.uri.path matches "^/api/auth/"
Threshold: 5 requests per 5 minutes
Period: 5 minutes
Action: Block
Duration: 15 minutes
```

## 5. Bot Management

### Bot Fight Mode
```
Bot Fight Mode: On
Challenge passage: 30 minutes
```

### Verified Bots
- Allow Google Bot
- Allow Bing Bot
- Allow legitimate crawlers
- Block unknown bots

### Bot Score Settings
```javascript
// Custom rule for bot management
(cf.bot_management.score < 30) and 
not (cf.bot_management.verified_bot) and 
not (ip.src in $allowlist)
Action: Block
```

## 6. Page Rules

### Cache Settings
```
Pattern: api.yourdomain.com/*
Settings:
  - Cache Level: Bypass
  - Security Level: High
  - Browser Integrity Check: On
```

### Static Assets
```
Pattern: yourdomain.com/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month
```

### Admin Area
```
Pattern: yourdomain.com/admin/*
Settings:
  - Security Level: High
  - Cache Level: Bypass
  - Always Use HTTPS: On
```

## 7. Custom Rules for Enhanced Security

### SQL Injection Protection
```javascript
// Block common SQL injection patterns
(http.request.uri.query contains "union select" or
 http.request.uri.query contains "drop table" or
 http.request.uri.query contains "1=1" or
 http.request.body contains "union select")
Action: Block
```

### XSS Protection
```javascript
// Block XSS attempts
(http.request.uri.query contains "<script" or
 http.request.uri.query contains "javascript:" or
 http.request.body contains "<script" or
 http.request.body contains "javascript:")
Action: Block
```

### Path Traversal Protection
```javascript
// Block path traversal attempts
(http.request.uri.path contains "../" or
 http.request.uri.path contains "..%2f" or
 http.request.uri.path contains "..\\")
Action: Block
```

## 8. DDoS Protection Settings

### Under Attack Mode
When experiencing a DDoS attack:
1. Enable "Under Attack Mode" in Security settings
2. This adds a 5-second browser challenge
3. Monitor attack patterns in Analytics

### Custom DDoS Rules
```javascript
// Large request protection
(http.request.body.size > 10485760) // 10MB
Action: Block

// Excessive header protection
(len(http.request.headers) > 50)
Action: Block
```

## 9. Analytics & Monitoring

### Security Analytics
- Monitor blocked requests
- Track attack patterns
- Review bot traffic
- Analyze geographic threats

### Alerts Setup
- High volume of blocked requests
- Spike in challenge responses
- Geographic anomalies
- New threat patterns

## 10. Emergency Procedures

### During an Active Attack
1. Enable "Under Attack Mode"
2. Increase security level to "High"
3. Review and adjust rate limiting
4. Block specific countries if needed
5. Monitor real-time analytics

### Post-Attack Analysis
1. Review security events
2. Update firewall rules
3. Adjust rate limiting thresholds
4. Update IP blocklists

## 11. Integration with Your Application

### Environment Variables
Add these to your `.env.local`:
```bash
# Cloudflare integration
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_EMAIL=your_email

# Security settings
ENABLE_CLOUDFLARE_PROTECTION=true
CLOUDFLARE_BYPASS_SECRET=your_secret_key
```

### Code Integration
```typescript
// Check Cloudflare headers in your middleware
function isCloudflareRequest(request: NextRequest): boolean {
  return request.headers.get('cf-ray') !== null;
}

function getClientIP(request: NextRequest): string {
  // Cloudflare provides the real IP in cf-connecting-ip
  return request.headers.get('cf-connecting-ip') || 
         request.headers.get('x-forwarded-for') || 
         'unknown';
}
```

## 12. Testing Configuration

### Test Commands
```bash
# Test rate limiting
curl -X GET "https://yourdomain.com/api/test" \
  -H "User-Agent: TestBot" \
  -v

# Test multiple requests
for i in {1..10}; do
  curl -X GET "https://yourdomain.com/api/auth/login"
done

# Test bot detection
curl -X GET "https://yourdomain.com/" \
  -H "User-Agent: BadBot/1.0" \
  -v
```

### Validation Checklist
- [ ] SSL/TLS is properly configured
- [ ] Rate limiting works as expected
- [ ] Bot protection is active
- [ ] Firewall rules are effective
- [ ] Analytics are being collected
- [ ] Emergency procedures are documented

## 13. Maintenance

### Regular Tasks
- Review security analytics weekly
- Update firewall rules monthly
- Test emergency procedures quarterly
- Review and update IP blocklists

### Performance Monitoring
- Monitor cache hit rates
- Track response times
- Review bandwidth usage
- Analyze threat patterns

This configuration provides comprehensive protection against DDoS attacks, bot traffic, and various security threats while maintaining good performance for legitimate users.
