import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { id: productId } = await params;
      
      logger.info('Fetching seller product details', { productId, userId: context.userId });

      const supabase = createServiceClient();
      
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          files:product_files(*),
          images:product_images(*),
          stats:product_stats(*),
          shop:shops(name, slug),
          category:categories(name)
        `)
        .eq('id', productId)
        .eq('seller_id', context.userId)
        .single();

      if (error || !product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      logger.info('Seller product details fetched successfully', { 
        productId,
        userId: context.userId 
      });

      return NextResponse.json({ product });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_seller_product_details_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { id: productId } = await params;
      const body = await req.json();
      
      logger.info('Patching seller product', { productId, userId: context.userId, updates: Object.keys(body) });

      const supabase = createServiceClient();

      // Verify product ownership
      const { data: existingProduct, error: ownershipError } = await supabase
        .from('products')
        .select('id, seller_id')
        .eq('id', productId)
        .eq('seller_id', context.userId)
        .single();

      if (ownershipError || !existingProduct) {
        return NextResponse.json(
          { error: 'Product not found or access denied' },
          { status: 404 }
        );
      }

      // Update product
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .eq('seller_id', context.userId)
        .select()
        .single();

      if (updateError) {
        logError(updateError as Error, { action: 'patch_product', productId, userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to update product' },
          { status: 500 }
        );
      }

      logger.info('Seller product patched successfully', { 
        productId,
        userId: context.userId 
      });

      return NextResponse.json({ 
        product: updatedProduct,
        message: 'Product updated successfully' 
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'patch_seller_product_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { id: productId } = await params;
      
      logger.info('Deleting seller product', { productId, userId: context.userId });

      const supabase = createServiceClient();

      // Verify product ownership and get product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select(`
          id, 
          seller_id, 
          title,
          files:product_files(url),
          images:product_images(url)
        `)
        .eq('id', productId)
        .eq('seller_id', context.userId)
        .single();

      if (productError || !product) {
        return NextResponse.json(
          { error: 'Product not found or access denied' },
          { status: 404 }
        );
      }

      // Check if product has active orders
      const { data: activeOrders, error: ordersError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      if (ordersError) {
        logError(ordersError as Error, { action: 'check_product_orders', productId });
      }

      if (activeOrders && activeOrders.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete product with existing orders. Consider archiving instead.' },
          { status: 400 }
        );
      }

      // Delete product files from storage
      const filesToDelete: string[] = [];
      
      if (product.files) {
        product.files.forEach((file: any) => {
          if (file.url) {
            const path = file.url.split('/').slice(-2).join('/');
            filesToDelete.push(path);
          }
        });
      }
      
      if (product.images) {
        product.images.forEach((image: any) => {
          if (image.url) {
            const path = image.url.split('/').slice(-2).join('/');
            filesToDelete.push(path);
          }
        });
      }
      
      if (filesToDelete.length > 0) {
        await supabase.storage
          .from('products')
          .remove(filesToDelete);
      }

      // Delete product record (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('seller_id', context.userId);

      if (deleteError) {
        logError(deleteError as Error, { action: 'delete_product', productId, userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to delete product' },
          { status: 500 }
        );
      }

      logger.info('Seller product deleted successfully', { 
        productId,
        productTitle: product.title,
        userId: context.userId 
      });

      return NextResponse.json({ 
        message: 'Product deleted successfully' 
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'delete_seller_product_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
