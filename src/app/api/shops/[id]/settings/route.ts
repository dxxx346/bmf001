import { NextRequest, NextResponse } from 'next/server';
import { ShopService } from '@/services/shop.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { UpdateShopRequest } from '@/types';

const shopService = new ShopService();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shopId } = await params;
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const body: UpdateShopRequest = await request.json();

      logger.info('Updating shop settings via API', { 
        shopId,
        userId: context.userId,
        updates: Object.keys(body)
      });

      const result = await shopService.updateShop(shopId, body, context.userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Shop settings updated successfully',
        shop: result.shop,
      });
    } catch (error) {
      logError(error as Error, { action: 'update_shop_settings_api', shopId: shopId, userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to update shop settings' },
        { status: 500 }
      );
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shopId } = await params;
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {

      logger.info('Getting shop settings via API', { 
        shopId,
        userId: context.userId 
      });

      const shop = await shopService.getShop(shopId);

      if (!shop) {
        return NextResponse.json(
          { error: 'Shop not found' },
          { status: 404 }
        );
      }

      // Verify shop ownership or admin access
      if (shop.owner_id !== context.userId && context.userRole !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json({ shop });
    } catch (error) {
      logError(error as Error, { action: 'get_shop_settings_api', shopId: shopId, userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to get shop settings' },
        { status: 500 }
      );
    }
  });
}
