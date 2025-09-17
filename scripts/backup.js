#!/usr/bin/env node

/**
 * Backup Management Script
 * 
 * Usage:
 *   node scripts/backup.js create [--type=database|files|full]
 *   node scripts/backup.js restore --path=<backup-path> [--target=<target-path>]
 *   node scripts/backup.js list [--type=database|files]
 *   node scripts/backup.js cleanup [--type=database|files]
 *   node scripts/backup.js test
 */

const { program } = require('commander');
const path = require('path');

// Import backup managers (would need to be transpiled in real usage)
async function loadBackupModules() {
  // In production, these would be transpiled JS files
  const { backupOrchestrator, databaseBackupManager, fileBackupManager } = await import('../src/lib/backup-manager.ts');
  return { backupOrchestrator, databaseBackupManager, fileBackupManager };
}

// Create backup command
program
  .command('create')
  .description('Create a new backup')
  .option('-t, --type <type>', 'Backup type: database, files, or full', 'full')
  .action(async (options) => {
    try {
      console.log(`Starting ${options.type} backup...`);
      
      const { backupOrchestrator, databaseBackupManager, fileBackupManager } = await loadBackupModules();
      
      let result;
      
      switch (options.type) {
        case 'database':
          result = await databaseBackupManager.createDatabaseBackup();
          break;
        case 'files':
          result = await fileBackupManager.createFileBackup();
          break;
        case 'full':
        default:
          result = await backupOrchestrator.runFullBackup();
          break;
      }
      
      if (result.success) {
        console.log('✅ Backup completed successfully');
        if (result.backupId) {
          console.log(`📦 Backup ID: ${result.backupId}`);
          console.log(`📊 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`📍 Path: ${result.path}`);
        }
      } else {
        console.error('❌ Backup failed');
        if (result.error) {
          console.error(`Error: ${result.error}`);
        }
        if (result.errors && result.errors.length > 0) {
          console.error('Errors:');
          result.errors.forEach(err => console.error(`  - ${err}`));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Backup script failed:', error.message);
      process.exit(1);
    }
  });

// Restore backup command
program
  .command('restore')
  .description('Restore from a backup')
  .requiredOption('-p, --path <path>', 'Path to backup file')
  .option('-t, --target <target>', 'Target path for file restoration')
  .option('--type <type>', 'Backup type: database or files', 'database')
  .action(async (options) => {
    try {
      console.log(`Starting restore from ${options.path}...`);
      
      const { databaseBackupManager, fileBackupManager } = await loadBackupModules();
      
      let result;
      
      if (options.type === 'database') {
        result = await databaseBackupManager.restoreDatabase(options.path);
      } else if (options.type === 'files') {
        if (!options.target) {
          console.error('❌ Target path is required for file restoration');
          process.exit(1);
        }
        result = await fileBackupManager.restoreFiles(options.path, options.target);
      } else {
        console.error('❌ Invalid backup type. Use "database" or "files"');
        process.exit(1);
      }
      
      if (result.success) {
        console.log('✅ Restore completed successfully');
      } else {
        console.error('❌ Restore failed');
        if (result.error) {
          console.error(`Error: ${result.error}`);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Restore script failed:', error.message);
      process.exit(1);
    }
  });

// List backups command
program
  .command('list')
  .description('List available backups')
  .option('-t, --type <type>', 'Backup type: database or files', 'database')
  .action(async (options) => {
    try {
      const { databaseBackupManager, fileBackupManager } = await loadBackupModules();
      
      let backups;
      
      if (options.type === 'database') {
        backups = await databaseBackupManager.listDatabaseBackups();
        console.log('📋 Database Backups:');
      } else if (options.type === 'files') {
        backups = await fileBackupManager.listFileBackups();
        console.log('📋 File Backups:');
      } else {
        console.error('❌ Invalid backup type. Use "database" or "files"');
        process.exit(1);
      }
      
      if (backups.length === 0) {
        console.log('  No backups found');
        return;
      }
      
      // Sort by date (newest first)
      backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      console.log('');
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.id}`);
        console.log(`   📅 Date: ${new Date(backup.date).toLocaleString()}`);
        console.log(`   📊 Size: ${(backup.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   📍 Path: ${backup.path}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ List command failed:', error.message);
      process.exit(1);
    }
  });

// Cleanup backups command
program
  .command('cleanup')
  .description('Clean up old backups based on retention policy')
  .option('-t, --type <type>', 'Backup type: database, files, or both', 'both')
  .action(async (options) => {
    try {
      console.log(`Starting cleanup for ${options.type} backups...`);
      
      const { backupOrchestrator, databaseBackupManager, fileBackupManager } = await loadBackupModules();
      
      let result;
      
      if (options.type === 'both') {
        result = await backupOrchestrator.runCleanup();
      } else if (options.type === 'database') {
        const dbResult = await databaseBackupManager.cleanupDatabaseBackups();
        result = { success: dbResult.errors.length === 0, results: { database: dbResult } };
      } else if (options.type === 'files') {
        const fileResult = await fileBackupManager.cleanupFileBackups();
        result = { success: fileResult.errors.length === 0, results: { files: fileResult } };
      } else {
        console.error('❌ Invalid backup type. Use "database", "files", or "both"');
        process.exit(1);
      }
      
      if (result.success) {
        console.log('✅ Cleanup completed successfully');
        
        if (result.results.database) {
          console.log(`🗑️  Database: Deleted ${result.results.database.deleted} old backups`);
          if (result.results.database.errors.length > 0) {
            console.log(`   Errors: ${result.results.database.errors.length}`);
          }
        }
        
        if (result.results.files) {
          console.log(`🗑️  Files: Deleted ${result.results.files.deleted} old backups`);
          if (result.results.files.errors.length > 0) {
            console.log(`   Errors: ${result.results.files.errors.length}`);
          }
        }
      } else {
        console.error('❌ Cleanup completed with errors');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Cleanup script failed:', error.message);
      process.exit(1);
    }
  });

// Test backup system command
program
  .command('test')
  .description('Test backup system connectivity and configuration')
  .action(async () => {
    try {
      console.log('🧪 Testing backup system...');
      
      // Test environment variables
      console.log('\n📋 Environment Check:');
      
      const requiredVars = [
        'DATABASE_URL',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_S3_BUCKET',
        'AWS_REGION',
      ];
      
      let envOk = true;
      requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
          console.log(`✅ ${varName}: Set`);
        } else {
          console.log(`❌ ${varName}: Missing`);
          envOk = false;
        }
      });
      
      if (!envOk) {
        console.log('\n❌ Environment configuration incomplete');
        process.exit(1);
      }
      
      // Test storage connectivity
      console.log('\n🔗 Storage Connectivity:');
      
      try {
        const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });
        
        await s3.send(new ListBucketsCommand({}));
        console.log('✅ AWS S3: Connected');
      } catch (error) {
        console.log(`❌ AWS S3: ${error.message}`);
      }
      
      // Test database connectivity
      console.log('\n🗄️  Database Connectivity:');
      
      try {
        const { execSync } = require('child_process');
        execSync('pg_dump --version', { stdio: 'pipe' });
        console.log('✅ pg_dump: Available');
      } catch (error) {
        console.log('❌ pg_dump: Not available');
      }
      
      try {
        execSync('psql --version', { stdio: 'pipe' });
        console.log('✅ psql: Available');
      } catch (error) {
        console.log('❌ psql: Not available');
      }
      
      console.log('\n✅ Backup system test completed');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  });

// Help command
program
  .name('backup')
  .description('BMF001 Backup Management System')
  .version('1.0.0');

// Parse command line arguments
program.parse();

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
