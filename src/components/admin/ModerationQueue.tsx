'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Flag,
  Eye,
  MoreVertical,
  Calendar,
  User,
  DollarSign,
  Package,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { ProductModeration } from '@/services/admin.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

interface ModerationQueueProps {
  products: ProductModeration[];
  loading: boolean;
  onModerationAction: (productId: string, action: string, notes?: string) => Promise<void>;
  onRefresh: () => void;
  onSearch: (query: string) => void;
  onFilter: (filters: ModerationFilters) => void;
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface ModerationFilters {
  status?: string;
  flagged?: boolean;
  search?: string;
}

interface ModerationModalProps {
  product: ProductModeration | null;
  action: 'approve' | 'reject' | 'flag' | 'view' | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  loading: boolean;
}

function ModerationModal({ product, action, isOpen, onClose, onConfirm, loading }: ModerationModalProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = async () => {
    await onConfirm(notes);
    setNotes('');
    onClose();
  };

  const getActionTitle = () => {
    switch (action) {
      case 'approve': return 'Approve Product';
      case 'reject': return 'Reject Product';
      case 'flag': return 'Flag Product';
      case 'view': return 'Product Details';
      default: return '';
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case 'approve': return 'This will make the product visible to buyers.';
      case 'reject': return 'This will hide the product and notify the seller.';
      case 'flag': return 'This will flag the product for further review.';
      case 'view': return 'View detailed information about this product.';
      default: return '';
    }
  };

  if (!product || !action) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getActionTitle()}
      description={getActionDescription()}
    >
      <div className="space-y-4">
        {/* Product Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-900">{product.title}</h3>
              <p className="text-sm text-gray-600">by {product.seller_name}</p>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                ${product.price}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(product.created_at).toLocaleDateString()}
              </div>
              {product.reports_count > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {product.reports_count} reports
                </div>
              )}
            </div>

            <div>
              <Badge className={cn(
                "capitalize",
                product.status === 'pending' && "bg-yellow-100 text-yellow-800",
                product.status === 'approved' && "bg-green-100 text-green-800",
                product.status === 'rejected' && "bg-red-100 text-red-800",
                product.status === 'flagged' && "bg-orange-100 text-orange-800"
              )}>
                {product.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Flagged Reasons */}
        {product.flagged_reasons.length > 0 && (
          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-orange-900 mb-2">Flagged for:</h4>
            <ul className="text-sm text-orange-800 space-y-1">
              {product.flagged_reasons.map((reason, index) => (
                <li key={index}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Moderation Notes */}
        {product.moderation_notes && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Previous Notes:</h4>
            <p className="text-sm text-blue-800">{product.moderation_notes}</p>
          </div>
        )}

        {action !== 'view' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moderation Notes {action === 'reject' ? '(Required)' : '(Optional)'}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Add notes for ${action} action...`}
              rows={3}
              required={action === 'reject'}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {action === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {action !== 'view' && (
            <Button
              variant={action === 'reject' ? 'danger' : action === 'approve' ? 'success' : 'warning'}
              onClick={handleConfirm}
              disabled={loading || (action === 'reject' && !notes.trim())}
            >
              {loading ? <LoadingSpinner size="sm" /> : getActionTitle()}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ModerationQueue({
  products,
  loading,
  onModerationAction,
  onRefresh,
  onSearch,
  onFilter,
  totalProducts,
  currentPage,
  totalPages,
  onPageChange,
}: ModerationQueueProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [moderationModal, setModerationModal] = useState<{
    product: ProductModeration | null;
    action: 'approve' | 'reject' | 'flag' | 'view' | null;
  }>({ product: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ModerationFilters>({});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleFilterChange = (key: keyof ModerationFilters, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const handleModerationAction = async (product: ProductModeration, action: string) => {
    setModerationModal({ product, action: action as any });
  };

  const handleActionConfirm = async (notes?: string) => {
    if (!moderationModal.product || !moderationModal.action) return;

    setActionLoading(true);
    try {
      await onModerationAction(moderationModal.product.id, moderationModal.action, notes);
      setModerationModal({ product: null, action: null });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'flagged': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Moderation</h2>
          <p className="text-gray-600">Review and moderate product listings</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by product title or seller..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
            
            <div className="flex gap-2">
              <Select
                value={filters.status || ''}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.flagged ? 'true' : ''}
                onValueChange={(value) => handleFilterChange('flagged', value === 'true')}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Products</SelectItem>
                  <SelectItem value="true">Flagged Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="success">
                  Bulk Approve
                </Button>
                <Button size="sm" variant="danger">
                  Bulk Reject
                </Button>
                <Button size="sm" variant="warning">
                  Bulk Flag
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === products.length && products.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Seller</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Reports</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Submitted</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <div className="font-medium text-gray-900 truncate">
                          {product.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          ID: {product.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {product.seller_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900">{product.seller_name}</span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatCurrency(product.price)}
                    </td>
                    
                    <td className="px-4 py-4">
                      <Badge className={cn("capitalize", getStatusBadgeColor(product.status))}>
                        {product.status}
                      </Badge>
                    </td>
                    
                    <td className="px-4 py-4">
                      {product.reports_count > 0 ? (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">{product.reports_count}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">None</span>
                      )}
                    </td>
                    
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(product.created_at)}
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleModerationAction(product, 'view')}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {product.status !== 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleModerationAction(product, 'approve')}
                            className="text-green-600 hover:text-green-700"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {product.status !== 'rejected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleModerationAction(product, 'reject')}
                            className="text-red-600 hover:text-red-700"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleModerationAction(product, 'flag')}
                          className="text-orange-600 hover:text-orange-700"
                          title="Flag"
                        >
                          <Flag className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalProducts)} of {totalProducts} products
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Moderation Modal */}
      <ModerationModal
        product={moderationModal.product}
        action={moderationModal.action}
        isOpen={!!moderationModal.product && !!moderationModal.action}
        onClose={() => setModerationModal({ product: null, action: null })}
        onConfirm={handleActionConfirm}
        loading={actionLoading}
      />
    </div>
  );
}

export default ModerationQueue;
