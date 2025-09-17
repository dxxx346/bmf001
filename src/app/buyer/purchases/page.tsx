'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Search, 
  Filter,
  Download,
  FileText,
  Eye,
  Calendar,
  DollarSign,
  Package,
  RefreshCw,
  Grid,
  List,
  Star,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderCard, OrderSummary, Order } from '@/components/buyer/OrderCard';
import { DateRangePicker, DateRange, getDateRangeFromPeriod } from '@/components/analytics/DateRangePicker';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'completed' | 'processing' | 'pending' | 'cancelled' | 'refunded';
type SortBy = 'created_at' | 'total_amount' | 'status' | 'completed_at';

interface PurchaseStats {
  total_orders: number;
  total_spent: number;
  total_downloads: number;
  pending_orders: number;
  completed_orders: number;
  average_order_value: number;
}

export default function BuyerPurchasesPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPeriod('1y'));

  useEffect(() => {
    if (user) {
      loadPurchases();
    }
  }, [user, dateRange]);

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchQuery, filterStatus, sortBy]);

  const loadPurchases = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const params = new URLSearchParams({
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
      });

      const [ordersRes, statsRes] = await Promise.all([
        fetch(`/api/buyer/orders?${params.toString()}`),
        fetch('/api/buyer/orders/stats'),
      ]);

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setPurchaseStats(statsData);
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
      toast.error('Failed to load purchase history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filterAndSortOrders = () => {
    let filtered = [...orders];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(item => 
          item.product_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.seller_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.shop_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'total_amount':
          return b.total_amount - a.total_amount;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'completed_at':
          if (!a.completed_at && !b.completed_at) return 0;
          if (!a.completed_at) return 1;
          if (!b.completed_at) return -1;
          return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredOrders(filtered);
  };

  const handleRefresh = () => {
    loadPurchases(true);
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/buyer/purchases/${orderId}`);
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const response = await fetch(`/api/buyer/orders/${orderId}/invoice`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${orderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Invoice downloaded successfully');
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handleLeaveReview = (productId: string, orderId: string) => {
    router.push(`/products/${productId}/review?order=${orderId}`);
  };

  const handleContactSupport = (orderId: string) => {
    router.push(`/support?order=${orderId}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Purchase History</h1>
              <p className="text-gray-600">
                View your orders, download digital products, and manage your purchases
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                maxDate={new Date()}
                className="w-auto"
              />
              
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {purchaseStats && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {purchaseStats.total_orders}
                </div>
                <div className="text-xs text-gray-500">Total Orders</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(purchaseStats.total_spent)}
                </div>
                <div className="text-xs text-gray-500">Total Spent</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {purchaseStats.total_downloads}
                </div>
                <div className="text-xs text-gray-500">Downloads</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {purchaseStats.completed_orders}
                </div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {purchaseStats.pending_orders}
                </div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(purchaseStats.average_order_value)}
                </div>
                <div className="text-xs text-gray-500">Avg. Order</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders, products, or sellers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-3">
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest First</SelectItem>
                  <SelectItem value="total_amount">Highest Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="completed_at">Recently Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none border-0"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-48" />
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-24" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <div key={j} className="h-16 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No purchases yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                You haven&apos;t made any purchases yet. Explore our marketplace to find amazing digital products.
              </p>
              <Button onClick={() => router.push('/search')} size="lg">
                <Package className="h-4 w-4 mr-2" />
                Start Shopping
              </Button>
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-4">
                No orders match your current search and filter criteria.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredOrders.length} of {orders.length} orders
              </p>
              
              <div className="flex items-center space-x-4">
                {searchQuery && (
                  <Badge variant="outline">
                    Filtered by: &quot;{searchQuery}&quot;
                  </Badge>
                )}
                
                <div className="text-sm text-gray-600">
                  Total: {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.total_amount, 0))}
                </div>
              </div>
            </div>

            {/* Orders Display */}
            {viewMode === 'grid' ? (
              <div className="space-y-6">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onViewDetails={handleViewOrder}
                    onDownloadInvoice={handleDownloadInvoice}
                    onLeaveReview={handleLeaveReview}
                    onContactSupport={handleContactSupport}
                    showDownloads={true}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Order List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <div key={order.id} className="p-4 hover:bg-gray-50">
                        <OrderSummary
                          order={order}
                          onClick={handleViewOrder}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
