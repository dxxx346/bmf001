import { useState, useCallback } from 'react';
import { 
  Product, 
  ProductSearchResult, 
  ProductRecommendation, 
  ProductSearchFilters,
  CreateProductRequest,
  UpdateProductRequest,
  ProductVersionRequest,
  BulkUpdateRequest,
  ProductAnalytics,
  ProductAnalyticsRequest
} from '@/types/product';

interface UseProductsState {
  products: Product[];
  currentProduct: Product | null;
  searchResult: ProductSearchResult | null;
  recommendations: ProductRecommendation[];
  analytics: ProductAnalytics | null;
  isLoading: boolean;
  error: string | null;
}

interface UseProductsActions {
  searchProducts: (filters: ProductSearchFilters) => Promise<void>;
  getProduct: (id: string) => Promise<void>;
  createProduct: (product: CreateProductRequest) => Promise<{ success: boolean; message: string }>;
  updateProduct: (id: string, updates: UpdateProductRequest) => Promise<{ success: boolean; message: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; message: string }>;
  createProductVersion: (productId: string, version: ProductVersionRequest) => Promise<{ success: boolean; message: string }>;
  bulkUpdateProducts: (request: BulkUpdateRequest) => Promise<{ success: boolean; message: string; operationId?: string }>;
  getRecommendations: (productId?: string, categoryId?: number, limit?: number) => Promise<void>;
  getAnalytics: (request: ProductAnalyticsRequest) => Promise<void>;
  clearError: () => void;
  clearCurrentProduct: () => void;
}

export function useProducts(): UseProductsState & UseProductsActions {
  const [state, setState] = useState<UseProductsState>({
    products: [],
    currentProduct: null,
    searchResult: null,
    recommendations: [],
    analytics: null,
    isLoading: false,
    error: null,
  });

  const searchProducts = useCallback(async (filters: ProductSearchFilters): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const searchParams = new URLSearchParams();
      
      // Add filters to search params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            searchParams.set(key, value.join(','));
          } else {
            searchParams.set(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/products?${searchParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search products');
      }

      setState(prev => ({
        ...prev,
        products: data.products,
        searchResult: data,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Search products error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to search products',
      }));
    }
  }, []);

  const getProduct = useCallback(async (id: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`/api/products/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get product');
      }

      setState(prev => ({
        ...prev,
        currentProduct: data.product,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Get product error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get product',
      }));
    }
  }, []);

  const createProduct = useCallback(async (product: CreateProductRequest): Promise<{ success: boolean; message: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const formData = new FormData();
      
      // Add product data to form data
      Object.entries(product).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'files' || key === 'images') {
            // Handle file arrays
            if (Array.isArray(value)) {
              value.forEach((file, index) => {
                formData.append(`${key}[${index}]`, file);
              });
            }
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        products: [data.product, ...prev.products],
      }));

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Create product error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create product',
      }));
      return { success: false, message: error instanceof Error ? error.message : 'Failed to create product' };
    }
  }, []);

  const updateProduct = useCallback(async (id: string, updates: UpdateProductRequest): Promise<{ success: boolean; message: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const formData = new FormData();
      
      // Add updates to form data
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'files' || key === 'images') {
            // Handle file arrays
            if (Array.isArray(value)) {
              value.forEach((file, index) => {
                formData.append(`${key}[${index}]`, file);
              });
            }
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        products: prev.products.map(p => p.id === id ? data.product : p),
        currentProduct: prev.currentProduct?.id === id ? data.product : prev.currentProduct,
      }));

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Update product error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update product',
      }));
      return { success: false, message: error instanceof Error ? error.message : 'Failed to update product' };
    }
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        products: prev.products.filter(p => p.id !== id),
        currentProduct: prev.currentProduct?.id === id ? null : prev.currentProduct,
      }));

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Delete product error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete product',
      }));
      return { success: false, message: error instanceof Error ? error.message : 'Failed to delete product' };
    }
  }, []);

  const createProductVersion = useCallback(async (productId: string, version: ProductVersionRequest): Promise<{ success: boolean; message: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const formData = new FormData();
      formData.append('version', version.version);
      formData.append('changelog', version.changelog);
      formData.append('file', version.file);

      const response = await fetch(`/api/products/${productId}/versions`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product version');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
      }));

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Create product version error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create product version',
      }));
      return { success: false, message: error instanceof Error ? error.message : 'Failed to create product version' };
    }
  }, []);

  const bulkUpdateProducts = useCallback(async (request: BulkUpdateRequest): Promise<{ success: boolean; message: string; operationId?: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation_type: 'update',
          product_ids: request.product_ids,
          parameters: request.updates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bulk operation');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
      }));

      return { success: true, message: data.message, operationId: data.operation_id };
    } catch (error) {
      console.error('Bulk update products error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create bulk operation',
      }));
      return { success: false, message: error instanceof Error ? error.message : 'Failed to create bulk operation' };
    }
  }, []);

  const getRecommendations = useCallback(async (productId?: string, categoryId?: number, limit: number = 10): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const searchParams = new URLSearchParams();
      if (productId) searchParams.set('product_id', productId);
      if (categoryId) searchParams.set('category_id', categoryId.toString());
      searchParams.set('limit', limit.toString());

      const response = await fetch(`/api/products/recommendations?${searchParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get recommendations');
      }

      setState(prev => ({
        ...prev,
        recommendations: data.recommendations,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Get recommendations error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get recommendations',
      }));
    }
  }, []);

  const getAnalytics = useCallback(async (request: ProductAnalyticsRequest): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const searchParams = new URLSearchParams();
      searchParams.set('product_id', request.product_id);
      searchParams.set('period', request.period);
      if (request.start_date) searchParams.set('start_date', request.start_date);
      if (request.end_date) searchParams.set('end_date', request.end_date);

      const response = await fetch(`/api/products/analytics?${searchParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get analytics');
      }

      setState(prev => ({
        ...prev,
        analytics: data.analytics,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Get analytics error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics',
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearCurrentProduct = useCallback(() => {
    setState(prev => ({ ...prev, currentProduct: null }));
  }, []);

  return {
    ...state,
    searchProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductVersion,
    bulkUpdateProducts,
    getRecommendations,
    getAnalytics,
    clearError,
    clearCurrentProduct,
  };
}
