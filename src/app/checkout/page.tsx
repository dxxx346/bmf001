'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { ShippingInfo } from '@/components/checkout/ShippingInfo';
import { PaymentMethod } from '@/components/checkout/PaymentMethod';
import { OrderReview } from '@/components/checkout/OrderReview';
import { useCart } from '@/hooks/useCart';
import { useAuthContext } from '@/contexts/AuthContext';
import { BillingAddress } from '@/types/payment';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export type CheckoutStep = 'shipping' | 'payment' | 'review';

export interface CheckoutData {
  shippingInfo: BillingAddress;
  paymentMethod: {
    provider: 'stripe' | 'yookassa' | 'coingate';
    type: 'card' | 'bank_transfer' | 'crypto';
    details?: any;
  };
  orderNotes?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const { items, summary, hasItems, validateCart, prepareForCheckout } = useCart();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<Partial<CheckoutData>>({});

  // Redirect if not authenticated or cart is empty
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please sign in to continue with checkout');
      router.push('/auth/login?redirect=/checkout');
      return;
    }

    if (!hasItems) {
      toast.error('Your cart is empty');
      router.push('/cart');
      return;
    }
  }, [isAuthenticated, hasItems, router]);

  // Validate cart on page load
  useEffect(() => {
    const validateCartOnLoad = async () => {
      if (hasItems) {
        const validation = await validateCart();
        if (!validation.isValid) {
          toast.error(`Cart validation failed: ${validation.errors.join(', ')}`);
          router.push('/cart');
        }
      }
    };

    validateCartOnLoad();
  }, [hasItems, validateCart, router]);

  const steps: { key: CheckoutStep; title: string; description: string }[] = [
    {
      key: 'shipping',
      title: 'Shipping Information',
      description: 'Enter your billing details',
    },
    {
      key: 'payment',
      title: 'Payment Method',
      description: 'Choose your payment option',
    },
    {
      key: 'review',
      title: 'Review & Confirm',
      description: 'Review your order',
    },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  // Handle step navigation
  const goToStep = (step: CheckoutStep) => {
    setCurrentStep(step);
  };

  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex(step => step.key === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    }
  };

  const goToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.key === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
    }
  };

  // Handle shipping info submission
  const handleShippingSubmit = (shippingInfo: BillingAddress) => {
    setCheckoutData(prev => ({ ...prev, shippingInfo }));
    goToNextStep();
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (paymentMethod: CheckoutData['paymentMethod']) => {
    setCheckoutData(prev => ({ ...prev, paymentMethod }));
    goToNextStep();
  };

  // Handle final order submission
  const handleOrderSubmit = async (orderNotes?: string) => {
    if (!checkoutData.shippingInfo || !checkoutData.paymentMethod) {
      toast.error('Please complete all checkout steps');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare checkout data
      const checkoutPayload = await prepareForCheckout();
      if (!checkoutPayload) {
        throw new Error('Failed to prepare checkout data');
      }

      // Create payment intent
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: summary.total,
          currency: 'USD',
          provider: checkoutData.paymentMethod.provider,
          payment_method_type: checkoutData.paymentMethod.type,
          billing_address: checkoutData.shippingInfo,
          cart_items: items.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.selectedVariant?.price || item.product.sale_price || item.product.price,
          })),
          order_notes: orderNotes,
          metadata: {
            checkout_session_id: Date.now().toString(),
            user_id: user?.id,
          },
        }),
      });

      const paymentData = await response.json();

      if (!response.ok || !paymentData.success) {
        throw new Error(paymentData.error || 'Payment creation failed');
      }

      // Handle different payment providers
      if (checkoutData.paymentMethod.provider === 'stripe') {
        // Redirect to Stripe Checkout
        if (paymentData.payment_data?.checkout_url) {
          window.location.href = paymentData.payment_data.checkout_url;
        } else {
          throw new Error('No checkout URL received from Stripe');
        }
      } else if (checkoutData.paymentMethod.provider === 'yookassa') {
        // Redirect to YooKassa
        if (paymentData.payment_data?.confirmation_url) {
          window.location.href = paymentData.payment_data.confirmation_url;
        } else {
          throw new Error('No confirmation URL received from YooKassa');
        }
      } else if (checkoutData.paymentMethod.provider === 'coingate') {
        // Redirect to CoinGate
        if (paymentData.payment_data?.payment_url) {
          window.location.href = paymentData.payment_data.payment_url;
        } else {
          throw new Error('No payment URL received from CoinGate');
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading if not ready
  if (!isAuthenticated || !hasItems) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
                <p className="text-sm text-gray-600">
                  Complete your purchase securely
                </p>
              </div>
            </div>
            
            {/* Security indicators */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Shield className="h-4 w-4 text-green-600" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center space-x-1">
                <Lock className="h-4 w-4 text-green-600" />
                <span>256-bit Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <CheckoutSteps
            steps={steps}
            currentStep={currentStep}
            onStepClick={goToStep}
            completedSteps={steps.slice(0, currentStepIndex).map(s => s.key)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {currentStep === 'shipping' && (
                  <ShippingInfo
                    initialData={checkoutData.shippingInfo}
                    onSubmit={handleShippingSubmit}
                    isLoading={isLoading}
                  />
                )}
                
                {currentStep === 'payment' && (
                  <PaymentMethod
                    amount={summary.total}
                    currency="USD"
                    billingAddress={checkoutData.shippingInfo}
                    onSelect={handlePaymentMethodSelect}
                    onBack={goToPreviousStep}
                    isLoading={isLoading}
                  />
                )}
                
                {currentStep === 'review' && (
                  <OrderReview
                    cartItems={items}
                    shippingInfo={checkoutData.shippingInfo!}
                    paymentMethod={checkoutData.paymentMethod!}
                    summary={summary}
                    onSubmit={handleOrderSubmit}
                    onBack={goToPreviousStep}
                    isLoading={isLoading}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                  
                  {/* Items */}
                  <div className="space-y-3 mb-4">
                    {items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-gray-100 rounded-md overflow-hidden">
                          {item.product.thumbnail_url ? (
                            <img
                              src={item.product.thumbnail_url}
                              alt={item.product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.product.title}
                          </p>
                          <p className="text-xs text-gray-600">
                            Qty: {item.quantity} × ${(item.selectedVariant?.price || item.product.sale_price || item.product.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-sm text-gray-600 text-center">
                        +{items.length - 3} more items
                      </p>
                    )}
                  </div>

                  {/* Price breakdown */}
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal ({summary.itemCount} items)</span>
                      <span>${summary.subtotal.toFixed(2)}</span>
                    </div>
                    
                    {summary.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-${summary.discount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span>${summary.tax.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span>{summary.shipping === 0 ? 'FREE' : `$${summary.shipping.toFixed(2)}`}</span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between">
                        <span className="text-base font-semibold">Total</span>
                        <span className="text-lg font-bold">${summary.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security & Support Info */}
              <Card className="mt-6">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-3">Secure Checkout</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span>256-bit SSL encryption</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span>PCI DSS compliant</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span>30-day money-back guarantee</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span>24/7 customer support</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
