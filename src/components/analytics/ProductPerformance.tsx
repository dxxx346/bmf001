'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  Star, 
  DollarSign, 
  Eye,
  ShoppingCart,
  Award,
  Target,
  Filter,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface ProductPerformanceData {
  id: string;
  title: string;
  thumbnail_url?: string;
  category: string;
  price: number;
  sale_price?: number;
  views: number;
  sales: number;
  revenue: number;
  rating: number;
  review_count: number;
  conversion_rate: number;
  profit_margin: number;
  created_at: string;
  last_sale_at?: string;
}

interface ProductPerformanceProps {
  products: ProductPerformanceData[];
  isLoading?: boolean;
  className?: string;
  maxProducts?: number;
  sortBy?: 'revenue' | 'sales' | 'rating' | 'conversion' | 'views';
  showFilters?: boolean;
}

const PERFORMANCE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export function ProductPerformance({
  products,
  isLoading = false,
  className,
  maxProducts = 10,
  sortBy = 'revenue',
  showFilters = true,
}: ProductPerformanceProps) {
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'sales' | 'views' | 'rating'>('revenue');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    return ['all', ...uniqueCategories];
  }, [products]);

  // Filter and sort products
  const processedProducts = useMemo(() => {
    let filtered = [...products];

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    // Sort by selected metric
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.revenue - a.revenue;
        case 'sales':
          return b.sales - a.sales;
        case 'rating':
          return b.rating - a.rating;
        case 'conversion':
          return b.conversion_rate - a.conversion_rate;
        case 'views':
          return b.views - a.views;
        default:
          return b.revenue - a.revenue;
      }
    });

    return filtered.slice(0, maxProducts);
  }, [products, filterCategory, sortBy, maxProducts]);

  // Prepare chart data
  const chartData = processedProducts.map(product => ({
    name: product.title.length > 20 ? `${product.title.substring(0, 20)}...` : product.title,
    fullName: product.title,
    revenue: product.revenue,
    sales: product.sales,
    views: product.views,
    rating: product.rating,
    conversion: product.conversion_rate,
    id: product.id,
  }));

  // Calculate performance insights
  const insights = useMemo(() => {
    if (products.length === 0) return null;

    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    const totalSales = products.reduce((sum, p) => sum + p.sales, 0);
    const totalViews = products.reduce((sum, p) => sum + p.views, 0);
    
    const topPerformer = products.reduce((top, current) => 
      current.revenue > top.revenue ? current : top
    );
    
    const bestConverting = products.reduce((best, current) => 
      current.conversion_rate > best.conversion_rate ? current : best
    );
    
    const mostViewed = products.reduce((most, current) => 
      current.views > most.views ? current : most
    );

    const averageRating = products.reduce((sum, p) => sum + p.rating, 0) / products.length;
    const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

    return {
      totalRevenue,
      totalSales,
      totalViews,
      topPerformer,
      bestConverting,
      mostViewed,
      averageRating,
      conversionRate,
    };
  }, [products]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.fullName}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Revenue:</span>
              <span className="text-sm font-medium">{formatCurrency(data.revenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Sales:</span>
              <span className="text-sm font-medium">{data.sales.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Views:</span>
              <span className="text-sm font-medium">{data.views.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Conversion:</span>
              <span className="text-sm font-medium">{data.conversion.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-40" />
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Product Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No product data available</p>
              <p className="text-sm">Create products to see performance analytics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Performance Overview */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Top Performer</div>
                  <div className="font-medium text-gray-900 truncate">
                    {insights.topPerformer.title}
                  </div>
                  <div className="text-sm text-green-600">
                    {formatCurrency(insights.topPerformer.revenue)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Best Converting</div>
                  <div className="font-medium text-gray-900 truncate">
                    {insights.bestConverting.title}
                  </div>
                  <div className="text-sm text-green-600">
                    {insights.bestConverting.conversion_rate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Most Viewed</div>
                  <div className="font-medium text-gray-900 truncate">
                    {insights.mostViewed.title}
                  </div>
                  <div className="text-sm text-blue-600">
                    {insights.mostViewed.views.toLocaleString()} views
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Product Performance</span>
            </CardTitle>
            
            {showFilters && (
              <div className="flex items-center space-x-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="views">Views</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'chart' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('chart')}
                    className="rounded-none border-0"
                  >
                    Chart
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-none border-0"
                  >
                    Table
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {viewMode === 'chart' ? (
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => 
                      selectedMetric === 'revenue' ? `$${value}` : 
                      selectedMetric === 'rating' ? `${value}★` :
                      value.toLocaleString()
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey={selectedMetric} 
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PERFORMANCE_COLORS[index % PERFORMANCE_COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processedProducts.map((product, index) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-gray-100 rounded-lg overflow-hidden">
                            {product.thumbnail_url ? (
                              <img
                                src={product.thumbnail_url}
                                alt={product.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {product.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(product.sale_price || product.price)}
                            </p>
                          </div>
                          {index < 3 && (
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {product.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {product.sales.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(product.revenue)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900">
                            {product.conversion_rate.toFixed(1)}%
                          </span>
                          {product.conversion_rate > 5 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : product.conversion_rate < 1 ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-900">
                            {product.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({product.review_count})
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Product performance scatter plot
interface PerformanceScatterProps {
  products: ProductPerformanceData[];
  className?: string;
}

export function PerformanceScatter({ products, className }: PerformanceScatterProps) {
  const scatterData = products.map(product => ({
    x: product.views,
    y: product.revenue,
    name: product.title,
    sales: product.sales,
    conversion: product.conversion_rate,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Revenue vs Views Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={scatterData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Views"
                tickFormatter={(value) => value.toLocaleString()}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Revenue"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'Views' ? value.toLocaleString() : formatCurrency(value),
                  name
                ]}
              />
              <Scatter 
                name="Products" 
                dataKey="y" 
                fill="#3B82F6"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-xs text-gray-500 text-center">
          Products in the top-right quadrant have high views and high revenue
        </div>
      </CardContent>
    </Card>
  );
}

// Category performance breakdown
interface CategoryPerformanceProps {
  products: ProductPerformanceData[];
  className?: string;
}

export function CategoryPerformance({ products, className }: CategoryPerformanceProps) {
  const categoryData = useMemo(() => {
    const categories: Record<string, {
      revenue: number;
      sales: number;
      products: number;
      averageRating: number;
    }> = {};

    products.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = {
          revenue: 0,
          sales: 0,
          products: 0,
          averageRating: 0,
        };
      }
      
      categories[product.category].revenue += product.revenue;
      categories[product.category].sales += product.sales;
      categories[product.category].products += 1;
      categories[product.category].averageRating += product.rating;
    });

    // Calculate averages and convert to array
    return Object.entries(categories).map(([name, data]) => ({
      name,
      revenue: data.revenue,
      sales: data.sales,
      products: data.products,
      averageRating: data.averageRating / data.products,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [products]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Category Chart */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Revenue Distribution</h4>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PERFORMANCE_COLORS[index % PERFORMANCE_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Category Table */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Category Breakdown</h4>
            <div className="space-y-3">
              {categoryData.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: PERFORMANCE_COLORS[index % PERFORMANCE_COLORS.length] }}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{category.name}</div>
                      <div className="text-xs text-gray-500">
                        {category.products} products
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(category.revenue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.sales} sales
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
