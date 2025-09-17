'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown, 
  Calendar, 
  Download,
  RefreshCw,
  Calculator,
  Target,
  Award,
  Eye,
  Filter,
  BarChart3,
  Clock,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  EarningsChart, 
  CompactEarningsChart,
  EarningsDataPoint,
  EarningsBreakdown 
} from '@/components/partner/EarningsChart';
import { 
  CommissionTable, 
  CompactCommissionTable,
  CommissionTransaction 
} from '@/components/partner/CommissionTable';
import { 
  DateRangePicker, 
  SimpleDateRangePicker, 
  DateRange, 
  getDateRangeFromPeriod,
  PredefinedPeriod 
} from '@/components/analytics/DateRangePicker';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface EarningsOverviewData {
  earnings_chart: EarningsDataPoint[];
  earnings_breakdown: EarningsBreakdown[];
  commission_transactions: CommissionTransaction[];
  summary_stats: {
    total_earnings: number;
    earnings_change: number;
    pending_earnings: number;
    paid_earnings: number;
    total_conversions: number;
    conversions_change: number;
    average_commission: number;
    commission_change: number;
    this_month_earnings: number;
    last_month_earnings: number;
  };
  top_products: Array<{
    id: string;
    title: string;
    thumbnail_url?: string;
    total_commissions: number;
    conversion_count: number;
    commission_rate: number;
  }>;
  monthly_goals: {
    target_amount: number;
    current_amount: number;
    progress_percentage: number;
    days_remaining: number;
  };
}

export default function PartnerEarningsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [earningsData, setEarningsData] = useState<EarningsOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PredefinedPeriod>('30d');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPeriod('30d'));
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  useEffect(() => {
    if (user) {
      loadEarningsData();
    }
  }, [user, dateRange]);

  const loadEarningsData = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const params = new URLSearchParams({
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
      });

      const response = await fetch(`/api/partner/earnings?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setEarningsData(data);
      } else {
        throw new Error(data.error || 'Failed to load earnings data');
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handlePeriodChange = (period: PredefinedPeriod) => {
    setSelectedPeriod(period);
    setDateRange(getDateRangeFromPeriod(period));
  };

  const handleRefresh = () => {
    loadEarningsData(true);
  };

  const handleExportEarnings = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
        format: exportFormat,
      });

      const response = await fetch(`/api/partner/earnings/export?${params.toString()}`);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `earnings-${dateRange.startDate.toISOString().split('T')[0]}-to-${dateRange.endDate.toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Earnings data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export earnings data');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Earnings Overview</h1>
              <p className="text-gray-600">
                Track your commission earnings and performance over time
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <SimpleDateRangePicker
                period={selectedPeriod}
                onPeriodChange={handlePeriodChange}
              />
              
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'csv' | 'pdf')}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                onClick={handleExportEarnings}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-8">
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            
            {/* Charts skeleton */}
            <Card>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gray-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
        ) : earningsData ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(earningsData.summary_stats.total_earnings)}
                      </div>
                      <div className={cn(
                        'flex items-center text-sm mt-1',
                        getChangeColor(earningsData.summary_stats.earnings_change)
                      )}>
                        {getChangeIcon(earningsData.summary_stats.earnings_change)}
                        <span className="ml-1">
                          {Math.abs(earningsData.summary_stats.earnings_change).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Earnings</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(earningsData.summary_stats.pending_earnings)}
                      </div>
                      <p className="text-sm text-gray-500">
                        Awaiting payout
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Clock className="h-6 w-6 text-yellow-600" />
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
                        {earningsData.summary_stats.total_conversions}
                      </div>
                      <div className={cn(
                        'flex items-center text-sm mt-1',
                        getChangeColor(earningsData.summary_stats.conversions_change)
                      )}>
                        {getChangeIcon(earningsData.summary_stats.conversions_change)}
                        <span className="ml-1">
                          {Math.abs(earningsData.summary_stats.conversions_change).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Commission</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(earningsData.summary_stats.average_commission)}
                      </div>
                      <div className={cn(
                        'flex items-center text-sm mt-1',
                        getChangeColor(earningsData.summary_stats.commission_change)
                      )}>
                        {getChangeIcon(earningsData.summary_stats.commission_change)}
                        <span className="ml-1">
                          {Math.abs(earningsData.summary_stats.commission_change).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Calculator className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Goal Progress */}
            {earningsData.monthly_goals && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-900">
                    <Award className="h-5 w-5" />
                    <span>Monthly Goal Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {formatCurrency(earningsData.monthly_goals.current_amount)}
                      </div>
                      <div className="text-sm text-blue-700">Current Month</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {earningsData.monthly_goals.progress_percentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-purple-700">Goal Progress</div>
                      <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(earningsData.monthly_goals.progress_percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-600">
                        {earningsData.monthly_goals.days_remaining}
                      </div>
                      <div className="text-sm text-gray-700">Days Remaining</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Target: {formatCurrency(earningsData.monthly_goals.target_amount)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Analytics */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="products">Top Products</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Earnings Chart */}
                  <div className="lg:col-span-2">
                    <EarningsChart
                      data={earningsData.earnings_chart}
                      breakdown={earningsData.earnings_breakdown}
                      height={400}
                      variant="area"
                      period="daily"
                      showBreakdown={true}
                    />
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="space-y-4">
                    <CompactEarningsChart
                      data={earningsData.earnings_chart}
                      title="Earnings Trend"
                      height={120}
                    />
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">This vs Last Month</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">This Month</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(earningsData.summary_stats.this_month_earnings)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Last Month</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(earningsData.summary_stats.last_month_earnings)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-sm font-medium text-gray-900">Difference</span>
                            <span className={cn(
                              'font-medium',
                              getChangeColor(earningsData.summary_stats.this_month_earnings - earningsData.summary_stats.last_month_earnings)
                            )}>
                              {earningsData.summary_stats.this_month_earnings >= earningsData.summary_stats.last_month_earnings ? '+' : ''}
                              {formatCurrency(earningsData.summary_stats.this_month_earnings - earningsData.summary_stats.last_month_earnings)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions">
                <CommissionTable
                  transactions={earningsData.commission_transactions}
                  showFilters={true}
                  onExport={(transactions) => {
                    // Handle transaction export
                    console.log('Exporting transactions:', transactions);
                  }}
                />
              </TabsContent>

              {/* Top Products Tab */}
              <TabsContent value="products" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Earning Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {earningsData.top_products.map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                              <span className="text-sm font-medium text-yellow-600">
                                #{index + 1}
                              </span>
                            </div>
                            
                            <div className="h-12 w-12 bg-gray-100 rounded-lg overflow-hidden">
                              {product.thumbnail_url ? (
                                <img
                                  src={product.thumbnail_url}
                                  alt={product.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <p className="font-medium text-gray-900">{product.title}</p>
                              <p className="text-sm text-gray-500">
                                {product.conversion_count} conversions • {product.commission_rate}% rate
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(product.total_commissions)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Total earned
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {earningsData.top_products.length === 0 && (
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No product earnings yet</p>
                          <p className="text-sm text-gray-400">Start promoting products to see top performers</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Performance Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5" />
                        <span>Performance Insights</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Earnings Trend</h4>
                          <p className="text-sm text-blue-700">
                            {earningsData.summary_stats.earnings_change > 0 
                              ? `Your earnings are up ${earningsData.summary_stats.earnings_change.toFixed(1)}% compared to the previous period. Great job!`
                              : earningsData.summary_stats.earnings_change < 0
                              ? `Your earnings are down ${Math.abs(earningsData.summary_stats.earnings_change).toFixed(1)}% compared to the previous period. Consider optimizing your promotion strategy.`
                              : 'Your earnings are stable compared to the previous period.'
                            }
                          </p>
                        </div>
                        
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-medium text-green-900 mb-2">Commission Performance</h4>
                          <p className="text-sm text-green-700">
                            Your average commission is {formatCurrency(earningsData.summary_stats.average_commission)} per conversion.
                            {earningsData.summary_stats.commission_change > 0 
                              ? ` This is up ${earningsData.summary_stats.commission_change.toFixed(1)}% from before.`
                              : earningsData.summary_stats.commission_change < 0
                              ? ` This is down ${Math.abs(earningsData.summary_stats.commission_change).toFixed(1)}% from before.`
                              : ' This is consistent with your previous performance.'
                            }
                          </p>
                        </div>
                        
                        {earningsData.top_products.length > 0 && (
                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <h4 className="font-medium text-purple-900 mb-2">Top Performer</h4>
                            <p className="text-sm text-purple-700">
                              "{earningsData.top_products[0].title}" is your top earning product with {formatCurrency(earningsData.top_products[0].total_commissions)} in commissions. 
                              Consider creating more links for similar products.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Optimization Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Optimization Tips</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {earningsData.summary_stats.total_earnings < 100 && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h4 className="font-medium text-yellow-900">Getting Started</h4>
                            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                              <li>• Focus on promoting 3-5 products initially</li>
                              <li>• Share links in relevant communities</li>
                              <li>• Create valuable content around products</li>
                              <li>• Track which promotion methods work best</li>
                            </ul>
                          </div>
                        )}
                        
                        {earningsData.summary_stats.total_earnings >= 100 && earningsData.summary_stats.earnings_change < 0 && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <h4 className="font-medium text-red-900">Declining Performance</h4>
                            <ul className="text-sm text-red-700 mt-2 space-y-1">
                              <li>• Review your top-performing links</li>
                              <li>• Refresh your promotion content</li>
                              <li>• Try promoting new or trending products</li>
                              <li>• Experiment with different marketing channels</li>
                            </ul>
                          </div>
                        )}
                        
                        {earningsData.summary_stats.total_earnings >= 500 && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <h4 className="font-medium text-green-900">Growing Success</h4>
                            <ul className="text-sm text-green-700 mt-2 space-y-1">
                              <li>• Scale your successful promotion strategies</li>
                              <li>• Diversify across more product categories</li>
                              <li>• Consider creating dedicated landing pages</li>
                              <li>• Build an email list for consistent promotion</li>
                            </ul>
                          </div>
                        )}
                        
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-900">General Tips</h4>
                          <ul className="text-sm text-blue-700 mt-2 space-y-1">
                            <li>• Promote products you genuinely recommend</li>
                            <li>• Be transparent about affiliate relationships</li>
                            <li>• Focus on building trust with your audience</li>
                            <li>• Monitor analytics regularly for optimization</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Earnings Forecast */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Earnings Forecast</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold text-gray-900">
                          {formatCurrency(earningsData.summary_stats.average_commission * 7)}
                        </div>
                        <div className="text-sm text-gray-600">Projected Weekly</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Based on current average
                        </div>
                      </div>
                      
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold text-gray-900">
                          {formatCurrency(earningsData.summary_stats.average_commission * 30)}
                        </div>
                        <div className="text-sm text-gray-600">Projected Monthly</div>
                        <div className="text-xs text-gray-500 mt-1">
                          At current conversion rate
                        </div>
                      </div>
                      
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold text-gray-900">
                          {formatCurrency(earningsData.summary_stats.total_earnings * 12)}
                        </div>
                        <div className="text-sm text-gray-600">Annual Potential</div>
                        <div className="text-xs text-gray-500 mt-1">
                          If current trend continues
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-16">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No earnings data</h3>
            <p className="text-gray-600 mb-8">
              Start promoting products to see your earnings analytics and insights.
            </p>
            <Button onClick={() => router.push('/partner/links/create')}>
              Create Your First Referral Link
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
