'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Globe, 
  Mail, 
  Store,
  Palette,
  Settings,
  Save,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CreateShopRequest, UpdateShopRequest, ShopSettings } from '@/types/shop';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Validation schema
const shopFormSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(50, 'Shop name must be less than 50 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  contact_email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  // Settings
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  youtube: z.string().optional(),
  linkedin: z.string().optional(),
  return_policy: z.string().optional(),
  shipping_policy: z.string().optional(),
  privacy_policy: z.string().optional(),
  meta_title: z.string().max(60, 'Meta title must be less than 60 characters').optional(),
  meta_description: z.string().max(160, 'Meta description must be less than 160 characters').optional(),
  keywords: z.string().optional(),
});

type ShopFormData = z.infer<typeof shopFormSchema>;

interface ShopFormProps {
  initialData?: {
    name?: string;
    description?: string;
    logo_url?: string;
    banner_url?: string;
    website_url?: string;
    contact_email?: string;
    settings?: ShopSettings;
  };
  onSubmit: (data: CreateShopRequest | UpdateShopRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  className?: string;
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export function ShopForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  className,
}: ShopFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(initialData?.logo_url || '');
  const [bannerPreview, setBannerPreview] = useState<string>(initialData?.banner_url || '');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<ShopFormData>({
    resolver: zodResolver(shopFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      website_url: initialData?.website_url || '',
      contact_email: initialData?.contact_email || '',
      primary_color: initialData?.settings?.theme?.primary_color || '#3B82F6',
      secondary_color: initialData?.settings?.theme?.secondary_color || '#10B981',
      twitter: initialData?.settings?.social_links?.twitter || '',
      instagram: initialData?.settings?.social_links?.instagram || '',
      facebook: initialData?.settings?.social_links?.facebook || '',
      youtube: initialData?.settings?.social_links?.youtube || '',
      linkedin: initialData?.settings?.social_links?.linkedin || '',
      return_policy: initialData?.settings?.policies?.return_policy || '',
      shipping_policy: initialData?.settings?.policies?.shipping_policy || '',
      privacy_policy: initialData?.settings?.policies?.privacy_policy || '',
      meta_title: initialData?.settings?.seo?.meta_title || '',
      meta_description: initialData?.settings?.seo?.meta_description || '',
      keywords: initialData?.settings?.seo?.keywords?.join(', ') || '',
    },
  });

  const watchedColors = {
    primary: watch('primary_color'),
    secondary: watch('secondary_color'),
  };

  const handleFileChange = (type: 'logo' | 'banner', file: File | null) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (type === 'logo') {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setBannerPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (type: 'logo' | 'banner') => {
    if (type === 'logo') {
      setLogoFile(null);
      setLogoPreview('');
      if (logoInputRef.current) logoInputRef.current.value = '';
    } else {
      setBannerFile(null);
      setBannerPreview('');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleFormSubmit = async (data: ShopFormData) => {
    try {
      const formData: CreateShopRequest | UpdateShopRequest = {
        name: data.name,
        description: data.description || undefined,
        website_url: data.website_url || undefined,
        contact_email: data.contact_email || undefined,
        logo: logoFile || undefined,
        banner: bannerFile || undefined,
        settings: {
          theme: {
            primary_color: data.primary_color,
            secondary_color: data.secondary_color,
          },
          social_links: {
            twitter: data.twitter || undefined,
            instagram: data.instagram || undefined,
            facebook: data.facebook || undefined,
            youtube: data.youtube || undefined,
            linkedin: data.linkedin || undefined,
          },
          policies: {
            return_policy: data.return_policy || undefined,
            shipping_policy: data.shipping_policy || undefined,
            privacy_policy: data.privacy_policy || undefined,
          },
          seo: {
            meta_title: data.meta_title || undefined,
            meta_description: data.meta_description || undefined,
            keywords: data.keywords ? data.keywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
          },
        },
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to save shop');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={cn('space-y-6', className)}>
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Store className="h-5 w-5" />
                <span>Shop Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Shop Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="My Amazing Shop"
                  className={cn(errors.name && 'border-red-500')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
                {watch('name') && (
                  <p className="text-xs text-gray-500 mt-1">
                    Shop URL: /shops/{generateSlug(watch('name'))}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Tell customers about your shop and what makes it special..."
                  rows={4}
                  className={cn(errors.description && 'border-red-500')}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {(watch('description') || '').length}/500 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website_url" className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Website URL</span>
                  </Label>
                  <Input
                    id="website_url"
                    type="url"
                    {...register('website_url')}
                    placeholder="https://your-website.com"
                    className={cn(errors.website_url && 'border-red-500')}
                  />
                  {errors.website_url && (
                    <p className="text-sm text-red-600 mt-1">{errors.website_url.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contact_email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Contact Email</span>
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    {...register('contact_email')}
                    placeholder="contact@yourshop.com"
                    className={cn(errors.contact_email && 'border-red-500')}
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-red-600 mt-1">{errors.contact_email.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Shop Branding</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div>
                <Label>Shop Logo</Label>
                <div className="mt-2">
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-24 w-24 object-cover rounded-lg border border-gray-300"
                      />
                      <Button
                        type="button"
                        variant="danger"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => handleRemoveImage('logo')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Upload Logo</p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange('logo', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 200x200px, max 5MB
                  </p>
                </div>
              </div>

              {/* Banner Upload */}
              <div>
                <Label>Shop Banner</Label>
                <div className="mt-2">
                  {bannerPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        className="h-32 w-full max-w-md object-cover rounded-lg border border-gray-300"
                      />
                      <Button
                        type="button"
                        variant="danger"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => handleRemoveImage('banner')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => bannerInputRef.current?.click()}
                      className="h-32 w-full max-w-md border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Upload Banner</p>
                        <p className="text-xs text-gray-400">1200x400px recommended</p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange('banner', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 1200x400px, max 5MB
                  </p>
                </div>
              </div>

              {/* Color Scheme */}
              <div className="space-y-4">
                <Label>Color Scheme</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary_color" className="text-sm">Primary Color</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        id="primary_color"
                        type="color"
                        {...register('primary_color')}
                        className="w-12 h-10 p-1 border border-gray-300 rounded"
                      />
                      <Input
                        {...register('primary_color')}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="secondary_color" className="text-sm">Secondary Color</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        id="secondary_color"
                        type="color"
                        {...register('secondary_color')}
                        className="w-12 h-10 p-1 border border-gray-300 rounded"
                      />
                      <Input
                        {...register('secondary_color')}
                        placeholder="#10B981"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Presets */}
                <div>
                  <Label className="text-sm">Quick Colors</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setValue('primary_color', color)}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Color Preview */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <Label className="text-sm mb-2 block">Preview</Label>
                  <div className="space-y-2">
                    <div
                      className="h-8 rounded flex items-center px-3 text-white text-sm font-medium"
                      style={{ backgroundColor: watchedColors.primary }}
                    >
                      Primary Color
                    </div>
                    <div
                      className="h-6 rounded flex items-center px-3 text-white text-xs"
                      style={{ backgroundColor: watchedColors.secondary }}
                    >
                      Secondary Color
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Links */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    {...register('twitter')}
                    placeholder="https://twitter.com/yourshop"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    {...register('instagram')}
                    placeholder="https://instagram.com/yourshop"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    {...register('facebook')}
                    placeholder="https://facebook.com/yourshop"
                  />
                </div>
                <div>
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input
                    id="youtube"
                    {...register('youtube')}
                    placeholder="https://youtube.com/yourshop"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    {...register('linkedin')}
                    placeholder="https://linkedin.com/company/yourshop"
                  />
                </div>
              </div>

              <Separator />

              {/* Policies */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Shop Policies</h4>
                
                <div>
                  <Label htmlFor="return_policy">Return Policy</Label>
                  <Textarea
                    id="return_policy"
                    {...register('return_policy')}
                    placeholder="Describe your return policy..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="shipping_policy">Shipping Policy</Label>
                  <Textarea
                    id="shipping_policy"
                    {...register('shipping_policy')}
                    placeholder="Describe your shipping policy..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="privacy_policy">Privacy Policy</Label>
                  <Textarea
                    id="privacy_policy"
                    {...register('privacy_policy')}
                    placeholder="Describe your privacy policy..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  {...register('meta_title')}
                  placeholder="Your Shop Name - Best Digital Products"
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
                  placeholder="Discover amazing digital products at our shop..."
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
                  placeholder="digital products, templates, graphics"
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
                    {watch('meta_title') || watch('name') || 'Your Shop Name'}
                  </div>
                  <div className="text-green-700 text-sm">
                    marketplace.com/shops/{generateSlug(watch('name') || 'your-shop')}
                  </div>
                  <div className="text-gray-600 text-sm line-clamp-2">
                    {watch('meta_description') || watch('description') || 'Shop description will appear here...'}
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
              // Preview functionality could be added here
              toast('Preview functionality coming soon');
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button
            type="submit"
            disabled={!isValid || isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{mode === 'create' ? 'Create Shop' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
