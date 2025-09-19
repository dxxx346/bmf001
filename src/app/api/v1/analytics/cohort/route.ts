import { NextRequest, NextResponse } from 'next/server';
import { cohortAnalysisService } from '@/services/cohort-analysis.service';
import { z } from 'zod';

const CohortQuerySchema = z.object({
  start_date: z.string(),
  end_date: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { start_date, end_date } = CohortQuerySchema.parse(body);

    const query = {
      start_date,
      end_date,
      granularity: 'month' as const,
      metrics: ['count']
    };

    const result = await cohortAnalysisService.analyzeCohortRetention('signup', start_date, end_date);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cohort analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to get cohort analysis' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const start_date = searchParams.get('start_date') || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const end_date = searchParams.get('end_date') || new Date().toISOString();

    const query = {
      start_date,
      end_date,
      granularity: 'month' as const,
      metrics: ['count']
    };

    const result = await cohortAnalysisService.analyzeCohortRetention('signup', start_date, end_date);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cohort analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to get cohort analysis' },
      { status: 500 }
    );
  }
}
