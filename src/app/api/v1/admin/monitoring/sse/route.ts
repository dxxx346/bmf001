import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/middleware/auth';
import { monitoringService } from '@/services/monitoring.service';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  return requireRole(['admin'])(async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const interval = parseInt(searchParams.get('interval') || '5000'); // Default 5 seconds
      const metrics = searchParams.get('metrics')?.split(',') || ['system_health', 'response_time'];

      // Create a readable stream for SSE
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          
          // Send initial connection message
          const sendEvent = (data: any, eventType: string = 'data') => {
            const eventData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(eventData));
          };

          // Send connection established event
          sendEvent({ 
            type: 'connection_established', 
            timestamp: new Date().toISOString(),
            interval,
            metrics 
          }, 'connected');

          // Function to collect and send metrics
          const collectAndSendMetrics = async () => {
            try {
              const metricsData: Record<string, any> = {};
              
              // Collect requested metrics
              for (const metric of metrics) {
                switch (metric) {
                  case 'system_health':
                    metricsData.system_health = await monitoringService.getSystemHealth();
                    break;
                  case 'response_time':
                    metricsData.response_time = await monitoringService.getResponseTimeMetrics();
                    break;
                  case 'sales_metrics':
                    metricsData.sales_metrics = await monitoringService.getSalesMetrics('1h');
                    break;
                  case 'payment_metrics':
                    metricsData.payment_metrics = await monitoringService.getPaymentMetrics('1h');
                    break;
                  case 'user_activity':
                    metricsData.user_activity = await monitoringService.getUserActivity('1h');
                    break;
                  case 'error_metrics':
                    metricsData.error_metrics = await monitoringService.getErrorMetrics('1h');
                    break;
                  case 'top_products':
                    metricsData.top_products = await monitoringService.getTopProducts(5, '1h');
                    break;
                  case 'top_shops':
                    metricsData.top_shops = await monitoringService.getTopShops(5, '1h');
                    break;
                }
              }

              // Send metrics data
              sendEvent({
                type: 'metrics_update',
                data: metricsData,
                timestamp: new Date().toISOString()
              });

            } catch (error) {
              logger.error('Failed to collect metrics for SSE', { error, metrics });
              sendEvent({
                type: 'error',
                message: 'Failed to collect metrics',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
              }, 'error');
            }
          };

          // Send initial metrics
          collectAndSendMetrics();

          // Set up interval for periodic updates
          const intervalId = setInterval(collectAndSendMetrics, interval);

          // Handle client disconnect
          const cleanup = () => {
            clearInterval(intervalId);
            try {
              controller.close();
            } catch (error) {
              // Controller might already be closed
            }
          };

          // Listen for client disconnect
          req.signal?.addEventListener('abort', cleanup);

          // Send heartbeat every 30 seconds to keep connection alive
          const heartbeatId = setInterval(() => {
            try {
              sendEvent({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
              }, 'heartbeat');
            } catch (error) {
              cleanup();
            }
          }, 30000);

          // Cleanup heartbeat on disconnect
          req.signal?.addEventListener('abort', () => {
            clearInterval(heartbeatId);
            cleanup();
          });

        },
        cancel() {
          // Cleanup when stream is cancelled
          logger.info('SSE stream cancelled by client');
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control',
          'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
      });

    } catch (error) {
      logger.error('Failed to establish SSE connection', { error });
      
      // Return error as SSE event
      const errorStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const errorData = `event: error\ndata: ${JSON.stringify({
            type: 'connection_error',
            message: 'Failed to establish monitoring stream',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      });

      return new NextResponse(errorStream, {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  })(request);
}
