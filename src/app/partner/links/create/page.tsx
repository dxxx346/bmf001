'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Link, Target, Award, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkGenerator } from '@/components/partner/LinkGenerator';
import { useAuthContext } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  title: string;
  price: number;
  sale_price?: number;
  thumbnail_url?: string;
  category: string;
  commission_rate?: number;
}

interface Shop {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  product_count: number;
  commission_rate?: number;
}

export default function CreateLinkPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [productsRes, shopsRes] = await Promise.all([
        fetch('/api/partner/products'),
        fetch('/api/partner/shops'),
      ]);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      }

      if (shopsRes.ok) {
        const shopsData = await shopsRes.json();
        setShops(shopsData.shops || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load products and shops');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkGenerated = (link: any) => {
    toast.success('Referral link created successfully!');
    // Optionally redirect to links page after a delay
    setTimeout(() => {
      router.push('/partner/links');
    }, 3000);
  };

  const handleCancel = () => {
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
              <h1 className="text-2xl font-bold text-gray-900">Create Referral Link</h1>
              <p className="text-gray-600">
                Generate a new referral link to start earning commissions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Getting Started Guide */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Sparkles className="h-5 w-5" />
                <span>Referral Link Creation Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-blue-900 mb-2">Choose Your Target</h3>
                  <p className="text-sm text-blue-700">
                    Select a specific product, shop, or create a general marketplace link
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Link className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-medium text-purple-900 mb-2">Customize Your Link</h3>
                  <p className="text-sm text-purple-700">
                    Add a memorable name and custom code for easy tracking
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-medium text-green-900 mb-2">Start Earning</h3>
                  <p className="text-sm text-green-700">
                    Share your link and earn commissions on every successful referral
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Link Generator */}
          {isLoading ? (
            <Card>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                      <div className="h-10 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <LinkGenerator
              products={products}
              shops={shops}
              onLinkGenerated={handleLinkGenerated}
            />
          )}

          {/* Commission Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <span>Commission Rates</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-2">5-15%</div>
                  <div className="font-medium text-blue-900">Product Links</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Earn commission on individual product sales
                  </div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-2">3-10%</div>
                  <div className="font-medium text-green-900">Shop Links</div>
                  <div className="text-sm text-green-700 mt-1">
                    Earn commission on all shop purchases
                  </div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-2">2-5%</div>
                  <div className="font-medium text-purple-900">General Links</div>
                  <div className="text-sm text-purple-700 mt-1">
                    Earn commission on any marketplace purchase
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Pro Tip</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Product-specific links typically have higher conversion rates than general links. 
                      Focus on promoting products you genuinely recommend to your audience.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-500" />
                <span>Best Practices for Success</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Link Naming</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use descriptive names for easy identification</li>
                    <li>• Include the product or campaign type</li>
                    <li>• Add date or version for tracking</li>
                    <li>• Keep names under 50 characters</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Custom Codes</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Make codes memorable and relevant</li>
                    <li>• Include discount hints (SAVE20, DEAL50)</li>
                    <li>• Avoid confusing characters (0, O, I, l)</li>
                    <li>• Keep codes short but unique</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Product Selection</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Choose products you've used or reviewed</li>
                    <li>• Focus on high-quality, popular items</li>
                    <li>• Consider seasonal and trending products</li>
                    <li>• Match products to your audience interests</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Promotion Strategy</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Share in relevant communities and forums</li>
                    <li>• Create valuable content around products</li>
                    <li>• Use multiple channels (social, email, blog)</li>
                    <li>• Track performance and optimize</li>
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
