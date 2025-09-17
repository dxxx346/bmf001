import { NextRequest, NextResponse } from 'next/server';
import { cohortAnalysisService } from '@/services/cohort-analysis.service';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        const cohort = await cohortAnalysisService.createCohort(data);
        return NextResponse.json(cohort);

      case 'analyze_retention':
        const cohorts = await cohortAnalysisService.analyzeCohortRetention(
          data.cohort_type,
          data.start_date,
          data.end_date,
          data.period_type
        );
        return NextResponse.json(cohorts);

      case 'analyze_user':
        const userCohort = await cohortAnalysisService.analyzeUserCohort(
          data.user_id,
          data.cohort_type,
          data.cohort_date
        );
        return NextResponse.json(userCohort);

      case 'compare':
        const comparison = await cohortAnalysisService.compareCohorts(data.cohort_ids);
        return NextResponse.json(comparison);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logError(error as Error, { action: 'cohort_operation' });
    return NextResponse.json(
      { error: 'Failed to process cohort operation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohort_id');

    if (cohortId) {
      const cohort = await cohortAnalysisService.getCohort(cohortId);
      return NextResponse.json(cohort);
    }

    return NextResponse.json(
      { error: 'cohort_id is required' },
      { status: 400 }
    );
  } catch (error) {
    logError(error as Error, { action: 'get_cohort' });
    return NextResponse.json(
      { error: 'Failed to retrieve cohort data' },
      { status: 500 }
    );
  }
}
