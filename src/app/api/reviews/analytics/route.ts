import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ReviewService } from '@/services/review.service';
import { ReviewModerationService } from '@/services/review-moderation.service';
import { ReviewIncentiveService } from '@/services/review-incentive.service';

const reviewService = new ReviewService();
const moderationService = new ReviewModerationService();
const incentiveService = new ReviewIncentiveService();

// GET /api/reviews/analytics - Get review analytics
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');
    const shop_id = searchParams.get('shop_id');
    const type = searchParams.get('type') || 'summary';

    // Verify user has access to the requested data
    if (product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', product_id)
        .single();

      if (!product || (product.seller_id !== user.id && !await isAdminOrModerator(supabase, user.id))) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized access to product analytics'
        }, { status: 403 });
      }
    }

    if (shop_id) {
      const { data: shop } = await supabase
        .from('shops')
        .select('owner_id')
        .eq('id', shop_id)
        .single();

      if (!shop || (shop.owner_id !== user.id && !await isAdminOrModerator(supabase, user.id))) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized access to shop analytics'
        }, { status: 403 });
      }
    }

    let data;

    switch (type) {
      case 'summary':
        if (product_id) {
          data = await reviewService.getProductReviewSummary(product_id);
        } else {
          data = await getOverallAnalytics(supabase, user.id, shop_id || undefined);
        }
        break;

      case 'moderation':
        if (await isAdminOrModerator(supabase, user.id)) {
          data = await moderationService.getModerationStats();
        } else {
          return NextResponse.json({
            success: false,
            error: 'Admin or moderator role required'
          }, { status: 403 });
        }
        break;

      case 'incentives':
        const filters: any = {};
        if (product_id) filters.product_id = product_id;
        if (shop_id) filters.shop_id = shop_id;
        filters.created_by = user.id;

        data = await incentiveService.getIncentiveStats(filters);
        break;

      case 'reviewer_profile':
        data = await reviewService.getReviewerProfile(user.id);
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid analytics type'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get analytics'
    }, { status: 500 });
  }
}

// Helper function to check if user is admin or moderator
async function isAdminOrModerator(supabase: any, userId: string): Promise<boolean> {
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  return userData && ['admin', 'moderator'].includes(userData.role);
}

// Get overall analytics for a user
async function getOverallAnalytics(supabase: any, userId: string, shopId?: string) {
  // Get user's products
  let productQuery = supabase
    .from('products')
    .select('id')
    .eq('seller_id', userId);

  if (shopId) {
    productQuery = productQuery.eq('shop_id', shopId);
  }

  const { data: products } = await productQuery;
  const productIds = products?.map(p => p.id) || [];

  if (productIds.length === 0) {
    return {
      total_products: 0,
      total_reviews: 0,
      average_rating: 0,
      verified_reviews: 0,
      total_responses: 0,
      response_rate: 0
    };
  }

  // Get reviews for these products
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, is_verified, response_count')
    .in('product_id', productIds)
    .eq('status', 'approved');

  const total_reviews = reviews?.length || 0;
  const verified_reviews = reviews?.filter(r => r.is_verified).length || 0;
  const total_responses = reviews?.reduce((sum, r) => sum + r.response_count, 0) || 0;
  const average_rating = total_reviews > 0 
    ? reviews!.reduce((sum, r) => sum + r.rating, 0) / total_reviews 
    : 0;
  const response_rate = total_reviews > 0 
    ? (reviews!.filter(r => r.response_count > 0).length / total_reviews) * 100 
    : 0;

  return {
    total_products: productIds.length,
    total_reviews,
    average_rating: Math.round(average_rating * 100) / 100,
    verified_reviews,
    total_responses,
    response_rate: Math.round(response_rate * 100) / 100
  };
}
