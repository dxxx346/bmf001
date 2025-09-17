'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-600 text-white hover:bg-blue-700",
        secondary:
          "border-transparent bg-gray-600 text-white hover:bg-gray-700",
        success:
          "border-transparent bg-green-600 text-white hover:bg-green-700",
        danger:
          "border-transparent bg-red-600 text-white hover:bg-red-700",
        warning:
          "border-transparent bg-yellow-600 text-white hover:bg-yellow-700",
        outline:
          "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        ghost:
          "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200",
        // Status variants
        pending:
          "border-transparent bg-yellow-100 text-yellow-800",
        approved:
          "border-transparent bg-green-100 text-green-800",
        rejected:
          "border-transparent bg-red-100 text-red-800",
        draft:
          "border-transparent bg-gray-100 text-gray-800",
        published:
          "border-transparent bg-blue-100 text-blue-800",
        featured:
          "border-transparent bg-purple-100 text-purple-800",
        sale:
          "border-transparent bg-red-100 text-red-800 animate-pulse",
        new:
          "border-transparent bg-green-100 text-green-800",
        popular:
          "border-transparent bg-orange-100 text-orange-800"
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dismissible?: boolean
  onDismiss?: () => void
  icon?: React.ReactNode
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dismissible, onDismiss, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove</span>
          </button>
        )}
      </div>
    )
  }
)
Badge.displayName = "Badge"

// Status Badge Component
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'published' | 'featured' | 'active' | 'inactive'
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, ...props }, ref) => {
    const getVariant = (status: string) => {
      switch (status) {
        case 'pending':
          return 'pending'
        case 'approved':
        case 'active':
        case 'published':
          return 'approved'
        case 'rejected':
        case 'inactive':
          return 'rejected'
        case 'draft':
          return 'draft'
        case 'featured':
          return 'featured'
        default:
          return 'default'
      }
    }

    return (
      <Badge
        ref={ref}
        variant={getVariant(status) as any}
        {...props}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

// Category Badge Component
export interface CategoryBadgeProps extends Omit<BadgeProps, 'variant'> {
  category: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
}

const CategoryBadge = React.forwardRef<HTMLDivElement, CategoryBadgeProps>(
  ({ category, color = 'blue', ...props }, ref) => {
    const getVariant = (color: string) => {
      switch (color) {
        case 'green':
          return 'success'
        case 'red':
          return 'danger'
        case 'yellow':
          return 'warning'
        case 'gray':
          return 'secondary'
        case 'purple':
          return 'featured'
        default:
          return 'default'
      }
    }

    return (
      <Badge
        ref={ref}
        variant={getVariant(color) as any}
        {...props}
      >
        {category}
      </Badge>
    )
  }
)
CategoryBadge.displayName = "CategoryBadge"

export { Badge, StatusBadge, CategoryBadge, badgeVariants }

