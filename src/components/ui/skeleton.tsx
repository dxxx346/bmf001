'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const skeletonVariants = cva(
  "animate-pulse rounded-md bg-gray-200",
  {
    variants: {
      variant: {
        default: "bg-gray-200",
        light: "bg-gray-100",
        dark: "bg-gray-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
}

// Preset Skeleton Components
const SkeletonText: React.FC<{
  lines?: number
  className?: string
  variant?: VariantProps<typeof skeletonVariants>['variant']
}> = ({ lines = 1, className, variant }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

const SkeletonAvatar: React.FC<{
  size?: 'sm' | 'default' | 'lg' | 'xl'
  className?: string
  variant?: VariantProps<typeof skeletonVariants>['variant']
}> = ({ size = 'default', className, variant }) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  }

  return (
    <Skeleton
      variant={variant}
      className={cn("rounded-full", sizeClasses[size], className)}
    />
  )
}

const SkeletonButton: React.FC<{
  size?: 'sm' | 'default' | 'lg'
  className?: string
  variant?: VariantProps<typeof skeletonVariants>['variant']
}> = ({ size = 'default', className, variant }) => {
  const sizeClasses = {
    sm: "h-9 w-20",
    default: "h-10 w-24",
    lg: "h-11 w-28"
  }

  return (
    <Skeleton
      variant={variant}
      className={cn("rounded-md", sizeClasses[size], className)}
    />
  )
}

const SkeletonCard: React.FC<{
  className?: string
  variant?: VariantProps<typeof skeletonVariants>['variant']
  showImage?: boolean
  showAvatar?: boolean
  lines?: number
}> = ({ 
  className, 
  variant, 
  showImage = true, 
  showAvatar = false,
  lines = 3 
}) => {
  return (
    <div className={cn("p-4 border rounded-lg bg-white", className)}>
      {showImage && (
        <Skeleton variant={variant} className="h-48 w-full mb-4 rounded-md" />
      )}
      
      <div className="space-y-3">
        {showAvatar && (
          <div className="flex items-center space-x-3">
            <SkeletonAvatar size="sm" variant={variant} />
            <Skeleton variant={variant} className="h-4 w-24" />
          </div>
        )}
        
        <div className="space-y-2">
          <Skeleton variant={variant} className="h-5 w-3/4" />
          <SkeletonText lines={lines} variant={variant} />
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <Skeleton variant={variant} className="h-6 w-16" />
          <SkeletonButton size="sm" variant={variant} />
        </div>
      </div>
    </div>
  )
}

const SkeletonTable: React.FC<{
  rows?: number
  columns?: number
  className?: string
  variant?: VariantProps<typeof skeletonVariants>['variant']
}> = ({ rows = 5, columns = 4, className, variant }) => {
  return (
    <div className={cn("w-full", className)}>
      {/* Table Header */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} variant={variant} className="h-4 w-full" />
        ))}
      </div>
      
      {/* Table Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                variant={variant}
                className="h-4 w-full"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const SkeletonList: React.FC<{
  items?: number
  showAvatar?: boolean
  className?: string
  variant?: VariantProps<typeof skeletonVariants>['variant']
}> = ({ items = 5, showAvatar = true, className, variant }) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          {showAvatar && (
            <SkeletonAvatar size="default" variant={variant} />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton variant={variant} className="h-4 w-3/4" />
            <Skeleton variant={variant} className="h-3 w-1/2" />
          </div>
          <Skeleton variant={variant} className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

// Product Card Skeleton
const SkeletonProductCard: React.FC<{
  className?: string
  variant?: VariantProps<typeof skeletonVariants>['variant']
}> = ({ className, variant }) => {
  return (
    <div className={cn("border rounded-lg overflow-hidden bg-white", className)}>
      {/* Product Image */}
      <Skeleton variant={variant} className="aspect-video w-full" />
      
      {/* Product Info */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton variant={variant} className="h-5 w-full" />
        <Skeleton variant={variant} className="h-5 w-3/4" />
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton variant={variant} className="h-3 w-full" />
          <Skeleton variant={variant} className="h-3 w-2/3" />
        </div>
        
        {/* Rating */}
        <div className="flex items-center space-x-2">
          <Skeleton variant={variant} className="h-4 w-20" />
          <Skeleton variant={variant} className="h-4 w-16" />
        </div>
        
        {/* Price and Button */}
        <div className="flex items-center justify-between pt-2">
          <Skeleton variant={variant} className="h-6 w-20" />
          <Skeleton variant={variant} className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  )
}

// Dashboard Stats Skeleton
const SkeletonStats: React.FC<{
  cards?: number
  className?: string
  variant?: VariantProps<typeof skeletonVariants>['variant']
}> = ({ cards = 4, className, variant }) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg bg-white">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant={variant} className="h-4 w-20" />
            <Skeleton variant={variant} className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton variant={variant} className="h-8 w-16 mb-2" />
          <Skeleton variant={variant} className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonProductCard,
  SkeletonStats,
  skeletonVariants
}
