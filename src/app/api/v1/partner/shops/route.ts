import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '50');
      const search = searchParams.get('search');
      
      logger.info('Fetching shops for partner', { 
        userId: context.userId, 
        limit,
        search 
      });

      const supabase = createServiceClient();
      
      // Build query for active shops
      let query = supabase
        .from('shops')
        .select(`
          id,
          name,
          description,
          logo_url,
          created_at,
          owner:users(name),
          products:products(count),
          stats:shop_stats(
            total_revenue,
            total_sales,
            average_rating
          )
        `)
        .eq('status', 'active')
        .order('stats.total_revenue', { ascending: false });

      // Apply search filter
      if (search) {
        query = query.or(`name.ilike.%${search}%, description.ilike.%${search}%`);
      }

      // Apply limit
      query = query.limit(limit);

      const { data: shops, error } = await query;

      if (error) {
        logError(error as Error, { action: 'get_partner_shops', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch shops' },
          { status: 500 }
        );
      }

      // Transform data for partner use
      const transformedShops = shops?.map(shop => {
        const productCount = shop.products?.length || 0;
        const stats = shop.stats?.[0] || { total_revenue: '0', total_sales: 0, average_rating: 0 };
        const totalRevenue = parseFloat(stats.total_revenue);
        
        return {
          id: shop.id,
          name: shop.name,
          description: shop.description,
          logo_url: shop.logo_url,
          product_count: productCount,
          owner_name: shop.owner?.name || 'Unknown',
          commission_rate: calculateShopCommissionRate(totalRevenue, productCount),
          total_revenue: totalRevenue,
          total_sales: stats.total_sales || 0,
          rating: stats.average_rating || 0,
          created_at: shop.created_at,
        };
      }) || [];

      logger.info('Partner shops fetched successfully', { 
        userId: context.userId,
        shopCount: transformedShops.length 
      });

      return NextResponse.json({ 
        shops: transformedShops,
        total_count: transformedShops.length,
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_partner_shops_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Calculate commission rate for shops based on performance
function calculateShopCommissionRate(totalRevenue: number, productCount: number): number {
  let baseRate = 5; // Base 5% for shop referrals

  // Adjust based on shop performance
  if (totalRevenue >= 10000) {
    baseRate = 8; // Higher rate for high-performing shops
  } else if (totalRevenue >= 5000) {
    baseRate = 6;
  } else if (totalRevenue >= 1000) {
    baseRate = 5;
  } else {
    baseRate = 3; // Lower rate for new/low-performing shops
  }

  // Bonus for shops with many products
  if (productCount >= 50) {
    baseRate += 1;
  } else if (productCount >= 20) {
    baseRate += 0.5;
  }

  return Math.min(baseRate, 10); // Cap at 10%
}
