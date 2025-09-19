/**
 * Error Boundary System Types
 * Comprehensive type definitions for error handling
 */

export interface ApplicationError {
  id: string;
  type: 'javascript' | 'api' | 'network' | 'validation' | 'authorization' | 'server' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userMessage: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  context?: string;
  metadata?: Record<string, unknown>;
  retryable: boolean;
  recovered: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  lastErrorTime: Date | null;
  isRecovering: boolean;
}

export interface ErrorRecoveryOptions {
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  autoRetry: boolean;
  showUserFeedback: boolean;
}

export interface ErrorLogEntry {
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

export interface ApiErrorDetails {
  status?: number;
  statusText?: string;
  endpoint?: string;
  method?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  headers?: Record<string, string>;
}

export interface ErrorPattern {
  id: string;
  pattern_hash: string;
  pattern_text: string;
  first_seen: Date;
  last_seen: Date;
  occurrence_count: number;
  affected_users: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'investigating' | 'resolved' | 'ignored';
  resolution_notes?: string;
}

export interface ErrorMetrics {
  timeframe: 'hour' | 'day' | 'week' | 'month';
  total_errors: number;
  error_rate: number;
  errors_by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  errors_by_type: {
    javascript_error: number;
    api_error: number;
    global_error: number;
    boundary_error: number;
  };
  top_error_messages: Array<{
    message: string;
    count: number;
    percentage: number;
  }>;
  most_affected_pages: Array<{
    url: string;
    count: number;
    error_rate: number;
  }>;
  error_trends: Array<{
    timestamp: string;
    count: number;
    severity_breakdown: Record<string, number>;
  }>;
}

export interface ErrorNotification {
  id: string;
  error_log_id: string;
  notification_type: 'email' | 'slack' | 'webhook' | 'sms';
  recipient: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: Date;
  error_message?: string;
  created_at: Date;
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'redirect' | 'reload_page' | 'ignore';
  condition: (error: ApplicationError) => boolean;
  action: (error: ApplicationError) => Promise<void> | void;
  priority: number;
}

export interface ErrorHandlerConfig {
  enableErrorBoundaries: boolean;
  enableApiErrorHandling: boolean;
  enableSentryIntegration: boolean;
  enableErrorLogging: boolean;
  enableUserFeedback: boolean;
  enablePerformanceMonitoring: boolean;
  errorRetentionDays: number;
  maxRetryAttempts: number;
  retryDelayMs: number;
  sentryDsn?: string;
  sentryEnvironment: string;
  alertThresholds: {
    criticalErrorCount: number;
    highErrorRate: number;
    errorSpikeMultiplier: number;
  };
}

export interface UserErrorReport {
  error_id: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  description: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  browser_info: {
    user_agent: string;
    viewport_size: string;
    screen_resolution: string;
    timezone: string;
  };
  attachments?: File[];
}

export interface ErrorDashboardData {
  overview: {
    total_errors_today: number;
    critical_errors_today: number;
    error_rate_today: number;
    top_error_today: string;
  };
  trends: {
    hourly_errors: Array<{ hour: string; count: number }>;
    daily_errors: Array<{ date: string; count: number }>;
  };
  patterns: ErrorPattern[];
  recent_errors: ErrorLogEntry[];
  affected_users: Array<{
    user_id: string;
    error_count: number;
    last_error: Date;
  }>;
}

// Error classification types
export type ErrorCategory = 
  | 'authentication'
  | 'authorization' 
  | 'validation'
  | 'network'
  | 'database'
  | 'payment'
  | 'file_upload'
  | 'search'
  | 'ui_rendering'
  | 'performance'
  | 'security'
  | 'unknown';

export type ErrorSource = 
  | 'client'
  | 'server'
  | 'database'
  | 'external_api'
  | 'cdn'
  | 'browser';

export type RecoveryAction = 
  | 'retry'
  | 'reload_page'
  | 'clear_cache'
  | 'redirect_home'
  | 'show_fallback'
  | 'contact_support'
  | 'none';

// Error context interfaces
export interface ErrorContext {
  page?: string;
  component?: string;
  user_action?: string;
  feature?: string;
  experiment?: string;
  ab_test?: string;
}

export interface ErrorEnvironment {
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  device_type: 'desktop' | 'tablet' | 'mobile';
  screen_resolution: string;
  viewport_size: string;
  connection_type?: string;
  timezone: string;
  language: string;
}

// Utility types
export type ErrorHandler = (error: ApplicationError) => void | Promise<void>;
export type ErrorFilter = (error: ApplicationError) => boolean;
export type ErrorTransformer = (error: Error) => ApplicationError;

// Error boundary hook types
export interface UseErrorBoundaryReturn {
  captureError: (error: Error) => void;
  resetError: () => void;
  error: Error | null;
}

export interface UseAsyncErrorReturn<T> {
  execute: (operation: () => Promise<T>) => Promise<T | null>;
  isLoading: boolean;
  error: ApplicationError | null;
  data: T | null;
  reset: () => void;
  retry: () => Promise<T | null>;
}

// Configuration validation
export interface ErrorConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
