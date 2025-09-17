# Seller Shop Management Integration Examples

## Quick Integration Guide

### 1. Basic Shop Management Integration

Add shop management to existing seller dashboard:

```tsx
// In src/app/seller/layout.tsx
import { StatsCard } from '@/components/seller/StatsCard';

function SellerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <Link href="/seller/dashboard">Dashboard</Link>
            <Link href="/seller/shops">My Shops</Link>
            <Link href="/seller/products">Products</Link>
            <Link href="/seller/orders">Orders</Link>
            <Link href="/seller/analytics">Analytics</Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
```

### 2. Custom Stats Dashboard

```tsx
// Custom dashboard with specific metrics
import { StatsGrid, createRevenueCard, createSalesCard } from '@/components/seller/StatsCard';

function CustomSellerDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchSellerStats().then(setStats);
  }, []);

  const customStats = [
    createRevenueCard(stats?.revenue || 0, stats?.revenueChange),
    createSalesCard(stats?.sales || 0, stats?.salesChange),
    {
      label: 'Conversion Rate',
      value: stats?.conversionRate || 0,
      format: 'percentage',
      icon: TrendingUp,
      color: 'green',
      change: {
        value: stats?.conversionChange || 0,
        period: 'last month',
        type: stats?.conversionChange > 0 ? 'increase' : 'decrease'
      }
    }
  ];

  return (
    <div>
      <StatsGrid 
        stats={customStats}
        columns={3}
        variant="detailed"
      />
    </div>
  );
}
```

### 3. Shop Creation Wizard

```tsx
// Multi-step shop creation with validation
import { useState } from 'react';
import { ShopForm } from '@/components/seller/ShopForm';

function ShopCreationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [shopData, setShopData] = useState({});

  const steps = [
    { id: 1, title: 'Basic Info', component: BasicInfoStep },
    { id: 2, title: 'Branding', component: BrandingStep },
    { id: 3, title: 'Settings', component: SettingsStep },
    { id: 4, title: 'Review', component: ReviewStep },
  ];

  const handleStepComplete = (stepData) => {
    setShopData(prev => ({ ...prev, ...stepData }));
    setCurrentStep(prev => prev + 1);
  };

  const handleCreateShop = async (finalData) => {
    const completeData = { ...shopData, ...finalData };
    await createShop(completeData);
    router.push('/seller/shops');
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8">
        {steps.map(step => (
          <div key={step.id} className={`step ${currentStep >= step.id ? 'active' : ''}`}>
            {step.title}
          </div>
        ))}
      </div>

      {/* Current step content */}
      {currentStep <= 3 ? (
        <ShopForm
          mode="create"
          onSubmit={handleStepComplete}
          initialData={shopData}
        />
      ) : (
        <ReviewStep
          shopData={shopData}
          onSubmit={handleCreateShop}
        />
      )}
    </div>
  );
}
```

### 4. Shop Performance Analytics

```tsx
// Advanced analytics with charts
import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

function ShopAnalytics({ shopId }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchShopAnalytics(shopId, period).then(setAnalyticsData);
  }, [shopId, period]);

  const chartData = {
    labels: analyticsData?.salesByDay?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Revenue',
        data: analyticsData?.salesByDay?.map(d => d.revenue) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
      {
        label: 'Sales',
        data: analyticsData?.salesByDay?.map(d => d.sales) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2>Shop Analytics</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      <Line data={chartData} />
      
      {/* Additional analytics components */}
    </div>
  );
}
```

### 5. Shop Status Management

```tsx
// Bulk shop operations
function ShopBulkActions({ selectedShops, onUpdate }) {
  const handleBulkActivate = async () => {
    const promises = selectedShops.map(shopId =>
      fetch(`/api/seller/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
      })
    );

    await Promise.all(promises);
    onUpdate();
    toast.success(`${selectedShops.length} shops activated`);
  };

  const handleBulkDeactivate = async () => {
    const promises = selectedShops.map(shopId =>
      fetch(`/api/seller/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false })
      })
    );

    await Promise.all(promises);
    onUpdate();
    toast.success(`${selectedShops.length} shops deactivated`);
  };

  return (
    <div className="flex space-x-2">
      <Button onClick={handleBulkActivate}>
        Activate Selected
      </Button>
      <Button onClick={handleBulkDeactivate} variant="outline">
        Deactivate Selected
      </Button>
    </div>
  );
}
```

### 6. Shop Theme Customization

```tsx
// Advanced theme customization
function ShopThemeEditor({ shop, onUpdate }) {
  const [theme, setTheme] = useState(shop.settings.theme || {});

  const handleColorChange = (colorType, color) => {
    setTheme(prev => ({
      ...prev,
      [colorType]: color
    }));
  };

  const handleSaveTheme = async () => {
    const response = await fetch(`/api/seller/shops/${shop.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          ...shop.settings,
          theme
        }
      })
    });

    if (response.ok) {
      onUpdate();
      toast.success('Theme updated successfully');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label>Primary Color</label>
        <input
          type="color"
          value={theme.primary_color || '#3B82F6'}
          onChange={(e) => handleColorChange('primary_color', e.target.value)}
        />
      </div>
      
      <div>
        <label>Secondary Color</label>
        <input
          type="color"
          value={theme.secondary_color || '#10B981'}
          onChange={(e) => handleColorChange('secondary_color', e.target.value)}
        />
      </div>

      {/* Live preview */}
      <div className="p-4 border rounded-lg">
        <h3>Preview</h3>
        <div 
          className="h-8 rounded mb-2"
          style={{ backgroundColor: theme.primary_color }}
        >
          Primary Color
        </div>
        <div 
          className="h-6 rounded"
          style={{ backgroundColor: theme.secondary_color }}
        >
          Secondary Color
        </div>
      </div>

      <Button onClick={handleSaveTheme}>
        Save Theme
      </Button>
    </div>
  );
}
```

### 7. Shop Analytics Export

```tsx
// Export shop analytics data
function AnalyticsExport({ shopId }) {
  const exportAnalytics = async (format = 'csv') => {
    try {
      const response = await fetch(`/api/seller/analytics/export?shop_id=${shopId}&format=${format}`);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shop-analytics-${shopId}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Analytics exported successfully');
    } catch (error) {
      toast.error('Failed to export analytics');
    }
  };

  return (
    <div className="flex space-x-2">
      <Button onClick={() => exportAnalytics('csv')}>
        Export CSV
      </Button>
      <Button onClick={() => exportAnalytics('pdf')} variant="outline">
        Export PDF
      </Button>
    </div>
  );
}
```

### 8. Shop Comparison Tool

```tsx
// Compare multiple shops performance
function ShopComparison({ shopIds }) {
  const [comparisonData, setComparisonData] = useState([]);

  useEffect(() => {
    const fetchComparison = async () => {
      const promises = shopIds.map(id => 
        fetch(`/api/seller/shops/${id}/analytics`).then(r => r.json())
      );
      
      const results = await Promise.all(promises);
      setComparisonData(results);
    };

    fetchComparison();
  }, [shopIds]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th>Shop Name</th>
            <th>Revenue</th>
            <th>Sales</th>
            <th>Products</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.map((shop, index) => (
            <tr key={index}>
              <td>{shop.name}</td>
              <td>${shop.stats.total_revenue.toFixed(2)}</td>
              <td>{shop.stats.total_sales}</td>
              <td>{shop.stats.total_products}</td>
              <td>{shop.stats.average_rating.toFixed(1)}★</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Advanced Integration Patterns

### 1. Shop-Specific Product Management

```tsx
// Filter products by shop
function ShopProductManager({ shopId }) {
  const [products, setProducts] = useState([]);

  const loadShopProducts = async () => {
    const response = await fetch(`/api/seller/products?shop_id=${shopId}`);
    const data = await response.json();
    setProducts(data.products);
  };

  const createProductForShop = async (productData) => {
    const response = await fetch('/api/seller/products', {
      method: 'POST',
      body: JSON.stringify({
        ...productData,
        shop_id: shopId
      })
    });
    
    if (response.ok) {
      loadShopProducts(); // Refresh list
    }
  };

  return (
    <div>
      <Button onClick={() => createProductForShop(newProductData)}>
        Add Product to This Shop
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

### 2. Real-Time Shop Analytics

```tsx
// Real-time analytics updates
function RealTimeShopAnalytics({ shopId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    // Initial load
    loadAnalytics();

    // Set up real-time updates (every 30 seconds)
    const interval = setInterval(loadAnalytics, 30000);
    
    return () => clearInterval(interval);
  }, [shopId]);

  const loadAnalytics = async () => {
    const response = await fetch(`/api/seller/shops/${shopId}/analytics`);
    const data = await response.json();
    setAnalytics(data.analytics);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2>Real-Time Analytics</h2>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-600">Live</span>
        </div>
      </div>
      
      {analytics && (
        <StatsGrid
          stats={[
            {
              label: 'Today\'s Revenue',
              value: analytics.todayRevenue,
              format: 'currency',
              color: 'green'
            },
            {
              label: 'Active Visitors',
              value: analytics.activeVisitors,
              format: 'number',
              color: 'blue'
            }
          ]}
          columns={2}
        />
      )}
    </div>
  );
}
```

### 3. Shop Performance Monitoring

```tsx
// Monitor shop health and performance
function ShopHealthMonitor({ shops }) {
  const [healthScores, setHealthScores] = useState({});

  const calculateHealthScore = (shop) => {
    let score = 0;
    
    // Basic info completeness (30 points)
    if (shop.description) score += 10;
    if (shop.logo_url) score += 10;
    if (shop.banner_url) score += 10;
    
    // Performance metrics (40 points)
    if (shop.stats.average_rating >= 4.0) score += 20;
    if (shop.stats.total_sales > 10) score += 20;
    
    // SEO optimization (30 points)
    if (shop.settings.seo?.meta_title) score += 10;
    if (shop.settings.seo?.meta_description) score += 10;
    if (shop.settings.social_links) score += 10;
    
    return Math.min(score, 100);
  };

  useEffect(() => {
    const scores = {};
    shops.forEach(shop => {
      scores[shop.id] = calculateHealthScore(shop);
    });
    setHealthScores(scores);
  }, [shops]);

  return (
    <div>
      <h3>Shop Health Scores</h3>
      <div className="space-y-3">
        {shops.map(shop => (
          <div key={shop.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h4 className="font-medium">{shop.name}</h4>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      healthScores[shop.id] >= 80 ? 'bg-green-500' :
                      healthScores[shop.id] >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthScores[shop.id]}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {healthScores[shop.id]}%
                </span>
              </div>
            </div>
            <Button size="sm" onClick={() => router.push(`/seller/shops/${shop.id}/optimize`)}>
              Optimize
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

This integration guide provides practical examples for implementing and extending the seller shop management system in various scenarios while maintaining the security and performance standards of the base system.
