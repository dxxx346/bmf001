import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  revokeApiKey, 
  updateApiKeyPermissions,
  getApiKeyUsageStats,
  API_PERMISSIONS 
} from '@/lib/api-keys';
import { defaultLogger as logger } from '@/lib/logger';
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limit';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const updateApiKeySchema = z.object({
  permissions: z.array(z.string()).min(1).optional(),
});

const usageStatsSchema = z.object({
  days: z.number().int().min(1).max(365).optional().default(30),
});

interface RouteParams {
  params: {
    id: string;
  };
}

async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authorization header required', status: 401 };
  }

  const token = authHeader.substring(7);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    logger.warn('Invalid token for API key operation', { error: authError });
    return { error: 'Invalid token', status: 401 };
  }

  return { user };
}

// GET /api/partner/api-keys/[id] - Get API key usage statistics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request, 
      'api-keys-stats', 
      rateLimitConfigs.api
    );
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Authenticate user
    const auth = await authenticateUser(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;
    const keyId = params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(keyId)) {
      return NextResponse.json(
        { error: 'Invalid API key ID format' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const validation = usageStatsSchema.safeParse({ days });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    // Get usage statistics
    const result = await getApiKeyUsageStats(keyId, user.id, validation.data.days);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'API key not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: result.stats,
    });

  } catch (error) {
    logger.error('Error getting API key stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/partner/api-keys/[id] - Update API key permissions
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request, 
      'api-keys-update', 
      rateLimitConfigs.api
    );
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Authenticate user
    const auth = await authenticateUser(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;
    const keyId = params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(keyId)) {
      return NextResponse.json(
        { error: 'Invalid API key ID format' },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = updateApiKeySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { permissions } = validation.data;

    if (permissions) {
      // Validate permissions
      const validPermissions = Object.keys(API_PERMISSIONS);
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { 
            error: 'Invalid permissions',
            invalid_permissions: invalidPermissions 
          },
          { status: 400 }
        );
      }

      // Update permissions
      const result = await updateApiKeyPermissions(keyId, user.id, permissions);
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.error === 'API key not found' ? 404 : 500 }
        );
      }

      logger.info('API key permissions updated', { 
        user_id: user.id,
        key_id: keyId,
        permissions 
      });
    }

    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
    });

  } catch (error) {
    logger.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/partner/api-keys/[id] - Revoke API key
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request, 
      'api-keys-delete', 
      rateLimitConfigs.api
    );
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Authenticate user
    const auth = await authenticateUser(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;
    const keyId = params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(keyId)) {
      return NextResponse.json(
        { error: 'Invalid API key ID format' },
        { status: 400 }
      );
    }

    // Revoke API key
    const result = await revokeApiKey(keyId, user.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'API key not found' ? 404 : 500 }
      );
    }

    logger.info('API key revoked', { 
      user_id: user.id,
      key_id: keyId 
    });

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });

  } catch (error) {
    logger.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
