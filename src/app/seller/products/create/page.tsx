'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, CheckCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductForm } from '@/components/seller/ProductForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { CreateProductRequest, UpdateProductRequest } from '@/types/product';
import toast from 'react-hot-toast';

export default function CreateProductPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateProduct = async (productData: CreateProductRequest | UpdateProductRequest) => {
    try {
      setIsLoading(true);

      // Type guard: ensure we have required fields for creation
      if (!productData.title || !productData.description || !productData.short_description || !productData.price || !productData.currency || !productData.product_type) {
        throw new Error('Missing required fields for product creation');
      }

      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add basic product data
      formData.append('title', productData.title);
      formData.append('short_description', productData.short_description);
      formData.append('description', productData.description);
      formData.append('price', productData.price.toString());
      if (productData.sale_price) formData.append('sale_price', productData.sale_price.toString());
      formData.append('currency', productData.currency);
      if (productData.category_id) formData.append('category_id', productData.category_id.toString());
      if ('shop_id' in productData && productData.shop_id) formData.append('shop_id', productData.shop_id);
      formData.append('product_type', productData.product_type);
      formData.append('is_digital', (productData.is_digital ?? false).toString());
      formData.append('is_downloadable', (productData.is_downloadable ?? false).toString());
      if (productData.download_limit) formData.append('download_limit', productData.download_limit.toString());
      if (productData.download_expiry_days) formData.append('download_expiry_days', productData.download_expiry_days.toString());
      
      // Add tags
      if (productData.tags && productData.tags.length > 0) {
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

      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      toast.success('Product created successfully!');
      
      // Redirect to the new product's edit page
      router.push(`/seller/products/${data.product.id}/edit?created=true`);
      
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    const hasChanges = false; // Could track form changes
    if (hasChanges) {
      const confirmed = window.confirm('Are you sure you want to cancel? Your changes will be lost.');
      if (!confirmed) return;
    }
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Product</h1>
              <p className="text-gray-600">
                Add a new digital product to your shop
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Getting Started Guide */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Package className="h-5 w-5" />
                <span>Creating Your Digital Product</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Write a compelling title and description</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Set competitive pricing for your market</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Upload your digital files and preview images</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Optimize SEO settings for better discoverability</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Form */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductForm
                mode="create"
                onSubmit={handleCreateProduct}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Success Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <span>Tips for Success</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Title Best Practices</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Include relevant keywords customers search for</li>
                    <li>• Keep it under 100 characters for better display</li>
                    <li>• Mention the main benefit or feature</li>
                    <li>• Avoid excessive capitalization or special characters</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description Guidelines</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Clearly explain what the customer gets</li>
                    <li>• List key features and benefits</li>
                    <li>• Include usage instructions or requirements</li>
                    <li>• Use bullet points for easy scanning</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Pricing Strategy</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Research competitor pricing in your category</li>
                    <li>• Consider offering launch discounts</li>
                    <li>• Price based on value, not just cost</li>
                    <li>• Test different price points over time</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">File Preparation</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Ensure files are properly organized and named</li>
                    <li>• Include README or instruction files</li>
                    <li>• Test files before uploading</li>
                    <li>• Consider file size for download speed</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
