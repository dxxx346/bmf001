// UI Component Library - Main Export File
// This file provides a centralized way to import all UI components

// Core Components
export { Button, buttonVariants } from './button'
export type { ButtonProps } from './button'

export { Input, inputVariants } from './input'
export type { InputProps } from './input'

export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter, 
  ProductCard,
  cardVariants 
} from './card'
export type { CardProps, ProductCardProps } from './card'

export { Modal, ConfirmModal, AlertModal, modalVariants } from './modal'
export type { ModalProps, ConfirmModalProps, AlertModalProps } from './modal'

export { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  Select,
  SelectItem,
  MultiSelect,
  MultiSelectItem
} from './dropdown'
export type { SelectProps, MultiSelectProps, SelectItemProps, MultiSelectItemProps } from './dropdown'

export { Badge, StatusBadge, CategoryBadge, badgeVariants } from './badge'
export type { BadgeProps, StatusBadgeProps, CategoryBadgeProps } from './badge'

export { 
  Avatar, 
  AvatarImage, 
  AvatarFallback, 
  UserAvatar, 
  AvatarGroup,
  avatarVariants 
} from './avatar'
export type { UserAvatarProps, AvatarGroupProps } from './avatar'

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonProductCard,
  SkeletonStats,
  skeletonVariants
} from './skeleton'
export type { SkeletonProps } from './skeleton'

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DashboardTabs,
  VerticalTabs,
  CardTabs,
  tabsListVariants,
  tabsTriggerVariants
} from './tabs'
export type { DashboardTabsProps, VerticalTabsProps, CardTabsProps } from './tabs'

// Additional UI Components
export { Label } from './label'
export { Separator } from './separator'
export { RadioGroup, RadioGroupItem } from './radio-group'
export { Textarea } from './textarea'
export { 
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction
} from './toast'
export type { ToastProps, ToastActionElement } from './toast'

// Legacy/Utility Components
export { default as ErrorMessage } from './ErrorMessage'
export { default as LoadingSpinner } from './LoadingSpinner'
