'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown, 
  Users, 
  Globe, 
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Share2,
  FileText,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  DateRangePicker, 
  SimpleDateRangePicker, 
  DateRange, 
  getDateRangeFromPeriod,
  PredefinedPeriod 
} from '@/components/analytics/DateRangePicker';
import { 
  RevenueChart, 
  CompactRevenueChart, 
  RevenueComparisonChart,
  RevenueDataPoint 
} from '@/components/analytics/RevenueChart';
import { 
  SalesFunnel, 
  ConversionComparison, 
  MiniFunnel,
  SalesFunnelData 
} from '@/components/analytics/SalesFunnel';
import { 
  ProductPerformance, 
  PerformanceScatter, 
  CategoryPerformance,
  ProductPerformanceData 
} from '@/components/analytics/ProductPerformance';
import { 
  StatsCard, 
  StatsGrid, 
  createRevenueCard, 
  createSalesCard 
} from '@/components/seller/StatsCard';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AnalyticsData {
  revenue_chart: RevenueDataPoint[];
  sales_funnel: SalesFunnelData;
  top_products: ProductPerformanceData[];
  customer_demographics: {
    countries: Array<{ country: string; count: number; revenue: number }>;
    age_groups: Array<{ age_range: string; count: number }>;
    device_types: Array<{ device: string; count: number }>;
    traffic_sources: Array<{ source: string; visits: number; conversions: number }>;
  };
  summary_stats: {
    total_revenue: number;
    revenue_change: number;
    total_sales: number;
    sales_change: number;
    total_customers: number;
    customers_change: number;
    conversion_rate: number;
    conversion_change: number;
  };
}

export default function SellerAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PredefinedPeriod>('30d');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPeriod('30d'));
  const [comparisonMode, setComparisonMode] = useState(false);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, dateRange]);

  const loadAnalytics = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const params = new URLSearchParams({
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
        include_comparison: comparisonMode.toString(),
      });

      const response = await fetch(`/api/seller/analytics?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setAnalyticsData(data);
      } else {
        throw new Error(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
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
    loadAnalytics(true);
  };

  const handleExportData = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
        format: 'csv',
      });

      const response = await fetch(`/api/seller/analytics/export?${params.toString()}`);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${dateRange.startDate.toISOString().split('T')[0]}-to-${dateRange.endDate.toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Analytics data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export analytics data');
    }
  };

  // Create stats cards from summary data
  const statsCards = analyticsData ? [
    createRevenueCard(analyticsData.summary_stats.total_revenue, analyticsData.summary_stats.revenue_change),
    createSalesCard(analyticsData.summary_stats.total_sales, analyticsData.summary_stats.sales_change),
    {
      label: 'Total Customers',
      value: analyticsData.summary_stats.total_customers,
      change: {
        value: analyticsData.summary_stats.customers_change,
        period: 'vs previous period',
        type: analyticsData.summary_stats.customers_change > 0 ? 'increase' as const : 
              analyticsData.summary_stats.customers_change < 0 ? 'decrease' as const : 'neutral' as const,
      },
      icon: Users,
      color: 'purple' as const,
      format: 'number' as const,
    },
    {
      label: 'Conversion Rate',
      value: analyticsData.summary_stats.conversion_rate,
      change: {
        value: analyticsData.summary_stats.conversion_change,
        period: 'vs previous period',
        type: analyticsData.summary_stats.conversion_change > 0 ? 'increase' as const : 
              analyticsData.summary_stats.conversion_change < 0 ? 'decrease' as const : 'neutral' as const,
      },
      icon: TrendingUp,
      color: 'green' as const,
      format: 'percentage' as const,
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">
                Comprehensive insights into your shop performance and customer behavior
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <SimpleDateRangePicker
                period={selectedPeriod}
                onPeriodChange={handlePeriodChange}
              />
              
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                <span>Refresh</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportData}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : analyticsData ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Key Performance Metrics
              </h2>
              <StatsGrid
                stats={statsCards}
                columns={4}
                variant="default"
              />
            </div>

            {/* Main Analytics Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
                <TabsTrigger value="conversion">Conversion</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Revenue Chart */}
                  <div className="lg:col-span-2">
                    <RevenueChart
                      data={analyticsData.revenue_chart}
                      height={350}
                      variant="area"
                      period="daily"
                    />
                  </div>
                  
                  {/* Mini Funnel */}
                  <div>
                    <MiniFunnel data={analyticsData.sales_funnel} />
                  </div>
                </div>

                {/* Top Products Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analyticsData.top_products.slice(0, 3).map((product, index) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
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
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                              <span className="text-xs text-gray-500">Top Seller</span>
                            </div>
                            <p className="font-medium text-gray-900 truncate">
                              {product.title}
                            </p>
                            <p className="text-sm text-green-600">
                              ${product.revenue.toFixed(0)} revenue
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-6">
                <ProductPerformance
                  products={analyticsData.top_products}
                  maxProducts={20}
                  sortBy="revenue"
                  showFilters={true}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PerformanceScatter products={analyticsData.top_products} />
                  <CategoryPerformance products={analyticsData.top_products} />
                </div>
              </TabsContent>

              {/* Customers Tab */}
              <TabsContent value="customers" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Geographic Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Globe className="h-5 w-5" />
                        <span>Customer Locations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analyticsData.customer_demographics.countries.slice(0, 8).map((country, index) => {
                          const maxCount = Math.max(...analyticsData.customer_demographics.countries.map(c => c.count));
                          const percentage = (country.count / maxCount) * 100;
                          
                          return (
                            <div key={country.country} className="flex items-center space-x-3">
                              <div className="w-16 text-sm text-gray-600">
                                {country.country}
                              </div>
                              <div className="flex-1">
                                <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="w-12 text-sm font-medium text-gray-900 text-right">
                                {country.count}
                              </div>
                              <div className="w-16 text-sm text-gray-600 text-right">
                                ${country.revenue.toFixed(0)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Traffic Sources */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Traffic Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analyticsData.customer_demographics.traffic_sources.map((source, index) => {
                          const conversionRate = source.visits > 0 ? (source.conversions / source.visits) * 100 : 0;
                          
                          return (
                            <div key={source.source} className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{source.source}</div>
                                <div className="text-sm text-gray-500">
                                  {source.visits.toLocaleString()} visits
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-gray-900">
                                  {source.conversions}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {conversionRate.toFixed(1)}% conversion
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Device Types */}
                <Card>
                  <CardHeader>
                    <CardTitle>Device Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {analyticsData.customer_demographics.device_types.map((device, index) => {
                        const totalDevices = analyticsData.customer_demographics.device_types.reduce((sum, d) => sum + d.count, 0);
                        const percentage = totalDevices > 0 ? (device.count / totalDevices) * 100 : 0;
                        
                        return (
                          <div key={device.device} className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">
                              {percentage.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600 capitalize">
                              {device.device}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {device.count.toLocaleString()} users
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Conversion Tab */}
              <TabsContent value="conversion" className="space-y-6">
                <SalesFunnel
                  data={analyticsData.sales_funnel}
                  variant="default"
                  showConversionRates={true}
                />
                
                {/* Conversion Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Conversion Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Performance Summary</h4>
                          <div className="text-sm text-blue-700 space-y-1">
                            <p>• {analyticsData.sales_funnel.views.toLocaleString()} total page views</p>
                            <p>• {analyticsData.sales_funnel.checkout_completed} successful purchases</p>
                            <p>• {((analyticsData.sales_funnel.checkout_completed / analyticsData.sales_funnel.views) * 100).toFixed(2)}% overall conversion rate</p>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="font-medium text-yellow-900 mb-2">Optimization Opportunities</h4>
                          <div className="text-sm text-yellow-700 space-y-1">
                            {analyticsData.sales_funnel.add_to_cart / analyticsData.sales_funnel.product_views < 0.1 && (
                              <p>• Low add-to-cart rate - consider improving product descriptions</p>
                            )}
                            {analyticsData.sales_funnel.checkout_completed / analyticsData.sales_funnel.checkout_started < 0.7 && (
                              <p>• High checkout abandonment - simplify checkout process</p>
                            )}
                            {analyticsData.sales_funnel.product_views / analyticsData.sales_funnel.views < 0.3 && (
                              <p>• Low product engagement - improve homepage and navigation</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Conversion Benchmarks */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Industry Benchmarks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { 
                            metric: 'Overall Conversion', 
                            yourRate: (analyticsData.sales_funnel.checkout_completed / analyticsData.sales_funnel.views) * 100,
                            benchmark: 2.5,
                            industry: 'Digital Products'
                          },
                          { 
                            metric: 'Add to Cart Rate', 
                            yourRate: (analyticsData.sales_funnel.add_to_cart / analyticsData.sales_funnel.product_views) * 100,
                            benchmark: 8.5,
                            industry: 'E-commerce'
                          },
                          { 
                            metric: 'Checkout Success', 
                            yourRate: (analyticsData.sales_funnel.checkout_completed / analyticsData.sales_funnel.checkout_started) * 100,
                            benchmark: 75,
                            industry: 'Online Retail'
                          },
                        ].map((item, index) => {
                          const isAboveBenchmark = item.yourRate > item.benchmark;
                          
                          return (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">
                                  {item.metric}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-bold text-gray-900">
                                    {item.yourRate.toFixed(1)}%
                                  </span>
                                  {isAboveBenchmark ? (
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all duration-500',
                                      isAboveBenchmark ? 'bg-green-500' : 'bg-red-500'
                                    )}
                                    style={{ width: `${Math.min((item.yourRate / item.benchmark) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  Benchmark: {item.benchmark}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-16">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600 mb-8">
              Start selling products to see detailed analytics and insights about your performance.
            </p>
            <Button onClick={() => router.push('/seller/products/create')}>
              Create Your First Product
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
