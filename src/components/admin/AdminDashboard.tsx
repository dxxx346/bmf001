'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  SystemHealthCard, 
  SalesMetricsCard, 
  PaymentMetricsCard, 
  TopProductsCard, 
  TopShopsCard, 
  UserActivityCard, 
  ErrorMetricsCard,
  UserActivityHeatmap,
  ResponseTimeCard
} from './dashboard-cards';
import { PeriodSelector } from './PeriodSelector';
import { ConnectionStatus } from './ConnectionStatus';
import { AdminDashboardData } from '@/types/monitoring';

export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('24h');
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/monitoring?period=${period}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load dashboard data');
      }
      
      setData(result.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  // Set up Server-Sent Events connection
  useEffect(() => {
    const clientId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventSource = new EventSource(`/api/admin/monitoring/sse?clientId=${clientId}&subscriptions=all`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        handleSSEEvent(eventData);
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.addEventListener('system_health', (event) => {
      try {
        const eventData = JSON.parse(event.data);
        setData(prev => prev ? { ...prev, systemHealth: eventData.data } : null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error handling system_health event:', err);
      }
    });

    eventSource.addEventListener('sales_metrics', (event) => {
      try {
        const eventData = JSON.parse(event.data);
        setData(prev => prev ? { ...prev, salesMetrics: eventData.data } : null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error handling sales_metrics event:', err);
      }
    });

    eventSource.addEventListener('payment_metrics', (event) => {
      try {
        const eventData = JSON.parse(event.data);
        setData(prev => prev ? { ...prev, paymentMetrics: eventData.data } : null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error handling payment_metrics event:', err);
      }
    });

    eventSource.addEventListener('user_activity', (event) => {
      try {
        const eventData = JSON.parse(event.data);
        setData(prev => prev ? { ...prev, userActivity: eventData.data } : null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error handling user_activity event:', err);
      }
    });

    eventSource.addEventListener('error_metrics', (event) => {
      try {
        const eventData = JSON.parse(event.data);
        setData(prev => prev ? { ...prev, errorMetrics: eventData.data } : null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error handling error_metrics event:', err);
      }
    });

    eventSource.addEventListener('response_time', (event) => {
      try {
        const eventData = JSON.parse(event.data);
        setData(prev => prev ? { ...prev, responseTime: eventData.data } : null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error handling response_time event:', err);
      }
    });

    eventSource.addEventListener('heartbeat', (event) => {
      // Keep connection alive
      setLastUpdated(new Date());
    });

    eventSource.onerror = (event) => {
      console.error('SSE connection error:', event);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  // Load data when period changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSSEEvent = (eventData: any) => {
    // Handle different event types
    switch (eventData.type) {
      case 'system_health':
        setData(prev => prev ? { ...prev, systemHealth: eventData.data } : null);
        break;
      case 'sales_metrics':
        setData(prev => prev ? { ...prev, salesMetrics: eventData.data } : null);
        break;
      case 'payment_metrics':
        setData(prev => prev ? { ...prev, paymentMetrics: eventData.data } : null);
        break;
      case 'user_activity':
        setData(prev => prev ? { ...prev, userActivity: eventData.data } : null);
        break;
      case 'error_metrics':
        setData(prev => prev ? { ...prev, errorMetrics: eventData.data } : null);
        break;
      case 'response_time':
        setData(prev => prev ? { ...prev, responseTime: eventData.data } : null);
        break;
      default:
        break;
    }
    setLastUpdated(new Date());
  };

  if (isLoading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Unable to load dashboard data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">
                Real-time monitoring and analytics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <PeriodSelector value={period} onChange={setPeriod} />
              <ConnectionStatus 
                isConnected={isConnected} 
                lastUpdated={lastUpdated} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Health Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <SystemHealthCard data={data.systemHealth} />
          <ResponseTimeCard data={data.responseTime} />
          <div className="lg:col-span-1">
            <UserActivityCard data={data.userActivity} />
          </div>
        </div>

        {/* Sales and Payment Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SalesMetricsCard data={data.salesMetrics} />
          <PaymentMetricsCard data={data.paymentMetrics} />
        </div>

        {/* Top Performers Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TopProductsCard data={data.topProducts} />
          <TopShopsCard data={data.topShops} />
        </div>

        {/* User Activity Heatmap and Error Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <UserActivityHeatmap data={data.userActivityHeatmap} />
          <ErrorMetricsCard data={data.errorMetrics} />
        </div>
      </div>
    </div>
  );
}
