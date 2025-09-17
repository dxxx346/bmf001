'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  ArrowLeft, 
  Package, 
  Heart, 
  Trash2,
  ShoppingBag,
  RefreshCw,
  Share2,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { useCart } from '@/hooks/useCart';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Product } from '@/types/product';
import toast from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthContext();
  const {
    items,
    savedItems,
    summary,
    hasItems,
    hasSavedItems,
    isLoading,
    clearCartWithConfirmation,
    moveToCart,
    removeSavedItem,
    clearSavedItems,
    syncWithServer,
    exportCart,
    getRecommendedProducts,
  } = useCart();

  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load recommended products
  useEffect(() => {
    if (hasItems) {
      getRecommendedProducts()
        .then((products: Product[]) => setRecommendedProducts(products))
        .catch((error) => {
          console.error('Failed to load recommended products:', error);
          setRecommendedProducts([]);
        });
    }
  }, [hasItems, getRecommendedProducts]);

  // Handle checkout
  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to continue with checkout');
      router.push('/auth/login?redirect=/checkout');
      return;
    }
    router.push('/checkout');
  };

  // Handle continue shopping
  const handleContinueShopping = () => {
    router.push('/products');
  };

  // Handle sync with server
  const handleSync = async () => {
    if (!isAuthenticated) return;
    
    setIsSyncing(true);
    try {
      await syncWithServer();
      toast.success('Cart synced successfully');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync cart');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle share cart
  const handleShareCart = async () => {
    try {
      const cartData = exportCart();
      const shareText = `Check out my cart: ${cartData.items.length} items for $${cartData.summary.total.toFixed(2)}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'My Shopping Cart',
          text: shareText,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        toast.success('Cart link copied to clipboard');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share cart');
    }
  };

  // Handle export cart
  const handleExportCart = () => {
    try {
      const cartData = exportCart();
      const dataStr = JSON.stringify(cartData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cart-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Cart exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export cart');
    }
  };

  // Render empty cart state
  const renderEmptyCart = () => (
    <div className="text-center py-16">
      <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <ShoppingCart className="h-12 w-12 text-gray-400" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Looks like you haven&apos;t added any items to your cart yet. Start shopping to fill it up with amazing digital products!
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={handleContinueShopping} size="lg">
          <Package className="h-4 w-4 mr-2" />
          Browse Products
        </Button>
        <Button variant="outline" onClick={() => router.push('/categories')} size="lg">
          Browse Categories
        </Button>
      </div>
    </div>
  );

  // Render saved items section
  const renderSavedItems = () => {
    if (!hasSavedItems) return null;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span>Saved for Later</span>
              <Badge variant="secondary">{savedItems.length}</Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearSavedItems()}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {savedItems.map((savedItem) => (
              <div key={savedItem.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden">
                  {savedItem.product.images && savedItem.product.images.length > 0 ? (
                    <img
                      src={savedItem.product.images[0].thumbnail_url || savedItem.product.images[0].image_url}
                      alt={savedItem.product.title}
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
                    {savedItem.product.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    ${savedItem.product.sale_price || savedItem.product.price}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Saved {new Date(savedItem.savedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveToCart(savedItem.id)}
                  >
                    Move to Cart
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSavedItem(savedItem.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render recommended products
  const renderRecommendedProducts = () => {
    if (recommendedProducts.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>You might also like</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedProducts.slice(0, 6).map((product: Product) => (
              <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="h-32 bg-gray-100 rounded-md mb-3 overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0].thumbnail_url || product.images[0].image_url}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 line-clamp-2 mb-2">
                  {product.title}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-600">
                    ${product.sale_price || product.price}
                  </span>
                  <Button size="sm">
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
                {hasItems && (
                  <p className="text-sm text-gray-600">
                    {summary.itemCount} item{summary.itemCount !== 1 ? 's' : ''} in your cart
                  </p>
                )}
              </div>
            </div>
            
            {hasItems && (
              <div className="flex items-center space-x-2">
                {isAuthenticated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={cn('h-4 w-4 mr-2', isSyncing && 'animate-spin')} />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareCart}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCart}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearCartWithConfirmation()}
                  className="text-red-600 hover:text-red-700 hover:border-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasItems ? (
          renderEmptyCart()
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Items List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <ShoppingBag className="h-5 w-5" />
                      <span>Cart Items</span>
                      <Badge variant="secondary">{items.length}</Badge>
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleContinueShopping}
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={item.id}>
                        <CartItem
                          item={item}
                          variant="default"
                          showSaveForLater={true}
                          showRemove={true}
                          showQuantityControls={true}
                        />
                        {index < items.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Saved Items */}
              {renderSavedItems()}

              {/* Recommended Products */}
              {renderRecommendedProducts()}
            </div>

            {/* Cart Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                <CartSummary
                  showDiscountCode={true}
                  showShippingInfo={true}
                  showCheckoutButton={true}
                  onCheckout={handleCheckout}
                  variant="default"
                />

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleContinueShopping}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Continue Shopping
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => router.push('/wishlist')}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      View Wishlist
                    </Button>
                    
                    {hasSavedItems && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          savedItems.forEach(item => moveToCart(item.id));
                          toast.success('All saved items moved to cart');
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Move All Saved to Cart
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Security & Guarantees */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Security & Guarantees</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span>SSL encrypted checkout</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span>30-day money-back guarantee</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span>Instant digital delivery</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span>24/7 customer support</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
