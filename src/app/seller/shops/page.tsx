'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Store, 
  Edit, 
  Eye, 
  MoreVertical,
  Package,
  DollarSign,
  Star,
  Users,
  Settings,
  Trash2,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/contexts/AuthContext';
import { Shop } from '@/types/shop';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ShopWithStats extends Shop {
  stats: {
    product_count: number;
    total_sales: number;
    total_revenue: number;
    average_rating: number;
    review_count: number;
    last_sale_at?: string;
  };
}

export default function SellerShopsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [shops, setShops] = useState<ShopWithStats[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'revenue' | 'sales'>('created_at');

  useEffect(() => {
    if (user) {
      loadShops();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortShops();
  }, [shops, searchQuery, filterStatus, sortBy]);

  const loadShops = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/seller/shops');
      const data = await response.json();
      
      if (response.ok) {
        setShops(data.shops || []);
      } else {
        throw new Error(data.error || 'Failed to load shops');
      }
    } catch (error) {
      console.error('Error loading shops:', error);
      toast.error('Failed to load shops');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortShops = () => {
    let filtered = [...shops];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(shop =>
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(shop =>
        filterStatus === 'active' ? shop.is_active : !shop.is_active
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'revenue':
          return b.stats.total_revenue - a.stats.total_revenue;
        case 'sales':
          return b.stats.total_sales - a.stats.total_sales;
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredShops(filtered);
  };

  const handleCreateShop = () => {
    router.push('/seller/shops/create');
  };

  const handleEditShop = (shopId: string) => {
    router.push(`/seller/shops/${shopId}/edit`);
  };

  const handleViewShop = (shop: Shop) => {
    window.open(`/shops/${shop.slug}`, '_blank');
  };

  const handleToggleShopStatus = async (shopId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/seller/shops/${shopId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (response.ok) {
        setShops(prevShops =>
          prevShops.map(shop =>
            shop.id === shopId ? { ...shop, is_active: !currentStatus } : shop
          )
        );
        toast.success(`Shop ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        throw new Error('Failed to update shop status');
      }
    } catch (error) {
      console.error('Error toggling shop status:', error);
      toast.error('Failed to update shop status');
    }
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${shopName}"? This action cannot be undone and will also delete all associated products.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/seller/shops/${shopId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShops(prevShops => prevShops.filter(shop => shop.id !== shopId));
        toast.success('Shop deleted successfully');
      } else {
        throw new Error('Failed to delete shop');
      }
    } catch (error) {
      console.error('Error deleting shop:', error);
      toast.error('Failed to delete shop');
    }
  };

  const renderShopCard = (shop: ShopWithStats) => (
    <Card key={shop.id} className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Shop Banner */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
        {shop.banner_url ? (
          <img
            src={shop.banner_url}
            alt={`${shop.name} banner`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-blue-500 to-purple-600" />
        )}
        
        {/* Shop Logo */}
        <div className="absolute bottom-4 left-4">
          <div className="h-16 w-16 bg-white rounded-lg border-2 border-white overflow-hidden">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={`${shop.name} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-100">
                <Store className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Badge
            variant={shop.is_active ? "secondary" : "danger"}
            className={shop.is_active ? "bg-green-100 text-green-800" : ""}
          >
            {shop.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Actions Dropdown */}
        <div className="absolute bottom-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewShop(shop)}>
                <Eye className="h-4 w-4 mr-2" />
                View Shop
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditShop(shop.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Shop
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleShopStatus(shop.id, shop.is_active)}>
                <Settings className="h-4 w-4 mr-2" />
                {shop.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDeleteShop(shop.id, shop.name)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Shop
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Shop Info */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {shop.name}
          </h3>
          {shop.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {shop.description}
            </p>
          )}
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span>Created {new Date(shop.created_at).toLocaleDateString()}</span>
            {shop.website_url && (
              <a
                href={shop.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>

        {/* Shop Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Package className="h-5 w-5 text-gray-600 mx-auto mb-1" />
            <p className="text-lg font-semibold text-gray-900">{shop.stats.product_count}</p>
            <p className="text-xs text-gray-600">Products</p>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-semibold text-gray-900">
              ${shop.stats.total_revenue.toFixed(0)}
            </p>
            <p className="text-xs text-gray-600">Revenue</p>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Star className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
            <p className="text-lg font-semibold text-gray-900">
              {shop.stats.average_rating.toFixed(1)}
            </p>
            <p className="text-xs text-gray-600">Rating</p>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-semibold text-gray-900">{shop.stats.total_sales}</p>
            <p className="text-xs text-gray-600">Sales</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewShop(shop)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditShop(shop.id)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = () => (
    <div className="text-center py-16">
      <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Store className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No shops yet</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Create your first shop to start selling digital products. You can manage multiple shops from this dashboard.
      </p>
      <Button onClick={handleCreateShop} size="lg">
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Shop
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Shops</h1>
              <p className="text-gray-600">
                Manage your shops and track their performance
              </p>
            </div>
            
            <Button onClick={handleCreateShop}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Shop
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      {shops.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search shops..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-3">
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Newest First</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="revenue">Highest Revenue</SelectItem>
                    <SelectItem value="sales">Most Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-32 bg-gray-200 animate-pulse" />
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="h-16 bg-gray-200 rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          shops.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="text-center py-16">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No shops found</h3>
              <p className="text-gray-600 mb-4">
                No shops match your current search and filter criteria.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredShops.length} of {shops.length} shops
              </p>
              
              {searchQuery && (
                <Badge variant="outline">
                  Filtered by: "{searchQuery}"
                </Badge>
              )}
            </div>

            {/* Shops Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredShops.map(renderShopCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
