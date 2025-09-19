import { createServiceClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';

/**
 * Error Logging Service
 * Centralized service for logging and managing application errors
 */

export interface ErrorLog {
  id: string;
  error_id: string;
  error_type: 'javascript_error' | 'api_error' | 'global_error' | 'boundary_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack_trace?: string;
  component_stack?: string;
  url: string;
  user_agent: string;
  ip_address: string;
  user_id?: string;
  session_id?: string;
  status_code?: number;
  endpoint?: string;
  http_method?: string;
  error_context?: string;
  error_level?: 'page' | 'section' | 'component';
  retryable?: boolean;
  build_version?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface ErrorMetrics {
  total_errors: number;
  errors_by_severity: Record<string, number>;
  errors_by_type: Record<string, number>;
  top_error_messages: Array<{ message: string; count: number }>;
  error_rate_by_hour: Array<{ hour: string; count: number }>;
  most_affected_pages: Array<{ url: string; count: number }>;
  recent_errors: ErrorLog[];
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  first_seen: Date;
  last_seen: Date;
  affected_users: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorLoggingService {
  private supabase = createServiceClient();

  /**
   * Log an error to the database
   */
  async logError(errorData: Omit<ErrorLog, 'id' | 'created_at'>): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('error_logs')
        .insert({
          ...errorData,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to store error log:', error);
        throw error;
      }

      logger.info('Error logged successfully', {
        errorId: errorData.error_id,
        severity: errorData.severity,
        type: errorData.error_type,
      });

      return data.id;
    } catch (error) {
      logger.error('Error logging service failed:', error);
      throw error;
    }
  }

  /**
   * Get error logs with filtering
   */
  async getErrorLogs(filters: {
    severity?: string;
    error_type?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ errors: ErrorLog[]; total: number }> {
    try {
      let query = this.supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.error_type) {
        query = query.eq('error_type', filters.error_type);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data: errors, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch error logs:', error);
        throw error;
      }

      return {
        errors: (errors || []) as ErrorLog[],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Failed to get error logs:', error);
      return { errors: [], total: 0 };
    }
  }

  /**
   * Get error metrics for dashboard
   */
  async getErrorMetrics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<ErrorMetrics> {
    try {
      const timeframes = {
        hour: '1 hour',
        day: '1 day',
        week: '7 days',
        month: '30 days',
      };

      const startDate = new Date();
      startDate.setTime(startDate.getTime() - this.getTimeframeMs(timeframe));

      const { data: errors, error } = await this.supabase
        .from('error_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch error metrics:', error);
        throw error;
      }

      const errorList = errors || [];
      const totalErrors = errorList.length;

      // Errors by severity
      const errorsBySeverity = errorList.reduce((acc, err) => {
        acc[err.severity] = (acc[err.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Errors by type
      const errorsByType = errorList.reduce((acc, err) => {
        acc[err.error_type] = (acc[err.error_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Top error messages
      const messageCount = errorList.reduce((acc, err) => {
        const shortMessage = err.message.substring(0, 100);
        acc[shortMessage] = (acc[shortMessage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topErrorMessages = Object.entries(messageCount)
        .map(([message, count]) => ({ message, count: count as number }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 10);

      // Error rate by hour
      const errorRateByHour = this.calculateHourlyErrorRate(errorList);

      // Most affected pages
      const pageCount = errorList.reduce((acc, err) => {
        const url = new URL(err.url).pathname;
        acc[url] = (acc[url] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostAffectedPages = Object.entries(pageCount)
        .map(([url, count]) => ({ url, count: count as number }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 10);

      return {
        total_errors: totalErrors,
        errors_by_severity: errorsBySeverity,
        errors_by_type: errorsByType,
        top_error_messages: topErrorMessages,
        error_rate_by_hour: errorRateByHour,
        most_affected_pages: mostAffectedPages,
        recent_errors: errorList.slice(0, 20) as ErrorLog[],
      };
    } catch (error) {
      logger.error('Failed to get error metrics:', error);
      return {
        total_errors: 0,
        errors_by_severity: {},
        errors_by_type: {},
        top_error_messages: [],
        error_rate_by_hour: [],
        most_affected_pages: [],
        recent_errors: [],
      };
    }
  }

  /**
   * Detect error patterns
   */
  async detectErrorPatterns(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<ErrorPattern[]> {
    try {
      const startDate = new Date();
      startDate.setTime(startDate.getTime() - this.getTimeframeMs(timeframe));

      const { data: errors, error } = await this.supabase
        .from('error_logs')
        .select('message, created_at, user_id')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const patterns = new Map<string, {
        count: number;
        first_seen: Date;
        last_seen: Date;
        users: Set<string>;
      }>();

      for (const errorLog of errors || []) {
        // Extract pattern from error message
        const pattern = this.extractErrorPattern(errorLog.message);
        const createdAt = new Date(errorLog.created_at);

        if (!patterns.has(pattern)) {
          patterns.set(pattern, {
            count: 0,
            first_seen: createdAt,
            last_seen: createdAt,
            users: new Set(),
          });
        }

        const patternData = patterns.get(pattern)!;
        patternData.count++;
        patternData.last_seen = createdAt;
        
        if (errorLog.user_id) {
          patternData.users.add(errorLog.user_id);
        }

        if (createdAt < patternData.first_seen) {
          patternData.first_seen = createdAt;
        }
      }

      return Array.from(patterns.entries())
        .map(([pattern, data]) => ({
          pattern,
          count: data.count,
          first_seen: data.first_seen,
          last_seen: data.last_seen,
          affected_users: data.users.size,
          severity: this.calculatePatternSeverity(data.count, data.users.size),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    } catch (error) {
      logger.error('Failed to detect error patterns:', error);
      return [];
    }
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string, resolutionNotes: string, resolvedBy: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('error_logs')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
          metadata: { resolved_by: resolvedBy },
        })
        .eq('error_id', errorId);

      if (error) {
        logger.error('Failed to resolve error:', error);
        throw error;
      }

      logger.info('Error marked as resolved', { errorId, resolvedBy });
    } catch (error) {
      logger.error('Failed to resolve error:', error);
      throw error;
    }
  }

  /**
   * Clean up old error logs
   */
  async cleanupOldErrors(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { error } = await this.supabase
        .from('error_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        logger.error('Failed to cleanup old errors:', error);
        throw error;
      }

      logger.info('Old error logs cleaned up', { cutoffDate, retentionDays });
    } catch (error) {
      logger.error('Failed to cleanup old errors:', error);
      throw error;
    }
  }

  private getTimeframeMs(timeframe: string): number {
    const timeframes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    return timeframes[timeframe as keyof typeof timeframes] || timeframes.day;
  }

  private calculateHourlyErrorRate(errors: any[]): Array<{ hour: string; count: number }> {
    const hourlyCount = new Map<string, number>();
    
    for (const error of errors) {
      const hour = new Date(error.created_at).toISOString().substring(0, 13);
      hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
    }

    return Array.from(hourlyCount.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  private extractErrorPattern(message: string): string {
    // Remove specific details to identify patterns
    return message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/https?:\/\/[^\s]+/g, 'URL') // Replace URLs
      .replace(/\w+@\w+\.\w+/g, 'EMAIL') // Replace emails
      .substring(0, 200); // Limit length
  }

  private calculatePatternSeverity(count: number, affectedUsers: number): 'low' | 'medium' | 'high' | 'critical' {
    if (count > 100 || affectedUsers > 50) {
      return 'critical';
    } else if (count > 50 || affectedUsers > 20) {
      return 'high';
    } else if (count > 20 || affectedUsers > 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

// Singleton instance
export const errorLoggingService = new ErrorLoggingService();

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorId = `unhandled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    errorLoggingService.logError({
      error_id: errorId,
      error_type: 'javascript_error',
      severity: 'high',
      message: event.reason?.message || 'Unhandled promise rejection',
      stack_trace: event.reason?.stack,
      url: window.location.href,
      user_agent: navigator.userAgent,
      ip_address: 'client',
      error_context: 'unhandled_promise_rejection',
      metadata: {
        reason: event.reason,
        promise: event.promise,
      },
    }).catch(console.error);

    // Send to Sentry if available
    if ((window as any).Sentry) {
      (window as any).Sentry.captureException(event.reason, {
        tags: {
          errorType: 'unhandled_promise_rejection',
        },
      });
    }
  });

  // Global error handler for uncaught exceptions
  window.addEventListener('error', (event) => {
    const errorId = `uncaught_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    errorLoggingService.logError({
      error_id: errorId,
      error_type: 'javascript_error',
      severity: 'high',
      message: event.message,
      stack_trace: event.error?.stack,
      url: window.location.href,
      user_agent: navigator.userAgent,
      ip_address: 'client',
      error_context: 'uncaught_exception',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      },
    }).catch(console.error);

    // Send to Sentry if available
    if ((window as any).Sentry) {
      (window as any).Sentry.captureException(event.error, {
        tags: {
          errorType: 'uncaught_exception',
        },
      });
    }
  });
}
