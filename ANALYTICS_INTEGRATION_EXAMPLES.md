# Analytics Integration Examples

## Quick Integration Guide

### 1. Basic Analytics Dashboard Setup

```tsx
// Complete analytics dashboard implementation
import { useState, useEffect } from 'react';
import { 
  DateRangePicker, 
  RevenueChart, 
  SalesFunnel, 
  ProductPerformance 
} from '@/components/analytics';

function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState(getDateRangeFromPeriod('30d'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async (range) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: range.startDate.toISOString(),
        end_date: range.endDate.toISOString(),
      });
      
      const response = await fetch(`/api/seller/analytics?${params}`);
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(dateRange);
  }, [dateRange]);

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={data?.summary_stats.total_revenue || 0}
          change={data?.summary_stats.revenue_change || 0}
          format="currency"
        />
        <MetricCard
          title="Total Sales"
          value={data?.summary_stats.total_sales || 0}
          change={data?.summary_stats.sales_change || 0}
          format="number"
        />
        <MetricCard
          title="Conversion Rate"
          value={data?.summary_stats.conversion_rate || 0}
          change={data?.summary_stats.conversion_change || 0}
          format="percentage"
        />
        <MetricCard
          title="Customers"
          value={data?.summary_stats.total_customers || 0}
          change={data?.summary_stats.customers_change || 0}
          format="number"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          data={data?.revenue_chart || []}
          isLoading={isLoading}
          variant="area"
        />
        <SalesFunnel
          data={data?.sales_funnel || {}}
          isLoading={isLoading}
        />
      </div>

      {/* Product performance */}
      <ProductPerformance
        products={data?.top_products || []}
        isLoading={isLoading}
      />
    </div>
  );
}

// Metric card component
function MetricCard({ title, value, change, format }) {
  const formatValue = (val, fmt) => {
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-sm text-gray-600">{title}</h3>
      <div className="text-2xl font-bold text-gray-900">
        {formatValue(value, format)}
      </div>
      {change !== 0 && (
        <div className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change > 0 ? '+' : ''}{change.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
```

### 2. Revenue Analysis with Multiple Charts

```tsx
// Advanced revenue analysis with comparison charts
import { useState } from 'react';
import { 
  RevenueChart, 
  CompactRevenueChart, 
  RevenueComparisonChart 
} from '@/components/analytics';

function RevenueAnalysis() {
  const [viewMode, setViewMode] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  return (
    <div className="space-y-6">
      {/* View controls */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded ${
              viewMode === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-4 py-2 rounded ${
              viewMode === 'detailed' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Detailed
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-4 py-2 rounded ${
              viewMode === 'comparison' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Comparison
          </button>
        </div>

        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="revenue">Revenue</option>
          <option value="sales">Sales</option>
          <option value="orders">Orders</option>
        </select>
      </div>

      {/* Charts based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RevenueChart
              data={revenueData}
              variant="area"
              height={350}
            />
          </div>
          <div className="space-y-4">
            <CompactRevenueChart
              data={revenueData}
              metric="revenue"
              title="Revenue Trend"
            />
            <CompactRevenueChart
              data={revenueData}
              metric="sales"
              title="Sales Trend"
            />
          </div>
        </div>
      )}

      {viewMode === 'detailed' && (
        <div className="space-y-6">
          <RevenueChart
            data={revenueData}
            variant="line"
            height={400}
            showComparison={true}
          />
          
          {/* Detailed metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Peak Performance</h3>
              <div className="text-2xl font-bold text-green-600">
                ${Math.max(...revenueData.map(d => d.revenue)).toFixed(0)}
              </div>
              <p className="text-sm text-gray-600">Highest single day revenue</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Average Daily Revenue</h3>
              <div className="text-2xl font-bold text-blue-600">
                ${(revenueData.reduce((sum, d) => sum + d.revenue, 0) / revenueData.length).toFixed(0)}
              </div>
              <p className="text-sm text-gray-600">Mean daily performance</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Growth Rate</h3>
              <div className="text-2xl font-bold text-purple-600">
                +{calculateGrowthRate(revenueData).toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Period over period</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'comparison' && (
        <RevenueComparisonChart
          currentData={currentPeriodData}
          previousData={previousPeriodData}
        />
      )}
    </div>
  );
}

function calculateGrowthRate(data) {
  if (data.length < 2) return 0;
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  
  const firstSum = firstHalf.reduce((sum, d) => sum + d.revenue, 0);
  const secondSum = secondHalf.reduce((sum, d) => sum + d.revenue, 0);
  
  return firstSum > 0 ? ((secondSum - firstSum) / firstSum) * 100 : 0;
}
```

### 3. Advanced Sales Funnel with Optimization

```tsx
// Sales funnel with optimization recommendations
import { useState, useMemo } from 'react';
import { SalesFunnel, ConversionComparison } from '@/components/analytics';

function ConversionOptimization() {
  const [funnelData, setFunnelData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [optimizationMode, setOptimizationMode] = useState(false);

  // Calculate optimization opportunities
  const optimizations = useMemo(() => {
    if (!funnelData) return [];

    const opportunities = [];
    
    // Low product view rate
    if (funnelData.product_views / funnelData.views < 0.3) {
      opportunities.push({
        type: 'critical',
        stage: 'Product Discovery',
        issue: 'Low product view rate',
        recommendation: 'Improve homepage design and navigation',
        impact: 'High',
        effort: 'Medium'
      });
    }

    // Low add to cart rate
    if (funnelData.add_to_cart / funnelData.product_views < 0.1) {
      opportunities.push({
        type: 'warning',
        stage: 'Product Interest',
        issue: 'Low add-to-cart conversion',
        recommendation: 'Optimize product descriptions and pricing',
        impact: 'High',
        effort: 'Low'
      });
    }

    // High cart abandonment
    if (funnelData.checkout_completed / funnelData.checkout_started < 0.7) {
      opportunities.push({
        type: 'critical',
        stage: 'Checkout Process',
        issue: 'High checkout abandonment',
        recommendation: 'Simplify checkout process and add payment options',
        impact: 'Very High',
        effort: 'High'
      });
    }

    return opportunities;
  }, [funnelData]);

  return (
    <div className="space-y-6">
      {/* Toggle optimization mode */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Conversion Analysis</h2>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={optimizationMode}
            onChange={(e) => setOptimizationMode(e.target.checked)}
            className="rounded"
          />
          <span>Show Optimization Tips</span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main funnel */}
        <SalesFunnel
          data={funnelData}
          variant="detailed"
          showConversionRates={true}
        />

        {/* Comparison or optimization */}
        {optimizationMode ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Optimization Opportunities</h3>
            {optimizations.map((opt, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  opt.type === 'critical' ? 'border-red-200 bg-red-50' :
                  opt.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{opt.stage}</h4>
                    <p className="text-sm text-gray-600 mt-1">{opt.issue}</p>
                    <p className="text-sm font-medium mt-2">{opt.recommendation}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-1 rounded ${
                      opt.impact === 'Very High' ? 'bg-red-100 text-red-800' :
                      opt.impact === 'High' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {opt.impact} Impact
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {opt.effort} Effort
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ConversionComparison
            currentData={funnelData}
            previousData={comparisonData}
          />
        )}
      </div>

      {/* Benchmark comparison */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Industry Benchmarks</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              metric: 'Overall Conversion',
              your: ((funnelData?.checkout_completed || 0) / (funnelData?.views || 1)) * 100,
              benchmark: 2.5,
              industry: 'Digital Products'
            },
            {
              metric: 'Cart Conversion',
              your: ((funnelData?.add_to_cart || 0) / (funnelData?.product_views || 1)) * 100,
              benchmark: 8.5,
              industry: 'E-commerce'
            },
            {
              metric: 'Checkout Success',
              your: ((funnelData?.checkout_completed || 0) / (funnelData?.checkout_started || 1)) * 100,
              benchmark: 75,
              industry: 'Online Retail'
            }
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl font-bold mb-1">
                {item.your.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mb-2">{item.metric}</div>
              <div className={`text-xs px-2 py-1 rounded ${
                item.your > item.benchmark ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                Benchmark: {item.benchmark}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 4. Product Performance Dashboard

```tsx
// Comprehensive product performance analysis
import { useState, useEffect } from 'react';
import { 
  ProductPerformance, 
  PerformanceScatter, 
  CategoryPerformance 
} from '@/components/analytics';

function ProductAnalytics() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    category: 'all',
    sortBy: 'revenue',
    timeframe: '30d'
  });
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    generateInsights(products);
  }, [products]);

  const generateInsights = (productData) => {
    if (productData.length === 0) return;

    const insights = {
      topPerformer: productData.reduce((top, product) => 
        product.revenue > top.revenue ? product : top
      ),
      underperformer: productData.filter(p => p.conversion_rate < 1),
      highPotential: productData.filter(p => p.views > 100 && p.conversion_rate < 2),
      categoryLeaders: getCategoryLeaders(productData),
      recommendations: generateRecommendations(productData)
    };

    setInsights(insights);
  };

  const getCategoryLeaders = (products) => {
    const categories = {};
    products.forEach(product => {
      if (!categories[product.category] || 
          product.revenue > categories[product.category].revenue) {
        categories[product.category] = product;
      }
    });
    return Object.values(categories);
  };

  const generateRecommendations = (products) => {
    const recommendations = [];

    // Low conversion products with high views
    const highViewLowConversion = products.filter(p => 
      p.views > 50 && p.conversion_rate < 1
    );
    
    if (highViewLowConversion.length > 0) {
      recommendations.push({
        type: 'optimization',
        title: 'Optimize High-Traffic Products',
        description: `${highViewLowConversion.length} products have high views but low conversion`,
        action: 'Review pricing and descriptions',
        products: highViewLowConversion.slice(0, 3)
      });
    }

    // Products with no recent sales
    const staleProducts = products.filter(p => p.sales === 0);
    if (staleProducts.length > 0) {
      recommendations.push({
        type: 'promotion',
        title: 'Promote Stale Products',
        description: `${staleProducts.length} products have no recent sales`,
        action: 'Consider promotional pricing or marketing',
        products: staleProducts.slice(0, 3)
      });
    }

    return recommendations;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value})}
          className="px-3 py-2 border rounded"
        >
          <option value="all">All Categories</option>
          <option value="digital-art">Digital Art</option>
          <option value="templates">Templates</option>
          <option value="software">Software</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
          className="px-3 py-2 border rounded"
        >
          <option value="revenue">Revenue</option>
          <option value="sales">Sales</option>
          <option value="conversion">Conversion Rate</option>
          <option value="rating">Rating</option>
        </select>

        <select
          value={filters.timeframe}
          onChange={(e) => setFilters({...filters, timeframe: e.target.value})}
          className="px-3 py-2 border rounded"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Insights Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900">Top Performer</h3>
            <p className="text-sm text-green-700 mt-1">
              {insights.topPerformer.title}
            </p>
            <div className="text-2xl font-bold text-green-900 mt-2">
              ${insights.topPerformer.revenue.toFixed(0)}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900">High Potential</h3>
            <p className="text-sm text-yellow-700 mt-1">
              {insights.highPotential.length} products need optimization
            </p>
            <div className="text-2xl font-bold text-yellow-900 mt-2">
              {insights.highPotential.reduce((sum, p) => sum + p.views, 0)} views
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900">Underperformers</h3>
            <p className="text-sm text-red-700 mt-1">
              {insights.underperformer.length} products below 1% conversion
            </p>
            <div className="text-2xl font-bold text-red-900 mt-2">
              {insights.underperformer.length}
            </div>
          </div>
        </div>
      )}

      {/* Main Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ProductPerformance
          products={products}
          sortBy={filters.sortBy}
          showFilters={false}
        />
        
        <div className="space-y-6">
          <PerformanceScatter products={products} />
          <CategoryPerformance products={products} />
        </div>
      </div>

      {/* Recommendations */}
      {insights?.recommendations && insights.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
          <div className="space-y-4">
            {insights.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  rec.type === 'optimization' ? 'border-blue-200 bg-blue-50' :
                  rec.type === 'promotion' ? 'border-purple-200 bg-purple-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                    <p className="text-sm font-medium text-blue-600 mt-2">{rec.action}</p>
                  </div>
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    Apply
                  </button>
                </div>
                
                {rec.products && (
                  <div className="mt-3 flex space-x-2">
                    {rec.products.map(product => (
                      <div key={product.id} className="text-xs bg-white px-2 py-1 rounded border">
                        {product.title.substring(0, 20)}...
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 5. Real-Time Analytics with WebSocket

```tsx
// Real-time analytics with live updates
import { useState, useEffect, useRef } from 'react';
import { RevenueChart, SalesFunnel } from '@/components/analytics';

function RealTimeAnalytics() {
  const [realtimeData, setRealtimeData] = useState({
    revenue: [],
    funnel: {},
    liveStats: {
      activeUsers: 0,
      currentRevenue: 0,
      todaySales: 0
    }
  });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket('wss://api.yoursite.com/analytics/live');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to real-time analytics');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'revenue_update':
          setRealtimeData(prev => ({
            ...prev,
            revenue: [...prev.revenue.slice(-23), data.payload]
          }));
          break;
          
        case 'funnel_update':
          setRealtimeData(prev => ({
            ...prev,
            funnel: data.payload
          }));
          break;
          
        case 'live_stats':
          setRealtimeData(prev => ({
            ...prev,
            liveStats: data.payload
          }));
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Real-Time Analytics</h2>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Active Users</h3>
          <div className="text-2xl font-bold text-blue-600">
            {realtimeData.liveStats.activeUsers}
          </div>
          <div className="flex items-center mt-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Today's Revenue</h3>
          <div className="text-2xl font-bold text-green-600">
            ${realtimeData.liveStats.currentRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Updated live
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Today's Sales</h3>
          <div className="text-2xl font-bold text-purple-600">
            {realtimeData.liveStats.todaySales}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Sales count
          </div>
        </div>
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Live Revenue Stream</h3>
          <RevenueChart
            data={realtimeData.revenue}
            variant="line"
            height={300}
          />
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Live Conversion Funnel</h3>
          <SalesFunnel
            data={realtimeData.funnel}
            variant="compact"
          />
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Live Activity Feed</h3>
        </div>
        <div className="p-4">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

function ActivityFeed() {
  const [activities, setActivities] = useState([]);

  // Mock activity feed - replace with real WebSocket data
  useEffect(() => {
    const interval = setInterval(() => {
      const newActivity = {
        id: Date.now(),
        type: ['sale', 'view', 'cart'][Math.floor(Math.random() * 3)],
        product: 'Sample Product',
        amount: Math.floor(Math.random() * 100),
        timestamp: new Date(),
      };
      
      setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      {activities.map(activity => (
        <div key={activity.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
          <div className={`w-2 h-2 rounded-full ${
            activity.type === 'sale' ? 'bg-green-500' :
            activity.type === 'view' ? 'bg-blue-500' : 'bg-yellow-500'
          }`} />
          <div className="flex-1">
            <span className="text-sm">
              {activity.type === 'sale' ? 'New sale' :
               activity.type === 'view' ? 'Product viewed' : 'Added to cart'}
            </span>
            <span className="text-sm text-gray-600 ml-2">
              {activity.product}
            </span>
            {activity.type === 'sale' && (
              <span className="text-sm font-medium text-green-600 ml-2">
                ${activity.amount}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {activity.timestamp.toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 6. Custom Analytics Hooks

```tsx
// Reusable analytics hooks for easy integration
import { useState, useEffect, useCallback } from 'react';

// Main analytics hook
export function useAnalytics(dateRange, options = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
        ...options
      });
      
      const response = await fetch(`/api/seller/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, options]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, isLoading, error, refetch: fetchAnalytics };
}

// Revenue-specific hook
export function useRevenueAnalytics(period = '30d') {
  const [revenueData, setRevenueData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      const dateRange = getDateRangeFromPeriod(period);
      const response = await fetch(`/api/seller/revenue?period=${period}`);
      const data = await response.json();
      
      setRevenueData(data.chart_data);
      setSummary(data.summary);
    } catch (error) {
      console.error('Revenue fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { revenueData, summary, isLoading, refetch: fetchRevenueData };
}

// Product performance hook
export function useProductPerformance(filters = {}) {
  const [products, setProducts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProductData();
  }, [filters]);

  const fetchProductData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/seller/products/performance?${params}`);
      const data = await response.json();
      
      setProducts(data.products);
      setInsights(data.insights);
    } catch (error) {
      console.error('Product performance error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { products, insights, isLoading, refetch: fetchProductData };
}

// Real-time analytics hook
export function useRealTimeAnalytics() {
  const [liveData, setLiveData] = useState({
    activeUsers: 0,
    currentRevenue: 0,
    recentSales: []
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('wss://api.yoursite.com/analytics/live');
    
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLiveData(prev => ({ ...prev, ...data }));
    };

    return () => ws.close();
  }, []);

  return { liveData, isConnected };
}

// Usage examples:
function MyAnalyticsDashboard() {
  const dateRange = getDateRangeFromPeriod('30d');
  const { data, isLoading, error } = useAnalytics(dateRange);
  const { revenueData } = useRevenueAnalytics('30d');
  const { products } = useProductPerformance({ sortBy: 'revenue' });
  const { liveData, isConnected } = useRealTimeAnalytics();

  if (isLoading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <RevenueChart data={revenueData} />
      <ProductPerformance products={products} />
      {isConnected && <LiveStats data={liveData} />}
    </div>
  );
}
```

This integration guide provides comprehensive examples for implementing and extending the seller analytics system with advanced features, real-time capabilities, and reusable hooks for easy integration throughout the application.
