'use client';

import React, { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  productId: string;
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  disabled?: boolean;
  onToggle?: (isFavorited: boolean) => void;
}

export function FavoriteButton({
  productId,
  variant = 'ghost',
  size = 'md',
  showText = false,
  className,
  disabled = false,
  onToggle,
}: FavoriteButtonProps) {
  const { user } = useAuthContext();
  const { isFavorite, toggleFavorite, loading } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);

  const isCurrentlyFavorited = isFavorite(productId);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || disabled || isToggling || loading) return;

    setIsToggling(true);
    
    try {
      const newFavoriteStatus = await toggleFavorite(productId);
      onToggle?.(newFavoriteStatus);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  const isLoading = isToggling || loading;

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'h-8 w-8',
      icon: 'h-3 w-3',
      text: 'text-xs',
    },
    md: {
      button: 'h-10 w-10',
      icon: 'h-4 w-4',
      text: 'text-sm',
    },
    lg: {
      button: 'h-12 w-12',
      icon: 'h-5 w-5',
      text: 'text-base',
    },
  };

  const config = sizeConfig[size];

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={cn(
        'relative group transition-all duration-200',
        showText ? 'px-3' : config.button,
        isCurrentlyFavorited && variant === 'ghost' && 'text-red-500 hover:text-red-600',
        isCurrentlyFavorited && variant === 'primary' && 'bg-red-500 hover:bg-red-600 text-white',
        isCurrentlyFavorited && variant === 'outline' && 'border-red-500 text-red-500 hover:bg-red-50',
        className
      )}
      title={isCurrentlyFavorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isCurrentlyFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isLoading ? (
        <Loader2 className={cn(config.icon, 'animate-spin')} />
      ) : (
        <Heart
          className={cn(
            config.icon,
            'transition-all duration-200',
            isCurrentlyFavorited ? 'fill-current' : 'group-hover:scale-110'
          )}
        />
      )}
      
      {showText && (
        <span className={cn('ml-2', config.text)}>
          {isCurrentlyFavorited ? 'Favorited' : 'Add to favorites'}
        </span>
      )}
      
      {/* Animated background for visual feedback */}
      <div
        className={cn(
          'absolute inset-0 rounded-md bg-red-500/10 opacity-0 transition-opacity duration-200',
          isCurrentlyFavorited && 'opacity-100',
          !showText && 'rounded-full'
        )}
      />
    </Button>
  );
}

// Compact version for product cards
export function CompactFavoriteButton({
  productId,
  className,
  ...props
}: Omit<FavoriteButtonProps, 'size' | 'showText'>) {
  return (
    <FavoriteButton
      productId={productId}
      size="sm"
      showText={false}
      className={cn('absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-sm hover:bg-white', className)}
      {...props}
    />
  );
}

// Full-width button for product pages
export function FullFavoriteButton({
  productId,
  className,
  ...props
}: Omit<FavoriteButtonProps, 'size' | 'showText' | 'variant'>) {
  return (
    <FavoriteButton
      productId={productId}
      variant="outline"
      size="lg"
      showText={true}
      className={cn('w-full justify-center', className)}
      {...props}
    />
  );
}

// Floating action button style
export function FloatingFavoriteButton({
  productId,
  className,
  ...props
}: Omit<FavoriteButtonProps, 'size' | 'showText' | 'variant'>) {
  const { isFavorite } = useFavorites();
  const isCurrentlyFavorited = isFavorite(productId);

  return (
    <FavoriteButton
      productId={productId}
      variant="primary"
      size="lg"
      showText={false}
      className={cn(
        'fixed bottom-6 right-6 z-50 rounded-full shadow-lg',
        'hover:shadow-xl transition-all duration-300',
        isCurrentlyFavorited ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-800 hover:bg-gray-900',
        className
      )}
      {...props}
    />
  );
}

export default FavoriteButton;
