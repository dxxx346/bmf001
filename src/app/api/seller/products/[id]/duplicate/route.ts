import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { id: productId } = await params;
      
      logger.info('Duplicating seller product', { productId, userId: context.userId });

      const supabase = createServiceClient();

      // Get original product
      const { data: originalProduct, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          files:product_files(*),
          images:product_images(*)
        `)
        .eq('id', productId)
        .eq('seller_id', context.userId)
        .single();

      if (productError || !originalProduct) {
        return NextResponse.json(
          { error: 'Product not found or access denied' },
          { status: 404 }
        );
      }

      // Generate unique slug for duplicate
      const baseSlug = originalProduct.slug;
      let newSlug = `${baseSlug}-copy`;
      let counter = 1;
      
      while (true) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('slug', newSlug)
          .single();
        
        if (!existingProduct) break;
        
        newSlug = `${baseSlug}-copy-${counter}`;
        counter++;
      }

      // Create duplicate product
      const duplicateData = {
        seller_id: originalProduct.seller_id,
        shop_id: originalProduct.shop_id,
        category_id: originalProduct.category_id,
        subcategory_id: originalProduct.subcategory_id,
        title: `${originalProduct.title} (Copy)`,
        slug: newSlug,
        description: originalProduct.description,
        short_description: originalProduct.short_description,
        price: originalProduct.price,
        sale_price: originalProduct.sale_price,
        currency: originalProduct.currency,
        product_type: originalProduct.product_type,
        status: 'draft', // Always create as draft
        is_featured: false, // Don't copy featured status
        is_digital: originalProduct.is_digital,
        is_downloadable: originalProduct.is_downloadable,
        download_limit: originalProduct.download_limit,
        download_expiry_days: originalProduct.download_expiry_days,
        version: '1.0.0',
        tags: originalProduct.tags,
        metadata: originalProduct.metadata,
        seo: {
          ...originalProduct.seo,
          meta_title: originalProduct.seo?.meta_title ? `${originalProduct.seo.meta_title} (Copy)` : undefined,
        },
      };

      const { data: newProduct, error: createError } = await supabase
        .from('products')
        .insert(duplicateData)
        .select()
        .single();

      if (createError) {
        logError(createError as Error, { action: 'duplicate_product_create', productId, userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to create product duplicate' },
          { status: 500 }
        );
      }

      // Copy files (reference same files, don't duplicate storage)
      if (originalProduct.files && originalProduct.files.length > 0) {
        const fileCopies = originalProduct.files.map((file: any) => ({
          product_id: newProduct.id,
          file_name: file.file_name,
          file_size: file.file_size,
          file_type: file.file_type,
          url: file.url,
          sort_order: file.sort_order,
        }));

        const { error: filesError } = await supabase
          .from('product_files')
          .insert(fileCopies);

        if (filesError) {
          logError(filesError as Error, { action: 'duplicate_product_files', productId });
        }
      }

      // Copy images (reference same images, don't duplicate storage)
      if (originalProduct.images && originalProduct.images.length > 0) {
        const imageCopies = originalProduct.images.map((image: any) => ({
          product_id: newProduct.id,
          url: image.url,
          alt_text: image.alt_text,
          sort_order: image.sort_order,
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imageCopies);

        if (imagesError) {
          logError(imagesError as Error, { action: 'duplicate_product_images', productId });
        }
      }

      // Create initial stats record
      await supabase
        .from('product_stats')
        .insert({
          product_id: newProduct.id,
          view_count: 0,
          download_count: 0,
          purchase_count: 0,
          favorite_count: 0,
          review_count: 0,
          average_rating: 0,
          total_revenue: 0,
        });

      logger.info('Product duplicated successfully', { 
        originalProductId: productId,
        newProductId: newProduct.id,
        userId: context.userId 
      });

      return NextResponse.json({ 
        product: newProduct,
        message: 'Product duplicated successfully' 
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'duplicate_product_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
