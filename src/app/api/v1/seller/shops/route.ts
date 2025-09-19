import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      logger.info('Fetching seller shops', { userId: context.userId });

      const supabase = createServiceClient();
      
      // Get shops with stats
      const { data: shops, error } = await supabase
        .from('shops')
        .select(`
          *,
          stats:shop_stats(
            product_count,
            total_sales,
            total_revenue,
            average_rating,
            review_count,
            last_sale_at
          )
        `)
        .eq('owner_id', context.userId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(error as Error, { action: 'get_seller_shops', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch shops' },
          { status: 500 }
        );
      }

      // Transform data to include default stats if none exist
      const shopsWithStats = shops?.map(shop => ({
        ...shop,
        stats: shop.stats?.[0] || {
          product_count: 0,
          total_sales: 0,
          total_revenue: 0,
          average_rating: 0,
          review_count: 0,
          last_sale_at: null,
        },
      })) || [];

      logger.info('Seller shops fetched successfully', { 
        userId: context.userId,
        shopCount: shopsWithStats.length 
      });

      return NextResponse.json({ shops: shopsWithStats });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_seller_shops_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      logger.info('Creating new shop', { userId: context.userId });

      const formData = await req.formData();
      
      // Extract form data
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const website_url = formData.get('website_url') as string;
      const contact_email = formData.get('contact_email') as string;
      const settings = formData.get('settings') ? JSON.parse(formData.get('settings') as string) : {};
      
      const logoFile = formData.get('logo') as File;
      const bannerFile = formData.get('banner') as File;

      // Validate required fields
      if (!name || name.trim().length < 2) {
        return NextResponse.json(
          { error: 'Shop name is required and must be at least 2 characters' },
          { status: 400 }
        );
      }

      const supabase = createServiceClient();

      // Generate unique slug
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      let slug = baseSlug;
      let counter = 1;
      
      // Check for existing slug and make it unique
      while (true) {
        const { data: existingShop } = await supabase
          .from('shops')
          .select('id')
          .eq('slug', slug)
          .single();
        
        if (!existingShop) break;
        
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Upload files if provided
      let logo_url: string | undefined;
      let banner_url: string | undefined;

      if (logoFile && logoFile.size > 0) {
        const logoPath = `shops/${context.userId}/${slug}/logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { data: logoUpload, error: logoError } = await supabase.storage
          .from('shop-assets')
          .upload(logoPath, logoFile);

        if (logoError) {
          logError(logoError as Error, { action: 'upload_shop_logo' });
        } else {
          const { data: logoPublicUrl } = supabase.storage
            .from('shop-assets')
            .getPublicUrl(logoPath);
          logo_url = logoPublicUrl.publicUrl;
        }
      }

      if (bannerFile && bannerFile.size > 0) {
        const bannerPath = `shops/${context.userId}/${slug}/banner-${Date.now()}.${bannerFile.name.split('.').pop()}`;
        const { data: bannerUpload, error: bannerError } = await supabase.storage
          .from('shop-assets')
          .upload(bannerPath, bannerFile);

        if (bannerError) {
          logError(bannerError as Error, { action: 'upload_shop_banner' });
        } else {
          const { data: bannerPublicUrl } = supabase.storage
            .from('shop-assets')
            .getPublicUrl(bannerPath);
          banner_url = bannerPublicUrl.publicUrl;
        }
      }

      // Create shop record
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert({
          owner_id: context.userId,
          name: name.trim(),
          slug,
          description: description?.trim() || null,
          logo_url,
          banner_url,
          website_url: website_url?.trim() || null,
          contact_email: contact_email?.trim() || null,
          settings,
          is_active: true,
        })
        .select()
        .single();

      if (shopError) {
        logError(shopError as Error, { action: 'create_shop', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to create shop' },
          { status: 500 }
        );
      }

      // Create initial shop stats record
      await supabase
        .from('shop_stats')
        .insert({
          shop_id: shop.id,
          product_count: 0,
          total_sales: 0,
          total_revenue: 0,
          average_rating: 0,
          review_count: 0,
        });

      logger.info('Shop created successfully', { 
        shopId: shop.id,
        shopName: shop.name,
        userId: context.userId 
      });

      return NextResponse.json({ 
        shop,
        message: 'Shop created successfully' 
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'create_shop_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
