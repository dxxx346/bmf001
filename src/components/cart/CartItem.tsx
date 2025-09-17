'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Minus, 
  Plus, 
  Trash2, 
  Heart, 
  Edit3,
  Package,
  Star,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/hooks/useCart';
import { CartItem as CartItemType } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CartItemProps {
  item: CartItemType;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  showSaveForLater?: boolean;
  showRemove?: boolean;
  showQuantityControls?: boolean;
  onItemUpdate?: (item: CartItemType) => void;
  onRemove?: (itemId: string) => void;
}

export function CartItem({
  item,
  className,
  variant = 'default',
  showSaveForLater = true,
  showRemove = true,
  showQuantityControls = true,
  onItemUpdate,
  onRemove,
}: CartItemProps) {
  const {
    updateItemQuantity,
    incrementQuantity,
    decrementQuantity,
    removeItemWithConfirmation,
    saveForLater,
  } = useCart();

  const [isUpdating, setIsUpdating] = useState(false);
  const [quantityInput, setQuantityInput] = useState(item.quantity.toString());
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);

  const { product, quantity, selectedVariant, customization } = item;
  
  // Calculate price (consider variant price, sale price, or regular price)
  const unitPrice = selectedVariant?.price || product.sale_price || product.price;
  const totalPrice = unitPrice * quantity;
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.price - (product.sale_price || 0)) / product.price) * 100)
    : 0;

  // Handle quantity change
  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity === quantity) return;
    
    setIsUpdating(true);
    try {
      const success = await updateItemQuantity(item.id, newQuantity);
      if (success && onItemUpdate) {
        onItemUpdate({ ...item, quantity: newQuantity });
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle increment
  const handleIncrement = () => {
    if (!isUpdating) {
      incrementQuantity(item.id);
    }
  };

  // Handle decrement
  const handleDecrement = () => {
    if (!isUpdating) {
      decrementQuantity(item.id);
    }
  };

  // Handle manual quantity input
  const handleQuantityInputChange = (value: string) => {
    setQuantityInput(value);
  };

  const handleQuantityInputSubmit = () => {
    const newQuantity = parseInt(quantityInput);
    if (isNaN(newQuantity) || newQuantity < 0) {
      setQuantityInput(quantity.toString());
      toast.error('Please enter a valid quantity');
      return;
    }
    
    if (newQuantity > 99) {
      setQuantityInput(quantity.toString());
      toast.error('Maximum quantity is 99');
      return;
    }

    handleQuantityChange(newQuantity);
    setIsEditingQuantity(false);
  };

  const handleQuantityInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuantityInputSubmit();
    } else if (e.key === 'Escape') {
      setQuantityInput(quantity.toString());
      setIsEditingQuantity(false);
    }
  };

  // Handle remove item
  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.id);
    } else {
      removeItemWithConfirmation(item.id);
    }
  };

  // Handle save for later
  const handleSaveForLater = () => {
    saveForLater(item.id);
  };

  // Get product URL
  const productUrl = `/products/${product.slug || product.id}`;

  // Render minimal variant
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center space-x-3 py-2', className)}>
        <div className="flex-shrink-0">
          <div className="h-12 w-12 bg-gray-100 rounded-md overflow-hidden">
            {product.images?.[0]?.image_url || product.thumbnail_url ? (
              <Image
                src={product.images?.[0]?.image_url || product.thumbnail_url!}
                alt={product.title}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <Link href={productUrl} className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-1">
            {product.title}
          </Link>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm text-gray-600">Qty: {quantity}</span>
            <span className="text-sm font-medium text-gray-900">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
        
        {showRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="h-8 w-8 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Product Image */}
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden">
                {product.images?.[0]?.image_url || product.thumbnail_url ? (
                  <Image
                    src={product.images?.[0]?.image_url || product.thumbnail_url!}
                    alt={product.title}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <Link href={productUrl} className="text-base font-medium text-gray-900 hover:text-blue-600 line-clamp-2">
                {product.title}
              </Link>
              
              {selectedVariant && (
                <p className="text-sm text-gray-600 mt-1">
                  Variant: {selectedVariant.name}
                </p>
              )}

              <div className="flex items-center space-x-2 mt-2">
                <span className="text-lg font-semibold text-gray-900">
                  ${unitPrice.toFixed(2)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-sm text-gray-500 line-through">
                      ${product.price.toFixed(2)}
                    </span>
                    <Badge variant="secondary" size="sm">
                      {discountPercentage}% off
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Quantity Controls */}
            {showQuantityControls && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDecrement}
                  disabled={isUpdating || quantity <= 1}
                  className="h-8 w-8"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <div className="w-16 text-center">
                  {isEditingQuantity ? (
                    <Input
                      type="number"
                      value={quantityInput}
                      onChange={(e) => handleQuantityInputChange(e.target.value)}
                      onBlur={handleQuantityInputSubmit}
                      onKeyDown={handleQuantityInputKeyDown}
                      className="w-16 h-8 text-center text-sm"
                      min="1"
                      max="99"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setIsEditingQuantity(true)}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 px-2 py-1 rounded"
                    >
                      {quantity}
                    </button>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleIncrement}
                  disabled={isUpdating || quantity >= 99}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {showSaveForLater && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveForLater}
                  className="h-8 w-8 text-gray-400 hover:text-blue-600"
                  title="Save for later"
                >
                  <Heart className="h-4 w-4" />
                </Button>
              )}
              
              {showRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemove}
                  className="h-8 w-8 text-gray-400 hover:text-red-600"
                  title="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Total Price */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              {quantity} × ${unitPrice.toFixed(2)}
            </span>
            <span className="text-lg font-semibold text-gray-900">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render default variant
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-6">
          {/* Product Image */}
          <div className="flex-shrink-0">
            <div className="h-24 w-24 bg-gray-100 rounded-lg overflow-hidden">
              {product.images?.[0]?.image_url || product.thumbnail_url ? (
                <Image
                  src={product.images?.[0]?.image_url || product.thumbnail_url!}
                  alt={product.title}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Link href={productUrl} className="text-lg font-semibold text-gray-900 hover:text-blue-600 line-clamp-2">
                  {product.title}
                </Link>
                
                {product.short_description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {product.short_description}
                  </p>
                )}

                {/* Product metadata */}
                <div className="flex items-center space-x-4 mt-2">
                  {product.stats?.average_rating && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-600">
                        {product.stats.average_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  
                  {product.is_digital && (
                    <Badge variant="outline" size="sm">
                      Digital Download
                    </Badge>
                  )}
                  
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Variant and customization info */}
                {selectedVariant && (
                  <div className="mt-3">
                    <span className="text-sm font-medium text-gray-700">Variant: </span>
                    <span className="text-sm text-gray-600">{selectedVariant.name}</span>
                  </div>
                )}

                {customization?.notes && (
                  <div className="mt-2">
                    <span className="text-sm font-medium text-gray-700">Notes: </span>
                    <span className="text-sm text-gray-600">{customization.notes}</span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-semibold text-gray-900">
                    ${unitPrice.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-gray-500 line-through">
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                </div>
                {hasDiscount && (
                  <Badge variant="secondary" size="sm" className="mt-1">
                    {discountPercentage}% off
                  </Badge>
                )}
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="flex items-center justify-between mt-6">
              {/* Quantity Controls */}
              {showQuantityControls && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">Quantity:</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDecrement}
                      disabled={isUpdating || quantity <= 1}
                      className="h-9 w-9"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <div className="w-20 text-center">
                      {isEditingQuantity ? (
                        <Input
                          type="number"
                          value={quantityInput}
                          onChange={(e) => handleQuantityInputChange(e.target.value)}
                          onBlur={handleQuantityInputSubmit}
                          onKeyDown={handleQuantityInputKeyDown}
                          className="w-20 h-9 text-center"
                          min="1"
                          max="99"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => setIsEditingQuantity(true)}
                          className="flex items-center justify-center w-20 h-9 text-sm font-medium text-gray-900 hover:text-blue-600 border border-gray-300 rounded-md hover:border-blue-600 transition-colors"
                        >
                          {quantity}
                          <Edit3 className="h-3 w-3 ml-1" />
                        </button>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleIncrement}
                      disabled={isUpdating || quantity >= 99}
                      className="h-9 w-9"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-3">
                {showSaveForLater && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveForLater}
                    className="flex items-center space-x-2"
                  >
                    <Heart className="h-4 w-4" />
                    <span>Save for Later</span>
                  </Button>
                )}
                
                {showRemove && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemove}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:border-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Remove</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Total Price */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-600">
                {quantity} × ${unitPrice.toFixed(2)}
              </span>
              <span className="text-xl font-bold text-gray-900">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
