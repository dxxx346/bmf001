'use client'

import { useState, useRef, useEffect } from 'react'
import { Product, ProductImage } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSwipe, usePinchZoom, useDoubleTap, TouchPosition } from '@/hooks/useTouch'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Pause
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageGalleryProps {
  images: ProductImage[]
  product: Product
  className?: string
}

interface ZoomModalProps {
  image: ProductImage
  isOpen: boolean
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

function ZoomModal({ 
  image, 
  isOpen, 
  onClose, 
  onPrevious, 
  onNext, 
  hasPrevious, 
  hasNext 
}: ZoomModalProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)

  // Touch gesture handlers
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (hasNext) onNext?.()
    },
    onSwipeRight: () => {
      if (hasPrevious) onPrevious?.()
    },
    onSwipeUp: () => {
      onClose()
    },
    threshold: 50,
    preventDefaultOnSwipe: true
  })

  const pinchHandlers = usePinchZoom({
    onPinch: (newScale: number, center: TouchPosition) => {
      setScale(newScale)
      // Adjust position to zoom towards the pinch center
      const rect = modalRef.current?.getBoundingClientRect()
      if (rect) {
        const centerX = center.x - rect.left - rect.width / 2
        const centerY = center.y - rect.top - rect.height / 2
        setPosition({
          x: centerX * (1 - newScale),
          y: centerY * (1 - newScale)
        })
      }
    },
    minScale: 0.5,
    maxScale: 5,
    preventDefault: true
  })

  const doubleTapHandlers = useDoubleTap({
    onDoubleTap: (tapPosition: TouchPosition) => {
      if (scale > 1) {
        // Reset zoom
        setScale(1)
        setPosition({ x: 0, y: 0 })
      } else {
        // Zoom in to 2x at tap position
        const rect = modalRef.current?.getBoundingClientRect()
        if (rect) {
          const centerX = tapPosition.x - rect.left - rect.width / 2
          const centerY = tapPosition.y - rect.top - rect.height / 2
          setScale(2)
          setPosition({
            x: centerX * -1,
            y: centerY * -1
          })
        }
      }
    },
    onSingleTap: () => {
      if (scale <= 1) {
        onClose()
      }
    },
    delay: 300,
    preventDefault: true
  })

  // Combine touch handlers
  const touchHandlers = {
    ...swipeHandlers,
    ...pinchHandlers,
    ...doubleTapHandlers
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setScale(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasPrevious) onPrevious?.()
          break
        case 'ArrowRight':
          if (hasNext) onNext?.()
          break
        case '+':
        case '=':
          setScale(prev => Math.min(prev * 1.2, 5))
          break
        case '-':
          setScale(prev => Math.max(prev / 1.2, 0.1))
          break
        case 'r':
        case 'R':
          setRotation(prev => (prev + 90) % 360)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasPrevious, hasNext, onClose, onPrevious, onNext])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.min(Math.max(prev * delta, 0.1), 5))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const resetTransform = () => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  if (!isOpen) return null

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Navigation Arrows */}
      {hasPrevious && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
          onClick={onPrevious}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {hasNext && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
          onClick={onNext}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Image Container */}
      <div
        className="relative max-w-full max-h-full cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        {...touchHandlers}
      >
        <img
          src={image.image_url}
          alt={image.alt_text || 'Product image'}
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          draggable={false}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-black/50 rounded-lg p-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-black/30"
          onClick={() => setScale(prev => Math.max(prev / 1.2, 0.1))}
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        
        <span className="text-white text-sm px-2">
          {Math.round(scale * 100)}%
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-black/30"
          onClick={() => setScale(prev => Math.min(prev * 1.2, 5))}
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        
        <div className="w-px h-6 bg-white/30" />
        
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-black/30"
          onClick={() => setRotation(prev => (prev + 90) % 360)}
        >
          <RotateCw className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-black/30"
          onClick={resetTransform}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

export function ImageGallery({ images, product, className }: ImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()
  const galleryRef = useRef<HTMLDivElement>(null)

  // Touch gesture handlers for main gallery
  const gallerySwipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (galleryImages.length > 1) {
        handleNext()
      }
    },
    onSwipeRight: () => {
      if (galleryImages.length > 1) {
        handlePrevious()
      }
    },
    threshold: 30,
    preventDefaultOnSwipe: false
  })

  const galleryDoubleTapHandlers = useDoubleTap({
    onDoubleTap: () => {
      setIsZoomModalOpen(true)
    },
    delay: 300,
    preventDefault: false
  })

  // Use product thumbnail if no images provided
  const galleryImages = images.length > 0 ? images : [{
    id: 'thumbnail',
    product_id: product.id,
    image_url: product.images?.[0]?.image_url || product.thumbnail_url || '/placeholder-image.jpg',
    thumbnail_url: product.thumbnail_url || '/placeholder-image.jpg',
    alt_text: product.title,
    sort_order: 0,
    is_primary: true,
    created_at: new Date().toISOString()
  }]

  const selectedImage = galleryImages[selectedImageIndex]

  useEffect(() => {
    if (isPlaying && galleryImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setSelectedImageIndex(prev => (prev + 1) % galleryImages.length)
      }, 3000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, galleryImages.length])

  const handleThumbnailClick = (index: number) => {
    setSelectedImageIndex(index)
    setIsPlaying(false)
  }

  const handlePrevious = () => {
    setSelectedImageIndex(prev => 
      prev === 0 ? galleryImages.length - 1 : prev - 1
    )
  }

  const handleNext = () => {
    setSelectedImageIndex(prev => 
      prev === galleryImages.length - 1 ? 0 : prev + 1
    )
  }

  const handleZoom = () => {
    setIsZoomModalOpen(true)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = selectedImage.image_url
    link.download = `${product.title}-image-${selectedImageIndex + 1}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Image */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div 
            ref={galleryRef}
            className="relative aspect-square bg-gray-100 group touch-none"
            {...gallerySwipeHandlers}
            {...galleryDoubleTapHandlers}
          >
            <img
              src={selectedImage.image_url}
              alt={selectedImage.alt_text || product.title}
              className="w-full h-full object-cover cursor-zoom-in select-none"
              onClick={handleZoom}
              draggable={false}
            />

            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/90 text-gray-900 hover:bg-white"
                  onClick={handleZoom}
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/90 text-gray-900 hover:bg-white"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5" />
                </Button>
                {galleryImages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-white/90 text-gray-900 hover:bg-white"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Navigation Arrows */}
            {galleryImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePrevious()
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNext()
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* Image Counter */}
            {galleryImages.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
                {selectedImageIndex + 1} / {galleryImages.length}
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col space-y-2">
              {product.is_featured && (
                <Badge className="bg-blue-600 text-white">
                  Featured
                </Badge>
              )}
              {product.sale_price && product.sale_price < product.price && (
                <Badge className="bg-red-600 text-white">
                  Sale
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thumbnail Strip */}
      {galleryImages.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {galleryImages.map((image, index) => (
            <button
              key={image.id}
              className={cn(
                "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                selectedImageIndex === index
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => handleThumbnailClick(index)}
            >
              <img
                src={image.thumbnail_url || image.image_url}
                alt={image.alt_text || `Product image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      <ZoomModal
        image={selectedImage}
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        onPrevious={galleryImages.length > 1 ? handlePrevious : undefined}
        onNext={galleryImages.length > 1 ? handleNext : undefined}
        hasPrevious={galleryImages.length > 1}
        hasNext={galleryImages.length > 1}
      />
    </div>
  )
}
