'use client'

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"
import { User } from "lucide-react"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        default: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
        "2xl": "h-20 w-20",
        "3xl": "h-24 w-24"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const avatarImageVariants = cva("aspect-square h-full w-full object-cover")

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-gray-600",
  {
    variants: {
      size: {
        xs: "text-xs",
        sm: "text-sm",
        default: "text-sm",
        lg: "text-base",
        xl: "text-lg",
        "2xl": "text-xl",
        "3xl": "text-2xl"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> &
    VariantProps<typeof avatarVariants>
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size }), className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn(avatarImageVariants(), className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> &
    VariantProps<typeof avatarFallbackVariants>
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(avatarFallbackVariants({ size }), className)}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// User Avatar Component
export interface UserAvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  name?: string
  className?: string
  showOnlineStatus?: boolean
  isOnline?: boolean
  fallbackIcon?: React.ReactNode
}

const UserAvatar = React.forwardRef<HTMLDivElement, UserAvatarProps>(
  ({
    src,
    alt,
    name,
    size,
    className,
    showOnlineStatus = false,
    isOnline = false,
    fallbackIcon
  }, ref) => {
    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const getStatusIndicatorSize = (size?: string | null) => {
      switch (size) {
        case 'xs':
          return 'h-1.5 w-1.5'
        case 'sm':
          return 'h-2 w-2'
        case 'default':
          return 'h-2.5 w-2.5'
        case 'lg':
          return 'h-3 w-3'
        case 'xl':
          return 'h-3.5 w-3.5'
        case '2xl':
          return 'h-4 w-4'
        case '3xl':
          return 'h-5 w-5'
        default:
          return 'h-2.5 w-2.5'
      }
    }

    return (
      <div ref={ref} className="relative">
        <Avatar size={size} className={className}>
          <AvatarImage src={src} alt={alt || name} />
          <AvatarFallback size={size}>
            {name ? (
              getInitials(name)
            ) : fallbackIcon ? (
              fallbackIcon
            ) : (
              <User className="h-4 w-4" />
            )}
          </AvatarFallback>
        </Avatar>
        {showOnlineStatus && (
          <span
            className={cn(
              "absolute bottom-0 right-0 block rounded-full border-2 border-white",
              getStatusIndicatorSize(size),
              isOnline ? "bg-green-500" : "bg-gray-400"
            )}
          />
        )}
      </div>
    )
  }
)
UserAvatar.displayName = "UserAvatar"

// Avatar Group Component
export interface AvatarGroupProps {
  avatars: Array<{
    src?: string
    alt?: string
    name?: string
  }>
  max?: number
  size?: VariantProps<typeof avatarVariants>['size']
  className?: string
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 5,
  size = "default",
  className
}) => {
  const displayedAvatars = avatars.slice(0, max)
  const remainingCount = Math.max(0, avatars.length - max)

  return (
    <div className={cn("flex -space-x-2", className)}>
      {displayedAvatars.map((avatar, index) => (
        <UserAvatar
          key={index}
          src={avatar.src}
          alt={avatar.alt}
          name={avatar.name}
          size={size}
          className="border-2 border-white ring-2 ring-gray-100"
        />
      ))}
      {remainingCount > 0 && (
        <Avatar size={size} className="border-2 border-white ring-2 ring-gray-100">
          <AvatarFallback size={size} className="bg-gray-200 text-gray-600 font-medium">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar, AvatarGroup, avatarVariants }
