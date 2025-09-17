import { useRef, useCallback, useEffect } from 'react'

export interface TouchPosition {
  x: number
  y: number
}

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down'
  distance: number
  velocity: number
  duration: number
}

export interface TouchGesture {
  startPosition: TouchPosition
  currentPosition: TouchPosition
  distance: number
  duration: number
  velocity: number
}

export interface UseTouchOptions {
  onSwipeLeft?: (gesture: TouchGesture) => void
  onSwipeRight?: (gesture: TouchGesture) => void
  onSwipeUp?: (gesture: TouchGesture) => void
  onSwipeDown?: (gesture: TouchGesture) => void
  onTap?: (position: TouchPosition) => void
  onDoubleTap?: (position: TouchPosition) => void
  onLongPress?: (position: TouchPosition) => void
  onPinch?: (scale: number, center: TouchPosition) => void
  minSwipeDistance?: number
  minSwipeVelocity?: number
  longPressDelay?: number
  doubleTapDelay?: number
  preventDefault?: boolean
}

export function useTouch(options: UseTouchOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    onPinch,
    minSwipeDistance = 50,
    minSwipeVelocity = 0.3,
    longPressDelay = 500,
    doubleTapDelay = 300,
    preventDefault = false
  } = options

  const touchStart = useRef<TouchPosition | null>(null)
  const touchEnd = useRef<TouchPosition | null>(null)
  const startTime = useRef<number>(0)
  const lastTap = useRef<number>(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const initialDistance = useRef<number>(0)
  const initialScale = useRef<number>(1)

  const getTouchPosition = useCallback((e: TouchEvent): TouchPosition => {
    return {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    }
  }, [])

  const getDistance = useCallback((pos1: TouchPosition, pos2: TouchPosition): number => {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
    )
  }, [])

  const getSwipeDirection = useCallback((start: TouchPosition, end: TouchPosition): SwipeDirection => {
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)
    const distance = getDistance(start, end)
    const duration = Date.now() - startTime.current
    const velocity = distance / duration

    if (absDeltaX > absDeltaY) {
      return {
        direction: deltaX > 0 ? 'right' : 'left',
        distance,
        velocity,
        duration
      }
    } else {
      return {
        direction: deltaY > 0 ? 'down' : 'up',
        distance,
        velocity,
        duration
      }
    }
  }, [getDistance])

  const getPinchDistance = useCallback((e: TouchEvent): number => {
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
  }, [])

  const getPinchCenter = useCallback((e: TouchEvent): TouchPosition => {
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }

    const now = Date.now()
    const position = getTouchPosition(e)
    
    touchStart.current = position
    touchEnd.current = null
    startTime.current = now

    // Handle pinch gesture
    if (e.touches.length === 2) {
      initialDistance.current = getPinchDistance(e)
      return
    }

    // Handle long press
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress(position)
      }, longPressDelay)
    }

    // Handle double tap
    if (onDoubleTap) {
      const timeSinceLastTap = now - lastTap.current
      if (timeSinceLastTap < doubleTapDelay) {
        onDoubleTap(position)
        lastTap.current = 0 // Reset to prevent triple tap
      } else {
        lastTap.current = now
      }
    }
  }, [
    preventDefault,
    getTouchPosition,
    getPinchDistance,
    onLongPress,
    onDoubleTap,
    longPressDelay,
    doubleTapDelay
  ])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }

    if (!touchStart.current) return

    // Clear long press timer on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // Handle pinch gesture
    if (e.touches.length === 2 && onPinch) {
      const currentDistance = getPinchDistance(e)
      const scale = currentDistance / initialDistance.current
      const center = getPinchCenter(e)
      onPinch(scale, center)
      return
    }

    touchEnd.current = getTouchPosition(e)
  }, [
    preventDefault,
    getTouchPosition,
    getPinchDistance,
    getPinchCenter,
    onPinch
  ])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    if (!touchStart.current) return

    const endPosition = touchEnd.current || getTouchPosition(e)
    const distance = getDistance(touchStart.current, endPosition)
    const duration = Date.now() - startTime.current
    const velocity = distance / duration

    // Check if it's a swipe
    if (distance >= minSwipeDistance && velocity >= minSwipeVelocity) {
      const swipe = getSwipeDirection(touchStart.current, endPosition)
      const gesture: TouchGesture = {
        startPosition: touchStart.current,
        currentPosition: endPosition,
        distance,
        duration,
        velocity
      }

      switch (swipe.direction) {
        case 'left':
          onSwipeLeft?.(gesture)
          break
        case 'right':
          onSwipeRight?.(gesture)
          break
        case 'up':
          onSwipeUp?.(gesture)
          break
        case 'down':
          onSwipeDown?.(gesture)
          break
      }
    } else if (distance < 10 && duration < 200) {
      // It's a tap
      if (onTap && (!onDoubleTap || Date.now() - lastTap.current > doubleTapDelay)) {
        setTimeout(() => {
          if (Date.now() - lastTap.current > doubleTapDelay) {
            onTap(touchStart.current!)
          }
        }, doubleTapDelay)
      }
    }

    // Reset
    touchStart.current = null
    touchEnd.current = null
    initialDistance.current = 0
  }, [
    preventDefault,
    getTouchPosition,
    getDistance,
    getSwipeDirection,
    minSwipeDistance,
    minSwipeVelocity,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    doubleTapDelay,
    lastTap
  ])

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd
  }

  return touchHandlers
}

// Hook for swipeable components
export interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  preventDefaultOnSwipe?: boolean
}

export function useSwipe(options: UseSwipeOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefaultOnSwipe = true
  } = options

  const touchHandlers = useTouch({
    onSwipeLeft: onSwipeLeft ? () => onSwipeLeft() : undefined,
    onSwipeRight: onSwipeRight ? () => onSwipeRight() : undefined,
    onSwipeUp: onSwipeUp ? () => onSwipeUp() : undefined,
    onSwipeDown: onSwipeDown ? () => onSwipeDown() : undefined,
    minSwipeDistance: threshold,
    preventDefault: preventDefaultOnSwipe
  })

  return touchHandlers
}

// Hook for long press
export interface UseLongPressOptions {
  onLongPress: (position: TouchPosition) => void
  delay?: number
  preventDefault?: boolean
}

export function useLongPress(options: UseLongPressOptions) {
  const { onLongPress, delay = 500, preventDefault = true } = options

  const touchHandlers = useTouch({
    onLongPress,
    longPressDelay: delay,
    preventDefault
  })

  return touchHandlers
}

// Hook for double tap
export interface UseDoubleTapOptions {
  onDoubleTap: (position: TouchPosition) => void
  onSingleTap?: (position: TouchPosition) => void
  delay?: number
  preventDefault?: boolean
}

export function useDoubleTap(options: UseDoubleTapOptions) {
  const { onDoubleTap, onSingleTap, delay = 300, preventDefault = true } = options

  const touchHandlers = useTouch({
    onDoubleTap,
    onTap: onSingleTap,
    doubleTapDelay: delay,
    preventDefault
  })

  return touchHandlers
}

// Hook for pinch to zoom
export interface UsePinchZoomOptions {
  onPinch: (scale: number, center: TouchPosition) => void
  minScale?: number
  maxScale?: number
  preventDefault?: boolean
}

export function usePinchZoom(options: UsePinchZoomOptions) {
  const { onPinch, minScale = 0.5, maxScale = 3, preventDefault = true } = options

  const touchHandlers = useTouch({
    onPinch: (scale, center) => {
      const clampedScale = Math.min(Math.max(scale, minScale), maxScale)
      onPinch(clampedScale, center)
    },
    preventDefault
  })

  return touchHandlers
}
