import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { templateService } from '@/services/template.service';
import { defaultLogger as logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/notifications/templates/[id]/preview
 * Preview a template with sample data
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
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

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { locale = 'en', sample_data = {} } = body;

    // Get the template
    const template = await templateService.getTemplate(id, locale);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Create sample context
    const sampleContext = {
      user: {
        id: 'sample-user-id',
        name: sample_data.user_name || 'John Doe',
        email: sample_data.user_email || 'john.doe@example.com',
        avatar_url: sample_data.user_avatar || 'https://example.com/avatar.jpg',
      },
      data: {
        product_name: 'Sample Product',
        order_id: 'ORD-12345',
        amount: 99.99,
        currency: 'USD',
        shop_name: 'Sample Shop',
        commission_amount: 10.99,
        download_url: 'https://example.com/download/sample',
        reset_url: 'https://example.com/reset-password?token=sample',
        verification_url: 'https://example.com/verify?token=sample',
        ...sample_data,
      },
      app_url: process.env.NEXT_PUBLIC_APP_URL || 'https://example.com',
      unsubscribe_url: 'https://example.com/unsubscribe?token=sample',
      locale,
    };

    // Render all template parts
    const rendered = await templateService.renderTemplate(template, sampleContext);

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        channel: template.channel,
        locale: template.locale,
      },
      rendered,
      sample_context: sampleContext,
    });

  } catch (error) {
    logger.error('Error previewing template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
