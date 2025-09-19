import { NextRequest, NextResponse } from 'next/server';
import { abTestingService } from '@/services/ab-testing.service';
import { logError } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;

    // Validate test ID
    if (!testId || typeof testId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid test ID provided' },
        { status: 400 }
      );
    }

    const results = await abTestingService.getExperimentResults(testId);

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    logError(error as Error, { 
      action: 'get_ab_test_results'
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get A/B test results',
        message: 'An error occurred while retrieving test results'
      },
      { status: 500 }
    );
  }
}
