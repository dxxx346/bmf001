import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/services/monitoring.service';
import { requireRole } from '@/middleware/auth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  return requireRole(['admin'])(async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || '24h';
      const metric = searchParams.get('metric');

      let data;

      switch (metric) {
        case 'system_health':
          data = await monitoringService.getSystemHealth();
          break;
        case 'response_time':
          data = await monitoringService.getResponseTimeMetrics();
          break;
        case 'sales_metrics':
          data = await monitoringService.getSalesMetrics(period);
          break;
        case 'payment_metrics':
          data = await monitoringService.getPaymentMetrics(period);
          break;
        case 'top_products':
          const productLimit = parseInt(searchParams.get('limit') || '10');
          data = await monitoringService.getTopProducts(productLimit, period);
          break;
        case 'top_shops':
          const shopLimit = parseInt(searchParams.get('limit') || '10');
          data = await monitoringService.getTopShops(shopLimit, period);
          break;
        case 'user_activity':
          data = await monitoringService.getUserActivity(period);
          break;
        case 'user_activity_heatmap':
          data = await monitoringService.getUserActivityHeatmap(period);
          break;
        case 'error_metrics':
          data = await monitoringService.getErrorMetrics(period);
          break;
        default:
          data = await monitoringService.getDashboardData(period);
      }

      return NextResponse.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get monitoring data', { error, metric: req.url ? new URL(req.url).searchParams.get('metric') : null });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get monitoring data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return requireRole(['admin'])(async (req, context) => {
    try {
      const body = await request.json();
      const { action, data } = body;

      switch (action) {
        case 'record_response_time':
          if (typeof data.duration === 'number') {
            monitoringService.recordResponseTime(data.duration);
            return NextResponse.json({ success: true });
          }
          break;

        case 'record_error':
          monitoringService.recordError(data.error, data.context);
          return NextResponse.json({ success: true });

        case 'clear_cache':
          // Clear monitoring cache
          const { redis } = await import('@/lib/redis');
          const keys = await redis.keys('monitoring:*');
          if (keys.length > 0) {
            await redis.del(...keys);
          }
          return NextResponse.json({ success: true });

        default:
          return NextResponse.json(
            { success: false, error: 'Unknown action' },
            { status: 400 }
          );
      }

      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    } catch (error) {
      logger.error('Failed to process monitoring action', { error });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process action',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}
