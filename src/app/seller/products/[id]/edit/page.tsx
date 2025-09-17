'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Package, Save, Eye, Trash2, AlertTriangle, Copy, BarChart3, CheckCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductForm } from '@/components/seller/ProductForm';
import { StatsCard } from '@/components/seller/StatsCard';
import { useAuthContext } from '@/contexts/AuthContext';
import { Product, UpdateProductRequest } from '@/types/product';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

interface ProductStats {
  view_count: number;
  download_count: number;
  purchase_count: number;
  total_revenue: number;
  average_rating: number;
  review_count: number;
  conversion_rate: number;
  last_sale_at?: string;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productId, setProductId] = useState<string>('');

  const isNewlyCreated = searchParams.get('created') === 'true';

  useEffect(() => {
    const getProductId = async () => {
      const resolvedParams = await params;
      setProductId(resolvedParams.id);
    };
    getProductId();
  }, [params]);

  useEffect(() => {
    if (productId && user) {
      loadProduct();
      loadProductStats();
    }
  }, [productId, user]);

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/seller/products/${productId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load product');
      }

      setProduct(data.product);
      
      if (isNewlyCreated) {
        toast.success('Product created successfully! You can now customize it further.');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product details');
      router.push('/seller/products');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductStats = async () => {
    try {
      const response = await fetch(`/api/seller/products/${productId}/analytics`);
      const data = await response.json();
      
      if (response.ok) {
        setProductStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading product stats:', error);
    }
  };

  const handleUpdateProduct = async (productData: UpdateProductRequest) => {
    try {
      setIsSaving(true);

      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add basic product data
      if (productData.title) formData.append('title', productData.title);
      if (productData.short_description) formData.append('short_description', productData.short_description);
      if (productData.description) formData.append('description', productData.description);
      if (productData.price !== undefined) formData.append('price', productData.price.toString());
      if (productData.sale_price !== undefined) formData.append('sale_price', productData.sale_price.toString());
      if (productData.currency) formData.append('currency', productData.currency);
      if (productData.category_id) formData.append('category_id', productData.category_id.toString());
      if (productData.is_digital !== undefined) formData.append('is_digital', productData.is_digital.toString());
      if (productData.is_downloadable !== undefined) formData.append('is_downloadable', productData.is_downloadable.toString());
      if (productData.download_limit) formData.append('download_limit', productData.download_limit.toString());
      if (productData.download_expiry_days) formData.append('download_expiry_days', productData.download_expiry_days.toString());
      
      // Add tags
      if (productData.tags) {
        formData.append('tags', productData.tags.join(','));
      }
      
      // Add SEO data
      if (productData.seo) {
        formData.append('seo', JSON.stringify(productData.seo));
      }
      
      // Add files
      if (productData.files) {
        productData.files.forEach((file, index) => {
          formData.append(`files[${index}]`, file);
        });
      }
      
      // Add images
      if (productData.images) {
        productData.images.forEach((image, index) => {
          formData.append(`images[${index}]`, image);
        });
      }

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      setProduct(data.product);
      toast.success('Product updated successfully!');
      
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.title}"? This action cannot be undone and will remove the product from all customer carts and wishlists.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete product');
      }

      toast.success('Product deleted successfully');
      router.push('/seller/products');
      
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateProduct = async () => {
    if (!product) return;

    try {
      const response = await fetch(`/api/seller/products/${productId}/duplicate`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Product duplicated successfully');
        router.push(`/seller/products/${data.product.id}/edit`);
      } else {
        throw new Error('Failed to duplicate product');
      }
    } catch (error) {
      console.error('Error duplicating product:', error);
      toast.error('Failed to duplicate product');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!product) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update product status');
      }

      setProduct(prev => prev ? { ...prev, status: newStatus as any } : null);
      toast.success(`Product ${newStatus === 'active' ? 'published' : newStatus} successfully`);
      
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Failed to update product status');
    }
  };

  const handleViewProduct = () => {
    if (product) {
      window.open(`/products/${product.slug}`, '_blank');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Product not found</h2>
          <p className="text-gray-600 mb-4">The product you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Button onClick={() => router.push('/seller/products')}>
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
                  <Badge className={getStatusColor(product.status)}>
                    {product.status}
                  </Badge>
                </div>
                <p className="text-gray-600">
                  Update your product details and settings
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleViewProduct}
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>View Product</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleDuplicateProduct}
                className="flex items-center space-x-2"
              >
                <Copy className="h-4 w-4" />
                <span>Duplicate</span>
              </Button>

              {product.status === 'draft' && (
                <Button
                  onClick={() => handleStatusChange('active')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Publish</span>
                </Button>
              )}

              {product.status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('inactive')}
                  className="flex items-center space-x-2"
                >
                  <Package className="h-4 w-4" />
                  <span>Unpublish</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Product Form */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="edit" className="space-y-6">
              <TabsList>
                <TabsTrigger value="edit">Edit Product</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="edit">
                {/* Status Warning */}
                {product.status === 'draft' && (
                  <Card className="bg-yellow-50 border-yellow-200 mb-6">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-900">
                            Product is in Draft Mode
                          </h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            This product is not visible to customers. Publish it to make it available for purchase.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange('active')}
                            className="mt-2 bg-yellow-600 hover:bg-yellow-700"
                          >
                            Publish Product
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProductForm
                      mode="edit"
                      initialData={{
                        title: product.title,
                        short_description: product.short_description,
                        description: product.description,
                        price: product.price,
                        sale_price: product.sale_price,
                        currency: product.currency,
                        category_id: product.category_id,
                        shop_id: product.shop_id,
                        tags: product.tags,
                        is_digital: product.is_digital,
                        is_downloadable: product.is_downloadable,
                        download_limit: product.download_limit,
                        download_expiry_days: product.download_expiry_days,
                        thumbnail_url: product.images?.[0]?.image_url,
                        file_url: product.files?.[0]?.file_url,
                        seo: product.seo,
                      }}
                      onSubmit={handleUpdateProduct}
                      onCancel={() => router.push('/seller/products')}
                      isLoading={isSaving}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                {productStats ? (
                  <div className="space-y-6">
                    {/* Performance Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatsCard
                        stat={{
                          label: 'Total Views',
                          value: productStats.view_count,
                          icon: Eye,
                          color: 'blue',
                          format: 'number',
                        }}
                        variant="compact"
                      />
                      
                      <StatsCard
                        stat={{
                          label: 'Total Sales',
                          value: productStats.purchase_count,
                          icon: Package,
                          color: 'green',
                          format: 'number',
                        }}
                        variant="compact"
                      />
                      
                      <StatsCard
                        stat={{
                          label: 'Revenue',
                          value: productStats.total_revenue,
                          icon: DollarSign,
                          color: 'purple',
                          format: 'currency',
                        }}
                        variant="compact"
                      />
                      
                      <StatsCard
                        stat={{
                          label: 'Conversion Rate',
                          value: productStats.conversion_rate,
                          icon: BarChart3,
                          color: 'yellow',
                          format: 'percentage',
                        }}
                        variant="compact"
                      />
                    </div>

                    {/* Additional Analytics */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Customer Engagement</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Downloads</span>
                                <span className="text-sm font-medium">{productStats.download_count}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Reviews</span>
                                <span className="text-sm font-medium">{productStats.review_count}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Average Rating</span>
                                <span className="text-sm font-medium">{productStats.average_rating.toFixed(1)}★</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Sales Information</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Revenue</span>
                                <span className="text-sm font-medium">${productStats.total_revenue.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Avg. Sale Price</span>
                                <span className="text-sm font-medium">
                                  ${productStats.purchase_count > 0 ? (productStats.total_revenue / productStats.purchase_count).toFixed(2) : '0.00'}
                                </span>
                              </div>
                              {productStats.last_sale_at && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Last Sale</span>
                                  <span className="text-sm font-medium">
                                    {new Date(productStats.last_sale_at).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
                    <p className="text-gray-600">
                      Analytics will be available once your product starts receiving views and sales.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Quick Stats */}
              {productStats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Views</span>
                      <span className="font-medium">{productStats.view_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sales</span>
                      <span className="font-medium">{productStats.purchase_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Revenue</span>
                      <span className="font-medium">${productStats.total_revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rating</span>
                      <span className="font-medium">{productStats.average_rating.toFixed(1)}★</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleViewProduct}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Live Product
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleDuplicateProduct}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Product
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push(`/seller/products/${productId}/analytics`)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Detailed Analytics
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-base text-red-900">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:border-red-600"
                      onClick={handleDeleteProduct}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete Product
                    </Button>
                    <p className="text-xs text-gray-500">
                      This action cannot be undone and will remove the product from all customer carts.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
