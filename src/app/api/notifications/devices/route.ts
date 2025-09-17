import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pushService } from '@/services/push.service';
import { defaultLogger as logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/notifications/devices
 * Register a device token for push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      token: deviceToken, 
      platform, 
      device_id, 
      device_name, 
      app_version, 
      os_version 
    } = body;

    if (!deviceToken || !platform) {
      return NextResponse.json(
        { error: 'Device token and platform are required' },
        { status: 400 }
      );
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be ios, android, or web' },
        { status: 400 }
      );
    }

    // Validate token format if needed
    const isValidToken = await pushService.validateToken(deviceToken);
    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Invalid device token' },
        { status: 400 }
      );
    }

    // Upsert device token
    const { data: existingToken } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('token', deviceToken)
      .eq('platform', platform)
      .single();

    if (existingToken) {
      // Update existing token
      const { error: updateError } = await supabase
        .from('device_tokens')
        .update({
          device_id,
          device_name,
          app_version,
          os_version,
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingToken.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Insert new token
      const { error: insertError } = await supabase
        .from('device_tokens')
        .insert({
          user_id: user.id,
          token: deviceToken,
          platform,
          device_id,
          device_name,
          app_version,
          os_version,
          is_active: true,
          last_used_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({
      message: 'Device token registered successfully',
    });

  } catch (error) {
    logger.error('Error registering device token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/devices
 * Get user's registered devices
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: devices, error } = await supabase
      .from('device_tokens')
      .select('id, platform, device_name, app_version, os_version, is_active, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      devices: devices || [],
    });

  } catch (error) {
    logger.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/devices
 * Remove a device token
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const deviceToken = url.searchParams.get('token');
    const deviceId = url.searchParams.get('deviceId');

    if (!deviceToken && !deviceId) {
      return NextResponse.json(
        { error: 'Device token or device ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deviceToken) {
      query = query.eq('token', deviceToken);
    } else if (deviceId) {
      query = query.eq('id', deviceId);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: 'Device token removed successfully',
    });

  } catch (error) {
    logger.error('Error removing device token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
