'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '@/types/product';
import { useAuthContext } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

// Enhanced cart item interface
export interface CartItem {
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

// Saved for later item interface
export interface SavedItem {
  id: string;
  product: Product;
  savedAt: Date;
  originalCartItem?: CartItem;
}

// Cart summary interface
export interface CartSummary {
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  discountCode?: string;
  shipping: number;
  total: number;
  itemCount: number;
}

// Cart context interface
interface CartContextType {
  // Cart state
  items: CartItem[];
  savedItems: SavedItem[];
  isLoading: boolean;
  isOpen: boolean;
  
  // Cart summary
  summary: CartSummary;
  
  // Cart actions
  addItem: (product: Product, quantity?: number, options?: { variant?: any; customization?: any }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Save for later actions
  saveForLater: (itemId: string) => void;
  moveToCart: (savedItemId: string) => void;
  removeSavedItem: (savedItemId: string) => void;
  clearSavedItems: () => void;
  
  // Cart UI actions
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  
  // Discount actions
  applyDiscount: (code: string) => Promise<boolean>;
  removeDiscount: () => void;
  
  // Utility functions
  getItemCount: () => number;
  hasItem: (productId: string) => boolean;
  getItem: (productId: string) => CartItem | undefined;
  
  // Persistence
  syncWithServer: () => Promise<void>;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Tax calculation (can be made configurable)
const TAX_RATE = 0.08; // 8% tax rate
const FREE_SHIPPING_THRESHOLD = 50; // Free shipping over $50
const SHIPPING_COST = 5.99;

interface CartProviderProps {
  children: React.ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const { user, isAuthenticated } = useAuthContext();
  const [items, setItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState<string>();
  const [discountAmount, setDiscountAmount] = useState(0);

  // Load cart from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save cart to localStorage when items change
  useEffect(() => {
    saveToStorage();
  }, [items, savedItems, discountCode, discountAmount]);

  // Sync with server when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      syncWithServer();
    }
  }, [isAuthenticated, user]);

  // Calculate cart summary
  const summary: CartSummary = React.useMemo(() => {
    const subtotal = items.reduce((total, item) => {
      const price = item.selectedVariant?.price || item.product.sale_price || item.product.price;
      return total + (price * item.quantity);
    }, 0);

    const discount = discountAmount;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = discountedSubtotal * TAX_RATE;
    const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = discountedSubtotal + tax + shipping;
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);

    return {
      subtotal,
      tax,
      taxRate: TAX_RATE,
      discount,
      discountCode,
      shipping,
      total,
      itemCount,
    };
  }, [items, discountAmount, discountCode]);

  // Generate unique ID for cart items
  const generateItemId = (product: Product, variant?: any): string => {
    const variantId = variant?.id || '';
    return `${product.id}-${variantId}-${Date.now()}`;
  };

  // Add item to cart
  const addItem = (
    product: Product, 
    quantity: number = 1, 
    options?: { variant?: any; customization?: any }
  ) => {
    try {
      setItems(prevItems => {
        // Check if item with same product and variant already exists
        const existingItemIndex = prevItems.findIndex(item => 
          item.product.id === product.id && 
          item.selectedVariant?.id === options?.variant?.id
        );

        if (existingItemIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...prevItems];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity,
          };
          return updatedItems;
        } else {
          // Add new item
          const newItem: CartItem = {
            id: generateItemId(product, options?.variant),
            product,
            quantity,
            addedAt: new Date(),
            selectedVariant: options?.variant,
            customization: options?.customization,
          };
          return [...prevItems, newItem];
        }
      });

      toast.success(`${product.title} added to cart`);
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  // Remove item from cart
  const removeItem = (itemId: string) => {
    try {
      const item = items.find(item => item.id === itemId);
      if (item) {
        setItems(prevItems => prevItems.filter(item => item.id !== itemId));
        toast.success(`${item.product.title} removed from cart`);
      }
    } catch (error) {
      console.error('Error removing item from cart:', error);
      toast.error('Failed to remove item from cart');
    }
  };

  // Update item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        removeItem(itemId);
        return;
      }

      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating item quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  // Clear entire cart
  const clearCart = () => {
    try {
      setItems([]);
      setDiscountCode(undefined);
      setDiscountAmount(0);
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  // Save item for later
  const saveForLater = (itemId: string) => {
    try {
      const item = items.find(item => item.id === itemId);
      if (item) {
        const savedItem: SavedItem = {
          id: `saved-${item.id}`,
          product: item.product,
          savedAt: new Date(),
          originalCartItem: item,
        };

        setSavedItems(prevSaved => [...prevSaved, savedItem]);
        removeItem(itemId);
        toast.success(`${item.product.title} saved for later`);
      }
    } catch (error) {
      console.error('Error saving item for later:', error);
      toast.error('Failed to save item for later');
    }
  };

  // Move saved item back to cart
  const moveToCart = (savedItemId: string) => {
    try {
      const savedItem = savedItems.find(item => item.id === savedItemId);
      if (savedItem && savedItem.originalCartItem) {
        addItem(
          savedItem.product, 
          savedItem.originalCartItem.quantity,
          {
            variant: savedItem.originalCartItem.selectedVariant,
            customization: savedItem.originalCartItem.customization,
          }
        );
        removeSavedItem(savedItemId);
        toast.success(`${savedItem.product.title} moved to cart`);
      }
    } catch (error) {
      console.error('Error moving item to cart:', error);
      toast.error('Failed to move item to cart');
    }
  };

  // Remove saved item
  const removeSavedItem = (savedItemId: string) => {
    try {
      const savedItem = savedItems.find(item => item.id === savedItemId);
      if (savedItem) {
        setSavedItems(prevSaved => prevSaved.filter(item => item.id !== savedItemId));
        toast.success(`${savedItem.product.title} removed from saved items`);
      }
    } catch (error) {
      console.error('Error removing saved item:', error);
      toast.error('Failed to remove saved item');
    }
  };

  // Clear all saved items
  const clearSavedItems = () => {
    try {
      setSavedItems([]);
      toast.success('Saved items cleared');
    } catch (error) {
      console.error('Error clearing saved items:', error);
      toast.error('Failed to clear saved items');
    }
  };

  // Cart UI actions
  const toggleCart = () => setIsOpen(!isOpen);
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  // Apply discount code
  const applyDiscount = async (code: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Mock discount validation - replace with actual API call
      const validDiscounts: Record<string, number> = {
        'SAVE10': 10,
        'WELCOME20': 20,
        'STUDENT15': 15,
        'FIRST25': 25,
      };

      if (validDiscounts[code.toUpperCase()]) {
        const discountPercent = validDiscounts[code.toUpperCase()];
        const discountValue = (summary.subtotal * discountPercent) / 100;
        
        setDiscountCode(code.toUpperCase());
        setDiscountAmount(discountValue);
        toast.success(`Discount applied: ${discountPercent}% off`);
        return true;
      } else {
        toast.error('Invalid discount code');
        return false;
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      toast.error('Failed to apply discount');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove discount
  const removeDiscount = () => {
    setDiscountCode(undefined);
    setDiscountAmount(0);
    toast.success('Discount removed');
  };

  // Utility functions
  const getItemCount = () => summary.itemCount;
  const hasItem = (productId: string) => items.some(item => item.product.id === productId);
  const getItem = (productId: string) => items.find(item => item.product.id === productId);

  // Sync with server (for authenticated users)
  const syncWithServer = async () => {
    if (!isAuthenticated || !user) return;

    try {
      setIsLoading(true);
      
      // TODO: Implement server sync
      // const response = await fetch('/api/cart', {
      //   method: 'GET',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const serverCart = await response.json();
      // Merge server cart with local cart
      
    } catch (error) {
      console.error('Error syncing cart with server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load cart from localStorage
  const loadFromStorage = () => {
    try {
      const cartData = localStorage.getItem('cart-data');
      if (cartData) {
        const parsed = JSON.parse(cartData);
        setItems(parsed.items || []);
        setSavedItems(parsed.savedItems || []);
        setDiscountCode(parsed.discountCode);
        setDiscountAmount(parsed.discountAmount || 0);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    }
  };

  // Save cart to localStorage
  const saveToStorage = () => {
    try {
      const cartData = {
        items,
        savedItems,
        discountCode,
        discountAmount,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem('cart-data', JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  };

  const contextValue: CartContextType = {
    // State
    items,
    savedItems,
    isLoading,
    isOpen,
    summary,
    
    // Cart actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    
    // Save for later actions
    saveForLater,
    moveToCart,
    removeSavedItem,
    clearSavedItems,
    
    // UI actions
    toggleCart,
    openCart,
    closeCart,
    
    // Discount actions
    applyDiscount,
    removeDiscount,
    
    // Utility functions
    getItemCount,
    hasItem,
    getItem,
    
    // Persistence
    syncWithServer,
    loadFromStorage,
    saveToStorage,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to use cart context
export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
}

// Export types for use in other components
export type { CartContextType };
