import { useState, useEffect } from 'react'

export interface MobileDetectionResult {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  isIOS: boolean
  isAndroid: boolean
  isPWA: boolean
  orientation: 'portrait' | 'landscape'
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  hasNotch: boolean
  supportsHover: boolean
}

export function useMobileDetection(): MobileDetectionResult {
  const [detection, setDetection] = useState<MobileDetectionResult>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    isIOS: false,
    isAndroid: false,
    isPWA: false,
    orientation: 'landscape',
    screenSize: 'xl',
    hasNotch: false,
    supportsHover: true,
  })

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const width = window.innerWidth
      const height = window.innerHeight

      // Device type detection
      const isMobile = width < 768
      const isTablet = width >= 768 && width < 1024
      const isDesktop = width >= 1024

      // Touch device detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      // OS detection
      const isIOS = /iphone|ipad|ipod/.test(userAgent)
      const isAndroid = /android/.test(userAgent)

      // PWA detection
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true

      // Orientation
      const orientation = height > width ? 'portrait' : 'landscape'

      // Screen size breakpoints
      let screenSize: MobileDetectionResult['screenSize'] = 'xs'
      if (width >= 640) screenSize = 'sm'
      if (width >= 768) screenSize = 'md'
      if (width >= 1024) screenSize = 'lg'
      if (width >= 1280) screenSize = 'xl'
      if (width >= 1536) screenSize = '2xl'

      // Notch detection (rough heuristic)
      const hasNotch = isIOS && (
        (width === 375 && height === 812) || // iPhone X/XS
        (width === 414 && height === 896) || // iPhone XR/XS Max
        (width === 390 && height === 844) || // iPhone 12/13
        (width === 428 && height === 926) || // iPhone 12/13 Pro Max
        (width === 393 && height === 852) || // iPhone 14
        (width === 430 && height === 932)    // iPhone 14 Pro Max
      )

      // Hover support detection
      const supportsHover = window.matchMedia('(hover: hover)').matches

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        isIOS,
        isAndroid,
        isPWA,
        orientation,
        screenSize,
        hasNotch,
        supportsHover,
      })
    }

    // Initial detection
    detectDevice()

    // Listen for resize and orientation changes
    const handleResize = () => {
      detectDevice()
    }

    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(detectDevice, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    // Listen for PWA mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = () => {
      detectDevice()
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleDisplayModeChange)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange)
      } else {
        mediaQuery.removeListener(handleDisplayModeChange)
      }
    }
  }, [])

  return detection
}

// Hook for responsive breakpoints
export function useBreakpoint() {
  const { screenSize } = useMobileDetection()
  
  return {
    isXs: screenSize === 'xs',
    isSm: screenSize === 'sm',
    isMd: screenSize === 'md',
    isLg: screenSize === 'lg',
    isXl: screenSize === 'xl',
    is2Xl: screenSize === '2xl',
    isSmAndUp: ['sm', 'md', 'lg', 'xl', '2xl'].includes(screenSize),
    isMdAndUp: ['md', 'lg', 'xl', '2xl'].includes(screenSize),
    isLgAndUp: ['lg', 'xl', '2xl'].includes(screenSize),
    isXlAndUp: ['xl', '2xl'].includes(screenSize),
    screenSize,
  }
}

// Hook for orientation changes
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')

  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      setOrientation(newOrientation)
    }

    // Initial check
    handleOrientationChange()

    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return orientation
}

// Hook for safe area insets
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
      })
    }

    // Set CSS custom properties for safe area insets
    const root = document.documentElement
    root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)')
    root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)')
    root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)')
    root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)')

    updateSafeArea()

    // Listen for changes (though safe area insets rarely change)
    window.addEventListener('resize', updateSafeArea)
    window.addEventListener('orientationchange', updateSafeArea)

    return () => {
      window.removeEventListener('resize', updateSafeArea)
      window.removeEventListener('orientationchange', updateSafeArea)
    }
  }, [])

  return safeArea
}

// Hook for viewport height (handles mobile browser address bar)
export function useViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight)

  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight)
      
      // Set CSS custom property for dynamic viewport height
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
    }

    updateViewportHeight()

    window.addEventListener('resize', updateViewportHeight)
    window.addEventListener('orientationchange', updateViewportHeight)

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
      window.removeEventListener('orientationchange', updateViewportHeight)
    }
  }, [])

  return viewportHeight
}

// Hook for PWA detection and capabilities
export function usePWA() {
  const [pwaState, setPwaState] = useState({
    isInstalled: false,
    canInstall: false,
    isStandalone: false,
  })

  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    // Check if PWA can be installed
    let deferredPrompt: any = null

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e
      setPwaState(prev => ({ ...prev, canInstall: true }))
    }

    const handleAppInstalled = () => {
      setPwaState(prev => ({ ...prev, isInstalled: true, canInstall: false }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    setPwaState({
      isInstalled: isStandalone,
      canInstall: false,
      isStandalone,
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installPWA = async () => {
    // This would trigger the PWA install prompt
    // Implementation depends on your PWA setup
  }

  return {
    ...pwaState,
    installPWA,
  }
}
