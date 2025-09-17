import { NextRequest, NextResponse } from 'next/server';
import { ShopService } from '@/services/shop.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const shopService = new ShopService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shopId } = await params;
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const period = searchParams.get('period') || '30d';

      logger.info('Getting shop analytics via API', { 
        shopId, 
        period,
        userId: context.userId 
      });

      // Verify shop ownership or admin access
      const shop = await shopService.getShop(shopId);
      if (!shop) {
        return NextResponse.json(
          { error: 'Shop not found' },
          { status: 404 }
        );
      }

      if (shop.owner_id !== context.userId && context.userRole !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      const analytics = await shopService.getShopAnalytics(shopId, period);

      if (!analytics) {
        return NextResponse.json(
          { error: 'Failed to get analytics' },
          { status: 500 }
        );
      }

      return NextResponse.json({ analytics });
    } catch (error) {
      logError(error as Error, { action: 'get_shop_analytics_api', shopId: shopId, userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to get shop analytics' },
        { status: 500 }
      );
    }
  });
}
