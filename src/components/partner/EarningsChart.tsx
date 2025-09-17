'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
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
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Target,
  Award,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface EarningsDataPoint {
  date: string;
  earnings: number;
  commissions: number;
  bonuses: number;
  conversions: number;
  average_commission: number;
}

export interface EarningsBreakdown {
  source: string;
  amount: number;
  percentage: number;
  color: string;
  [key: string]: any;
}

export interface EarningsChartProps {
  data: EarningsDataPoint[];
  breakdown?: EarningsBreakdown[];
  isLoading?: boolean;
  className?: string;
  height?: number;
  variant?: 'line' | 'area' | 'bar' | 'composed';
  period?: 'daily' | 'weekly' | 'monthly';
  showBreakdown?: boolean;
}

const CHART_COLORS = {
  earnings: '#10B981',
  commissions: '#3B82F6',
  bonuses: '#F59E0B',
  conversions: '#EF4444',
  background: 'rgba(16, 185, 129, 0.1)',
};

const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export function EarningsChart({
  data,
  breakdown = [],
  isLoading = false,
  className,
  height = 350,
  variant = 'area',
  period = 'daily',
  showBreakdown = true,
}: EarningsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<'earnings' | 'commissions' | 'conversions'>('earnings');
  const [chartType, setChartType] = useState<'trend' | 'breakdown'>(showBreakdown ? 'breakdown' : 'trend');

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalEarnings: 0,
        totalCommissions: 0,
        totalBonuses: 0,
        totalConversions: 0,
        averageDaily: 0,
        earningsChange: 0,
        trend: 'neutral' as 'up' | 'down' | 'neutral',
        bestDay: null,
        streak: 0,
      };
    }

    const totalEarnings = data.reduce((sum, point) => sum + point.earnings, 0);
    const totalCommissions = data.reduce((sum, point) => sum + point.commissions, 0);
    const totalBonuses = data.reduce((sum, point) => sum + point.bonuses, 0);
    const totalConversions = data.reduce((sum, point) => sum + point.conversions, 0);
    const averageDaily = totalEarnings / data.length;

    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);
    
    const firstHalfEarnings = firstHalf.reduce((sum, point) => sum + point.earnings, 0);
    const secondHalfEarnings = secondHalf.reduce((sum, point) => sum + point.earnings, 0);
    
    const earningsChange = firstHalfEarnings > 0 
      ? ((secondHalfEarnings - firstHalfEarnings) / firstHalfEarnings) * 100 
      : 0;

    const trend = earningsChange > 5 ? 'up' : earningsChange < -5 ? 'down' : 'neutral';

    // Find best performing day
    const bestDay = data.reduce((best, current) => 
      current.earnings > best.earnings ? current : best
    );

    // Calculate earning streak (consecutive days with earnings)
    let streak = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].earnings > 0) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalEarnings,
      totalCommissions,
      totalBonuses,
      totalConversions,
      averageDaily,
      earningsChange,
      trend,
      bestDay,
      streak,
    };
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
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
                {entry.name === 'Conversions' ? entry.value : formatCurrency(entry.value)}
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
            <div className="h-6 bg-gray-200 rounded animate-pulse w-40" />
            <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Earnings Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No earnings data available</p>
              <p className="text-sm">Start promoting to see your earnings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderTrendChart = () => {
    const chartData = data.map(point => ({
      ...point,
      date: formatDate(point.date),
    }));

    switch (variant) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke={CHART_COLORS[selectedMetric]}
              strokeWidth={3}
              dot={{ fill: CHART_COLORS[selectedMetric], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Bar
              dataKey={selectedMetric}
              fill={CHART_COLORS[selectedMetric]}
              radius={[4, 4, 0, 0]}
              name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
            />
          </BarChart>
        );

      case 'composed':
        return (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="earnings"
              fill={CHART_COLORS.background}
              stroke={CHART_COLORS.earnings}
              strokeWidth={2}
              name="Earnings"
            />
            <Bar
              yAxisId="right"
              dataKey="conversions"
              fill={CHART_COLORS.conversions}
              name="Conversions"
              radius={[2, 2, 0, 0]}
            />
          </ComposedChart>
        );

      case 'area':
      default:
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.earnings} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={CHART_COLORS.earnings} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke={CHART_COLORS[selectedMetric]}
              fillOpacity={1}
              fill="url(#colorEarnings)"
              strokeWidth={3}
              name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
            />
          </AreaChart>
        );
    }
  };

  const renderBreakdownChart = () => {
    if (!breakdown || breakdown.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p>No breakdown data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="amount"
                label={(entry: any) => `${entry.source} ${entry.percentage.toFixed(1)}%`}
              >
                {breakdown.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Breakdown List */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Earnings Breakdown</h4>
          {breakdown.map((item, index) => (
            <div key={item.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color || PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <div>
                  <p className="font-medium text-gray-900">{item.source}</p>
                  <p className="text-sm text-gray-500">{item.percentage.toFixed(1)}% of total</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(item.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Earnings</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(summary.totalEarnings)}
                </div>
                {summary.earningsChange !== 0 && (
                  <div className={cn(
                    'flex items-center space-x-1 text-xs mt-1',
                    summary.earningsChange > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {summary.earningsChange > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(summary.earningsChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Conversions</div>
                <div className="text-xl font-bold text-gray-900">
                  {summary.totalConversions}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {summary.totalConversions > 0 ? formatCurrency(summary.totalEarnings / summary.totalConversions) : '$0'} avg
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Daily Average</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(summary.averageDaily)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Per day
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Earning Streak</div>
                <div className="text-xl font-bold text-gray-900">
                  {summary.streak}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {summary.streak === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Earnings Analytics</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {showBreakdown && (
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <Button
                    variant={chartType === 'trend' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('trend')}
                    className="rounded-none border-0 text-xs"
                  >
                    Trend
                  </Button>
                  <Button
                    variant={chartType === 'breakdown' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('breakdown')}
                    className="rounded-none border-0 text-xs"
                  >
                    Breakdown
                  </Button>
                </div>
              )}
              
              {chartType === 'trend' && (
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <Button
                    variant={selectedMetric === 'earnings' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedMetric('earnings')}
                    className="rounded-none border-0 text-xs"
                  >
                    Earnings
                  </Button>
                  <Button
                    variant={selectedMetric === 'commissions' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedMetric('commissions')}
                    className="rounded-none border-0 text-xs"
                  >
                    Commissions
                  </Button>
                  <Button
                    variant={selectedMetric === 'conversions' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedMetric('conversions')}
                    className="rounded-none border-0 text-xs"
                  >
                    Conversions
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'trend' ? renderTrendChart() : renderBreakdownChart()}
            </ResponsiveContainer>
          </div>
          
          {/* Performance Insights */}
          {summary.bestDay && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(summary.bestDay.earnings)}
                  </div>
                  <div className="text-sm text-gray-600">Best Day</div>
                  <div className="text-xs text-gray-500">
                    {new Date(summary.bestDay.date).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {summary.streak}
                  </div>
                  <div className="text-sm text-gray-600">Earning Streak</div>
                  <div className="text-xs text-gray-500">
                    Consecutive days
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={cn(
                    'text-lg font-bold',
                    summary.trend === 'up' ? 'text-green-600' : 
                    summary.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  )}>
                    {summary.trend === 'up' ? '↗' : summary.trend === 'down' ? '↘' : '→'}
                  </div>
                  <div className="text-sm text-gray-600">Trend</div>
                  <div className="text-xs text-gray-500">
                    {summary.trend === 'up' ? 'Growing' : 
                     summary.trend === 'down' ? 'Declining' : 'Stable'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Compact earnings widget for dashboards
interface CompactEarningsChartProps {
  data: EarningsDataPoint[];
  title?: string;
  height?: number;
  className?: string;
}

export function CompactEarningsChart({
  data,
  title = "Earnings Trend",
  height = 120,
  className,
}: CompactEarningsChartProps) {
  const total = data.reduce((sum, point) => sum + point.earnings, 0);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-medium text-gray-600">{title}</h4>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(total)}
            </div>
          </div>
          <DollarSign className="h-5 w-5 text-gray-400" />
        </div>
        
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <Area
                type="monotone"
                dataKey="earnings"
                stroke={CHART_COLORS.earnings}
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
