'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home,
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Package,
  Heart,
  Bell,
  Settings,
  Store,
  Briefcase,
  BarChart3,
  Users,
  TrendingUp,
  Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuthContext } from "@/contexts/AuthContext"
import { useCartStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface MobileNavProps {
  className?: string
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  roles?: string[]
}

const mainNavItems: NavItem[] = [
  {
    title: "Home",
    href: "/",
    icon: Home
  },
  {
    title: "Products",
    href: "/products",
    icon: Package
  },
  {
    title: "Search",
    href: "/search",
    icon: Search
  },
  {
    title: "Cart",
    href: "/cart",
    icon: ShoppingCart
  }
]

const buyerNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["buyer", "seller", "partner", "admin"]
  },
  {
    title: "My Purchases",
    href: "/dashboard/purchases",
    icon: Package,
    roles: ["buyer", "seller", "partner", "admin"]
  },
  {
    title: "Favorites",
    href: "/dashboard/favorites",
    icon: Heart,
    roles: ["buyer", "seller", "partner", "admin"]
  },
  {
    title: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    badge: "3",
    roles: ["buyer", "seller", "partner", "admin"]
  }
]

const sellerNavItems: NavItem[] = [
  {
    title: "Seller Dashboard",
    href: "/seller/dashboard",
    icon: Store,
    roles: ["seller", "admin"]
  },
  {
    title: "My Products",
    href: "/seller/products",
    icon: Package,
    roles: ["seller", "admin"]
  },
  {
    title: "Sales",
    href: "/seller/sales",
    icon: TrendingUp,
    roles: ["seller", "admin"]
  },
  {
    title: "Analytics",
    href: "/seller/analytics",
    icon: BarChart3,
    roles: ["seller", "admin"]
  }
]

const partnerNavItems: NavItem[] = [
  {
    title: "Partner Dashboard",
    href: "/partner/dashboard",
    icon: Briefcase,
    roles: ["partner", "admin"]
  },
  {
    title: "Referrals",
    href: "/partner/referrals",
    icon: Users,
    roles: ["partner", "admin"]
  },
  {
    title: "Performance",
    href: "/partner/performance",
    icon: BarChart3,
    roles: ["partner", "admin"]
  }
]

const adminNavItems: NavItem[] = [
  {
    title: "Admin Dashboard",
    href: "/admin",
    icon: Shield,
    roles: ["admin"]
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    roles: ["admin"]
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    roles: ["admin"]
  }
]

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname()
  const { profile, isAuthenticated } = useAuthContext()
  const { getTotalItems } = useCartStore()
  const [isOpen, setIsOpen] = React.useState(false)

  const cartItemCount = getTotalItems()

  const hasAccess = (roles?: string[]) => {
    if (!roles || !profile) return true
    return roles.includes(profile.role)
  }

  const getDashboardItems = () => {
    if (!isAuthenticated || !profile) return []

    switch (profile.role) {
      case 'seller':
        return sellerNavItems.filter(item => hasAccess(item.roles))
      case 'partner':
        return partnerNavItems.filter(item => hasAccess(item.roles))
      case 'admin':
        return [...sellerNavItems, ...partnerNavItems, ...adminNavItems].filter(item => hasAccess(item.roles))
      default:
        return buyerNavItems.filter(item => hasAccess(item.roles))
    }
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={cn(
          "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
          isActive
            ? "bg-blue-100 text-blue-700"
            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
        )}
      >
        <item.icon className="h-5 w-5 mr-3" />
        <span className="flex-1">{item.title}</span>
        {item.badge && (
          <Badge variant="secondary" size="sm">
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden",
        className
      )}>
        <div className="grid grid-cols-5 h-16">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center space-y-1 relative",
                  isActive ? "text-blue-600" : "text-gray-600"
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.href === "/cart" && cartItemCount > 0 && (
                    <Badge 
                      variant="danger" 
                      size="sm"
                      className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.title}</span>
              </Link>
            )
          })}

          {/* Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center space-y-1 text-gray-600">
                <Menu className="h-5 w-5" />
                <span className="text-xs font-medium">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">DM</span>
                    </div>
                    <span className="font-bold text-lg">Menu</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* User Section */}
                {isAuthenticated && profile ? (
                  <div className="p-4 border-b">
                    <div className="flex items-center space-x-3">
                      <UserAvatar
                        src={profile.avatar_url || undefined}
                        name={profile.name || profile.email}
                        size="default"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {profile.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {profile.email}
                        </p>
                        <Badge variant="outline" size="sm" className="mt-1">
                          {profile.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-b">
                    <div className="space-y-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setIsOpen(false)
                          // Navigate to login
                        }}
                      >
                        Sign In
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setIsOpen(false)
                          // Navigate to register
                        }}
                      >
                        Sign Up
                      </Button>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                  {/* Dashboard Items */}
                  {isAuthenticated && (
                    <>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Dashboard
                      </div>
                      {getDashboardItems().map(renderNavItem)}
                      <div className="my-4 border-t border-gray-200" />
                    </>
                  )}

                  {/* General Navigation */}
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Browse
                  </div>
                  <Link
                    href="/categories"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Categories
                  </Link>
                  <Link
                    href="/shops"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Featured Shops
                  </Link>
                  <Link
                    href="/deals"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Deals & Offers
                  </Link>

                  <div className="my-4 border-t border-gray-200" />

                  {/* Support */}
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Support
                  </div>
                  <Link
                    href="/help"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Help Center
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Contact Us
                  </Link>

                  {isAuthenticated && (
                    <>
                      <div className="my-4 border-t border-gray-200" />
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="h-5 w-5 mr-3" />
                        Settings
                      </Link>
                    </>
                  )}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t">
                  <div className="text-xs text-gray-500 text-center">
                    Digital Marketplace v1.0
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Spacer for bottom navigation */}
      <div className="h-16 md:hidden" />
    </>
  )
}
