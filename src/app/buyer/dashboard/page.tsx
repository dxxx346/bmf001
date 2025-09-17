'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Download, 
  Star, 
  Heart,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Eye,
  Plus,
  Filter,
  RefreshCw,
  Award,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderSummary, Order } from '@/components/buyer/OrderCard';
import { CompactEarningsChart } from '@/components/partner/EarningsChart';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface BuyerStats {
  total_spent: number;
  total_orders: number;
  total_downloads: number;
  favorite_products: number;
  spending_this_month: number;
  spending_last_month: number;
  orders_this_month: number;
  average_order_value: number;
}

interface RecentActivity {
  id: string;
  type: 'purchase' | 'download' | 'review' | 'favorite';
  title: string;
  description: string;
  date: string;
  amount?: number;
  product_id?: string;
  order_id?: string;
}

interface RecommendedProduct {
  id: string;
  title: string;
  price: number;
  sale_price?: number;
  thumbnail_url?: string;
  category: string;
  rating: number;
  review_count: number;
  is_favorited: boolean;
  seller_name: string;
}

interface BuyerDashboardData {
  stats: BuyerStats;
  recent_orders: Order[];
  recent_activity: RecentActivity[];
  recommended_products: RecommendedProduct[];
  spending_chart: Array<{
    date: string;
    amount: number;
    orders: number;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earned_at: string;
  }>;
}

export default function BuyerDashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuthContext();
  
  const [dashboardData, setDashboardData] = useState<BuyerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch('/api/buyer/dashboard');
      const data = await response.json();
      
      if (response.ok) {
        setDashboardData(data);
      } else {
        throw new Error(data.error || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/buyer/purchases/${orderId}`);
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  const handleToggleFavorite = async (productId: string, isFavorited: boolean) => {
    try {
      const response = await fetch(`/api/buyer/favorites/${productId}`, {
        method: isFavorited ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        // Update the recommended products list
        setDashboardData(prev => prev ? {
          ...prev,
          recommended_products: prev.recommended_products.map(product =>
            product.id === productId 
              ? { ...product, is_favorited: !isFavorited }
              : product
          )
        } : null);
        
        toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getSpendingChange = () => {
    if (!dashboardData) return 0;
    const { spending_this_month, spending_last_month } = dashboardData.stats;
    if (spending_last_month === 0) return spending_this_month > 0 ? 100 : 0;
    return ((spending_this_month - spending_last_month) / spending_last_month) * 100;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingBag className="h-4 w-4 text-blue-600" />;
      case 'download':
        return <Download className="h-4 w-4 text-green-600" />;
      case 'review':
        return <Star className="h-4 w-4 text-yellow-600" />;
      case 'favorite':
        return <Heart className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {profile?.name || 'Buyer'}! 👋
              </h1>
              <p className="text-gray-600">
                Manage your purchases, downloads, and discover new products
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
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
                onClick={() => router.push('/search')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Shop Now</span>
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
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-40 bg-gray-100 rounded animate-pulse" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : dashboardData ? (
          <div className="space-y-8">
            {/* Key Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Spent</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(dashboardData.stats.total_spent)}
                      </div>
                      <div className={cn(
                        'flex items-center text-sm mt-1',
                        getSpendingChange() >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        <span>{Math.abs(getSpendingChange()).toFixed(1)}% this month</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {dashboardData.stats.total_orders}
                      </div>
                      <p className="text-sm text-gray-500">
                        {dashboardData.stats.orders_this_month} this month
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <ShoppingBag className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Downloads</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {dashboardData.stats.total_downloads}
                      </div>
                      <p className="text-sm text-gray-500">
                        Digital products
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Download className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Favorites</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {dashboardData.stats.favorite_products}
                      </div>
                      <p className="text-sm text-gray-500">
                        Saved products
                      </p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <Heart className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Recent Orders and Activity */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <ShoppingBag className="h-5 w-5" />
                        <span>Recent Orders</span>
                      </CardTitle>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/buyer/purchases')}
                        className="flex items-center space-x-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View All</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.recent_orders.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.recent_orders.slice(0, 5).map((order) => (
                          <OrderSummary
                            key={order.id}
                            order={order}
                            onClick={handleViewOrder}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                        <p className="text-gray-600 mb-4">
                          Start shopping to see your order history here
                        </p>
                        <Button onClick={() => router.push('/search')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Start Shopping
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span>Recent Activity</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.recent_activity.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.recent_activity.slice(0, 8).map((activity) => (
                          <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="p-2 bg-white rounded-lg">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{activity.title}</p>
                              <p className="text-sm text-gray-600">{activity.description}</p>
                            </div>
                            <div className="text-right">
                              {activity.amount && (
                                <p className="font-medium text-gray-900">
                                  {formatCurrency(activity.amount)}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                {new Date(activity.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No recent activity</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Stats and Recommendations */}
              <div className="space-y-6">
                {/* Spending Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Spending Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CompactEarningsChart
                      data={dashboardData.spending_chart.map(point => ({
                        date: point.date,
                        earnings: point.amount,
                        commissions: 0,
                        bonuses: 0,
                        conversions: point.orders,
                        average_commission: 0,
                      }))}
                      title="Monthly Spending"
                      height={120}
                    />
                    
                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(dashboardData.stats.spending_this_month)}
                        </div>
                        <div className="text-xs text-gray-500">This Month</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(dashboardData.stats.average_order_value)}
                        </div>
                        <div className="text-xs text-gray-500">Avg. Order</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Achievements */}
                {dashboardData.achievements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <Award className="h-5 w-5" />
                        <span>Recent Achievements</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dashboardData.achievements.slice(0, 3).map((achievement) => (
                          <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-2xl">{achievement.icon}</div>
                            <div>
                              <p className="font-medium text-yellow-900">{achievement.title}</p>
                              <p className="text-sm text-yellow-700">{achievement.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={() => router.push('/buyer/purchases')}
                      className="w-full justify-start"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      View All Orders
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/buyer/favorites')}
                      className="w-full justify-start"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      My Favorites
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/buyer/downloads')}
                      className="w-full justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      My Downloads
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/buyer/reviews')}
                      className="w-full justify-start"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      My Reviews
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recommended Products */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Recommended for You</span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/recommendations')}
                    className="flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View All</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dashboardData.recommended_products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dashboardData.recommended_products.slice(0, 8).map((product) => (
                      <div key={product.id} className="group cursor-pointer" onClick={() => handleViewProduct(product.id)}>
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                          {product.thumbnail_url ? (
                            <img
                              src={product.thumbnail_url}
                              alt={product.title}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                            {product.title}
                          </h4>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-blue-600">
                                {product.sale_price 
                                  ? formatCurrency(product.sale_price)
                                  : formatCurrency(product.price)
                                }
                              </span>
                              {product.sale_price && (
                                <span className="text-sm text-gray-500 line-through">
                                  {formatCurrency(product.price)}
                                </span>
                              )}
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(product.id, product.is_favorited);
                              }}
                              className="h-8 w-8"
                            >
                              <Heart className={cn(
                                'h-4 w-4',
                                product.is_favorited ? 'text-red-600 fill-current' : 'text-gray-400'
                              )} />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-gray-600">{product.rating.toFixed(1)}</span>
                              <span className="text-gray-400">({product.review_count})</span>
                            </div>
                            
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-gray-500">
                            by {product.seller_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No recommendations yet</h3>
                    <p className="text-gray-600 mb-4">
                      Make a few purchases to get personalized recommendations
                    </p>
                    <Button onClick={() => router.push('/search')}>
                      Explore Products
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to your dashboard!</h3>
            <p className="text-gray-600 mb-8">
              Start shopping to see your purchase history and recommendations
            </p>
            <Button onClick={() => router.push('/search')}>
              <Plus className="h-4 w-4 mr-2" />
              Start Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
