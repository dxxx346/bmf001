'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  XCircle, 
  ArrowLeft, 
  RefreshCw, 
  ShoppingCart,
  Home,
  CreditCard,
  AlertTriangle,
  Clock,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CancelledOrderData {
  id?: string;
  payment_intent_id?: string;
  amount?: number;
  currency?: string;
  status: string;
  reason?: string;
  created_at?: string;
  items?: Array<{
    id: string;
    product_title: string;
    quantity: number;
    price: number;
  }>;
}

export default function CheckoutCancelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const { items, summary, hasItems } = useCart();

  const [orderData, setOrderData] = useState<CancelledOrderData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const paymentIntentId = searchParams.get('payment_intent');
  const sessionId = searchParams.get('session_id');
  const reason = searchParams.get('reason');

  useEffect(() => {
    const fetchCancelledOrderData = async () => {
      if (!paymentIntentId && !sessionId) {
        // No payment data, just show general cancellation message
        setOrderData({
          status: 'cancelled',
          reason: reason || 'Payment was cancelled by user',
        });
        return;
      }

      try {
        setIsLoading(true);

        const endpoint = '/api/orders/cancelled';
        const params = new URLSearchParams();
        
        if (paymentIntentId) params.set('payment_intent', paymentIntentId);
        if (sessionId) params.set('session_id', sessionId);

        const response = await fetch(`${endpoint}?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data?.order) {
          setOrderData(data.order);
        } else {
          // Fallback to generic cancellation data
          setOrderData({
            status: 'cancelled',
            reason: data?.reason || reason || 'Payment was cancelled',
          });
        }
      } catch (error) {
        console.error('Error fetching cancelled order data:', error);
        setOrderData({
          status: 'cancelled',
          reason: 'Payment was cancelled',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCancelledOrderData();
  }, [paymentIntentId, sessionId, reason]);

  const handleRetryCheckout = () => {
    if (!hasItems) {
      toast.error('Your cart is empty');
      router.push('/products');
      return;
    }
    router.push('/checkout');
  };

  const handleBackToCart = () => {
    router.push('/cart');
  };

  const getCancellationReason = () => {
    if (!orderData?.reason) return 'Payment was cancelled';

    const reason = orderData.reason.toLowerCase();
    
    if (reason.includes('user') || reason.includes('cancelled')) {
      return 'You cancelled the payment process';
    }
    if (reason.includes('timeout') || reason.includes('expired')) {
      return 'Payment session expired';
    }
    if (reason.includes('decline') || reason.includes('failed')) {
      return 'Payment was declined by your bank';
    }
    if (reason.includes('insufficient')) {
      return 'Insufficient funds';
    }
    if (reason.includes('network') || reason.includes('connection')) {
      return 'Network connection issue';
    }
    
    return orderData.reason;
  };

  const getReasonIcon = () => {
    if (!orderData?.reason) return <XCircle className="h-10 w-10 text-red-500" />;

    const reason = orderData.reason.toLowerCase();
    
    if (reason.includes('timeout') || reason.includes('expired')) {
      return <Clock className="h-10 w-10 text-orange-500" />;
    }
    if (reason.includes('decline') || reason.includes('failed')) {
      return <CreditCard className="h-10 w-10 text-red-500" />;
    }
    
    return <XCircle className="h-10 w-10 text-red-500" />;
  };

  const getReasonColor = () => {
    if (!orderData?.reason) return 'text-red-600';

    const reason = orderData.reason.toLowerCase();
    
    if (reason.includes('timeout') || reason.includes('expired')) {
      return 'text-orange-600';
    }
    
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {getReasonIcon()}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Cancelled
            </h1>
            <p className={cn('text-lg', getReasonColor())}>
              {getCancellationReason()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cancellation Details */}
            {orderData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <span>What Happened?</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge variant="danger">
                        {orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
                      </Badge>
                    </div>
                    
                    {orderData.payment_intent_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Payment ID</span>
                        <span className="font-mono text-sm">{orderData.payment_intent_id}</span>
                      </div>
                    )}
                    
                    {orderData.created_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Attempted at</span>
                        <span className="text-sm">
                          {new Date(orderData.created_at).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-900">
                            Don&apos;t worry!
                          </h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            No charges were made to your payment method. Your cart items are still saved and you can try again.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cart Summary */}
            {hasItems && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Your Cart ({summary?.itemCount || 0} items)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gray-100 rounded-lg overflow-hidden">
                          {item.product?.thumbnail_url ? (
                            <img
                              src={item.product.thumbnail_url}
                              alt={item.product?.title || 'Product'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.product?.title || 'Product'}
                          </p>
                          <p className="text-xs text-gray-600">
                            Qty: {item.quantity} × ${(item.selectedVariant?.price || item.product?.sale_price || item.product?.price || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {items.length > 3 && (
                      <p className="text-sm text-gray-600 text-center">
                        +{items.length - 3} more items
                      </p>
                    )}

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between">
                        <span className="font-medium">Total</span>
                        <span className="font-bold">${(summary?.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Common Issues & Solutions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5" />
                  <span>Common Issues & Solutions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Payment Declined</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Check with your bank or try a different payment method. Sometimes international transactions are blocked by default.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900">Session Expired</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      The checkout session timed out. Simply start the checkout process again - your cart items are still saved.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900">Browser Issues</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Try disabling ad blockers, clearing cache, or using a different browser. Some privacy extensions can interfere with payment processing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>What&apos;s Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasItems && (
                  <Button
                    onClick={handleRetryCheckout}
                    className="w-full justify-start"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Payment Again
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={handleBackToCart}
                  className="w-full justify-start"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Review Cart
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/products')}
                  className="w-full justify-start"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="w-full justify-start"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Try Different Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span>Credit/Debit Cards</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span>YooKassa (for RU users)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span>Cryptocurrency</span>
                  </div>
                </div>
                
                {hasItems && (
                  <Button
                    variant="outline"
                    onClick={handleRetryCheckout}
                    className="w-full mt-4"
                  >
                    Choose Payment Method
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Need Help?
                </h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>If you continue to experience issues:</p>
                  <div className="space-y-1">
                    <p>• Email: support@marketplace.com</p>
                    <p>• Live Chat: Available 24/7</p>
                    <p>• Phone: +1 (555) 123-4567</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('mailto:support@marketplace.com')}
                  className="w-full mt-3"
                >
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
