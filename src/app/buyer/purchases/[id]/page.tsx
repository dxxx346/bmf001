'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Package, 
  Download,
  FileText,
  Star,
  MessageSquare,
  RefreshCw,
  Eye,
  Heart,
  Share2,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  ShoppingBag,
  Calendar,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { OrderCard, OrderTimeline, Order } from '@/components/buyer/OrderCard';
import { DownloadButton, BulkDownloadButton } from '@/components/buyer/DownloadButton';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface OrderDetailsPageProps {
  params: Promise<{ id: string }>;
}

interface OrderDetails extends Order {
  shipping_address?: {
    name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  payment_details: {
    method: string;
    last_four?: string;
    brand?: string;
    transaction_id: string;
  };
  order_timeline: Array<{
    status: string;
    timestamp: string;
    description: string;
    details?: string;
  }>;
  support_tickets: Array<{
    id: string;
    subject: string;
    status: 'open' | 'closed' | 'resolved';
    created_at: string;
  }>;
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    const getOrderId = async () => {
      const resolvedParams = await params;
      setOrderId(resolvedParams.id);
    };
    getOrderId();
  }, [params]);

  useEffect(() => {
    if (orderId && user) {
      loadOrderDetails();
    }
  }, [orderId, user]);

  const loadOrderDetails = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/buyer/orders/${orderId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load order details');
      }

      setOrder(data.order);
    } catch (error) {
      console.error('Error loading order details:', error);
      toast.error('Failed to load order details');
      router.push('/buyer/purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;

    try {
      const response = await fetch(`/api/buyer/orders/${order.id}/invoice`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${order.order_number}.pdf`;
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

  const handleLeaveReview = (productId: string) => {
    router.push(`/products/${productId}/review?order=${order?.id}`);
  };

  const handleContactSupport = () => {
    router.push(`/support?order=${order?.id}`);
  };

  const handleReorderProduct = (productId: string) => {
    router.push(`/products/${productId}?reorder=true`);
  };

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
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-purple-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTotalDownloadableFiles = () => {
    if (!order) return 0;
    return order.items.reduce((total, item) => total + item.files.length, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order not found</h2>
          <p className="text-gray-600 mb-4">The order you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Button onClick={() => router.push('/buyer/purchases')}>
            Back to Purchases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Order #{order.order_number}
                  </h1>
                  <Badge className={getStatusColor(order.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(order.status)}
                      <span>{order.status}</span>
                    </div>
                  </Badge>
                </div>
                <p className="text-gray-600">
                  Placed on {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleDownloadInvoice}
                className="flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Download Invoice</span>
              </Button>
              
              {order.status === 'completed' && getTotalDownloadableFiles() > 0 && (
                <BulkDownloadButton
                  files={order.items.flatMap(item => item.files)}
                  orderId={order.id}
                  productId={order.items[0]?.product_id || ''}
                  onDownloadComplete={(results) => {
                    if (results.success > 0) {
                      toast.success(`Downloaded ${results.success} files`);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="items" className="space-y-6">
              <TabsList>
                <TabsTrigger value="items">Order Items</TabsTrigger>
                <TabsTrigger value="downloads">Downloads</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              {/* Order Items */}
              <TabsContent value="items">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Items ({order.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                          <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden">
                            {item.product_thumbnail ? (
                              <img
                                src={item.product_thumbnail}
                                alt={item.product_title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{item.product_title}</h4>
                            <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                              <span>by {item.seller_name}</span>
                              <span>•</span>
                              <span>{item.shop_name}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {item.category}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-3">
                              <div className="text-sm">
                                <span className="text-gray-600">Quantity: </span>
                                <span className="font-medium">{item.quantity}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Price: </span>
                                <span className="font-medium">{formatCurrency(item.price)}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Total: </span>
                                <span className="font-medium">{formatCurrency(item.total)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/products/${item.product_id}`)}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </Button>
                            
                            {item.can_review && !item.review_id && order.status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLeaveReview(item.product_id)}
                                className="flex items-center space-x-1"
                              >
                                <Star className="h-3 w-3" />
                                <span>Review</span>
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReorderProduct(item.product_id)}
                              className="flex items-center space-x-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Reorder</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Downloads */}
              <TabsContent value="downloads">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Digital Downloads</CardTitle>
                      {getTotalDownloadableFiles() > 1 && (
                        <BulkDownloadButton
                          files={order.items.flatMap(item => item.files)}
                          orderId={order.id}
                          productId={order.items[0]?.product_id || ''}
                          onDownloadComplete={(results) => {
                            if (results.success > 0) {
                              toast.success(`Downloaded ${results.success} files`);
                            }
                          }}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {order.items.some(item => item.files.length > 0) ? (
                      <div className="space-y-6">
                        {order.items.map((item) => (
                          item.files.length > 0 && (
                            <div key={item.id}>
                              <h4 className="font-medium text-gray-900 mb-3">
                                {item.product_title} ({item.files.length} files)
                              </h4>
                              <div className="grid grid-cols-1 gap-3">
                                {item.files.map((file) => (
                                  <DownloadButton
                                    key={file.id}
                                    file={file}
                                    orderId={order.id}
                                    productId={item.product_id}
                                    variant="default"
                                    showProgress={true}
                                    showFileInfo={true}
                                    onDownloadComplete={(fileId, success) => {
                                      if (success) {
                                        // Refresh order details to update download counts
                                        loadOrderDetails();
                                      }
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                        
                        {order.download_expires_at && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <div>
                                <p className="text-sm font-medium text-yellow-900">
                                  Download Expiry Notice
                                </p>
                                <p className="text-sm text-yellow-700">
                                  Your download links will expire on {new Date(order.download_expires_at).toLocaleDateString()}.
                                  Make sure to download all files before this date.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No digital downloads</h3>
                        <p className="text-gray-600">
                          This order doesn&apos;t contain any digital products with downloadable files.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Timeline */}
              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order.order_timeline.map((event, index) => (
                        <div key={index} className="flex items-start space-x-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-blue-600 rounded-full" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">{event.description}</h4>
                              <span className="text-sm text-gray-500">
                                {new Date(event.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {event.details && (
                              <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(order.total_amount, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">Total:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(order.total_amount, order.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium">{order.payment_details.method}</span>
                </div>
                {order.payment_details.brand && order.payment_details.last_four && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Card:</span>
                    <span className="font-medium">
                      {order.payment_details.brand} ****{order.payment_details.last_four}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={getStatusColor(order.payment_status)}>
                    {order.payment_status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-xs">{order.payment_details.transaction_id}</span>
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            {order.billing_address && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Billing Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="font-medium">{order.billing_address.name}</div>
                  <div className="text-gray-600">{order.billing_address.email}</div>
                  <div className="text-gray-600">{order.billing_address.country}</div>
                </CardContent>
              </Card>
            )}

            {/* Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Need Help?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleContactSupport}
                  className="w-full justify-start"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                
                {order.support_tickets && order.support_tickets.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Support Tickets</h4>
                    {order.support_tickets.map((ticket) => (
                      <div key={ticket.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{ticket.subject}</span>
                          <Badge variant="outline" className="text-xs">
                            {ticket.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/buyer/purchases')}
                  className="w-full justify-start"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  View All Orders
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/search')}
                  className="w-full justify-start"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    const shareData = {
                      title: `Order #${order.order_number}`,
                      text: `Check out my purchase from the marketplace!`,
                      url: window.location.href,
                    };
                    
                    if (navigator.share) {
                      navigator.share(shareData);
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Order link copied to clipboard');
                    }
                  }}
                  className="w-full justify-start"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
