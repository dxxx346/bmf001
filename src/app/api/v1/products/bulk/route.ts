import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const productService = new ProductService();

export async function POST(request: NextRequest) {
  return authMiddleware.requireSeller(request, async (req, context) => {
    try {
      const body = await request.json();
      const { operation_type, product_ids, parameters } = body;

      if (!operation_type || !product_ids || !Array.isArray(product_ids)) {
        return NextResponse.json(
          { error: 'Operation type and product IDs are required' },
          { status: 400 }
        );
      }

      if (!['update', 'delete', 'activate', 'deactivate', 'archive'].includes(operation_type)) {
        return NextResponse.json(
          { error: 'Invalid operation type' },
          { status: 400 }
        );
      }

      logger.info('Creating bulk operation via API', { 
        operationType: operation_type, 
        productCount: product_ids.length, 
        sellerId: context.userId 
      });

      const result = await productService.createBulkOperation(
        operation_type,
        product_ids,
        parameters || {},
        context.userId
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Bulk operation created successfully',
        operation_id: result.operationId,
      }, { status: 201 });
    } catch (error) {
      logError(error as Error, { action: 'create_bulk_operation_api', userId: context.userId });
      return NextResponse.json(
        { error: 'Failed to create bulk operation' },
        { status: 500 }
      );
    }
  });
}
