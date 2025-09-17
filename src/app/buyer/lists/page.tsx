'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { List, Plus, Search, Filter, Grid3X3, Eye, EyeOff, Heart, Trash2, Edit2 } from 'lucide-react';
import { useFavorites, ProductList, ProductListItem } from '@/contexts/FavoritesContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { ListManager } from '@/components/buyer/ListManager';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { cn } from '@/lib/utils';

type ViewMode = 'lists' | 'list-detail';

export default function ProductListsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { 
    lists, 
    loading, 
    error, 
    loadLists, 
    getListItems, 
    removeFromList 
  } = useFavorites();
  
  const [viewMode, setViewMode] = useState<ViewMode>('lists');
  const [selectedList, setSelectedList] = useState<ProductList | null>(null);
  const [listItems, setListItems] = useState<ProductListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router]);

  // Load lists on mount
  useEffect(() => {
    if (user) {
      loadLists();
    }
  }, [user, loadLists]);

  // Load items when a list is selected
  const handleListSelect = async (list: ProductList) => {
    setSelectedList(list);
    setViewMode('list-detail');
    setLoadingItems(true);
    
    try {
      const items = await getListItems(list.id);
      setListItems(items);
    } catch (error) {
      console.error('Error loading list items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleBackToLists = () => {
    setViewMode('lists');
    setSelectedList(null);
    setListItems([]);
    setSearchQuery('');
  };

  const handleRemoveFromList = async (productId: string) => {
    if (!selectedList) return;
    
    const success = await removeFromList(selectedList.id, productId);
    if (success) {
      setListItems(prev => prev.filter(item => item.product_id !== productId));
    }
  };

  // Filter list items based on search
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return listItems;
    
    return listItems.filter(item => {
      const product = item.product;
      if (!product) return false;
      
      return product.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [listItems, searchQuery]);

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      heart: <Heart className="w-4 h-4" />,
      list: <List className="w-4 h-4" />,
      star: <span className="text-sm">⭐</span>,
      bookmark: <span className="text-sm">🔖</span>,
      gift: <span className="text-sm">🎁</span>,
      shopping: <span className="text-sm">🛍️</span>,
      work: <span className="text-sm">💼</span>,
      home: <span className="text-sm">🏠</span>,
    };
    
    return iconMap[iconName] || <span className="text-sm">📝</span>;
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage title="Error" message={error} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {viewMode === 'lists' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <List className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Lists</h1>
                <p className="text-gray-600">
                  Organize your products into custom collections
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => router.push('/buyer/favorites')}
              className="hidden md:flex"
            >
              <Heart className="w-4 h-4 mr-2" />
              View Favorites
            </Button>
          </div>

          {/* Lists Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {lists.map((list) => (
              <Card
                key={list.id}
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                onClick={() => handleListSelect(list)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg text-white"
                        style={{ backgroundColor: list.color }}
                      >
                        {getIconComponent(list.icon)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{list.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {list.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                          {list.is_public ? (
                            <Eye className="w-3 h-3 text-gray-400" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {list.description && (
                    <CardDescription className="mt-2">
                      {list.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{list.item_count || 0} items</span>
                    {list.total_value && (
                      <span>${list.total_value.toFixed(2)}</span>
                    )}
                  </div>
                  
                  {list.last_added && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last updated {new Date(list.last_added).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* List Manager */}
          <Card>
            <CardHeader>
              <CardTitle>Manage Lists</CardTitle>
              <CardDescription>
                Create, edit, and organize your product lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListManager onListSelect={handleListSelect} />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* List Detail Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleBackToLists}
                className="mr-2"
              >
                ← Back to Lists
              </Button>
              
              {selectedList && (
                <>
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-lg text-white"
                    style={{ backgroundColor: selectedList.color }}
                  >
                    {getIconComponent(selectedList.icon)}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                      {selectedList.name}
                      {selectedList.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {selectedList.is_public ? (
                        <Eye className="w-5 h-5 text-gray-400" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      )}
                    </h1>
                    <p className="text-gray-600">
                      {filteredItems.length} {filteredItems.length === 1 ? 'product' : 'products'}
                      {selectedList.description && ` • ${selectedList.description}`}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search and Controls */}
          {listItems.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* List Items */}
          {loadingItems ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto">
                  <List className="w-8 h-8 text-gray-400" />
                </div>
                <CardTitle className="text-xl">
                  {listItems.length === 0 ? 'No products in this list' : 'No products match your search'}
                </CardTitle>
                <CardDescription className="max-w-md mx-auto">
                  {listItems.length === 0 
                    ? 'Start adding products to organize them in this list.'
                    : 'Try adjusting your search terms.'
                  }
                </CardDescription>
                {listItems.length === 0 && (
                  <Button onClick={() => router.push('/')} className="mt-4">
                    Browse Products
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredItems.map((item) => {
                const product = item.product;
                if (!product) return null;

                return (
                  <div key={item.id} className="relative group">
                    <ProductCard
                      product={{
                        id: product.id,
                        title: product.title,
                        price: product.price,
                        thumbnail_url: product.thumbnail_url || null,
                        seller_id: product.seller_id,
                        shop_id: product.shop_id,
                        category_id: null,
                        description: null,
                        file_url: '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      } as any}
                      showQuickActions={false}
                    />
                    
                    {/* Remove from list button */}
                    <Button
                      variant="danger"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveFromList(product.id);
                      }}
                      title="Remove from list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    {/* Added date */}
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      Added {new Date(item.added_at).toLocaleDateString()}
                    </div>
                    
                    {/* Notes if any */}
                    {item.notes && (
                      <div className="mt-1 text-xs text-gray-600 text-center italic">
                        &quot;{item.notes}&quot;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
