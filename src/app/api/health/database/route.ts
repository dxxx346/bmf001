import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/supabase/connection-pool';
import { defaultLogger as logger } from '@/lib/logger';

/**
 * Database Health Check API Endpoint
 * Returns comprehensive database connection pool health information
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info('Database health check requested', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Perform comprehensive health check
    const healthResult = await checkDatabaseHealth();
    const totalTime = Date.now() - startTime;

    const response = {
      status: healthResult.status,
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      database: {
        connection: {
          status: healthResult.details.canConnect ? 'connected' : 'disconnected',
          responseTime: healthResult.details.responseTime,
          poolStatus: healthResult.details.poolStatus,
        },
        pool: {
          health: healthResult.metrics.poolHealth,
          connections: {
            total: healthResult.metrics.totalConnections,
            active: healthResult.metrics.activeConnections,
            idle: healthResult.metrics.idleConnections,
            pending: healthResult.metrics.pendingRequests,
          },
          performance: {
            totalRequests: healthResult.metrics.totalRequests,
            failedRequests: healthResult.metrics.failedRequests,
            averageResponseTime: Math.round(healthResult.metrics.averageResponseTime),
            errorRate: healthResult.metrics.totalRequests > 0 
              ? Math.round((healthResult.metrics.failedRequests / healthResult.metrics.totalRequests) * 100) / 100
              : 0,
          },
          monitoring: {
            connectionLeaks: healthResult.metrics.connectionLeaks,
            lastHealthCheck: healthResult.metrics.lastHealthCheck.toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
          },
        },
      },
      checks: [
        {
          name: 'database_connectivity',
          status: healthResult.details.canConnect ? 'pass' : 'fail',
          responseTime: healthResult.details.responseTime,
        },
        {
          name: 'connection_pool_health',
          status: healthResult.metrics.poolHealth === 'healthy' ? 'pass' : 
                  healthResult.metrics.poolHealth === 'degraded' ? 'warn' : 'fail',
          details: {
            utilizationRate: healthResult.metrics.totalConnections > 0 
              ? Math.round((healthResult.metrics.activeConnections / healthResult.metrics.totalConnections) * 100) / 100
              : 0,
            errorRate: healthResult.metrics.totalRequests > 0 
              ? Math.round((healthResult.metrics.failedRequests / healthResult.metrics.totalRequests) * 100) / 100
              : 0,
          },
        },
        {
          name: 'connection_leaks',
          status: healthResult.metrics.connectionLeaks === 0 ? 'pass' : 'warn',
          leakCount: healthResult.metrics.connectionLeaks,
        },
        {
          name: 'pending_requests',
          status: healthResult.metrics.pendingRequests < 10 ? 'pass' : 'warn',
          pendingCount: healthResult.metrics.pendingRequests,
        },
      ],
    };

    // Determine HTTP status code based on overall health
    let httpStatus = 200;
    if (healthResult.status === 'unhealthy' || !healthResult.details.canConnect) {
      httpStatus = 503; // Service Unavailable
    } else if (healthResult.status === 'degraded') {
      httpStatus = 200; // OK but with warnings
    }

    // Log health check results
    logger.info('Database health check completed', {
      status: healthResult.status,
      totalTime,
      httpStatus,
      connectionPool: {
        total: healthResult.metrics.totalConnections,
        active: healthResult.metrics.activeConnections,
        health: healthResult.metrics.poolHealth,
      },
    });

    // Add cache headers to prevent caching of health checks
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Health-Check-Time': totalTime.toString(),
      'X-Pool-Health': healthResult.status,
    });

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: httpStatus,
      headers,
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    logger.error('Database health check failed:', error);

    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      error: {
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      database: {
        connection: {
          status: 'error',
          responseTime: totalTime,
        },
      },
    };

    return new NextResponse(JSON.stringify(errorResponse, null, 2), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Time': totalTime.toString(),
        'X-Pool-Health': 'unhealthy',
      },
    });
  }
}

/**
 * Health check endpoint also supports HEAD requests for simple availability checks
 */
export async function HEAD(request: NextRequest) {
  try {
    const healthResult = await checkDatabaseHealth();
    
    let httpStatus = 200;
    if (healthResult.status === 'unhealthy' || !healthResult.details.canConnect) {
      httpStatus = 503;
    }

    return new NextResponse(null, {
      status: httpStatus,
      headers: {
        'X-Pool-Health': healthResult.status,
        'X-Active-Connections': healthResult.metrics.activeConnections.toString(),
        'X-Total-Connections': healthResult.metrics.totalConnections.toString(),
      },
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Pool-Health': 'unhealthy',
      },
    });
  }
}
