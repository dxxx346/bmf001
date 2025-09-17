'use client'

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  priority?: boolean
  quality?: number
  sizes?: string
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
  fallback?: React.ReactNode
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  priority = false,
  quality = 85,
  sizes,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  fallback
}: OptimizedImageProps) {
  const [error, setError] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  const handleLoad = React.useCallback(() => {
    setLoading(false)
    onLoad?.()
  }, [onLoad])

  const handleError = React.useCallback(() => {
    setError(true)
    setLoading(false)
    onError?.()
  }, [onError])

  if (error && fallback) {
    return <>{fallback}</>
  }

  if (error) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-gray-100 text-gray-400",
        className
      )}>
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        className={cn(
          "transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100",
          className
        )}
        priority={priority}
        quality={quality}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

// Pre-configured image variants
export const ProductImage = React.forwardRef<
  HTMLDivElement,
  Omit<OptimizedImageProps, 'sizes' | 'quality'> & {
    variant?: 'thumbnail' | 'card' | 'hero' | 'gallery'
  }
>(({ variant = 'card', ...props }, ref) => {
  const config = {
    thumbnail: {
      sizes: "64px",
      quality: 75,
    },
    card: {
      sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw",
      quality: 85,
    },
    hero: {
      sizes: "100vw",
      quality: 90,
      priority: true,
    },
    gallery: {
      sizes: "(max-width: 768px) 100vw, 50vw",
      quality: 90,
    },
  }

  return (
    <div ref={ref}>
      <OptimizedImage
        {...props}
        {...config[variant]}
        priority={props.priority ?? (config[variant] as any).priority ?? false}
      />
    </div>
  )
})

ProductImage.displayName = "ProductImage"

// Avatar image component
export const AvatarImage = React.forwardRef<
  HTMLDivElement,
  Omit<OptimizedImageProps, 'sizes' | 'quality' | 'fill'> & {
    size?: number
  }
>(({ size = 40, ...props }, ref) => {
  return (
    <div ref={ref}>
      <OptimizedImage
        {...props}
        width={size}
        height={size}
        sizes={`${size}px`}
        quality={80}
        className={cn("rounded-full", props.className)}
      />
    </div>
  )
})

AvatarImage.displayName = "AvatarImage"
