'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock,
  RefreshCw,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { ErrorMetrics, ErrorLogEntry, ErrorPattern } from '@/types/error';

/**
 * Error Dashboard Component
 * Comprehensive error monitoring and management dashboard for administrators
 */

interface ErrorDashboardState {
  metrics: ErrorMetrics | null;
  recentErrors: ErrorLogEntry[];
  errorPatterns: ErrorPattern[];
  loading: boolean;
  error: string | null;
  selectedTimeframe: 'hour' | 'day' | 'week' | 'month';
  selectedSeverity: string | null;
  selectedErrorType: string | null;
}

export function ErrorDashboard() {
  const [state, setState] = useState<ErrorDashboardState>({
    metrics: null,
    recentErrors: [],
    errorPatterns: [],
    loading: true,
    error: null,
    selectedTimeframe: 'day',
    selectedSeverity: null,
    selectedErrorType: null,
  });

  const fetchErrorData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch error metrics
      const metricsResponse = await fetch(`/api/admin/errors/metrics?timeframe=${state.selectedTimeframe}`);
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch error metrics');
      }
      const metrics = await metricsResponse.json();

      // Fetch recent errors
      const errorsResponse = await fetch('/api/errors/log?limit=50');
      if (!errorsResponse.ok) {
        throw new Error('Failed to fetch recent errors');
      }
      const { errors: recentErrors } = await errorsResponse.json();

      // Fetch error patterns
      const patternsResponse = await fetch('/api/admin/errors/patterns');
      if (!patternsResponse.ok) {
        throw new Error('Failed to fetch error patterns');
      }
      const { patterns: errorPatterns } = await patternsResponse.json();

      setState(prev => ({
        ...prev,
        metrics,
        recentErrors,
        errorPatterns,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load error data',
        loading: false,
      }));
    }
  }, [state.selectedTimeframe]);

  useEffect(() => {
    fetchErrorData();
  }, [state.selectedTimeframe, fetchErrorData]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-100';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'global_error':
        return 'text-red-600 bg-red-100';
      case 'api_error':
        return 'text-orange-600 bg-orange-100';
      case 'javascript_error':
        return 'text-yellow-600 bg-yellow-100';
      case 'boundary_error':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportErrorData = async () => {
    try {
      const response = await fetch('/api/admin/errors/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeframe: state.selectedTimeframe,
          severity: state.selectedSeverity,
          error_type: state.selectedErrorType,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-report-${state.selectedTimeframe}-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading error dashboard...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Error Dashboard Load Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{state.error}</p>
          <Button onClick={fetchErrorData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { metrics } = state;
  if (!metrics) {
    return <div>No error data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Dashboard</h1>
          <p className="text-gray-600">Monitor and manage application errors</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={state.selectedTimeframe}
            onChange={(e) => setState(prev => ({ 
              ...prev, 
              selectedTimeframe: e.target.value as any 
            }))}
            className="border rounded px-3 py-1"
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last Day</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
          <Button onClick={exportErrorData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchErrorData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Total Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_errors}</div>
            <div className="text-xs text-gray-600">
              {state.selectedTimeframe} timeframe
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.error_rate * 100).toFixed(2)}%</div>
            <Progress value={metrics.error_rate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Critical Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.errors_by_severity.critical || 0}
            </div>
            <div className="text-xs text-gray-600">
              Requiring immediate attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Most Affected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {metrics.most_affected_pages[0]?.url || 'N/A'}
            </div>
            <div className="text-xs text-gray-600">
              {metrics.most_affected_pages[0]?.count || 0} errors
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Errors by Severity */}
        <Card>
          <CardHeader>
            <CardTitle>Errors by Severity</CardTitle>
            <CardDescription>Distribution of errors by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.errors_by_severity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(severity)}>
                      {severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{count}</div>
                    <div className="text-xs text-gray-500">
                      {((count / metrics.total_errors) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Errors by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Errors by Type</CardTitle>
            <CardDescription>Distribution of errors by error type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.errors_by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getErrorTypeColor(type)}>
                      {type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{count}</div>
                    <div className="text-xs text-gray-500">
                      {((count / metrics.total_errors) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Error Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Error Messages</CardTitle>
          <CardDescription>Most frequently occurring error messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.top_error_messages.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.message}</p>
                  <p className="text-xs text-gray-500">
                    {item.percentage.toFixed(1)}% of all errors
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="font-semibold">{item.count}</div>
                  <div className="text-xs text-gray-500">occurrences</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
          <CardDescription>Latest error occurrences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {state.recentErrors.slice(0, 20).map((error) => (
              <div key={error.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getSeverityColor(error.severity)}>
                      {error.severity}
                    </Badge>
                    <Badge className={getErrorTypeColor(error.error_type)}>
                      {error.error_type.replace('_', ' ')}
                    </Badge>
                    {error.resolved_at && (
                      <Badge variant="outline" className="text-green-600 bg-green-50">
                        RESOLVED
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{error.message}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    <span>ID: {error.error_id}</span>
                    {error.user_id && <span className="ml-3">User: {error.user_id}</span>}
                    <span className="ml-3">URL: {new URL(error.url).pathname}</span>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {formatTimestamp(error.created_at)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Error Patterns</CardTitle>
          <CardDescription>Detected error patterns and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {state.errorPatterns.slice(0, 10).map((pattern) => (
              <div key={pattern.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getSeverityColor(pattern.severity)}>
                      {pattern.severity}
                    </Badge>
                    <Badge variant="outline">
                      {pattern.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm truncate">{pattern.pattern_text}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    <span>First seen: {formatTimestamp(pattern.first_seen.toISOString())}</span>
                    <span className="ml-3">Affected users: {pattern.affected_users}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{pattern.occurrence_count}</div>
                  <div className="text-xs text-gray-500">occurrences</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
