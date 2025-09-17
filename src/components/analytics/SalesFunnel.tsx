'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { 
  Eye, 
  ShoppingCart, 
  CreditCard, 
  Package,
  TrendingDown,
  TrendingUp,
  Users,
  MousePointer,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

export interface SalesFunnelData {
  views: number;
  product_views: number;
  add_to_cart: number;
  checkout_started: number;
  checkout_completed: number;
  downloads: number;
}

interface SalesFunnelProps {
  data: SalesFunnelData;
  isLoading?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showConversionRates?: boolean;
}

const FUNNEL_STAGES: FunnelStage[] = [
  {
    stage: 'views',
    label: 'Page Views',
    count: 0,
    icon: Eye,
    color: '#3B82F6',
    description: 'Total page visits and product impressions',
  },
  {
    stage: 'product_views',
    label: 'Product Views',
    count: 0,
    icon: MousePointer,
    color: '#10B981',
    description: 'Users who viewed product details',
  },
  {
    stage: 'add_to_cart',
    label: 'Added to Cart',
    count: 0,
    icon: ShoppingCart,
    color: '#F59E0B',
    description: 'Users who added products to cart',
  },
  {
    stage: 'checkout_started',
    label: 'Checkout Started',
    count: 0,
    icon: CreditCard,
    color: '#EF4444',
    description: 'Users who began the checkout process',
  },
  {
    stage: 'checkout_completed',
    label: 'Purchase Completed',
    count: 0,
    icon: Package,
    color: '#8B5CF6',
    description: 'Successful purchases and payments',
  },
  {
    stage: 'downloads',
    label: 'Downloads',
    count: 0,
    icon: Download,
    color: '#06B6D4',
    description: 'Product downloads after purchase',
  },
];

export function SalesFunnel({
  data,
  isLoading = false,
  className,
  variant = 'default',
  showConversionRates = true,
}: SalesFunnelProps) {
  // Prepare funnel data
  const funnelData = useMemo(() => {
    return FUNNEL_STAGES.map(stage => ({
      ...stage,
      count: data[stage.stage as keyof SalesFunnelData] || 0,
    }));
  }, [data]);

  // Calculate conversion rates
  const conversionRates = useMemo(() => {
    const rates: Record<string, number> = {};
    
    for (let i = 1; i < funnelData.length; i++) {
      const current = funnelData[i];
      const previous = funnelData[i - 1];
      
      if (previous.count > 0) {
        rates[current.stage] = (current.count / previous.count) * 100;
      } else {
        rates[current.stage] = 0;
      }
    }
    
    return rates;
  }, [funnelData]);

  // Calculate overall conversion rate (views to purchases)
  const overallConversionRate = useMemo(() => {
    const views = funnelData[0]?.count || 0;
    const purchases = funnelData.find(stage => stage.stage === 'checkout_completed')?.count || 0;
    
    return views > 0 ? (purchases / views) * 100 : 0;
  }, [funnelData]);

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5" />
            <span>Conversion Funnel</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelData.slice(0, 4).map((stage, index) => {
              const conversionRate = index > 0 ? conversionRates[stage.stage] : 100;
              const IconComponent = stage.icon;
              
              return (
                <div key={stage.stage} className="flex items-center space-x-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {stage.label}
                      </span>
                      <span className="text-sm text-gray-600">
                        {stage.count.toLocaleString()}
                      </span>
                    </div>
                    {showConversionRates && index > 0 && (
                      <div className="flex items-center space-x-2 mt-1">
                        <Progress 
                          value={conversionRate} 
                          className="h-1 flex-1"
                          style={{ 
                            '--progress-foreground': stage.color 
                          } as React.CSSProperties}
                        />
                        <span className="text-xs text-gray-500">
                          {formatPercentage(conversionRate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Overall Conversion</span>
              <span className="font-medium text-gray-900">
                {formatPercentage(overallConversionRate)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5" />
            <span>Sales Funnel</span>
          </CardTitle>
          
          <Badge variant="outline">
            {formatPercentage(overallConversionRate)} conversion
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Funnel Visualization */}
          <div className="space-y-4">
            {funnelData.map((stage, index) => {
              const conversionRate = index > 0 ? conversionRates[stage.stage] : 100;
              const dropOffRate = index > 0 ? 100 - conversionRate : 0;
              const IconComponent = stage.icon;
              const maxCount = Math.max(...funnelData.map(s => s.count));
              const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
              
              return (
                <div key={stage.stage} className="relative">
                  {/* Stage Bar */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 w-48">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {stage.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {stage.description}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg font-bold text-gray-900">
                          {stage.count.toLocaleString()}
                        </span>
                        {showConversionRates && index > 0 && (
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                'text-xs',
                                conversionRate >= 50 ? 'text-green-600 border-green-200' :
                                conversionRate >= 20 ? 'text-yellow-600 border-yellow-200' :
                                'text-red-600 border-red-200'
                              )}
                            >
                              {formatPercentage(conversionRate)} conversion
                            </Badge>
                            {dropOffRate > 0 && (
                              <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                                {formatPercentage(dropOffRate)} drop-off
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Visual bar */}
                      <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all duration-500"
                          style={{ 
                            width: `${widthPercentage}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Drop-off indicator */}
                  {index < funnelData.length - 1 && dropOffRate > 0 && (
                    <div className="ml-64 mt-2 text-xs text-red-600 flex items-center space-x-1">
                      <TrendingDown className="h-3 w-3" />
                      <span>
                        {(funnelData[index].count - stage.count).toLocaleString()} users dropped off
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {formatPercentage(overallConversionRate)}
              </div>
              <div className="text-sm text-gray-600">Overall Conversion</div>
              <div className="text-xs text-gray-500 mt-1">
                Views to Purchases
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {formatPercentage(conversionRates.add_to_cart || 0)}
              </div>
              <div className="text-sm text-gray-600">Add to Cart Rate</div>
              <div className="text-xs text-gray-500 mt-1">
                Product Views to Cart
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {formatPercentage(conversionRates.checkout_completed || 0)}
              </div>
              <div className="text-sm text-gray-600">Checkout Success</div>
              <div className="text-xs text-gray-500 mt-1">
                Started to Completed
              </div>
            </div>
          </div>

          {/* Optimization Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Optimization Tips</h4>
            <div className="space-y-2 text-sm text-blue-700">
              {overallConversionRate < 2 && (
                <p>• Your overall conversion rate is below average. Consider improving product descriptions and images.</p>
              )}
              {(conversionRates.add_to_cart || 0) < 10 && (
                <p>• Low add-to-cart rate suggests pricing or value proposition issues.</p>
              )}
              {(conversionRates.checkout_completed || 0) < 70 && (
                <p>• High checkout abandonment. Simplify your checkout process or offer more payment options.</p>
              )}
              {funnelData[0]?.count > 0 && funnelData[1]?.count === 0 && (
                <p>• Users are visiting but not viewing products. Improve your homepage and navigation.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Alternative funnel visualization using Recharts Funnel (if available)
export function FunnelChart({ data, className }: { data: SalesFunnelData; className?: string }) {
  const chartData = [
    { name: 'Views', value: data.views, fill: '#3B82F6' },
    { name: 'Product Views', value: data.product_views, fill: '#10B981' },
    { name: 'Add to Cart', value: data.add_to_cart, fill: '#F59E0B' },
    { name: 'Checkout', value: data.checkout_started, fill: '#EF4444' },
    { name: 'Purchase', value: data.checkout_completed, fill: '#8B5CF6' },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Conversion rate comparison component
interface ConversionComparisonProps {
  currentData: SalesFunnelData;
  previousData: SalesFunnelData;
  className?: string;
}

export function ConversionComparison({
  currentData,
  previousData,
  className,
}: ConversionComparisonProps) {
  const calculateConversion = (data: SalesFunnelData) => {
    return {
      viewToCart: data.views > 0 ? (data.add_to_cart / data.views) * 100 : 0,
      cartToCheckout: data.add_to_cart > 0 ? (data.checkout_started / data.add_to_cart) * 100 : 0,
      checkoutToSale: data.checkout_started > 0 ? (data.checkout_completed / data.checkout_started) * 100 : 0,
      overall: data.views > 0 ? (data.checkout_completed / data.views) * 100 : 0,
    };
  };

  const current = calculateConversion(currentData);
  const previous = calculateConversion(previousData);

  const getChangeColor = (currentValue: number, previousValue: number) => {
    const change = currentValue - previousValue;
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (currentValue: number, previousValue: number) => {
    const change = currentValue - previousValue;
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  const formatChange = (currentValue: number, previousValue: number) => {
    const change = currentValue - previousValue;
    const prefix = change > 0 ? '+' : '';
    return `${prefix}${change.toFixed(1)}%`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Conversion Rate Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            { key: 'overall', label: 'Overall Conversion', description: 'Views to Purchases' },
            { key: 'viewToCart', label: 'View to Cart', description: 'Product Views to Add to Cart' },
            { key: 'cartToCheckout', label: 'Cart to Checkout', description: 'Cart to Checkout Started' },
            { key: 'checkoutToSale', label: 'Checkout Success', description: 'Checkout to Completed Sale' },
          ].map(({ key, label, description }) => {
            const currentValue = current[key as keyof typeof current];
            const previousValue = previous[key as keyof typeof previous];
            
            return (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500">{description}</div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">
                    {formatPercentage(currentValue)}
                  </div>
                  <div className={cn(
                    'flex items-center space-x-1 text-xs',
                    getChangeColor(currentValue, previousValue)
                  )}>
                    {getChangeIcon(currentValue, previousValue)}
                    <span>{formatChange(currentValue, previousValue)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Mini funnel for dashboard widgets
interface MiniFunnelProps {
  data: SalesFunnelData;
  className?: string;
}

export function MiniFunnel({ data, className }: MiniFunnelProps) {
  const stages = [
    { label: 'Views', value: data.views, color: '#3B82F6' },
    { label: 'Cart', value: data.add_to_cart, color: '#10B981' },
    { label: 'Sales', value: data.checkout_completed, color: '#F59E0B' },
  ];

  const maxValue = Math.max(...stages.map(s => s.value));

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Conversion Funnel</h4>
          
          <div className="space-y-2">
            {stages.map((stage, index) => {
              const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
              
              return (
                <div key={stage.label} className="flex items-center space-x-3">
                  <div className="w-12 text-xs text-gray-600">{stage.label}</div>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-xs font-medium text-gray-900 text-right">
                    {stage.value.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            {data.views > 0 ? formatPercentage((data.checkout_completed / data.views) * 100) : '0%'} overall conversion
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
