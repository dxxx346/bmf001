import { NextRequest, NextResponse } from 'next/server';
import { deliveryService } from '@/services/delivery.service';
import { createServerClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const signature = searchParams.get('sig');
    const userAgent = request.headers.get('user-agent');

    // Verify signature
    if (!signature) {
      return NextResponse.json(
        { error: 'Invalid download URL' },
        { status: 400 }
      );
    }

    // Get user from session (you'll need to implement this based on your auth system)
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Process download
    const downloadInfo = await deliveryService.processDownload(
      sessionId,
      userAgent || undefined
    );

    // Get file from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('products')
      .download(downloadInfo.fileUrl);

    if (fileError || !fileData) {
      logger.error('Error downloading file:', fileError);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', downloadInfo.contentType);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Content-Disposition', `attachment; filename="${downloadInfo.filename}"`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    logger.error('Download error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('limit exceeded') || error.message.includes('denied')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { action } = body;

    // Get user from session
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'generate_zip':
        const { productIds, options } = body;
        const zipResult = await deliveryService.generateZipFile(
          user.id,
          productIds,
          options
        );
        return NextResponse.json(zipResult);

      case 'get_bandwidth_usage':
        const bandwidthUsage = await deliveryService.getBandwidthUsage(user.id);
        return NextResponse.json(bandwidthUsage);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Delivery API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
