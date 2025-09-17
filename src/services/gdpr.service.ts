import { createServiceClient } from '@/lib/supabase';
import { encryptionService, piiAnonymizationService, FieldEncryptionConfig } from '@/lib/encryption';
import { defaultLogger as logger } from '@/lib/logger';
import { nanoid } from 'nanoid/non-secure';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export interface UserDataExportRequest {
  userId: string;
  exportType: 'full' | 'partial' | 'specific_tables';
  format: 'json' | 'csv' | 'xml';
  tablesRequested?: string[];
  includeFiles?: boolean;
}

export interface UserDeletionRequest {
  userId: string;
  reason?: string;
  requestedBy?: string;
  scheduledFor?: Date;
  immediate?: boolean;
}

export interface ConsentUpdate {
  userId: string;
  consentType: string;
  status: 'accepted' | 'declined' | 'revoked';
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TermsAcceptance {
  userId: string;
  termsVersion: string;
  privacyPolicyVersion: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataBreachNotification {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsersCount: number;
  dataTypesAffected: string[];
  breachDetectedAt: Date;
}

export interface AuditLogEntry {
  userId?: string;
  sessionId?: string;
  tableName: string;
  recordId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'anonymize';
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * GDPR Compliance Service
 * Handles all GDPR-related operations including data export, deletion, consent management
 */
export class GDPRService {
  private supabase = createServiceClient();

  // =============================================
  // DATA EXPORT (Right to Data Portability)
  // =============================================

  /**
   * Create a data export request for a user
   */
  async createDataExportRequest(request: UserDataExportRequest): Promise<{ success: boolean; exportId?: string; message: string }> {
    try {
      logger.info('Creating data export request', { userId: request.userId, exportType: request.exportType });

      // Check if user has a pending export request
      const { data: existingRequest } = await this.supabase
        .from('data_export_requests')
        .select('id, status')
        .eq('user_id', request.userId)
        .in('status', ['pending', 'processing'])
        .single();

      if (existingRequest) {
        return {
          success: false,
          message: 'You already have a pending export request. Please wait for it to complete.',
        };
      }

      // Create export request
      const { data: exportRequest, error } = await this.supabase
        .from('data_export_requests')
        .insert({
          user_id: request.userId,
          export_type: request.exportType,
          format: request.format,
          tables_requested: request.tablesRequested || [],
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create export request', { error: error.message, userId: request.userId });
        return { success: false, message: 'Failed to create export request' };
      }

      // Log audit entry
      await this.createAuditLog({
        userId: request.userId,
        tableName: 'data_export_requests',
        recordId: exportRequest.id,
        action: 'create',
        newValues: { export_type: request.exportType, format: request.format },
      });

      // Start processing in background
      this.processDataExport(exportRequest.id).catch((error) => {
        logger.error('Background export processing failed', { exportId: exportRequest.id, error: error.message });
      });

      logger.info('Data export request created', { exportId: exportRequest.id, userId: request.userId });
      return {
        success: true,
        exportId: exportRequest.id,
        message: 'Export request created successfully. You will be notified when it\'s ready.',
      };
    } catch (error) {
      logger.error('Error creating data export request', { error: error.message, userId: request.userId });
      return { success: false, message: 'Failed to create export request due to server error' };
    }
  }

  /**
   * Process data export request (background job)
   */
  private async processDataExport(exportId: string): Promise<void> {
    try {
      // Update status to processing
      await this.supabase
        .from('data_export_requests')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', exportId);

      // Get export request details
      const { data: exportRequest, error: requestError } = await this.supabase
        .from('data_export_requests')
        .select('*')
        .eq('id', exportId)
        .single();

      if (requestError || !exportRequest) {
        throw new Error('Export request not found');
      }

      // Collect user data
      const userData = await this.collectUserData(exportRequest.user_id, exportRequest.export_type, exportRequest.tables_requested);

      // Generate export file
      const fileName = `user_data_export_${exportRequest.user_id}_${Date.now()}.${exportRequest.format}`;
      const filePath = await this.generateExportFile(userData, exportRequest.format, fileName);

      // Upload to storage (assuming Supabase Storage)
      const fileBuffer = fs.readFileSync(filePath);
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('exports')
        .upload(fileName, fileBuffer, {
          contentType: exportRequest.format === 'json' ? 'application/json' : 'text/csv',
        });

      if (uploadError) {
        throw new Error(`Failed to upload export file: ${uploadError.message}`);
      }

      // Get signed URL
      const { data: signedUrlData } = await this.supabase.storage
        .from('exports')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

      // Update export request with completion
      await this.supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          file_url: signedUrlData?.signedUrl,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', exportId);

      // Clean up local file
      fs.unlinkSync(filePath);

      // Send notification to user (implement email service)
      await this.notifyUserExportReady(exportRequest.user_id, signedUrlData?.signedUrl);

      logger.info('Data export completed successfully', { exportId, userId: exportRequest.user_id });
    } catch (error) {
      logger.error('Data export processing failed', { exportId, error: error.message });

      // Update export request with error
      await this.supabase
        .from('data_export_requests')
        .update({
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', exportId);
    }
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string, exportType: string, tablesRequested: string[]): Promise<any> {
    const userData: any = {};

    // Define tables to export based on type
    let tablesToExport: string[] = [];
    
    if (exportType === 'full') {
      tablesToExport = [
        'users', 'shops', 'products', 'purchases', 'payments', 'favorites',
        'cart_items', 'reviews', 'referrals', 'referral_stats', 'user_sessions',
        'user_consents', 'terms_acceptances', 'user_privacy_settings'
      ];
    } else if (exportType === 'specific_tables') {
      tablesToExport = tablesRequested;
    } else {
      tablesToExport = ['users', 'purchases', 'user_privacy_settings'];
    }

    // Collect data from each table
    for (const table of tablesToExport) {
      try {
        const data = await this.getUserDataFromTable(userId, table);
        if (data && data.length > 0) {
          userData[table] = data;
        }
      } catch (error) {
        logger.warn('Failed to export data from table', { table, userId, error: error.message });
      }
    }

    // Add metadata
    userData._metadata = {
      exportedAt: new Date().toISOString(),
      userId,
      exportType,
      version: '1.0',
    };

    return userData;
  }

  /**
   * Get user data from a specific table
   */
  private async getUserDataFromTable(userId: string, table: string): Promise<any[]> {
    let query;

    // Define user-related queries for each table
    switch (table) {
      case 'users':
        query = this.supabase.from('users').select('*').eq('id', userId);
        break;
      case 'shops':
        query = this.supabase.from('shops').select('*').eq('owner_id', userId);
        break;
      case 'products':
        query = this.supabase.from('products').select('*').eq('seller_id', userId);
        break;
      case 'purchases':
        query = this.supabase.from('purchases').select('*').eq('buyer_id', userId);
        break;
      case 'payments':
        query = this.supabase.from('payments').select('*').eq('user_id', userId);
        break;
      case 'favorites':
        query = this.supabase.from('favorites').select('*').eq('user_id', userId);
        break;
      case 'cart_items':
        query = this.supabase.from('cart_items').select('*').eq('user_id', userId);
        break;
      case 'reviews':
        query = this.supabase.from('reviews').select('*').eq('user_id', userId);
        break;
      case 'referrals':
        query = this.supabase.from('referrals').select('*').eq('referrer_id', userId);
        break;
      case 'user_sessions':
        query = this.supabase.from('user_sessions').select('*').eq('user_id', userId);
        break;
      case 'user_consents':
        query = this.supabase.from('user_consents').select('*').eq('user_id', userId);
        break;
      case 'terms_acceptances':
        query = this.supabase.from('terms_acceptances').select('*').eq('user_id', userId);
        break;
      case 'user_privacy_settings':
        query = this.supabase.from('user_privacy_settings').select('*').eq('user_id', userId);
        break;
      default:
        throw new Error(`Unknown table: ${table}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch data from ${table}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Generate export file in specified format
   */
  private async generateExportFile(userData: any, format: string, fileName: string): Promise<string> {
    const tempDir = '/tmp/exports';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, fileName);

    switch (format) {
      case 'json':
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
        break;
      case 'csv':
        // Convert to CSV format (simplified)
        let csvContent = '';
        Object.entries(userData).forEach(([table, data]) => {
          if (Array.isArray(data) && data.length > 0) {
            csvContent += `\n\n=== ${table.toUpperCase()} ===\n`;
            const headers = Object.keys(data[0]);
            csvContent += headers.join(',') + '\n';
            data.forEach((row: any) => {
              csvContent += headers.map(h => JSON.stringify(row[h] || '')).join(',') + '\n';
            });
          }
        });
        fs.writeFileSync(filePath, csvContent);
        break;
      case 'xml':
        // Convert to XML format (simplified)
        let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<user_data>\n';
        Object.entries(userData).forEach(([table, data]) => {
          xmlContent += `  <${table}>\n`;
          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              xmlContent += '    <item>\n';
              Object.entries(item).forEach(([key, value]) => {
                xmlContent += `      <${key}>${this.escapeXml(String(value))}</${key}>\n`;
              });
              xmlContent += '    </item>\n';
            });
          }
          xmlContent += `  </${table}>\n`;
        });
        xmlContent += '</user_data>';
        fs.writeFileSync(filePath, xmlContent);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return filePath;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =============================================
  // RIGHT TO DELETION (Right to be Forgotten)
  // =============================================

  /**
   * Create a user deletion request
   */
  async createUserDeletionRequest(request: UserDeletionRequest): Promise<{ success: boolean; deletionId?: string; message: string }> {
    try {
      logger.info('Creating user deletion request', { userId: request.userId, immediate: request.immediate });

      // Check if user exists and is active
      const { data: user } = await this.supabase
        .from('users')
        .select('id, email, is_active')
        .eq('id', request.userId)
        .single();

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (!user.is_active) {
        return { success: false, message: 'User is already deactivated' };
      }

      // Check for existing deletion request
      const { data: existingRequest } = await this.supabase
        .from('user_deletion_requests')
        .select('id, status')
        .eq('user_id', request.userId)
        .in('status', ['pending', 'in_progress'])
        .single();

      if (existingRequest) {
        return {
          success: false,
          message: 'A deletion request is already pending for this user',
        };
      }

      // Determine scheduled time
      const scheduledFor = request.immediate 
        ? new Date()
        : request.scheduledFor || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

      // Create deletion request
      const { data: deletionRequest, error } = await this.supabase
        .from('user_deletion_requests')
        .insert({
          user_id: request.userId,
          requested_by: request.requestedBy,
          reason: request.reason,
          status: 'pending',
          scheduled_for: scheduledFor.toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create deletion request', { error: error.message, userId: request.userId });
        return { success: false, message: 'Failed to create deletion request' };
      }

      // Log audit entry
      await this.createAuditLog({
        userId: request.userId,
        tableName: 'user_deletion_requests',
        recordId: deletionRequest.id,
        action: 'create',
        newValues: { reason: request.reason, scheduled_for: scheduledFor },
      });

      // If immediate deletion, process now
      if (request.immediate) {
        this.processUserDeletion(deletionRequest.id).catch((error) => {
          logger.error('Immediate deletion processing failed', { deletionId: deletionRequest.id, error: error.message });
        });
      }

      logger.info('User deletion request created', { deletionId: deletionRequest.id, userId: request.userId });
      return {
        success: true,
        deletionId: deletionRequest.id,
        message: request.immediate 
          ? 'Deletion is being processed immediately'
          : `Deletion scheduled for ${scheduledFor.toLocaleDateString()}`,
      };
    } catch (error) {
      logger.error('Error creating deletion request', { error: error.message, userId: request.userId });
      return { success: false, message: 'Failed to create deletion request due to server error' };
    }
  }

  /**
   * Process user deletion (background job)
   */
  private async processUserDeletion(deletionId: string): Promise<void> {
    try {
      // Update status
      await this.supabase
        .from('user_deletion_requests')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', deletionId);

      // Get deletion request
      const { data: deletionRequest, error: requestError } = await this.supabase
        .from('user_deletion_requests')
        .select('*')
        .eq('id', deletionId)
        .single();

      if (requestError || !deletionRequest) {
        throw new Error('Deletion request not found');
      }

      // Perform soft delete and get summary
      const { data: deletionSummary, error: deleteError } = await this.supabase
        .rpc('soft_delete_user_data', { p_user_id: deletionRequest.user_id });

      if (deleteError) {
        throw new Error(`Deletion failed: ${deleteError.message}`);
      }

      // Create anonymized backup for compliance
      const userData = await this.collectUserData(deletionRequest.user_id, 'full', []);
      const anonymizedData = piiAnonymizationService.anonymizeUserData(userData, {
        email: { encrypt: false, anonymize: true, piiLevel: 'high' },
        name: { encrypt: false, anonymize: true, piiLevel: 'high' },
        ip_address: { encrypt: false, anonymize: true, piiLevel: 'medium' },
      });

      // Store anonymized data for compliance
      await this.supabase
        .from('deleted_user_data')
        .insert({
          original_user_id: deletionRequest.user_id,
          deletion_request_id: deletionId,
          table_name: 'user_complete_data',
          anonymized_data: anonymizedData,
        });

      // Update deletion request with completion
      await this.supabase
        .from('user_deletion_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          deletion_summary: deletionSummary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deletionId);

      logger.info('User deletion completed successfully', { deletionId, userId: deletionRequest.user_id });
    } catch (error) {
      logger.error('User deletion processing failed', { deletionId, error: error.message });

      // Update deletion request with error
      await this.supabase
        .from('user_deletion_requests')
        .update({
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deletionId);
    }
  }

  // =============================================
  // CONSENT MANAGEMENT
  // =============================================

  /**
   * Update user consent
   */
  async updateUserConsent(consent: ConsentUpdate): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Updating user consent', { 
        userId: consent.userId, 
        consentType: consent.consentType, 
        status: consent.status 
      });

      const timestamp = new Date().toISOString();
      const consentData: any = {
        user_id: consent.userId,
        consent_type: consent.consentType,
        status: consent.status,
        version: consent.version,
        ip_address: consent.ipAddress,
        user_agent: consent.userAgent,
        updated_at: timestamp,
      };

      if (consent.status === 'accepted') {
        consentData.consented_at = timestamp;
      } else if (consent.status === 'revoked') {
        consentData.revoked_at = timestamp;
      }

      // Upsert consent record
      const { error } = await this.supabase
        .from('user_consents')
        .upsert(consentData, {
          onConflict: 'user_id,consent_type,version',
        });

      if (error) {
        logger.error('Failed to update consent', { error: error.message, userId: consent.userId });
        return { success: false, message: 'Failed to update consent' };
      }

      // Log audit entry
      await this.createAuditLog({
        userId: consent.userId,
        tableName: 'user_consents',
        recordId: `${consent.userId}-${consent.consentType}`,
        action: 'update',
        newValues: consentData,
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
      });

      logger.info('User consent updated successfully', { userId: consent.userId, consentType: consent.consentType });
      return { success: true, message: 'Consent updated successfully' };
    } catch (error) {
      logger.error('Error updating consent', { error: error.message, userId: consent.userId });
      return { success: false, message: 'Failed to update consent due to server error' };
    }
  }

  /**
   * Record terms acceptance
   */
  async recordTermsAcceptance(acceptance: TermsAcceptance): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Recording terms acceptance', { userId: acceptance.userId });

      const { error } = await this.supabase
        .from('terms_acceptances')
        .insert({
          user_id: acceptance.userId,
          terms_version: acceptance.termsVersion,
          privacy_policy_version: acceptance.privacyPolicyVersion,
          accepted_at: new Date().toISOString(),
          ip_address: acceptance.ipAddress,
          user_agent: acceptance.userAgent,
        });

      if (error) {
        logger.error('Failed to record terms acceptance', { error: error.message, userId: acceptance.userId });
        return { success: false, message: 'Failed to record terms acceptance' };
      }

      // Log audit entry
      await this.createAuditLog({
        userId: acceptance.userId,
        tableName: 'terms_acceptances',
        recordId: acceptance.userId,
        action: 'create',
        newValues: {
          terms_version: acceptance.termsVersion,
          privacy_policy_version: acceptance.privacyPolicyVersion,
        },
        ipAddress: acceptance.ipAddress,
        userAgent: acceptance.userAgent,
      });

      logger.info('Terms acceptance recorded successfully', { userId: acceptance.userId });
      return { success: true, message: 'Terms acceptance recorded successfully' };
    } catch (error) {
      logger.error('Error recording terms acceptance', { error: error.message, userId: acceptance.userId });
      return { success: false, message: 'Failed to record terms acceptance due to server error' };
    }
  }

  // =============================================
  // AUDIT LOGGING
  // =============================================

  /**
   * Create audit log entry
   */
  async createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await this.supabase
        .rpc('create_audit_log', {
          p_user_id: entry.userId,
          p_session_id: entry.sessionId,
          p_table_name: entry.tableName,
          p_record_id: entry.recordId,
          p_action: entry.action,
          p_old_values: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          p_new_values: entry.newValues ? JSON.stringify(entry.newValues) : null,
          p_ip_address: entry.ipAddress,
          p_user_agent: entry.userAgent,
        });
    } catch (error) {
      logger.error('Failed to create audit log', { error: error.message, entry });
    }
  }

  // =============================================
  // DATA BREACH MANAGEMENT
  // =============================================

  /**
   * Report a data breach
   */
  async reportDataBreach(breach: DataBreachNotification): Promise<{ success: boolean; breachId?: string; message: string }> {
    try {
      logger.warn('Data breach reported', { title: breach.title, severity: breach.severity });

      const { data: breachRecord, error } = await this.supabase
        .from('data_breaches')
        .insert({
          title: breach.title,
          description: breach.description,
          severity: breach.severity,
          affected_users_count: breach.affectedUsersCount,
          data_types_affected: breach.dataTypesAffected,
          breach_detected_at: breach.breachDetectedAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to report data breach', { error: error.message });
        return { success: false, message: 'Failed to report data breach' };
      }

      // TODO: Implement automatic notifications to authorities and users

      logger.warn('Data breach recorded', { breachId: breachRecord.id });
      return {
        success: true,
        breachId: breachRecord.id,
        message: 'Data breach has been recorded and will be processed according to GDPR requirements',
      };
    } catch (error) {
      logger.error('Error reporting data breach', { error: error.message });
      return { success: false, message: 'Failed to report data breach due to server error' };
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Get user's current privacy settings
   */
  async getUserPrivacySettings(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Failed to get privacy settings', { error: error.message, userId });
      return null;
    }

    return data;
  }

  /**
   * Get user's consent history
   */
  async getUserConsentHistory(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get consent history', { error: error.message, userId });
      return [];
    }

    return data || [];
  }

  /**
   * Notify user that export is ready
   */
  private async notifyUserExportReady(userId: string, downloadUrl?: string): Promise<void> {
    // TODO: Implement email notification
    logger.info('Export ready notification should be sent', { userId, downloadUrl });
  }
}

export const gdprService = new GDPRService();
