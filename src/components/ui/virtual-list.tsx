'use client'

import * as React from "react"
import { useVirtualScroll, useVirtualScrollVariable } from "@/hooks/useVirtualScroll"
import { cn } from "@/lib/utils"

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  className?: string
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  enabled?: boolean
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  className,
  renderItem,
  overscan = 5,
  enabled = true
}: VirtualListProps<T>) {
  const {
    totalHeight,
    visibleItems,
    scrollElementRef,
    getItemProps
  } = useVirtualScroll(items, {
    itemHeight,
    containerHeight: height,
    overscan,
    enabled
  })

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
    >
      <div
        style={{
          height: enabled ? totalHeight : 'auto',
          position: 'relative'
        }}
      >
        {visibleItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          if (!item) return null

          const itemProps = getItemProps(virtualItem.index)
          
          return (
            <div {...itemProps}>
              {renderItem(item, virtualItem.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Variable height virtual list
interface VirtualListVariableProps<T> {
  items: T[]
  estimateItemHeight: (index: number) => number
  height: number
  className?: string
  renderItem: (item: T, index: number, measureRef: (el: HTMLElement | null) => void) => React.ReactNode
  overscan?: number
  enabled?: boolean
}

export function VirtualListVariable<T>({
  items,
  estimateItemHeight,
  height,
  className,
  renderItem,
  overscan = 5,
  enabled = true
}: VirtualListVariableProps<T>) {
  const {
    totalHeight,
    visibleItems,
    scrollElementRef,
    getItemProps,
    measureItem
  } = useVirtualScrollVariable(items, {
    estimateItemHeight,
    containerHeight: height,
    overscan,
    enabled
  })

  const measureRefs = React.useRef<Map<number, ResizeObserver>>(new Map())

  const createMeasureRef = React.useCallback((index: number) => {
    return (el: HTMLElement | null) => {
      const existingObserver = measureRefs.current.get(index)
      if (existingObserver) {
        existingObserver.disconnect()
        measureRefs.current.delete(index)
      }

      if (el) {
        const observer = new ResizeObserver((entries) => {
          const entry = entries[0]
          if (entry) {
            measureItem(index, entry.contentRect.height)
          }
        })
        observer.observe(el)
        measureRefs.current.set(index, observer)
      }
    }
  }, [measureItem])

  React.useEffect(() => {
    return () => {
      measureRefs.current.forEach(observer => observer.disconnect())
      measureRefs.current.clear()
    }
  }, [])

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
    >
      <div
        style={{
          height: enabled ? totalHeight : 'auto',
          position: 'relative'
        }}
      >
        {visibleItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          if (!item) return null

          const itemProps = getItemProps(virtualItem.index)
          const measureRef = createMeasureRef(virtualItem.index)
          
          return (
            <div {...itemProps}>
              {renderItem(item, virtualItem.index, measureRef)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Virtual grid component
interface VirtualGridProps<T> {
  items: T[]
  itemHeight: number
  itemWidth: number
  columnsCount: number
  height: number
  className?: string
  renderItem: (item: T, index: number) => React.ReactNode
  gap?: number
  overscan?: number
  enabled?: boolean
}

export function VirtualGrid<T>({
  items,
  itemHeight,
  itemWidth,
  columnsCount,
  height,
  className,
  renderItem,
  gap = 0,
  overscan = 5,
  enabled = true
}: VirtualGridProps<T>) {
  const rowHeight = itemHeight + gap
  const rowCount = Math.ceil(items.length / columnsCount)
  
  const {
    totalHeight,
    visibleItems,
    scrollElementRef,
    getItemProps
  } = useVirtualScroll(Array.from({ length: rowCount }), {
    itemHeight: rowHeight,
    containerHeight: height,
    overscan,
    enabled
  })

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
    >
      <div
        style={{
          height: enabled ? totalHeight : 'auto',
          position: 'relative'
        }}
      >
        {visibleItems.map((virtualRow) => {
          const rowIndex = virtualRow.index
          const startItemIndex = rowIndex * columnsCount
          const endItemIndex = Math.min(startItemIndex + columnsCount, items.length)
          
          const rowProps = getItemProps(rowIndex)
          
          return (
            <div
              {...rowProps}
              style={{
                ...rowProps.style,
                display: 'flex',
                gap: gap,
              }}
            >
              {Array.from({ length: endItemIndex - startItemIndex }).map((_, colIndex) => {
                const itemIndex = startItemIndex + colIndex
                const item = items[itemIndex]
                
                if (!item) return null
                
                return (
                  <div
                    key={`grid-item-${itemIndex}`}
                    style={{
                      width: itemWidth,
                      height: itemHeight,
                      flexShrink: 0
                    }}
                  >
                    {renderItem(item, itemIndex)}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Virtual product list specifically for the marketplace
interface VirtualProductListProps {
  products: any[]
  height: number
  className?: string
  renderProduct: (product: any, index: number) => React.ReactNode
  variant?: 'list' | 'grid'
  enabled?: boolean
}

export function VirtualProductList({
  products,
  height,
  className,
  renderProduct,
  variant = 'list',
  enabled = true
}: VirtualProductListProps) {
  if (variant === 'grid') {
    return (
      <VirtualGrid
        items={products}
        itemHeight={320} // Approximate card height
        itemWidth={280} // Approximate card width
        columnsCount={Math.floor((window?.innerWidth || 1200) / 300)} // Dynamic columns
        height={height}
        className={className}
        renderItem={renderProduct}
        gap={16}
        enabled={enabled}
      />
    )
  }

  return (
    <VirtualList
      items={products}
      itemHeight={120} // Approximate compact card height
      height={height}
      className={className}
      renderItem={renderProduct}
      enabled={enabled}
    />
  )
}
