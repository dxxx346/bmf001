'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  Eye,
  MoreVertical,
  Link,
  QrCode,
  BarChart3,
  Search,
  Filter,
  Grid,
  List,
  ExternalLink,
  Check,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReferralLink {
  id: string;
  name: string;
  code: string;
  url: string;
  short_url: string;
  type: 'product' | 'shop' | 'general';
  target_id?: string;
  target_name?: string;
  commission_rate: number;
  clicks: number;
  conversions: number;
  earnings: number;
  conversion_rate: number;
  status: 'active' | 'paused' | 'expired';
  created_at: string;
  last_click_at?: string;
}

type ViewMode = 'grid' | 'table';
type FilterStatus = 'all' | 'active' | 'paused' | 'expired';
type SortBy = 'created_at' | 'name' | 'clicks' | 'conversions' | 'earnings' | 'conversion_rate';

export default function PartnerLinksPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<ReferralLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadLinks();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortLinks();
  }, [links, searchQuery, filterStatus, sortBy]);

  const loadLinks = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/partner/links');
      const data = await response.json();
      
      if (response.ok) {
        setLinks(data.links || []);
      } else {
        throw new Error(data.error || 'Failed to load links');
      }
    } catch (error) {
      console.error('Error loading links:', error);
      toast.error('Failed to load referral links');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortLinks = () => {
    let filtered = [...links];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(link =>
        link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.target_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(link => link.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'clicks':
          return b.clicks - a.clicks;
        case 'conversions':
          return b.conversions - a.conversions;
        case 'earnings':
          return b.earnings - a.earnings;
        case 'conversion_rate':
          return b.conversion_rate - a.conversion_rate;
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredLinks(filtered);
  };

  const copyToClipboard = async (text: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(linkId);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleEditLink = (linkId: string) => {
    router.push(`/partner/links/${linkId}/edit`);
  };

  const handleViewAnalytics = (linkId: string) => {
    router.push(`/partner/links/${linkId}/analytics`);
  };

  const handleToggleStatus = async (linkId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      const response = await fetch(`/api/partner/links/${linkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setLinks(prevLinks =>
          prevLinks.map(link =>
            link.id === linkId ? { ...link, status: newStatus as any } : link
          )
        );
        toast.success(`Link ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
      } else {
        throw new Error('Failed to update link status');
      }
    } catch (error) {
      console.error('Error updating link status:', error);
      toast.error('Failed to update link status');
    }
  };

  const handleDeleteLink = async (linkId: string, linkName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${linkName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/partner/links/${linkId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLinks(prevLinks => prevLinks.filter(link => link.id !== linkId));
        toast.success('Link deleted successfully');
      } else {
        throw new Error('Failed to delete link');
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Failed to delete link');
    }
  };

  const handleBulkAction = async (action: 'activate' | 'pause' | 'delete') => {
    if (selectedLinks.size === 0) {
      toast.error('No links selected');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${selectedLinks.size} link(s)?`
    );

    if (!confirmed) return;

    try {
      const linkIds = Array.from(selectedLinks);
      
      const response = await fetch('/api/partner/links/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation_type: action,
          link_ids: linkIds,
        }),
      });

      if (response.ok) {
        await loadLinks();
        setSelectedLinks(new Set());
        toast.success(`${selectedLinks.size} link(s) ${action}d successfully`);
      } else {
        throw new Error(`Failed to ${action} links`);
      }
    } catch (error) {
      console.error(`Error ${action}ing links:`, error);
      toast.error(`Failed to ${action} links`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product':
        return '📦';
      case 'shop':
        return '🏪';
      case 'general':
        return '🌐';
      default:
        return '🔗';
    }
  };

  const renderLinkCard = (link: ReferralLink) => (
    <Card key={link.id} className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getTypeIcon(link.type)}</div>
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1">
                {link.name}
              </h3>
              <p className="text-sm text-gray-600">
                Code: {link.code}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(link.status)}>
              {link.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => copyToClipboard(link.short_url, link.id)}>
                  {copiedLink === link.id ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(link.url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewAnalytics(link.id)}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditLink(link.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleStatus(link.id, link.status)}>
                  {link.status === 'active' ? (
                    <>
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Pause Link
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Activate Link
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDeleteLink(link.id, link.name)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Target Info */}
          {link.target_name && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{link.target_name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {link.type.charAt(0).toUpperCase() + link.type.slice(1)} • {link.commission_rate}% commission
              </p>
            </div>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{link.clicks}</div>
              <div className="text-xs text-gray-500">Clicks</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{link.conversions}</div>
              <div className="text-xs text-gray-500">Sales</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {formatCurrency(link.earnings)}
              </div>
              <div className="text-xs text-gray-500">Earned</div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Conversion Rate</span>
            <span className="font-medium text-gray-900">
              {link.conversion_rate.toFixed(1)}%
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(link.short_url, link.id)}
              className="flex-1"
            >
              {copiedLink === link.id ? (
                <Check className="h-4 w-4 mr-1 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewAnalytics(link.id)}
              className="flex-1"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Analytics
            </Button>
          </div>

          {/* Last Activity */}
          <div className="text-xs text-gray-500 text-center">
            Created {new Date(link.created_at).toLocaleDateString()}
            {link.last_click_at && (
              <> • Last click {new Date(link.last_click_at).toLocaleDateString()}</>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLinkTable = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedLinks.size === filteredLinks.length && filteredLinks.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLinks(new Set(filteredLinks.map(l => l.id)));
                      } else {
                        setSelectedLinks(new Set());
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Link
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLinks.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLinks.has(link.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedLinks);
                        if (e.target.checked) {
                          newSelected.add(link.id);
                        } else {
                          newSelected.delete(link.id);
                        }
                        setSelectedLinks(newSelected);
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">{getTypeIcon(link.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {link.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {link.code} • {link.commission_rate}%
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="outline" className="text-xs">
                      {link.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={getStatusColor(link.status)}>
                      {link.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {link.clicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {link.conversions}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(link.earnings)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {link.conversion_rate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(link.short_url, link.id)}
                        className="h-8 w-8"
                      >
                        {copiedLink === link.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(link.url, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewAnalytics(link.id)}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditLink(link.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(link.id, link.status)}>
                            {link.status === 'active' ? 'Pause' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteLink(link.id, link.name)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = () => (
    <div className="text-center py-16">
      <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Link className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No referral links yet</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Create your first referral link to start earning commissions from product and shop referrals.
      </p>
      <Button onClick={() => router.push('/partner/links/create')} size="lg">
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Link
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
              <h1 className="text-2xl font-bold text-gray-900">Referral Links</h1>
              <p className="text-gray-600">
                Manage and track your referral link performance
              </p>
            </div>
            
            <Button onClick={() => router.push('/partner/links/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Link
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-3">
              <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest First</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="clicks">Most Clicks</SelectItem>
                  <SelectItem value="conversions">Most Sales</SelectItem>
                  <SelectItem value="earnings">Highest Earnings</SelectItem>
                  <SelectItem value="conversion_rate">Best Rate</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none border-0"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-none border-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedLinks.size > 0 && (
            <div className="mt-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-sm text-blue-900">
                {selectedLinks.size} link(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkAction('activate')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('pause')}
                >
                  Pause
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedLinks(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="h-12 bg-gray-200 rounded animate-pulse" />
                    <div className="grid grid-cols-3 gap-3">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="text-center space-y-1">
                          <div className="h-6 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          links.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="text-center py-16">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No links found</h3>
              <p className="text-gray-600 mb-4">
                No links match your current search and filter criteria.
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
                Showing {filteredLinks.length} of {links.length} links
              </p>
              
              {searchQuery && (
                <Badge variant="outline">
                  Filtered by: "{searchQuery}"
                </Badge>
              )}
            </div>

            {/* Links Display */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredLinks.map(renderLinkCard)}
              </div>
            ) : (
              renderLinkTable()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
