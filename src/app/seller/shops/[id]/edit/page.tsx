'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Store, Save, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShopForm } from '@/components/seller/ShopForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { Shop, UpdateShopRequest } from '@/types/shop';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface EditShopPageProps {
  params: Promise<{ id: string }>;
}

export default function EditShopPage({ params }: EditShopPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shopId, setShopId] = useState<string>('');

  const isNewlyCreated = searchParams.get('created') === 'true';

  useEffect(() => {
    const getShopId = async () => {
      const resolvedParams = await params;
      setShopId(resolvedParams.id);
    };
    getShopId();
  }, [params]);

  useEffect(() => {
    if (shopId && user) {
      loadShop();
    }
  }, [shopId, user]);

  const loadShop = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/seller/shops/${shopId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load shop');
      }

      setShop(data.shop);
      
      if (isNewlyCreated) {
        toast.success('Shop created successfully! You can now customize it further.');
      }
    } catch (error) {
      console.error('Error loading shop:', error);
      toast.error('Failed to load shop details');
      router.push('/seller/shops');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateShop = async (shopData: UpdateShopRequest) => {
    try {
      setIsSaving(true);

      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add basic shop data
      if (shopData.name) formData.append('name', shopData.name);
      if (shopData.description) formData.append('description', shopData.description);
      if (shopData.website_url) formData.append('website_url', shopData.website_url);
      if (shopData.contact_email) formData.append('contact_email', shopData.contact_email);
      if (shopData.is_active !== undefined) formData.append('is_active', shopData.is_active.toString());
      
      // Add files
      if (shopData.logo) formData.append('logo', shopData.logo);
      if (shopData.banner) formData.append('banner', shopData.banner);
      
      // Add settings as JSON
      if (shopData.settings) {
        formData.append('settings', JSON.stringify(shopData.settings));
      }

      const response = await fetch(`/api/seller/shops/${shopId}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update shop');
      }

      setShop(data.shop);
      toast.success('Shop updated successfully!');
      
    } catch (error) {
      console.error('Error updating shop:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update shop');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShop = async () => {
    if (!shop) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${shop.name}"? This action cannot be undone and will also delete all associated products and data.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/seller/shops/${shopId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete shop');
      }

      toast.success('Shop deleted successfully');
      router.push('/seller/shops');
      
    } catch (error) {
      console.error('Error deleting shop:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete shop');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!shop) return;

    try {
      const newStatus = !shop.is_active;
      
      const response = await fetch(`/api/seller/shops/${shopId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update shop status');
      }

      setShop(prev => prev ? { ...prev, is_active: newStatus } : null);
      toast.success(`Shop ${newStatus ? 'activated' : 'deactivated'} successfully`);
      
    } catch (error) {
      console.error('Error toggling shop status:', error);
      toast.error('Failed to update shop status');
    }
  };

  const handleViewShop = () => {
    if (shop) {
      window.open(`/shops/${shop.slug}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shop details...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Shop not found</h2>
          <p className="text-gray-600 mb-4">The shop you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Button onClick={() => router.push('/seller/shops')}>
            Back to Shops
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                  <h1 className="text-2xl font-bold text-gray-900">Edit Shop</h1>
                  <Badge
                    variant={shop.is_active ? "secondary" : "danger"}
                    className={shop.is_active ? "bg-green-100 text-green-800" : ""}
                  >
                    {shop.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-gray-600">
                  Update your shop details and settings
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleViewShop}
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>View Shop</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleToggleStatus}
                className={cn(
                  'flex items-center space-x-2',
                  !shop.is_active && 'text-green-600 hover:text-green-700'
                )}
              >
                <Store className="h-4 w-4" />
                <span>{shop.is_active ? 'Deactivate' : 'Activate'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Status Warning */}
          {!shop.is_active && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">
                      Shop is Currently Inactive
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your shop is not visible to customers. Activate it to start receiving orders and appearing in search results.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleToggleStatus}
                      className="mt-2 bg-yellow-600 hover:bg-yellow-700"
                    >
                      Activate Shop
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shop Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Shop Preview</span>
                <Button variant="outline" size="sm" onClick={handleViewShop}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Live Shop
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg relative overflow-hidden">
                  {shop.banner_url && (
                    <img
                      src={shop.banner_url}
                      alt={`${shop.name} banner`}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-4 left-4 flex items-center space-x-3">
                    <div className="h-12 w-12 bg-white rounded-lg border-2 border-white overflow-hidden">
                      {shop.logo_url ? (
                        <img
                          src={shop.logo_url}
                          alt={`${shop.name} logo`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-100">
                          <Store className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{shop.name}</h3>
                      <p className="text-white/80 text-sm">
                        /shops/{shop.slug}
                      </p>
                    </div>
                  </div>
                </div>
                
                {shop.description && (
                  <p className="text-gray-600">{shop.description}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shop Form */}
          <Card>
            <CardHeader>
              <CardTitle>Shop Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <ShopForm
                mode="edit"
                initialData={{
                  name: shop.name,
                  description: shop.description,
                  logo_url: shop.logo_url,
                  banner_url: shop.banner_url,
                  website_url: shop.website_url,
                  contact_email: shop.contact_email,
                  settings: shop.settings,
                }}
                onSubmit={handleUpdateShop}
                onCancel={() => router.push('/seller/shops')}
                isLoading={isSaving}
              />
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-red-900">Delete Shop</h4>
                    <p className="text-sm text-red-700">
                      Permanently delete this shop and all associated products. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={handleDeleteShop}
                    disabled={isDeleting}
                    className="flex items-center space-x-2"
                  >
                    {isDeleting ? (
                      <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>Delete Shop</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
