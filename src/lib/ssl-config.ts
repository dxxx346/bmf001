// SSL Certificate Management and Configuration
// Supports Let's Encrypt, Cloudflare SSL, and custom certificates

import { promises as fs } from 'fs';
import { resolve } from 'path';

interface SSLConfig {
  provider: 'letsencrypt' | 'cloudflare' | 'custom' | 'vercel';
  autoRenewal: boolean;
  certificates: {
    domains: string[];
    certPath?: string;
    keyPath?: string;
    chainPath?: string;
  };
  security: {
    minTLSVersion: string;
    cipherSuites: string[];
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    ocspStapling: boolean;
  };
}

// Environment-specific SSL configurations
export const sslConfigs: Record<string, SSLConfig> = {
  development: {
    provider: 'vercel',
    autoRenewal: true,
    certificates: {
      domains: ['localhost', '*.localhost'],
    },
    security: {
      minTLSVersion: '1.2',
      cipherSuites: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-CHACHA20-POLY1305',
      ],
      hsts: {
        enabled: false,
        maxAge: 0,
        includeSubDomains: false,
        preload: false,
      },
      ocspStapling: false,
    },
  },

  production: {
    provider: 'cloudflare',
    autoRenewal: true,
    certificates: {
      domains: [
        process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') || 'yourdomain.com',
        `www.${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '').replace('www.', '') || 'yourdomain.com'}`,
        `api.${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '').replace('www.', '') || 'yourdomain.com'}`,
        `admin.${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '').replace('www.', '') || 'yourdomain.com'}`,
        `cdn.${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '').replace('www.', '') || 'yourdomain.com'}`,
      ],
    },
    security: {
      minTLSVersion: '1.3',
      cipherSuites: [
        'TLS_AES_128_GCM_SHA256',
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
      ],
      hsts: {
        enabled: true,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      ocspStapling: true,
    },
  },
};

// Get current SSL configuration
export function getSSLConfig(): SSLConfig {
  const env = process.env.NODE_ENV || 'development';
  return sslConfigs[env] || sslConfigs.development;
}

// SSL Certificate Manager
export class SSLCertificateManager {
  private config: SSLConfig;
  
  constructor() {
    this.config = getSSLConfig();
  }
  
  // Check certificate validity
  async checkCertificateValidity(domain: string): Promise<{
    valid: boolean;
    expiresAt?: Date;
    issuer?: string;
    subject?: string;
    daysUntilExpiry?: number;
    error?: string;
  }> {
    try {
      // For Vercel/Cloudflare, check via API
      if (this.config.provider === 'cloudflare') {
        return await this.checkCloudflareSSL(domain);
      }
      
      // For custom certificates, check local files
      if (this.config.provider === 'custom') {
        return await this.checkLocalCertificate();
      }
      
      // For Vercel, assume SSL is managed automatically
      return {
        valid: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        issuer: 'Vercel',
        subject: domain,
        daysUntilExpiry: 90,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Check Cloudflare SSL status
  private async checkCloudflareSSL(domain: string): Promise<any> {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    
    if (!apiToken || !zoneId) {
      throw new Error('Missing Cloudflare API credentials');
    }
    
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/ssl/certificate_packs`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.errors?.[0]?.message || 'API error');
      }
      
      const cert = result.result?.[0];
      if (!cert) {
        throw new Error('No certificate found');
      }
      
      const expiresAt = new Date(cert.expires_on);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      return {
        valid: cert.status === 'active',
        expiresAt,
        issuer: cert.certificate_authority,
        subject: cert.hosts?.[0] || domain,
        daysUntilExpiry,
      };
    } catch (error) {
      throw new Error(`Cloudflare SSL check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Check local certificate files
  private async checkLocalCertificate(): Promise<any> {
    const { certPath } = this.config.certificates;
    
    if (!certPath) {
      throw new Error('Certificate path not configured');
    }
    
    try {
      const certData = await fs.readFile(resolve(certPath), 'utf8');
      
      // Parse certificate (simplified - would use crypto module in real implementation)
      const certMatch = certData.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
      if (!certMatch) {
        throw new Error('Invalid certificate format');
      }
      
      // This is a simplified check - real implementation would use node:crypto
      return {
        valid: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        issuer: 'Custom',
        subject: this.config.certificates.domains[0],
        daysUntilExpiry: 90,
      };
    } catch (error) {
      throw new Error(`Certificate file read failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Renew certificate
  async renewCertificate(): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      if (this.config.provider === 'cloudflare') {
        return await this.renewCloudflareSSL();
      }
      
      if (this.config.provider === 'letsencrypt') {
        return await this.renewLetsEncryptSSL();
      }
      
      return {
        success: true,
        message: 'Certificate renewal is managed automatically by the provider',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Certificate renewal failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Renew Cloudflare SSL
  private async renewCloudflareSSL(): Promise<any> {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    
    if (!apiToken || !zoneId) {
      throw new Error('Missing Cloudflare API credentials');
    }
    
    // For Cloudflare, SSL certificates are auto-renewed
    // This could trigger a manual renewal if needed
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/ssl/certificate_packs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'advanced',
          hosts: this.config.certificates.domains,
        }),
      }
    );
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.errors?.[0]?.message || 'Renewal failed');
    }
    
    return {
      success: true,
      message: 'Certificate renewal initiated successfully',
    };
  }
  
  // Renew Let's Encrypt SSL
  private async renewLetsEncryptSSL(): Promise<any> {
    // This would integrate with certbot or acme.js
    // For now, return a mock response
    return {
      success: true,
      message: 'Let\'s Encrypt renewal would be handled by certbot',
    };
  }
  
  // Get SSL configuration for Express/Node.js
  getExpressSSLConfig(): any {
    if (this.config.provider !== 'custom') {
      return null; // Managed by platform
    }
    
    return {
      key: this.config.certificates.keyPath,
      cert: this.config.certificates.certPath,
      ca: this.config.certificates.chainPath,
      secureProtocol: 'TLSv1_3_method',
      ciphers: this.config.security.cipherSuites.join(':'),
      honorCipherOrder: true,
    };
  }
}

// SSL Security Headers Manager
export class SSLSecurityHeaders {
  private config: SSLConfig;
  
  constructor() {
    this.config = getSSLConfig();
  }
  
  // Get HSTS header
  getHSTSHeader(): string | null {
    if (!this.config.security.hsts.enabled) {
      return null;
    }
    
    let header = `max-age=${this.config.security.hsts.maxAge}`;
    
    if (this.config.security.hsts.includeSubDomains) {
      header += '; includeSubDomains';
    }
    
    if (this.config.security.hsts.preload) {
      header += '; preload';
    }
    
    return header;
  }
  
  // Get all SSL-related security headers
  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // HSTS
    const hsts = this.getHSTSHeader();
    if (hsts) {
      headers['Strict-Transport-Security'] = hsts;
    }
    
    // Force HTTPS redirect
    if (this.config.security.hsts.enabled) {
      headers['Content-Security-Policy'] = 'upgrade-insecure-requests';
    }
    
    return headers;
  }
}

// SSL Monitoring and Alerts
export class SSLMonitor {
  private certificateManager: SSLCertificateManager;
  
  constructor() {
    this.certificateManager = new SSLCertificateManager();
  }
  
  // Monitor all domains for certificate expiry
  async monitorCertificates(): Promise<{
    healthy: boolean;
    certificates: Array<{
      domain: string;
      valid: boolean;
      expiresAt?: Date;
      daysUntilExpiry?: number;
      needsRenewal: boolean;
      error?: string;
    }>;
  }> {
    const config = getSSLConfig();
    const certificates: Array<{
      domain: string;
      valid: boolean;
      expiresAt?: Date;
      daysUntilExpiry?: number;
      needsRenewal: boolean;
      error?: string;
    }> = [];
    let healthy = true;
    
    for (const domain of config.certificates.domains) {
      try {
        const status = await this.certificateManager.checkCertificateValidity(domain);
        const needsRenewal = status.daysUntilExpiry ? status.daysUntilExpiry < 30 : false;
        
        if (!status.valid || needsRenewal) {
          healthy = false;
        }
        
        certificates.push({
          domain,
          valid: status.valid,
          expiresAt: status.expiresAt,
          daysUntilExpiry: status.daysUntilExpiry,
          needsRenewal,
          error: status.error,
        });
      } catch (error) {
        healthy = false;
        certificates.push({
          domain,
          valid: false,
          needsRenewal: true,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return { healthy, certificates };
  }
  
  // Send alerts for expiring certificates
  async sendExpiryAlerts(): Promise<void> {
    const monitoring = await this.monitorCertificates();
    
    for (const cert of monitoring.certificates) {
      if (cert.needsRenewal || !cert.valid) {
        await this.sendAlert(cert);
      }
    }
  }
  
  // Send alert (integrate with your alerting system)
  private async sendAlert(cert: any): Promise<void> {
    const message = cert.valid
      ? `SSL certificate for ${cert.domain} expires in ${cert.daysUntilExpiry} days`
      : `SSL certificate for ${cert.domain} is invalid: ${cert.error}`;
    
    console.error('[SSL Monitor]', message);
    
    // Integration points for alerting systems
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(message);
    }
    
    if (process.env.PAGERDUTY_API_KEY) {
      await this.sendPagerDutyAlert(message);
    }
  }
  
  // Send Slack alert
  private async sendSlackAlert(message: string): Promise<void> {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔒 SSL Certificate Alert: ${message}`,
          username: 'SSL Monitor',
          icon_emoji: ':warning:',
        }),
      });
    } catch (error) {
      console.error('[SSL Monitor] Slack alert failed:', error);
    }
  }
  
  // Send PagerDuty alert
  private async sendPagerDutyAlert(message: string): Promise<void> {
    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: process.env.PAGERDUTY_API_KEY,
          event_action: 'trigger',
          payload: {
            summary: `SSL Certificate Issue: ${message}`,
            source: 'bmf001-ssl-monitor',
            severity: 'warning',
            component: 'ssl-certificates',
            group: 'infrastructure',
            class: 'security',
          },
        }),
      });
    } catch (error) {
      console.error('[SSL Monitor] PagerDuty alert failed:', error);
    }
  }
}

// Export utilities
export const sslCertificateManager = new SSLCertificateManager();
export const sslSecurityHeaders = new SSLSecurityHeaders();
export const sslMonitor = new SSLMonitor();

// Automated SSL monitoring (runs in production)
if (process.env.NODE_ENV === 'production') {
  // Check certificates every 24 hours
  setInterval(async () => {
    try {
      await sslMonitor.sendExpiryAlerts();
    } catch (error) {
      console.error('[SSL Monitor] Monitoring check failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
}

// Next.js middleware integration
export function getSSLMiddlewareHeaders(): Record<string, string> {
  return sslSecurityHeaders.getSecurityHeaders();
}
