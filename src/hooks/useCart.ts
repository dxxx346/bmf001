import { useCallback, useMemo } from 'react';
import { useCartContext } from '@/contexts/CartContext';
import { Product } from '@/types/product';
import { useAuthContext } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * Enhanced cart hook with additional utilities and operations
 */
export function useCart() {
  const cartContext = useCartContext();
  const { isAuthenticated } = useAuthContext();

  const {
    items,
    savedItems,
    isLoading,
    isOpen,
    summary,
    addItem: contextAddItem,
    removeItem,
    updateQuantity,
    clearCart,
    saveForLater,
    moveToCart,
    removeSavedItem,
    clearSavedItems,
    toggleCart,
    openCart,
    closeCart,
    applyDiscount,
    removeDiscount,
    getItemCount,
    hasItem,
    getItem,
    syncWithServer,
  } = cartContext;

  // Enhanced add to cart with validation
  const addToCart = useCallback((
    product: Product,
    quantity: number = 1,
    options?: {
      variant?: any;
      customization?: any;
      showToast?: boolean;
    }
  ) => {
    // Validation
    if (!product) {
      toast.error('Invalid product');
      return false;
    }

    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return false;
    }

    if (quantity > 99) {
      toast.error('Maximum quantity is 99');
      return false;
    }

    // Check if product is available
    if (product.status !== 'active') {
      toast.error('This product is not available');
      return false;
    }

    try {
      contextAddItem(product, quantity, options);
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (options?.showToast !== false) {
        toast.error('Failed to add product to cart');
      }
      return false;
    }
  }, [contextAddItem]);

  // Quick add to cart (quantity = 1)
  const quickAddToCart = useCallback((product: Product) => {
    return addToCart(product, 1, { showToast: true });
  }, [addToCart]);

  // Bulk add to cart
  const bulkAddToCart = useCallback((products: { product: Product; quantity: number }[]) => {
    let successCount = 0;
    let errorCount = 0;

    products.forEach(({ product, quantity }) => {
      if (addToCart(product, quantity, { showToast: false })) {
        successCount++;
      } else {
        errorCount++;
      }
    });

    if (successCount > 0) {
      toast.success(`${successCount} item(s) added to cart`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to add ${errorCount} item(s)`);
    }

    return { successCount, errorCount };
  }, [addToCart]);

  // Update item quantity with validation
  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 0) {
      toast.error('Quantity cannot be negative');
      return false;
    }

    if (quantity > 99) {
      toast.error('Maximum quantity is 99');
      return false;
    }

    try {
      updateQuantity(itemId, quantity);
      return true;
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
      return false;
    }
  }, [updateQuantity]);

  // Increment item quantity
  const incrementQuantity = useCallback((itemId: string) => {
    const item = getItem(items.find(i => i.id === itemId)?.product.id || '');
    if (item) {
      return updateItemQuantity(itemId, item.quantity + 1);
    }
    return false;
  }, [items, getItem, updateItemQuantity]);

  // Decrement item quantity
  const decrementQuantity = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      return updateItemQuantity(itemId, item.quantity - 1);
    }
    return false;
  }, [items, updateItemQuantity]);

  // Remove item with confirmation
  const removeItemWithConfirmation = useCallback((itemId: string, skipConfirmation: boolean = false) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return false;

    if (!skipConfirmation) {
      const confirmed = window.confirm(`Remove "${item.product.title}" from cart?`);
      if (!confirmed) return false;
    }

    removeItem(itemId);
    return true;
  }, [items, removeItem]);

  // Clear cart with confirmation
  const clearCartWithConfirmation = useCallback((skipConfirmation: boolean = false) => {
    if (items.length === 0) {
      toast.info('Cart is already empty');
      return false;
    }

    if (!skipConfirmation) {
      const confirmed = window.confirm('Are you sure you want to clear your cart?');
      if (!confirmed) return false;
    }

    clearCart();
    return true;
  }, [items.length, clearCart]);

  // Check if cart has any items
  const hasItems = useMemo(() => items.length > 0, [items.length]);

  // Check if cart has saved items
  const hasSavedItems = useMemo(() => savedItems.length > 0, [savedItems.length]);

  // Get cart items by category
  const getItemsByCategory = useCallback(() => {
    const categorized: Record<string, typeof items> = {};
    
    items.forEach(item => {
      const categoryId = item.product.category_id?.toString() || 'uncategorized';
      if (!categorized[categoryId]) {
        categorized[categoryId] = [];
      }
      categorized[categoryId].push(item);
    });

    return categorized;
  }, [items]);

  // Get most expensive item
  const getMostExpensiveItem = useCallback(() => {
    if (items.length === 0) return null;
    
    return items.reduce((mostExpensive, item) => {
      const itemPrice = item.selectedVariant?.price || item.product.sale_price || item.product.price;
      const mostExpensivePrice = mostExpensive.selectedVariant?.price || mostExpensive.product.sale_price || mostExpensive.product.price;
      
      return itemPrice > mostExpensivePrice ? item : mostExpensive;
    });
  }, [items]);

  // Get recommended products based on cart items
  const getRecommendedProducts = useCallback(async (): Promise<Product[]> => {
    if (items.length === 0) return [];

    try {
      // Get category IDs from cart items
      const categoryIds = [...new Set(items.map(item => item.product.category_id).filter(Boolean))];
      
      if (categoryIds.length === 0) return [];

      // Fetch recommendations (mock implementation)
      const response = await fetch(`/api/products/recommendations?category_ids=${categoryIds.join(',')}&limit=6`);
      const data = await response.json();
      
      return data.recommendations || [];
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }, [items]);

  // Validate cart before checkout
  const validateCart = useCallback(async () => {
    const errors: string[] = [];

    if (items.length === 0) {
      errors.push('Cart is empty');
    }

    // Check product availability
    for (const item of items) {
      if (item.product.status !== 'active') {
        errors.push(`${item.product.title} is no longer available`);
      }
      
      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for ${item.product.title}`);
      }
    }

    // Additional validations can be added here
    // - Stock availability
    // - Price changes
    // - Shipping restrictions

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [items]);

  // Prepare cart for checkout
  const prepareForCheckout = useCallback(async () => {
    const validation = await validateCart();
    
    if (!validation.isValid) {
      toast.error(`Cannot proceed to checkout: ${validation.errors.join(', ')}`);
      return null;
    }

    // Sync with server if authenticated
    if (isAuthenticated) {
      await syncWithServer();
    }

    return {
      items,
      summary,
      validation,
    };
  }, [validateCart, isAuthenticated, syncWithServer, items, summary]);

  // Get cart analytics
  const getCartAnalytics = useCallback(() => {
    const totalUniqueProducts = items.length;
    const totalQuantity = summary.itemCount;
    const averageItemPrice = totalQuantity > 0 ? summary.subtotal / totalQuantity : 0;
    const mostCommonCategory = items.reduce((acc, item) => {
      const categoryId = item.product.category_id?.toString() || 'uncategorized';
      acc[categoryId] = (acc[categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(mostCommonCategory).sort(([,a], [,b]) => b - a)[0];

    return {
      totalUniqueProducts,
      totalQuantity,
      averageItemPrice,
      topCategory: topCategory ? { id: topCategory[0], count: topCategory[1] } : null,
      subtotal: summary.subtotal,
      total: summary.total,
    };
  }, [items, summary]);

  // Export cart data
  const exportCart = useCallback(() => {
    const cartData = {
      items: items.map(item => ({
        productId: item.product.id,
        productTitle: item.product.title,
        quantity: item.quantity,
        price: item.selectedVariant?.price || item.product.sale_price || item.product.price,
        total: (item.selectedVariant?.price || item.product.sale_price || item.product.price) * item.quantity,
      })),
      savedItems: savedItems.map(item => ({
        productId: item.product.id,
        productTitle: item.product.title,
        savedAt: item.savedAt,
      })),
      summary,
      exportedAt: new Date().toISOString(),
    };

    return cartData;
  }, [items, savedItems, summary]);

  return {
    // State
    items,
    savedItems,
    isLoading,
    isOpen,
    summary,
    hasItems,
    hasSavedItems,

    // Basic cart operations
    addToCart,
    quickAddToCart,
    bulkAddToCart,
    removeItem,
    updateItemQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,

    // Enhanced operations
    removeItemWithConfirmation,
    clearCartWithConfirmation,

    // Save for later
    saveForLater,
    moveToCart,
    removeSavedItem,
    clearSavedItems,

    // UI operations
    toggleCart,
    openCart,
    closeCart,

    // Discount operations
    applyDiscount,
    removeDiscount,

    // Utility functions
    getItemCount,
    hasItem,
    getItem,
    getItemsByCategory,
    getMostExpensiveItem,
    getRecommendedProducts,

    // Validation and preparation
    validateCart,
    prepareForCheckout,

    // Analytics and export
    getCartAnalytics,
    exportCart,

    // Server sync
    syncWithServer,
  };
}
