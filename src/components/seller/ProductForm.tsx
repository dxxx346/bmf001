'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Package, 
  DollarSign, 
  Tag, 
  FileText, 
  Image as ImageIcon,
  Globe,
  Save,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileUpload, UploadedFile } from './FileUpload';
import { CreateProductRequest, UpdateProductRequest, ProductCategory } from '@/types/product';
import { Shop } from '@/types/shop';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Rich text editor (simple implementation - can be replaced with more advanced editor)
const RichTextEditor = ({ value, onChange, placeholder }: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
}) => {
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="min-h-[200px]"
      />
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <span>{value.length}/2000 characters</span>
        <span>•</span>
        <span>Supports markdown formatting</span>
      </div>
    </div>
  );
};

// Validation schema
const productFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  short_description: z.string().min(10, 'Short description must be at least 10 characters').max(200, 'Short description must be less than 200 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000, 'Description must be less than 2000 characters'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  sale_price: z.number().min(0).optional(),
  currency: z.string().min(3).max(3),
  category_id: z.number().min(1, 'Please select a category'),
  shop_id: z.string().min(1, 'Please select a shop'),
  tags: z.string().optional(),
  is_digital: z.boolean(),
  is_downloadable: z.boolean(),
  download_limit: z.number().min(1).optional(),
  download_expiry_days: z.number().min(1).optional(),
  // SEO fields
  meta_title: z.string().max(60, 'Meta title must be less than 60 characters').optional(),
  meta_description: z.string().max(160, 'Meta description must be less than 160 characters').optional(),
  keywords: z.string().optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  initialData?: {
    title?: string;
    short_description?: string;
    description?: string;
    price?: number;
    sale_price?: number;
    currency?: string;
    category_id?: number;
    shop_id?: string;
    tags?: string[];
    is_digital?: boolean;
    is_downloadable?: boolean;
    download_limit?: number;
    download_expiry_days?: number;
    thumbnail_url?: string;
    file_url?: string;
    seo?: {
      meta_title?: string;
      meta_description?: string;
      keywords?: string[];
    };
  };
  onSubmit: (data: CreateProductRequest | UpdateProductRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  className?: string;
}

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  className,
}: ProductFormProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [productFiles, setProductFiles] = useState<UploadedFile[]>([]);
  const [imageFiles, setImageFiles] = useState<UploadedFile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      short_description: initialData?.short_description || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      sale_price: initialData?.sale_price,
      currency: initialData?.currency || 'USD',
      category_id: initialData?.category_id,
      shop_id: initialData?.shop_id || '',
      tags: initialData?.tags?.join(', ') || '',
      is_digital: initialData?.is_digital ?? true,
      is_downloadable: initialData?.is_downloadable ?? true,
      download_limit: initialData?.download_limit,
      download_expiry_days: initialData?.download_expiry_days,
      meta_title: initialData?.seo?.meta_title || '',
      meta_description: initialData?.seo?.meta_description || '',
      keywords: initialData?.seo?.keywords?.join(', ') || '',
    },
  });

  const watchedFields = {
    title: watch('title'),
    description: watch('description'),
    price: watch('price'),
    sale_price: watch('sale_price'),
    is_digital: watch('is_digital'),
    is_downloadable: watch('is_downloadable'),
  };

  // Load categories and shops
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesRes, shopsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/seller/shops'),
        ]);

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.data || []);
        }

        if (shopsRes.ok) {
          const shopsData = await shopsRes.json();
          setShops(shopsData.shops || []);
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        toast.error('Failed to load form data');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleFormSubmit = async (data: ProductFormData) => {
    try {
      // Validate files
      if (mode === 'create' && productFiles.length === 0) {
        toast.error('Please upload at least one product file');
        return;
      }

      const formData: CreateProductRequest | UpdateProductRequest = {
        title: data.title,
        short_description: data.short_description,
        description: data.description,
        price: data.price,
        sale_price: data.sale_price,
        currency: data.currency,
        category_id: data.category_id,
        shop_id: data.shop_id,
        product_type: 'digital',
        is_digital: data.is_digital,
        is_downloadable: data.is_downloadable,
        download_limit: data.download_limit,
        download_expiry_days: data.download_expiry_days,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        seo: {
          meta_title: data.meta_title,
          meta_description: data.meta_description,
          keywords: data.keywords ? data.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        },
        files: productFiles.map(f => f.file),
        images: imageFiles.map(f => f.file),
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to save product');
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const calculateDiscount = () => {
    if (watchedFields.sale_price && watchedFields.price && watchedFields.sale_price < watchedFields.price) {
      return Math.round(((watchedFields.price - watchedFields.sale_price) / watchedFields.price) * 100);
    }
    return 0;
  };

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-10 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={cn('space-y-6', className)}>
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Product Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Product Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Amazing Digital Product"
                  className={cn(errors.title && 'border-red-500')}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                )}
                {watchedFields.title && (
                  <p className="text-xs text-gray-500 mt-1">
                    URL: /products/{generateSlug(watchedFields.title)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="short_description">Short Description *</Label>
                <Textarea
                  id="short_description"
                  {...register('short_description')}
                  placeholder="Brief description that appears in product cards and search results..."
                  rows={3}
                  className={cn(errors.short_description && 'border-red-500')}
                />
                {errors.short_description && (
                  <p className="text-sm text-red-600 mt-1">{errors.short_description.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {(watch('short_description') || '').length}/200 characters
                </p>
              </div>

              <div>
                <Label htmlFor="description">Full Description *</Label>
                <RichTextEditor
                  value={watch('description') || ''}
                  onChange={(value) => setValue('description', value)}
                  placeholder="Detailed product description with features, benefits, and usage instructions..."
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_id">Category *</Label>
                  <Select
                    value={watch('category_id')?.toString() || ''}
                    onValueChange={(value) => setValue('category_id', parseInt(value))}
                  >
                    <SelectTrigger className={cn(errors.category_id && 'border-red-500')}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && (
                    <p className="text-sm text-red-600 mt-1">{errors.category_id.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="shop_id">Shop *</Label>
                  <Select
                    value={watch('shop_id') || ''}
                    onValueChange={(value) => setValue('shop_id', value)}
                  >
                    <SelectTrigger className={cn(errors.shop_id && 'border-red-500')}>
                      <SelectValue placeholder="Select shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.shop_id && (
                    <p className="text-sm text-red-600 mt-1">{errors.shop_id.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  {...register('tags')}
                  placeholder="digital, template, design, graphics"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate tags with commas. Use relevant keywords for better discoverability.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Product Type</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      {...register('is_digital')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Digital Product</span>
                  </label>
                  
                  {watchedFields.is_digital && (
                    <label className="flex items-center space-x-3 ml-6">
                      <input
                        type="checkbox"
                        {...register('is_downloadable')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Downloadable</span>
                    </label>
                  )}
                </div>

                {watchedFields.is_downloadable && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <Label htmlFor="download_limit">Download Limit</Label>
                      <Input
                        id="download_limit"
                        type="number"
                        {...register('download_limit', { valueAsNumber: true })}
                        placeholder="5"
                        min="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Number of times customer can download
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="download_expiry_days">Download Expiry (Days)</Label>
                      <Input
                        id="download_expiry_days"
                        type="number"
                        {...register('download_expiry_days', { valueAsNumber: true })}
                        placeholder="30"
                        min="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Days until download link expires
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Pricing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={watch('currency') || 'USD'}
                    onValueChange={(value) => setValue('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="RUB">RUB (₽)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="price">Regular Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register('price', { valueAsNumber: true })}
                    placeholder="29.99"
                    className={cn(errors.price && 'border-red-500')}
                  />
                  {errors.price && (
                    <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="sale_price">Sale Price</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('sale_price', { valueAsNumber: true })}
                    placeholder="19.99"
                    className={cn(errors.sale_price && 'border-red-500')}
                  />
                  {errors.sale_price && (
                    <p className="text-sm text-red-600 mt-1">{errors.sale_price.message}</p>
                  )}
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Pricing Preview</h4>
                <div className="flex items-center space-x-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {watch('currency')} {(watchedFields.sale_price || watchedFields.price || 0).toFixed(2)}
                  </div>
                  {watchedFields.sale_price && watchedFields.sale_price < watchedFields.price && (
                    <>
                      <div className="text-lg text-gray-500 line-through">
                        {watch('currency')} {watchedFields.price.toFixed(2)}
                      </div>
                      <Badge variant="secondary" className="text-green-600 bg-green-100">
                        {calculateDiscount()}% OFF
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Files */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Product Files</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                accept="*/*"
                multiple={true}
                maxFiles={5}
                maxSize={100 * 1024 * 1024} // 100MB
                onFilesChange={setProductFiles}
                variant="default"
                showPreview={false}
                allowedTypes={['application', 'text', 'image', 'video', 'audio']}
                disabled={isLoading}
              />
              
              {mode === 'create' && productFiles.length === 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-700">
                      At least one product file is required for digital products
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Images */}
        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5" />
                <span>Product Images</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                accept="image/*"
                multiple={true}
                maxFiles={10}
                maxSize={10 * 1024 * 1024} // 10MB
                onFilesChange={setImageFiles}
                variant="default"
                showPreview={true}
                allowedTypes={['image']}
                disabled={isLoading}
              />
              
              <div className="mt-4 text-sm text-gray-600">
                <p>• First image will be used as the main thumbnail</p>
                <p>• Recommended size: 800x600px or larger</p>
                <p>• Supported formats: JPEG, PNG, WebP</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>SEO Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  {...register('meta_title')}
                  placeholder="Amazing Digital Product - Best in Category"
                  className={cn(errors.meta_title && 'border-red-500')}
                />
                {errors.meta_title && (
                  <p className="text-sm text-red-600 mt-1">{errors.meta_title.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {(watch('meta_title') || '').length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  {...register('meta_description')}
                  placeholder="Detailed description for search engines and social media..."
                  rows={3}
                  className={cn(errors.meta_description && 'border-red-500')}
                />
                {errors.meta_description && (
                  <p className="text-sm text-red-600 mt-1">{errors.meta_description.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {(watch('meta_description') || '').length}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  {...register('keywords')}
                  placeholder="digital product, template, design, graphics"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate keywords with commas
                </p>
              </div>

              {/* SEO Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <Label className="text-sm mb-2 block">Search Preview</Label>
                <div className="space-y-1">
                  <div className="text-blue-600 text-lg font-medium line-clamp-1">
                    {watch('meta_title') || watchedFields.title || 'Product Title'}
                  </div>
                  <div className="text-green-700 text-sm">
                    marketplace.com/products/{generateSlug(watchedFields.title || 'product-title')}
                  </div>
                  <div className="text-gray-600 text-sm line-clamp-2">
                    {watch('meta_description') || watch('short_description') || 'Product description will appear here...'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="button"
            variant="ghost"
            onClick={() => reset()}
            disabled={isLoading || !isDirty}
          >
            Reset Changes
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            disabled={!isValid}
            onClick={() => {
              toast('Preview functionality coming soon');
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button
            type="submit"
            disabled={!isValid || isLoading || (mode === 'create' && productFiles.length === 0)}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{mode === 'create' ? 'Create Product' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
