# Checkout System Integration Examples

## Quick Integration Guide

### 1. Basic Checkout Integration

Add checkout button to cart or product pages:

```tsx
// In src/components/cart/CartSummary.tsx
import { useRouter } from 'next/navigation';

export function CartSummary({ onCheckout }) {
  const router = useRouter();
  
  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <Button onClick={handleCheckout} className="w-full">
      Proceed to Checkout - ${total.toFixed(2)}
    </Button>
  );
}
```

### 2. Product Page Quick Buy

```tsx
// In src/app/products/[id]/page.tsx
import { useCart } from '@/hooks/useCart';
import { useRouter } from 'next/navigation';

export default function ProductPage({ product }) {
  const { addToCart } = useCart();
  const router = useRouter();

  const handleBuyNow = () => {
    addToCart(product, 1);
    router.push('/checkout');
  };

  return (
    <div>
      <Button onClick={handleBuyNow}>
        Buy Now - ${product.price}
      </Button>
    </div>
  );
}
```

### 3. Custom Checkout Flow

```tsx
// Custom checkout with specific steps
import { useState } from 'react';
import { CheckoutSteps, ShippingInfo, PaymentMethod, OrderReview } from '@/components/checkout';

function CustomCheckout() {
  const [currentStep, setCurrentStep] = useState('shipping');
  const [checkoutData, setCheckoutData] = useState({});

  const steps = [
    { key: 'shipping', title: 'Shipping', component: ShippingInfo },
    { key: 'payment', title: 'Payment', component: PaymentMethod },
    { key: 'review', title: 'Review', component: OrderReview },
  ];

  return (
    <div>
      <CheckoutSteps 
        steps={steps}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />
      {/* Render current step component */}
    </div>
  );
}
```

### 4. Payment Method Customization

```tsx
// Custom payment method selection
import { PaymentMethod } from '@/components/checkout';

function CustomPaymentMethod() {
  const handlePaymentSelect = (method) => {
    // Custom logic for payment method selection
    console.log('Selected payment method:', method);
  };

  return (
    <PaymentMethod
      amount={100}
      currency="USD"
      billingAddress={billingInfo}
      onSelect={handlePaymentSelect}
      // Custom payment methods can be filtered here
    />
  );
}
```

### 5. Order Success Customization

```tsx
// Custom success page with additional actions
export default function CustomSuccessPage() {
  const [orderData, setOrderData] = useState(null);

  const handleDownloadAll = async () => {
    // Download all products at once
    for (const item of orderData.items) {
      if (item.download_url) {
        await downloadFile(item.download_url);
      }
    }
  };

  return (
    <div>
      <h1>Order Complete!</h1>
      <Button onClick={handleDownloadAll}>
        Download All Products
      </Button>
    </div>
  );
}
```

## Advanced Integration Examples

### 1. Multi-Currency Support

```tsx
// Dynamic currency based on user location
import { useEffect, useState } from 'react';

function CurrencyAwareCheckout() {
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1);

  useEffect(() => {
    // Detect user location and set appropriate currency
    const detectCurrency = async () => {
      const response = await fetch('/api/user/currency');
      const { currency, rate } = await response.json();
      setCurrency(currency);
      setExchangeRate(rate);
    };
    
    detectCurrency();
  }, []);

  const convertPrice = (price) => {
    return (price * exchangeRate).toFixed(2);
  };

  return (
    <PaymentMethod
      amount={convertPrice(total)}
      currency={currency}
      // ... other props
    />
  );
}
```

### 2. Subscription Checkout

```tsx
// Recurring payment setup
function SubscriptionCheckout({ plan }) {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const handleSubscriptionOrder = async (orderNotes) => {
    const response = await fetch('/api/subscriptions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: plan.id,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        billing_address: shippingInfo,
      }),
    });

    const { subscription_url } = await response.json();
    window.location.href = subscription_url;
  };

  return (
    <OrderReview
      // ... standard props
      onSubmit={handleSubscriptionOrder}
    />
  );
}
```

### 3. Bundle Checkout

```tsx
// Multiple product bundle with discounts
function BundleCheckout({ bundle }) {
  const [selectedProducts, setSelectedProducts] = useState(bundle.products);
  const [bundleDiscount, setBundleDiscount] = useState(0);

  useEffect(() => {
    // Calculate bundle discount
    const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    const discount = totalPrice * (bundle.discount_percentage / 100);
    setBundleDiscount(discount);
  }, [selectedProducts, bundle.discount_percentage]);

  return (
    <div>
      <h3>Bundle: {bundle.name}</h3>
      <p>Save ${bundleDiscount.toFixed(2)} with this bundle!</p>
      {/* Rest of checkout */}
    </div>
  );
}
```

### 4. Guest Checkout

```tsx
// Checkout without account creation
function GuestCheckout() {
  const [isGuest, setIsGuest] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');

  const handleGuestCheckout = (shippingInfo) => {
    // Process as guest with minimal information
    const guestOrder = {
      ...shippingInfo,
      is_guest: true,
      guest_email: guestEmail,
    };
    
    // Continue with normal checkout flow
  };

  return (
    <div>
      <div className="mb-4">
        <label>
          <input
            type="checkbox"
            checked={isGuest}
            onChange={(e) => setIsGuest(e.target.checked)}
          />
          Checkout as guest
        </label>
      </div>
      
      {isGuest && (
        <input
          type="email"
          placeholder="Email for order confirmation"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
        />
      )}
      
      <ShippingInfo onSubmit={handleGuestCheckout} />
    </div>
  );
}
```

### 5. Express Checkout

```tsx
// One-click checkout for returning customers
function ExpressCheckout({ savedPaymentMethod, savedAddress }) {
  const [isExpressCheckout, setIsExpressCheckout] = useState(false);

  const handleExpressCheckout = async () => {
    const response = await fetch('/api/checkout/express', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method_id: savedPaymentMethod.id,
        billing_address_id: savedAddress.id,
        cart_items: cartItems,
      }),
    });

    const { payment_url } = await response.json();
    window.location.href = payment_url;
  };

  if (savedPaymentMethod && savedAddress) {
    return (
      <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
        <h3 className="font-semibold mb-2">Express Checkout</h3>
        <p className="text-sm text-gray-600 mb-3">
          Use your saved payment method and address for faster checkout
        </p>
        <Button onClick={handleExpressCheckout}>
          Pay with {savedPaymentMethod.brand} •••• {savedPaymentMethod.last4}
        </Button>
      </div>
    );
  }

  return null;
}
```

## Webhook Integration

### 1. Payment Success Webhook

```tsx
// pages/api/webhooks/stripe.ts
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent) {
  // Create order record
  // Send confirmation email
  // Grant access to digital products
  // Update inventory
}
```

### 2. Order Fulfillment

```tsx
// Automatic order fulfillment after payment
async function fulfillOrder(orderId) {
  const order = await getOrderById(orderId);
  
  for (const item of order.items) {
    if (item.product.is_digital) {
      // Generate secure download link
      const downloadUrl = await generateDownloadLink(item.product_id, order.user_id);
      
      // Update order item with download URL
      await updateOrderItem(item.id, { download_url: downloadUrl });
    }
  }
  
  // Send order confirmation email
  await sendOrderConfirmationEmail(order);
  
  // Update order status
  await updateOrderStatus(orderId, 'fulfilled');
}
```

## Error Handling Examples

### 1. Payment Failure Recovery

```tsx
function PaymentFailureHandler() {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const handlePaymentRetry = async () => {
    if (retryCount >= maxRetries) {
      // Redirect to alternative payment methods
      router.push('/checkout?step=payment&retry=true');
      return;
    }

    setRetryCount(prev => prev + 1);
    
    try {
      // Retry payment with same method
      await processPayment();
    } catch (error) {
      // Show error and retry option
      toast.error(`Payment failed. ${maxRetries - retryCount} attempts remaining.`);
    }
  };

  return (
    <div className="text-center">
      <p>Payment failed. Would you like to try again?</p>
      <Button onClick={handlePaymentRetry} disabled={retryCount >= maxRetries}>
        Retry Payment ({maxRetries - retryCount} attempts left)
      </Button>
    </div>
  );
}
```

### 2. Network Error Handling

```tsx
function NetworkErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="text-center p-8">
        <h3>No Internet Connection</h3>
        <p>Please check your connection and try again.</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="text-center p-8">
        <h3>Something went wrong</h3>
        <Button onClick={() => setHasError(false)}>
          Try Again
        </Button>
      </div>
    );
  }

  return children;
}
```

## Testing Examples

### 1. Checkout Flow Testing

```tsx
// __tests__/checkout-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from '@/app/checkout/page';

describe('Checkout Flow', () => {
  it('should complete full checkout process', async () => {
    render(<CheckoutPage />);
    
    // Step 1: Fill shipping info
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'John Doe' }
    });
    fireEvent.click(screen.getByText('Continue to Payment'));
    
    // Step 2: Select payment method
    fireEvent.click(screen.getByLabelText('Credit/Debit Card'));
    fireEvent.click(screen.getByText('Continue to Review'));
    
    // Step 3: Review and submit
    fireEvent.click(screen.getByLabelText('I agree to the Terms'));
    fireEvent.click(screen.getByText('Complete Order'));
    
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });
});
```

### 2. Payment Integration Testing

```tsx
// Mock payment providers for testing
jest.mock('@/services/payment.service', () => ({
  PaymentService: jest.fn().mockImplementation(() => ({
    createPayment: jest.fn().mockResolvedValue({
      success: true,
      payment_intent: { id: 'pi_test_123' },
      payment_data: { checkout_url: 'https://checkout.stripe.com/test' }
    })
  }))
}));
```

This integration guide provides practical examples for implementing and extending the checkout system in various scenarios. The examples cover common use cases and advanced features while maintaining the security and user experience standards of the base system.
