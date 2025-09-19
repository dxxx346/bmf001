import { SupabaseClient } from '@supabase/supabase-js';
import { getPooledClient, DatabaseOperations, getDatabaseOperations } from '@/lib/supabase/pooled-client';
import { getConnectionPool } from '@/lib/supabase/connection-pool';
import { defaultLogger as logger } from '@/lib/logger';
import { Database } from '@/types/database';

/**
 * Database Connection Service
 * High-level service for managing database operations with connection pooling
 */

export interface DatabaseTransaction {
  id: string;
  operations: Array<{
    table: string;
    operation: 'insert' | 'update' | 'delete' | 'select';
    data?: any;
    conditions?: any;
  }>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export interface QueryMetrics {
  queryType: string;
  executionTime: number;
  rowsAffected: number;
  cacheHit: boolean;
  timestamp: Date;
}

export class DatabaseConnectionService {
  private pooledClient = getPooledClient();
  private dbOperations = getDatabaseOperations();
  private connectionPool = getConnectionPool();
  private queryMetrics: QueryMetrics[] = [];
  private activeTransactions = new Map<string, DatabaseTransaction>();

  // =============================================
  // CONNECTION MANAGEMENT
  // =============================================

  /**
   * Execute a read-only operation with automatic connection pooling
   */
  async executeRead<T>(
    operation: (client: SupabaseClient<Database>) => Promise<T>,
    options?: {
      timeout?: number;
      retries?: number;
      cacheable?: boolean;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.pooledClient.read(operation, options);
      
      this.recordQueryMetrics({
        queryType: 'read',
        executionTime: Date.now() - startTime,
        rowsAffected: Array.isArray(result) ? result.length : 1,
        cacheHit: false,
        timestamp: new Date(),
      });
      
      return result;
    } catch (error) {
      logger.error('Read operation failed:', error);
      throw error;
    }
  }

  /**
   * Execute a write operation with automatic connection pooling
   */
  async executeWrite<T>(
    operation: (client: SupabaseClient<Database>) => Promise<T>,
    options?: {
      timeout?: number;
      retries?: number;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.pooledClient.write(operation, options);
      
      this.recordQueryMetrics({
        queryType: 'write',
        executionTime: Date.now() - startTime,
        rowsAffected: Array.isArray(result) ? result.length : 1,
        cacheHit: false,
        timestamp: new Date(),
      });
      
      return result;
    } catch (error) {
      logger.error('Write operation failed:', error);
      throw error;
    }
  }

  /**
   * Execute multiple operations as a transaction
   */
  async executeTransaction<T>(
    operations: Array<(client: SupabaseClient<Database>) => Promise<any>>,
    options?: {
      timeout?: number;
      retries?: number;
    }
  ): Promise<T[]> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transaction: DatabaseTransaction = {
      id: transactionId,
      operations: [], // Would be populated with operation details
      status: 'pending',
      startTime: new Date(),
    };
    
    this.activeTransactions.set(transactionId, transaction);
    
    try {
      transaction.status = 'executing';
      const startTime = Date.now();
      
      const results = await this.pooledClient.transaction<T>(operations, options);
      
      transaction.status = 'completed';
      transaction.endTime = new Date();
      
      this.recordQueryMetrics({
        queryType: 'transaction',
        executionTime: Date.now() - startTime,
        rowsAffected: results.length,
        cacheHit: false,
        timestamp: new Date(),
      });
      
      logger.info('Transaction completed successfully', {
        transactionId,
        operationCount: operations.length,
        duration: Date.now() - startTime,
      });
      
      return results;
    } catch (error) {
      transaction.status = 'failed';
      transaction.error = error instanceof Error ? error.message : 'Unknown error';
      transaction.endTime = new Date();
      
      logger.error('Transaction failed:', {
        transactionId,
        error,
        operationCount: operations.length,
      });
      
      throw error;
    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  // =============================================
  // HIGH-LEVEL DATABASE OPERATIONS
  // =============================================

  /**
   * Safe user operations with validation
   */
  async getUser(userId: string) {
    if (!this.isValidUUID(userId)) {
      throw new Error('Invalid user ID format');
    }
    
    return this.executeRead(async (client) => {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async createUser(userData: any) {
    return this.executeWrite(async (client) => {
      const { data, error } = await client
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  /**
   * Safe product operations with validation
   */
  async getProduct(productId: string) {
    if (!this.isValidUUID(productId)) {
      throw new Error('Invalid product ID format');
    }
    
    return this.executeRead(async (client) => {
      const { data, error } = await client
        .from('products')
        .select(`
          *,
          shops:shop_id(*),
          categories:category_id(*),
          files:product_files(*),
          images:product_images(*)
        `)
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async searchProducts(filters: any) {
    return this.executeRead(async (client) => {
      // Use safe query instead of RPC for now
      let query = client.from('products').select('*');
      
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      
      if (filters.min_price) {
        query = query.gte('price', filters.min_price);
      }
      
      if (filters.max_price) {
        query = query.lte('price', filters.max_price);
      }
      
      const { data, error } = await query
        .eq('status', 'active')
        .order(filters.sort_by || 'created_at', { 
          ascending: filters.sort_order === 'asc' 
        })
        .range(
          ((filters.page || 1) - 1) * (filters.limit || 20),
          (filters.page || 1) * (filters.limit || 20) - 1
        );
      
      if (error) throw error;
      return data;
    });
  }

  /**
   * Safe purchase operations
   */
  async createPurchase(purchaseData: any) {
    return this.executeWrite(async (client) => {
      // Create purchase record
      const { data, error } = await client
        .from('purchases')
        .insert(purchaseData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  // =============================================
  // ANALYTICS AND MONITORING
  // =============================================

  private recordQueryMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics.shift();
    }
  }

  public getQueryMetrics(timeframe: 'hour' | 'day' | 'week' = 'hour'): {
    totalQueries: number;
    averageExecutionTime: number;
    queryTypes: Record<string, number>;
    slowQueries: QueryMetrics[];
    errorRate: number;
  } {
    const now = Date.now();
    const timeframes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };
    
    const cutoff = now - timeframes[timeframe];
    const relevantMetrics = this.queryMetrics.filter(
      metric => metric.timestamp.getTime() > cutoff
    );
    
    const totalQueries = relevantMetrics.length;
    const averageExecutionTime = totalQueries > 0
      ? relevantMetrics.reduce((sum, metric) => sum + metric.executionTime, 0) / totalQueries
      : 0;
    
    const queryTypes = relevantMetrics.reduce((acc, metric) => {
      acc[metric.queryType] = (acc[metric.queryType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const slowQueries = relevantMetrics
      .filter(metric => metric.executionTime > 1000) // Queries taking more than 1 second
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);
    
    return {
      totalQueries,
      averageExecutionTime: Math.round(averageExecutionTime),
      queryTypes,
      slowQueries,
      errorRate: 0, // Would be calculated from actual error tracking
    };
  }

  public getConnectionPoolStatus() {
    return this.connectionPool.getMetrics();
  }

  public async getActiveTransactions(): Promise<DatabaseTransaction[]> {
    return Array.from(this.activeTransactions.values());
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Perform database maintenance tasks
   */
  async performMaintenance(): Promise<{
    success: boolean;
    tasks: Array<{
      name: string;
      status: 'completed' | 'failed';
      duration: number;
      error?: string;
    }>;
  }> {
    const tasks: Array<{
      name: string;
      status: 'completed' | 'failed';
      duration: number;
      error?: string;
    }> = [];

    // Cleanup old query metrics
    const cleanupStart = Date.now();
    try {
      const oldMetrics = this.queryMetrics.length;
      this.queryMetrics = this.queryMetrics.slice(-500); // Keep only last 500
      
      tasks.push({
        name: 'cleanup_query_metrics',
        status: 'completed',
        duration: Date.now() - cleanupStart,
      });
      
      logger.info('Query metrics cleanup completed', {
        removedMetrics: oldMetrics - this.queryMetrics.length,
      });
    } catch (error) {
      tasks.push({
        name: 'cleanup_query_metrics',
        status: 'failed',
        duration: Date.now() - cleanupStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Cleanup completed transactions
    const transactionCleanupStart = Date.now();
    try {
      const oldTransactions = this.activeTransactions.size;
      const now = Date.now();
      
      for (const [id, transaction] of this.activeTransactions.entries()) {
        if (transaction.status === 'completed' || transaction.status === 'failed') {
          const age = now - transaction.startTime.getTime();
          if (age > 300000) { // 5 minutes
            this.activeTransactions.delete(id);
          }
        }
      }
      
      tasks.push({
        name: 'cleanup_old_transactions',
        status: 'completed',
        duration: Date.now() - transactionCleanupStart,
      });
      
      logger.info('Transaction cleanup completed', {
        removedTransactions: oldTransactions - this.activeTransactions.size,
      });
    } catch (error) {
      tasks.push({
        name: 'cleanup_old_transactions',
        status: 'failed',
        duration: Date.now() - transactionCleanupStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const allSuccessful = tasks.every(task => task.status === 'completed');
    
    return {
      success: allSuccessful,
      tasks,
    };
  }

  /**
   * Graceful shutdown of all database connections
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down database connection service');
    
    try {
      // Complete any pending transactions
      const pendingTransactions = Array.from(this.activeTransactions.values())
        .filter(txn => txn.status === 'executing');
      
      if (pendingTransactions.length > 0) {
        logger.info(`Waiting for ${pendingTransactions.length} pending transactions to complete`);
        
        // Wait up to 30 seconds for transactions to complete
        const timeout = 30000;
        const startTime = Date.now();
        
        while (
          this.activeTransactions.size > 0 && 
          Date.now() - startTime < timeout
        ) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Shutdown the connection pool
      await this.pooledClient.shutdown();
      
      logger.info('Database connection service shutdown completed');
    } catch (error) {
      logger.error('Error during database connection service shutdown:', error);
    }
  }
}

// Singleton instance
let databaseConnectionService: DatabaseConnectionService | null = null;

export function getDatabaseConnectionService(): DatabaseConnectionService {
  if (!databaseConnectionService) {
    databaseConnectionService = new DatabaseConnectionService();
  }
  return databaseConnectionService;
}

// Export commonly used operations
export const db = {
  // User operations
  users: {
    get: (id: string) => getDatabaseOperations().getUser(id),
    create: (data: any) => getDatabaseOperations().createUser(data),
    update: (id: string, data: any) => getDatabaseOperations().updateUser(id, data),
  },
  
  // Product operations
  products: {
    get: (id: string) => getDatabaseOperations().getProducts({ id }),
    create: (data: any) => getDatabaseOperations().createProduct(data),
    update: (id: string, data: any) => getDatabaseOperations().updateProduct(id, data),
    search: (filters: any) => getDatabaseConnectionService().searchProducts(filters),
  },
  
  // Purchase operations
  purchases: {
    create: (data: any) => getDatabaseOperations().createPurchase(data),
    getUserPurchases: (userId: string) => getDatabaseOperations().getUserPurchases(userId),
  },
  
  // Analytics operations
  analytics: {
    get: (type: string, filters: any) => getDatabaseOperations().getAnalytics(type, filters),
  },
  
  // Health and monitoring
  health: {
    check: () => getDatabaseOperations().healthCheck(),
    getMetrics: () => getDatabaseConnectionService().getConnectionPoolStatus(),
    getQueryMetrics: (timeframe?: 'hour' | 'day' | 'week') => 
      getDatabaseConnectionService().getQueryMetrics(timeframe),
  },
  
  // Transaction support
  transaction: (operations: Array<(client: SupabaseClient<Database>) => Promise<any>>) =>
    getDatabaseConnectionService().executeTransaction(operations),
};

// Export for direct access when needed
export { getPooledClient, getDatabaseOperations } from '@/lib/supabase/pooled-client';
export { getConnectionPool, checkDatabaseHealth, executeWithPool } from '@/lib/supabase/connection-pool';
