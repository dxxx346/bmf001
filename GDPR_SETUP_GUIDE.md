# GDPR Compliance Setup Guide

## 🚀 Quick Start

### 1. Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```bash
# REQUIRED: Master encryption key for GDPR data encryption
# Generate with: openssl rand -hex 32
MASTER_ENCRYPTION_KEY=your_64_character_hex_encryption_key_here

# Database Configuration
DATABASE_URL=your_supabase_database_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis Configuration (for caching and sessions)
REDIS_URL=your_redis_connection_string

# Authentication Providers (for OAuth)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

# Payment Providers
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# GDPR Settings
GDPR_DATA_RETENTION_DEFAULT=2_years
GDPR_EXPORT_FILE_EXPIRY_DAYS=7
GDPR_DELETION_GRACE_PERIOD_DAYS=30

# Legal Information
COMPANY_NAME=Your Company Name
DPO_EMAIL=dpo@yourcompany.com
PRIVACY_CONTACT_EMAIL=privacy@yourcompany.com

# Terms and Privacy Policy Versions
CURRENT_TERMS_VERSION=1.0
CURRENT_PRIVACY_POLICY_VERSION=1.0
```

### 2. Generate Master Encryption Key

**Important**: Generate a secure 256-bit encryption key:

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Database Migration

Run the GDPR compliance migration:

```bash
# Apply the GDPR migration
npm run db:migrate

# Or manually using Supabase CLI
supabase migration up --file 20241201000010_gdpr_compliance.sql
```

### 4. Supabase Storage Setup

Create the required storage buckets:

```sql
-- Create exports bucket for data export files
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Create storage policies for exports bucket
CREATE POLICY "Users can view own export files" ON storage.objects
  FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can manage export files" ON storage.objects
  FOR ALL USING (auth.role() = 'service_role');
```

### 5. Enable Row Level Security

Ensure RLS is enabled on all GDPR tables:

```sql
-- Enable RLS on GDPR tables
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (example for user_consents)
CREATE POLICY "Users can view own consents" ON user_consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own consents" ON user_consents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents" ON user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## 🔧 Configuration

### 1. Cookie Categories Setup

Insert default cookie categories:

```sql
INSERT INTO cookie_categories (category, name, description, is_essential, is_enabled_by_default) VALUES
('essential', 'Essential Cookies', 'Required for basic site functionality', true, true),
('functional', 'Functional Cookies', 'Enhance your experience with extra features', false, true),
('analytics', 'Analytics Cookies', 'Help us understand how you use our site', false, false),
('marketing', 'Marketing Cookies', 'Used to show you relevant advertisements', false, false),
('performance', 'Performance Cookies', 'Help us improve site performance', false, false);
```

### 2. Data Retention Policies

Configure default retention policies:

```sql
INSERT INTO data_retention_policies (table_name, retention_period, is_active) VALUES
('audit_logs', '2_years', true),
('user_sessions', '90_days', true),
('login_attempts', '90_days', true),
('security_events', '2_years', true),
('password_reset_tokens', '7_days', true),
('data_export_requests', '30_days', true);
```

### 3. Scheduled Jobs Setup

Enable pg_cron extension and create scheduled jobs:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily data retention check at 2 AM
SELECT cron.schedule('data-retention-check', '0 2 * * *', 'SELECT check_data_retention();');

-- Schedule weekly cleanup of expired exports on Sunday at 3 AM
SELECT cron.schedule('cleanup-expired-exports', '0 3 * * 0', $$
  DELETE FROM data_export_requests 
  WHERE status = 'completed' 
  AND expires_at < NOW();
$$);
```

## 🎨 Frontend Integration

### 1. Add Cookie Consent to Layout

Update your main layout file:

```typescript
// src/app/layout.tsx
import CookieConsentBanner from '@/components/CookieConsentBanner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
```

### 2. Add Privacy Dashboard

Create a privacy settings page:

```typescript
// src/app/privacy-settings/page.tsx
import PrivacyDashboard from '@/components/PrivacyDashboard';

export default function PrivacySettingsPage() {
  return <PrivacyDashboard />;
}
```

### 3. Implement Terms Acceptance

Add terms acceptance to your authentication flow:

```typescript
// In your auth component
import TermsAcceptanceModal, { useTermsAcceptance } from '@/components/TermsAcceptanceModal';

export default function AuthPage() {
  const { isModalOpen, isRequired, checkTermsAcceptance, recordAcceptance, closeModal } = useTermsAcceptance();

  useEffect(() => {
    // Check if user needs to accept terms after login
    checkTermsAcceptance();
  }, []);

  return (
    <>
      {/* Your auth form */}
      <TermsAcceptanceModal
        isOpen={isModalOpen}
        required={isRequired}
        onAccept={recordAcceptance}
        onClose={closeModal}
      />
    </>
  );
}
```

## 🔐 Security Considerations

### 1. Encryption Key Management

- **Never commit encryption keys to version control**
- Use different keys for different environments
- Consider using a key management service (AWS KMS, HashiCorp Vault)
- Implement key rotation procedures

### 2. Database Security

- Enable SSL/TLS for all database connections
- Use connection pooling with proper authentication
- Regularly audit database access logs
- Implement IP whitelisting for admin access

### 3. API Security

- Implement rate limiting on privacy API endpoints
- Use HTTPS only in production
- Validate all input parameters
- Log all privacy-related API calls

## 📊 Monitoring

### 1. Privacy Metrics Dashboard

Track key GDPR metrics:

```sql
-- Consent acceptance rates
SELECT 
  consent_type,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
  COUNT(*) FILTER (WHERE status = 'declined') as declined,
  ROUND(COUNT(*) FILTER (WHERE status = 'accepted') * 100.0 / COUNT(*), 2) as acceptance_rate
FROM user_consents 
GROUP BY consent_type;

-- Data export requests volume
SELECT 
  DATE(created_at) as date,
  COUNT(*) as requests,
  COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM data_export_requests 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Deletion requests tracking
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_hours_to_complete
FROM user_deletion_requests 
GROUP BY status;
```

### 2. Compliance Alerts

Set up alerts for:
- Failed data exports
- Delayed deletion processing
- Unusual privacy request volumes
- Data breach incidents

## 📋 Testing

### 1. GDPR Compliance Tests

Test the following scenarios:

1. **Data Export**
   - Request full data export
   - Verify all user data is included
   - Check file format and structure
   - Test download link expiration

2. **Data Deletion**
   - Request account deletion
   - Verify data anonymization
   - Check cascade deletion logic
   - Test business data integrity

3. **Consent Management**
   - Accept/decline various consent types
   - Withdraw previously given consent
   - Verify consent persistence
   - Test cookie behavior based on consent

4. **Terms Acceptance**
   - Test forced acceptance on updates
   - Verify IP and timestamp recording
   - Check historical acceptance tracking

### 2. Security Tests

- Test encryption/decryption functionality
- Verify API authentication and authorization
- Test input validation and sanitization
- Check for potential data leaks

## 🆘 Troubleshooting

### Common Issues

1. **Encryption Key Error**
   ```
   Error: MASTER_ENCRYPTION_KEY environment variable is required
   ```
   **Solution**: Ensure the encryption key is set and is exactly 64 hex characters

2. **Database Migration Fails**
   ```
   Error: relation "uuid_generate_v4" does not exist
   ```
   **Solution**: Enable the uuid-ossp extension in your database

3. **Cookie Consent Not Showing**
   - Check if consent cookie already exists
   - Verify component is properly imported
   - Check browser console for JavaScript errors

4. **Export Files Not Generated**
   - Check storage bucket permissions
   - Verify service role key has proper access
   - Check background job processing

### Debug Mode

Enable debug logging for GDPR operations:

```typescript
// In your environment variables
NODE_ENV=development
DEBUG_GDPR=true

// In your code
if (process.env.DEBUG_GDPR === 'true') {
  console.log('GDPR Debug:', operationDetails);
}
```

## 📞 Support

For GDPR compliance questions:
- Technical issues: Create a GitHub issue
- Privacy concerns: Contact your DPO
- Legal questions: Consult with legal counsel

## 📚 Additional Resources

- [GDPR Implementation Guide](./GDPR_COMPLIANCE_COMPLETE.md)
- [Privacy Policy Template](./privacy-policy-template.md)
- [Cookie Policy Template](./cookie-policy-template.md)
- [Data Processing Agreement Template](./dpa-template.md)

---

**Last Updated**: December 2024  
**Version**: 1.0
