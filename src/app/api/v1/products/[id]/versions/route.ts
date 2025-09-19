import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const productService = new ProductService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  
  try {
    logger.info('Get product versions API call', { productId });

    const versions = await productService.getProductVersions(productId);

    return NextResponse.json({ versions });
  } catch (error) {
    logError(error as Error, { action: 'get_product_versions_api', productId });
    return NextResponse.json(
      { error: 'Failed to get product versions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const formData = await req.formData();

      const versionData = {
        version: formData.get('version') as string,
        changelog: formData.get('changelog') as string,
        file: formData.get('file') as File,
      };

      if (!versionData.version || !versionData.changelog || !versionData.file) {
        return NextResponse.json(
          { error: 'Version, changelog, and file are required' },
          { status: 400 }
        );
      }

      logger.info('Creating product version via API', { productId, version: versionData.version, sellerId: context.userId });

      const result = await productService.createProductVersion(productId, versionData, context.userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Product version created successfully',
        version: result.version,
      }, { status: 201 });
    } catch (error) {
      logError(error as Error, { action: 'create_product_version_api', productId, userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to create product version' },
        { status: 500 }
      );
    }
  });
}
