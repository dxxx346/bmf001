'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  sales: number;
  orders: number;
  averageOrderValue?: number;
}

export interface RevenueChartProps {
  data: RevenueDataPoint[];
  isLoading?: boolean;
  className?: string;
  height?: number;
  showComparison?: boolean;
  comparisonData?: RevenueDataPoint[];
  variant?: 'line' | 'area' | 'bar';
  period?: 'daily' | 'weekly' | 'monthly';
}

const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  tertiary: '#F59E0B',
  quaternary: '#EF4444',
  background: 'rgba(59, 130, 246, 0.1)',
};

export function RevenueChart({
  data,
  isLoading = false,
  className,
  height = 300,
  showComparison = false,
  comparisonData,
  variant = 'area',
  period = 'daily',
}: RevenueChartProps) {
  const [activeChart, setActiveChart] = useState<'revenue' | 'sales' | 'orders'>('revenue');

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalRevenue: 0,
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        revenueChange: 0,
        salesChange: 0,
        trend: 'neutral' as 'up' | 'down' | 'neutral',
      };
    }

    const totalRevenue = data.reduce((sum, point) => sum + point.revenue, 0);
    const totalSales = data.reduce((sum, point) => sum + point.sales, 0);
    const totalOrders = data.reduce((sum, point) => sum + point.orders, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);
    
    const firstHalfRevenue = firstHalf.reduce((sum, point) => sum + point.revenue, 0);
    const secondHalfRevenue = secondHalf.reduce((sum, point) => sum + point.revenue, 0);
    
    const revenueChange = firstHalfRevenue > 0 
      ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 
      : 0;

    const firstHalfSales = firstHalf.reduce((sum, point) => sum + point.sales, 0);
    const secondHalfSales = secondHalf.reduce((sum, point) => sum + point.sales, 0);
    
    const salesChange = firstHalfSales > 0 
      ? ((secondHalfSales - firstHalfSales) / firstHalfSales) * 100 
      : 0;

    const trend = revenueChange > 5 ? 'up' : revenueChange < -5 ? 'down' : 'neutral';

    return {
      totalRevenue,
      totalSales,
      totalOrders,
      averageOrderValue,
      revenueChange,
      salesChange,
      trend,
    };
  }, [data]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date based on period
  const formatXAxisDate = (dateString: string) => {
    const date = new Date(dateString);
    
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'weekly':
        return `Week ${Math.ceil(date.getDate() / 7)}`;
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {new Date(label).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium">
                {entry.name === 'Revenue' ? formatCurrency(entry.value) : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
            <div className="h-8 bg-gray-200 rounded animate-pulse w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Revenue Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No revenue data available</p>
              <p className="text-sm">Start selling to see your analytics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    const chartData = data.map(point => ({
      ...point,
      date: formatXAxisDate(point.date),
      averageOrderValue: point.orders > 0 ? point.revenue / point.orders : 0,
    }));

    switch (variant) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => activeChart === 'revenue' ? `$${value}` : value}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {activeChart === 'revenue' && (
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={CHART_COLORS.primary}
                strokeWidth={3}
                dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Revenue"
              />
            )}
            
            {activeChart === 'sales' && (
              <Line
                type="monotone"
                dataKey="sales"
                stroke={CHART_COLORS.secondary}
                strokeWidth={3}
                dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Sales"
              />
            )}
            
            {activeChart === 'orders' && (
              <Line
                type="monotone"
                dataKey="orders"
                stroke={CHART_COLORS.tertiary}
                strokeWidth={3}
                dot={{ fill: CHART_COLORS.tertiary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Orders"
              />
            )}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => activeChart === 'revenue' ? `$${value}` : value}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Bar
              dataKey={activeChart}
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
              name={activeChart.charAt(0).toUpperCase() + activeChart.slice(1)}
            />
          </BarChart>
        );

      case 'area':
      default:
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => activeChart === 'revenue' ? `$${value}` : value}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Area
              type="monotone"
              dataKey={activeChart}
              stroke={CHART_COLORS.primary}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              strokeWidth={3}
              name={activeChart.charAt(0).toUpperCase() + activeChart.slice(1)}
            />
          </AreaChart>
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Revenue Analytics</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* Metric Selector */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <Button
                variant={activeChart === 'revenue' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveChart('revenue')}
                className="rounded-none border-0 text-xs"
              >
                Revenue
              </Button>
              <Button
                variant={activeChart === 'sales' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveChart('sales')}
                className="rounded-none border-0 text-xs"
              >
                Sales
              </Button>
              <Button
                variant={activeChart === 'orders' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveChart('orders')}
                className="rounded-none border-0 text-xs"
              >
                Orders
              </Button>
            </div>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
            {summary.revenueChange !== 0 && (
              <div className={cn(
                'flex items-center justify-center space-x-1 text-xs mt-1',
                summary.revenueChange > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {summary.revenueChange > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(summary.revenueChange).toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {summary.totalSales.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Sales</div>
            {summary.salesChange !== 0 && (
              <div className={cn(
                'flex items-center justify-center space-x-1 text-xs mt-1',
                summary.salesChange > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {summary.salesChange > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(summary.salesChange).toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {summary.totalOrders.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.averageOrderValue)}
            </div>
            <div className="text-sm text-gray-600">Avg. Order Value</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
        
        {/* Chart Controls */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {data.length} data points
            </Badge>
            {summary.trend !== 'neutral' && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-xs',
                  summary.trend === 'up' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'
                )}
              >
                {summary.trend === 'up' ? 'Trending Up' : 'Trending Down'}
              </Badge>
            )}
          </div>
          
          <div className="text-xs text-gray-500">
            Updated {new Date().toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact revenue chart for dashboards
interface CompactRevenueChartProps {
  data: RevenueDataPoint[];
  title?: string;
  metric: 'revenue' | 'sales' | 'orders';
  height?: number;
  className?: string;
}

export function CompactRevenueChart({
  data,
  title,
  metric,
  height = 100,
  className,
}: CompactRevenueChartProps) {
  const chartData = data.map(point => ({
    ...point,
    value: point[metric],
  }));

  const total = data.reduce((sum, point) => sum + point[metric], 0);
  const formatValue = (value: number) => {
    return metric === 'revenue' ? formatCurrency(value) : value.toLocaleString();
  };

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-medium text-gray-600">
              {title || metric.charAt(0).toUpperCase() + metric.slice(1)}
            </h4>
            <div className="text-xl font-bold text-gray-900">
              {formatValue(total)}
            </div>
          </div>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>
        
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.background}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Revenue comparison chart
interface RevenueComparisonChartProps {
  currentData: RevenueDataPoint[];
  previousData: RevenueDataPoint[];
  className?: string;
}

export function RevenueComparisonChart({
  currentData,
  previousData,
  className,
}: RevenueComparisonChartProps) {
  // Combine data for comparison
  const combinedData = currentData.map((current, index) => ({
    date: formatXAxisDate(current.date),
    currentRevenue: current.revenue,
    previousRevenue: previousData[index]?.revenue || 0,
    currentSales: current.sales,
    previousSales: previousData[index]?.sales || 0,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Period Comparison</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name.includes('current') ? 'Current Period' : 'Previous Period'
                ]}
              />
              <Legend />
              <Bar 
                dataKey="currentRevenue" 
                fill={CHART_COLORS.primary} 
                name="Current Period"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="previousRevenue" 
                fill={CHART_COLORS.secondary} 
                name="Previous Period"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function (already defined above but included for completeness)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatXAxisDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
