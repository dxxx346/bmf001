'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  BarChart3,
  ShoppingBag,
  Store,
  Users,
  Settings,
  Package,
  CreditCard,
  TrendingUp,
  MessageSquare,
  Heart,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  Briefcase,
  UserCheck,
  Gift,
  Shield,
  Bell,
  Activity,
  DollarSign,
  Target,
  Star,
  Calendar,
  Archive,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserAvatar } from "@/components/ui/avatar"
import { useAuthContext } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  children?: NavItem[]
  roles?: string[] // Which user roles can see this item
}

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
    title: "Downloads",
    href: "/dashboard/downloads",
    icon: Download,
    roles: ["buyer", "seller", "partner", "admin"]
  },
  {
    title: "Order History",
    href: "/dashboard/orders",
    icon: FileText,
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
    title: "Products",
    href: "/seller/products",
    icon: Package,
    roles: ["seller", "admin"],
    children: [
      {
        title: "All Products",
        href: "/seller/products",
        icon: Package
      },
      {
        title: "Add Product",
        href: "/seller/products/new",
        icon: Package
      },
      {
        title: "Categories",
        href: "/seller/categories",
        icon: Archive
      }
    ]
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
  },
  {
    title: "Customers",
    href: "/seller/customers",
    icon: Users,
    roles: ["seller", "admin"]
  },
  {
    title: "Reviews",
    href: "/seller/reviews",
    icon: Star,
    badge: "3",
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
    icon: UserCheck,
    roles: ["partner", "admin"]
  },
  {
    title: "Commissions",
    href: "/partner/commissions",
    icon: DollarSign,
    roles: ["partner", "admin"]
  },
  {
    title: "Marketing Tools",
    href: "/partner/marketing",
    icon: Target,
    roles: ["partner", "admin"]
  },
  {
    title: "Performance",
    href: "/partner/performance",
    icon: Activity,
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
    title: "Products",
    href: "/admin/products",
    icon: Package,
    roles: ["admin"]
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
    roles: ["admin"]
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    roles: ["admin"]
  },
  {
    title: "Content",
    href: "/admin/content",
    icon: FileText,
    roles: ["admin"]
  }
]

const commonNavItems: NavItem[] = [
  {
    title: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    badge: "5",
    roles: ["buyer", "seller", "partner", "admin"]
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["buyer", "seller", "partner", "admin"]
  },
  {
    title: "Help & Support",
    href: "/help",
    icon: HelpCircle,
    roles: ["buyer", "seller", "partner", "admin"]
  }
]

export function Sidebar({ className, collapsed = false, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const { profile } = useAuthContext()
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const hasAccess = (roles?: string[]) => {
    if (!roles || !profile) return true
    return roles.includes(profile.role)
  }

  const getNavigationItems = () => {
    let items: NavItem[] = []

    // Add role-specific items
    if (pathname.startsWith('/seller') && hasAccess(['seller', 'admin'])) {
      items = [...items, ...sellerNavItems]
    } else if (pathname.startsWith('/partner') && hasAccess(['partner', 'admin'])) {
      items = [...items, ...partnerNavItems]
    } else if (pathname.startsWith('/admin') && hasAccess(['admin'])) {
      items = [...items, ...adminNavItems]
    } else {
      items = [...items, ...buyerNavItems]
    }

    // Add separator and common items
    return [...items, ...commonNavItems]
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    if (!hasAccess(item.roles)) return null

    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const isExpanded = expandedItems.includes(item.href)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.href}>
        <div className="relative">
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(item.href)}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" size="sm" className="ml-2">
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 ml-2 transition-transform",
                      isExpanded && "rotate-90"
                    )}
                  />
                </>
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" size="sm" className="ml-2">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <UserAvatar
              src={profile?.avatar_url || undefined}
              name={profile?.name || profile?.email || 'User'}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.role || 'Member'}
              </p>
            </div>
          </div>
        )}
        
        {onToggleCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            className={cn("h-8 w-8", collapsed && "mx-auto")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {getNavigationItems().map((item, index) => (
          <React.Fragment key={item.href}>
            {index === getNavigationItems().length - commonNavItems.length && (
              <Separator className="my-4" />
            )}
            {renderNavItem(item)}
          </React.Fragment>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Digital Marketplace v1.0
          </div>
        </div>
      )}
    </div>
  )
}
