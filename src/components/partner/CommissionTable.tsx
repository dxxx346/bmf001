'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  ExternalLink,
  Calendar,
  DollarSign,
  Package,
  User,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown';
import { DateRangePicker, DateRange } from '@/components/analytics/DateRangePicker';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface CommissionTransaction {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  product_price: number;
  customer_name: string;
  customer_email: string;
  referral_code: string;
  referral_link_name: string;
  commission_rate: number;
  commission_amount: number;
  order_total: number;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  created_at: string;
  confirmed_at?: string;
  paid_at?: string;
  payout_batch_id?: string;
}

interface CommissionTableProps {
  transactions: CommissionTransaction[];
  isLoading?: boolean;
  className?: string;
  onExport?: (transactions: CommissionTransaction[]) => void;
  showFilters?: boolean;
  pageSize?: number;
}

type SortField = 'created_at' | 'commission_amount' | 'product_title' | 'customer_name' | 'status' | 'confirmed_at' | 'paid_at';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'paid' | 'cancelled';

export function CommissionTable({
  transactions,
  isLoading = false,
  className,
  onExport,
  showFilters = true,
  pageSize = 20,
}: CommissionTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filter and sort transactions
  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(transaction =>
        transaction.product_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.referral_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.order_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'created_at' || sortField === 'confirmed_at' || sortField === 'paid_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [transactions, searchQuery, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedTransactions.length / pageSize);
  const paginatedTransactions = processedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary calculations
  const summary = useMemo(() => {
    return {
      totalCommissions: processedTransactions.reduce((sum, t) => sum + t.commission_amount, 0),
      pendingCommissions: processedTransactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.commission_amount, 0),
      paidCommissions: processedTransactions
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + t.commission_amount, 0),
      totalTransactions: processedTransactions.length,
    };
  }, [processedTransactions]);

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
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(new Set(paginatedTransactions.map(t => t.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(transactionId);
    } else {
      newSelected.delete(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleExport = () => {
    if (onExport) {
      const selectedData = selectedTransactions.size > 0 
        ? processedTransactions.filter(t => selectedTransactions.has(t.id))
        : processedTransactions;
      onExport(selectedData);
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </div>
    </th>
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-gray-600">Total Commissions</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(summary.totalCommissions)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-sm text-gray-600">Pending</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(summary.pendingCommissions)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">Paid</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(summary.paidCommissions)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Package className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-sm text-gray-600">Transactions</div>
                <div className="text-lg font-bold text-gray-900">
                  {summary.totalTransactions}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-3">
                <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {onExport && (
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Selected transactions actions */}
            {selectedTransactions.size > 0 && (
              <div className="mt-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span className="text-sm text-blue-900">
                  {selectedTransactions.size} transaction(s) selected
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={handleExport}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Selected</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedTransactions(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Commission Transactions</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {processedTransactions.length} transactions
              </Badge>
              <Badge variant="outline">
                {formatCurrency(summary.totalCommissions)} total
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.size === paginatedTransactions.length && paginatedTransactions.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <SortableHeader field="created_at">Date</SortableHeader>
                  <SortableHeader field="product_title">Product</SortableHeader>
                  <SortableHeader field="customer_name">Customer</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referral Link
                  </th>
                  <SortableHeader field="commission_amount">Commission</SortableHeader>
                  <SortableHeader field="status">Status</SortableHeader>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.map((transaction) => (
                  <>
                    <tr 
                      key={transaction.id} 
                      className={cn(
                        'hover:bg-gray-50 cursor-pointer',
                        expandedRow === transaction.id && 'bg-blue-50'
                      )}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(transaction.id)}
                          onChange={(e) => handleSelectTransaction(transaction.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <Package className="h-4 w-4 text-gray-400" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {transaction.product_title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(transaction.product_price)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.customer_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {transaction.customer_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.referral_link_name}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {transaction.referral_code}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-bold text-green-600">
                            {formatCurrency(transaction.commission_amount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaction.commission_rate}% of {formatCurrency(transaction.order_total)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedRow(
                              expandedRow === transaction.id ? null : transaction.id
                            )}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => window.open(`/orders/${transaction.order_id}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Order
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => window.open(`/products/${transaction.product_id}`, '_blank')}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                View Product
                              </DropdownMenuItem>
                              {transaction.status === 'pending' && (
                                <DropdownMenuItem onClick={() => requestPayoutForTransaction(transaction.id)}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Request Payout
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row Details */}
                    {expandedRow === transaction.id && (
                      <tr className="bg-blue-50">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Order ID:</span>
                                  <span className="font-mono">{transaction.order_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Order Total:</span>
                                  <span className="font-medium">{formatCurrency(transaction.order_total)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Product Price:</span>
                                  <span>{formatCurrency(transaction.product_price)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Commission Info</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Rate:</span>
                                  <span>{transaction.commission_rate}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Amount:</span>
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(transaction.commission_amount)}
                                  </span>
                                </div>
                                {transaction.payout_batch_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Payout Batch:</span>
                                    <span className="font-mono text-xs">{transaction.payout_batch_id}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Created:</span>
                                  <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                                </div>
                                {transaction.confirmed_at && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Confirmed:</span>
                                    <span>{new Date(transaction.confirmed_at).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {transaction.paid_at && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Paid:</span>
                                    <span>{new Date(transaction.paid_at).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedTransactions.length)} of {processedTransactions.length} transactions
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="text-gray-400">...</span>
                      <Button
                        variant={currentPage === totalPages ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {processedTransactions.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {transactions.length === 0 ? 'No commissions yet' : 'No transactions found'}
              </h3>
              <p className="text-gray-600">
                {transactions.length === 0 
                  ? 'Start promoting products to earn your first commission'
                  : 'No transactions match your current search and filter criteria'
                }
              </p>
              {transactions.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Compact commission table for dashboard widgets
interface CompactCommissionTableProps {
  transactions: CommissionTransaction[];
  maxRows?: number;
  className?: string;
}

export function CompactCommissionTable({
  transactions,
  maxRows = 5,
  className,
}: CompactCommissionTableProps) {
  const recentTransactions = transactions.slice(0, maxRows);
  
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
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Recent Commissions</CardTitle>
      </CardHeader>
      <CardContent>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {transaction.product_title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.referral_code} • {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    {formatCurrency(transaction.commission_amount)}
                  </div>
                  <Badge className={`${getStatusColor(transaction.status)} text-xs`}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No commissions yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to request payout for specific transaction
const requestPayoutForTransaction = async (transactionId: string) => {
  try {
    const response = await fetch('/api/partner/payouts/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_ids: [transactionId],
      }),
    });

    if (response.ok) {
      toast.success('Payout requested successfully');
    } else {
      throw new Error('Failed to request payout');
    }
  } catch (error) {
    console.error('Payout request error:', error);
    toast.error('Failed to request payout');
  }
};
