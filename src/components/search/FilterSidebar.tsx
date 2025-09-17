'use client';

import { useState } from 'react';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  DollarSign,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ProductCategory } from '@/types/product';
import { SearchFilters } from '@/hooks/useSearch';

interface FilterSidebarProps {
  filters: SearchFilters;
  categories: ProductCategory[];
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onClearFilters: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const FILE_TYPES = [
  { value: 'image', label: 'Images', icon: Image, count: 1234 },
  { value: 'video', label: 'Videos', icon: Video, count: 567 },
  { value: 'audio', label: 'Audio', icon: Music, count: 890 },
  { value: 'document', label: 'Documents', icon: FileText, count: 2345 },
  { value: 'archive', label: 'Archives', icon: Archive, count: 678 },
  { value: 'code', label: 'Code', icon: Code, count: 456 },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

function FilterSection({ title, children, defaultOpen = true, className }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border-b border-gray-200 pb-4', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-left"
      >
        <h3 className="font-medium text-gray-900">{title}</h3>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

export function FilterSidebar({
  filters,
  categories,
  onFiltersChange,
  onClearFilters,
  className,
  isCollapsed = false,
  onToggleCollapse,
}: FilterSidebarProps) {
  const [priceRange, setPriceRange] = useState({
    min: filters.min_price?.toString() || '',
    max: filters.max_price?.toString() || '',
  });

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'query' || key === 'page' || key === 'limit' || key === 'sort_by') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  }).length;

  const handleCategoryChange = (categoryId: number) => {
    onFiltersChange({ 
      category_id: filters.category_id === categoryId ? undefined : categoryId 
    });
  };

  const handleFileTypeToggle = (fileType: string) => {
    const currentTypes = filters.file_types || [];
    const newTypes = currentTypes.includes(fileType)
      ? currentTypes.filter(type => type !== fileType)
      : [...currentTypes, fileType];
    
    onFiltersChange({ file_types: newTypes.length > 0 ? newTypes : undefined });
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    setPriceRange(prev => ({ ...prev, [type]: value }));
    
    const numValue = value ? parseFloat(value) : undefined;
    if (type === 'min') {
      onFiltersChange({ min_price: numValue });
    } else {
      onFiltersChange({ max_price: numValue });
    }
  };

  const handleRatingChange = (rating: number) => {
    onFiltersChange({ 
      min_rating: filters.min_rating === rating ? undefined : rating 
    });
  };

  const renderRatingStars = (rating: number, isSelected: boolean) => (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i < rating
              ? isSelected
                ? 'text-yellow-500 fill-current'
                : 'text-yellow-400 fill-current'
              : 'text-gray-300'
          )}
        />
      ))}
      <span className="text-sm text-gray-600 ml-1">& up</span>
    </div>
  );

  if (isCollapsed) {
    return (
      <div className={cn('lg:hidden', className)}>
        <Button
          variant="outline"
          onClick={onToggleCollapse}
          className="w-full justify-between"
        >
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" size="sm">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn('w-full max-w-sm', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" size="sm">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear All
              </Button>
            )}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sort Options */}
        <FilterSection title="Sort By">
          <Select
            value={filters.sort_by || 'relevance'}
            onValueChange={(value) => onFiltersChange({ sort_by: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>

        {/* Categories */}
        <FilterSection title="Categories">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {categories.map(category => (
              <label
                key={category.id}
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.category_id === category.id}
                  onChange={() => handleCategoryChange(category.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">
                  {category.name}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Price Range */}
        <FilterSection title="Price Range">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <Input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => handlePriceChange('min', e.target.value)}
                className="flex-1"
                min="0"
                step="0.01"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => handlePriceChange('max', e.target.value)}
                className="flex-1"
                min="0"
                step="0.01"
              />
            </div>
            {(filters.min_price || filters.max_price) && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  ${filters.min_price || 0} - ${filters.max_price || '∞'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPriceRange({ min: '', max: '' });
                    onFiltersChange({ min_price: undefined, max_price: undefined });
                  }}
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </FilterSection>

        {/* Rating Filter */}
        <FilterSection title="Customer Rating">
          <div className="space-y-2">
            {[4, 3, 2, 1].map(rating => (
              <label
                key={rating}
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.min_rating === rating}
                  onChange={() => handleRatingChange(rating)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {renderRatingStars(rating, filters.min_rating === rating)}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* File Types */}
        <FilterSection title="File Types">
          <div className="space-y-2">
            {FILE_TYPES.map(fileType => {
              const Icon = fileType.icon;
              const isSelected = filters.file_types?.includes(fileType.value) || false;
              
              return (
                <label
                  key={fileType.value}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleFileTypeToggle(fileType.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Icon className={cn(
                    'h-4 w-4',
                    isSelected ? 'text-blue-600' : 'text-gray-400'
                  )} />
                  <span className="text-sm text-gray-700 flex-1">
                    {fileType.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {fileType.count.toLocaleString()}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterSection>

        {/* Featured Products */}
        <FilterSection title="Special Offers">
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
              <input
                type="checkbox"
                checked={filters.is_featured || false}
                onChange={(e) => onFiltersChange({ is_featured: e.target.checked || undefined })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Featured Products</span>
            </label>
          </div>
        </FilterSection>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Active Filters</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2 text-xs"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.category_id && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {categories.find(c => c.id === filters.category_id)?.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onFiltersChange({ category_id: undefined })}
                  />
                </Badge>
              )}
              {filters.min_price && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Min: ${filters.min_price}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onFiltersChange({ min_price: undefined })}
                  />
                </Badge>
              )}
              {filters.max_price && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Max: ${filters.max_price}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onFiltersChange({ max_price: undefined })}
                  />
                </Badge>
              )}
              {filters.min_rating && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {filters.min_rating}+ Stars
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onFiltersChange({ min_rating: undefined })}
                  />
                </Badge>
              )}
              {filters.file_types?.map(type => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {FILE_TYPES.find(ft => ft.value === type)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleFileTypeToggle(type)}
                  />
                </Badge>
              ))}
              {filters.is_featured && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Featured
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onFiltersChange({ is_featured: undefined })}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
