'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  ShoppingCartIcon, 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

interface AnalyticsDashboardProps {
  period?: string;
}

interface OverviewMetrics {
  total_users: number;
  active_users: number;
  new_users: number;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  conversion_rate: number;
  bounce_rate: number;
  session_duration: number;
  pages_per_session: number;
  growth_rate: number;
  retention_rate: number;
}

interface RealTimeMetrics {
  active_users: number;
  page_views_per_minute: number;
  conversions_per_minute: number;
  revenue_per_minute: number;
  top_pages: Array<{ page: string; views: number }>;
  top_products: Array<{ product: string; views: number }>;
  top_referrers: Array<{ referrer: string; visits: number }>;
  device_breakdown: Record<string, number>;
  country_breakdown: Record<string, number>;
  last_updated: string;
}

export default function AnalyticsDashboard({ period = '24h' }: AnalyticsDashboardProps) {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [realTime, setRealTime] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchRealTimeData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/dashboard?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      const data = await response.json();
      setOverview(data.overview);
      setRealTime(data.real_time_metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const response = await fetch('/api/analytics/realtime');
      if (!response.ok) throw new Error('Failed to fetch real-time data');
      
      const data = await response.json();
      setRealTime(data);
    } catch (err) {
      console.error('Failed to fetch real-time data:', err);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(1) + '%';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex space-x-2">
          <select 
            value={period} 
            onChange={(e) => window.location.href = `?period=${e.target.value}`}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Overview Metrics */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={formatNumber(overview.total_users)}
            icon={UserGroupIcon}
            change={overview.growth_rate}
            changeLabel="vs previous period"
          />
          <MetricCard
            title="Active Users"
            value={formatNumber(overview.active_users)}
            icon={EyeIcon}
            change={0}
            changeLabel="currently online"
          />
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(overview.total_revenue)}
            icon={CurrencyDollarIcon}
            change={0}
            changeLabel="this period"
          />
          <MetricCard
            title="Conversion Rate"
            value={formatPercentage(overview.conversion_rate)}
            icon={ArrowTrendingUpIcon}
            change={0}
            changeLabel="visitors to customers"
          />
        </div>
      )}

      {/* Real-time Metrics */}
      {realTime && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Real-time Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{realTime.active_users}</div>
              <div className="text-sm text-gray-500">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{realTime.page_views_per_minute}</div>
              <div className="text-sm text-gray-500">Page Views/min</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{realTime.conversions_per_minute}</div>
              <div className="text-sm text-gray-500">Conversions/min</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(realTime.revenue_per_minute)}</div>
              <div className="text-sm text-gray-500">Revenue/min</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            Last updated: {new Date(realTime.last_updated).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Additional Metrics */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Engagement</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Session Duration</span>
                <span className="font-medium">{Math.round(overview.session_duration / 60)} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pages per Session</span>
                <span className="font-medium">{overview.pages_per_session.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bounce Rate</span>
                <span className="font-medium">{formatPercentage(overview.bounce_rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Retention Rate</span>
                <span className="font-medium">{formatPercentage(overview.retention_rate)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Orders</span>
                <span className="font-medium">{formatNumber(overview.total_orders)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Order Value</span>
                <span className="font-medium">{formatCurrency(overview.average_order_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New Users</span>
                <span className="font-medium">{formatNumber(overview.new_users)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Growth Rate</span>
                <span className="font-medium">{formatPercentage(overview.growth_rate)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Pages */}
      {realTime && realTime.top_pages.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
          <div className="space-y-2">
            {realTime.top_pages.slice(0, 5).map((page, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <span className="text-gray-600 truncate">{page.page}</span>
                <span className="font-medium">{page.views} views</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change: number;
  changeLabel: string;
}

function MetricCard({ title, value, icon: Icon, change, changeLabel }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <div className="flex items-center mt-1">
            {change > 0 ? (
              <ArrowUpIcon className="h-4 w-4 text-green-500" />
            ) : change < 0 ? (
              <ArrowDownIcon className="h-4 w-4 text-red-500" />
            ) : null}
            <span className={`text-sm ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {change !== 0 && `${Math.abs(change).toFixed(1)}%`} {changeLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}