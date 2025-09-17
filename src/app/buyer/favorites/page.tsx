'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Grid3X3, List, Search, Filter, SortAsc, SortDesc, Trash2 } from 'lucide-react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'title';

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { favorites, loading, error, loadFavorites, removeFromList, getFavoritesList } = useFavorites();
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router]);

  // Load favorites on mount
  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user, loadFavorites]);

  // Filter and sort favorites
  const filteredAndSortedFavorites = React.useMemo(() => {
    const filtered = favorites.filter(item => {
      const product = item.product;
      if (!product) return false;
      
      if (searchQuery) {
        return product.title.toLowerCase().includes(searchQuery.toLowerCase());
      }
      
      return true;
    });

    // Sort favorites
    filtered.sort((a, b) => {
      const productA = a.product;
      const productB = b.product;
      
      if (!productA || !productB) return 0;

      switch (sortBy) {
        case 'newest':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        case 'oldest':
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case 'price-low':
          return productA.price - productB.price;
        case 'price-high':
          return productB.price - productA.price;
        case 'title':
          return productA.title.localeCompare(productB.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [favorites, searchQuery, sortBy]);

  const handleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedFavorites.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedFavorites.map(item => item.product_id)));
    }
  };

  const handleSelectItem = (productId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedItems(newSelected);
  };

  const handleRemoveSelected = async () => {
    const favoritesList = getFavoritesList();
    if (!favoritesList) return;

    const promises = Array.from(selectedItems).map(productId =>
      removeFromList(favoritesList.id, productId)
    );

    await Promise.all(promises);
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const handleRemoveSingle = async (productId: string) => {
    const favoritesList = getFavoritesList();
    if (!favoritesList) return;

    await removeFromList(favoritesList.id, productId);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg">
            <Heart className="w-6 h-6 text-red-600 fill-current" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
            <p className="text-gray-600">
              {favorites.length} {favorites.length === 1 ? 'product' : 'products'} in your favorites
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => router.push('/buyer/lists')}
          className="hidden md:flex"
        >
          <List className="w-4 h-4 mr-2" />
          Manage Lists
        </Button>
      </div>

      {favorites.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto">
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
            <CardTitle className="text-xl">No favorites yet</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Start exploring products and add them to your favorites by clicking the heart icon.
            </CardDescription>
            <Button onClick={() => router.push('/')} className="mt-4">
              Browse Products
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Controls */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search favorites..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="title">Title A-Z</option>
                  </Select>

                  {/* View Mode */}
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Selection Mode */}
                  <Button
                    variant={isSelectionMode ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedItems(new Set());
                    }}
                  >
                    Select
                  </Button>
                </div>
              </div>

              {/* Selection Controls */}
              {isSelectionMode && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        {selectedItems.size === filteredAndSortedFavorites.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      
                      {selectedItems.size > 0 && (
                        <Badge variant="secondary">
                          {selectedItems.size} selected
                        </Badge>
                      )}
                    </div>

                    {selectedItems.size > 0 && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleRemoveSelected}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Selected
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {filteredAndSortedFavorites.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-gray-600">No products match your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
                  : 'space-y-4'
              )}
            >
              {filteredAndSortedFavorites.map((item) => {
                const product = item.product;
                if (!product) return null;

                return (
                  <div key={item.id} className="relative">
                    {isSelectionMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(product.id)}
                          onChange={() => handleSelectItem(product.id)}
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
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
                      showQuickActions={!isSelectionMode}
                      className={cn(
                        viewMode === 'list' && 'flex flex-row items-center space-x-4 p-4',
                        isSelectionMode && 'cursor-pointer hover:bg-gray-50'
                      )}
                    />
                    
                    {/* Added date for list view */}
                    {viewMode === 'list' && (
                      <div className="ml-auto text-sm text-gray-500">
                        Added {new Date(item.added_at).toLocaleDateString()}
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
