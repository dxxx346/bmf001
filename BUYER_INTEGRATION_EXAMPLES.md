# Buyer Dashboard Integration Examples

## Quick Integration Guide

### 1. Complete Buyer Dashboard Setup

```tsx
// Full buyer dashboard implementation
import { useState, useEffect } from 'react';
import { 
  OrderCard, 
  OrderSummary, 
  DownloadButton 
} from '@/components/buyer';

function BuyerDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/buyer/dashboard');
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleViewOrder = (orderId) => {
    router.push(`/buyer/purchases/${orderId}`);
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const response = await fetch(`/api/buyer/orders/${orderId}/invoice`);
      const blob = await response.blob();
      downloadFile(blob, `invoice-${orderId}.pdf`);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-blue-100">
          You've made {dashboardData?.stats.total_orders || 0} purchases 
          and spent {formatCurrency(dashboardData?.stats.total_spent || 0)} total.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spent"
          value={dashboardData?.stats.total_spent || 0}
          format="currency"
          icon="💰"
          trend={calculateSpendingTrend(dashboardData?.stats)}
        />
        <MetricCard
          title="Orders"
          value={dashboardData?.stats.total_orders || 0}
          icon="📦"
          subtitle={`${dashboardData?.stats.orders_this_month || 0} this month`}
        />
        <MetricCard
          title="Downloads"
          value={dashboardData?.stats.total_downloads || 0}
          icon="⬇️"
          subtitle="Digital products"
        />
        <MetricCard
          title="Favorites"
          value={dashboardData?.stats.favorite_products || 0}
          icon="❤️"
          subtitle="Saved products"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent orders */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <Button
              variant="outline"
              onClick={() => router.push('/buyer/purchases')}
            >
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {dashboardData?.recent_orders?.slice(0, 5).map(order => (
              <OrderSummary
                key={order.id}
                order={order}
                onClick={handleViewOrder}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Spending chart */}
          <SpendingChart data={dashboardData?.spending_chart || []} />
          
          {/* Recent activity */}
          <RecentActivityFeed activities={dashboardData?.recent_activity || []} />
          
          {/* Quick actions */}
          <QuickActionsCard />
        </div>
      </div>

      {/* Recommended products */}
      <RecommendedProducts products={dashboardData?.recommended_products || []} />
    </div>
  );
}

function MetricCard({ title, value, format = 'number', icon, trend, subtitle }) {
  const formatValue = (val, fmt) => {
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(val);
      default:
        return val.toLocaleString();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-600">{title}</h3>
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(value, format)}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </div>
          )}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}
```

### 2. Advanced Purchase Management

```tsx
// Enhanced purchase management with filtering and analytics
import { useState, useEffect } from 'react';
import { OrderCard } from '@/components/buyer';

function AdvancedPurchaseManager() {
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    category: 'all',
    priceRange: 'all'
  });

  const analyzeSpendingPatterns = (orderData) => {
    const patterns = {
      monthlySpending: calculateMonthlySpending(orderData),
      categoryBreakdown: calculateCategoryBreakdown(orderData),
      averageOrderValue: calculateAverageOrderValue(orderData),
      purchaseFrequency: calculatePurchaseFrequency(orderData),
      seasonalTrends: calculateSeasonalTrends(orderData),
    };
    
    return patterns;
  };

  const generateSpendingInsights = (patterns) => {
    const insights = [];
    
    // Monthly spending analysis
    const recentMonths = patterns.monthlySpending.slice(-3);
    const avgRecent = recentMonths.reduce((sum, month) => sum + month.amount, 0) / 3;
    const overallAvg = patterns.monthlySpending.reduce((sum, month) => sum + month.amount, 0) / patterns.monthlySpending.length;
    
    if (avgRecent > overallAvg * 1.2) {
      insights.push({
        type: 'spending_increase',
        title: 'Increased Spending',
        description: 'Your spending has increased recently. Consider setting a monthly budget.',
        recommendation: 'Set spending alerts or monthly limits'
      });
    }
    
    // Category analysis
    const topCategory = patterns.categoryBreakdown.reduce((top, cat) => 
      cat.amount > top.amount ? cat : top
    );
    
    insights.push({
      type: 'category_preference',
      title: 'Favorite Category',
      description: `You spend most on ${topCategory.category} products (${(topCategory.percentage).toFixed(1)}%)`,
      recommendation: 'Explore similar categories for more great products'
    });
    
    return insights;
  };

  const exportPurchaseData = async (format = 'csv') => {
    const response = await fetch(`/api/buyer/orders/export?format=${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        filters,
        include_analytics: true 
      }),
    });

    const blob = await response.blob();
    downloadFile(blob, `purchases-${new Date().toISOString().split('T')[0]}.${format}`);
  };

  return (
    <div className="space-y-6">
      {/* Analytics overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SpendingAnalyticsChart data={analytics?.monthlySpending || []} />
        </div>
        <div>
          <CategoryBreakdownChart data={analytics?.categoryBreakdown || []} />
        </div>
      </div>

      {/* Spending insights */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Spending Insights</h3>
        <div className="space-y-3">
          {analytics?.insights?.map((insight, index) => (
            <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900">{insight.title}</h4>
              <p className="text-sm text-blue-700 mt-1">{insight.description}</p>
              <p className="text-sm text-blue-600 mt-2 font-medium">{insight.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-3 py-2 border rounded"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="px-3 py-2 border rounded"
          >
            <option value="all">All Categories</option>
            <option value="digital-art">Digital Art</option>
            <option value="software">Software</option>
            <option value="templates">Templates</option>
          </select>
          
          <select
            value={filters.priceRange}
            onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
            className="px-3 py-2 border rounded"
          >
            <option value="all">All Prices</option>
            <option value="0-25">$0 - $25</option>
            <option value="25-50">$25 - $50</option>
            <option value="50-100">$50 - $100</option>
            <option value="100+">$100+</option>
          </select>
          
          <button
            onClick={() => exportPurchaseData('csv')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Orders display */}
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onViewDetails={handleViewOrder}
            onDownloadInvoice={handleDownloadInvoice}
            showDownloads={true}
            variant="default"
          />
        ))}
      </div>
    </div>
  );
}
```

### 3. Secure Download Management

```tsx
// Advanced download management with security and tracking
import { useState, useEffect } from 'react';
import { DownloadButton, BulkDownloadButton } from '@/components/buyer';

function SecureDownloadManager() {
  const [downloads, setDownloads] = useState([]);
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [securitySettings, setSecuritySettings] = useState({
    requireConfirmation: true,
    trackDownloads: true,
    enableNotifications: true
  });

  const handleSecureDownload = async (file, orderId, productId) => {
    // Pre-download security checks
    const securityCheck = await performSecurityCheck(file, orderId);
    if (!securityCheck.passed) {
      toast.error(securityCheck.reason);
      return;
    }

    // Request user confirmation for large files
    if (securitySettings.requireConfirmation && file.size > 100 * 1024 * 1024) {
      const confirmed = window.confirm(
        `This file is ${formatFileSize(file.size)}. Do you want to continue downloading?`
      );
      if (!confirmed) return;
    }

    // Track download attempt
    if (securitySettings.trackDownloads) {
      await trackDownloadAttempt(file.id, orderId, productId);
    }

    // Proceed with download
    return handleDownload(file, orderId, productId);
  };

  const performSecurityCheck = async (file, orderId) => {
    try {
      const response = await fetch('/api/buyer/downloads/security-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: file.id,
          order_id: orderId,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { passed: false, reason: 'Security check failed' };
    }
  };

  const trackDownloadAttempt = async (fileId, orderId, productId) => {
    try {
      await fetch('/api/buyer/downloads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          order_id: orderId,
          product_id: productId,
          timestamp: new Date().toISOString(),
          ip_address: await getClientIP(),
        }),
      });
    } catch (error) {
      console.error('Failed to track download:', error);
    }
  };

  const setupDownloadNotifications = () => {
    if ('Notification' in window && securitySettings.enableNotifications) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Download notifications enabled');
        }
      });
    }
  };

  const showDownloadNotification = (fileName, success) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(
        success ? 'Download Complete' : 'Download Failed',
        {
          body: success 
            ? `${fileName} has been downloaded successfully`
            : `Failed to download ${fileName}`,
          icon: '/icon-192x192.png'
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Security settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Download Security Settings</h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={securitySettings.requireConfirmation}
              onChange={(e) => setSecuritySettings(prev => ({
                ...prev,
                requireConfirmation: e.target.checked
              }))}
              className="rounded"
            />
            <span>Require confirmation for large files (>100MB)</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={securitySettings.trackDownloads}
              onChange={(e) => setSecuritySettings(prev => ({
                ...prev,
                trackDownloads: e.target.checked
              }))}
              className="rounded"
            />
            <span>Track download history for security</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={securitySettings.enableNotifications}
              onChange={(e) => setSecuritySettings(prev => ({
                ...prev,
                enableNotifications: e.target.checked
              }))}
              className="rounded"
            />
            <span>Enable download notifications</span>
          </label>
        </div>
      </div>

      {/* Download manager */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Download Manager</h3>
        
        <div className="space-y-4">
          {downloads.map(download => (
            <div key={download.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{download.product_title}</h4>
                  <p className="text-sm text-gray-600">
                    Order #{download.order_number} • {download.files.length} files
                  </p>
                </div>
                <BulkDownloadButton
                  files={download.files}
                  orderId={download.order_id}
                  productId={download.product_id}
                  onDownloadComplete={(results) => {
                    showDownloadNotification(
                      `${results.success} files`,
                      results.success > 0
                    );
                  }}
                />
              </div>
              
              <div className="grid gap-2">
                {download.files.map(file => (
                  <DownloadButton
                    key={file.id}
                    file={file}
                    orderId={download.order_id}
                    productId={download.product_id}
                    variant="compact"
                    onDownloadStart={(fileId) => {
                      console.log('Download started:', fileId);
                    }}
                    onDownloadComplete={(fileId, success) => {
                      showDownloadNotification(file.name, success);
                      if (success) {
                        updateDownloadHistory(fileId, file.name);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Download history */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Download History</h3>
        
        <div className="space-y-2">
          {downloadHistory.map((entry, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div>
                <span className="font-medium">{entry.fileName}</span>
                <span className="text-sm text-gray-600 ml-2">
                  from Order #{entry.orderNumber}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-900">
                  {new Date(entry.downloadedAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(entry.downloadedAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 4. Order Analytics Dashboard

```tsx
// Comprehensive order analytics for buyers
function OrderAnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeframe, setTimeframe] = useState('1y');

  const generateOrderInsights = (data) => {
    const insights = {
      spendingTrend: analyzeSpendingTrend(data.orders),
      categoryPreferences: analyzeCategoryPreferences(data.orders),
      sellerRelationships: analyzeSellerRelationships(data.orders),
      purchasePatterns: analyzePurchasePatterns(data.orders),
      valueAnalysis: analyzeValueReceived(data.orders, data.reviews),
    };
    
    return insights;
  };

  const analyzeSpendingTrend = (orders) => {
    const monthlyData = groupOrdersByMonth(orders);
    const trend = calculateTrendDirection(monthlyData);
    
    return {
      direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      percentage: Math.abs(trend),
      recommendation: trend > 20 ? 'Consider setting a budget' : 
                     trend < -20 ? 'Great job controlling spending' : 
                     'Spending is well-balanced'
    };
  };

  const analyzeValueReceived = (orders, reviews) => {
    const reviewedProducts = reviews.filter(r => r.rating >= 4);
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const valueScore = reviewedProducts.length / orders.length * 100;
    
    return {
      satisfaction_rate: valueScore,
      total_value: totalSpent,
      highly_rated_purchases: reviewedProducts.length,
      recommendation: valueScore > 80 ? 
        'You\'re great at finding quality products!' :
        'Consider reading reviews before purchasing'
    };
  };

  return (
    <div className="space-y-6">
      {/* Timeframe selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Purchase Analytics</h2>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="3m">Last 3 months</option>
          <option value="6m">Last 6 months</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Key insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-blue-900">Spending Trend</h3>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {analyticsData?.insights.spendingTrend.direction}
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {analyticsData?.insights.spendingTrend.recommendation}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-green-900">Value Score</h3>
          <div className="text-2xl font-bold text-green-600 mt-2">
            {analyticsData?.insights.valueAnalysis.satisfaction_rate.toFixed(1)}%
          </div>
          <p className="text-sm text-green-700 mt-1">
            Satisfaction rate
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-purple-900">Top Category</h3>
          <div className="text-lg font-bold text-purple-600 mt-2">
            {analyticsData?.insights.categoryPreferences[0]?.category}
          </div>
          <p className="text-sm text-purple-700 mt-1">
            {analyticsData?.insights.categoryPreferences[0]?.percentage.toFixed(1)}% of spending
          </p>
        </div>
      </div>

      {/* Detailed analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending over time */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Spending Over Time</h3>
          <SpendingChart data={analyticsData?.spendingChart || []} />
        </div>
        
        {/* Category breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Category Preferences</h3>
          <CategoryChart data={analyticsData?.categoryBreakdown || []} />
        </div>
        
        {/* Seller relationships */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Favorite Sellers</h3>
          <div className="space-y-3">
            {analyticsData?.insights.sellerRelationships.map((seller, index) => (
              <div key={seller.id} className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{seller.name}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {seller.orderCount} orders
                  </span>
                </div>
                <span className="font-medium text-green-600">
                  {formatCurrency(seller.totalSpent)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Purchase patterns */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Purchase Patterns</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Most Active Day:</span>
              <span className="font-medium">{analyticsData?.insights.purchasePatterns.bestDay}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg. Time Between Orders:</span>
              <span className="font-medium">{analyticsData?.insights.purchasePatterns.avgTimeBetween} days</span>
            </div>
            <div className="flex justify-between">
              <span>Preferred Price Range:</span>
              <span className="font-medium">{analyticsData?.insights.purchasePatterns.preferredPriceRange}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5. Smart Recommendations Engine

```tsx
// AI-powered product recommendations for buyers
function SmartRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationSettings, setRecommendationSettings] = useState({
    based_on_purchases: true,
    based_on_browsing: true,
    based_on_favorites: true,
    include_trending: true,
    price_range_preference: 'similar'
  });

  const generateRecommendations = async (settings) => {
    const response = await fetch('/api/buyer/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    const data = await response.json();
    return data.recommendations;
  };

  const analyzeRecommendationPerformance = (recommendations, userActions) => {
    const performance = {
      click_through_rate: 0,
      conversion_rate: 0,
      relevance_score: 0,
      category_accuracy: 0,
    };

    recommendations.forEach(rec => {
      const clicked = userActions.clicks.includes(rec.id);
      const purchased = userActions.purchases.includes(rec.id);
      
      if (clicked) performance.click_through_rate++;
      if (purchased) performance.conversion_rate++;
    });

    performance.click_through_rate = (performance.click_through_rate / recommendations.length) * 100;
    performance.conversion_rate = (performance.conversion_rate / recommendations.length) * 100;

    return performance;
  };

  const customizeRecommendations = async (preferences) => {
    const customRecs = await fetch('/api/buyer/recommendations/customize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });

    const data = await customRecs.json();
    setRecommendations(data.recommendations);
  };

  return (
    <div className="space-y-6">
      {/* Recommendation settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recommendation Preferences</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={recommendationSettings.based_on_purchases}
                onChange={(e) => setRecommendationSettings(prev => ({
                  ...prev,
                  based_on_purchases: e.target.checked
                }))}
                className="rounded"
              />
              <span>Based on purchase history</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={recommendationSettings.based_on_browsing}
                onChange={(e) => setRecommendationSettings(prev => ({
                  ...prev,
                  based_on_browsing: e.target.checked
                }))}
                className="rounded"
              />
              <span>Based on browsing behavior</span>
            </label>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={recommendationSettings.include_trending}
                onChange={(e) => setRecommendationSettings(prev => ({
                  ...prev,
                  include_trending: e.target.checked
                }))}
                className="rounded"
              />
              <span>Include trending products</span>
            </label>
            
            <div>
              <label className="block text-sm font-medium mb-2">Price Range Preference</label>
              <select
                value={recommendationSettings.price_range_preference}
                onChange={(e) => setRecommendationSettings(prev => ({
                  ...prev,
                  price_range_preference: e.target.value
                }))}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="similar">Similar to my purchases</option>
                <option value="lower">Lower priced options</option>
                <option value="higher">Premium options</option>
                <option value="all">All price ranges</option>
              </select>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => customizeRecommendations(recommendationSettings)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Update Recommendations
        </button>
      </div>

      {/* Recommended products grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {recommendations.map(product => (
          <ProductRecommendationCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
            onAddToFavorites={handleAddToFavorites}
            onView={handleViewProduct}
          />
        ))}
      </div>

      {/* Recommendation performance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recommendation Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analyticsData?.performance.click_through_rate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Click-through Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analyticsData?.performance.conversion_rate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Conversion Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {analyticsData?.performance.relevance_score.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Relevance Score</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {analyticsData?.performance.category_accuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Category Accuracy</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 6. Purchase Planning Tools

```tsx
// Budget planning and purchase optimization tools
function PurchasePlanningTools() {
  const [budget, setBudget] = useState({
    monthly_limit: 100,
    category_limits: {},
    notifications: true,
    auto_pause: false
  });
  const [wishlist, setWishlist] = useState([]);
  const [priceAlerts, setPriceAlerts] = useState([]);

  const createBudgetPlan = async (budgetData) => {
    const response = await fetch('/api/buyer/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budgetData),
    });

    if (response.ok) {
      setBudget(budgetData);
      toast.success('Budget plan created successfully');
    }
  };

  const setupPriceAlert = async (productId, targetPrice) => {
    const response = await fetch('/api/buyer/price-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        target_price: targetPrice,
        notification_method: 'email'
      }),
    });

    if (response.ok) {
      toast.success('Price alert set successfully');
      refreshPriceAlerts();
    }
  };

  const optimizePurchaseTiming = (wishlistItems) => {
    const recommendations = [];
    
    wishlistItems.forEach(item => {
      // Analyze price history
      if (item.price_history) {
        const avgPrice = item.price_history.reduce((sum, p) => sum + p.price, 0) / item.price_history.length;
        const currentPrice = item.current_price;
        
        if (currentPrice < avgPrice * 0.9) {
          recommendations.push({
            product_id: item.id,
            action: 'buy_now',
            reason: 'Price is 10% below average',
            savings: avgPrice - currentPrice
          });
        } else if (currentPrice > avgPrice * 1.1) {
          recommendations.push({
            product_id: item.id,
            action: 'wait',
            reason: 'Price is above average, consider waiting',
            potential_savings: currentPrice - avgPrice
          });
        }
      }
    });
    
    return recommendations;
  };

  return (
    <div className="space-y-6">
      {/* Budget management */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Budget Management</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Monthly Budget Limit</label>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">$</span>
              <input
                type="number"
                value={budget.monthly_limit}
                onChange={(e) => setBudget(prev => ({
                  ...prev,
                  monthly_limit: parseFloat(e.target.value)
                }))}
                className="flex-1 px-3 py-2 border rounded"
                min="0"
                step="10"
              />
            </div>
            
            <div className="mt-3">
              <BudgetProgressBar
                spent={currentMonthSpending}
                limit={budget.monthly_limit}
              />
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Category Limits</h4>
            <div className="space-y-2">
              {Object.entries(budget.category_limits).map(([category, limit]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm">{category}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">$</span>
                    <input
                      type="number"
                      value={limit}
                      onChange={(e) => updateCategoryLimit(category, parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 border rounded text-sm"
                      min="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={budget.notifications}
              onChange={(e) => setBudget(prev => ({
                ...prev,
                notifications: e.target.checked
              }))}
              className="rounded"
            />
            <span className="text-sm">Budget notifications</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={budget.auto_pause}
              onChange={(e) => setBudget(prev => ({
                ...prev,
                auto_pause: e.target.checked
              }))}
              className="rounded"
            />
            <span className="text-sm">Auto-pause when limit reached</span>
          </label>
        </div>
      </div>

      {/* Price alerts */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Price Alerts</h3>
        
        <div className="space-y-3">
          {priceAlerts.map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">{alert.product_title}</h4>
                <p className="text-sm text-gray-600">
                  Alert when price drops below {formatCurrency(alert.target_price)}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm">
                  Current: {formatCurrency(alert.current_price)}
                </span>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <WishlistPriceAlertSetup
            wishlistItems={wishlist}
            onAlertCreated={refreshPriceAlerts}
          />
        </div>
      </div>

      {/* Purchase optimization */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Purchase Optimization</h3>
        
        <div className="space-y-4">
          {optimizationRecommendations.map((rec, index) => (
            <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">{rec.title}</h4>
                  <p className="text-sm text-blue-700 mt-1">{rec.description}</p>
                  {rec.savings && (
                    <p className="text-sm font-medium text-green-600 mt-2">
                      Potential savings: {formatCurrency(rec.savings)}
                    </p>
                  )}
                </div>
                
                <button
                  onClick={() => implementRecommendation(rec)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  {rec.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

This integration guide provides comprehensive examples for implementing and extending the buyer dashboard system with advanced features like analytics, security, recommendations, and purchase optimization while maintaining the user experience and security standards of the base system.
