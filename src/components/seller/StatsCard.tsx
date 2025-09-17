'use client';

import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  Package,
  Star,
  Users,
  ShoppingCart,
  Eye,
  Download,
  Heart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StatData {
  label: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  format?: 'currency' | 'number' | 'percentage' | 'rating';
}

interface StatsCardProps {
  stat: StatData;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showTrend?: boolean;
  loading?: boolean;
}

const STAT_ICONS = {
  revenue: DollarSign,
  sales: ShoppingCart,
  products: Package,
  rating: Star,
  users: Users,
  views: Eye,
  downloads: Download,
  favorites: Heart,
};

const COLOR_SCHEMES = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-900',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    text: 'text-green-900',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    text: 'text-red-900',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    text: 'text-yellow-900',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    text: 'text-purple-900',
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-600',
    text: 'text-gray-900',
  },
};

export function StatsCard({
  stat,
  className,
  variant = 'default',
  showTrend = true,
  loading = false,
}: StatsCardProps) {
  const colorScheme = COLOR_SCHEMES[stat.color || 'blue'];
  const IconComponent = stat.icon || STAT_ICONS.revenue;

  const formatValue = (value: string | number) => {
    if (typeof value === 'string') return value;
    
    switch (stat.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'rating':
        return `${value.toFixed(1)}★`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  };

  const getTrendIcon = () => {
    if (!stat.change) return null;
    
    switch (stat.change.type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    if (!stat.change) return 'text-gray-500';
    
    switch (stat.change.type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const formatChangeValue = () => {
    if (!stat.change) return '';
    
    const { value, type } = stat.change;
    const prefix = type === 'increase' ? '+' : type === 'decrease' ? '-' : '';
    
    if (stat.format === 'percentage') {
      return `${prefix}${Math.abs(value).toFixed(1)}%`;
    }
    
    return `${prefix}${Math.abs(value).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
              <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
              {showTrend && (
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
              )}
            </div>
            <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              colorScheme.bg,
              colorScheme.border,
              'border'
            )}>
              <IconComponent className={cn('h-5 w-5', colorScheme.icon)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 truncate">{stat.label}</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatValue(stat.value)}
              </p>
            </div>
            {showTrend && stat.change && (
              <div className={cn('flex items-center space-x-1', getTrendColor())}>
                {getTrendIcon()}
                <span className="text-sm font-medium">
                  {formatChangeValue()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.label}
            </CardTitle>
            <div className={cn(
              'p-2 rounded-lg',
              colorScheme.bg,
              colorScheme.border,
              'border'
            )}>
              <IconComponent className={cn('h-5 w-5', colorScheme.icon)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="text-3xl font-bold text-gray-900">
              {formatValue(stat.value)}
            </div>
            
            {showTrend && stat.change && (
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium',
                  stat.change.type === 'increase' && 'bg-green-100 text-green-700',
                  stat.change.type === 'decrease' && 'bg-red-100 text-red-700',
                  stat.change.type === 'neutral' && 'bg-gray-100 text-gray-700'
                )}>
                  {getTrendIcon()}
                  <span>{formatChangeValue()}</span>
                </div>
                <span className="text-sm text-gray-500">
                  vs {stat.change.period}
                </span>
              </div>
            )}
            
            {stat.description && (
              <p className="text-sm text-gray-600">
                {stat.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatValue(stat.value)}
            </p>
            {showTrend && stat.change && (
              <div className={cn('flex items-center space-x-1 text-sm', getTrendColor())}>
                {getTrendIcon()}
                <span className="font-medium">
                  {formatChangeValue()}
                </span>
                <span className="text-gray-500">
                  vs {stat.change.period}
                </span>
              </div>
            )}
            {stat.description && (
              <p className="text-xs text-gray-500 mt-1">
                {stat.description}
              </p>
            )}
          </div>
          
          <div className={cn(
            'p-3 rounded-lg',
            colorScheme.bg,
            colorScheme.border,
            'border'
          )}>
            <IconComponent className={cn('h-6 w-6', colorScheme.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Stats grid component for multiple stats
interface StatsGridProps {
  stats: StatData[];
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  columns?: 1 | 2 | 3 | 4;
  loading?: boolean;
}

export function StatsGrid({
  stats,
  className,
  variant = 'default',
  columns = 4,
  loading = false,
}: StatsGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {stats.map((stat, index) => (
        <StatsCard
          key={`${stat.label}-${index}`}
          stat={stat}
          variant={variant}
          loading={loading}
        />
      ))}
    </div>
  );
}

// Pre-configured stat cards for common metrics
export const createRevenueCard = (revenue: number, change?: number): StatData => ({
  label: 'Total Revenue',
  value: revenue,
  change: change !== undefined ? {
    value: change,
    period: 'last month',
    type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
  } : undefined,
  icon: DollarSign,
  color: 'green',
  format: 'currency',
});

export const createSalesCard = (sales: number, change?: number): StatData => ({
  label: 'Total Sales',
  value: sales,
  change: change !== undefined ? {
    value: change,
    period: 'last month',
    type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
  } : undefined,
  icon: ShoppingCart,
  color: 'blue',
  format: 'number',
});

export const createProductsCard = (products: number, change?: number): StatData => ({
  label: 'Active Products',
  value: products,
  change: change !== undefined ? {
    value: change,
    period: 'last month',
    type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
  } : undefined,
  icon: Package,
  color: 'purple',
  format: 'number',
});

export const createRatingCard = (rating: number, change?: number): StatData => ({
  label: 'Average Rating',
  value: rating,
  change: change !== undefined ? {
    value: change,
    period: 'last month',
    type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
  } : undefined,
  icon: Star,
  color: 'yellow',
  format: 'rating',
});
