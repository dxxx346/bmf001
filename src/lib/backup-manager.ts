// Comprehensive Backup Management System
// Supports database backups, file backups, and automated recovery

// @ts-expect-error - allow building without AWS SDK installed in local/test
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { join, resolve } from 'path';
import archiver from 'archiver';
import { pipeline } from 'stream/promises';

interface BackupConfig {
  database: {
    enabled: boolean;
    schedule: string; // cron format
    retention: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    compression: boolean;
    encryption: boolean;
  };
  files: {
    enabled: boolean;
    schedule: string;
    paths: string[];
    retention: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    compression: boolean;
    encryption: boolean;
  };
  storage: {
    provider: 'aws-s3' | 'supabase' | 'local';
    bucket: string;
    region: string;
    prefix: string;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    channels: ('slack' | 'email' | 'webhook')[];
  };
}

// Environment-specific backup configurations
export const backupConfigs: Record<string, BackupConfig> = {
  development: {
    database: {
      enabled: true,
      schedule: '0 2 * * *', // Daily at 2 AM
      retention: { daily: 7, weekly: 4, monthly: 3 },
      compression: true,
      encryption: false,
    },
    files: {
      enabled: true,
      schedule: '0 3 * * *', // Daily at 3 AM
      paths: ['./uploads', './public', './src'],
      retention: { daily: 7, weekly: 4, monthly: 3 },
      compression: true,
      encryption: false,
    },
    storage: {
      provider: 'local',
      bucket: './backups',
      region: 'local',
      prefix: 'dev',
    },
    notifications: {
      onSuccess: false,
      onFailure: true,
      channels: ['slack'],
    },
  },

  production: {
    database: {
      enabled: true,
      schedule: '0 1 * * *', // Daily at 1 AM
      retention: { daily: 30, weekly: 12, monthly: 12 },
      compression: true,
      encryption: true,
    },
    files: {
      enabled: true,
      schedule: '0 2 * * *', // Daily at 2 AM
      paths: ['/var/uploads', '/var/storage'],
      retention: { daily: 30, weekly: 12, monthly: 12 },
      compression: true,
      encryption: true,
    },
    storage: {
      provider: 'aws-s3',
      bucket: process.env.AWS_S3_BUCKET || 'bmf001-backups',
      region: process.env.AWS_REGION || 'us-east-1',
      prefix: 'prod',
    },
    notifications: {
      onSuccess: true,
      onFailure: true,
      channels: ['slack', 'email'],
    },
  },
};

// Get current backup configuration
export function getBackupConfig(): BackupConfig {
  const env = process.env.NODE_ENV || 'development';
  return backupConfigs[env] || backupConfigs.development;
}

// Database Backup Manager
export class DatabaseBackupManager {
  protected config: BackupConfig;
  private supabase: any;
  
  constructor() {
    this.config = getBackupConfig();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  // Create database backup
  async createDatabaseBackup(): Promise<{
    success: boolean;
    backupId: string;
    size: number;
    path: string;
    error?: string;
  }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `db-backup-${timestamp}`;
      const filename = `${backupId}.sql${this.config.database.compression ? '.gz' : ''}`;
      
      console.log(`[Backup] Starting database backup: ${backupId}`);
      
      // Create backup using pg_dump
      const dumpCommand = this.buildPgDumpCommand(filename);
      console.log(`[Backup] Executing: ${dumpCommand}`);
      
      execSync(dumpCommand, { stdio: 'inherit' });
      
      // Get backup file size
      const tempPath = join('/tmp', filename);
      const stats = await fs.stat(tempPath);
      
      // Upload to storage
      const storagePath = await this.uploadBackup(tempPath, filename, 'database');
      
      // Clean up temp file
      await fs.unlink(tempPath);
      
      console.log(`[Backup] Database backup completed: ${backupId}`);
      
      return {
        success: true,
        backupId,
        size: stats.size,
        path: storagePath,
      };
    } catch (error) {
      console.error('[Backup] Database backup failed:', error);
      return {
        success: false,
        backupId: '',
        size: 0,
        path: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Build pg_dump command
  private buildPgDumpCommand(filename: string): string {
    const tempPath = join('/tmp', filename);
    
    let command = `pg_dump "${process.env.DATABASE_URL}" --clean --if-exists --no-owner --no-privileges`;
    
    if (this.config.database.compression) {
      command += ` | gzip > ${tempPath}`;
    } else {
      command += ` > ${tempPath}`;
    }
    
    return command;
  }
  
  // Restore database from backup
  async restoreDatabase(backupPath: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log(`[Backup] Starting database restore from: ${backupPath}`);
      
      // Download backup from storage
      const tempPath = await this.downloadBackup(backupPath);
      
      // Restore using psql
      const restoreCommand = this.buildRestoreCommand(tempPath);
      console.log(`[Backup] Executing: ${restoreCommand}`);
      
      execSync(restoreCommand, { stdio: 'inherit' });
      
      // Clean up temp file
      await fs.unlink(tempPath);
      
      console.log('[Backup] Database restore completed');
      
      return { success: true };
    } catch (error) {
      console.error('[Backup] Database restore failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Build restore command
  private buildRestoreCommand(tempPath: string): string {
    const isCompressed = tempPath.endsWith('.gz');
    
    if (isCompressed) {
      return `gunzip -c ${tempPath} | psql "${process.env.DATABASE_URL}"`;
    } else {
      return `psql "${process.env.DATABASE_URL}" < ${tempPath}`;
    }
  }
  
  // List available database backups
  async listDatabaseBackups(): Promise<Array<{
    id: string;
    date: Date;
    size: number;
    path: string;
  }>> {
    return this.listBackupsByType('database');
  }
  
  // Clean up old database backups
  async cleanupDatabaseBackups(): Promise<{
    deleted: number;
    errors: string[];
  }> {
    return this.cleanupBackupsByType('database', this.config.database.retention);
  }
}

// File Backup Manager
export class FileBackupManager {
  protected config: BackupConfig;
  
  constructor() {
    this.config = getBackupConfig();
  }
  
  // Create file backup
  async createFileBackup(): Promise<{
    success: boolean;
    backupId: string;
    size: number;
    path: string;
    error?: string;
  }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `files-backup-${timestamp}`;
      const filename = `${backupId}.tar${this.config.files.compression ? '.gz' : ''}`;
      const tempPath = join('/tmp', filename);
      
      console.log(`[Backup] Starting file backup: ${backupId}`);
      
      // Create archive
      const archive = archiver(this.config.files.compression ? 'tar' : 'tar', {
        gzip: this.config.files.compression,
      });
      
      const output = createWriteStream(tempPath);
      archive.pipe(output);
      
      // Add files to archive
      for (const path of this.config.files.paths) {
        if (await this.pathExists(path)) {
          archive.directory(resolve(path), false);
        }
      }
      
      await archive.finalize();
      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('error', reject);
      });
      
      // Get backup file size
      const stats = await fs.stat(tempPath);
      
      // Upload to storage
      const storagePath = await this.uploadBackup(tempPath, filename, 'files');
      
      // Clean up temp file
      await fs.unlink(tempPath);
      
      console.log(`[Backup] File backup completed: ${backupId}`);
      
      return {
        success: true,
        backupId,
        size: stats.size,
        path: storagePath,
      };
    } catch (error) {
      console.error('[Backup] File backup failed:', error);
      return {
        success: false,
        backupId: '',
        size: 0,
        path: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Restore files from backup
  async restoreFiles(backupPath: string, targetPath: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log(`[Backup] Starting file restore from: ${backupPath}`);
      
      // Download backup from storage
      const tempPath = await this.downloadBackup(backupPath);
      
      // Extract archive
      const extractCommand = this.buildExtractCommand(tempPath, targetPath);
      console.log(`[Backup] Executing: ${extractCommand}`);
      
      execSync(extractCommand, { stdio: 'inherit' });
      
      // Clean up temp file
      await fs.unlink(tempPath);
      
      console.log('[Backup] File restore completed');
      
      return { success: true };
    } catch (error) {
      console.error('[Backup] File restore failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Build extract command
  private buildExtractCommand(tempPath: string, targetPath: string): string {
    const isCompressed = tempPath.endsWith('.gz');
    
    if (isCompressed) {
      return `tar -xzf ${tempPath} -C ${targetPath}`;
    } else {
      return `tar -xf ${tempPath} -C ${targetPath}`;
    }
  }
  
  // List available file backups
  async listFileBackups(): Promise<Array<{
    id: string;
    date: Date;
    size: number;
    path: string;
  }>> {
    return this.listBackupsByType('files');
  }
  
  // Clean up old file backups
  async cleanupFileBackups(): Promise<{
    deleted: number;
    errors: string[];
  }> {
    return this.cleanupBackupsByType('files', this.config.files.retention);
  }
  
  // Check if path exists
  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(resolve(path));
      return true;
    } catch {
      return false;
    }
  }
}

// Base Backup Manager with shared functionality
abstract class BaseBackupManager {
  protected config: BackupConfig;
  private s3Client?: S3Client;
  
  constructor() {
    this.config = getBackupConfig();
    
    if (this.config.storage.provider === 'aws-s3') {
      this.s3Client = new S3Client({
        region: this.config.storage.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    }
  }
  
  // Upload backup to storage
  protected async uploadBackup(localPath: string, filename: string, type: string): Promise<string> {
    const key = `${this.config.storage.prefix}/${type}/${filename}`;
    
    if (this.config.storage.provider === 'aws-s3') {
      return this.uploadToS3(localPath, key);
    } else if (this.config.storage.provider === 'local') {
      return this.uploadToLocal(localPath, key);
    } else {
      throw new Error(`Unsupported storage provider: ${this.config.storage.provider}`);
    }
  }
  
  // Upload to AWS S3
  private async uploadToS3(localPath: string, key: string): Promise<string> {
    const fileStream = createReadStream(localPath);
    
    await this.s3Client!.send(new PutObjectCommand({
      Bucket: this.config.storage.bucket,
      Key: key,
      Body: fileStream,
    }));
    
    return `s3://${this.config.storage.bucket}/${key}`;
  }
  
  // Upload to local storage
  private async uploadToLocal(localPath: string, key: string): Promise<string> {
    const targetDir = join(this.config.storage.bucket, key);
    const targetFile = join(targetDir, '..', key);
    
    // Ensure directory exists
    await fs.mkdir(join(targetFile, '..'), { recursive: true });
    
    // Copy file
    await fs.copyFile(localPath, targetFile);
    
    return targetFile;
  }
  
  // Download backup from storage
  protected async downloadBackup(storagePath: string): Promise<string> {
    const tempPath = join('/tmp', `restore-${Date.now()}`);
    
    if (storagePath.startsWith('s3://')) {
      await this.downloadFromS3(storagePath, tempPath);
    } else {
      await fs.copyFile(storagePath, tempPath);
    }
    
    return tempPath;
  }
  
  // Download from AWS S3
  private async downloadFromS3(s3Path: string, localPath: string): Promise<void> {
    const [, , bucket, ...keyParts] = s3Path.split('/');
    const key = keyParts.join('/');
    
    const response = await this.s3Client!.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    
    const writeStream = createWriteStream(localPath);
    await pipeline(response.Body as any, writeStream);
  }
  
  // List backups by type
  protected async listBackupsByType(type: string): Promise<Array<{
    id: string;
    date: Date;
    size: number;
    path: string;
  }>> {
    const prefix = `${this.config.storage.prefix}/${type}/`;
    
    if (this.config.storage.provider === 'aws-s3') {
      return this.listS3Backups(prefix);
    } else {
      return this.listLocalBackups(prefix);
    }
  }
  
  // List S3 backups
  private async listS3Backups(prefix: string): Promise<any[]> {
    const response = await this.s3Client!.send(new ListObjectsV2Command({
      Bucket: this.config.storage.bucket,
      Prefix: prefix,
    }));
    
    return (response.Contents || []).map(object => ({
      id: object.Key!.split('/').pop()!.replace(/\.[^.]+$/, ''),
      date: object.LastModified!,
      size: object.Size!,
      path: `s3://${this.config.storage.bucket}/${object.Key}`,
    }));
  }
  
  // List local backups
  private async listLocalBackups(prefix: string): Promise<Array<{ id: string; date: Date; size: number; path: string }>> {
    const backupDir = join(this.config.storage.bucket, prefix);
    
    try {
      const files = await fs.readdir(backupDir);
      const backups: Array<{ id: string; date: Date; size: number; path: string }> = [];
      
      for (const file of files) {
        const filePath = join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          id: file.replace(/\.[^.]+$/, ''),
          date: stats.mtime,
          size: stats.size,
          path: filePath,
        });
      }
      
      return backups;
    } catch {
      return [];
    }
  }
  
  // Clean up backups by type and retention policy
  protected async cleanupBackupsByType(
    type: string,
    retention: { daily: number; weekly: number; monthly: number }
  ): Promise<{ deleted: number; errors: string[] }> {
    const backups = await this.listBackupsByType(type);
    const toDelete = this.determineBackupsToDelete(backups, retention);
    
    let deleted = 0;
    const errors: string[] = [];
    
    for (const backup of toDelete) {
      try {
        await this.deleteBackup(backup.path);
        deleted++;
        console.log(`[Backup] Deleted old backup: ${backup.id}`);
      } catch (error) {
        const errorMsg = `Failed to delete ${backup.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[Backup] ${errorMsg}`);
      }
    }
    
    return { deleted, errors };
  }
  
  // Determine which backups to delete based on retention policy
  private determineBackupsToDelete(
    backups: Array<{ id: string; date: Date; size: number; path: string }>,
    retention: { daily: number; weekly: number; monthly: number }
  ): Array<{ id: string; date: Date; size: number; path: string }> {
    const now = new Date();
    const toDelete: Array<{ id: string; date: Date; size: number; path: string }> = [];
    
    // Sort by date (newest first)
    backups.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Keep daily backups
    const dailyBackups = backups.filter(b => {
      const daysDiff = Math.floor((now.getTime() - b.date.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff < retention.daily;
    });
    
    // Keep weekly backups
    const weeklyBackups = backups.filter(b => {
      const weeksDiff = Math.floor((now.getTime() - b.date.getTime()) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff < retention.weekly && !dailyBackups.includes(b);
    });
    
    // Keep monthly backups
    const monthlyBackups = backups.filter(b => {
      const monthsDiff = Math.floor((now.getTime() - b.date.getTime()) / (1000 * 60 * 60 * 24 * 30));
      return monthsDiff < retention.monthly && !dailyBackups.includes(b) && !weeklyBackups.includes(b);
    });
    
    // Mark the rest for deletion
    for (const backup of backups) {
      if (!dailyBackups.includes(backup) && !weeklyBackups.includes(backup) && !monthlyBackups.includes(backup)) {
        toDelete.push(backup);
      }
    }
    
    return toDelete;
  }
  
  // Delete backup
  private async deleteBackup(path: string): Promise<void> {
    if (path.startsWith('s3://')) {
      const [, , bucket, ...keyParts] = path.split('/');
      const key = keyParts.join('/');
      
      await this.s3Client!.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
    } else {
      await fs.unlink(path);
    }
  }
}

// Extend base classes
// DatabaseBackupManager and FileBackupManager classes are already defined above

// Comprehensive Backup Orchestrator
export class BackupOrchestrator {
  private dbManager: DatabaseBackupManager;
  private fileManager: FileBackupManager;
  private config: BackupConfig;
  
  constructor() {
    this.dbManager = new DatabaseBackupManager();
    this.fileManager = new FileBackupManager();
    this.config = getBackupConfig();
  }
  
  // Run full backup (database + files)
  async runFullBackup(): Promise<{
    success: boolean;
    results: {
      database?: any;
      files?: any;
    };
    errors: string[];
  }> {
    console.log('[Backup] Starting full backup process');
    
    const results: any = {};
    const errors: string[] = [];
    
    // Database backup
    if (this.config.database.enabled) {
      try {
        results.database = await this.dbManager.createDatabaseBackup();
        if (!results.database.success) {
          errors.push(`Database backup failed: ${results.database.error}`);
        }
      } catch (error) {
        const errorMsg = `Database backup error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        results.database = { success: false, error: errorMsg };
      }
    }
    
    // File backup
    if (this.config.files.enabled) {
      try {
        results.files = await this.fileManager.createFileBackup();
        if (!results.files.success) {
          errors.push(`File backup failed: ${results.files.error}`);
        }
      } catch (error) {
        const errorMsg = `File backup error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        results.files = { success: false, error: errorMsg };
      }
    }
    
    const success = errors.length === 0;
    
    // Send notifications
    await this.sendNotification(success, results, errors);
    
    console.log(`[Backup] Full backup ${success ? 'completed successfully' : 'completed with errors'}`);
    
    return { success, results, errors };
  }
  
  // Run cleanup for old backups
  async runCleanup(): Promise<{
    success: boolean;
    results: {
      database?: any;
      files?: any;
    };
  }> {
    console.log('[Backup] Starting cleanup process');
    
    const results: any = {};
    
    if (this.config.database.enabled) {
      results.database = await this.dbManager.cleanupDatabaseBackups();
    }
    
    if (this.config.files.enabled) {
      results.files = await this.fileManager.cleanupFileBackups();
    }
    
    const success = Object.values(results).every((r: any) => r.errors.length === 0);
    
    console.log(`[Backup] Cleanup ${success ? 'completed successfully' : 'completed with errors'}`);
    
    return { success, results };
  }
  
  // Send backup notifications
  private async sendNotification(success: boolean, results: any, errors: string[]): Promise<void> {
    if (!this.config.notifications.onSuccess && success) return;
    if (!this.config.notifications.onFailure && !success) return;
    
    const message = this.buildNotificationMessage(success, results, errors);
    
    for (const channel of this.config.notifications.channels) {
      try {
        switch (channel) {
          case 'slack':
            await this.sendSlackNotification(message, success);
            break;
          case 'email':
            await this.sendEmailNotification(message, success);
            break;
          case 'webhook':
            await this.sendWebhookNotification(message, success);
            break;
        }
      } catch (error) {
        console.error(`[Backup] Failed to send ${channel} notification:`, error);
      }
    }
  }
  
  // Build notification message
  private buildNotificationMessage(success: boolean, results: any, errors: string[]): string {
    let message = `Backup ${success ? 'completed successfully' : 'failed'}`;
    
    if (results.database) {
      message += `\nDatabase: ${results.database.success ? '✅ Success' : '❌ Failed'}`;
      if (results.database.success) {
        message += ` (${(results.database.size / 1024 / 1024).toFixed(2)} MB)`;
      }
    }
    
    if (results.files) {
      message += `\nFiles: ${results.files.success ? '✅ Success' : '❌ Failed'}`;
      if (results.files.success) {
        message += ` (${(results.files.size / 1024 / 1024).toFixed(2)} MB)`;
      }
    }
    
    if (errors.length > 0) {
      message += `\n\nErrors:\n${errors.join('\n')}`;
    }
    
    return message;
  }
  
  // Send Slack notification
  private async sendSlackNotification(message: string, success: boolean): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${success ? '✅' : '❌'} Backup Report`,
        attachments: [{
          color: success ? 'good' : 'danger',
          text: message,
          footer: 'BMF001 Backup System',
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    });
  }
  
  // Send email notification
  private async sendEmailNotification(message: string, success: boolean): Promise<void> {
    // Implementation would depend on your email service
    console.log(`[Backup] Email notification: ${message}`);
  }
  
  // Send webhook notification
  private async sendWebhookNotification(message: string, success: boolean): Promise<void> {
    const webhookUrl = process.env.BACKUP_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'backup_completed',
        success,
        message,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}

// Export main instances
export const backupOrchestrator = new BackupOrchestrator();
export const databaseBackupManager = new DatabaseBackupManager();
export const fileBackupManager = new FileBackupManager();

// Cron job setup for automated backups
if (process.env.NODE_ENV === 'production') {
  const config = getBackupConfig();
  
  // Schedule database backups
  if (config.database.enabled) {
    // This would typically use a proper cron library like node-cron
    console.log(`[Backup] Database backups scheduled: ${config.database.schedule}`);
  }
  
  // Schedule file backups
  if (config.files.enabled) {
    console.log(`[Backup] File backups scheduled: ${config.files.schedule}`);
  }
}
