'use client'

import * as React from "react"
import { usePathname } from "next/navigation"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { Sidebar } from "./Sidebar"
import { MobileNav } from "./MobileNav"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
}

export function MainLayout({ children, className }: MainLayoutProps) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  // Determine if we should show the sidebar
  const showSidebar = React.useMemo(() => {
    const dashboardRoutes = [
      '/dashboard',
      '/seller',
      '/partner',
      '/admin'
    ]
    
    return dashboardRoutes.some(route => pathname.startsWith(route))
  }, [pathname])

  // Determine if we should show header and footer
  const showHeaderFooter = React.useMemo(() => {
    const excludedRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/verify-email',
      '/auth/callback'
    ]
    
    return !excludedRoutes.includes(pathname)
  }, [pathname])

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      {showHeaderFooter && <Header />}

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar for dashboard pages */}
        {showSidebar && (
          <aside className="hidden lg:block">
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapsed={handleSidebarToggle}
              className="h-[calc(100vh-4rem)]" // Subtract header height
            />
          </aside>
        )}

        {/* Main Content */}
        <main 
          className={cn(
            "flex-1 flex flex-col",
            showSidebar && "lg:ml-0", // Sidebar handles its own width
            className
          )}
        >
          {children}
        </main>
      </div>

      {/* Footer */}
      {showHeaderFooter && <Footer />}

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  )
}

// Dashboard Layout for pages that need sidebar
interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function DashboardLayout({ 
  children, 
  title, 
  description, 
  className 
}: DashboardLayoutProps) {
  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      {/* Page Header */}
      {(title || description) && (
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            {title && (
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  )
}

// Content Layout for regular pages
interface ContentLayoutProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full'
  className?: string
}

export function ContentLayout({ 
  children, 
  maxWidth = '7xl',
  className 
}: ContentLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full'
  }

  return (
    <div className={cn(
      "mx-auto w-full px-4 py-8",
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  )
}

// Auth Layout for authentication pages
interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function AuthLayout({ 
  children, 
  title, 
  description, 
  className 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {(title || description) && (
          <div className="text-center">
            {title && (
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-2 text-sm text-gray-600">
                {description}
              </p>
            )}
          </div>
        )}
        <div className={className}>
          {children}
        </div>
      </div>
    </div>
  )
}
