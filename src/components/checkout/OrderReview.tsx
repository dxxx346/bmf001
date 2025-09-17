'use client';

import { useState } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  MapPin, 
  Package, 
  Shield,
  Edit,
  Check,
  AlertTriangle,
  FileText,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CartItem } from '@/contexts/CartContext';
import { BillingAddress } from '@/types/payment';
import { cn } from '@/lib/utils';

interface OrderReviewProps {
  cartItems: CartItem[];
  shippingInfo: BillingAddress;
  paymentMethod: {
    provider: 'stripe' | 'yookassa' | 'coingate';
    type: 'card' | 'bank_transfer' | 'crypto';
    details?: any;
  };
  summary: {
    subtotal: number;
    tax: number;
    taxRate: number;
    discount: number;
    discountCode?: string;
    shipping: number;
    total: number;
    itemCount: number;
  };
  onSubmit: (orderNotes?: string) => void;
  onBack: () => void;
  isLoading?: boolean;
  className?: string;
}

export function OrderReview({
  cartItems,
  shippingInfo,
  paymentMethod,
  summary,
  onSubmit,
  onBack,
  isLoading = false,
  className,
}: OrderReviewProps) {
  const [orderNotes, setOrderNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = () => {
    if (!termsAccepted) {
      return;
    }
    onSubmit(orderNotes);
  };

  const getPaymentMethodIcon = () => {
    if (paymentMethod.type === 'card') {
      return <CreditCard className="h-4 w-4" />;
    }
    if (paymentMethod.type === 'crypto') {
      return <Package className="h-4 w-4" />;
    }
    return <Package className="h-4 w-4" />;
  };

  const getPaymentMethodName = () => {
    if (paymentMethod.provider === 'stripe') {
      return 'Credit/Debit Card (Stripe)';
    }
    if (paymentMethod.provider === 'yookassa') {
      if (paymentMethod.type === 'bank_transfer') {
        return 'YooKassa (СБП)';
      }
      return 'YooKassa (Card)';
    }
    if (paymentMethod.provider === 'coingate') {
      return `Cryptocurrency (${paymentMethod.details?.name || 'CoinGate'})`;
    }
    return 'Payment Method';
  };

  const getProcessingTime = () => {
    if (paymentMethod.provider === 'stripe' || paymentMethod.provider === 'yookassa') {
      return 'Instant';
    }
    if (paymentMethod.provider === 'coingate') {
      return '10-60 minutes';
    }
    return 'Processing time varies';
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Review Your Order
        </h2>
        <p className="text-sm text-gray-600">
          Please review your order details before completing the purchase
        </p>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Order Items ({summary.itemCount})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cartItems.map((item, index) => {
              const unitPrice = item.selectedVariant?.price || item.product.sale_price || item.product.price;
              const totalPrice = unitPrice * item.quantity;

              return (
                <div key={item.id}>
                  <div className="flex items-start space-x-4">
                    <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.product.thumbnail_url ? (
                        <img
                          src={item.product.thumbnail_url}
                          alt={item.product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 line-clamp-2">
                        {item.product.title}
                      </h4>
                      
                      {item.product.short_description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {item.product.short_description}
                        </p>
                      )}

                      {item.selectedVariant && (
                        <div className="mt-2">
                          <Badge variant="outline" size="sm">
                            {item.selectedVariant.name}
                          </Badge>
                        </div>
                      )}

                      {item.customization?.notes && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Note:</span> {item.customization.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="text-sm text-gray-600">
                          Quantity: {item.quantity} × ${unitPrice.toFixed(2)}
                        </div>
                        <div className="font-medium text-gray-900">
                          ${totalPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < cartItems.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Shipping Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Billing Information</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="font-medium text-gray-900">{shippingInfo.name}</div>
            <div className="text-sm text-gray-600">{shippingInfo.email}</div>
            {shippingInfo.phone && (
              <div className="text-sm text-gray-600">{shippingInfo.phone}</div>
            )}
            <div className="text-sm text-gray-600">
              {shippingInfo.line1}
              {shippingInfo.line2 && `, ${shippingInfo.line2}`}
            </div>
            <div className="text-sm text-gray-600">
              {shippingInfo.city}, {shippingInfo.state} {shippingInfo.postal_code}
            </div>
            <div className="text-sm text-gray-600">{shippingInfo.country}</div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getPaymentMethodIcon()}
              <span>Payment Method</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <Edit className="h-4 w-4 mr-1" />
              Change
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">
                {getPaymentMethodName()}
              </span>
              <Badge variant="outline">
                {getProcessingTime()}
              </Badge>
            </div>
            
            {paymentMethod.provider === 'coingate' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">Cryptocurrency Payment</p>
                    <p className="text-amber-700 mt-1">
                      Your order will be processed after blockchain confirmation. 
                      This typically takes 10-60 minutes depending on network congestion.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal ({summary.itemCount} items)</span>
              <span>${summary.subtotal.toFixed(2)}</span>
            </div>
            
            {summary.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount {summary.discountCode && `(${summary.discountCode})`}</span>
                <span>-${summary.discount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({(summary.taxRate * 100).toFixed(0)}%)</span>
              <span>${summary.tax.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span>{summary.shipping === 0 ? 'FREE' : `$${summary.shipping.toFixed(2)}`}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>${summary.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Order Notes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="order-notes" className="text-sm text-gray-600">
            Add any special instructions or notes for your order (optional)
          </Label>
          <Textarea
            id="order-notes"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Any special instructions for your order..."
            rows={3}
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <Label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                I agree to the{' '}
                <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                  Privacy Policy
                </a>
                . I understand that digital products are non-refundable after download.
              </Label>
            </div>
          </div>
          
          {!termsAccepted && (
            <div className="mt-3 flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Please accept the terms and conditions to continue</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900">
                Your Order is Protected
              </h4>
              <div className="text-sm text-green-700 mt-1 space-y-1">
                <p>✓ 256-bit SSL encryption for secure transactions</p>
                <p>✓ PCI DSS compliant payment processing</p>
                <p>✓ 30-day money-back guarantee</p>
                <p>✓ 24/7 customer support available</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Payment</span>
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!termsAccepted || isLoading}
          size="lg"
          className="flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>Complete Order - ${summary.total.toFixed(2)}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
