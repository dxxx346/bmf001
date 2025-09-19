import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  createApiKey, 
  getUserApiKeys, 
  API_PERMISSIONS, 
  type ApiPermission 
} from '@/lib/api-keys';
import { defaultLogger as logger } from '@/lib/logger';
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limit';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).min(1),
  expires_at: z.string().datetime().optional(),
});

// GET /api/partner/api-keys - Get user's API keys
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request, 
      'api-keys-get', 
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

    // Get user from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logger.warn('Invalid token for API keys request', { error: authError });
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user's API keys
    const result = await getUserApiKeys(user.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      api_keys: result.keys,
      permissions: API_PERMISSIONS
    });

  } catch (error) {
    logger.error('Error getting API keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/partner/api-keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for creation
    const rateLimitResult = await rateLimiter.checkLimit(
      request, 
      'api-keys-create', 
      {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 5, // 5 API keys per hour
        message: 'Too many API key creation attempts',
      }
    );
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600'
          }
        }
      );
    }

    // Get user from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logger.warn('Invalid token for API key creation', { error: authError });
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = createApiKeySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { name, permissions, expires_at } = validation.data;

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

    // Check if user already has too many API keys
    const existingKeys = await getUserApiKeys(user.id);
    if (existingKeys.success && existingKeys.keys && existingKeys.keys.length >= 10) {
      return NextResponse.json(
        { error: 'Maximum number of API keys reached (10)' },
        { status: 400 }
      );
    }

    // Create API key
    const result = await createApiKey({
      user_id: user.id,
      name,
      permissions,
      expires_at,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    logger.info('API key created', { 
      user_id: user.id,
      key_name: name,
      permissions 
    });

    return NextResponse.json({
      success: true,
      message: 'API key created successfully',
      api_key: result.apiKey, // Only returned once
      key_data: result.keyData,
    }, { status: 201 });

  } catch (error) {
    logger.error('Error creating API key:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
