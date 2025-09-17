'use client';

import { 
  SystemHealth, 
  ResponseTimeMetrics, 
  SalesMetrics, 
  PaymentMetrics, 
  TopProduct, 
  TopShop, 
  UserActivity, 
  ErrorMetrics 
} from '@/types/monitoring';
import type { UserActivityHeatmap } from '@/types/monitoring';
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3,
  Star,
  Eye,
  Download
} from 'lucide-react';

// System Health Card
export function SystemHealthCard({ data }: { data: SystemHealth }) {
  const getHealthColor = (usage: number) => {
    if (usage < 50) return 'text-green-600';
    if (usage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (usage: number) => {
    if (usage < 50) return 'bg-green-100';
    if (usage < 80) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <Activity className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {/* CPU Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">CPU Usage</span>
            </div>
            <span className={`text-sm font-semibold ${getHealthColor(data.cpu.usage)}`}>
              {data.cpu.usage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getHealthBgColor(data.cpu.usage)}`}
              style={{ width: `${Math.min(data.cpu.usage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.cpu.cores} cores, Load: {data.cpu.loadAverage[0].toFixed(2)}
          </div>
        </div>

        {/* Memory Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <MemoryStick className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Memory Usage</span>
            </div>
            <span className={`text-sm font-semibold ${getHealthColor(data.memory.usage)}`}>
              {data.memory.usage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getHealthBgColor(data.memory.usage)}`}
              style={{ width: `${Math.min(data.memory.usage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {(data.memory.used / 1024 / 1024 / 1024).toFixed(1)}GB / {(data.memory.total / 1024 / 1024 / 1024).toFixed(1)}GB
          </div>
        </div>

        {/* Uptime */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Uptime</span>
          </div>
          <span className="text-sm text-gray-600">
            {Math.floor(data.uptime / 3600)}h {Math.floor((data.uptime % 3600) / 60)}m
          </span>
        </div>
      </div>
    </div>
  );
}

// Response Time Card
export function ResponseTimeCard({ data }: { data: ResponseTimeMetrics }) {
  const getResponseTimeColor = (time: number) => {
    if (time < 100) return 'text-green-600';
    if (time < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Response Time</h3>
        <Clock className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Average</span>
          <span className={`font-semibold ${getResponseTimeColor(data.average)}`}>
            {data.average.toFixed(0)}ms
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">P95</span>
          <span className={`font-semibold ${getResponseTimeColor(data.p95)}`}>
            {data.p95.toFixed(0)}ms
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">P99</span>
          <span className={`font-semibold ${getResponseTimeColor(data.p99)}`}>
            {data.p99.toFixed(0)}ms
          </span>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-gray-600">Requests</span>
          <span className="text-sm font-medium text-gray-900">{data.count}</span>
        </div>
      </div>
    </div>
  );
}

// Sales Metrics Card
export function SalesMetricsCard({ data }: { data: SalesMetrics }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sales Metrics</h3>
        <DollarSign className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            ${data.totalRevenue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Revenue</div>
          <div className={`text-xs flex items-center justify-center mt-1 ${
            data.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {data.revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(data.revenueGrowth).toFixed(1)}%
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {data.totalOrders.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Orders</div>
          <div className={`text-xs flex items-center justify-center mt-1 ${
            data.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {data.ordersGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(data.ordersGrowth).toFixed(1)}%
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Average Order Value</span>
          <span className="text-sm font-semibold text-gray-900">
            ${data.averageOrderValue.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-600">Conversion Rate</span>
          <span className="text-sm font-semibold text-gray-900">
            {data.conversionRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Payment Metrics Card
export function PaymentMetricsCard({ data }: { data: PaymentMetrics }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Metrics</h3>
        <CreditCard className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Success Rate</span>
          <span className="text-lg font-semibold text-green-600">
            {data.successRate.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Failure Rate</span>
          <span className="text-lg font-semibold text-red-600">
            {data.failureRate.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Transactions</span>
          <span className="text-sm font-semibold text-gray-900">
            {data.totalTransactions.toLocaleString()}
          </span>
        </div>
        
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-gray-700 mb-2">By Provider</div>
          <div className="space-y-2">
            {Object.entries(data.byProvider).map(([provider, metrics]) => (
              <div key={provider} className="flex justify-between items-center">
                <span className="text-xs text-gray-600 capitalize">{provider}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-900">{metrics.totalTransactions}</span>
                  <span className={`text-xs ${metrics.successRate >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {metrics.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Top Products Card
export function TopProductsCard({ data }: { data: TopProduct[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
        <BarChart3 className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        {data.slice(0, 5).map((product, index) => (
          <div key={product.id} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.title}
                  </p>
                  <p className="text-xs text-gray-500">{product.shopName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3" />
                <span>{product.revenue.toFixed(0)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <ShoppingCart className="h-3 w-3" />
                <span>{product.sales}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3" />
                <span>{product.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Top Shops Card
export function TopShopsCard({ data }: { data: TopShop[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Top Shops</h3>
        <BarChart3 className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        {data.slice(0, 5).map((shop, index) => (
          <div key={shop.id} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {shop.name}
                  </p>
                  <p className="text-xs text-gray-500">{shop.ownerName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3" />
                <span>{shop.totalRevenue.toFixed(0)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <ShoppingCart className="h-3 w-3" />
                <span>{shop.totalSales}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3" />
                <span>{shop.averageRating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// User Activity Card
export function UserActivityCard({ data }: { data: UserActivity }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
        <Users className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Users</span>
          <span className="text-lg font-semibold text-gray-900">
            {data.totalUsers.toLocaleString()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active Users</span>
          <span className="text-sm font-semibold text-green-600">
            {data.activeUsers.toLocaleString()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">New Users</span>
          <span className="text-sm font-semibold text-blue-600">
            {data.newUsers.toLocaleString()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Returning Users</span>
          <span className="text-sm font-semibold text-purple-600">
            {data.returningUsers.toLocaleString()}
          </span>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg Session Duration</span>
            <span className="text-sm font-semibold text-gray-900">
              {Math.floor(data.averageSessionDuration / 60)}m {Math.floor(data.averageSessionDuration % 60)}s
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-600">Bounce Rate</span>
            <span className="text-sm font-semibold text-gray-900">
              {data.bounceRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// User Activity Heatmap
export function UserActivityHeatmap({ data }: { data: UserActivityHeatmap[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const maxActivity = Math.max(...data.map(d => d.activity));
  
  const getIntensity = (activity: number) => {
    if (maxActivity === 0) return 'bg-gray-100';
    const intensity = activity / maxActivity;
    if (intensity < 0.2) return 'bg-gray-100';
    if (intensity < 0.4) return 'bg-blue-200';
    if (intensity < 0.6) return 'bg-blue-300';
    if (intensity < 0.8) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">User Activity Heatmap</h3>
        <BarChart3 className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="grid grid-cols-25 gap-1">
            {/* Header row with hours */}
            <div></div>
            {hours.map(hour => (
              <div key={hour} className="text-xs text-gray-500 text-center">
                {hour}
              </div>
            ))}
            
            {/* Data rows */}
            {days.map((day, dayIndex) => (
              <div key={day} className="contents">
                <div className="text-xs text-gray-500 text-right pr-2 py-1">
                  {day}
                </div>
                {hours.map(hour => {
                  const cellData = data.find(d => d.day === dayIndex && d.hour === hour);
                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={`w-3 h-3 rounded-sm ${getIntensity(cellData?.activity || 0)}`}
                      title={`${day} ${hour}:00 - Activity: ${cellData?.activity || 0}, Users: ${cellData?.users || 0}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-300 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// Error Metrics Card
export function ErrorMetricsCard({ data }: { data: ErrorMetrics }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Error Metrics</h3>
        <AlertTriangle className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Errors</span>
          <span className="text-lg font-semibold text-red-600">
            {data.totalErrors.toLocaleString()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Error Rate</span>
          <span className="text-sm font-semibold text-gray-900">
            {data.errorRate.toFixed(2)}%
          </span>
        </div>
        
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-gray-700 mb-2">Errors by Type</div>
          <div className="space-y-1">
            {Object.entries(data.errorsByType).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-xs text-gray-600 capitalize">{type}</span>
                <span className="text-xs font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        {data.recentErrors.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-sm font-medium text-gray-700 mb-2">Recent Errors</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {data.recentErrors.slice(0, 3).map((error) => (
                <div key={error.id} className="text-xs text-gray-600">
                  <div className="font-medium">{error.message}</div>
                  <div className="text-gray-500">
                    {new Date(error.timestamp).toLocaleTimeString()}
                    {error.endpoint && ` • ${error.endpoint}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
