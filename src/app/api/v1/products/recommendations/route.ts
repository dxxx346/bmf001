import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const productService = new ProductService();

export async function GET(request: NextRequest) {
  return authMiddleware.optionalAuth(request).then(async (context) => {
    try {
      const { searchParams } = new URL(request.url);
      
      const recommendationRequest = {
        user_id: context.isAuthenticated ? context.userId : undefined,
        product_id: searchParams.get('product_id') || undefined,
        category_id: searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!) : undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
        algorithm: searchParams.get('algorithm') as any || 'hybrid',
      };

      logger.info('Get product recommendations API call', { 
        userId: recommendationRequest.user_id,
        productId: recommendationRequest.product_id,
        algorithm: recommendationRequest.algorithm 
      });

      const recommendations = await productService.getProductRecommendations(recommendationRequest);

      return NextResponse.json({ recommendations });
    } catch (error) {
      logError(error as Error, { action: 'get_product_recommendations_api' });
      return NextResponse.json(
        { error: 'Failed to get product recommendations' },
        { status: 500 }
      );
    }
  });
}
