'use client';

import { useState } from 'react';
import { 
  Package, 
  Calendar, 
  DollarSign, 
  Download,
  Eye,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Star,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown';
import { DownloadButton, BulkDownloadButton, DownloadableFile } from './DownloadButton';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  product_thumbnail?: string;
  quantity: number;
  price: number;
  total: number;
  seller_name: string;
  shop_name: string;
  category: string;
  files: DownloadableFile[];
  can_review: boolean;
  review_id?: string;
  rating?: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  total_amount: number;
  currency: string;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  completed_at?: string;
  items: OrderItem[];
  billing_address?: {
    name: string;
    email: string;
    country: string;
  };
  download_expires_at?: string;
  notes?: string;
}

interface OrderCardProps {
  order: Order;
  onViewDetails?: (orderId: string) => void;
  onDownloadInvoice?: (orderId: string) => void;
  onLeaveReview?: (productId: string, orderId: string) => void;
  onContactSupport?: (orderId: string) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showDownloads?: boolean;
}

export function OrderCard({
  order,
  onViewDetails,
  onDownloadInvoice,
  onLeaveReview,
  onContactSupport,
  className,
  variant = 'default',
  showDownloads = true,
}: OrderCardProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
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
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
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
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'refunded':
        return <AlertTriangle className="h-4 w-4 text-purple-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      case 'refunded':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getTotalDownloadableFiles = () => {
    return order.items.reduce((total, item) => total + item.files.length, 0);
  };

  const getAvailableDownloads = () => {
    return order.items.reduce((total, item) => {
      return total + item.files.filter(file => file.is_available).length;
    }, 0);
  };

  // Compact variant for lists
  if (variant === 'compact') {
    return (
      <Card className={cn('hover:shadow-md transition-shadow', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">#{order.order_number}</h3>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''} • 
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {formatCurrency(order.total_amount, order.currency)}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                {showDownloads && getTotalDownloadableFiles() > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails?.(order.id)}
                    className="flex items-center space-x-1"
                  >
                    <Download className="h-3 w-3" />
                    <span>{getAvailableDownloads()}</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails?.(order.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Order #{order.order_number}
                </h3>
                <Badge className={getStatusColor(order.status)}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(order.status)}
                    <span>{order.status}</span>
                  </div>
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3" />
                  <span className={getPaymentStatusColor(order.payment_status)}>
                    {order.payment_status}
                  </span>
                </span>
                {order.completed_at && (
                  <span>Completed: {new Date(order.completed_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(order.total_amount, order.currency)}
              </div>
              <div className="text-sm text-gray-500">
                {order.payment_method}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(order.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownloadInvoice?.(order.id)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download Invoice
                </DropdownMenuItem>
                {order.status === 'completed' && (
                  <DropdownMenuItem onClick={() => onContactSupport?.(order.id)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Support
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-white rounded-lg overflow-hidden">
                      {item.product_thumbnail ? (
                        <img
                          src={item.product_thumbnail}
                          alt={item.product_title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.product_title}</h4>
                      <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                        <span>{item.shop_name}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                        {item.quantity > 1 && (
                          <>
                            <span>•</span>
                            <span>Qty: {item.quantity}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(item.total)}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-sm text-gray-500">
                          {formatCurrency(item.price)} each
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Review button */}
                      {item.can_review && !item.review_id && order.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onLeaveReview?.(item.product_id, order.id)}
                          className="flex items-center space-x-1"
                        >
                          <Star className="h-3 w-3" />
                          <span>Review</span>
                        </Button>
                      )}
                      
                      {/* Show rating if reviewed */}
                      {item.rating && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-600">{item.rating}</span>
                        </div>
                      )}
                      
                      {/* Downloads */}
                      {showDownloads && item.files.length > 0 && order.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleItemExpansion(item.id)}
                          className="flex items-center space-x-1"
                        >
                          <Download className="h-3 w-3" />
                          <span>{item.files.length}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Expanded Downloads Section */}
              {expandedItems.has(item.id) && showDownloads && item.files.length > 0 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900">
                      Digital Downloads ({item.files.length} files)
                    </h5>
                    
                    {item.files.length > 1 && (
                      <BulkDownloadButton
                        files={item.files}
                        orderId={order.id}
                        productId={item.product_id}
                        onDownloadComplete={(results) => {
                          if (results.success > 0) {
                            toast.success(`Downloaded ${results.success} files`);
                          }
                        }}
                      />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {item.files.map((file) => (
                      <DownloadButton
                        key={file.id}
                        file={file}
                        orderId={order.id}
                        productId={item.product_id}
                        variant="compact"
                        showProgress={true}
                        showFileInfo={true}
                        onDownloadComplete={(fileId, success) => {
                          if (success) {
                            // Update download count optimistically
                            // The actual count will be updated by the server
                          }
                        }}
                      />
                    ))}
                  </div>
                  
                  {order.download_expires_at && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-yellow-700">
                          Downloads expire on {new Date(order.download_expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Order Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Payment:</span>
            <span className={cn('font-medium', getPaymentStatusColor(order.payment_status))}>
              {order.payment_status}
            </span>
            <span>via {order.payment_method}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {onDownloadInvoice && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownloadInvoice(order.id)}
                className="flex items-center space-x-1"
              >
                <FileText className="h-3 w-3" />
                <span>Invoice</span>
              </Button>
            )}
            
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(order.id)}
                className="flex items-center space-x-1"
              >
                <Eye className="h-3 w-3" />
                <span>Details</span>
              </Button>
            )}
            
            {order.status === 'completed' && showDownloads && getTotalDownloadableFiles() > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  // Expand all items to show downloads
                  setExpandedItems(new Set(order.items.map(item => item.id)));
                }}
                className="flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>Downloads ({getAvailableDownloads()})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Order Notes */}
        {order.notes && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> {order.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified order summary for dashboard widgets
interface OrderSummaryProps {
  order: Order;
  onClick?: (orderId: string) => void;
  className?: string;
}

export function OrderSummary({ order, onClick, className }: OrderSummaryProps) {
  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className={cn(
        'flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={() => onClick?.(order.id)}
    >
      <div className="flex items-center space-x-3">
        <Package className="h-5 w-5 text-gray-400" />
        <div>
          <p className="font-medium text-gray-900">#{order.order_number}</p>
          <p className="text-sm text-gray-600">
            {order.items.length} item{order.items.length !== 1 ? 's' : ''} • 
            {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="font-semibold text-gray-900">
            {formatCurrency(order.total_amount, order.currency)}
          </div>
          <Badge className={`${getStatusColor(order.status)} text-xs`}>
            {order.status}
          </Badge>
        </div>
        
        {onClick && (
          <Eye className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </div>
  );
}

// Order status timeline component
interface OrderTimelineProps {
  order: Order;
  className?: string;
}

export function OrderTimeline({ order, className }: OrderTimelineProps) {
  const timelineEvents = [
    {
      status: 'pending',
      label: 'Order Placed',
      date: order.created_at,
      completed: true,
    },
    {
      status: 'processing',
      label: 'Payment Processing',
      date: order.created_at,
      completed: order.payment_status === 'completed',
    },
    {
      status: 'completed',
      label: 'Order Completed',
      date: order.completed_at,
      completed: order.status === 'completed',
    },
  ];

  return (
    <div className={cn('', className)}>
      <div className="space-y-4">
        {timelineEvents.map((event, index) => (
          <div key={event.status} className="flex items-center space-x-4">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center border-2',
              event.completed 
                ? 'bg-green-100 border-green-500 text-green-600'
                : 'bg-gray-100 border-gray-300 text-gray-400'
            )}>
              {event.completed ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </div>
            
            <div className="flex-1">
              <p className={cn(
                'font-medium',
                event.completed ? 'text-gray-900' : 'text-gray-500'
              )}>
                {event.label}
              </p>
              {event.date && (
                <p className="text-sm text-gray-500">
                  {new Date(event.date).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
