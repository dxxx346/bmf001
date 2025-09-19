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
  try {
    const { id: productId } = await params;

    logger.info('Get product API call', { productId });

    const product = await productService.getProduct(productId);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    logError(error as Error, { action: 'get_product_api' });
    return NextResponse.json(
      { error: 'Failed to get product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const formData = await req.formData();

      // Parse form data
      const updates: any = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        short_description: formData.get('short_description') as string,
        price: formData.get('price') ? parseFloat(formData.get('price') as string) : undefined,
        sale_price: formData.get('sale_price') ? parseFloat(formData.get('sale_price') as string) : undefined,
        currency: formData.get('currency') as string,
        category_id: formData.get('category_id') ? parseInt(formData.get('category_id') as string) : undefined,
        subcategory_id: formData.get('subcategory_id') ? parseInt(formData.get('subcategory_id') as string) : undefined,
        product_type: formData.get('product_type') as any,
        status: formData.get('status') as any,
        is_featured: formData.get('is_featured') === 'true',
        is_digital: formData.get('is_digital') === 'true',
        is_downloadable: formData.get('is_downloadable') === 'true',
        download_limit: formData.get('download_limit') ? parseInt(formData.get('download_limit') as string) : undefined,
        download_expiry_days: formData.get('download_expiry_days') ? parseInt(formData.get('download_expiry_days') as string) : undefined,
        tags: formData.get('tags') ? (formData.get('tags') as string).split(',').filter(Boolean) : undefined,
        metadata: formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : undefined,
        seo: formData.get('seo') ? JSON.parse(formData.get('seo') as string) : undefined,
      };

      // Get files
      const files: File[] = [];
      const images: File[] = [];
      
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('files[') && value instanceof File) {
          files.push(value);
        } else if (key.startsWith('images[') && value instanceof File) {
          images.push(value);
        }
      }

      if (files.length > 0) updates.files = files;
      if (images.length > 0) updates.images = images;

      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      logger.info('Updating product via API', { productId, sellerId: context.userId, updates: Object.keys(cleanUpdates) });

      const result = await productService.updateProduct(productId, cleanUpdates, context.userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Product updated successfully',
        product: result.product,
      });
    } catch (error) {
      logError(error as Error, { action: 'update_product_api', productId, userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {

      logger.info('Deleting product via API', { productId, sellerId: context.userId });

      const result = await productService.deleteProduct(productId, context.userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Product deleted successfully',
      });
    } catch (error) {
      logError(error as Error, { action: 'delete_product_api', productId, userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }
  });
}
