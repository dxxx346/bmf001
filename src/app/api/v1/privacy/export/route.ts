import { NextRequest, NextResponse } from 'next/server';
import { gdprService } from '@/services/gdpr.service';
import { createServerClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { exportType = 'full', format = 'json', tablesRequested, includeFiles = false } = body;

    // Validate export type and format
    const validExportTypes = ['full', 'partial', 'specific_tables'];
    const validFormats = ['json', 'csv', 'xml'];

    if (!validExportTypes.includes(exportType)) {
      return NextResponse.json(
        { error: 'Invalid export type' },
        { status: 400 }
      );
    }

    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format' },
        { status: 400 }
      );
    }

    if (exportType === 'specific_tables' && (!tablesRequested || !Array.isArray(tablesRequested))) {
      return NextResponse.json(
        { error: 'Tables requested is required for specific_tables export type' },
        { status: 400 }
      );
    }

    // Create export request
    const result = await gdprService.createDataExportRequest({
      userId: user.id,
      exportType,
      format,
      tablesRequested,
      includeFiles,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    logger.info('Data export request created via API', { 
      userId: user.id, 
      exportId: result.exportId,
      exportType,
      format 
    });

    return NextResponse.json({
      success: true,
      exportId: result.exportId,
      message: result.message,
    });

  } catch (error) {
    logger.error('Error in export API endpoint', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's export requests
    const { data: exports, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('Failed to fetch export requests', { error: error.message, userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch export requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exports: exports || [],
    });

  } catch (error) {
    logger.error('Error fetching export requests', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
