'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Users,
  Activity,
  RefreshCw,
} from 'lucide-react';

/**
 * API Version Monitoring Dashboard
 * Provides insights into API version usage, migration progress, and health
 */

interface VersionMetrics {
  version: string;
  requests_count: number;
  unique_users: number;
  error_rate: number;
  avg_response_time: number;
  deprecated: boolean;
  sunset_date?: string;
}

interface MigrationProgress {
  total_users: number;
  migrated_users: number;
  migration_percentage: number;
  endpoints_migrated: number;
  total_endpoints: number;
  blocking_issues: string[];
}

interface ApiVersionDashboardState {
  metrics: VersionMetrics[];
  migrationProgress: MigrationProgress | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function ApiVersionDashboard() {
  const [state, setState] = useState<ApiVersionDashboardState>({
    metrics: [],
    migrationProgress: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchVersionData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch version metrics
      const metricsResponse = await fetch('/api/admin/versions/metrics');
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch version metrics');
      }
      const metrics = await metricsResponse.json();

      // Fetch migration progress
      const migrationResponse = await fetch('/api/admin/versions/migration-progress');
      if (!migrationResponse.ok) {
        throw new Error('Failed to fetch migration progress');
      }
      const migrationProgress = await migrationResponse.json();

      setState(prev => ({
        ...prev,
        metrics: metrics.versions || [],
        migrationProgress: migrationProgress.progress || null,
        loading: false,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load version data',
        loading: false,
      }));
    }
  };

  useEffect(() => {
    fetchVersionData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchVersionData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getVersionStatusColor = (version: VersionMetrics) => {
    if (version.deprecated) {
      return version.sunset_date && new Date(version.sunset_date) < new Date() 
        ? 'text-red-600 bg-red-100' 
        : 'text-yellow-600 bg-yellow-100';
    }
    return 'text-green-600 bg-green-100';
  };

  const getVersionIcon = (version: VersionMetrics) => {
    if (version.deprecated) {
      return version.sunset_date && new Date(version.sunset_date) < new Date() 
        ? <AlertTriangle className="h-4 w-4" />
        : <Clock className="h-4 w-4" />;
    }
    return <CheckCircle className="h-4 w-4" />;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading API version data...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Failed to Load Version Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{state.error}</p>
          <Button onClick={fetchVersionData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Version Dashboard</h1>
          <p className="text-gray-600">Monitor API version usage and migration progress</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Last updated: {state.lastUpdated?.toLocaleTimeString()}
          </span>
          <Button onClick={fetchVersionData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Migration Progress */}
      {state.migrationProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Migration Progress
            </CardTitle>
            <CardDescription>
              Progress from v1 to v2 migration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatPercentage(state.migrationProgress.migration_percentage)}
                </div>
                <div className="text-sm text-gray-600">Users Migrated</div>
                <Progress 
                  value={state.migrationProgress.migration_percentage} 
                  className="mt-2"
                />
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {state.migrationProgress.migrated_users}
                </div>
                <div className="text-sm text-gray-600">
                  of {formatNumber(state.migrationProgress.total_users)} users
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {state.migrationProgress.endpoints_migrated}
                </div>
                <div className="text-sm text-gray-600">
                  of {state.migrationProgress.total_endpoints} endpoints
                </div>
              </div>
            </div>

            {state.migrationProgress.blocking_issues.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Migration Blockers</h4>
                <ul className="list-disc list-inside text-yellow-700 space-y-1">
                  {state.migrationProgress.blocking_issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Version Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {state.metrics.map((version) => (
          <Card key={version.version} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getVersionIcon(version)}
                  <span>API {version.version.toUpperCase()}</span>
                </div>
                <Badge className={getVersionStatusColor(version)}>
                  {version.deprecated ? 'Deprecated' : 'Active'}
                </Badge>
              </CardTitle>
              {version.sunset_date && (
                <CardDescription className="text-red-600">
                  Sunset Date: {new Date(version.sunset_date).toLocaleDateString()}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Usage Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold">{formatNumber(version.requests_count)}</div>
                  <div className="text-sm text-gray-600">Requests (24h)</div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold">{formatNumber(version.unique_users)}</div>
                  <div className="text-sm text-gray-600">Unique Users</div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold">{version.avg_response_time}ms</div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className={`text-xl font-bold ${
                    version.error_rate > 5 ? 'text-red-600' : 
                    version.error_rate > 2 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {formatPercentage(version.error_rate)}
                  </div>
                  <div className="text-sm text-gray-600">Error Rate</div>
                </div>
              </div>

              {/* Deprecation Warning */}
              {version.deprecated && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Deprecated Version</span>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1">
                    This version is deprecated and will be sunset on{' '}
                    {version.sunset_date ? new Date(version.sunset_date).toLocaleDateString() : 'TBD'}.
                    Please migrate to the latest version.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Version Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Version Usage Trends</CardTitle>
          <CardDescription>API version usage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {state.metrics.map((version) => {
              const usagePercentage = state.metrics.reduce((total, v) => total + v.requests_count, 0) > 0
                ? (version.requests_count / state.metrics.reduce((total, v) => total + v.requests_count, 0)) * 100
                : 0;

              return (
                <div key={version.version} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium">
                    {version.version.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <Progress value={usagePercentage} className="h-2" />
                  </div>
                  <div className="w-20 text-right text-sm">
                    {formatPercentage(usagePercentage)}
                  </div>
                  <div className="w-24 text-right text-sm text-gray-600">
                    {formatNumber(version.requests_count)} req
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common version management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              View Migration Report
            </Button>
            
            <Button variant="outline" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Export Usage Data
            </Button>
            
            <Button variant="outline" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Send Migration Notices
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ApiVersionDashboard;
