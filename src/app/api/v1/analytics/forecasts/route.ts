import { NextRequest, NextResponse } from 'next/server';
import { revenueForecastingService } from '@/services/revenue-forecasting.service';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'generate':
        const forecast = await revenueForecastingService.generateForecast(
          data.forecast_type,
          data.period,
          data.model_type
        );
        return NextResponse.json(forecast);

      case 'analyze_accuracy':
        const accuracy = await revenueForecastingService.analyzeForecastAccuracy(
          data.forecast_id
        );
        return NextResponse.json(accuracy);

      case 'compare':
        const comparison = await revenueForecastingService.compareForecasts(
          data.forecast_ids
        );
        return NextResponse.json(comparison);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logError(error as Error, { action: 'forecast_operation' });
    return NextResponse.json(
      { error: 'Failed to process forecast operation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forecastId = searchParams.get('forecast_id');

    if (forecastId) {
      const forecast = await revenueForecastingService.getForecast(forecastId);
      return NextResponse.json(forecast);
    }

    return NextResponse.json(
      { error: 'forecast_id is required' },
      { status: 400 }
    );
  } catch (error) {
    logError(error as Error, { action: 'get_forecast' });
    return NextResponse.json(
      { error: 'Failed to retrieve forecast data' },
      { status: 500 }
    );
  }
}
