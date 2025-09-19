import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analytics.service';
import { z } from 'zod';

const QuerySchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
  filters: z.object({
    user_id: z.string().optional(),
    product_id: z.string().optional(),
    shop_id: z.string().optional(),
    event_type: z.string().optional(),
    country: z.string().optional(),
    device_type: z.string().optional()
  }).optional(),
  group_by: z.array(z.string()).optional(),
  metrics: z.array(z.string()).optional().default(['count']),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(100)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = QuerySchema.parse(body);

    const analyticsQuery = {
      start_date: query.start_date,
      end_date: query.end_date,
      granularity: query.granularity,
      filters: query.filters,
      group_by: query.group_by,
      metrics: query.metrics
    };

    const result = await analyticsService.getDashboardData('30d');

    return NextResponse.json({
      data: result,
      page: query.page,
      limit: query.limit
    });
  } catch (error) {
    console.error('Analytics query error:', error);
    return NextResponse.json(
      { error: 'Failed to query analytics data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = {
      start_date: searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: searchParams.get('end_date') || new Date().toISOString(),
      granularity: (searchParams.get('granularity') as 'hour' | 'day' | 'week' | 'month') || 'day',
      filters: {
        user_id: searchParams.get('user_id') || undefined,
        product_id: searchParams.get('product_id') || undefined,
        shop_id: searchParams.get('shop_id') || undefined,
        event_type: searchParams.get('event_type') || undefined,
        country: searchParams.get('country') || undefined,
        device_type: searchParams.get('device_type') || undefined
      },
      group_by: searchParams.get('group_by')?.split(',') || undefined,
      metrics: searchParams.get('metrics')?.split(',') || ['count']
    };

    // Remove undefined filters
    Object.keys(query.filters).forEach(key => {
      if (query.filters[key as keyof typeof query.filters] === undefined) {
        delete query.filters[key as keyof typeof query.filters];
      }
    });

    const analyticsQuery = {
      start_date: query.start_date,
      end_date: query.end_date,
      granularity: query.granularity,
      filters: Object.keys(query.filters).length > 0 ? query.filters : undefined,
      group_by: query.group_by,
      metrics: query.metrics
    };

    const result = await analyticsService.getDashboardData('30d');

    return NextResponse.json({
      data: result,
      page: 1,
      limit: 100
    });
  } catch (error) {
    console.error('Analytics query error:', error);
    return NextResponse.json(
      { error: 'Failed to query analytics data' },
      { status: 500 }
    );
  }
}
