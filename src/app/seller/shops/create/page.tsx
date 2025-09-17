'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Store, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShopForm } from '@/components/seller/ShopForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { CreateShopRequest, UpdateShopRequest } from '@/types/shop';
import toast from 'react-hot-toast';

export default function CreateShopPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateShop = async (shopData: CreateShopRequest | UpdateShopRequest) => {
    try {
      setIsLoading(true);

      // Ensure required fields for creation
      if (!shopData.name) {
        throw new Error('Shop name is required');
      }

      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add basic shop data
      formData.append('name', shopData.name);
      if (shopData.description) formData.append('description', shopData.description);
      if (shopData.website_url) formData.append('website_url', shopData.website_url);
      if (shopData.contact_email) formData.append('contact_email', shopData.contact_email);
      
      // Add files
      if (shopData.logo) formData.append('logo', shopData.logo);
      if (shopData.banner) formData.append('banner', shopData.banner);
      
      // Add settings as JSON
      if (shopData.settings) {
        formData.append('settings', JSON.stringify(shopData.settings));
      }

      const response = await fetch('/api/seller/shops', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shop');
      }

      toast.success('Shop created successfully!');
      
      // Redirect to the new shop's edit page or shops list
      router.push(`/seller/shops/${data.shop.id}/edit?created=true`);
      
    } catch (error) {
      console.error('Error creating shop:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create shop');
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
              <h1 className="text-2xl font-bold text-gray-900">Create New Shop</h1>
              <p className="text-gray-600">
                Set up your shop to start selling digital products
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
                <Store className="h-5 w-5" />
                <span>Getting Started</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Choose a memorable shop name and description</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Upload a professional logo and banner (optional)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Set up your shop's branding and social links</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Configure SEO settings for better discoverability</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shop Form */}
          <Card>
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ShopForm
                mode="create"
                onSubmit={handleCreateShop}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Tips and Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Shop Success Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Shop Name Best Practices</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Keep it short and memorable (2-50 characters)</li>
                    <li>• Make it relevant to your products</li>
                    <li>• Avoid special characters or numbers</li>
                    <li>• Check if the name is already taken</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description Guidelines</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Clearly explain what you sell</li>
                    <li>• Highlight your unique value proposition</li>
                    <li>• Keep it under 500 characters</li>
                    <li>• Use keywords customers might search for</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Visual Branding</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Logo: 200x200px, PNG or JPG format</li>
                    <li>• Banner: 1200x400px for best quality</li>
                    <li>• Use consistent colors across your brand</li>
                    <li>• Ensure images are under 5MB each</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">SEO Optimization</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Meta title: 50-60 characters with keywords</li>
                    <li>• Meta description: 150-160 characters</li>
                    <li>• Use relevant keywords in your content</li>
                    <li>• Keep URLs clean and descriptive</li>
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
