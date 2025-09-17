import { createServiceClient } from '@/lib/supabase';
import { createHash, randomBytes } from 'crypto';
import { Readable } from 'stream';
import { createWriteStream, createReadStream, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlink } from 'fs/promises';
import { nanoid } from 'nanoid/non-secure';
import { defaultLogger as logger } from '@/lib/logger';

// Types for delivery service
export interface DeliveryOptions {
  expiresIn?: number; // hours, default 24
  maxDownloads?: number; // default 5
  watermark?: boolean;
  licenseKey?: boolean;
  zipFiles?: boolean;
  cdnEnabled?: boolean;
}

export interface DownloadSession {
  id: string;
  userId: string;
  productId: string;
  fileUrl: string;
  expiresAt: Date;
  downloadCount: number;
  maxDownloads: number;
  licenseKey?: string;
  createdAt: Date;
  lastDownloadAt?: Date;
}

export interface BandwidthUsage {
  userId: string;
  period: string; // YYYY-MM format
  bytesUsed: number;
  limit: number; // bytes per month
  lastReset: Date;
}

export interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'supabase';
  endpoint: string;
  apiKey?: string;
  region?: string;
}

export interface WatermarkConfig {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  fontSize: number;
  color: string;
}

export interface LicenseKeyConfig {
  prefix: string;
  length: number;
  includeChecksum: boolean;
  expiresAt?: Date;
}

class DeliveryService {
  private supabase = createServiceClient();
  private cdnConfig: CDNConfig | null = null;
  private redis: any = null; // Will be initialized with Redis client

  constructor() {
    this.initializeRedis();
    this.loadCDNConfig();
  }

  private async initializeRedis() {
    try {
      const { Redis } = await import('ioredis');
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    } catch (error) {
      logger.warn('Redis not available, using in-memory cache');
    }
  }

  private loadCDNConfig() {
    const cdnProvider = process.env.CDN_PROVIDER;
    if (cdnProvider) {
      this.cdnConfig = {
        provider: cdnProvider as CDNConfig['provider'],
        endpoint: process.env.CDN_ENDPOINT!,
        apiKey: process.env.CDN_API_KEY,
        region: process.env.CDN_REGION,
      };
    }
  }

  /**
   * Generate secure temporary download URL for purchased product
   */
  async generateDownloadUrl(
    userId: string,
    productId: string,
    options: DeliveryOptions = {}
  ): Promise<{ url: string; sessionId: string; expiresAt: Date }> {
    try {
      // Verify user has purchased this product
      const { data: purchase, error: purchaseError } = await this.supabase
        .from('purchases')
        .select('*')
        .eq('buyer_id', userId)
        .eq('product_id', productId)
        .single();

      if (purchaseError || !purchase) {
        throw new Error('Product not purchased or access denied');
      }

      // Get product details
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      // Check if user has reached download limit
      const bandwidthUsage = await this.getBandwidthUsage(userId);
      if (bandwidthUsage.bytesUsed >= bandwidthUsage.limit) {
        throw new Error('Bandwidth limit exceeded');
      }

      // Generate session
      const sessionId = nanoid(32);
      const expiresIn = options.expiresIn || 24; // hours
      const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
      const maxDownloads = options.maxDownloads || 5;

      // Generate license key if requested
      let licenseKey: string | undefined;
      if (options.licenseKey) {
        licenseKey = await this.generateLicenseKey({
          prefix: 'BMF',
          length: 16,
          includeChecksum: true,
          expiresAt: expiresAt,
        });
      }

      // Create download session
      const downloadSession: DownloadSession = {
        id: sessionId,
        userId,
        productId,
        fileUrl: product.file_url,
        expiresAt,
        downloadCount: 0,
        maxDownloads,
        licenseKey,
        createdAt: new Date(),
      };

      // Store session in Redis with expiration
      if (this.redis) {
        await this.redis.setex(
          `download:${sessionId}`,
          expiresIn * 60 * 60, // seconds
          JSON.stringify(downloadSession)
        );
      }

      // Generate secure URL
      const secureUrl = await this.generateSecureUrl(sessionId, options);

      // Log download session creation
      await this.logDeliveryEvent('download_session_created', {
        userId,
        productId,
        sessionId,
        expiresAt,
      });

      return {
        url: secureUrl,
        sessionId,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error generating download URL:', error);
      throw error;
    }
  }

  /**
   * Process download request and track usage
   */
  async processDownload(sessionId: string, userAgent?: string): Promise<{
    fileUrl: string;
    filename: string;
    size: number;
    contentType: string;
  }> {
    try {
      // Get session from Redis
      let session: DownloadSession | null = null;
      if (this.redis) {
        const sessionData = await this.redis.get(`download:${sessionId}`);
        if (sessionData) {
          session = JSON.parse(sessionData);
        }
      }

      if (!session) {
        throw new Error('Download session not found or expired');
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        throw new Error('Download session expired');
      }

      // Check download limit
      if (session.downloadCount >= session.maxDownloads) {
        throw new Error('Download limit exceeded');
      }

      // Get product details
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', session.productId)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      // Update download count
      session.downloadCount++;
      session.lastDownloadAt = new Date();

      // Update session in Redis
      if (this.redis) {
        await this.redis.setex(
          `download:${sessionId}`,
          Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
          JSON.stringify(session)
        );
      }

      // Track bandwidth usage
      await this.trackBandwidthUsage(session.userId, 0); // Will be updated with actual size

      // Log download event
      await this.logDeliveryEvent('download_processed', {
        sessionId,
        userId: session.userId,
        productId: session.productId,
        downloadCount: session.downloadCount,
        userAgent,
      });

      // Get file info
      const fileInfo = await this.getFileInfo(product.file_url);

      return {
        fileUrl: product.file_url,
        filename: this.extractFilename(product.file_url),
        size: fileInfo.size,
        contentType: fileInfo.contentType,
      };
    } catch (error) {
      logger.error('Error processing download:', error);
      throw error;
    }
  }

  /**
   * Generate secure URL with CDN support
   */
  private async generateSecureUrl(
    sessionId: string,
    options: DeliveryOptions
  ): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    if (options.cdnEnabled && this.cdnConfig) {
      return this.generateCDNUrl(sessionId);
    }

    // Generate signed URL for direct access
    const signature = this.generateSignature(sessionId);
    return `${baseUrl}/api/delivery/download/${sessionId}?sig=${signature}`;
  }

  /**
   * Generate CDN URL for better performance
   */
  private async generateCDNUrl(sessionId: string): Promise<string> {
    if (!this.cdnConfig) {
      throw new Error('CDN not configured');
    }

    const signature = this.generateSignature(sessionId);
    const cdnUrl = `${this.cdnConfig.endpoint}/delivery/${sessionId}?sig=${signature}`;
    
    // Cache the file in CDN
    await this.cacheFileInCDN(sessionId);
    
    return cdnUrl;
  }

  /**
   * Cache file in CDN
   */
  private async cacheFileInCDN(sessionId: string): Promise<void> {
    // Implementation depends on CDN provider
    // This is a placeholder for CDN caching logic
    logger.info(`Caching file for session ${sessionId} in CDN`);
  }

  /**
   * Generate signature for URL security
   */
  private generateSignature(sessionId: string): string {
    const secret = process.env.DELIVERY_SECRET || 'default-secret';
    const timestamp = Math.floor(Date.now() / 1000);
    const data = `${sessionId}:${timestamp}`;
    return createHash('sha256').update(data + secret).digest('hex');
  }

  /**
   * Verify signature
   */
  private verifySignature(sessionId: string, signature: string): boolean {
    const expectedSignature = this.generateSignature(sessionId);
    return expectedSignature === signature;
  }

  /**
   * Generate zip file for multiple products
   */
  async generateZipFile(
    userId: string,
    productIds: string[],
    options: DeliveryOptions = {}
  ): Promise<{ zipUrl: string; sessionId: string }> {
    try {
      // Verify user has purchased all products
      const { data: purchases, error: purchaseError } = await this.supabase
        .from('purchases')
        .select('product_id')
        .eq('buyer_id', userId)
        .in('product_id', productIds);

      if (purchaseError || !purchases || purchases.length !== productIds.length) {
        throw new Error('Not all products purchased or access denied');
      }

      // Get products
      const { data: products, error: productError } = await this.supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productError || !products) {
        throw new Error('Products not found');
      }

      // Generate zip file
      const zipPath = await this.createZipFile(products, options);
      
      // Upload zip to storage
      const zipUrl = await this.uploadZipFile(zipPath, userId);

      // Generate download session for zip
      const sessionId = nanoid(32);
      const expiresAt = new Date(Date.now() + (options.expiresIn || 24) * 60 * 60 * 1000);

      const downloadSession: DownloadSession = {
        id: sessionId,
        userId,
        productId: 'zip', // Special identifier for zip files
        fileUrl: zipUrl,
        expiresAt,
        downloadCount: 0,
        maxDownloads: options.maxDownloads || 3,
        createdAt: new Date(),
      };

      // Store session
      if (this.redis) {
        await this.redis.setex(
          `download:${sessionId}`,
          (options.expiresIn || 24) * 60 * 60,
          JSON.stringify(downloadSession)
        );
      }

      // Clean up temporary file
      await unlink(zipPath);

      return {
        zipUrl: await this.generateSecureUrl(sessionId, options),
        sessionId,
      };
    } catch (error) {
      logger.error('Error generating zip file:', error);
      throw error;
    }
  }

  /**
   * Create zip file from products
   */
  private async createZipFile(products: any[], options: DeliveryOptions): Promise<string> {
    const { createWriteStream } = await import('fs');
    const { pipeline } = await import('stream/promises');
    const archiver = await import('archiver');

    const zipPath = join(tmpdir(), `delivery-${nanoid()}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver.default('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);

      archive.pipe(output);

      // Add each product file to zip
      products.forEach(async (product, index) => {
        const filename = this.extractFilename(product.file_url);
        const fileStream = await this.getFileStream(product.file_url);
        
        if (options.watermark) {
          // Apply watermark if requested
          const watermarkedStream = await this.applyWatermark(fileStream, {
            text: `Purchased by ${product.seller_id}`,
            position: 'bottom-right',
            opacity: 0.3,
            fontSize: 12,
            color: '#000000',
          });
          archive.append(watermarkedStream, { name: filename });
        } else {
          archive.append(fileStream, { name: filename });
        }
      });

      archive.finalize();
    });
  }

  /**
   * Upload zip file to storage
   */
  private async uploadZipFile(zipPath: string, userId: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('delivery')
      .upload(`zips/${userId}/${nanoid()}.zip`, createReadStream(zipPath), {
        contentType: 'application/zip',
        cacheControl: '3600',
      });

    if (error) {
      throw new Error(`Failed to upload zip file: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from('delivery')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  /**
   * Generate license key for software products
   */
  async generateLicenseKey(config: LicenseKeyConfig): Promise<string> {
    const { prefix, length, includeChecksum, expiresAt } = config;
    
    // Generate random part
    const randomPart = randomBytes(Math.floor(length / 2)).toString('hex').toUpperCase();
    
    let licenseKey = `${prefix}-${randomPart}`;
    
    if (includeChecksum) {
      const checksum = this.calculateChecksum(licenseKey);
      licenseKey = `${licenseKey}-${checksum}`;
    }

    // Store license key in database
    await this.supabase
      .from('license_keys')
      .insert({
        key: licenseKey,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      });

    return licenseKey;
  }

  /**
   * Calculate checksum for license key
   */
  private calculateChecksum(key: string): string {
    const hash = createHash('md5').update(key).digest('hex');
    return hash.substring(0, 4).toUpperCase();
  }

  /**
   * Apply watermark to document
   */
  private async applyWatermark(
    fileStream: Readable,
    config: WatermarkConfig
  ): Promise<Readable> {
    // This is a placeholder for watermarking logic
    // In a real implementation, you would use libraries like:
    // - PDF-lib for PDFs
    // - Sharp for images
    // - FFmpeg for videos
    
    logger.info(`Applying watermark: ${config.text}`);
    return fileStream;
  }

  /**
   * Get file information
   */
  private async getFileInfo(fileUrl: string): Promise<{
    size: number;
    contentType: string;
  }> {
    try {
      // Extract file path from Supabase URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const bucket = pathParts[2];
      const filePath = pathParts.slice(3).join('/');

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(filePath.split('/').slice(0, -1).join('/'), {
          search: filePath.split('/').pop(),
        });

      if (error || !data || data.length === 0) {
        throw new Error('File not found');
      }

      const file = data[0];
      return {
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || 'application/octet-stream',
      };
    } catch (error) {
      logger.error('Error getting file info:', error);
      return {
        size: 0,
        contentType: 'application/octet-stream',
      };
    }
  }

  /**
   * Get file stream from storage
   */
  private async getFileStream(fileUrl: string): Promise<Readable> {
    // This would typically download the file from Supabase Storage
    // and return a readable stream
    // For now, returning a placeholder
    return new Readable({
      read() {
        this.push('File content placeholder');
        this.push(null);
      },
    });
  }

  /**
   * Extract filename from URL
   */
  private extractFilename(fileUrl: string): string {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    return pathParts[pathParts.length - 1] || 'download';
  }

  /**
   * Track bandwidth usage per user
   */
  private async trackBandwidthUsage(userId: string, bytesUsed: number): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    if (this.redis) {
      const key = `bandwidth:${userId}:${currentMonth}`;
      await this.redis.incrby(key, bytesUsed);
      await this.redis.expire(key, 60 * 60 * 24 * 32); // Expire after 32 days
    }

    // Also store in database for analytics
    await this.supabase
      .from('bandwidth_usage')
      .upsert({
        user_id: userId,
        period: currentMonth,
        bytes_used: bytesUsed,
        updated_at: new Date().toISOString(),
      });
  }

  /**
   * Get bandwidth usage for user
   */
  async getBandwidthUsage(userId: string): Promise<BandwidthUsage> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    // Get from Redis first (faster)
    let bytesUsed = 0;
    if (this.redis) {
      const key = `bandwidth:${userId}:${currentMonth}`;
      const cached = await this.redis.get(key);
      if (cached) {
        bytesUsed = parseInt(cached);
      }
    }

    // Get from database if not in cache
    if (bytesUsed === 0) {
      const { data, error } = await this.supabase
        .from('bandwidth_usage')
        .select('bytes_used')
        .eq('user_id', userId)
        .eq('period', currentMonth)
        .single();

      if (!error && data) {
        bytesUsed = data.bytes_used;
      }
    }

    // Default limits (can be configured per user role)
    const limit = 10 * 1024 * 1024 * 1024; // 10GB per month

    return {
      userId,
      period: currentMonth,
      bytesUsed,
      limit,
      lastReset: new Date(),
    };
  }

  /**
   * Log delivery events for analytics
   */
  private async logDeliveryEvent(
    event: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('delivery_logs')
        .insert({
          event,
          data,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      logger.error('Error logging delivery event:', error);
    }
  }

  /**
   * Get delivery analytics for admin
   */
  async getDeliveryAnalytics(period: string): Promise<{
    totalDownloads: number;
    totalBandwidth: number;
    topProducts: Array<{
      productId: string;
      title: string;
      downloads: number;
    }>;
    topUsers: Array<{
      userId: string;
      downloads: number;
      bandwidth: number;
    }>;
  }> {
    const { data: logs, error } = await this.supabase
      .from('delivery_logs')
      .select('*')
      .gte('created_at', new Date(period).toISOString());

    if (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }

    // Process logs to generate analytics
    const analytics = {
      totalDownloads: 0,
      totalBandwidth: 0,
      topProducts: [] as any[],
      topUsers: [] as any[],
    };

    // This would contain the actual analytics processing logic
    // For now, returning placeholder data
    return analytics;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      if (this.redis) {
        // Get all download session keys
        const keys = await this.redis.keys('download:*');
        
        for (const key of keys) {
          const sessionData = await this.redis.get(key);
          if (sessionData) {
            const session: DownloadSession = JSON.parse(sessionData);
            if (new Date() > session.expiresAt) {
              await this.redis.del(key);
            }
          }
        }
      }

      // Also clean up database records
      await this.supabase
        .from('delivery_logs')
        .delete()
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    }
  }
}

// Export singleton instance
export const deliveryService = new DeliveryService();
export default deliveryService;
