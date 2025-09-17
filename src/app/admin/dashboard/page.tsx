'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Activity,
  Server,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Calendar,
  Eye,
  UserCheck,
  Package,
  CreditCard
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { adminService, PlatformStats, SystemHealth } from '@/services/admin.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { cn } from '@/lib/utils';

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  description?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Check admin authorization
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [stats, health] = await Promise.all([
        adminService.getPlatformStats(),
        adminService.getSystemHealth()
      ]);

      setPlatformStats(stats);
      setSystemHealth(health);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboardData();
    }
  }, [user]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.role === 'admin') {
        loadDashboardData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const handleRefresh = () => {
    loadDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getHealthStatus = (health: SystemHealth) => {
    if (health.database_status === 'error' || health.error_rate > 5) {
      return { status: 'error', label: 'Critical', color: 'bg-red-500' };
    }
    if (health.database_status === 'warning' || health.api_response_time > 1000) {
      return { status: 'warning', label: 'Warning', color: 'bg-yellow-500' };
    }
    return { status: 'healthy', label: 'Healthy', color: 'bg-green-500' };
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading && !platformStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorMessage title="Dashboard Error" message={error} />
      </div>
    );
  }

  const statCards: StatCard[] = platformStats ? [
    {
      title: 'Total Users',
      value: formatNumber(platformStats.total_users),
      icon: <Users className="w-5 h-5" />,
      description: 'Registered users',
    },
    {
      title: 'Active Sellers',
      value: formatNumber(platformStats.total_sellers),
      icon: <UserCheck className="w-5 h-5" />,
      description: 'Sellers with products',
    },
    {
      title: 'Total Products',
      value: formatNumber(platformStats.total_products),
      icon: <Package className="w-5 h-5" />,
      description: 'Listed products',
    },
    {
      title: 'Platform Revenue',
      value: formatCurrency(platformStats.total_revenue),
      icon: <DollarSign className="w-5 h-5" />,
      description: 'All-time revenue',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(platformStats.monthly_revenue),
      icon: <TrendingUp className="w-5 h-5" />,
      description: 'Current month',
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(platformStats.average_order_value),
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Per transaction',
    },
    {
      title: 'Active Users (24h)',
      value: formatNumber(platformStats.active_users_24h),
      icon: <Activity className="w-5 h-5" />,
      description: 'Last 24 hours',
    },
    {
      title: 'Conversion Rate',
      value: `${platformStats.conversion_rate.toFixed(1)}%`,
      icon: <TrendingUp className="w-5 h-5" />,
      description: 'Visitors to buyers',
    },
  ] : [];

  const healthStatus = systemHealth ? getHealthStatus(systemHealth) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Platform overview and system metrics
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Health Status */}
        {systemHealth && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  System Health
                </CardTitle>
                {healthStatus && (
                  <Badge 
                    variant="secondary" 
                    className={cn("text-white", healthStatus.color)}
                  >
                    {healthStatus.label}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">Database</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {systemHealth.database_status}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <div>
                    <div className="text-sm font-medium">Response Time</div>
                    <div className="text-sm text-gray-600">
                      {systemHealth.api_response_time}ms
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">Uptime</div>
                    <div className="text-sm text-gray-600">
                      {systemHealth.uptime_percentage}%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="text-sm font-medium">Error Rate</div>
                    <div className="text-sm text-gray-600">
                      {systemHealth.error_rate}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                    {stat.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {stat.description}
                      </p>
                    )}
                  </div>
                  <div className="text-blue-600">
                    {stat.icon}
                  </div>
                </div>
                
                {stat.change && (
                  <div className="mt-4 flex items-center">
                    <span className={cn(
                      "text-sm font-medium",
                      stat.changeType === 'positive' && "text-green-600",
                      stat.changeType === 'negative' && "text-red-600",
                      stat.changeType === 'neutral' && "text-gray-600"
                    )}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last month</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/users')}>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">User Management</h3>
              <p className="text-sm text-gray-600 mt-1">Manage users and roles</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/products')}>
            <CardContent className="p-6 text-center">
              <ShoppingBag className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">Product Moderation</h3>
              <p className="text-sm text-gray-600 mt-1">Review and moderate products</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/reports')}>
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">Reports</h3>
              <p className="text-sm text-gray-600 mt-1">Handle reported content</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/settings')}>
            <CardContent className="p-6 text-center">
              <Server className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">Platform Settings</h3>
              <p className="text-sm text-gray-600 mt-1">Configure platform settings</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Summary */}
        {platformStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Platform activity summary for the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(platformStats.active_users_30d)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Active Users</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber(platformStats.completed_orders)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Completed Orders</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatNumber(platformStats.pending_orders)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Pending Orders</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
