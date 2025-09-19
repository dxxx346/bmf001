'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Users,
  Zap,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  database: {
    connection: {
      status: string;
      responseTime: number;
      poolStatus: string;
    };
    pool: {
      health: string;
      connections: {
        total: number;
        active: number;
        idle: number;
        pending: number;
      };
      performance: {
        totalRequests: number;
        failedRequests: number;
        averageResponseTime: number;
        errorRate: number;
      };
      monitoring: {
        connectionLeaks: number;
        lastHealthCheck: string;
        uptimeSeconds: number;
      };
    };
  };
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    responseTime?: number;
    details?: any;
    leakCount?: number;
    pendingCount?: number;
  }>;
}

export function DatabasePoolMonitor() {
  const [healthData, setHealthData] = useState<DatabaseHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/health/database');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHealthData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'degraded':
      case 'warn':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
      case 'fail':
      case 'disconnected':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
      case 'connected':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
      case 'warn':
        return <AlertCircle className="h-4 w-4" />;
      case 'unhealthy':
      case 'fail':
      case 'disconnected':
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading database health...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error Loading Database Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchHealthData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>No health data available</p>
        </CardContent>
      </Card>
    );
  }

  const pool = healthData.database.pool;
  const connectionUtilization = pool.connections.total > 0 
    ? (pool.connections.active / pool.connections.total) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Database Connection Pool Monitor</h2>
          <p className="text-gray-600">
            Last updated: {formatTimestamp(healthData.timestamp)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "primary" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh
          </Button>
          <Button onClick={fetchHealthData} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Overall Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getStatusIcon(healthData.status)}
              <Badge className={`ml-2 ${getStatusColor(healthData.status)}`}>
                {healthData.status.toUpperCase()}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Response Time</p>
              <p className="text-lg font-semibold">{healthData.responseTime}ms</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Pool Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pool.connections.total}</div>
            <div className="text-xs text-gray-600">
              {pool.connections.active} active, {pool.connections.idle} idle
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Pool Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(connectionUtilization)}%</div>
            <Progress value={connectionUtilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Average Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pool.performance.averageResponseTime}ms</div>
            <div className="text-xs text-gray-600">
              {pool.performance.totalRequests} total requests
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
            <div className="text-2xl font-bold">
              {(pool.performance.errorRate * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600">
              {pool.performance.failedRequests} failed requests
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Details */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Details</CardTitle>
            <CardDescription>Current connection pool status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Active Connections:</span>
                <span className="font-semibold">{pool.connections.active}</span>
              </div>
              <div className="flex justify-between">
                <span>Idle Connections:</span>
                <span className="font-semibold">{pool.connections.idle}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending Requests:</span>
                <span className="font-semibold">{pool.connections.pending}</span>
              </div>
              <div className="flex justify-between">
                <span>Connection Leaks:</span>
                <span className={`font-semibold ${pool.monitoring.connectionLeaks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {pool.monitoring.connectionLeaks}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pool Health:</span>
                <Badge className={getStatusColor(pool.health)}>
                  {pool.health.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Request and response statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Total Requests:</span>
                <span className="font-semibold">{pool.performance.totalRequests.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed Requests:</span>
                <span className="font-semibold">{pool.performance.failedRequests.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Success Rate:</span>
                <span className="font-semibold">
                  {((1 - pool.performance.errorRate) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="font-semibold">{formatUptime(pool.monitoring.uptimeSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Health Check:</span>
                <span className="font-semibold text-xs">
                  {formatTimestamp(pool.monitoring.lastHealthCheck)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Health Checks</CardTitle>
          <CardDescription>Individual system health check results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthData.checks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(check.status)}
                  <span className="ml-3 font-medium">
                    {check.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {check.responseTime && (
                    <span className="text-sm text-gray-600">{check.responseTime}ms</span>
                  )}
                  {check.leakCount !== undefined && (
                    <span className="text-sm text-gray-600">Leaks: {check.leakCount}</span>
                  )}
                  {check.pendingCount !== undefined && (
                    <span className="text-sm text-gray-600">Pending: {check.pendingCount}</span>
                  )}
                  <Badge className={getStatusColor(check.status)}>
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
