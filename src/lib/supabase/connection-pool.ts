import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defaultLogger as logger } from '@/lib/logger';
import { Database } from '@/types/database';

/**
 * Supabase Connection Pool Manager
 * Manages multiple Supabase client connections with pooling, health monitoring, and graceful shutdown
 */

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number; // in milliseconds
  idleTimeout: number; // in milliseconds
  maxRetries: number;
  retryDelay: number; // base delay for exponential backoff
  healthCheckInterval: number; // in milliseconds
  leakDetectionTimeout: number; // in milliseconds
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingRequests: number;
  totalRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  connectionLeaks: number;
  lastHealthCheck: Date;
  poolHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export interface PooledConnection {
  id: string;
  client: SupabaseClient<Database>;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  requestCount: number;
  type: 'read' | 'write';
  leakTimer?: NodeJS.Timeout;
}

const DEFAULT_CONFIG: ConnectionPoolConfig = {
  minConnections: 5,
  maxConnections: 20,
  connectionTimeout: 30000, // 30 seconds
  idleTimeout: 300000, // 5 minutes
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  healthCheckInterval: 30000, // 30 seconds
  leakDetectionTimeout: 60000, // 1 minute
};

export class SupabaseConnectionPool {
  private config: ConnectionPoolConfig;
  private readPool: Map<string, PooledConnection> = new Map();
  private writePool: Map<string, PooledConnection> = new Map();
  private pendingRequests: Array<{
    resolve: (connection: PooledConnection) => void;
    reject: (error: Error) => void;
    type: 'read' | 'write';
    timestamp: Date;
  }> = [];
  
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    pendingRequests: 0,
    totalRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    connectionLeaks: 0,
    lastHealthCheck: new Date(),
    poolHealth: 'healthy',
  };

  private healthCheckTimer?: NodeJS.Timeout;
  private isShuttingDown = false;
  private responseTimes: number[] = [];

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing Supabase connection pools', {
        minConnections: this.config.minConnections,
        maxConnections: this.config.maxConnections,
      });

      // Create minimum connections for both pools
      const minPerPool = Math.ceil(this.config.minConnections / 2);
      
      // Initialize read pool
      for (let i = 0; i < minPerPool; i++) {
        const connection = await this.createConnection('read');
        this.readPool.set(connection.id, connection);
      }

      // Initialize write pool
      for (let i = 0; i < minPerPool; i++) {
        const connection = await this.createConnection('write');
        this.writePool.set(connection.id, connection);
      }

      this.updateMetrics();
      this.startHealthCheck();

      // Setup graceful shutdown handlers
      process.on('SIGTERM', () => this.gracefulShutdown());
      process.on('SIGINT', () => this.gracefulShutdown());
      process.on('beforeExit', () => this.gracefulShutdown());

      logger.info('Supabase connection pools initialized successfully', {
        readPoolSize: this.readPool.size,
        writePoolSize: this.writePool.size,
      });
    } catch (error) {
      logger.error('Failed to initialize connection pools:', error);
      throw error;
    }
  }

  private async createConnection(type: 'read' | 'write'): Promise<PooledConnection> {
    const connectionId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const client = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        type === 'read' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! : process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              'x-connection-id': connectionId,
              'x-connection-type': type,
            },
          },
        }
      );

      // Test the connection
      const { error } = await client.from('users').select('id').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned", which is OK
        throw error;
      }

      const connection: PooledConnection = {
        id: connectionId,
        client,
        isActive: false,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        requestCount: 0,
        type,
      };

      logger.debug('Created new database connection', {
        connectionId,
        type,
        totalConnections: this.getTotalConnections() + 1,
      });

      return connection;
    } catch (error) {
      logger.error('Failed to create database connection:', error);
      throw new Error(`Failed to create ${type} connection: ${error}`);
    }
  }

  public async getConnection(type: 'read' | 'write' = 'read'): Promise<PooledConnection> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    const startTime = Date.now();
    this.metrics.totalRequests++;
    this.metrics.pendingRequests++;

    try {
      const connection = await this.acquireConnection(type);
      
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift(); // Keep only last 100 response times
      }
      
      this.metrics.averageResponseTime = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
      
      this.metrics.pendingRequests--;
      
      // Set up leak detection
      this.setupLeakDetection(connection);
      
      return connection;
    } catch (error) {
      this.metrics.failedRequests++;
      this.metrics.pendingRequests--;
      logger.error('Failed to acquire database connection:', error);
      throw error;
    }
  }

  private async acquireConnection(type: 'read' | 'write'): Promise<PooledConnection> {
    const pool = type === 'read' ? this.readPool : this.writePool;
    
    // Try to find an idle connection
    for (const [id, connection] of pool.entries()) {
      if (!connection.isActive) {
        connection.isActive = true;
        connection.lastUsedAt = new Date();
        connection.requestCount++;
        this.updateMetrics();
        return connection;
      }
    }

    // No idle connections available, try to create a new one
    if (this.getTotalConnections() < this.config.maxConnections) {
      const newConnection = await this.createConnection(type);
      newConnection.isActive = true;
      newConnection.requestCount++;
      pool.set(newConnection.id, newConnection);
      this.updateMetrics();
      return newConnection;
    }

    // Pool is full, wait for a connection to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pendingRequests.findIndex(req => req.resolve === resolve);
        if (index !== -1) {
          this.pendingRequests.splice(index, 1);
        }
        reject(new Error(`Connection timeout after ${this.config.connectionTimeout}ms`));
      }, this.config.connectionTimeout);

      this.pendingRequests.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        type,
        timestamp: new Date(),
      });
    });
  }

  public releaseConnection(connection: PooledConnection): void {
    if (!connection.isActive) {
      logger.warn('Attempting to release an already released connection', {
        connectionId: connection.id,
      });
      return;
    }

    connection.isActive = false;
    connection.lastUsedAt = new Date();
    
    // Clear leak detection timer
    if (connection.leakTimer) {
      clearTimeout(connection.leakTimer);
      delete connection.leakTimer;
    }

    // Check if there are pending requests
    const pendingRequest = this.pendingRequests.find(req => req.type === connection.type);
    if (pendingRequest) {
      const index = this.pendingRequests.indexOf(pendingRequest);
      this.pendingRequests.splice(index, 1);
      
      connection.isActive = true;
      connection.requestCount++;
      this.setupLeakDetection(connection);
      pendingRequest.resolve(connection);
    }

    this.updateMetrics();
    
    logger.debug('Released database connection', {
      connectionId: connection.id,
      type: connection.type,
      requestCount: connection.requestCount,
    });
  }

  private setupLeakDetection(connection: PooledConnection): void {
    connection.leakTimer = setTimeout(() => {
      if (connection.isActive) {
        logger.warn('Potential connection leak detected', {
          connectionId: connection.id,
          type: connection.type,
          activeFor: Date.now() - connection.lastUsedAt.getTime(),
        });
        
        this.metrics.connectionLeaks++;
        
        // Force release the connection
        this.releaseConnection(connection);
      }
    }, this.config.leakDetectionTimeout);
  }

  private updateMetrics(): void {
    const readActive = Array.from(this.readPool.values()).filter(conn => conn.isActive).length;
    const writeActive = Array.from(this.writePool.values()).filter(conn => conn.isActive).length;
    
    this.metrics.totalConnections = this.readPool.size + this.writePool.size;
    this.metrics.activeConnections = readActive + writeActive;
    this.metrics.idleConnections = this.metrics.totalConnections - this.metrics.activeConnections;
    
    // Determine pool health
    const utilizationRate = this.metrics.activeConnections / this.metrics.totalConnections;
    const errorRate = this.metrics.failedRequests / Math.max(this.metrics.totalRequests, 1);
    
    if (errorRate > 0.1 || utilizationRate > 0.9) {
      this.metrics.poolHealth = 'unhealthy';
    } else if (errorRate > 0.05 || utilizationRate > 0.7) {
      this.metrics.poolHealth = 'degraded';
    } else {
      this.metrics.poolHealth = 'healthy';
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const healthPromises: Promise<void>[] = [];
      
      // Check read pool health
      for (const [id, connection] of this.readPool.entries()) {
        if (!connection.isActive) {
          healthPromises.push(this.checkConnectionHealth(connection, id));
        }
      }
      
      // Check write pool health
      for (const [id, connection] of this.writePool.entries()) {
        if (!connection.isActive) {
          healthPromises.push(this.checkConnectionHealth(connection, id));
        }
      }
      
      await Promise.allSettled(healthPromises);
      
      // Clean up idle connections if needed
      await this.cleanupIdleConnections();
      
      this.metrics.lastHealthCheck = new Date();
      this.updateMetrics();
      
      logger.debug('Health check completed', {
        poolHealth: this.metrics.poolHealth,
        totalConnections: this.metrics.totalConnections,
        activeConnections: this.metrics.activeConnections,
      });
    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }

  private async checkConnectionHealth(connection: PooledConnection, connectionId: string): Promise<void> {
    try {
      const { error } = await connection.client.from('users').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
    } catch (error) {
      logger.warn('Unhealthy connection detected, removing from pool', {
        connectionId,
        type: connection.type,
        error: error,
      });
      
      // Remove unhealthy connection
      const pool = connection.type === 'read' ? this.readPool : this.writePool;
      pool.delete(connectionId);
      
      // Create replacement connection if below minimum
      const minPerPool = Math.ceil(this.config.minConnections / 2);
      if (pool.size < minPerPool) {
        try {
          const newConnection = await this.createConnection(connection.type);
          pool.set(newConnection.id, newConnection);
        } catch (createError) {
          logger.error('Failed to create replacement connection:', createError);
        }
      }
    }
  }

  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();
    const pools = [
      { pool: this.readPool, type: 'read' as const },
      { pool: this.writePool, type: 'write' as const },
    ];
    
    for (const { pool, type } of pools) {
      const minPerPool = Math.ceil(this.config.minConnections / 2);
      
      for (const [id, connection] of pool.entries()) {
        const idleTime = now - connection.lastUsedAt.getTime();
        
        if (
          !connection.isActive &&
          idleTime > this.config.idleTimeout &&
          pool.size > minPerPool
        ) {
          pool.delete(id);
          logger.debug('Removed idle connection', {
            connectionId: id,
            type,
            idleTime,
          });
        }
      }
    }
  }

  public getMetrics(): ConnectionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  public async executeWithRetry<T>(
    operation: (client: SupabaseClient<Database>) => Promise<T>,
    type: 'read' | 'write' = 'read'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      let connection: PooledConnection | null = null;
      
      try {
        connection = await this.getConnection(type);
        const result = await operation(connection.client);
        this.releaseConnection(connection);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (connection) {
          this.releaseConnection(connection);
        }
        
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`Database operation failed, retrying in ${delay}ms`, {
            attempt,
            maxRetries: this.config.maxRetries,
            error: error,
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  private getTotalConnections(): number {
    return this.readPool.size + this.writePool.size;
  }

  public async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    logger.info('Starting graceful shutdown of connection pools');
    
    try {
      // Stop health checks
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
      }
      
      // Wait for active connections to finish (with timeout)
      const shutdownTimeout = 30000; // 30 seconds
      const startTime = Date.now();
      
      while (this.metrics.activeConnections > 0 && Date.now() - startTime < shutdownTimeout) {
        logger.info(`Waiting for ${this.metrics.activeConnections} active connections to finish...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.updateMetrics();
      }
      
      // Force close remaining connections
      for (const connection of this.readPool.values()) {
        if (connection.leakTimer) {
          clearTimeout(connection.leakTimer);
        }
      }
      
      for (const connection of this.writePool.values()) {
        if (connection.leakTimer) {
          clearTimeout(connection.leakTimer);
        }
      }
      
      this.readPool.clear();
      this.writePool.clear();
      
      logger.info('Connection pools shutdown completed', {
        finalMetrics: this.getMetrics(),
      });
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
    }
  }
}

// Singleton instance
let connectionPool: SupabaseConnectionPool | null = null;

export function getConnectionPool(): SupabaseConnectionPool {
  if (!connectionPool) {
    connectionPool = new SupabaseConnectionPool();
  }
  return connectionPool;
}

export async function executeWithPool<T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>,
  type: 'read' | 'write' = 'read'
): Promise<T> {
  const pool = getConnectionPool();
  return pool.executeWithRetry(operation, type);
}

// Helper function for health checks
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: ConnectionMetrics;
  details: {
    canConnect: boolean;
    responseTime: number;
    poolStatus: string;
  };
}> {
  const pool = getConnectionPool();
  const metrics = pool.getMetrics();
  
  let canConnect = false;
  let responseTime = 0;
  
  try {
    const startTime = Date.now();
    await executeWithPool(async (client) => {
      const { error } = await client.from('users').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return true;
    });
    responseTime = Date.now() - startTime;
    canConnect = true;
  } catch (error) {
    logger.error('Database health check failed:', error);
  }
  
  return {
    status: metrics.poolHealth,
    metrics,
    details: {
      canConnect,
      responseTime,
      poolStatus: `${metrics.activeConnections}/${metrics.totalConnections} active`,
    },
  };
}
