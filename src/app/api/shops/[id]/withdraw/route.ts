import { NextRequest, NextResponse } from 'next/server';
import { ShopService } from '@/services/shop.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const shopService = new ShopService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shopId } = await params;
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const body = await request.json();
      const { amount, method, account_details } = body;

      if (!amount || !method || !account_details) {
        return NextResponse.json(
          { error: 'Amount, method, and account details are required' },
          { status: 400 }
        );
      }

      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be greater than 0' },
          { status: 400 }
        );
      }

      if (!['bank_transfer', 'crypto', 'paypal'].includes(method)) {
        return NextResponse.json(
          { error: 'Invalid withdrawal method' },
          { status: 400 }
        );
      }

      logger.info('Creating withdrawal request via API', { 
        shopId, 
        amount,
        method,
        userId: context.userId 
      });

      const result = await shopService.createWithdrawalRequest(
        shopId,
        amount,
        method,
        account_details,
        context.userId
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Withdrawal request created successfully',
        request: result.request,
      }, { status: 201 });
    } catch (error) {
      logError(error as Error, { action: 'create_withdrawal_request_api', shopId: shopId, userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to create withdrawal request' },
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

      logger.info('Getting withdrawal requests via API', { 
        shopId,
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

      const requests = await shopService.getWithdrawalRequests(shopId, context.userId);

      return NextResponse.json({ requests });
    } catch (error) {
      logError(error as Error, { action: 'get_withdrawal_requests_api', shopId: shopId, userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to get withdrawal requests' },
        { status: 500 }
      );
    }
  });
}
