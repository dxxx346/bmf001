import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase';

const productService = new ProductService();
const supabase = createServiceClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  return authMiddleware.requireBuyer(request, async (req, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const fileId = searchParams.get('file_id');
      const version = searchParams.get('version');

      logger.info('Product download request', { 
        productId, 
        buyerId: context.userId, 
        fileId,
        version 
      });

      // Get product details
      const product = await productService.getProduct(productId);
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      // Check if user owns this product
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id, created_at')
        .eq('buyer_id', context.userId)
        .eq('product_id', productId)
        .single();

      if (!purchase) {
        return NextResponse.json(
          { error: 'You do not own this product' },
          { status: 403 }
        );
      }

      // Check download expiry if set
      if (product.download_expiry_days) {
        const purchaseDate = new Date(purchase.created_at);
        const expiryDate = new Date(purchaseDate.getTime() + (product.download_expiry_days * 24 * 60 * 60 * 1000));
        
        if (new Date() > expiryDate) {
          return NextResponse.json(
            { error: 'Download link has expired' },
            { status: 410 }
          );
        }
      }

      // Check download limit if set
      if (product.download_limit) {
        const { data: downloads } = await supabase
          .from('product_downloads')
          .select('id')
          .eq('product_id', productId)
          .eq('buyer_id', context.userId);

        if (downloads && downloads.length >= product.download_limit) {
          return NextResponse.json(
            { error: 'Download limit exceeded' },
            { status: 429 }
          );
        }
      }

      let fileUrl: string;
      let fileName: string;
      let fileSize: number;

      if (fileId) {
        // Download specific file
        const { data: file } = await supabase
          .from('product_files')
          .select('*')
          .eq('id', fileId)
          .eq('product_id', productId)
          .single();

        if (!file) {
          return NextResponse.json(
            { error: 'File not found' },
            { status: 404 }
          );
        }

        fileUrl = file.file_url;
        fileName = file.file_name;
        fileSize = file.file_size;
      } else if (version) {
        // Download specific version
        const { data: versionData } = await supabase
          .from('product_versions')
          .select('*')
          .eq('product_id', productId)
          .eq('version', version)
          .eq('is_active', true)
          .single();

        if (!versionData) {
          return NextResponse.json(
            { error: 'Version not found' },
            { status: 404 }
          );
        }

        fileUrl = versionData.file_url;
        fileName = `${product.title}_v${version}.zip`;
        fileSize = versionData.file_size;
      } else {
        // Download primary file or create archive
        const { data: files } = await supabase
          .from('product_files')
          .select('*')
          .eq('product_id', productId)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true });

        if (!files || files.length === 0) {
          return NextResponse.json(
            { error: 'No files available for download' },
            { status: 404 }
          );
        }

        if (files.length === 1) {
          // Single file download
          fileUrl = files[0].file_url;
          fileName = files[0].file_name;
          fileSize = files[0].file_size;
        } else {
          // Multiple files - create archive
          const archiveResult = await createProductArchive(productId, files);
          if (!archiveResult.success) {
            return NextResponse.json(
              { error: 'Failed to create download archive' },
              { status: 500 }
            );
          }
          fileUrl = archiveResult.archive_url!;
          fileName = `${product.title}_files.zip`;
          fileSize = archiveResult.file_size!;
        }
      }

      // Generate secure download URL
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('product-files')
        .createSignedUrl(fileUrl, 3600); // 1 hour expiry

      if (downloadError || !downloadData) {
        logError(downloadError, { action: 'create_download_url', productId, fileId });
        return NextResponse.json(
          { error: 'Failed to generate download link' },
          { status: 500 }
        );
      }

      // Record download
      await supabase
        .from('product_downloads')
        .insert({
          product_id: productId,
          buyer_id: context.userId,
          file_id: fileId,
          version: version,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        });

      // Update product stats
      await supabase.rpc('increment_download_count', {
        product_id: productId
      });

      logger.info('Download link generated', { 
        productId, 
        buyerId: context.userId, 
        fileName,
        fileSize 
      });

      return NextResponse.json({
        download_url: downloadData.signedUrl,
        file_name: fileName,
        file_size: fileSize,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      });
    } catch (error) {
      logError(error as Error, { 
        action: 'download_product_api', 
        productId, 
        userId: context.userId 
      });
      return NextResponse.json(
        { error: 'Failed to process download request' },
        { status: 500 }
      );
    }
  });
}

async function createProductArchive(productId: string, files: any[]): Promise<{
  success: boolean;
  archive_url?: string;
  file_size?: number;
  error?: string;
}> {
  try {
    // This would use a service like archiver to create a ZIP file
    // For now, we'll return the first file as a placeholder
    if (files.length > 0) {
      return {
        success: true,
        archive_url: files[0].file_url,
        file_size: files[0].file_size,
      };
    }

    return {
      success: false,
      error: 'No files to archive',
    };
  } catch (error) {
    logError(error as Error, { action: 'create_product_archive', productId });
    return {
      success: false,
      error: 'Failed to create archive',
    };
  }
}
