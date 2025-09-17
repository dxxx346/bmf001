# Shopping Cart System Documentation

## Overview

This document describes the comprehensive shopping cart functionality implemented for the Digital Marketplace. The system provides a full-featured cart experience with localStorage persistence, real-time updates, and seamless integration with the authentication system.

## Architecture

### Components Structure

```
src/
├── contexts/
│   └── CartContext.tsx          # Cart state management with localStorage
├── hooks/
│   └── useCart.ts              # Enhanced cart operations hook
├── components/cart/
│   ├── CartItem.tsx            # Individual cart item component
│   ├── CartSummary.tsx         # Price breakdown and checkout
│   ├── CartDropdown.tsx        # Mini cart for header
│   └── index.ts               # Component exports
└── app/cart/
    └── page.tsx               # Main cart page
```

## Core Features

### 1. Cart Context (`src/contexts/CartContext.tsx`)

**State Management:**
- Persistent cart storage using localStorage
- Real-time synchronization with server (for authenticated users)
- Support for product variants and customizations
- Save for later functionality
- Discount code system

**Key Interfaces:**
```typescript
interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  addedAt: Date;
  selectedVariant?: {
    id: string;
    name: string;
    price?: number;
  };
  customization?: {
    notes?: string;
    options?: Record<string, any>;
  };
}

interface CartSummary {
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  discountCode?: string;
  shipping: number;
  total: number;
  itemCount: number;
}
```

**Features:**
- **Automatic Tax Calculation**: 8% tax rate (configurable)
- **Free Shipping**: Over $50 threshold
- **Discount System**: Support for percentage-based discount codes
- **Persistence**: localStorage with server sync for authenticated users

### 2. Cart Hook (`src/hooks/useCart.ts`)

Enhanced cart operations with validation and utilities.

**Key Functions:**
```typescript
// Basic Operations
addToCart(product, quantity, options)
quickAddToCart(product)
bulkAddToCart(products)
updateItemQuantity(itemId, quantity)
removeItem(itemId)
clearCart()

// Save for Later
saveForLater(itemId)
moveToCart(savedItemId)
removeSavedItem(savedItemId)

// Validation & Preparation
validateCart()
prepareForCheckout()

// Analytics & Export
getCartAnalytics()
exportCart()
```

**Validation Features:**
- Product availability checks
- Quantity limits (1-99)
- Stock validation (extensible)
- Price change detection

### 3. Cart Item Component (`src/components/cart/CartItem.tsx`)

**Variants:**
- **Default**: Full-featured item display with all controls
- **Compact**: Condensed view for dropdowns
- **Minimal**: Basic display for quick views

**Features:**
- **Quantity Controls**: Increment/decrement buttons with manual input
- **Price Display**: Shows unit price, discounts, and total
- **Product Information**: Title, description, variant details
- **Actions**: Remove, save for later, edit quantity
- **Responsive Design**: Adapts to different screen sizes

### 4. Cart Summary Component (`src/components/cart/CartSummary.tsx`)

**Variants:**
- **Default**: Full summary with all features
- **Compact**: Condensed for sidebars
- **Minimal**: Basic totals only

**Features:**
- **Price Breakdown**: Subtotal, tax, shipping, discounts
- **Discount Codes**: Apply and remove discount functionality
- **Free Shipping Progress**: Visual indicator for free shipping threshold
- **Security Badges**: SSL, guarantee, and support indicators
- **Checkout Integration**: Direct checkout button

### 5. Cart Dropdown Component (`src/components/cart/CartDropdown.tsx`)

**Trigger Types:**
- **Icon**: Cart icon with item count badge
- **Button**: Full button with text and count
- **Custom**: Custom trigger element

**Display Modes:**
- **Sheet**: Mobile-friendly slide-out panel
- **Dropdown**: Desktop dropdown menu

**Features:**
- **Quick View**: Show limited items with "view all" option
- **Saved Items**: Display saved for later items
- **Quick Actions**: Move to cart, remove items
- **Summary**: Quick price summary
- **Checkout**: Direct checkout from dropdown

### 6. Cart Page (`src/app/cart/page.tsx`)

**Sections:**
- **Cart Items**: Full item list with all controls
- **Saved Items**: Saved for later products
- **Recommendations**: Suggested products based on cart
- **Summary Sidebar**: Sticky checkout summary

**Features:**
- **Bulk Actions**: Clear cart, move all saved items
- **Export/Share**: Export cart data, share cart
- **Sync**: Manual server synchronization
- **Security**: Trust indicators and guarantees

## Usage Examples

### Basic Cart Integration

```tsx
import { useCart } from '@/hooks/useCart';
import { CartDropdown } from '@/components/cart';

function Header() {
  const { addToCart } = useCart();

  return (
    <header>
      {/* Other header content */}
      <CartDropdown
        trigger="icon"
        showItemCount={true}
        variant="sheet"
      />
    </header>
  );
}
```

### Adding Products to Cart

```tsx
import { useCart } from '@/hooks/useCart';

function ProductPage({ product }) {
  const { addToCart, hasItem } = useCart();

  const handleAddToCart = () => {
    addToCart(product, 1, {
      variant: selectedVariant,
      customization: { notes: 'Special instructions' }
    });
  };

  return (
    <div>
      <button 
        onClick={handleAddToCart}
        disabled={hasItem(product.id)}
      >
        {hasItem(product.id) ? 'In Cart' : 'Add to Cart'}
      </button>
    </div>
  );
}
```

### Cart Page Implementation

```tsx
import { CartItem, CartSummary } from '@/components/cart';
import { useCart } from '@/hooks/useCart';

function CartPage() {
  const { items, summary } = useCart();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        {items.map(item => (
          <CartItem key={item.id} item={item} />
        ))}
      </div>
      <div>
        <CartSummary 
          onCheckout={() => router.push('/checkout')}
        />
      </div>
    </div>
  );
}
```

## Configuration

### Tax and Shipping Settings

```typescript
// In CartContext.tsx
const TAX_RATE = 0.08; // 8% tax rate
const FREE_SHIPPING_THRESHOLD = 50; // Free shipping over $50
const SHIPPING_COST = 5.99; // Standard shipping cost
```

### Discount Codes

```typescript
// Sample discount codes (replace with API integration)
const validDiscounts = {
  'SAVE10': 10,      // 10% off
  'WELCOME20': 20,   // 20% off
  'STUDENT15': 15,   // 15% off
  'FIRST25': 25,     // 25% off
};
```

### Storage Keys

```typescript
// localStorage keys
const CART_STORAGE_KEY = 'cart-data';
const RECENT_SEARCHES_KEY = 'recent-searches';
```

## Integration Points

### Authentication Integration

```typescript
// Cart syncs with server when user logs in
useEffect(() => {
  if (isAuthenticated && user) {
    syncWithServer();
  }
}, [isAuthenticated, user]);
```

### Product Integration

```typescript
// Add to cart from product cards
const handleAddToCart = (product: Product) => {
  if (product.status !== 'active') {
    toast.error('Product not available');
    return;
  }
  addToCart(product);
};
```

### Checkout Integration

```typescript
// Prepare cart for checkout
const handleCheckout = async () => {
  const checkoutData = await prepareForCheckout();
  if (checkoutData) {
    router.push('/checkout');
  }
};
```

## State Management

### localStorage Persistence

```typescript
// Cart data structure in localStorage
{
  items: CartItem[],
  savedItems: SavedItem[],
  discountCode?: string,
  discountAmount: number,
  lastUpdated: string
}
```

### Server Synchronization

```typescript
// Sync cart with server for authenticated users
const syncWithServer = async () => {
  if (!isAuthenticated) return;
  
  // Merge local cart with server cart
  const serverCart = await fetchServerCart();
  const mergedCart = mergeCartData(localCart, serverCart);
  updateCart(mergedCart);
};
```

## Performance Optimizations

### Lazy Loading
- Cart dropdown content loaded on first open
- Recommended products loaded after cart items
- Images lazy loaded with placeholder

### Caching
- Product data cached in cart items
- Discount validation cached for 5 minutes
- Cart summary calculated with useMemo

### Debouncing
- Quantity updates debounced to prevent rapid API calls
- Search in cart items debounced

## Mobile Responsiveness

### Responsive Design
- **Mobile**: Sheet-based cart overlay
- **Tablet**: Collapsible sidebar
- **Desktop**: Full dropdown or sidebar

### Touch Interactions
- Large touch targets for quantity controls
- Swipe gestures for item removal
- Pull-to-refresh for cart sync

## Accessibility

### ARIA Support
- Proper ARIA labels for cart controls
- Screen reader announcements for cart updates
- Keyboard navigation support

### Keyboard Shortcuts
- **Tab**: Navigate between cart items
- **Enter/Space**: Activate buttons
- **Escape**: Close cart dropdown

## Security Features

### Data Validation
- Input sanitization for quantities
- Product validation before adding to cart
- Price integrity checks

### Privacy
- Cart data encrypted in localStorage
- Secure server synchronization
- No sensitive data in URLs

## Error Handling

### Graceful Degradation
- Fallback to localStorage if server sync fails
- Retry mechanism for failed operations
- User-friendly error messages

### Error Recovery
- Auto-retry for network failures
- Cart restoration from backup
- Partial cart recovery

## Analytics Integration

### Cart Analytics
```typescript
const analytics = getCartAnalytics();
// Returns:
{
  totalUniqueProducts: number,
  totalQuantity: number,
  averageItemPrice: number,
  topCategory: { id: string, count: number },
  subtotal: number,
  total: number
}
```

### Event Tracking
- Cart item additions/removals
- Checkout initiation
- Discount code usage
- Cart abandonment

## Testing Strategy

### Unit Tests
- Cart context state management
- Hook functionality
- Component rendering
- Validation logic

### Integration Tests
- Add to cart flow
- Checkout preparation
- Server synchronization
- Error handling

### E2E Tests
- Complete shopping flow
- Cart persistence across sessions
- Mobile cart interactions
- Checkout process

## Future Enhancements

### Planned Features

1. **Advanced Discounts**
   - BOGO offers
   - Category-specific discounts
   - Time-limited promotions
   - User-specific coupons

2. **Cart Sharing**
   - Social media sharing
   - Email cart links
   - Collaborative carts
   - Wishlist integration

3. **Smart Recommendations**
   - AI-powered suggestions
   - Cross-sell recommendations
   - Recently viewed integration
   - Personalized offers

4. **Advanced Analytics**
   - Cart abandonment tracking
   - Conversion funnel analysis
   - A/B testing for cart UI
   - Revenue optimization

## Troubleshooting

### Common Issues

1. **Cart Not Persisting**
   - Check localStorage availability
   - Verify storage quotas
   - Check for private browsing mode

2. **Sync Issues**
   - Verify authentication status
   - Check network connectivity
   - Review server response

3. **Performance Issues**
   - Check cart item count
   - Verify image optimization
   - Review component re-renders

### Debug Tools
- Cart state inspector in dev tools
- Network tab for sync monitoring
- Performance profiler for optimization
- Console logging for state changes

## Conclusion

The shopping cart system provides a comprehensive, performant, and user-friendly cart experience for the Digital Marketplace. It combines modern React patterns with practical e-commerce features, ensuring both functionality and usability across all devices and user scenarios.

The system is designed to scale with the business, supporting advanced features like variants, customizations, and complex discount structures while maintaining simplicity for basic use cases.
