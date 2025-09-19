/**
 * Optimized Image Component
 * Lazy loading, WebP/AVIF support, and performance optimization
 */

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  fill?: boolean
  style?: React.CSSProperties
  onLoad?: () => void
  onError?: () => void
  fallback?: string
  lazy?: boolean
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  fill = false,
  style,
  onLoad,
  onError,
  fallback = '/images/placeholder.svg',
  lazy = true,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy || priority)
  const imgRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px'
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, priority, isInView])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  const imageProps = {
    alt,
    quality,
    placeholder,
    blurDataURL,
    sizes: sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    className: cn(
      'transition-opacity duration-300',
      isLoaded ? 'opacity-100' : 'opacity-0',
      className
    ),
    style,
    onLoad: handleLoad,
    onError: handleError,
    priority,
    ...props
  }

  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={cn('bg-gray-200 animate-pulse', className)}
        style={{
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          ...style
        }}
      />
    )
  }

  if (hasError) {
    return (
      <Image
        src={fallback}
        {...imageProps}
        width={width}
        height={height}
        fill={fill}
      />
    )
  }

  return (
    <div ref={imgRef} className="relative">
      <Image
        src={src}
        {...imageProps}
        width={width}
        height={height}
        fill={fill}
      />
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-200 animate-pulse',
            'flex items-center justify-center'
          )}
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

export default LazyImage
