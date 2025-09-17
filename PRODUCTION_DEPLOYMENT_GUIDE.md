# BMF001 Production Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Variables Setup](#environment-variables-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Database Setup](#database-setup)
5. [CDN Configuration](#cdn-configuration)
6. [SSL Certificates](#ssl-certificates)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Backup Verification](#backup-verification)
9. [Security Checklist](#security-checklist)
10. [Post-Deployment Testing](#post-deployment-testing)
11. [Rollback Procedures](#rollback-procedures)

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript checks pass (`npm run type-check`)
- [ ] Security audit passes (`npm audit`)
- [ ] Performance benchmarks meet targets
- [ ] Code review completed and approved

### Environment Setup
- [ ] Production environment variables configured
- [ ] Database migrations tested
- [ ] Backup systems verified
- [ ] SSL certificates valid
- [ ] CDN configuration ready
- [ ] Monitoring systems configured

### Documentation
- [ ] API documentation updated
- [ ] Deployment runbook reviewed
- [ ] Disaster recovery plan current
- [ ] On-call rotation scheduled
- [ ] Change log updated

## Environment Variables Setup

### 1. Vercel Environment Variables

Access your Vercel dashboard and configure the following environment variables for production:

#### Core Application
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="BMF001 Digital Marketplace"
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_VERSION=1.0.0
```

#### Database & Storage
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
```

#### Payment Systems
```bash
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
YOOKASSA_SHOP_ID=your-shop-id
YOOKASSA_SECRET_KEY=your-secret-key
```

#### Monitoring & Security
```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_AUTH_TOKEN=your-auth-token
JWT_SECRET=your-64-char-jwt-secret
ENCRYPTION_KEY=your-32-char-encryption-key
```

#### Redis & Caching
```bash
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true
```

#### External Services
```bash
CLOUDFLARE_API_TOKEN=your-cloudflare-token
CLOUDFLARE_ZONE_ID=your-zone-id
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=your-backup-bucket
```

#### Alerting & On-Call
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_API_KEY=your-pagerduty-key
```

### 2. Environment Variable Validation

Run the environment validation script:

```bash
npm run env:validate
```

Expected output:
```
✅ All required environment variables are set
✅ Database connection successful
✅ Redis connection successful
✅ External services accessible
```

## Vercel Deployment

### 1. Initial Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
vercel link
```

### 2. Production Deployment

```bash
# Deploy to production
vercel --prod

# Or use the alias
npm run deploy:prod
```

### 3. Custom Domain Setup

1. Add your domain in Vercel dashboard
2. Configure DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.19.19
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### 4. Deployment Configuration

Create or update `vercel.json`:

```json
{
  "version": 2,
  "build": {
    "env": {
      "ENABLE_EXPERIMENTAL_COREPACK": "1"
    }
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1", "sfo1"],
  "github": {
    "autoAlias": false
  }
}
```

## Database Setup

### 1. Supabase Configuration

1. **Create Production Project**
   ```bash
   # Using Supabase CLI
   supabase projects create bmf001-prod --plan pro
   ```

2. **Run Migrations**
   ```bash
   # Set production database URL
   export DATABASE_URL="postgresql://..."
   
   # Run migrations
   npm run db:migrate
   ```

3. **Setup Connection Pooling**
   - Enable connection pooling in Supabase dashboard
   - Set pool size to 20-30 connections
   - Configure timeout settings

### 2. Database Security

1. **Row Level Security (RLS)**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
   -- ... for all tables
   ```

2. **Create Security Policies**
   ```sql
   -- Example: Users can only see their own data
   CREATE POLICY "Users can view own profile" ON users
     FOR SELECT USING (auth.uid() = id);
   ```

### 3. Performance Optimization

1. **Create Indexes**
   ```sql
   CREATE INDEX CONCURRENTLY idx_products_category ON products(category_id);
   CREATE INDEX CONCURRENTLY idx_purchases_user ON purchases(buyer_id);
   CREATE INDEX CONCURRENTLY idx_products_search ON products USING GIN(to_tsvector('english', title || ' ' || description));
   ```

2. **Configure Auto-scaling**
   - Enable read replicas
   - Set up automatic failover
   - Configure backup schedules

## CDN Configuration

### 1. Cloudflare Setup

1. **Add Domain to Cloudflare**
   - Sign up for Cloudflare Business plan
   - Add your domain
   - Update nameservers

2. **SSL Configuration**
   ```bash
   # Enable Full SSL (strict)
   # Configure HSTS
   # Enable automatic HTTPS rewrites
   ```

3. **Caching Rules**
   ```javascript
   // Static assets: Cache for 1 year
   Cache-Control: public, max-age=31536000, immutable
   
   // API responses: Cache for 5 minutes
   Cache-Control: public, max-age=300, s-maxage=300
   
   // Dynamic content: No cache
   Cache-Control: no-cache, no-store, must-revalidate
   ```

### 2. Performance Optimization

1. **Enable Cloudflare Features**
   - Brotli compression
   - Image optimization
   - Minification (HTML, CSS, JS)
   - HTTP/3 support

2. **Configure Page Rules**
   ```
   yourdomain.com/images/*
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   
   yourdomain.com/api/*
   - Cache Level: Bypass
   ```

## SSL Certificates

### 1. Automatic SSL (Recommended)

Cloudflare and Vercel handle SSL automatically:

- Cloudflare: Universal SSL certificate
- Vercel: Automatic SSL for custom domains
- Auto-renewal: Handled by providers

### 2. Certificate Monitoring

Set up monitoring for certificate expiry:

```bash
# Check certificate status
npm run ssl:check

# Monitor certificate expiry
npm run ssl:monitor
```

### 3. Security Headers

Verify security headers are properly set:

```bash
curl -I https://yourdomain.com
```

Expected headers:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

## Monitoring & Alerting

### 1. Sentry Setup

1. **Install Sentry**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Configure Sentry**
   Create `sentry.client.config.js`:
   ```javascript
   import * as Sentry from '@sentry/nextjs';
   
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     tracesSampleRate: 0.1,
     environment: process.env.NODE_ENV,
   });
   ```

### 2. Health Monitoring

1. **Setup Health Checks**
   ```bash
   # Test health endpoints
   curl https://yourdomain.com/api/health
   curl https://yourdomain.com/api/health/db
   curl https://yourdomain.com/api/health/cache
   ```

2. **Configure Uptime Monitoring**
   - Use Pingdom, UptimeRobot, or similar
   - Monitor from multiple locations
   - Set alert thresholds (5-minute downtime)

### 3. Performance Monitoring

1. **Core Web Vitals**
   ```javascript
   // In _app.tsx
   export function reportWebVitals(metric) {
     if (metric.label === 'web-vital') {
       console.log(metric);
       // Send to analytics service
     }
   }
   ```

2. **Application Metrics**
   ```bash
   # Monitor key metrics
   - Response times
   - Error rates
   - Database performance
   - Cache hit rates
   ```

## Backup Verification

### 1. Test Backup System

```bash
# Test database backup
npm run backup:test

# Verify backup integrity
npm run backup:verify

# Test restore procedure
npm run backup:restore --dry-run
```

### 2. Backup Schedule

Verify automated backups are configured:

- **Database**: Every 6 hours
- **Files**: Daily incremental, weekly full
- **Configuration**: After each deployment

### 3. Cross-Region Replication

Ensure backups are replicated to multiple regions:

- Primary: us-east-1
- Secondary: us-west-2
- Tertiary: eu-west-1

## Security Checklist

### 1. Authentication & Authorization

- [ ] JWT secrets are secure and rotated
- [ ] API keys are environment-specific
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Input validation is comprehensive

### 2. Data Protection

- [ ] Encryption at rest enabled
- [ ] Encryption in transit (TLS 1.3)
- [ ] Sensitive data is not logged
- [ ] GDPR compliance implemented
- [ ] Data retention policies active

### 3. Infrastructure Security

- [ ] Security headers configured
- [ ] DDoS protection enabled
- [ ] Firewall rules applied
- [ ] VPN access for admin functions
- [ ] Multi-factor authentication required

### 4. Security Monitoring

- [ ] Security alerts configured
- [ ] Access logs monitored
- [ ] Suspicious activity detection
- [ ] Vulnerability scanning scheduled
- [ ] Penetration testing planned

## Post-Deployment Testing

### 1. Smoke Tests

```bash
# Run automated smoke tests
npm run test:smoke

# Manual verification checklist
```

### 2. Critical User Journeys

Test the following flows:

1. **User Registration & Login**
   ```bash
   curl -X POST https://yourdomain.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

2. **Product Purchase Flow**
   - Browse products
   - Add to cart
   - Checkout process
   - Payment processing
   - File delivery

3. **Seller Operations**
   - Product upload
   - Sales analytics
   - Payout processing

### 3. Performance Testing

```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://yourdomain.com/

# Monitor response times
# Check resource usage
# Verify auto-scaling
```

### 4. Security Testing

```bash
# SSL Labs test
# OWASP security scan
# Vulnerability assessment
```

## Rollback Procedures

### 1. Immediate Rollback (Vercel)

```bash
# List recent deployments
vercel list

# Rollback to previous deployment
vercel rollback [deployment-url] --prod
```

### 2. Database Rollback

```bash
# If database migration fails
npm run db:rollback

# Restore from backup if needed
npm run backup:restore --path="backup-path"
```

### 3. Configuration Rollback

```bash
# Revert environment variables
# Update DNS if needed
# Clear CDN cache
```

### 4. Rollback Decision Matrix

| Issue Type | Rollback Method | Timeline |
|------------|----------------|----------|
| Frontend Bug | Vercel rollback | 2 minutes |
| API Error | Vercel rollback | 2 minutes |
| Database Issue | Database rollback | 10 minutes |
| Performance | CDN cache clear | 5 minutes |
| Security | Immediate shutdown | 30 seconds |

## Post-Deployment Monitoring

### 1. First 24 Hours

Monitor closely for:
- Error rates
- Performance metrics
- User complaints
- Payment processing
- File delivery

### 2. Weekly Review

- Review metrics and alerts
- Check backup integrity
- Update documentation
- Plan next deployment

### 3. Monthly Operations

- Security audit
- Performance optimization
- Capacity planning
- Disaster recovery testing

---

## Quick Reference Commands

```bash
# Deployment
npm run deploy:prod

# Health checks
npm run health:check

# Backup operations
npm run backup:create
npm run backup:list
npm run backup:restore

# SSL monitoring
npm run ssl:check

# Environment validation
npm run env:validate

# Rollback
vercel rollback [deployment-url] --prod
```

## Emergency Contacts

- **On-Call Engineer**: +1-555-0101
- **Technical Lead**: +1-555-0102
- **DevOps Manager**: +1-555-0103
- **Emergency Escalation**: +1-555-0104

## Support Resources

- **Status Page**: https://status.bmf001.com
- **Documentation**: https://docs.bmf001.com
- **Support Email**: support@bmf001.com
- **Slack Channel**: #production-support

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: February 2025  
**Owner**: DevOps Team
