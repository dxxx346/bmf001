'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border bg-white text-gray-950 shadow-sm transition-all",
  {
    variants: {
      variant: {
        default: "border-gray-200",
        elevated: "border-gray-200 shadow-md",
        outlined: "border-2 border-gray-300",
        ghost: "border-transparent shadow-none",
        product: "border-gray-200 hover:shadow-lg hover:border-blue-300 cursor-pointer",
        info: "border-blue-200 bg-blue-50",
        success: "border-green-200 bg-green-50",
        warning: "border-yellow-200 bg-yellow-50",
        danger: "border-red-200 bg-red-50"
      },
      size: {
        sm: "p-3",
        default: "p-4",
        lg: "p-6",
        xl: "p-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Product Card Component
export interface ProductCardProps extends Omit<CardProps, 'variant'> {
  title: string
  description?: string
  price: number
  currency?: string
  imageUrl?: string
  imageAlt?: string
  onAddToCart?: () => void
  onFavorite?: () => void
  isFavorited?: boolean
  badge?: React.ReactNode
  rating?: number
  reviewCount?: number
}

const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  ({
    title,
    description,
    price,
    currency = "USD",
    imageUrl,
    imageAlt,
    onAddToCart,
    onFavorite,
    isFavorited = false,
    badge,
    rating,
    reviewCount,
    className,
    ...props
  }, ref) => {
    const formatPrice = (price: number, currency: string) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(price)
    }

    return (
      <Card
        ref={ref}
        variant="product"
        className={cn("overflow-hidden", className)}
        {...props}
      >
        <div className="relative">
          {imageUrl && (
            <div className="aspect-video w-full overflow-hidden bg-gray-100">
              <img
                src={imageUrl}
                alt={imageAlt || title}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          )}
          {badge && (
            <div className="absolute top-2 left-2">
              {badge}
            </div>
          )}
          {onFavorite && (
            <button
              onClick={onFavorite}
              className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
            >
              <svg
                className={cn(
                  "h-4 w-4",
                  isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"
                )}
                fill={isFavorited ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          )}
        </div>
        <CardContent className="p-4">
          <div className="space-y-2">
            <CardTitle className="text-lg font-semibold line-clamp-2">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="line-clamp-2">
                {description}
              </CardDescription>
            )}
            {(rating !== undefined || reviewCount !== undefined) && (
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                {rating !== undefined && (
                  <>
                    <span className="text-yellow-500">★</span>
                    <span>{rating.toFixed(1)}</span>
                  </>
                )}
                {reviewCount !== undefined && (
                  <span>({reviewCount} reviews)</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">
                {formatPrice(price, currency)}
              </span>
              {onAddToCart && (
                <button
                  onClick={onAddToCart}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)
ProductCard.displayName = "ProductCard"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  ProductCard,
  cardVariants
}

