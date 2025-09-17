# Commission Tracking Integration Examples

## Quick Integration Guide

### 1. Complete Commission Dashboard Setup

```tsx
// Full commission tracking dashboard implementation
import { useState, useEffect } from 'react';
import { 
  EarningsChart, 
  CommissionTable, 
  PayoutRequest,
  CompactEarningsChart,
  CompactCommissionTable 
} from '@/components/partner';

function CommissionDashboard() {
  const [earningsData, setEarningsData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async (period = '30d') => {
    setIsLoading(true);
    try {
      const dateRange = getDateRangeFromPeriod(period);
      const params = new URLSearchParams({
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
      });
      
      const [earningsRes, payoutRes] = await Promise.all([
        fetch(`/api/partner/earnings?${params}`),
        fetch('/api/partner/payouts/summary')
      ]);
      
      const [earnings, payout] = await Promise.all([
        earningsRes.json(),
        payoutRes.json()
      ]);
      
      setEarningsData(earnings);
      setTransactions(earnings.commission_transactions || []);
      setPayoutSummary(payout);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Earnings"
          value={earningsData?.summary_stats.total_earnings || 0}
          change={earningsData?.summary_stats.earnings_change || 0}
          format="currency"
          icon="💰"
        />
        <MetricCard
          title="Pending"
          value={payoutSummary?.pending_amount || 0}
          format="currency"
          icon="⏳"
        />
        <MetricCard
          title="Available"
          value={payoutSummary?.available_balance || 0}
          format="currency"
          icon="✅"
        />
        <MetricCard
          title="Conversions"
          value={earningsData?.summary_stats.total_conversions || 0}
          change={earningsData?.summary_stats.conversions_change || 0}
          format="number"
          icon="🎯"
        />
      </div>

      {/* Main analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EarningsChart
            data={earningsData?.earnings_chart || []}
            breakdown={earningsData?.earnings_breakdown || []}
            isLoading={isLoading}
            variant="area"
            showBreakdown={true}
          />
        </div>
        
        <div className="space-y-4">
          <CompactEarningsChart
            data={earningsData?.earnings_chart || []}
            title="Earnings Trend"
          />
          
          <CompactCommissionTable
            transactions={transactions.slice(0, 5)}
          />
        </div>
      </div>

      {/* Detailed transactions */}
      <CommissionTable
        transactions={transactions}
        isLoading={isLoading}
        showFilters={true}
        onExport={handleTransactionExport}
      />
    </div>
  );
}

function MetricCard({ title, value, change, format, icon }) {
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-600">{title}</h3>
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(value, format)}
          </div>
          {change !== undefined && (
            <div className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
            </div>
          )}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}
```

### 2. Advanced Payout Management

```tsx
// Enhanced payout management with automation
import { useState, useEffect } from 'react';
import { PayoutRequest } from '@/components/partner';

function AdvancedPayoutManager() {
  const [autoPayoutSettings, setAutoPayoutSettings] = useState({
    enabled: false,
    threshold: 100,
    method: 'paypal',
    schedule: 'monthly'
  });
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  const setupAutoPayout = async (settings) => {
    const response = await fetch('/api/partner/payouts/auto-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (response.ok) {
      setAutoPayoutSettings(settings);
      toast.success('Auto-payout configured successfully');
    }
  };

  const handleBulkPayoutRequest = async (transactionIds) => {
    const response = await fetch('/api/partner/payouts/bulk-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_ids: transactionIds }),
    });

    if (response.ok) {
      const result = await response.json();
      toast.success(`Payout requested for ${transactionIds.length} transactions`);
      refreshPayoutData();
    }
  };

  const generatePayoutReport = async (period) => {
    const response = await fetch(`/api/partner/payouts/report?period=${period}`);
    const blob = await response.blob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payout-report-${period}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Auto-payout settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Auto-Payout Settings</h3>
        
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={autoPayoutSettings.enabled}
              onChange={(e) => setAutoPayoutSettings(prev => ({
                ...prev,
                enabled: e.target.checked
              }))}
              className="rounded"
            />
            <span>Enable automatic payouts</span>
          </label>
          
          {autoPayoutSettings.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
              <div>
                <label className="block text-sm font-medium mb-2">Threshold</label>
                <input
                  type="number"
                  value={autoPayoutSettings.threshold}
                  onChange={(e) => setAutoPayoutSettings(prev => ({
                    ...prev,
                    threshold: parseFloat(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  min="50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Method</label>
                <select
                  value={autoPayoutSettings.method}
                  onChange={(e) => setAutoPayoutSettings(prev => ({
                    ...prev,
                    method: e.target.value
                  }))}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="crypto">Cryptocurrency</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Schedule</label>
                <select
                  value={autoPayoutSettings.schedule}
                  onChange={(e) => setAutoPayoutSettings(prev => ({
                    ...prev,
                    schedule: e.target.value
                  }))}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="threshold">When threshold reached</option>
                </select>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setupAutoPayout(autoPayoutSettings)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Auto-Payout Settings
          </button>
        </div>
      </div>

      {/* Bulk payout management */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Bulk Payout Management</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Select Transactions for Payout</h4>
            <TransactionSelector
              transactions={unpaidTransactions}
              onSelectionChange={setSelectedTransactions}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleBulkPayoutRequest(selectedTransactions)}
              disabled={selectedTransactions.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Request Payout for Selected ({selectedTransactions.length})
            </button>
            
            <button
              onClick={() => generatePayoutReport('current')}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Standard payout request */}
      <PayoutRequest
        availableAmount={payoutSummary?.available_balance || 0}
        minimumAmount={50}
        onRequestSubmitted={handlePayoutSubmitted}
        pendingRequests={pendingRequests}
      />
    </div>
  );
}
```

### 3. Real-Time Commission Tracking

```tsx
// Real-time commission tracking with WebSocket
import { useState, useEffect, useRef } from 'react';

function RealTimeCommissionTracker() {
  const [liveEarnings, setLiveEarnings] = useState({
    todayEarnings: 0,
    thisWeekEarnings: 0,
    thisMonthEarnings: 0,
    recentCommissions: []
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
    const ws = new WebSocket('wss://api.yoursite.com/partner/earnings/live');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to real-time commission tracking');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'new_commission':
          handleNewCommission(data.payload);
          break;
          
        case 'commission_confirmed':
          handleCommissionConfirmed(data.payload);
          break;
          
        case 'payout_processed':
          handlePayoutProcessed(data.payload);
          break;
          
        case 'earnings_update':
          setLiveEarnings(prev => ({ ...prev, ...data.payload }));
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(connectWebSocket, 5000);
    };
  };

  const handleNewCommission = (commission) => {
    // Update live earnings
    setLiveEarnings(prev => ({
      ...prev,
      todayEarnings: prev.todayEarnings + commission.amount,
      recentCommissions: [commission, ...prev.recentCommissions.slice(0, 9)]
    }));

    // Show notification
    showCommissionNotification(commission);
  };

  const showCommissionNotification = (commission) => {
    // Toast notification
    toast.success(
      `New commission: ${formatCurrency(commission.amount)} from ${commission.product_name}`,
      { 
        duration: 5000,
        icon: '💰'
      }
    );
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Commission Earned!', {
        body: `You earned ${formatCurrency(commission.amount)} from ${commission.product_name}`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      });
    }

    // Play sound (optional)
    if (commission.amount >= 50) {
      playNotificationSound('high-value');
    } else {
      playNotificationSound('standard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <h2>Real-Time Commission Tracking</h2>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span>{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Live earnings metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Today's Earnings</h3>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(liveEarnings.todayEarnings)}
          </div>
          <div className="text-xs text-gray-500">Live updates</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">This Week</h3>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(liveEarnings.thisWeekEarnings)}
          </div>
          <div className="text-xs text-gray-500">Real-time</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">This Month</h3>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(liveEarnings.thisMonthEarnings)}
          </div>
          <div className="text-xs text-gray-500">Live tracking</div>
        </div>
      </div>

      {/* Recent commissions feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Live Commission Feed</h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {liveEarnings.recentCommissions.map((commission, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {commission.product_name}
                    </span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(commission.amount)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Customer: {commission.customer_name} • Link: {commission.referral_code}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(commission.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4. Advanced Commission Analytics

```tsx
// Comprehensive commission analytics with forecasting
import { useState, useEffect } from 'react';
import { EarningsChart } from '@/components/partner';

function CommissionAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [comparisonMode, setComparisonMode] = useState(false);

  const generateForecast = async (historicalData) => {
    // Simple linear regression for earnings forecast
    const forecast = [];
    const dataPoints = historicalData.length;
    
    if (dataPoints >= 7) {
      // Calculate trend
      const recentData = historicalData.slice(-7);
      const avgGrowth = recentData.reduce((sum, point, index) => {
        if (index === 0) return sum;
        const growth = (point.earnings - recentData[index - 1].earnings) / recentData[index - 1].earnings;
        return sum + growth;
      }, 0) / (recentData.length - 1);

      // Project next 30 days
      let lastEarnings = recentData[recentData.length - 1].earnings;
      for (let i = 1; i <= 30; i++) {
        const projectedEarnings = lastEarnings * (1 + avgGrowth);
        forecast.push({
          date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          earnings: projectedEarnings,
          type: 'forecast'
        });
        lastEarnings = projectedEarnings;
      }
    }
    
    setForecastData(forecast);
  };

  const analyzeCommissionPatterns = (data) => {
    const patterns = {
      bestDayOfWeek: getBestDayOfWeek(data),
      bestTimeOfMonth: getBestTimeOfMonth(data),
      seasonalTrends: getSeasonalTrends(data),
      productPerformance: getProductPerformance(data),
    };
    
    return patterns;
  };

  const getBestDayOfWeek = (data) => {
    const dayEarnings = {};
    data.forEach(point => {
      const day = new Date(point.date).getDay();
      dayEarnings[day] = (dayEarnings[day] || 0) + point.earnings;
    });
    
    const bestDay = Object.entries(dayEarnings).reduce((best, [day, earnings]) => 
      earnings > best.earnings ? { day: parseInt(day), earnings } : best
    , { day: 0, earnings: 0 });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[bestDay.day];
  };

  const generateOptimizationRecommendations = (patterns, currentData) => {
    const recommendations = [];
    
    // Time-based recommendations
    if (patterns.bestDayOfWeek) {
      recommendations.push({
        type: 'timing',
        title: 'Optimize Posting Schedule',
        description: `Your best performing day is ${patterns.bestDayOfWeek}. Consider scheduling more promotions on this day.`,
        impact: 'Medium',
        effort: 'Low'
      });
    }
    
    // Product-based recommendations
    if (patterns.productPerformance.topCategory) {
      recommendations.push({
        type: 'product',
        title: 'Focus on Top Category',
        description: `${patterns.productPerformance.topCategory} products generate the most commissions. Consider promoting more products in this category.`,
        impact: 'High',
        effort: 'Low'
      });
    }
    
    // Performance-based recommendations
    const recentPerformance = currentData.slice(-7).reduce((sum, d) => sum + d.earnings, 0);
    const previousWeek = currentData.slice(-14, -7).reduce((sum, d) => sum + d.earnings, 0);
    
    if (recentPerformance < previousWeek * 0.8) {
      recommendations.push({
        type: 'performance',
        title: 'Performance Declining',
        description: 'Your recent performance is down. Consider refreshing your promotion strategy.',
        impact: 'High',
        effort: 'Medium'
      });
    }
    
    return recommendations;
  };

  return (
    <div className="space-y-6">
      {/* Analytics controls */}
      <div className="flex justify-between items-center">
        <h2>Commission Analytics</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => generateForecast(analyticsData?.earnings_chart)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Generate Forecast
          </button>
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`px-4 py-2 rounded ${
              comparisonMode ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Comparison Mode
          </button>
        </div>
      </div>

      {/* Main analytics chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EarningsChart
            data={analyticsData?.earnings_chart || []}
            breakdown={analyticsData?.earnings_breakdown || []}
            variant="composed"
            height={400}
          />
          
          {/* Forecast overlay */}
          {forecastData && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">30-Day Forecast</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Projected Earnings:</span>
                  <div className="font-bold text-blue-900">
                    {formatCurrency(forecastData.reduce((sum, d) => sum + d.earnings, 0))}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700">Daily Average:</span>
                  <div className="font-bold text-blue-900">
                    {formatCurrency(forecastData.reduce((sum, d) => sum + d.earnings, 0) / 30)}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700">Growth Rate:</span>
                  <div className="font-bold text-blue-900">
                    {((forecastData[29].earnings / forecastData[0].earnings - 1) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {/* Pattern analysis */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Performance Patterns</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Best Day:</span>
                <span className="font-medium">{patterns?.bestDayOfWeek}</span>
              </div>
              <div className="flex justify-between">
                <span>Peak Period:</span>
                <span className="font-medium">{patterns?.bestTimeOfMonth}</span>
              </div>
              <div className="flex justify-between">
                <span>Top Category:</span>
                <span className="font-medium">{patterns?.productPerformance.topCategory}</span>
              </div>
            </div>
          </div>
          
          {/* Optimization recommendations */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Recommendations</h3>
            <div className="space-y-3">
              {optimizationRecommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded border">
                  <h4 className="font-medium text-sm">{rec.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        rec.impact === 'High' ? 'bg-red-100 text-red-800' :
                        rec.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.impact} Impact
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                        {rec.effort} Effort
                      </span>
                    </div>
                    <button className="text-xs text-blue-600 hover:text-blue-800">
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5. Tax Reporting Integration

```tsx
// Tax reporting and document generation
function TaxReportingIntegration() {
  const [taxData, setTaxData] = useState(null);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [reportFormat, setReportFormat] = useState('1099');

  const generateTaxReport = async (year, format) => {
    const response = await fetch('/api/partner/tax-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, format }),
    });

    const blob = await response.blob();
    downloadFile(blob, `tax-report-${year}.pdf`);
  };

  const calculateTaxLiability = (earnings, deductions = 0) => {
    const taxableIncome = Math.max(earnings - deductions, 0);
    const estimatedTax = taxableIncome * 0.25; // Simplified 25% rate
    
    return {
      taxableIncome,
      estimatedTax,
      quarterlyPayment: estimatedTax / 4,
      deductions
    };
  };

  const trackDeductibleExpenses = async (expense) => {
    const response = await fetch('/api/partner/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });

    if (response.ok) {
      toast.success('Expense recorded for tax purposes');
      refreshTaxData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Tax year selector */}
      <div className="flex items-center justify-between">
        <h2>Tax Reporting</h2>
        <div className="flex items-center space-x-2">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded"
          >
            {[2024, 2023, 2022, 2021].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={() => generateTaxReport(taxYear, reportFormat)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Tax summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Total Earnings</h3>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(taxData?.totalEarnings || 0)}
          </div>
          <div className="text-xs text-gray-500">{taxYear} tax year</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Deductions</h3>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(taxData?.deductions || 0)}
          </div>
          <div className="text-xs text-gray-500">Business expenses</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Taxable Income</h3>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(taxData?.taxableIncome || 0)}
          </div>
          <div className="text-xs text-gray-500">After deductions</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Est. Tax Liability</h3>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(taxData?.estimatedTax || 0)}
          </div>
          <div className="text-xs text-gray-500">Estimated amount</div>
        </div>
      </div>

      {/* Deductible expenses tracker */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Deductible Expenses</h3>
        
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="date"
              name="date"
              className="px-3 py-2 border rounded"
              required
            />
            <select name="category" className="px-3 py-2 border rounded" required>
              <option value="">Select category</option>
              <option value="advertising">Advertising</option>
              <option value="software">Software/Tools</option>
              <option value="education">Education/Training</option>
              <option value="equipment">Equipment</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number"
              name="amount"
              placeholder="Amount"
              step="0.01"
              className="px-3 py-2 border rounded"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Expense
            </button>
          </div>
          
          <input
            type="text"
            name="description"
            placeholder="Description"
            className="w-full px-3 py-2 border rounded"
            required
          />
        </form>
        
        {/* Expense list */}
        <div className="mt-6">
          <h4 className="font-medium mb-3">Recent Expenses</h4>
          <div className="space-y-2">
            {taxData?.expenses?.map((expense, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{expense.description}</span>
                  <span className="text-sm text-gray-600 ml-2">({expense.category})</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(expense.amount)}</div>
                  <div className="text-xs text-gray-500">{expense.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tax documents */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Tax Documents</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => generateTaxReport(taxYear, '1099')}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 text-left"
          >
            <h4 className="font-medium">Form 1099-NEC</h4>
            <p className="text-sm text-gray-600 mt-1">
              Nonemployee compensation form
            </p>
          </button>
          
          <button
            onClick={() => generateTaxReport(taxYear, 'summary')}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 text-left"
          >
            <h4 className="font-medium">Earnings Summary</h4>
            <p className="text-sm text-gray-600 mt-1">
              Detailed earnings breakdown
            </p>
          </button>
          
          <button
            onClick={() => generateTaxReport(taxYear, 'expenses')}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 text-left"
          >
            <h4 className="font-medium">Expense Report</h4>
            <p className="text-sm text-gray-600 mt-1">
              Deductible business expenses
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6. Commission Optimization Engine

```tsx
// AI-powered commission optimization
function CommissionOptimizer() {
  const [optimizationData, setOptimizationData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [implementedOptimizations, setImplementedOptimizations] = useState([]);

  const analyzeCommissionPerformance = async () => {
    const response = await fetch('/api/partner/optimization/analyze');
    const data = await response.json();
    
    setOptimizationData(data);
    generateOptimizationRecommendations(data);
  };

  const generateOptimizationRecommendations = (data) => {
    const recs = [];
    
    // Product focus recommendations
    const topCategory = data.categories.reduce((top, cat) => 
      cat.commission_per_click > top.commission_per_click ? cat : top
    );
    
    recs.push({
      id: 'focus-top-category',
      type: 'product_focus',
      title: 'Focus on High-Performing Category',
      description: `${topCategory.name} has the highest commission per click (${formatCurrency(topCategory.commission_per_click)}). Consider promoting more products in this category.`,
      impact_score: 85,
      effort_score: 20,
      estimated_increase: topCategory.commission_per_click * 100,
    });
    
    // Timing optimization
    if (data.time_analysis.best_hour) {
      recs.push({
        id: 'optimize-timing',
        type: 'timing',
        title: 'Optimize Posting Times',
        description: `Your best performing hour is ${data.time_analysis.best_hour}:00. Schedule more promotions around this time.`,
        impact_score: 60,
        effort_score: 10,
        estimated_increase: data.time_analysis.potential_increase,
      });
    }
    
    // Link optimization
    const underperformingLinks = data.links.filter(link => 
      link.clicks > 50 && link.conversion_rate < 1
    );
    
    if (underperformingLinks.length > 0) {
      recs.push({
        id: 'optimize-links',
        type: 'link_optimization',
        title: 'Optimize Underperforming Links',
        description: `${underperformingLinks.length} links have good traffic but poor conversion. Consider updating the promotion strategy.`,
        impact_score: 70,
        effort_score: 40,
        estimated_increase: underperformingLinks.reduce((sum, link) => sum + link.potential_earnings, 0),
      });
    }
    
    setRecommendations(recs.sort((a, b) => b.impact_score - a.impact_score));
  };

  const implementOptimization = async (recommendationId) => {
    const recommendation = recommendations.find(r => r.id === recommendationId);
    
    try {
      const response = await fetch('/api/partner/optimization/implement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: recommendationId }),
      });

      if (response.ok) {
        setImplementedOptimizations(prev => [...prev, recommendation]);
        toast.success('Optimization implemented successfully');
        
        // Track implementation for future analysis
        trackOptimizationImplementation(recommendation);
      }
    } catch (error) {
      toast.error('Failed to implement optimization');
    }
  };

  const trackOptimizationImplementation = (optimization) => {
    // Track the implementation for performance analysis
    const tracking = {
      optimization_id: optimization.id,
      implemented_at: new Date().toISOString(),
      expected_impact: optimization.estimated_increase,
      baseline_performance: getCurrentPerformanceBaseline(),
    };
    
    // Store tracking data for future comparison
    localStorage.setItem(`optimization_${optimization.id}`, JSON.stringify(tracking));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2>Commission Optimization</h2>
        <button
          onClick={analyzeCommissionPerformance}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Analyze Performance
        </button>
      </div>

      {/* Optimization recommendations */}
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div key={rec.id} className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                  <div className="flex space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      rec.impact_score >= 80 ? 'bg-red-100 text-red-800' :
                      rec.impact_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {rec.impact_score} Impact
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      rec.effort_score <= 20 ? 'bg-green-100 text-green-800' :
                      rec.effort_score <= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rec.effort_score} Effort
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-3">{rec.description}</p>
                
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-500">
                    Estimated increase: {formatCurrency(rec.estimated_increase)}
                  </span>
                  <span className="text-gray-500">
                    Type: {rec.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => implementOptimization(rec.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Implement
                </button>
                <button
                  onClick={() => dismissRecommendation(rec.id)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Implemented optimizations tracking */}
      {implementedOptimizations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Implemented Optimizations</h3>
          
          <div className="space-y-3">
            {implementedOptimizations.map((opt, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-green-900">{opt.title}</h4>
                  <p className="text-sm text-green-700">
                    Expected increase: {formatCurrency(opt.estimated_increase)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-900">
                    Implemented
                  </div>
                  <div className="text-xs text-green-700">
                    Tracking results...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

This integration guide provides comprehensive examples for implementing and extending the commission tracking system with advanced features like real-time tracking, tax reporting, optimization engines, and automated payout management while maintaining the security and compliance standards required for financial systems.
