// Use type-only import to avoid runtime dependency in tests
import type { Pool, PoolClient, PoolConfig } from 'pg';
import { Pool as PgPool } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Database connection pool configuration
interface DatabasePoolConfig extends PoolConfig {
  environment: 'development' | 'production' | 'test';
}

// Production-optimized pool configurations
const poolConfigs: Record<string, DatabasePoolConfig> = {
  development: {
    environment: 'development',
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    
    // Development pool settings - smaller pool
    max: 5, // Maximum number of clients
    min: 1, // Minimum number of clients
    idleTimeoutMillis: 10000, // 10 seconds
    connectionTimeoutMillis: 5000, // 5 seconds
    maxUses: 7500, // Max uses before recreation
    
    // Connection settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
    
    // SSL settings for development
    ssl: false,
  },

  production: {
    environment: 'production',
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    
    // Production pool settings - larger pool
    max: parseInt(process.env.DB_POOL_SIZE || '20'), // Maximum number of clients
    min: 5, // Minimum number of clients
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'), // 10 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '20000'), // 20 seconds
    maxUses: 7500, // Max uses before recreation
    
    // Connection settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
    
    // SSL settings for production
    ssl: {
      rejectUnauthorized: false, // Supabase uses self-signed certificates
    },
    
    // Query timeout
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30 seconds
    
    // Statement timeout
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000'), // 60 seconds
  },

  test: {
    environment: 'test',
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    
    // Test pool settings - minimal pool
    max: 3, // Maximum number of clients
    min: 1, // Minimum number of clients
    idleTimeoutMillis: 5000, // 5 seconds
    connectionTimeoutMillis: 3000, // 3 seconds
    maxUses: 1000, // Max uses before recreation
    
    // Connection settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
    
    // SSL settings for test
    ssl: false,
  },
};

// Get current environment configuration
function getCurrentConfig(): DatabasePoolConfig {
  const env = process.env.NODE_ENV || 'development';
  return poolConfigs[env] || poolConfigs.development;
}

// Global connection pool instances
let dbPool: any = null;
let supabasePool: any = null;

// Initialize database connection pool
export function initializeDbPool(): any {
  if (dbPool) {
    return dbPool;
  }

  const config = getCurrentConfig();
  if (!PgPool) {
    // Minimal stub for test environments without 'pg'
    dbPool = {
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release: () => {},
      }),
      on: () => {},
      end: async () => {},
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };
    return dbPool;
  }
  dbPool = new PgPool(config);

  // Pool event handlers
  dbPool.on('connect', (client: any) => {
    console.log(`[DB Pool] New client connected (${config.environment})`);
    
    // Set timezone for all connections
    client.query('SET timezone = "UTC"');
    
    // Set statement timeout for production
    if (config.environment === 'production') {
      client.query(`SET statement_timeout = ${config.statement_timeout || 60000}`);
    }
  });

  dbPool.on('acquire', (client: any) => {
    console.log(`[DB Pool] Client acquired from pool`);
  });

  dbPool.on('error', (err: Error, client: any) => {
    console.error('[DB Pool] Unexpected error on idle client:', err);
    // Don't exit the process on pool errors in production
    if (config.environment !== 'production') {
      process.exit(-1);
    }
  });

  dbPool.on('remove', (client: any) => {
    console.log('[DB Pool] Client removed from pool');
  });

  return dbPool;
}

// Initialize Supabase connection pool
export function initializeSupabasePool() {
  if (supabasePool) {
    return supabasePool;
  }

  const config = getCurrentConfig();
  
  // Enhanced Supabase client with connection pooling
  supabasePool = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=30, max=100',
        },
      },
      // Connection pooling settings
      realtime: {
        params: {
          eventsPerSecond: config.environment === 'production' ? 100 : 10,
        },
      },
    }
  );

  return supabasePool;
}

// Get database pool instance
export function getDbPool(): Pool {
  if (!dbPool) {
    return initializeDbPool();
  }
  return dbPool;
}

// Get Supabase pool instance
export function getSupabasePool() {
  if (!supabasePool) {
    return initializeSupabasePool();
  }
  return supabasePool;
}

// Execute query with pool
export async function executeQuery<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('[DB Pool] Query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute transaction with pool
export async function executeTransaction<T = any>(
  queries: Array<{ text: string; params?: any[] }>
): Promise<T[]> {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results: any[] = [];
    for (const query of queries) {
      const result = await client.query(query.text, query.params);
      results.push(result.rows);
    }
    
    await client.query('COMMIT');
    return results as T[];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB Pool] Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Health check for database pool
export async function checkDbPoolHealth(): Promise<{
  healthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  error?: string;
}> {
  try {
    const pool = getDbPool();
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    return {
      healthy: true,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    };
  } catch (error) {
    return {
      healthy: false,
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Graceful shutdown of pools
export async function shutdownPools(): Promise<void> {
  console.log('[DB Pool] Shutting down connection pools...');
  
  try {
    if (dbPool) {
      await dbPool.end();
      dbPool = null;
      console.log('[DB Pool] PostgreSQL pool closed');
    }
    
    if (supabasePool) {
      // Supabase doesn't have explicit close method
      supabasePool = null;
      console.log('[DB Pool] Supabase pool closed');
    }
  } catch (error) {
    console.error('[DB Pool] Error during shutdown:', error);
    throw error;
  }
}

// Pool monitoring and metrics
export class PoolMonitor {
  private static instance: PoolMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  static getInstance(): PoolMonitor {
    if (!PoolMonitor.instance) {
      PoolMonitor.instance = new PoolMonitor();
    }
    return PoolMonitor.instance;
  }
  
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      await this.logPoolStats();
    }, intervalMs);
    
    console.log('[DB Pool] Monitoring started');
  }
  
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('[DB Pool] Monitoring stopped');
  }
  
  private async logPoolStats(): Promise<void> {
    try {
      const pool = getDbPool();
      const health = await checkDbPoolHealth();
      
      console.log('[DB Pool] Stats:', {
        healthy: health.healthy,
        total: health.totalConnections,
        idle: health.idleConnections,
        waiting: health.waitingClients,
        environment: getCurrentConfig().environment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[DB Pool] Monitoring error:', error);
    }
  }
}

// Connection pool configuration validator
export function validatePoolConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required environment variables
  const requiredVars = [
    'SUPABASE_DB_HOST',
    'SUPABASE_DB_PASSWORD',
  ];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }
  
  // Check pool size configuration
  const poolSize = parseInt(process.env.DB_POOL_SIZE || '20');
  if (poolSize > 50) {
    warnings.push('Pool size is quite large, consider optimizing queries instead');
  }
  if (poolSize < 5 && process.env.NODE_ENV === 'production') {
    warnings.push('Pool size might be too small for production load');
  }
  
  // Check timeout configurations
  const connectionTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT || '20000');
  if (connectionTimeout > 30000) {
    warnings.push('Connection timeout is very high, this might mask connectivity issues');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Export pool instances for convenience
export const pools = {
  db: () => getDbPool(),
  supabase: () => getSupabasePool(),
};

// Initialize pools on module load in production
if (process.env.NODE_ENV === 'production') {
  initializeDbPool();
  initializeSupabasePool();
  
  // Start monitoring in production
  const monitor = PoolMonitor.getInstance();
  monitor.startMonitoring();
  
  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    console.log('[DB Pool] Received SIGTERM, shutting down gracefully...');
    monitor.stopMonitoring();
    await shutdownPools();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('[DB Pool] Received SIGINT, shutting down gracefully...');
    monitor.stopMonitoring();
    await shutdownPools();
    process.exit(0);
  });
}
