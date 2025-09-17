import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const body = await req.json();
      const { file_id, order_id, product_id } = body;

      logger.info('Verifying download access', { 
        userId: context.userId, 
        fileId: file_id,
        orderId: order_id,
        productId: product_id 
      });

      const supabase = createServiceClient();

      // Verify order ownership
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, user_id, download_expires_at')
        .eq('id', order_id)
        .eq('user_id', context.userId)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: 'Order not found or access denied' },
          { status: 404 }
        );
      }

      // Check order status
      if (order.status !== 'completed') {
        return NextResponse.json(
          { error: 'Order must be completed to download files' },
          { status: 400 }
        );
      }

      // Check download expiry
      if (order.download_expires_at && new Date(order.download_expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Download links have expired' },
          { status: 400 }
        );
      }

      // Get file details
      const { data: file, error: fileError } = await supabase
        .from('product_files')
        .select(`
          id,
          file_name,
          file_size,
          file_type,
          url,
          download_count,
          max_downloads,
          expires_at,
          is_available,
          product_id
        `)
        .eq('id', file_id)
        .eq('product_id', product_id)
        .single();

      if (fileError || !file) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }

      // Check file availability
      if (!file.is_available) {
        return NextResponse.json(
          { error: 'File is not available for download' },
          { status: 400 }
        );
      }

      // Check download limit
      if (file.max_downloads > 0 && file.download_count >= file.max_downloads) {
        return NextResponse.json(
          { error: 'Download limit exceeded' },
          { status: 400 }
        );
      }

      // Check file expiry
      if (file.expires_at && new Date(file.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'File download has expired' },
          { status: 400 }
        );
      }

      // Verify the product is in the order
      const { data: orderItem } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', order_id)
        .eq('product_id', product_id)
        .single();

      if (!orderItem) {
        return NextResponse.json(
          { error: 'Product not found in order' },
          { status: 400 }
        );
      }

      // Generate secure download URL
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('products')
        .createSignedUrl(file.url, 3600); // 1 hour expiry

      if (urlError || !signedUrl) {
        logError(urlError as Error, { action: 'create_download_url', fileId: file_id });
        return NextResponse.json(
          { error: 'Failed to generate download URL' },
          { status: 500 }
        );
      }

      // Log download attempt
      await supabase
        .from('product_downloads')
        .insert({
          user_id: context.userId,
          product_id: product_id,
          file_id: file_id,
          order_id: order_id,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
        });

      // Update download count
      await supabase
        .from('product_files')
        .update({ 
          download_count: file.download_count + 1,
          last_downloaded_at: new Date().toISOString(),
        })
        .eq('id', file_id);

      logger.info('Download access verified successfully', { 
        userId: context.userId,
        fileId: file_id,
        orderId: order_id 
      });

      return NextResponse.json({
        download_url: signedUrl.signedUrl,
        expires_in: 3600,
        file_name: file.file_name,
        file_size: file.file_size,
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'verify_download_access_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
