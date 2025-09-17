import crypto from 'crypto';
import { defaultLogger as logger } from './logger';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
}

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  tag: string;
  algorithm: string;
}

export interface FieldEncryptionConfig {
  [key: string]: {
    encrypt: boolean;
    anonymize?: boolean;
    piiLevel: 'high' | 'medium' | 'low';
  };
}

/**
 * Advanced encryption service for GDPR compliance
 * Provides AES-256-GCM encryption for data at rest and in transit
 */
export class EncryptionService {
  private readonly masterKey: Buffer;
  private readonly config: EncryptionConfig;

  constructor() {
    this.config = {
      algorithm: ALGORITHM,
      keyLength: KEY_LENGTH,
      ivLength: IV_LENGTH,
      tagLength: TAG_LENGTH,
    };
    
    // Initialize master key from environment
    this.masterKey = this.initializeMasterKey();
  }

  /**
   * Initialize master encryption key
   */
  private initializeMasterKey(): Buffer {
    const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
    
    if (!masterKeyHex) {
      throw new Error('MASTER_ENCRYPTION_KEY environment variable is required');
    }

    if (masterKeyHex.length !== KEY_LENGTH * 2) {
      throw new Error(`Master key must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
    }

    return Buffer.from(masterKeyHex, 'hex');
  }

  /**
   * Generate a new encryption key
   */
  generateKey(): Buffer {
    return crypto.randomBytes(KEY_LENGTH);
  }

  /**
   * Generate a secure random IV
   */
  private generateIV(): Buffer {
    return crypto.randomBytes(this.config.ivLength);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string, key?: Buffer): EncryptedData {
    try {
      const encryptionKey = key || this.masterKey;
      const iv = this.generateIV();
      const cipher = crypto.createCipheriv(this.config.algorithm, encryptionKey, iv);
      
      let encryptedData = cipher.update(data, 'utf8', 'hex');
      encryptedData += cipher.final('hex');
      
      const tag = (cipher as any).getAuthTag ? (cipher as any).getAuthTag() : Buffer.alloc(0);
      
      const result: EncryptedData = {
        encryptedData,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.config.algorithm,
      };

      logger.debug('Data encrypted successfully', { 
        dataLength: data.length,
        algorithm: this.config.algorithm 
      });

      return result;
    } catch (error) {
      logger.error('Encryption failed', { error: (error as Error).message });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData, key?: Buffer): string {
    try {
      const decryptionKey = key || this.masterKey;
      
      const decipher = crypto.createDecipheriv(
        encryptedData.algorithm,
        decryptionKey,
        Buffer.from(encryptedData.iv, 'hex')
      );
      if ((decipher as any).setAuthTag) {
        (decipher as any).setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      }
      
      let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      logger.debug('Data decrypted successfully');
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error: (error as Error).message });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt multiple fields in an object
   */
  encryptFields<T extends Record<string, any>>(
    data: T, 
    fieldConfig: FieldEncryptionConfig,
    key?: Buffer
  ): T & { __encrypted_fields__: string[] } {
    const result = { ...data };
    const encryptedFields: string[] = [];

    Object.entries(fieldConfig).forEach(([field, config]) => {
      if (config.encrypt && data[field] !== undefined && data[field] !== null) {
        try {
          const encryptedData = this.encrypt(String((data as any)[field]), key);
          (result as any)[field] = JSON.stringify(encryptedData);
          encryptedFields.push(field);
        } catch (error) {
          logger.error('Failed to encrypt field', { field, error: error.message });
          throw new Error(`Failed to encrypt field: ${field}`);
        }
      }
    });

    return {
      ...result,
      __encrypted_fields__: encryptedFields,
    };
  }

  /**
   * Decrypt multiple fields in an object
   */
  decryptFields<T extends Record<string, any>>(
    data: T & { __encrypted_fields__?: string[] },
    key?: Buffer
  ): T {
    const result = { ...data };
    const encryptedFields = data.__encrypted_fields__ || [];

    encryptedFields.forEach((field) => {
      if (data[field] !== undefined && data[field] !== null) {
        try {
          const encryptedData = JSON.parse((data as any)[field]) as EncryptedData;
          (result as any)[field] = this.decrypt(encryptedData, key);
        } catch (error) {
          logger.error('Failed to decrypt field', { field, error: error.message });
          // Keep encrypted data if decryption fails
        }
      }
    });

    // Remove metadata
    delete result.__encrypted_fields__;
    return result;
  }

  /**
   * Hash data using SHA-256 (for pseudonymization)
   */
  hash(data: string, salt?: string): string {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(data, saltBuffer, 10000, 64, 'sha256');
    return `${saltBuffer.toString('hex')}:${hash.toString('hex')}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const verifyHash = crypto.pbkdf2Sync(data, Buffer.from(salt, 'hex'), 10000, 64, 'sha256');
      return hash === verifyHash.toString('hex');
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a secure token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt data for transit (additional layer)
   */
  encryptForTransit(data: any): string {
    const jsonData = JSON.stringify(data);
    const encrypted = this.encrypt(jsonData);
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * Decrypt data from transit
   */
  decryptFromTransit(encryptedData: string): any {
    try {
      const encryptedObj = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
      const decrypted = this.decrypt(encryptedObj);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt transit data', { error: error.message });
      throw new Error('Invalid encrypted data');
    }
  }
}

/**
 * PII Data Anonymization Service
 */
export class PIIAnonymizationService {
  private readonly encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  /**
   * Anonymize email addresses
   */
  anonymizeEmail(email: string): string {
    if (!email || !email.includes('@')) return 'anonymous@example.com';
    
    const [localPart, domain] = email.split('@');
    const anonymizedLocal = localPart.length > 3 
      ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
      : '***';
    
    return `${anonymizedLocal}@${domain}`;
  }

  /**
   * Anonymize names
   */
  anonymizeName(name: string): string {
    if (!name) return 'Anonymous User';
    
    const words = name.trim().split(' ');
    return words.map((word, index) => {
      if (index === 0) {
        return word.length > 2 ? word.charAt(0) + '*'.repeat(word.length - 1) : '***';
      }
      return word.charAt(0) + '.';
    }).join(' ');
  }

  /**
   * Anonymize phone numbers
   */
  anonymizePhone(phone: string): string {
    if (!phone) return '***-***-****';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `***-***-${cleaned.slice(-4)}`;
    }
    return '***-***-****';
  }

  /**
   * Anonymize IP addresses
   */
  anonymizeIP(ip: string): string {
    if (!ip) return '0.0.0.0';
    
    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::0:0:0:0';
    } else {
      // IPv4
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.0.0`;
    }
  }

  /**
   * Pseudonymize user ID (maintain referential integrity)
   */
  pseudonymizeUserId(userId: string, salt: string): string {
    return this.encryptionService.hash(userId, salt).split(':')[1].substring(0, 16);
  }

  /**
   * Anonymize user data based on field configuration
   */
  anonymizeUserData<T extends Record<string, any>>(
    data: T,
    config: FieldEncryptionConfig
  ): T {
    const result = { ...data };

    Object.entries(config).forEach(([field, fieldConfig]) => {
      if (fieldConfig.anonymize && (data as any)[field] !== undefined && (data as any)[field] !== null) {
        const value = String((data as any)[field]);
        
        switch (field) {
          case 'email':
            (result as any)[field] = this.anonymizeEmail(value);
            break;
          case 'name':
          case 'full_name':
          case 'first_name':
          case 'last_name':
            (result as any)[field] = this.anonymizeName(value);
            break;
          case 'phone':
          case 'phone_number':
            (result as any)[field] = this.anonymizePhone(value);
            break;
          case 'ip_address':
            (result as any)[field] = this.anonymizeIP(value);
            break;
          case 'user_id':
          case 'id':
            (result as any)[field] = this.pseudonymizeUserId(value, 'default_salt');
            break;
          default:
            // Generic anonymization
            (result as any)[field] = this.genericAnonymize(value, fieldConfig.piiLevel);
        }
      }
    });

    return result;
  }

  /**
   * Generic anonymization based on PII level
   */
  private genericAnonymize(value: string, piiLevel: 'high' | 'medium' | 'low'): string {
    if (!value) return '***';
    
    switch (piiLevel) {
      case 'high':
        return '***REDACTED***';
      case 'medium':
        return value.length > 4 
          ? value.substring(0, 2) + '*'.repeat(value.length - 2)
          : '***';
      case 'low':
        return value.length > 6
          ? value.substring(0, 3) + '*'.repeat(value.length - 6) + value.substring(value.length - 3)
          : '***';
      default:
        return '***';
    }
  }
}

// Export instances
export const encryptionService = new EncryptionService();
export const piiAnonymizationService = new PIIAnonymizationService();

// Field encryption configurations
export const USER_FIELD_CONFIG: FieldEncryptionConfig = {
  email: { encrypt: true, piiLevel: 'high' },
  name: { encrypt: true, anonymize: true, piiLevel: 'high' },
  phone: { encrypt: true, anonymize: true, piiLevel: 'high' },
  address: { encrypt: true, piiLevel: 'high' },
  payment_info: { encrypt: true, piiLevel: 'high' },
  ip_address: { encrypt: false, anonymize: true, piiLevel: 'medium' },
  user_agent: { encrypt: false, anonymize: true, piiLevel: 'low' },
};

export const PRODUCT_FIELD_CONFIG: FieldEncryptionConfig = {
  description: { encrypt: false, piiLevel: 'low' },
  file_url: { encrypt: true, piiLevel: 'medium' },
  metadata: { encrypt: true, piiLevel: 'medium' },
};

export const PAYMENT_FIELD_CONFIG: FieldEncryptionConfig = {
  external_data: { encrypt: true, piiLevel: 'high' },
  external_id: { encrypt: true, piiLevel: 'high' },
  failure_reason: { encrypt: false, piiLevel: 'low' },
};
