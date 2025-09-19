import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analytics.service';
import { z } from 'zod';

const ProductPerformanceQuerySchema = z.object({
  start_date: z.string(),
  end_date: z.string()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const { id: productId } = await params;

    const query = {
      start_date: searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: searchParams.get('end_date') || new Date().toISOString(),
      granularity: 'day' as const,
      metrics: ['count'],
      filters: {
        product_id: productId
      }
    };

    const result = await analyticsService.getProductPerformanceMetrics(productId, query.start_date, query.end_date);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Product performance error:', error);
    return NextResponse.json(
      { error: 'Failed to get product performance' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { start_date, end_date } = ProductPerformanceQuerySchema.parse(body);
    const { id: productId } = await params;

    const query = {
      start_date,
      end_date,
      granularity: 'day' as const,
      metrics: ['count'],
      filters: {
        product_id: productId
      }
    };

    const result = await analyticsService.getProductPerformanceMetrics(productId, query.start_date, query.end_date);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Product performance error:', error);
    return NextResponse.json(
      { error: 'Failed to get product performance' },
      { status: 500 }
    );
  }
}
