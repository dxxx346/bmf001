'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  CheckCircle, 
  Download, 
  Mail, 
  Package, 
  ArrowRight,
  Home,
  ShoppingBag,
  Clock,
  CreditCard,
  Share2,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/useCart';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface OrderData {
  id: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  items: Array<{
    id: string;
    product_id: string;
    product_title: string;
    quantity: number;
    price: number;
    download_url?: string;
  }>;
  billing_address: {
    name: string;
    email: string;
    line1: string;
    city: string;
    country: string;
  };
  payment_method: {
    provider: string;
    type: string;
  };
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const { clearCart } = useCart();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());

  const paymentIntentId = searchParams.get('payment_intent');
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setIsLoading(true);

        const endpoint = '/api/orders/success';
        const params = new URLSearchParams();
        
        if (paymentIntentId) params.set('payment_intent', paymentIntentId);
        if (sessionId) params.set('session_id', sessionId);
        if (orderId) params.set('order_id', orderId);

        const response = await fetch(`${endpoint}?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch order data');
        }

        setOrderData(data.order);
        
        // Clear cart after successful order
        clearCart();
        
        // Show success message
        toast.success('Order completed successfully!');
      } catch (error) {
        console.error('Error fetching order data:', error);
        toast.error('Failed to load order information');
        // Redirect to cart if there&apos;s an error
        router.push('/cart');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, [paymentIntentId, sessionId, orderId, router, clearCart]);

  const handleDownload = async (itemId: string, downloadUrl: string) => {
    try {
      setDownloadingItems(prev => new Set([...prev, itemId]));
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = ''; // Let the server determine the filename
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to start download');
    } finally {
      setDownloadingItems(prev => {
        const updated = new Set(prev);
        updated.delete(itemId);
        return updated;
      });
    }
  };

  const handleShareOrder = async () => {
    try {
      const shareData = {
        title: 'My Digital Purchase',
        text: `I just purchased ${orderData?.items.length} digital products!`,
        url: window.location.href,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Order link copied to clipboard');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Go Home
          </Button>
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
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Completed!
            </h1>
            <p className="text-lg text-gray-600">
              Thank you for your purchase. Your order has been processed successfully.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Order Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-medium">{orderData.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">
                      {new Date(orderData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-medium">
                      {orderData.currency.toUpperCase()} {orderData.amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <Badge variant="secondary" className="text-green-600 bg-green-100">
                      {orderData.status}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <p className="text-sm text-gray-600 mb-2">Payment Method</p>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="font-medium capitalize">
                      {orderData.payment_method.provider} ({orderData.payment_method.type})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Digital Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Your Digital Products</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderData.items.map((item, index) => (
                    <div key={item.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {item.product_title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} × ${item.price.toFixed(2)}
                          </p>
                        </div>
                        
                        {item.download_url && (
                          <Button
                            onClick={() => handleDownload(item.id, item.download_url!)}
                            disabled={downloadingItems.has(item.id)}
                            size="sm"
                            className="flex items-center space-x-2"
                          >
                            {downloadingItems.has(item.id) ? (
                              <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            <span>Download</span>
                          </Button>
                        )}
                      </div>
                      {index < orderData.items.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>

                {orderData.items.some(item => item.download_url) && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">
                          Download Information
                        </h4>
                        <div className="text-sm text-blue-700 mt-1 space-y-1">
                          <p>• Download links are valid for 30 days</p>
                          <p>• Each product can be downloaded up to 5 times</p>
                          <p>• Download links are also sent to your email</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="font-medium">{orderData.billing_address.name}</p>
                  <p className="text-gray-600">{orderData.billing_address.email}</p>
                  <p className="text-gray-600">{orderData.billing_address.line1}</p>
                  <p className="text-gray-600">
                    {orderData.billing_address.city}, {orderData.billing_address.country}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/account/orders')}
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  View All Orders
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/products')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleShareOrder}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Order
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/')}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </CardContent>
            </Card>

            {/* Email Confirmation */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Email Confirmation
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      A confirmation email with your order details and download links has been sent to{' '}
                      <span className="font-medium">{orderData.billing_address.email}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Need Help?
                </h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>If you have any questions about your order or need support:</p>
                  <div className="space-y-1">
                    <p>• Email: support@marketplace.com</p>
                    <p>• Live Chat: Available 24/7</p>
                    <p>• Phone: +1 (555) 123-4567</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review Prompt */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Star className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">
                      Love Your Purchase?
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Help other customers by leaving a review for the products you purchased.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                      onClick={() => router.push('/account/orders')}
                    >
                      Leave Reviews
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
