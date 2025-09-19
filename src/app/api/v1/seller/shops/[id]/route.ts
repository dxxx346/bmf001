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
      const { id: shopId } = await params;
      
      logger.info('Fetching shop details', { shopId, userId: context.userId });

      const supabase = createServiceClient();
      
      const { data: shop, error } = await supabase
        .from('shops')
        .select(`
          *,
          stats:shop_stats(*)
        `)
        .eq('id', shopId)
        .eq('owner_id', context.userId)
        .single();

      if (error || !shop) {
        return NextResponse.json(
          { error: 'Shop not found' },
          { status: 404 }
        );
      }

      logger.info('Shop details fetched successfully', { 
        shopId,
        userId: context.userId 
      });

      return NextResponse.json({ shop });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_shop_details_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const { id: shopId } = await params;
      
      logger.info('Updating shop', { shopId, userId: context.userId });

      const formData = await req.formData();
      const supabase = createServiceClient();

      // Verify shop ownership
      const { data: existingShop, error: ownershipError } = await supabase
        .from('shops')
        .select('id, slug, logo_url, banner_url')
        .eq('id', shopId)
        .eq('owner_id', context.userId)
        .single();

      if (ownershipError || !existingShop) {
        return NextResponse.json(
          { error: 'Shop not found or access denied' },
          { status: 404 }
        );
      }

      // Extract form data
      const updateData: any = {};
      
      const name = formData.get('name') as string;
      if (name) updateData.name = name.trim();
      
      const description = formData.get('description') as string;
      if (description !== null) updateData.description = description?.trim() || null;
      
      const website_url = formData.get('website_url') as string;
      if (website_url !== null) updateData.website_url = website_url?.trim() || null;
      
      const contact_email = formData.get('contact_email') as string;
      if (contact_email !== null) updateData.contact_email = contact_email?.trim() || null;
      
      const is_active = formData.get('is_active');
      if (is_active !== null) updateData.is_active = is_active === 'true';
      
      const settings = formData.get('settings');
      if (settings) {
        try {
          updateData.settings = JSON.parse(settings as string);
        } catch (error) {
          logError(error as Error, { 
            action: 'parse_shop_settings', 
            shopId, 
            settings: settings.toString() 
          });
          return NextResponse.json(
            { error: 'Invalid settings format' },
            { status: 400 }
          );
        }
      }

      // Handle file uploads
      const logoFile = formData.get('logo') as File;
      const bannerFile = formData.get('banner') as File;

      // Validate file types and sizes
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxFileSize = 5 * 1024 * 1024; // 5MB

      if (logoFile && logoFile.size > 0) {
        if (!allowedImageTypes.includes(logoFile.type)) {
          return NextResponse.json(
            { error: 'Logo must be a valid image file (JPEG, PNG, or WebP)' },
            { status: 400 }
          );
        }
        if (logoFile.size > maxFileSize) {
          return NextResponse.json(
            { error: 'Logo file size must be less than 5MB' },
            { status: 400 }
          );
        }
        const logoPath = `shops/${context.userId}/${existingShop.slug}/logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { error: logoError } = await supabase.storage
          .from('shop-assets')
          .upload(logoPath, logoFile);

        if (logoError) {
          logError(logoError as Error, { action: 'upload_shop_logo_update' });
        } else {
          const { data: logoPublicUrl } = supabase.storage
            .from('shop-assets')
            .getPublicUrl(logoPath);
          updateData.logo_url = logoPublicUrl.publicUrl;
          
          // Clean up old logo
          if (existingShop.logo_url) {
            try {
              const urlParts = existingShop.logo_url.split('/');
              const oldLogoPath = urlParts[urlParts.length - 1];
              if (oldLogoPath && oldLogoPath !== 'undefined') {
                await supabase.storage
                  .from('shop-assets')
                  .remove([`shops/${context.userId}/${existingShop.slug}/${oldLogoPath}`]);
              }
            } catch (error) {
              // Log but don't fail the update if cleanup fails
              logError(error as Error, { action: 'cleanup_old_logo', shopId });
            }
          }
        }
      }

      if (bannerFile && bannerFile.size > 0) {
        if (!allowedImageTypes.includes(bannerFile.type)) {
          return NextResponse.json(
            { error: 'Banner must be a valid image file (JPEG, PNG, or WebP)' },
            { status: 400 }
          );
        }
        if (bannerFile.size > maxFileSize) {
          return NextResponse.json(
            { error: 'Banner file size must be less than 5MB' },
            { status: 400 }
          );
        }
        const bannerPath = `shops/${context.userId}/${existingShop.slug}/banner-${Date.now()}.${bannerFile.name.split('.').pop()}`;
        const { error: bannerError } = await supabase.storage
          .from('shop-assets')
          .upload(bannerPath, bannerFile);

        if (bannerError) {
          logError(bannerError as Error, { action: 'upload_shop_banner_update' });
        } else {
          const { data: bannerPublicUrl } = supabase.storage
            .from('shop-assets')
            .getPublicUrl(bannerPath);
          updateData.banner_url = bannerPublicUrl.publicUrl;
          
          // Clean up old banner
          if (existingShop.banner_url) {
            try {
              const urlParts = existingShop.banner_url.split('/');
              const oldBannerPath = urlParts[urlParts.length - 1];
              if (oldBannerPath && oldBannerPath !== 'undefined') {
                await supabase.storage
                  .from('shop-assets')
                  .remove([`shops/${context.userId}/${existingShop.slug}/${oldBannerPath}`]);
              }
            } catch (error) {
              // Log but don't fail the update if cleanup fails
              logError(error as Error, { action: 'cleanup_old_banner', shopId });
            }
          }
        }
      }

      // Update shop record
      updateData.updated_at = new Date().toISOString();

      const { data: updatedShop, error: updateError } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', shopId)
        .eq('owner_id', context.userId)
        .select()
        .single();

      if (updateError) {
        logError(updateError as Error, { action: 'update_shop', shopId, userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to update shop' },
          { status: 500 }
        );
      }

      logger.info('Shop updated successfully', { 
        shopId,
        userId: context.userId 
      });

      return NextResponse.json({ 
        shop: updatedShop,
        message: 'Shop updated successfully' 
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'update_shop_api',
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
      const { id: shopId } = await params;
      const body = await req.json();
      
      logger.info('Patching shop', { shopId, userId: context.userId, updates: Object.keys(body) });

      const supabase = createServiceClient();

      // Verify shop ownership
      const { data: existingShop, error: ownershipError } = await supabase
        .from('shops')
        .select('id')
        .eq('id', shopId)
        .eq('owner_id', context.userId)
        .single();

      if (ownershipError || !existingShop) {
        return NextResponse.json(
          { error: 'Shop not found or access denied' },
          { status: 404 }
        );
      }

      // Update shop
      const { data: updatedShop, error: updateError } = await supabase
        .from('shops')
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId)
        .eq('owner_id', context.userId)
        .select()
        .single();

      if (updateError) {
        logError(updateError as Error, { action: 'patch_shop', shopId, userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to update shop' },
          { status: 500 }
        );
      }

      logger.info('Shop patched successfully', { 
        shopId,
        userId: context.userId 
      });

      return NextResponse.json({ 
        shop: updatedShop,
        message: 'Shop updated successfully' 
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'patch_shop_api',
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
      const { id: shopId } = await params;
      
      logger.info('Deleting shop', { shopId, userId: context.userId });

      const supabase = createServiceClient();

      // Verify shop ownership and get shop details
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id, slug, owner_id, logo_url, banner_url')
        .eq('id', shopId)
        .eq('owner_id', context.userId)
        .single();

      if (shopError || !shop) {
        return NextResponse.json(
          { error: 'Shop not found or access denied' },
          { status: 404 }
        );
      }

      // Check if shop has products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('shop_id', shopId)
        .limit(1);

      if (productsError) {
        logError(productsError as Error, { action: 'check_shop_products', shopId });
      }

      if (products && products.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete shop with existing products. Please delete all products first.' },
          { status: 400 }
        );
      }

      // Delete shop assets from storage
      if (shop.logo_url || shop.banner_url) {
        const filesToDelete: string[] = [];
        
        try {
          if (shop.logo_url) {
            const logoUrlParts = shop.logo_url.split('/');
            if (logoUrlParts.length >= 3) {
              const logoPath = logoUrlParts.slice(-3).join('/');
              filesToDelete.push(logoPath);
            }
          }
          
          if (shop.banner_url) {
            const bannerUrlParts = shop.banner_url.split('/');
            if (bannerUrlParts.length >= 3) {
              const bannerPath = bannerUrlParts.slice(-3).join('/');
              filesToDelete.push(bannerPath);
            }
          }
          
          if (filesToDelete.length > 0) {
            const { error: deleteFilesError } = await supabase.storage
              .from('shop-assets')
              .remove(filesToDelete);
              
            if (deleteFilesError) {
              // Log but don't fail deletion if file cleanup fails
              logError(deleteFilesError as Error, { 
                action: 'delete_shop_assets', 
                shopId, 
                filesToDelete 
              });
            }
          }
        } catch (error) {
          // Log but don't fail deletion if file cleanup fails
          logError(error as Error, { 
            action: 'delete_shop_assets_cleanup', 
            shopId 
          });
        }
      }

      // Delete shop record (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopId)
        .eq('owner_id', context.userId);

      if (deleteError) {
        logError(deleteError as Error, { action: 'delete_shop', shopId, userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to delete shop' },
          { status: 500 }
        );
      }

      logger.info('Shop deleted successfully', { 
        shopId,
        userId: context.userId 
      });

      return NextResponse.json({ 
        message: 'Shop deleted successfully' 
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'delete_shop_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
