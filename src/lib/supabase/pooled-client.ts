import { SupabaseClient } from '@supabase/supabase-js';
import { executeWithPool, getConnectionPool } from './connection-pool';
import { Database } from '@/types/database';
import { defaultLogger as logger } from '@/lib/logger';

/**
 * Pooled Supabase Client
 * Wrapper around Supabase client that uses connection pooling
 */

export class PooledSupabaseClient {
  private connectionPool = getConnectionPool();

  /**
   * Execute a read operation using a pooled connection
   */
  async read<T>(
    operation: (client: SupabaseClient<Database>) => Promise<T>,
    options?: {
      retries?: number;
      timeout?: number;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await executeWithPool(operation, 'read');
      
      const duration = Date.now() - startTime;
      logger.debug('Read operation completed', {
        duration,
        operation: operation.name || 'anonymous',
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Read operation failed', {
        duration,
        error,
        operation: operation.name || 'anonymous',
      });
      throw error;
    }
  }

  /**
   * Execute a write operation using a pooled connection
   */
  async write<T>(
    operation: (client: SupabaseClient<Database>) => Promise<T>,
    options?: {
      retries?: number;
      timeout?: number;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await executeWithPool(operation, 'write');
      
      const duration = Date.now() - startTime;
      logger.debug('Write operation completed', {
        duration,
        operation: operation.name || 'anonymous',
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Write operation failed', {
        duration,
        error,
        operation: operation.name || 'anonymous',
      });
      throw error;
    }
  }

  /**
   * Execute a transaction using a pooled write connection
   */
  async transaction<T>(
    operations: Array<(client: SupabaseClient<Database>) => Promise<any>>,
    options?: {
      retries?: number;
      timeout?: number;
    }
  ): Promise<T[]> {
    return this.write(async (client) => {
      const results: T[] = [];
      
      // Note: Supabase doesn't have explicit transaction support,
      // but we can ensure all operations use the same connection
      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }
      
      return results;
    }, options);
  }

  /**
   * Get connection pool metrics
   */
  getPoolMetrics() {
    return this.connectionPool.getMetrics();
  }

  /**
   * Graceful shutdown of the connection pool
   */
  async shutdown(): Promise<void> {
    await this.connectionPool.gracefulShutdown();
  }
}

// Helper functions for common database operations
export class DatabaseOperations {
  private client = new PooledSupabaseClient();

  // User operations
  async getUser(userId: string) {
    return this.client.read(async (client) => {
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
    return this.client.write(async (client) => {
      const { data, error } = await client
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async updateUser(userId: string, updates: any) {
    return this.client.write(async (client) => {
      const { data, error } = await client
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  // Product operations
  async getProducts(filters: any = {}) {
    return this.client.read(async (client) => {
      let query = client.from('products').select(`
        *,
        shops:shop_id(*),
        categories:category_id(*)
      `);

      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      
      if (filters.seller_id) {
        query = query.eq('seller_id', filters.seller_id);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    });
  }

  async createProduct(productData: any) {
    return this.client.write(async (client) => {
      const { data, error } = await client
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async updateProduct(productId: string, updates: any) {
    return this.client.write(async (client) => {
      const { data, error } = await client
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  // Purchase operations
  async createPurchase(purchaseData: any) {
    return this.client.write(async (client) => {
      const { data, error } = await client
        .from('purchases')
        .insert(purchaseData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async getUserPurchases(userId: string) {
    return this.client.read(async (client) => {
      const { data, error } = await client
        .from('purchases')
        .select(`
          *,
          products:product_id(*)
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    });
  }

  // Analytics operations
  async getAnalytics(type: string, filters: any = {}) {
    return this.client.read(async (client) => {
      // Use existing purchases table for analytics
      const { data, error } = await client
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    });
  }

  // Batch operations
  async batchInsertProducts(records: any[]) {
    return this.client.write(async (client) => {
      const { data, error } = await client
        .from('products')
        .insert(records)
        .select();
      
      if (error) throw error;
      return data;
    });
  }

  async batchUpdateProducts(updates: Array<{ id: string; data: any }>) {
    const results: any[] = [];
    for (const update of updates) {
      const result = await this.client.write(async (client) => {
        const { data, error } = await client
          .from('products')
          .update(update.data)
          .eq('id', update.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      });
      results.push(result);
    }
    return results;
  }

  // Health check operation
  async healthCheck() {
    return this.client.read(async (client) => {
      const { error } = await client
        .from('users')
        .select('id')
        .limit(1);
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return { healthy: true, timestamp: new Date() };
    });
  }
}

// Singleton instances
let pooledClient: PooledSupabaseClient | null = null;
let databaseOperations: DatabaseOperations | null = null;

export function getPooledClient(): PooledSupabaseClient {
  if (!pooledClient) {
    pooledClient = new PooledSupabaseClient();
  }
  return pooledClient;
}

export function getDatabaseOperations(): DatabaseOperations {
  if (!databaseOperations) {
    databaseOperations = new DatabaseOperations();
  }
  return databaseOperations;
}

// Helper function to execute safe database operations
export async function executeSafeQuery<T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>,
  type: 'read' | 'write' = 'read'
): Promise<T> {
  return executeWithPool(operation, type);
}
