'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  MousePointer, 
  Users, 
  Target,
  Link,
  Award,
  Clock,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface ReferralStatsData {
  total_clicks: number;
  total_conversions: number;
  total_earnings: number;
  conversion_rate: number;
  click_trend: Array<{
    date: string;
    clicks: number;
    conversions: number;
    earnings: number;
  }>;
  top_links: Array<{
    id: string;
    name: string;
    code: string;
    clicks: number;
    conversions: number;
    earnings: number;
    conversion_rate: number;
    created_at: string;
  }>;
  earnings_breakdown: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
  recent_conversions: Array<{
    id: string;
    product_name: string;
    customer_name: string;
    commission: number;
    created_at: string;
    link_code: string;
  }>;
}

interface ReferralStatsProps {
  data: ReferralStatsData;
  isLoading?: boolean;
  className?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
}

const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  tertiary: '#F59E0B',
  quaternary: '#EF4444',
  background: 'rgba(59, 130, 246, 0.1)',
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export function ReferralStats({
  data,
  isLoading = false,
  className,
  period = '30d',
  onPeriodChange,
}: ReferralStatsProps) {
  const [selectedChart, setSelectedChart] = useState<'clicks' | 'conversions' | 'earnings'>('earnings');

  // Calculate performance insights
  const insights = useMemo(() => {
    if (!data || !data.click_trend) return null;

    const trendData = data.click_trend;
    if (trendData.length < 2) return null;

    // Calculate trends (compare first half vs second half)
    const midPoint = Math.floor(trendData.length / 2);
    const firstHalf = trendData.slice(0, midPoint);
    const secondHalf = trendData.slice(midPoint);

    const firstHalfClicks = firstHalf.reduce((sum, d) => sum + d.clicks, 0);
    const secondHalfClicks = secondHalf.reduce((sum, d) => sum + d.clicks, 0);
    const clicksTrend = firstHalfClicks > 0 ? ((secondHalfClicks - firstHalfClicks) / firstHalfClicks) * 100 : 0;

    const firstHalfEarnings = firstHalf.reduce((sum, d) => sum + d.earnings, 0);
    const secondHalfEarnings = secondHalf.reduce((sum, d) => sum + d.earnings, 0);
    const earningsTrend = firstHalfEarnings > 0 ? ((secondHalfEarnings - firstHalfEarnings) / firstHalfEarnings) * 100 : 0;

    const bestDay = trendData.reduce((best, current) => 
      current.earnings > best.earnings ? current : best
    );

    const averageDailyEarnings = trendData.reduce((sum, d) => sum + d.earnings, 0) / trendData.length;

    return {
      clicksTrend,
      earningsTrend,
      bestDay,
      averageDailyEarnings,
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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </div>
                  <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Chart skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-gray-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clicks</p>
                <div className="text-2xl font-bold text-gray-900">
                  {data.total_clicks.toLocaleString()}
                </div>
                {insights && (
                  <div className={cn(
                    'flex items-center text-sm mt-1',
                    insights.clicksTrend >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {insights.clicksTrend >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {formatPercentage(Math.abs(insights.clicksTrend))}
                  </div>
                )}
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MousePointer className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversions</p>
                <div className="text-2xl font-bold text-gray-900">
                  {data.total_conversions.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500">
                  {formatPercentage(data.conversion_rate)} rate
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.total_earnings)}
                </div>
                {insights && (
                  <div className={cn(
                    'flex items-center text-sm mt-1',
                    insights.earningsTrend >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {insights.earningsTrend >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {formatPercentage(Math.abs(insights.earningsTrend))}
                  </div>
                )}
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Daily</p>
                <div className="text-2xl font-bold text-gray-900">
                  {insights ? formatCurrency(insights.averageDailyEarnings) : '$0.00'}
                </div>
                <p className="text-sm text-gray-500">earnings</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance Trend</CardTitle>
            <div className="flex items-center space-x-2">
              {onPeriodChange && (
                <Select value={period} onValueChange={onPeriodChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <Button
                  variant={selectedChart === 'earnings' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedChart('earnings')}
                  className="rounded-none border-0 text-xs"
                >
                  Earnings
                </Button>
                <Button
                  variant={selectedChart === 'clicks' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedChart('clicks')}
                  className="rounded-none border-0 text-xs"
                >
                  Clicks
                </Button>
                <Button
                  variant={selectedChart === 'conversions' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedChart('conversions')}
                  className="rounded-none border-0 text-xs"
                >
                  Conversions
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.click_trend}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={formatDate}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => 
                    selectedChart === 'earnings' ? `$${value}` : value.toLocaleString()
                  }
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    selectedChart === 'earnings' ? formatCurrency(value) : value.toLocaleString(),
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey={selectedChart}
                  stroke={CHART_COLORS.primary}
                  fillOpacity={1}
                  fill="url(#colorGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Links and Earnings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Link className="h-5 w-5" />
              <span>Top Performing Links</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.top_links.map((link, index) => (
                <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <span className="text-sm font-medium text-blue-600">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{link.name}</p>
                      <p className="text-sm text-gray-500">Code: {link.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(link.earnings)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {link.clicks} clicks • {formatPercentage(link.conversion_rate)}
                    </p>
                  </div>
                </div>
              ))}
              
              {data.top_links.length === 0 && (
                <div className="text-center py-8">
                  <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No referral links yet</p>
                  <p className="text-sm text-gray-400">Create your first link to start earning</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Earnings Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Earnings Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.earnings_breakdown.length > 0 ? (
              <div className="space-y-4">
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.earnings_breakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                        label={({ source, percentage }) => `${source} ${(percentage as number).toFixed(1)}%`}
                      >
                        {data.earnings_breakdown.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={PIE_COLORS[index % PIE_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2">
                  {data.earnings_breakdown.map((item, index) => (
                    <div key={item.source} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-sm text-gray-700">{item.source}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.amount)}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({formatPercentage(item.percentage)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No earnings data</p>
                <p className="text-sm text-gray-400">Start promoting to see breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Conversions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Recent Conversions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_conversions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Link Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.recent_conversions.map((conversion) => (
                    <tr key={conversion.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {conversion.product_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {conversion.customer_name}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-xs">
                          {conversion.link_code}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-green-600">
                        {formatCurrency(conversion.commission)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(conversion.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No conversions yet</p>
              <p className="text-sm text-gray-400">Share your referral links to start earning</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Performance Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Best Performance Day</h4>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(insights.bestDay.earnings)}
                </div>
                <p className="text-sm text-blue-700">
                  {new Date(insights.bestDay.date).toLocaleDateString()} • 
                  {insights.bestDay.clicks} clicks • 
                  {insights.bestDay.conversions} conversions
                </p>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Conversion Rate</h4>
                <div className="text-2xl font-bold text-green-900">
                  {formatPercentage(data.conversion_rate)}
                </div>
                <p className="text-sm text-green-700">
                  {data.total_conversions} conversions from {data.total_clicks} clicks
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Optimization Tips</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                {data.conversion_rate < 2 && (
                  <p>• Your conversion rate is below average. Try promoting higher-value products.</p>
                )}
                {data.total_clicks > 100 && data.total_conversions === 0 && (
                  <p>• You have good traffic but no conversions. Review your target audience.</p>
                )}
                {data.top_links.length > 0 && data.top_links[0].conversion_rate > 5 && (
                  <p>• Your top link performs well! Consider creating similar content.</p>
                )}
                {data.earnings_breakdown.length === 1 && (
                  <p>• Diversify your promotions across different products for better earnings.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Compact version for dashboard widgets
interface CompactReferralStatsProps {
  data: Pick<ReferralStatsData, 'total_clicks' | 'total_conversions' | 'total_earnings' | 'conversion_rate'>;
  className?: string;
}

export function CompactReferralStats({ data, className }: CompactReferralStatsProps) {
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Referral Performance</h4>
            <Badge variant="outline" className="text-xs">
              {data.conversion_rate.toFixed(1)}% conversion
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">
                {data.total_clicks.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Clicks</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {data.total_conversions}
              </div>
              <div className="text-xs text-gray-500">Sales</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {formatCurrency(data.total_earnings)}
              </div>
              <div className="text-xs text-gray-500">Earned</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
