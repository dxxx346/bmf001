#!/usr/bin/env tsx

import { DatabaseSeeder } from './seed';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

interface SeedOptions {
  clear?: boolean;
  config?: 'dev' | 'test' | 'prod';
  tables?: string[];
}

async function main() {
  const args = process.argv.slice(2);
  const options: SeedOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--clear':
        options.clear = true;
        break;
      case '--config':
        const configValue = args[i + 1];
        if (['dev', 'test', 'prod'].includes(configValue)) {
          options.config = configValue as 'dev' | 'test' | 'prod';
          i++; // Skip next argument
        } else {
          console.error('❌ Invalid config value. Use: dev, test, or prod');
          process.exit(1);
        }
        break;
      case '--tables':
        const tablesValue = args[i + 1];
        if (tablesValue) {
          options.tables = tablesValue.split(',');
          i++; // Skip next argument
        } else {
          console.error('❌ Tables list cannot be empty');
          process.exit(1);
        }
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`❌ Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  // Set environment based on config
  if (options.config) {
    (process.env as any).NODE_ENV = options.config === 'prod' ? 'production' : options.config;
  }

  try {
    logger.info('🌱 Starting database seeding...', { options });

    const seeder = new DatabaseSeeder();
    
    if (options.clear) {
      logger.info('🧹 Clearing existing data...');
      await seeder.clearData();
    }

    if (options.tables) {
      logger.info('📊 Seeding specific tables...', { tables: options.tables });
      await seeder.seedSpecificTables(options.tables);
    } else {
      await seeder.seed();
    }

    logger.info('✅ Database seeding completed successfully!');
  } catch (error) {
    logError(error as Error, { action: 'seed_cli' });
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
🌱 Database Seeding CLI

Usage: npm run db:seed [options]

Options:
  --clear              Clear existing data before seeding
  --config <env>       Set environment (dev, test, prod)
  --tables <list>      Seed specific tables (comma-separated)
  --help               Show this help message

Examples:
  npm run db:seed                           # Seed with default config
  npm run db:seed -- --clear               # Clear and seed
  npm run db:seed -- --config dev          # Use development config
  npm run db:seed -- --tables users,shops  # Seed only users and shops
  npm run db:seed -- --clear --config test # Clear and seed with test config

Available tables:
  categories, users, shops, products, purchases, reviews, referrals, notifications
`);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
}
