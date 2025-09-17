'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  X, 
  ArrowRight, 
  Package, 
  Trash2,
  Heart,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';

interface CartDropdownProps {
  className?: string;
  trigger?: 'button' | 'icon' | 'custom';
  triggerContent?: React.ReactNode;
  showItemCount?: boolean;
  maxItems?: number;
  variant?: 'dropdown' | 'sheet';
}

export function CartDropdown({
  className,
  trigger = 'icon',
  triggerContent,
  showItemCount = true,
  maxItems = 3,
  variant = 'sheet',
}: CartDropdownProps) {
  const router = useRouter();
  const {
    items,
    savedItems,
    summary,
    isOpen,
    hasItems,
    hasSavedItems,
    openCart,
    closeCart,
    toggleCart,
  } = useCart();

  const displayItems = items.slice(0, maxItems);
  const hasMoreItems = items.length > maxItems;

  // Handle checkout
  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  // Handle view cart
  const handleViewCart = () => {
    closeCart();
    router.push('/cart');
  };

  // Render trigger button
  const renderTrigger = () => {
    if (triggerContent) {
      return triggerContent;
    }

    const cartIcon = (
      <div className="relative">
        <ShoppingCart className="h-5 w-5" />
        {showItemCount && summary.itemCount > 0 && (
          <Badge 
            variant="danger" 
            size="sm"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {summary.itemCount > 99 ? '99+' : summary.itemCount}
          </Badge>
        )}
      </div>
    );

    if (trigger === 'button') {
      return (
        <Button variant="outline" className="relative">
          {cartIcon}
          <span className="ml-2 hidden sm:inline">
            Cart {showItemCount && summary.itemCount > 0 && `(${summary.itemCount})`}
          </span>
        </Button>
      );
    }

    return (
      <Button variant="ghost" size="icon" className="relative">
        {cartIcon}
      </Button>
    );
  };

  // Render empty cart state
  const renderEmptyCart = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <ShoppingCart className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
      <p className="text-gray-600 mb-6 max-w-sm">
        Looks like you haven&apos;t added any items to your cart yet. Start shopping to fill it up!
      </p>
      <Button onClick={() => { closeCart(); router.push('/products'); }}>
        <Package className="h-4 w-4 mr-2" />
        Browse Products
      </Button>
    </div>
  );

  // Render cart content
  const renderCartContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Shopping Cart</h2>
          {summary.itemCount > 0 && (
            <Badge variant="secondary">
              {summary.itemCount} item{summary.itemCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={closeCart}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {!hasItems ? (
          renderEmptyCart()
        ) : (
          <div className="p-4 space-y-4">
            {/* Cart Items */}
            <div className="space-y-3">
              {displayItems.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  variant="compact"
                  showSaveForLater={true}
                  showRemove={true}
                  showQuantityControls={true}
                />
              ))}
            </div>

            {/* More items indicator */}
            {hasMoreItems && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    +{items.length - maxItems} more item{items.length - maxItems !== 1 ? 's' : ''} in your cart
                  </span>
                  <Button variant="link" size="sm" onClick={handleViewCart}>
                    View All
                  </Button>
                </div>
              </div>
            )}

            {/* Saved Items */}
            {hasSavedItems && (
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Heart className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    Saved for Later ({savedItems.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {savedItems.slice(0, 2).map((savedItem) => (
                    <div key={savedItem.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                      <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {savedItem.product.title}
                        </p>
                        <p className="text-xs text-gray-600">
                          ${savedItem.product.sale_price || savedItem.product.price}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs">
                        Move to Cart
                      </Button>
                    </div>
                  ))}
                  {savedItems.length > 2 && (
                    <Button variant="link" size="sm" onClick={handleViewCart} className="w-full">
                      View All Saved Items
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with Summary and Actions */}
      {hasItems && (
        <div className="border-t bg-white p-4 space-y-4">
          {/* Quick Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${summary.subtotal.toFixed(2)}</span>
            </div>
            
            {summary.discount > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>Discount:</span>
                <span className="font-medium">-${summary.discount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Tax & Shipping:</span>
              <span className="font-medium">${(summary.tax + summary.shipping).toFixed(2)}</span>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-lg">${summary.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Free shipping indicator */}
          {summary.shipping > 0 && summary.subtotal < 50 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="flex items-center space-x-2 text-blue-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">
                  Add ${(50 - summary.subtotal).toFixed(2)} more for FREE shipping!
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button onClick={handleCheckout} className="w-full" size="lg">
              Checkout
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleViewCart} 
              className="w-full"
            >
              View Cart Details
            </Button>
          </div>

          {/* Security note */}
          <p className="text-xs text-gray-500 text-center">
            Secure checkout • 30-day money-back guarantee
          </p>
        </div>
      )}
    </div>
  );

  // Render as sheet (mobile-friendly)
  if (variant === 'sheet') {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => open ? openCart() : closeCart()}>
        <SheetTrigger asChild className={className}>
          {renderTrigger()}
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-96 p-0">
          {renderCartContent()}
        </SheetContent>
      </Sheet>
    );
  }

  // Render as dropdown (desktop)
  return (
    <div className={cn('relative', className)}>
      <div onClick={toggleCart}>
        {renderTrigger()}
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeCart}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[80vh] overflow-hidden">
            {renderCartContent()}
          </div>
        </>
      )}
    </div>
  );
}

// Mini cart item component for the dropdown
function MiniCartItem({ item, onRemove }: { item: any; onRemove: (id: string) => void }) {
  const unitPrice = item.selectedVariant?.price || item.product.sale_price || item.product.price;
  const totalPrice = unitPrice * item.quantity;

  return (
    <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="h-12 w-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
        {item.product.thumbnail_url ? (
          <img
            src={item.product.thumbnail_url}
            alt={item.product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <Link 
          href={`/products/${item.product.slug || item.product.id}`}
          className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
        >
          {item.product.title}
        </Link>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
          <span className="text-sm font-medium text-gray-900">
            ${totalPrice.toFixed(2)}
          </span>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        className="h-8 w-8 text-gray-400 hover:text-red-600 flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
