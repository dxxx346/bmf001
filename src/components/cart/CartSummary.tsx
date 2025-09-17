'use client';

import { useState } from 'react';
import { 
  CreditCard, 
  ShoppingBag, 
  Tag, 
  Truck, 
  Shield, 
  Info,
  X,
  Check,
  AlertCircle,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CartSummaryProps {
  className?: string;
  showDiscountCode?: boolean;
  showShippingInfo?: boolean;
  showCheckoutButton?: boolean;
  onCheckout?: () => void;
  variant?: 'default' | 'compact' | 'minimal';
}

export function CartSummary({
  className,
  showDiscountCode = true,
  showShippingInfo = true,
  showCheckoutButton = true,
  onCheckout,
  variant = 'default',
}: CartSummaryProps) {
  const {
    summary,
    items,
    applyDiscount,
    removeDiscount,
    isLoading,
    prepareForCheckout,
  } = useCart();

  const [discountInput, setDiscountInput] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  // Handle discount code application
  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) {
      toast.error('Please enter a discount code');
      return;
    }

    setIsApplyingDiscount(true);
    try {
      const success = await applyDiscount(discountInput.trim());
      if (success) {
        setDiscountInput('');
      }
    } catch (error) {
      console.error('Error applying discount:', error);
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  // Handle discount removal
  const handleRemoveDiscount = () => {
    removeDiscount();
  };

  // Handle checkout
  const handleCheckout = async () => {
    try {
      const checkoutData = await prepareForCheckout();
      if (checkoutData && onCheckout) {
        onCheckout();
      }
    } catch (error) {
      console.error('Error preparing for checkout:', error);
      toast.error('Failed to prepare for checkout');
    }
  };

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Items ({summary.itemCount}):</span>
          <span className="text-sm font-medium">${summary.subtotal.toFixed(2)}</span>
        </div>
        
        {summary.discount > 0 && (
          <div className="flex items-center justify-between text-green-600">
            <span className="text-sm">Discount:</span>
            <span className="text-sm font-medium">-${summary.discount.toFixed(2)}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Tax:</span>
          <span className="text-sm font-medium">${summary.tax.toFixed(2)}</span>
        </div>
        
        {summary.shipping > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Shipping:</span>
            <span className="text-sm font-medium">${summary.shipping.toFixed(2)}</span>
          </div>
        )}
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total:</span>
          <span className="font-bold text-lg">${summary.total.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Subtotal ({summary.itemCount} items):</span>
            <span className="text-sm font-medium">${summary.subtotal.toFixed(2)}</span>
          </div>
          
          {summary.discount > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <div className="flex items-center space-x-1">
                <Tag className="h-4 w-4" />
                <span className="text-sm">Discount ({summary.discountCode}):</span>
              </div>
              <span className="text-sm font-medium">-${summary.discount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Tax:</span>
            <span className="text-sm font-medium">${summary.tax.toFixed(2)}</span>
          </div>
          
          {summary.shipping > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Truck className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Shipping:</span>
              </div>
              <span className="text-sm font-medium">${summary.shipping.toFixed(2)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg">Total:</span>
            <span className="font-bold text-xl">${summary.total.toFixed(2)}</span>
          </div>
          
          {showCheckoutButton && (
            <Button 
              onClick={handleCheckout}
              disabled={items.length === 0 || isLoading}
              className="w-full"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Proceed to Checkout
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ShoppingBag className="h-5 w-5" />
          <span>Order Summary</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Items Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Subtotal ({summary.itemCount} items):</span>
            <span className="font-medium">${summary.subtotal.toFixed(2)}</span>
          </div>
          
          {summary.discount > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4" />
                <span>Discount ({summary.discountCode}):</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveDiscount}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <span className="font-medium">-${summary.discount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Tax ({(summary.taxRate * 100).toFixed(0)}%):</span>
              <div title="Tax calculated at checkout">
                <Info className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            <span className="font-medium">${summary.tax.toFixed(2)}</span>
          </div>
          
          {/* Shipping */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Shipping:</span>
            </div>
            <div className="text-right">
              {summary.shipping === 0 ? (
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-green-600">FREE</span>
                  <Badge variant="outline" size="sm" className="text-green-600 border-green-600">
                    Over $50
                  </Badge>
                </div>
              ) : (
                <span className="font-medium">${summary.shipping.toFixed(2)}</span>
              )}
            </div>
          </div>
          
          {/* Free shipping progress */}
          {showShippingInfo && summary.shipping > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-blue-700">
                <Truck className="h-4 w-4" />
                <span className="text-sm">
                  Add ${(50 - summary.subtotal).toFixed(2)} more for FREE shipping
                </span>
              </div>
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((summary.subtotal / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Discount Code Section */}
        {showDiscountCode && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Gift className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Have a discount code?</span>
            </div>
            
            <div className="flex space-x-2">
              <Input
                placeholder="Enter discount code"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                disabled={isApplyingDiscount}
                className="flex-1"
              />
              <Button
                onClick={handleApplyDiscount}
                disabled={!discountInput.trim() || isApplyingDiscount}
                variant="outline"
              >
                {isApplyingDiscount ? (
                  <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
            
            {/* Sample discount codes */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDiscountInput('SAVE10')}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
              >
                SAVE10
              </button>
              <button
                onClick={() => setDiscountInput('WELCOME20')}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
              >
                WELCOME20
              </button>
            </div>
          </div>
        )}

        <Separator />

        {/* Total */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">Total:</span>
            <span className="font-bold text-2xl">${summary.total.toFixed(2)}</span>
          </div>
          
          {/* Savings indicator */}
          {summary.discount > 0 && (
            <div className="flex items-center justify-center space-x-1 text-green-600 bg-green-50 border border-green-200 rounded-lg p-2">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                You're saving ${summary.discount.toFixed(2)}!
              </span>
            </div>
          )}
          
          {/* Security badge */}
          <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
            <Shield className="h-4 w-4" />
            <span>Secure checkout powered by Stripe</span>
          </div>
        </div>

        {/* Checkout Button */}
        {showCheckoutButton && (
          <div className="space-y-2">
            <Button 
              onClick={handleCheckout}
              disabled={items.length === 0 || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Proceed to Checkout
            </Button>
            
            {items.length === 0 && (
              <div className="flex items-center justify-center space-x-1 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Your cart is empty</span>
              </div>
            )}
          </div>
        )}

        {/* Additional Info */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>• Digital products available for immediate download</p>
          <p>• 30-day money-back guarantee</p>
          <p>• Customer support available 24/7</p>
        </div>
      </CardContent>
    </Card>
  );
}
