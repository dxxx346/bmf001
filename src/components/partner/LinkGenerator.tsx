'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Link, 
  QrCode, 
  Copy, 
  Check, 
  Download,
  Share2,
  Sparkles,
  Package,
  Store,
  Globe,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// QR Code generation (you might want to install qrcode library: npm install qrcode @types/qrcode)
// For now, using a placeholder implementation
const generateQRCode = async (url: string): Promise<string> => {
  // Placeholder - replace with actual QR code generation
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">QR Code for: ${url.substring(0, 20)}...</text>
    </svg>
  `)}`;
};

// Validation schema
const linkGeneratorSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be less than 50 characters'),
  type: z.enum(['product', 'shop', 'general']),
  target_id: z.string().optional(),
  custom_code: z.string().optional(),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
  commission_rate: z.number().min(1).max(50).optional(),
});

type LinkGeneratorFormData = z.infer<typeof linkGeneratorSchema>;

interface Product {
  id: string;
  title: string;
  price: number;
  thumbnail_url?: string;
  category: string;
}

interface Shop {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  product_count: number;
}

interface LinkGeneratorProps {
  onLinkGenerated?: (link: GeneratedLink) => void;
  className?: string;
  products?: Product[];
  shops?: Shop[];
  defaultType?: 'product' | 'shop' | 'general';
  defaultTargetId?: string;
}

interface GeneratedLink {
  id: string;
  name: string;
  code: string;
  url: string;
  short_url: string;
  qr_code: string;
  type: 'product' | 'shop' | 'general';
  target_id?: string;
  commission_rate: number;
  created_at: string;
}

export function LinkGenerator({
  onLinkGenerated,
  className,
  products = [],
  shops = [],
  defaultType = 'general',
  defaultTargetId,
}: LinkGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<LinkGeneratorFormData>({
    resolver: zodResolver(linkGeneratorSchema),
    defaultValues: {
      name: '',
      type: defaultType,
      target_id: defaultTargetId || '',
      custom_code: '',
      description: '',
      commission_rate: 10,
    },
  });

  const watchedType = watch('type');
  const watchedTargetId = watch('target_id');
  const watchedName = watch('name');

  // Auto-generate link name based on selection
  useEffect(() => {
    if (watchedType === 'product' && watchedTargetId) {
      const product = products.find(p => p.id === watchedTargetId);
      if (product && !watchedName) {
        setValue('name', `${product.title} Referral`);
      }
    } else if (watchedType === 'shop' && watchedTargetId) {
      const shop = shops.find(s => s.id === watchedTargetId);
      if (shop && !watchedName) {
        setValue('name', `${shop.name} Referral`);
      }
    }
  }, [watchedType, watchedTargetId, watchedName, products, shops, setValue]);

  // Generate QR code when link is generated
  useEffect(() => {
    if (generatedLink) {
      generateQRCode(generatedLink.url).then(setQrCodeData);
    }
  }, [generatedLink]);

  const generateCustomCode = () => {
    const codes = [
      'SAVE20', 'DEAL50', 'BEST25', 'SUPER30', 'MEGA15',
      'FLASH40', 'BOOST35', 'PRIME45', 'ELITE20', 'GOLD25'
    ];
    const randomCode = codes[Math.floor(Math.random() * codes.length)] + 
                      Math.floor(Math.random() * 1000);
    setValue('custom_code', randomCode);
  };

  const handleGenerateLink = async (data: LinkGeneratorFormData) => {
    try {
      setIsGenerating(true);

      // Generate unique code if not provided
      const code = data.custom_code || `REF${Date.now().toString(36).toUpperCase()}`;
      
      // Build the referral URL
      const baseUrl = window.location.origin;
      let path = '';
      
      switch (data.type) {
        case 'product':
          path = `/products/${data.target_id}?ref=${code}`;
          break;
        case 'shop':
          path = `/shops/${data.target_id}?ref=${code}`;
          break;
        case 'general':
          path = `/?ref=${code}`;
          break;
      }
      
      const fullUrl = `${baseUrl}${path}`;
      const shortUrl = `${baseUrl}/r/${code}`;

      // Simulate API call to create referral link
      const response = await fetch('/api/partner/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          target_id: data.target_id,
          code,
          description: data.description,
          commission_rate: data.commission_rate || 10,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate referral link');
      }

      const newLink = await response.json();
      
      const generatedLinkData: GeneratedLink = {
        id: newLink.id || Date.now().toString(),
        name: data.name,
        code,
        url: fullUrl,
        short_url: shortUrl,
        qr_code: '',
        type: data.type,
        target_id: data.target_id,
        commission_rate: data.commission_rate || 10,
        created_at: new Date().toISOString(),
      };

      setGeneratedLink(generatedLinkData);
      toast.success('Referral link generated successfully!');
      
      if (onLinkGenerated) {
        onLinkGenerated(generatedLinkData);
      }
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to generate referral link');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadQRCode = () => {
    if (qrCodeData) {
      const link = document.createElement('a');
      link.download = `${generatedLink?.code || 'qrcode'}.svg`;
      link.href = qrCodeData;
      link.click();
    }
  };

  const shareLink = async () => {
    if (generatedLink && navigator.share) {
      try {
        await navigator.share({
          title: generatedLink.name,
          text: `Check out this great deal!`,
          url: generatedLink.short_url,
        });
      } catch (error) {
        // Fallback to copy
        copyToClipboard(generatedLink.short_url, 'share');
      }
    } else if (generatedLink) {
      copyToClipboard(generatedLink.short_url, 'share');
    }
  };

  const handleReset = () => {
    reset();
    setGeneratedLink(null);
    setQrCodeData(null);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {!generatedLink ? (
        // Link Generation Form
        <form onSubmit={handleSubmit(handleGenerateLink)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>Generate Referral Link</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Link Name */}
              <div>
                <Label htmlFor="name">Link Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="My Awesome Product Link"
                  className={cn(errors.name && 'border-red-500')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Link Type */}
              <div>
                <Label>Link Type *</Label>
                <RadioGroup
                  value={watchedType}
                  onValueChange={(value) => setValue('type', value as any)}
                  className="flex space-x-6 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="product" id="product" />
                    <Label htmlFor="product" className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Product</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shop" id="shop" />
                    <Label htmlFor="shop" className="flex items-center space-x-2">
                      <Store className="h-4 w-4" />
                      <span>Shop</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="general" id="general" />
                    <Label htmlFor="general" className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span>General</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Target Selection */}
              {watchedType === 'product' && (
                <div>
                  <Label htmlFor="target_id">Select Product *</Label>
                  <Select
                    value={watchedTargetId || ''}
                    onValueChange={(value) => setValue('target_id', value)}
                  >
                    <SelectTrigger className={cn(errors.target_id && 'border-red-500')}>
                      <SelectValue placeholder="Choose a product to promote" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center space-x-2">
                            {product.thumbnail_url && (
                              <img
                                src={product.thumbnail_url}
                                alt={product.title}
                                className="w-6 h-6 object-cover rounded"
                              />
                            )}
                            <div>
                              <span className="font-medium">{product.title}</span>
                              <span className="text-sm text-gray-500 ml-2">
                                ${product.price} • {product.category}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {watchedType === 'shop' && (
                <div>
                  <Label htmlFor="target_id">Select Shop *</Label>
                  <Select
                    value={watchedTargetId || ''}
                    onValueChange={(value) => setValue('target_id', value)}
                  >
                    <SelectTrigger className={cn(errors.target_id && 'border-red-500')}>
                      <SelectValue placeholder="Choose a shop to promote" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          <div className="flex items-center space-x-2">
                            {shop.logo_url && (
                              <img
                                src={shop.logo_url}
                                alt={shop.name}
                                className="w-6 h-6 object-cover rounded"
                              />
                            )}
                            <div>
                              <span className="font-medium">{shop.name}</span>
                              <span className="text-sm text-gray-500 ml-2">
                                {shop.product_count} products
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom Code */}
              <div>
                <Label htmlFor="custom_code">Custom Code (Optional)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="custom_code"
                    {...register('custom_code')}
                    placeholder="SAVE20, DEAL50, etc."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCustomCode}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Generate</span>
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-generate a unique code
                </p>
              </div>

              {/* Commission Rate */}
              <div>
                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  min="1"
                  max="50"
                  {...register('commission_rate', { valueAsNumber: true })}
                  placeholder="10"
                  className={cn(errors.commission_rate && 'border-red-500')}
                />
                {errors.commission_rate && (
                  <p className="text-sm text-red-600 mt-1">{errors.commission_rate.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Your commission percentage for each sale
                </p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Add notes about this referral link..."
                  rows={3}
                  className={cn(errors.description && 'border-red-500')}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!isValid || isGenerating}
              className="flex items-center space-x-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Link className="h-4 w-4" />
              )}
              <span>{isGenerating ? 'Generating...' : 'Generate Link'}</span>
            </Button>
          </div>
        </form>
      ) : (
        // Generated Link Display
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Link Generated Successfully!</span>
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex items-center space-x-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Another</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge className="bg-green-100 text-green-800">
                      {generatedLink.type.toUpperCase()}
                    </Badge>
                    <span className="font-medium text-green-900">
                      {generatedLink.name}
                    </span>
                  </div>
                  <p className="text-sm text-green-700">
                    Commission: {generatedLink.commission_rate}% • 
                    Code: {generatedLink.code}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="links" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="qrcode">QR Code</TabsTrigger>
              <TabsTrigger value="share">Share</TabsTrigger>
            </TabsList>

            <TabsContent value="links" className="space-y-4">
              {/* Full URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Full Referral URL</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={generatedLink.url}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(generatedLink.url, 'full_url')}
                      className="flex items-center space-x-2"
                    >
                      {copiedField === 'full_url' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(generatedLink.url, '_blank')}
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Short URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Short URL</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={generatedLink.short_url}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(generatedLink.short_url, 'short_url')}
                      className="flex items-center space-x-2"
                    >
                      {copiedField === 'short_url' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(generatedLink.short_url, '_blank')}
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qrcode">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <QrCode className="h-5 w-5" />
                    <span>QR Code</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    {qrCodeData ? (
                      <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                        <img
                          src={qrCodeData}
                          alt="QR Code"
                          className="w-48 h-48 mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Scan this QR code to access your referral link
                      </p>
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={downloadQRCode}
                          disabled={!qrCodeData}
                          className="flex items-center space-x-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(generatedLink.short_url, 'qr_link')}
                          className="flex items-center space-x-2"
                        >
                          {copiedField === 'qr_link' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span>Copy Link</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="share">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Share2 className="h-5 w-5" />
                    <span>Share Your Link</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Share your referral link on social media, email, or messaging apps
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(generatedLink.short_url)}&text=${encodeURIComponent(`Check out this great deal!`)}`, '_blank')}
                        className="flex items-center space-x-2"
                      >
                        <span>Twitter</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(generatedLink.short_url)}`, '_blank')}
                        className="flex items-center space-x-2"
                      >
                        <span>Facebook</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this great deal! ${generatedLink.short_url}`)}`, '_blank')}
                        className="flex items-center space-x-2"
                      >
                        <span>WhatsApp</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={shareLink}
                        className="flex items-center space-x-2"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>More</span>
                      </Button>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Sharing Tips</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• Add a personal message to increase click-through rates</p>
                        <p>• Share in relevant communities and groups</p>
                        <p>• Use the QR code for offline sharing</p>
                        <p>• Track performance in your dashboard</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
