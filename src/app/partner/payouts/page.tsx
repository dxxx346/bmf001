'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Plus,
  Eye,
  Calendar,
  CreditCard,
  Building,
  Bitcoin,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayoutRequest } from '@/components/partner/PayoutRequest';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PayoutRecord {
  id: string;
  amount: number;
  net_amount: number;
  fee_amount: number;
  payment_method: 'paypal' | 'bank_transfer' | 'crypto';
  payment_details: {
    paypal_email?: string;
    bank_name?: string;
    account_number?: string;
    crypto_currency?: string;
    wallet_address?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  processed_at?: string;
  completed_at?: string;
  transaction_id?: string;
  failure_reason?: string;
  notes?: string;
  batch_id?: string;
}

interface PayoutSummary {
  available_balance: number;
  pending_amount: number;
  total_paid: number;
  total_requested: number;
  next_payout_date: string;
  minimum_payout: number;
  last_payout_amount?: number;
  last_payout_date?: string;
}

type PayoutStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
type SortBy = 'created_at' | 'amount' | 'status' | 'processed_at';

export default function PayoutsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set());
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => {
    if (user) {
      loadPayoutData();
    }
  }, [user]);

  const loadPayoutData = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [payoutsRes, summaryRes] = await Promise.all([
        fetch('/api/partner/payouts'),
        fetch('/api/partner/payouts/summary'),
      ]);

      if (payoutsRes.ok) {
        const payoutsData = await payoutsRes.json();
        setPayouts(payoutsData.payouts || []);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setPayoutSummary(summaryData);
      }
    } catch (error) {
      console.error('Error loading payout data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadPayoutData(true);
  };

  const handlePayoutRequest = (newRequest: any) => {
    setPayouts(prev => [newRequest, ...prev]);
    setShowRequestForm(false);
    loadPayoutData(); // Refresh to get updated summary
  };

  const handleCancelPayout = async (payoutId: string) => {
    const confirmed = window.confirm('Are you sure you want to cancel this payout request?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/partner/payouts/${payoutId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        setPayouts(prev => 
          prev.map(payout => 
            payout.id === payoutId 
              ? { ...payout, status: 'cancelled' as const }
              : payout
          )
        );
        toast.success('Payout request cancelled');
      } else {
        throw new Error('Failed to cancel payout');
      }
    } catch (error) {
      console.error('Error cancelling payout:', error);
      toast.error('Failed to cancel payout request');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'paypal':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'bank_transfer':
        return <Building className="h-4 w-4 text-green-600" />;
      case 'crypto':
        return <Bitcoin className="h-4 w-4 text-orange-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'paypal':
        return 'PayPal';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'crypto':
        return 'Cryptocurrency';
      default:
        return method;
    }
  };

  // Filter and sort payouts
  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = searchQuery === '' || 
      payout.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.batch_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return b.amount - a.amount;
      case 'status':
        return a.status.localeCompare(b.status);
      case 'processed_at':
        if (!a.processed_at && !b.processed_at) return 0;
        if (!a.processed_at) return 1;
        if (!b.processed_at) return -1;
        return new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime();
      case 'created_at':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payout Management</h1>
              <p className="text-gray-600">
                Manage your payout requests and view payment history
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
                onClick={() => setShowRequestForm(true)}
                className="flex items-center space-x-2"
                disabled={!payoutSummary || payoutSummary.available_balance < payoutSummary.minimum_payout}
              >
                <Plus className="h-4 w-4" />
                <span>Request Payout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-8">
            {/* Summary skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
                      </div>
                      <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Table skeleton */}
            <Card>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Payout Summary */}
            {payoutSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Available Balance</p>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(payoutSummary.available_balance)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Ready for payout
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(payoutSummary.pending_amount)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Being processed
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Paid</p>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(payoutSummary.total_paid)}
                        </div>
                        <p className="text-sm text-gray-500">
                          All time
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Next Payout</p>
                        <div className="text-lg font-bold text-gray-900">
                          {new Date(payoutSummary.next_payout_date).toLocaleDateString()}
                        </div>
                        <p className="text-sm text-gray-500">
                          Scheduled date
                        </p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="history" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history">Payout History</TabsTrigger>
                <TabsTrigger value="request">Request Payout</TabsTrigger>
              </TabsList>

              {/* Payout History Tab */}
              <TabsContent value="history" className="space-y-6">
                {/* Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Search */}
                      <div className="flex-1 max-w-md">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search by ID, transaction, or batch..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="flex items-center space-x-3">
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PayoutStatus)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="created_at">Newest First</SelectItem>
                            <SelectItem value="amount">Highest Amount</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="processed_at">Recently Processed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payouts Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Payout History</CardTitle>
                      <Badge variant="outline">
                        {filteredPayouts.length} payouts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredPayouts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Method
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Transaction ID
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPayouts.map((payout) => (
                              <tr key={payout.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 text-sm text-gray-900">
                                  <div>
                                    <div className="font-medium">
                                      {new Date(payout.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(payout.created_at).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div>
                                    <div className="text-sm font-bold text-gray-900">
                                      {formatCurrency(payout.amount)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Net: {formatCurrency(payout.net_amount)}
                                    </div>
                                    {payout.fee_amount > 0 && (
                                      <div className="text-xs text-red-600">
                                        Fee: -{formatCurrency(payout.fee_amount)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center space-x-2">
                                    {getPaymentMethodIcon(payout.payment_method)}
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {getPaymentMethodLabel(payout.payment_method)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {payout.payment_method === 'paypal' && payout.payment_details.paypal_email}
                                        {payout.payment_method === 'bank_transfer' && payout.payment_details.bank_name}
                                        {payout.payment_method === 'crypto' && payout.payment_details.crypto_currency}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center space-x-2">
                                    {getStatusIcon(payout.status)}
                                    <Badge className={getStatusColor(payout.status)}>
                                      {payout.status}
                                    </Badge>
                                  </div>
                                  {payout.status === 'failed' && payout.failure_reason && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {payout.failure_reason}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  {payout.transaction_id ? (
                                    <div className="font-mono text-xs text-gray-900">
                                      {payout.transaction_id}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">Pending</span>
                                  )}
                                  {payout.batch_id && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Batch: {payout.batch_id}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    {payout.status === 'pending' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCancelPayout(payout.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => router.push(`/partner/payouts/${payout.id}`)}
                                      className="h-8 w-8"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        {payouts.length === 0 ? (
                          <>
                            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payouts yet</h3>
                            <p className="text-gray-600 mb-6">
                              Request your first payout when you reach the minimum threshold
                            </p>
                            <Button 
                              onClick={() => setShowRequestForm(true)}
                              disabled={!payoutSummary || payoutSummary.available_balance < payoutSummary.minimum_payout}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Request Payout
                            </Button>
                          </>
                        ) : (
                          <>
                            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payouts found</h3>
                            <p className="text-gray-600 mb-4">
                              No payouts match your current search and filter criteria
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                              }}
                            >
                              Clear Filters
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Request Payout Tab */}
              <TabsContent value="request">
                {payoutSummary && (
                  <PayoutRequest
                    availableAmount={payoutSummary.available_balance}
                    minimumAmount={payoutSummary.minimum_payout}
                    onRequestSubmitted={handlePayoutRequest}
                    pendingRequests={payouts.filter(p => p.status === 'pending').map(p => ({
                      id: p.id,
                      amount: p.amount,
                      payment_method: p.payment_method,
                      status: p.status === 'cancelled' ? 'failed' : p.status as 'pending' | 'processing' | 'completed' | 'failed',
                      created_at: p.created_at,
                      processed_at: p.processed_at,
                      notes: p.notes
                    }))}
                  />
                )}
              </TabsContent>
            </Tabs>

            {/* Payout Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Payout Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Payment Schedule</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processing:</span>
                        <span>Monthly on 1st</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Minimum:</span>
                        <span>{formatCurrency(payoutSummary?.minimum_payout || 50)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Next Date:</span>
                        <span>{new Date(payoutSummary?.next_payout_date || '').toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Processing Times</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-600">PayPal:</span>
                        </div>
                        <span>1-2 business days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-green-600" />
                          <span className="text-gray-600">Bank:</span>
                        </div>
                        <span>3-5 business days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Bitcoin className="h-4 w-4 text-orange-600" />
                          <span className="text-gray-600">Crypto:</span>
                        </div>
                        <span>Within 24 hours</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Processing Fees</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">PayPal:</span>
                        <span>3% of amount</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bank Transfer:</span>
                        <span>$5 flat fee</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cryptocurrency:</span>
                        <span>1% of amount</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Important Notes</h4>
                      <div className="text-sm text-blue-700 mt-1 space-y-1">
                        <p>• All payouts are subject to verification and may take additional time</p>
                        <p>• Failed payouts will be automatically retried or returned to your balance</p>
                        <p>• You can only have one pending payout request at a time</p>
                        <p>• Processing fees are deducted from the payout amount</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
