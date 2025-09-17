'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  allowHalf?: boolean;
  showValue?: boolean;
  showCount?: boolean;
  reviewCount?: number;
  className?: string;
  onChange?: (rating: number) => void;
  onHover?: (rating: number) => void;
  disabled?: boolean;
  color?: 'yellow' | 'blue' | 'green' | 'red' | 'purple';
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

const colorClasses = {
  yellow: {
    filled: 'text-yellow-400 fill-current',
    empty: 'text-gray-300',
    hover: 'text-yellow-500',
  },
  blue: {
    filled: 'text-blue-400 fill-current',
    empty: 'text-gray-300',
    hover: 'text-blue-500',
  },
  green: {
    filled: 'text-green-400 fill-current',
    empty: 'text-gray-300',
    hover: 'text-green-500',
  },
  red: {
    filled: 'text-red-400 fill-current',
    empty: 'text-gray-300',
    hover: 'text-red-500',
  },
  purple: {
    filled: 'text-purple-400 fill-current',
    empty: 'text-gray-300',
    hover: 'text-purple-500',
  },
};

export function RatingStars({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  allowHalf = false,
  showValue = false,
  showCount = false,
  reviewCount,
  className,
  onChange,
  onHover,
  disabled = false,
  color = 'yellow',
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Calculate the display rating (hover takes precedence)
  const displayRating = isHovering && interactive ? hoverRating : rating;

  // Generate stars array
  const stars = useMemo(() => {
    const starArray = [];
    for (let i = 1; i <= maxRating; i++) {
      const difference = displayRating - i;
      let starType: 'empty' | 'half' | 'full';
      
      if (difference >= 0) {
        starType = 'full';
      } else if (allowHalf && difference >= -0.5) {
        starType = 'half';
      } else {
        starType = 'empty';
      }
      
      starArray.push({
        index: i,
        type: starType,
      });
    }
    return starArray;
  }, [displayRating, maxRating, allowHalf]);

  const handleClick = useCallback((starIndex: number, event?: React.MouseEvent) => {
    if (!interactive || disabled || !onChange) return;

    let newRating = starIndex;

    // If allowing half stars and clicking on left half
    if (allowHalf && event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const starWidth = rect.width;
      
      if (clickX < starWidth / 2) {
        newRating = starIndex - 0.5;
      }
    }

    onChange(newRating);
  }, [interactive, disabled, onChange, allowHalf]);

  const handleMouseEnter = useCallback((starIndex: number, event?: React.MouseEvent) => {
    if (!interactive || disabled) return;

    let hoverValue = starIndex;

    // If allowing half stars and hovering over left half
    if (allowHalf && event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const starWidth = rect.width;
      
      if (mouseX < starWidth / 2) {
        hoverValue = starIndex - 0.5;
      }
    }

    setHoverRating(hoverValue);
    setIsHovering(true);
    onHover?.(hoverValue);
  }, [interactive, disabled, allowHalf, onHover]);

  const handleMouseLeave = useCallback(() => {
    if (!interactive || disabled) return;
    
    setIsHovering(false);
    setHoverRating(0);
    onHover?.(0);
  }, [interactive, disabled, onHover]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, starIndex: number) => {
    if (!interactive || disabled || !onChange) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onChange(starIndex);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      const newRating = Math.max(0, starIndex - 1);
      onChange(newRating);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      const newRating = Math.min(maxRating, starIndex + 1);
      onChange(newRating);
    }
  }, [interactive, disabled, onChange, maxRating]);

  const renderStar = (star: { index: number; type: 'empty' | 'half' | 'full' }) => {
    const colors = colorClasses[color];
    const isClickable = interactive && !disabled;
    
    let starColor = colors.empty;
    if (star.type === 'full') {
      starColor = isHovering ? colors.hover : colors.filled;
    } else if (star.type === 'half') {
      starColor = isHovering ? colors.hover : colors.filled;
    }

    const StarIcon = star.type === 'half' ? StarHalf : Star;
    
    return (
      <button
        key={star.index}
        type="button"
        className={cn(
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded',
          isClickable ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={isClickable ? (e) => handleClick(star.index, e) : undefined}
        onMouseEnter={isClickable ? (e) => handleMouseEnter(star.index, e) : undefined}
        onMouseMove={isClickable && allowHalf ? (e) => handleMouseEnter(star.index, e) : undefined}
        onMouseLeave={isClickable ? handleMouseLeave : undefined}
        onKeyDown={isClickable ? (e) => handleKeyDown(e, star.index) : undefined}
        disabled={disabled}
        tabIndex={isClickable ? 0 : -1}
        aria-label={`${star.index} star${star.index !== 1 ? 's' : ''}`}
      >
        <StarIcon 
          className={cn(
            sizeClasses[size],
            starColor,
            star.type === 'full' && 'fill-current',
            'transition-colors duration-150'
          )}
        />
      </button>
    );
  };

  const formatRating = (value: number) => {
    return allowHalf ? value.toFixed(1) : Math.round(value).toString();
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Stars */}
      <div 
        className="flex items-center gap-0.5"
        role={interactive ? 'radiogroup' : 'img'}
        aria-label={interactive ? 'Rating selection' : `Rating: ${formatRating(rating)} out of ${maxRating} stars`}
      >
        {stars.map(renderStar)}
      </div>

      {/* Rating Value */}
      {showValue && (
        <span className="text-sm font-medium text-gray-700 ml-1">
          {formatRating(displayRating)}
        </span>
      )}

      {/* Review Count */}
      {showCount && reviewCount !== undefined && (
        <span className="text-sm text-gray-500 ml-1">
          ({formatCount(reviewCount)})
        </span>
      )}
    </div>
  );
}

// Preset components for common use cases
export function ProductRating({ 
  rating, 
  reviewCount, 
  size = 'md',
  className 
}: { 
  rating: number; 
  reviewCount?: number; 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <RatingStars
      rating={rating}
      size={size}
      showValue={true}
      showCount={true}
      reviewCount={reviewCount}
      className={className}
    />
  );
}

export function InteractiveRating({ 
  rating, 
  onChange, 
  size = 'lg',
  allowHalf = false,
  disabled = false,
  className 
}: { 
  rating: number; 
  onChange: (rating: number) => void; 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  allowHalf?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RatingStars
      rating={rating}
      size={size}
      interactive={true}
      allowHalf={allowHalf}
      onChange={onChange}
      disabled={disabled}
      className={className}
    />
  );
}

export function CompactRating({ 
  rating, 
  reviewCount, 
  className 
}: { 
  rating: number; 
  reviewCount?: number; 
  className?: string;
}) {
  return (
    <RatingStars
      rating={rating}
      size="sm"
      showValue={true}
      showCount={!!reviewCount}
      reviewCount={reviewCount}
      className={className}
    />
  );
}

export default RatingStars;
