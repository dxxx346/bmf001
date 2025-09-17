import { NextRequest, NextResponse } from 'next/server';
import { abTestingService } from '@/services/ab-testing.service';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        const experiment = await abTestingService.createExperiment(data);
        return NextResponse.json(experiment);

      case 'start':
        const started = await abTestingService.startExperiment(data.experiment_id);
        return NextResponse.json({ success: started });

      case 'stop':
        const stopped = await abTestingService.stopExperiment(data.experiment_id);
        return NextResponse.json({ success: stopped });

      case 'assign_variant':
        const variant = await abTestingService.assignVariant(
          data.experiment_id,
          data.user_id
        );
        return NextResponse.json({ variant });

      case 'track_conversion':
        await abTestingService.trackConversion(
          data.experiment_id,
          data.user_id,
          data.metric_name,
          data.value
        );
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logError(error as Error, { action: 'ab_test_operation' });
    return NextResponse.json(
      { error: 'Failed to process A/B test operation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('experiment_id');
    const action = searchParams.get('action');

    if (action === 'results' && experimentId) {
      const results = await abTestingService.getExperimentResults(experimentId);
      return NextResponse.json(results);
    }

    if (experimentId) {
      const experiment = await abTestingService.getExperiment(experimentId);
      return NextResponse.json(experiment);
    }

    return NextResponse.json(
      { error: 'experiment_id is required' },
      { status: 400 }
    );
  } catch (error) {
    logError(error as Error, { action: 'get_ab_test' });
    return NextResponse.json(
      { error: 'Failed to retrieve A/B test data' },
      { status: 500 }
    );
  }
}
