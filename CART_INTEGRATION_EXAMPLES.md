# Shopping Cart Integration Examples

## Quick Integration Guide

### 1. Adding Cart to Product Components

Update existing ProductCard component to use the new cart system:

```tsx
// In src/components/products/ProductCard.tsx
import { useCart } from '@/hooks/useCart';

export function ProductCard({ product }) {
  const { addToCart, hasItem, getItem } = useCart();
  
  const cartItem = getItem(product.id);
  const isInCart = hasItem(product.id);

  const handleAddToCart = () => {
    addToCart(product, 1);
  };

  return (
    <Card>
      {/* Product content */}
      <Button 
        onClick={handleAddToCart}
        disabled={isInCart}
      >
        {isInCart ? `In Cart (${cartItem?.quantity})` : 'Add to Cart'}
      </Button>
    </Card>
  );
}
```

### 2. Update Header Component

The Header component has already been updated to use CartDropdown:

```tsx
// In src/components/layout/Header.tsx
import { CartDropdown } from '@/components/cart/CartDropdown';

// Replace the old cart button with:
<CartDropdown
  trigger="icon"
  showItemCount={true}
  variant="sheet"
/>
```

### 3. Quick Add to Cart Hook

Create a reusable hook for quick cart actions:

```tsx
// src/hooks/useQuickCart.ts
import { useCart } from '@/hooks/useCart';
import { Product } from '@/types/product';
import toast from 'react-hot-toast';

export function useQuickCart() {
  const { addToCart, removeItem, hasItem } = useCart();

  const quickAdd = (product: Product) => {
    if (hasItem(product.id)) {
      toast.info('Product already in cart');
      return;
    }
    addToCart(product);
  };

  const quickRemove = (productId: string) => {
    removeItem(productId);
  };

  return { quickAdd, quickRemove, hasItem };
}
```

### 4. Product Page Integration

```tsx
// In src/app/products/[id]/page.tsx
import { useCart } from '@/hooks/useCart';
import { CartSummary } from '@/components/cart/CartSummary';

export default function ProductPage({ product }) {
  const { addToCart, hasItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  return (
    <div>
      {/* Product details */}
      <div className="flex items-center space-x-4">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          min="1"
          max="99"
        />
        <Button 
          onClick={handleAddToCart}
          disabled={hasItem(product.id)}
        >
          Add to Cart - ${(product.price * quantity).toFixed(2)}
        </Button>
      </div>
    </div>
  );
}
```

### 5. Checkout Integration

```tsx
// src/app/checkout/page.tsx
import { useCart } from '@/hooks/useCart';
import { CartSummary } from '@/components/cart/CartSummary';

export default function CheckoutPage() {
  const { items, summary, validateCart } = useCart();

  useEffect(() => {
    // Validate cart on checkout page load
    validateCart().then(({ isValid, errors }) => {
      if (!isValid) {
        toast.error(`Cart validation failed: ${errors.join(', ')}`);
        router.push('/cart');
      }
    });
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        {/* Checkout form */}
      </div>
      <div>
        <CartSummary 
          variant="compact"
          showCheckoutButton={false}
          showDiscountCode={false}
        />
      </div>
    </div>
  );
}
```

### 6. Mini Cart Widget

Create a floating mini cart widget:

```tsx
// src/components/cart/MiniCartWidget.tsx
import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { CartDropdown } from './CartDropdown';

export function MiniCartWidget() {
  const { summary, hasItems } = useCart();

  if (!hasItems) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <CartDropdown
        trigger="button"
        triggerContent={
          <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg">
            <span className="text-sm">
              {summary.itemCount} items - ${summary.total.toFixed(2)}
            </span>
          </div>
        }
        variant="sheet"
      />
    </div>
  );
}
```

### 7. Cart Analytics Dashboard

```tsx
// src/components/admin/CartAnalytics.tsx
import { useCart } from '@/hooks/useCart';

export function CartAnalytics() {
  const { getCartAnalytics, exportCart } = useCart();
  const analytics = getCartAnalytics();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm text-gray-500">Unique Products</h3>
        <p className="text-2xl font-bold">{analytics.totalUniqueProducts}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm text-gray-500">Total Quantity</h3>
        <p className="text-2xl font-bold">{analytics.totalQuantity}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm text-gray-500">Average Item Price</h3>
        <p className="text-2xl font-bold">${analytics.averageItemPrice.toFixed(2)}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm text-gray-500">Cart Total</h3>
        <p className="text-2xl font-bold">${analytics.total.toFixed(2)}</p>
      </div>
    </div>
  );
}
```

### 8. Bulk Actions Component

```tsx
// src/components/cart/BulkActions.tsx
import { useCart } from '@/hooks/useCart';

export function BulkActions() {
  const { 
    clearCartWithConfirmation, 
    savedItems, 
    moveToCart, 
    exportCart 
  } = useCart();

  const handleMoveAllSavedToCart = () => {
    savedItems.forEach(item => moveToCart(item.id));
  };

  const handleExportCart = () => {
    const data = exportCart();
    console.log('Cart data:', data);
    // Handle export (download, email, etc.)
  };

  return (
    <div className="flex space-x-2">
      <Button 
        variant="outline" 
        onClick={clearCartWithConfirmation}
      >
        Clear Cart
      </Button>
      {savedItems.length > 0 && (
        <Button 
          variant="outline" 
          onClick={handleMoveAllSavedToCart}
        >
          Move All Saved to Cart
        </Button>
      )}
      <Button 
        variant="outline" 
        onClick={handleExportCart}
      >
        Export Cart
      </Button>
    </div>
  );
}
```

### 9. Cart Notifications

```tsx
// src/components/cart/CartNotifications.tsx
import { useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import toast from 'react-hot-toast';

export function CartNotifications() {
  const { summary } = useCart();

  // Notify about free shipping threshold
  useEffect(() => {
    if (summary.subtotal > 0 && summary.subtotal < 50) {
      const remaining = 50 - summary.subtotal;
      toast.success(
        `Add $${remaining.toFixed(2)} more for FREE shipping!`,
        { id: 'free-shipping-reminder' }
      );
    }
  }, [summary.subtotal]);

  return null; // This is a notification-only component
}
```

### 10. Persistent Cart Recovery

```tsx
// src/hooks/useCartRecovery.ts
import { useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuthContext } from '@/contexts/AuthContext';

export function useCartRecovery() {
  const { syncWithServer, items } = useCart();
  const { isAuthenticated } = useAuthContext();

  useEffect(() => {
    // Auto-sync cart every 5 minutes for authenticated users
    if (isAuthenticated && items.length > 0) {
      const interval = setInterval(syncWithServer, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, items.length, syncWithServer]);

  useEffect(() => {
    // Sync on window focus (user returns to tab)
    const handleFocus = () => {
      if (isAuthenticated) {
        syncWithServer();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, syncWithServer]);
}
```

## Migration from Old Cart Store

If you were using the old Zustand cart store, here's how to migrate:

### Before (Zustand):
```tsx
import { useCartStore } from '@/lib/store';

const { items, addItem, removeItem, getTotalPrice } = useCartStore();
```

### After (New Cart Context):
```tsx
import { useCart } from '@/hooks/useCart';

const { items, addToCart, removeItem, summary } = useCart();
// Note: getTotalPrice() is now summary.total
```

### Migration Steps:
1. Replace `useCartStore` imports with `useCart`
2. Update function names:
   - `addItem` → `addToCart`
   - `getTotalPrice()` → `summary.total`
   - `getTotalItems()` → `summary.itemCount`
3. Update item structure if needed
4. Add CartProvider to your app layout (already done)

## Testing Your Integration

### 1. Basic Functionality Test
```tsx
// Test adding items to cart
const testProduct = {
  id: '1',
  title: 'Test Product',
  price: 29.99,
  // ... other required fields
};

// In your component
const { addToCart, hasItem } = useCart();
addToCart(testProduct);
console.log('Item in cart:', hasItem('1')); // Should be true
```

### 2. Persistence Test
```tsx
// Add item, refresh page, check if item persists
useEffect(() => {
  const testPersistence = () => {
    console.log('Cart items after refresh:', items);
  };
  testPersistence();
}, []);
```

### 3. Integration Test
```tsx
// Test full flow: add → view cart → checkout
const testFullFlow = async () => {
  addToCart(testProduct);
  const checkoutData = await prepareForCheckout();
  console.log('Checkout data:', checkoutData);
};
```

This integration guide should help you seamlessly incorporate the new cart functionality into your existing Digital Marketplace components.
