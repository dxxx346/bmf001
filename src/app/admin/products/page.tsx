'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { adminService, ProductModeration } from '@/services/admin.service';
import { ModerationQueue, ModerationFilters } from '@/components/admin/ModerationQueue';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [products, setProducts] = useState<ProductModeration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<ModerationFilters>({});
  
  const productsPerPage = 50;

  // Check admin authorization
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Load products data
  const loadProducts = useCallback(async (page: number = 1, productFilters: ModerationFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await adminService.getProductsForModeration(page, productsPerPage, {
        status: productFilters.status,
        flagged: productFilters.flagged,
      });
      
      if (result) {
        setProducts(result.products);
        setTotalProducts(result.total);
        setTotalPages(Math.ceil(result.total / productsPerPage));
        setCurrentPage(page);
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user?.role === 'admin') {
      loadProducts(1, filters);
    }
  }, [user, loadProducts, filters]);

  // Handle moderation actions
  const handleModerationAction = async (productId: string, action: string, notes?: string) => {
    if (!user) return;

    try {
      let success = false;
      let message = '';

      switch (action) {
        case 'approve':
          success = await adminService.moderateProduct(productId, 'approve', user.id, notes);
          message = success ? 'Product approved successfully' : 'Failed to approve product';
          break;
          
        case 'reject':
          success = await adminService.moderateProduct(productId, 'reject', user.id, notes);
          message = success ? 'Product rejected successfully' : 'Failed to reject product';
          break;
          
        case 'flag':
          success = await adminService.moderateProduct(productId, 'flag', user.id, notes);
          message = success ? 'Product flagged successfully' : 'Failed to flag product';
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (success) {
        toast.success(message);
        // Reload products to reflect changes
        await loadProducts(currentPage, filters);
      } else {
        toast.error(message);
      }
    } catch (err) {
      console.error('Error performing moderation action:', err);
      toast.error('Failed to perform moderation action');
    }
  };

  // Handle search
  const handleSearch = useCallback((query: string) => {
    const newFilters = { ...filters, search: query || undefined };
    setFilters(newFilters);
    loadProducts(1, newFilters);
  }, [filters, loadProducts]);

  // Handle filters
  const handleFilter = useCallback((newFilters: ModerationFilters) => {
    setFilters(newFilters);
    loadProducts(1, newFilters);
  }, [loadProducts]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadProducts(currentPage, filters);
  }, [loadProducts, currentPage, filters]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    loadProducts(page, filters);
  }, [loadProducts, filters]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (error && !products.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorMessage title="Error Loading Products" message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Moderation</h1>
            <p className="text-gray-600 mt-1">
              Review and moderate product listings
            </p>
          </div>
        </div>

        {/* Moderation Queue */}
        <ModerationQueue
          products={products}
          loading={loading}
          onModerationAction={handleModerationAction}
          onRefresh={handleRefresh}
          onSearch={handleSearch}
          onFilter={handleFilter}
          totalProducts={totalProducts}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
