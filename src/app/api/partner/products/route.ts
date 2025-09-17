import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return authMiddleware.requirePartner(request, async (req, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const category = searchParams.get('category');
      const limit = parseInt(searchParams.get('limit') || '50');
      const search = searchParams.get('search');
      
      logger.info('Fetching products for partner', { 
        userId: context.userId, 
        category,
        limit,
        search 
      });

      const supabase = createServiceClient();
      
      // Build query for active products
      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          price,
          sale_price,
          thumbnail_url,
          category:categories(name),
          shop:shops(name),
          stats:product_stats(
            purchase_count,
            average_rating,
            total_revenue
          )
        `)
        .eq('status', 'active')
        .order('stats.total_revenue', { ascending: false });

      // Apply filters
      if (category && category !== 'all') {
        query = query.eq('category.name', category);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
      }

      // Apply limit
      query = query.limit(limit);

      const { data: products, error } = await query;

      if (error) {
        logError(error as Error, { action: 'get_partner_products', userId: context.userId });
        return NextResponse.json(
          { error: 'Failed to fetch products' },
          { status: 500 }
        );
      }

      // Transform data for partner use
      const transformedProducts = products?.map(product => ({
        id: product.id,
        title: product.title,
        price: product.price,
        sale_price: product.sale_price,
        thumbnail_url: product.thumbnail_url,
        category: product.category?.name || 'Uncategorized',
        shop_name: product.shop?.name || 'Unknown Shop',
        commission_rate: calculateCommissionRate(product.price, product.category?.name),
        popularity_score: product.stats?.[0]?.purchase_count || 0,
        rating: product.stats?.[0]?.average_rating || 0,
        total_revenue: parseFloat(product.stats?.[0]?.total_revenue || '0'),
      })) || [];

      logger.info('Partner products fetched successfully', { 
        userId: context.userId,
        productCount: transformedProducts.length 
      });

      return NextResponse.json({ 
        products: transformedProducts,
        total_count: transformedProducts.length,
      });

    } catch (error) {
      logError(error as Error, { 
        action: 'get_partner_products_api',
        userId: context.userId 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Calculate commission rate based on product price and category
function calculateCommissionRate(price: number, category?: string): number {
  // Base commission rates by category
  const categoryRates: Record<string, number> = {
    'Digital Art': 15,
    'Templates': 12,
    'Software': 10,
    'Music': 8,
    'Videos': 8,
    'Books': 6,
    'Courses': 12,
    'Graphics': 15,
  };

  let baseRate = categoryRates[category || ''] || 10;

  // Adjust based on price
  if (price >= 100) {
    baseRate = Math.max(baseRate - 2, 5); // Lower rate for expensive items
  } else if (price >= 50) {
    baseRate = baseRate; // Standard rate
  } else {
    baseRate = Math.min(baseRate + 2, 20); // Higher rate for cheaper items
  }

  return baseRate;
}
