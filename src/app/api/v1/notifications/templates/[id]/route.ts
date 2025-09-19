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
 * GET /api/notifications/templates/[id]
 * Get a specific template
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const locale = url.searchParams.get('locale') || 'en';

    const template = await templateService.getTemplate(id, locale);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });

  } catch (error) {
    logger.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/templates/[id]
 * Update a template
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const {
      name,
      subject_template,
      title_template,
      message_template,
      html_template,
      variables,
      metadata,
      is_active,
    } = body;

    // Validate template syntax if provided
    if (subject_template) {
      const validation = await templateService.validateTemplate(subject_template);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: `Invalid subject template: ${validation.errors?.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (title_template) {
      const titleValidation = await templateService.validateTemplate(title_template);
      if (!titleValidation.isValid) {
        return NextResponse.json(
          { error: `Invalid title template: ${titleValidation.errors?.join(', ')}` },
          { status: 400 }
        );
      }
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

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (subject_template !== undefined) updates.subject_template = subject_template;
    if (title_template !== undefined) updates.title_template = title_template;
    if (message_template !== undefined) updates.message_template = message_template;
    if (html_template !== undefined) updates.html_template = html_template;
    if (variables !== undefined) updates.variables = variables;
    if (metadata !== undefined) updates.metadata = metadata;
    if (is_active !== undefined) updates.is_active = is_active;

    const template = await templateService.updateTemplate(id, updates);

    return NextResponse.json({
      template,
      message: 'Template updated successfully',
    });

  } catch (error) {
    logger.error('Error updating template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/templates/[id]
 * Delete a template
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await templateService.deleteTemplate(id);

    return NextResponse.json({
      message: 'Template deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
