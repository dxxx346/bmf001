'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  TrendingUp, 
  Package, 
  Star, 
  DollarSign,
  ShoppingCart,
  Eye,
  Users,
  BarChart3,
  Calendar,
  Filter,
  Download,
  ExternalLink,
  Store,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  StatsCard, 
  StatsGrid, 
  createRevenueCard, 
  createSalesCard, 
  createProductsCard, 
  createRatingCard 
} from '@/components/seller/StatsCard';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DashboardStats {
  total_revenue: number;
  revenue_change: number;
  total_sales: number;
  sales_change: number;
  total_products: number;
  products_change: number;
  average_rating: number;
  rating_change: number;
  total_views: number;
  views_change: number;
  conversion_rate: number;
  conversion_change: number;
}

interface RecentOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  product_title: string;
  amount: number;
  status: string;
  created_at: string;
}

interface TopProduct {
  id: string;
  title: string;
  thumbnail_url?: string;
  sales_count: number;
  revenue: number;
  rating: number;
  views: number;
}

interface SalesChartData {
  date: string;
  sales: number;
  revenue: number;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesData, setSalesData] = useState<SalesChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load all dashboard data in parallel
      const [statsRes, ordersRes, productsRes, salesRes] = await Promise.all([
        fetch(`/api/seller/stats?period=${selectedPeriod}`),
        fetch('/api/seller/orders/recent?limit=10'),
        fetch('/api/seller/products/top?limit=5'),
        fetch(`/api/seller/analytics/sales?period=${selectedPeriod}`),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setRecentOrders(ordersData.orders || []);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setTopProducts(productsData.products || []);
      }

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSalesData(salesData.chart_data || []);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = () => {
    router.push('/seller/products/create');
  };

  const handleCreateShop = () => {
    router.push('/seller/shops/create');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Create stats cards
  const statsCards = stats ? [
    createRevenueCard(stats.total_revenue, stats.revenue_change),
    createSalesCard(stats.total_sales, stats.sales_change),
    createProductsCard(stats.total_products, stats.products_change),
    createRatingCard(stats.average_rating, stats.rating_change),
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
              <p className="text-gray-600">
                Overview of your shop performance and recent activity
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={handleCreateProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
              
              <Button variant="outline" onClick={handleCreateShop}>
                <Plus className="h-4 w-4 mr-2" />
                New Shop
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Overview */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Performance Overview
            </h2>
            <StatsGrid
              stats={statsCards}
              loading={isLoading}
              variant="default"
              columns={4}
            />
          </div>

          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales Chart */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Sales Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
                  ) : salesData.length > 0 ? (
                    <div className="h-64 flex items-end justify-between space-x-2">
                      {salesData.slice(-14).map((data, index) => {
                        const maxRevenue = Math.max(...salesData.map(d => d.revenue));
                        const height = (data.revenue / maxRevenue) * 100;
                        
                        return (
                          <div key={data.date} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`${new Date(data.date).toLocaleDateString()}: $${data.revenue.toFixed(2)}`}
                            />
                            <span className="text-xs text-gray-500 mt-2 rotate-45 origin-bottom-left">
                              {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p>No sales data available</p>
                        <p className="text-sm">Start selling to see your analytics</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Products */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Top Products</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/seller/products')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                            <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {topProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
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
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {product.title}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{product.sales_count} sales</span>
                              <span>${product.revenue.toFixed(0)}</span>
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span>{product.rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No products yet</p>
                      <Button size="sm" onClick={handleCreateProduct} className="mt-2">
                        Create Your First Product
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Recent Orders</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/seller/orders')}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                        </div>
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {order.customer_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {order.product_title}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ${order.amount.toFixed(2)}
                          </p>
                          <Badge className={getStatusColor(order.status)} size="sm">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No orders yet</p>
                    <p className="text-sm text-gray-400">Orders will appear here once customers start buying</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleCreateProduct}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Product
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/seller/shops')}
                >
                  <Store className="h-4 w-4 mr-2" />
                  Manage Shops
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/seller/analytics')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/seller/orders')}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Manage Orders
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/seller/reviews')}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Customer Reviews
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/seller/settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                stat={{
                  label: 'Total Views',
                  value: stats.total_views,
                  change: {
                    value: stats.views_change,
                    period: 'last month',
                    type: stats.views_change > 0 ? 'increase' : stats.views_change < 0 ? 'decrease' : 'neutral',
                  },
                  icon: Eye,
                  color: 'blue',
                  format: 'number',
                }}
                variant="compact"
                loading={isLoading}
              />
              
              <StatsCard
                stat={{
                  label: 'Conversion Rate',
                  value: stats.conversion_rate,
                  change: {
                    value: stats.conversion_change,
                    period: 'last month',
                    type: stats.conversion_change > 0 ? 'increase' : stats.conversion_change < 0 ? 'decrease' : 'neutral',
                  },
                  icon: TrendingUp,
                  color: 'green',
                  format: 'percentage',
                }}
                variant="compact"
                loading={isLoading}
              />
              
              <StatsCard
                stat={{
                  label: 'Avg. Order Value',
                  value: stats.total_sales > 0 ? stats.total_revenue / stats.total_sales : 0,
                  icon: DollarSign,
                  color: 'purple',
                  format: 'currency',
                }}
                variant="compact"
                loading={isLoading}
              />
              
              <StatsCard
                stat={{
                  label: 'Active Products',
                  value: stats.total_products,
                  icon: Package,
                  color: 'gray',
                  format: 'number',
                  description: 'Products currently for sale',
                }}
                variant="compact"
                loading={isLoading}
              />
            </div>
          )}

          {/* Performance Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Optimize Product Titles</h4>
                  <p className="text-sm text-blue-700">
                    Use descriptive, keyword-rich titles to improve search visibility
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Add High-Quality Images</h4>
                  <p className="text-sm text-green-700">
                    Products with multiple high-quality images sell 3x better
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Encourage Reviews</h4>
                  <p className="text-sm text-purple-700">
                    Follow up with customers to get more reviews and ratings
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper function for status colors
function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'pending':
    case 'processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
