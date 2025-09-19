import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { templateService } from '@/services/template.service';
import { defaultLogger as logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/notifications/templates
 * List notification templates with filtering
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

    const url = new URL(request.url);
    const type = url.searchParams.get('type') as any;
    const channel = url.searchParams.get('channel') as any;
    const locale = url.searchParams.get('locale') || undefined;
    const isActive = url.searchParams.get('isActive');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const templates = await templateService.listTemplates({
      type,
      channel,
      locale,
      is_active: isActive !== null ? isActive === 'true' : undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      templates,
      pagination: {
        limit,
        offset,
        hasMore: templates.length === limit,
      },
    });

  } catch (error) {
    logger.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/templates
 * Create a new notification template
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
    const {
      name,
      type,
      channel,
      locale,
      subject_template,
      title_template,
      message_template,
      html_template,
      variables,
      metadata,
      is_active,
    } = body;

    if (!name || !type || !channel || !title_template) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, channel, title_template' },
        { status: 400 }
      );
    }

    // Validate template syntax
    if (subject_template) {
      const validation = await templateService.validateTemplate(subject_template);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: `Invalid subject template: ${validation.errors?.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const titleValidation = await templateService.validateTemplate(title_template);
    if (!titleValidation.isValid) {
      return NextResponse.json(
        { error: `Invalid title template: ${titleValidation.errors?.join(', ')}` },
        { status: 400 }
      );
    }

    if (message_template) {
      const messageValidation = await templateService.validateTemplate(message_template);
      if (!messageValidation.isValid) {
        return NextResponse.json(
          { error: `Invalid message template: ${messageValidation.errors?.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (html_template) {
      const htmlValidation = await templateService.validateTemplate(html_template);
      if (!htmlValidation.isValid) {
        return NextResponse.json(
          { error: `Invalid HTML template: ${htmlValidation.errors?.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const template = await templateService.createTemplate({
      name,
      type,
      channel,
      locale: locale || 'en',
      subject_template,
      title_template,
      message_template,
      html_template,
      variables: variables || {},
      metadata: metadata || {},
      is_active: is_active !== false,
    });

    return NextResponse.json({
      template,
      message: 'Template created successfully',
    });

  } catch (error) {
    logger.error('Error creating template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
