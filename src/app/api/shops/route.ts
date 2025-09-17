import { NextRequest, NextResponse } from 'next/server';
import { ShopService } from '@/services/shop.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { CreateShopRequest } from '@/types';

const shopService = new ShopService();

export async function POST(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const body: CreateShopRequest = await request.json();

      logger.info('Creating shop via API', { 
        userId: context.userId, 
        shopName: body.name 
      });

      const result = await shopService.createShop(body, context.userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Shop created successfully',
        shop: result.shop,
      }, { status: 201 });
    } catch (error) {
      logError(error as Error, { action: 'create_shop_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to create shop' },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return authMiddleware.requireAuth(request, async (req, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const ownerId = searchParams.get('owner_id');

      // If owner_id is provided, get shops for that owner
      if (ownerId) {
        // Only allow users to see their own shops unless they're admin
        if (context.userId !== ownerId && context.userRole !== 'admin') {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }

        const shops = await shopService.getUserShops(ownerId);
        return NextResponse.json({ shops });
      }

      // If no owner_id, get current user's shops
      const shops = await shopService.getUserShops(context.userId);
      return NextResponse.json({ shops });
    } catch (error) {
      logError(error as Error, { action: 'get_shops_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to get shops' },
        { status: 500 }
      );
    }
  });
}
