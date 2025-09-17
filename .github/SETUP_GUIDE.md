# GitHub Actions Setup Guide

This guide will help you configure the GitHub Actions workflows for your digital marketplace.

## 🚀 Quick Start

1. **Fork or clone this repository**
2. **Configure secrets in GitHub**
3. **Set up environment protection rules**
4. **Configure Vercel integration**
5. **Set up monitoring tools**

## 📋 Required Secrets

Navigate to your repository → Settings → Secrets and variables → Actions

### Core Infrastructure

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ACCESS_TOKEN=your_cli_access_token
SUPABASE_PRODUCTION_PROJECT_REF=your_prod_project_ref
SUPABASE_STAGING_PROJECT_REF=your_staging_project_ref
SUPABASE_PRODUCTION_DB_PASSWORD=your_prod_db_password
SUPABASE_STAGING_DB_PASSWORD=your_staging_db_password

# Vercel Deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id

# Payment Providers
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_public
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
YOOKASSA_SHOP_ID=your_yookassa_shop_id
YOOKASSA_SECRET_KEY=your_yookassa_secret

# Redis
REDIS_URL=redis://your-redis-instance:6379

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# Security
SNYK_TOKEN=your_snyk_token

# Deployment URLs
PRODUCTION_URL=https://your-production-domain.com
STAGING_URL=https://staging.your-domain.com
PREVIEW_URL=https://preview.your-domain.com
```

## 🛡️ Environment Protection Rules

### Production Environment

1. Go to Settings → Environments → New environment
2. Name: `production`
3. Configure protection rules:
   - ✅ Required reviewers: 2
   - ✅ Wait timer: 10 minutes
   - ✅ Required status checks:
     - `CI/CD Pipeline / quality-checks`
     - `CI/CD Pipeline / security-scan`
     - `CI/CD Pipeline / database-validation`

### Staging Environment

1. Create environment: `staging`
2. Configure protection rules:
   - ✅ Required reviewers: 1
   - ✅ Required status checks:
     - `CI/CD Pipeline / quality-checks`
     - `CI/CD Pipeline / security-scan`

### Preview Environment

1. Create environment: `preview`
2. No protection rules needed (for PR previews)

## 🔧 Tool Setup

### 1. Vercel Integration

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Get project details
vercel env ls
```

### 2. Supabase CLI Setup

```bash
# Install Supabase CLI
npm i -g supabase

# Login and get access token
supabase login
supabase projects list

# Get project references
supabase projects list --format json
```

### 3. Stripe Configuration

1. Create webhook endpoints:
   - Production: `https://your-domain.com/api/webhooks/stripe`
   - Staging: `https://staging.your-domain.com/api/webhooks/stripe`

2. Configure webhook events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### 4. Security Tools

#### Snyk Setup
```bash
# Sign up at https://snyk.io
# Get API token from Account Settings → General → Auth Token
```

#### Sentry Setup
```bash
# Create project at https://sentry.io
# Get DSN from Project Settings → Client Keys
```

## 📁 Workflow Files

The following workflows are included:

### Core Workflows

- **`ci.yml`** - Main CI/CD pipeline with testing and linting
- **`deploy.yml`** - Deployment to preview, staging, and production
- **`database.yml`** - Database migration management
- **`security.yml`** - Security vulnerability scanning
- **`smoke-tests.yml`** - Post-deployment verification
- **`rollback.yml`** - Emergency rollback mechanism

### Supporting Workflows

- **`dependency-update.yml`** - Automated dependency updates

## 🔄 Workflow Triggers

### Automatic Triggers

- **Pull Requests** → CI pipeline + preview deployment
- **Push to `develop`** → CI pipeline + staging deployment
- **Push to `main`** → CI pipeline + production deployment
- **Schedule** → Security scans (daily) + dependency updates (weekly)

### Manual Triggers

- **Database Operations** → Migration, rollback, reset
- **Rollback** → Emergency rollback to previous version
- **Smoke Tests** → Manual testing of any environment

## 🚨 Emergency Procedures

### Rollback Deployment

```bash
# Go to Actions → Rollback Mechanism → Run workflow
# Select environment and rollback type
# Provide reason for rollback
```

### Database Issues

```bash
# For database problems:
# 1. Go to Actions → Database Operations
# 2. Select appropriate action (rollback/reset)
# 3. Choose environment
# 4. Execute with proper approval
```

## 📊 Monitoring & Alerts

### Health Checks

- **Application Health**: `/api/health`
- **Database Health**: Automated in workflows
- **Redis Health**: `/api/cache/health`

### Performance Monitoring

- **Response Time**: Monitored in smoke tests
- **Load Testing**: Artillery-based performance tests
- **Bundle Analysis**: Automated bundle size checking

### Security Monitoring

- **Dependency Scanning**: Daily Snyk scans
- **Secret Detection**: TruffleHog scans
- **License Compliance**: Automated license checking
- **SAST**: Static application security testing

## 🛠️ Customization

### Adding New Environments

1. Create environment in GitHub Settings
2. Add secrets for the new environment
3. Update workflow files with new environment logic
4. Configure protection rules

### Custom Notifications

Add notification logic to workflows:

```yaml
- name: Send Slack notification
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"Deployment completed!"}' \
      ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Additional Tests

Extend the test suites by:

1. Adding test scripts to `package.json`
2. Updating workflow files to run new tests
3. Configuring test databases and services

## 🆘 Troubleshooting

### Common Issues

1. **Secrets not found**
   - Verify secrets are configured in correct environment
   - Check secret names match exactly (case-sensitive)

2. **Deployment failures**
   - Check Vercel token permissions
   - Verify project ID and org ID are correct

3. **Database migration issues**
   - Ensure Supabase CLI is properly authenticated
   - Check database connection strings

4. **Security scan failures**
   - Review Snyk token permissions
   - Check for actual vulnerabilities in dependencies

### Debug Commands

```bash
# Check workflow logs in GitHub Actions tab
# Enable debug logging by setting secret:
ACTIONS_STEP_DEBUG=true
ACTIONS_RUNNER_DEBUG=true
```

## 📞 Support

- Create an issue in this repository for workflow problems
- Check GitHub Actions documentation for platform issues
- Review individual tool documentation for service-specific problems

---

Happy deploying! 🚀
