import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * Error Logging API Endpoint
 * Receives and stores error reports from the application
 */

const ErrorLogSchema = z.object({
  error_id: z.string(),
  error_type: z.enum(['javascript_error', 'api_error', 'global_error', 'boundary_error']),
  message: z.string().max(1000),
  stack: z.string().optional(),
  component_stack: z.string().optional(),
  digest: z.string().optional(),
  status_code: z.number().optional(),
  endpoint: z.string().optional(),
  method: z.string().optional(),
  user_message: z.string().optional(),
  retryable: z.boolean().optional(),
  level: z.enum(['page', 'section', 'component']).optional(),
  context: z.string().optional(),
  url: z.string().url(),
  user_agent: z.string(),
  timestamp: z.string().datetime(),
  user_id: z.string().optional(),
  session_id: z.string().optional(),
  build_version: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  
  try {
    const body = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Validate input
    const validation = ErrorLogSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Invalid error log data received', {
        errors: validation.error.issues,
        ip: ipAddress,
      });
      
      return NextResponse.json(
        { error: 'Invalid error log data' },
        { status: 400 }
      );
    }

    const errorData = validation.data;

    // Determine severity based on error type and context
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (errorData.error_type === 'global_error' || errorData.level === 'page') {
      severity = 'high';
    } else if (errorData.error_type === 'api_error' && errorData.status_code && errorData.status_code >= 500) {
      severity = 'high';
    } else if (errorData.error_type === 'boundary_error' && errorData.level === 'section') {
      severity = 'medium';
    } else if (errorData.error_type === 'javascript_error') {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    // Check for critical patterns
    if (errorData.message.toLowerCase().includes('chunkloa') || 
        errorData.message.toLowerCase().includes('script error') ||
        errorData.message.toLowerCase().includes('out of memory')) {
      severity = 'critical';
    }

    // Store in error_logs table
    const { error: insertError } = await supabase
      .from('error_logs')
      .insert({
        error_id: errorData.error_id,
        error_type: errorData.error_type,
        severity,
        message: errorData.message,
        stack_trace: errorData.stack,
        component_stack: errorData.component_stack,
        url: errorData.url,
        user_agent: errorData.user_agent,
        ip_address: ipAddress,
        user_id: errorData.user_id,
        session_id: errorData.session_id,
        status_code: errorData.status_code,
        endpoint: errorData.endpoint,
        http_method: errorData.method,
        error_context: errorData.context,
        error_level: errorData.level,
        retryable: errorData.retryable,
        build_version: errorData.build_version,
        metadata: errorData.metadata || {},
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      logger.error('Failed to store error log:', insertError);
      return NextResponse.json(
        { error: 'Failed to store error log' },
        { status: 500 }
      );
    }

    // Also log to security_events for critical errors
    if (severity === 'critical' || severity === 'high') {
      await supabase
        .from('security_events')
        .insert({
          event_type: 'suspicious_activity',
          ip_address: ipAddress,
          user_id: errorData.user_id,
          user_agent: errorData.user_agent,
          details: {
            error_type: errorData.error_type,
            error_id: errorData.error_id,
            message: errorData.message,
            severity,
            url: errorData.url,
            timestamp: errorData.timestamp,
          },
        });
    }

    logger.info('Error logged successfully', {
      errorId: errorData.error_id,
      errorType: errorData.error_type,
      severity,
      url: errorData.url,
      userId: errorData.user_id,
    });

    return NextResponse.json({
      success: true,
      error_id: errorData.error_id,
      severity,
    });

  } catch (error) {
    logger.error('Error logging API failed:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  
  try {
    const { searchParams } = new URL(request.url);
    const errorId = searchParams.get('error_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const severity = searchParams.get('severity');
    const errorType = searchParams.get('error_type');

    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (errorId) {
      query = query.eq('error_id', errorId);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (errorType) {
      query = query.eq('error_type', errorType);
    }

    const { data: errors, error } = await query;

    if (error) {
      logger.error('Failed to fetch error logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch error logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      errors: errors || [],
      total: errors?.length || 0,
    });

  } catch (error) {
    logger.error('Error logs API failed:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
