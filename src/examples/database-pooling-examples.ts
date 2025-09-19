/**
 * Database Connection Pooling Examples
 * 
 * This file demonstrates how to use the database connection pooling system
 * in various scenarios throughout the application.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  db, 
  getDatabaseConnectionService, 
  executeWithPool,
  getPooledClient,
  checkDatabaseHealth 
} from '@/services/database-connection.service';

// ===== EXAMPLE 1: Basic CRUD Operations =====

/**
 * Example: User management with pooled connections
 */
export async function userManagementExample() {
  try {
    // Create user (uses write pool)
    const newUser = await db.users.create({
      email: 'user@example.com',
      name: 'John Doe',
      role: 'buyer',
    });
    
    console.log('User created:', newUser.id);
    
    // Get user (uses read pool)
    const user = await db.users.get(newUser.id);
    console.log('User retrieved:', user.name);
    
    // Update user (uses write pool)
    const updatedUser = await db.users.update(newUser.id, {
      name: 'John Smith',
    });
    
    console.log('User updated:', updatedUser.name);
    
    return { success: true, userId: newUser.id };
  } catch (error) {
    console.error('User management failed:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ===== EXAMPLE 2: Product Search with Pooling =====

/**
 * Example: Product search API endpoint with connection pooling
 * File: src/app/api/products/search/route.ts
 */
export async function productSearchHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      query: searchParams.get('query') || '',
      category_id: searchParams.get('category_id') ? 
        parseInt(searchParams.get('category_id')!) : undefined,
      min_price: searchParams.get('min_price') ? 
        parseFloat(searchParams.get('min_price')!) : undefined,
      max_price: searchParams.get('max_price') ? 
        parseFloat(searchParams.get('max_price')!) : undefined,
      page: searchParams.get('page') ? 
        parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? 
        parseInt(searchParams.get('limit')!) : 20,
    };
    
    // Use pooled connection for search
    const results = await db.products.search(filters);
    
    return NextResponse.json({
      products: results,
      total: Array.isArray(results) ? results.length : 0,
      page: filters.page,
      limit: filters.limit,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

// ===== EXAMPLE 3: Transaction Example =====

/**
 * Example: Purchase processing with transaction
 */
export async function processPurchaseExample(purchaseData: {
  buyerId: string;
  productId: string;
  amount: number;
  paymentId: string;
}) {
  try {
    // Create purchase with database service
    const purchase = await db.purchases.create({
      buyer_id: purchaseData.buyerId,
      product_id: purchaseData.productId,
      payment_id: purchaseData.paymentId,
      amount: purchaseData.amount,
    });
    
    console.log('Purchase processed successfully:', purchase.id);
    return { success: true, purchaseId: purchase.id };
  } catch (error) {
    console.error('Purchase processing failed:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ===== EXAMPLE 4: Custom Pooled Operations =====

/**
 * Example: Custom database operation with direct pool access
 */
export async function customDatabaseOperation() {
  try {
    // Direct pool access for complex operations
    const result = await executeWithPool(async (client) => {
      // Complex query that needs custom logic
      const { data: products, error } = await client
        .from('products')
        .select(`
          *,
          shops:shop_id(*),
          categories:category_id(*),
          stats:product_stats(*),
          reviews:reviews(rating, content)
        `)
        .eq('status', 'active')
        .gte('rating_average', 4.0)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Process results
      const processedProducts = products.map((product: any) => ({
        ...product,
        averageRating: 0, // Would be calculated from actual stats
        reviewCount: 0, // Would be calculated from actual reviews
      }));
      
      return processedProducts;
    }, 'read'); // Specify read pool
    
    return result;
  } catch (error) {
    console.error('Custom operation failed:', error);
    throw error;
  }
}

// ===== EXAMPLE 5: Bulk Operations with Pooling =====

/**
 * Example: Bulk data processing with connection pooling
 */
export async function bulkDataProcessingExample(records: any[]) {
  const dbService = getDatabaseConnectionService();
  
  try {
    // Process records in batches to avoid overwhelming the pool
    const batchSize = 100;
    const results: any[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Use write pool for bulk insert (using existing table)
      const batchResult = await dbService.executeWrite(async (client) => {
        const results: any[] = [];
        for (const record of batch) {
          const { data, error } = await client
            .from('products')
            .insert(record)
            .select()
            .single();
          
          if (error) throw error;
          results.push(data);
        }
        return results;
      });
      
      results.push(...batchResult);
      
      // Small delay between batches to prevent overwhelming the database
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Processed ${results.length} records in ${Math.ceil(records.length / batchSize)} batches`);
    return results;
  } catch (error) {
    console.error('Bulk processing failed:', error);
    throw error;
  }
}

// ===== EXAMPLE 6: Health Monitoring Integration =====

/**
 * Example: Health monitoring and alerting
 */
export async function healthMonitoringExample() {
  try {
    // Get comprehensive health status
    const health = await checkDatabaseHealth();
    
    console.log('Database Status:', {
      overall: health.status,
      canConnect: health.details.canConnect,
      responseTime: health.details.responseTime,
      poolHealth: health.metrics.poolHealth,
      activeConnections: health.metrics.activeConnections,
      totalConnections: health.metrics.totalConnections,
    });
    
    // Check for issues that need attention
    if (health.status === 'unhealthy') {
      console.error('🚨 Database is unhealthy!');
      
      // Send alert (integrate with your alerting system)
      await sendAlert({
        level: 'critical',
        message: 'Database connection pool is unhealthy',
        metrics: health.metrics,
      });
    } else if (health.status === 'degraded') {
      console.warn('⚠️ Database performance is degraded');
      
      // Send warning
      await sendAlert({
        level: 'warning',
        message: 'Database connection pool performance is degraded',
        metrics: health.metrics,
      });
    }
    
    // Check for connection leaks
    if (health.metrics.connectionLeaks > 0) {
      console.warn(`🔍 Connection leaks detected: ${health.metrics.connectionLeaks}`);
    }
    
    return health;
  } catch (error) {
    console.error('Health monitoring failed:', error);
    throw error;
  }
}

// Mock alert function
async function sendAlert(alert: {
  level: 'info' | 'warning' | 'critical';
  message: string;
  metrics: any;
}) {
  // Integrate with your alerting system (Slack, Discord, email, etc.)
  console.log(`[${alert.level.toUpperCase()}] ${alert.message}`);
}

// ===== EXAMPLE 7: Performance Monitoring =====

/**
 * Example: Query performance monitoring
 */
export async function performanceMonitoringExample() {
  const dbService = getDatabaseConnectionService();
  
  try {
    // Get query metrics for the last hour
    const metrics = dbService.getQueryMetrics('hour');
    
    console.log('Query Performance Metrics:', {
      totalQueries: metrics.totalQueries,
      averageExecutionTime: metrics.averageExecutionTime,
      queryTypes: metrics.queryTypes,
      slowQueriesCount: metrics.slowQueries.length,
    });
    
    // Check for performance issues
    if (metrics.averageExecutionTime > 500) {
      console.warn('⚠️ Average query time is high:', metrics.averageExecutionTime + 'ms');
    }
    
    if (metrics.slowQueries.length > 0) {
      console.warn('🐌 Slow queries detected:');
      metrics.slowQueries.forEach((query, index) => {
        console.log(`  ${index + 1}. ${query.queryType}: ${query.executionTime}ms`);
      });
    }
    
    // Get connection pool status
    const poolStatus = dbService.getConnectionPoolStatus();
    console.log('Connection Pool Status:', {
      health: poolStatus.poolHealth,
      utilization: `${poolStatus.activeConnections}/${poolStatus.totalConnections}`,
      errorRate: poolStatus.failedRequests / Math.max(poolStatus.totalRequests, 1),
    });
    
    return {
      queryMetrics: metrics,
      poolStatus,
    };
  } catch (error) {
    console.error('Performance monitoring failed:', error);
    throw error;
  }
}

// ===== EXAMPLE 8: Graceful Shutdown Example =====

/**
 * Example: Graceful application shutdown
 */
export async function gracefulShutdownExample() {
  console.log('Starting graceful shutdown...');
  
  try {
    const dbService = getDatabaseConnectionService();
    
    // Get current status
    const activeTransactions = await dbService.getActiveTransactions();
    console.log(`Waiting for ${activeTransactions.length} active transactions...`);
    
    // Perform maintenance tasks
    const maintenanceResult = await dbService.performMaintenance();
    console.log('Maintenance completed:', maintenanceResult.success);
    
    // Shutdown database connections
    await dbService.shutdown();
    console.log('Database connections closed');
    
    console.log('✅ Graceful shutdown completed');
  } catch (error) {
    console.error('❌ Shutdown failed:', error);
    throw error;
  }
}

// ===== EXAMPLE 9: Error Handling and Recovery =====

/**
 * Example: Robust error handling with connection pooling
 */
export async function errorHandlingExample() {
  try {
    // Operation with automatic retry and error handling
    const result = await executeWithPool(async (client) => {
      // This operation will be retried automatically on failure
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('status', 'active')
        .limit(10);
      
      if (error) throw error;
      return data;
    }, 'read');
    
    return result;
  } catch (error) {
    console.error('Operation failed after retries:', error);
    
    // Check if it's a connection issue
    const health = await checkDatabaseHealth();
    if (!health.details.canConnect) {
      console.error('Database connectivity issue detected');
      // Implement fallback logic or circuit breaker
    }
    
    throw error;
  }
}

// ===== EXAMPLE 10: Load Testing Helper =====

/**
 * Example: Load testing the connection pool
 */
export async function loadTestExample(concurrency = 50, duration = 60000) {
  console.log(`Starting load test: ${concurrency} concurrent requests for ${duration}ms`);
  
  const startTime = Date.now();
  const requests: Promise<any>[] = [];
  let completedRequests = 0;
  let failedRequests = 0;
  
  // Generate load
  const generateLoad = async () => {
    while (Date.now() - startTime < duration) {
      try {
        await db.products.search({ limit: 10 });
        completedRequests++;
      } catch (error) {
        failedRequests++;
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };
  
  // Start concurrent load generators
  for (let i = 0; i < concurrency; i++) {
    requests.push(generateLoad());
  }
  
  // Wait for all to complete
  await Promise.allSettled(requests);
  
  // Get final metrics
  const health = await checkDatabaseHealth();
  const dbService = getDatabaseConnectionService();
  const queryMetrics = dbService.getQueryMetrics('hour');
  
  const results = {
    duration: Date.now() - startTime,
    completedRequests,
    failedRequests,
    requestsPerSecond: completedRequests / ((Date.now() - startTime) / 1000),
    errorRate: failedRequests / (completedRequests + failedRequests),
    finalPoolHealth: health.status,
    averageResponseTime: queryMetrics.averageExecutionTime,
  };
  
  console.log('Load test completed:', results);
  return results;
}

// Export all examples
export const examples = {
  userManagement: userManagementExample,
  productSearch: productSearchHandler,
  processPurchase: processPurchaseExample,
  customOperation: customDatabaseOperation,
  bulkProcessing: bulkDataProcessingExample,
  healthMonitoring: healthMonitoringExample,
  gracefulShutdown: gracefulShutdownExample,
  errorHandling: errorHandlingExample,
  loadTest: loadTestExample,
};

// Helper function for testing
export async function runAllExamples() {
  console.log('🧪 Running all database pooling examples...');
  
  try {
    // Run basic operations
    await userManagementExample();
    console.log('✅ User management example completed');
    
    // Run custom operations
    await customDatabaseOperation();
    console.log('✅ Custom operation example completed');
    
    // Run health monitoring
    await healthMonitoringExample();
    console.log('✅ Health monitoring example completed');
    
    // Run performance monitoring
    await performanceMonitoringExample();
    console.log('✅ Performance monitoring example completed');
    
    console.log('🎉 All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
    throw error;
  }
}
