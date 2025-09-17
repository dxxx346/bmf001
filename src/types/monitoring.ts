// Monitoring and analytics types for admin dashboard

export interface SystemHealth {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    free: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    free: number;
    usage: number;
  };
  uptime: number;
  timestamp: string;
}

export interface ResponseTimeMetrics {
  average: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  min: number;
  count: number;
  timestamp: string;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  revenueGrowth: number;
  ordersGrowth: number;
  period: string;
  timestamp: string;
}

export interface PaymentMetrics {
  successRate: number;
  failureRate: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageProcessingTime: number;
  byProvider: {
    stripe: PaymentProviderMetrics;
    yookassa: PaymentProviderMetrics;
    crypto: PaymentProviderMetrics;
  };
  timestamp: string;
}

export interface PaymentProviderMetrics {
  successRate: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageProcessingTime: number;
  revenue: number;
}

export interface TopProduct {
  id: string;
  title: string;
  shopName: string;
  sales: number;
  revenue: number;
  views: number;
  conversionRate: number;
  rating: number;
  category: string;
}

export interface TopShop {
  id: string;
  name: string;
  ownerName: string;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  conversionRate: number;
  growthRate: number;
}

export interface UserActivity {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  userGrowth: number;
  averageSessionDuration: number;
  bounceRate: number;
  timestamp: string;
}

export interface UserActivityHeatmap {
  hour: number;
  day: number;
  activity: number;
  users: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: {
    [errorType: string]: number;
  };
  errorsByEndpoint: {
    [endpoint: string]: number;
  };
  recentErrors: ErrorLog[];
  timestamp: string;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  endpoint?: string;
  userId?: string;
  correlationId: string;
  metadata?: Record<string, any>;
}

export interface AdminDashboardData {
  systemHealth: SystemHealth;
  responseTime: ResponseTimeMetrics;
  salesMetrics: SalesMetrics;
  paymentMetrics: PaymentMetrics;
  topProducts: TopProduct[];
  topShops: TopShop[];
  userActivity: UserActivity;
  userActivityHeatmap: UserActivityHeatmap[];
  errorMetrics: ErrorMetrics;
  lastUpdated: string;
}

export interface MonitoringConfig {
  refreshInterval: number;
  enableRealTime: boolean;
  alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
  };
  retentionPeriod: number; // in days
}

export interface Alert {
  id: string;
  type: 'system' | 'performance' | 'error' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface MonitoringEvent {
  type: 'system_health' | 'sales_metrics' | 'payment_metrics' | 'user_activity' | 'error_metrics';
  data: any;
  timestamp: string;
}

// Real-time event types for Server-Sent Events
export interface SSEEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

export interface SSEClient {
  id: string;
  lastEventId: string;
  connectedAt: string;
  subscriptions: string[];
}
