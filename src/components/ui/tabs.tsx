'use client'

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const tabsListVariants = cva(
  "inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500",
  {
    variants: {
      variant: {
        default: "bg-gray-100",
        outline: "bg-transparent border border-gray-200",
        pills: "bg-transparent space-x-1 p-0"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "data-[state=active]:bg-white data-[state=active]:text-gray-950 data-[state=active]:shadow-sm",
        outline: "border border-transparent data-[state=active]:border-gray-300 data-[state=active]:bg-white data-[state=active]:shadow-sm",
        pills: "rounded-full border border-gray-200 bg-white hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> &
    VariantProps<typeof tabsListVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    VariantProps<typeof tabsTriggerVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// Dashboard Tabs Component
export interface DashboardTabsProps {
  defaultValue: string
  className?: string
  variant?: VariantProps<typeof tabsListVariants>['variant']
  tabs: Array<{
    value: string
    label: string
    icon?: React.ReactNode
    badge?: React.ReactNode
    disabled?: boolean
  }>
  children: React.ReactNode
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({
  defaultValue,
  className,
  variant = "default",
  tabs,
  children
}) => {
  return (
    <Tabs defaultValue={defaultValue} className={className}>
      <TabsList variant={variant}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            variant={variant}
            disabled={tab.disabled}
            className="flex items-center space-x-2"
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span>{tab.badge}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}

// Vertical Tabs Component
export interface VerticalTabsProps {
  defaultValue: string
  className?: string
  tabs: Array<{
    value: string
    label: string
    icon?: React.ReactNode
    badge?: React.ReactNode
    disabled?: boolean
  }>
  children: React.ReactNode
}

const VerticalTabs: React.FC<VerticalTabsProps> = ({
  defaultValue,
  className,
  tabs,
  children
}) => {
  return (
    <Tabs
      defaultValue={defaultValue}
      orientation="vertical"
      className={cn("flex space-x-6", className)}
    >
      <div className="flex flex-col space-y-1 border-r border-gray-200 pr-6">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              "justify-start px-4 py-2 text-left data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-r-2 data-[state=active]:border-blue-700 data-[state=active]:shadow-none",
              "hover:bg-gray-50 rounded-none border-r-2 border-transparent"
            )}
          >
            <div className="flex items-center space-x-3">
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && <span className="ml-auto">{tab.badge}</span>}
            </div>
          </TabsTrigger>
        ))}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </Tabs>
  )
}

// Card Tabs Component (for switching between different card views)
export interface CardTabsProps {
  defaultValue: string
  className?: string
  tabs: Array<{
    value: string
    label: string
    count?: number
  }>
  children: React.ReactNode
}

const CardTabs: React.FC<CardTabsProps> = ({
  defaultValue,
  className,
  tabs,
  children
}) => {
  return (
    <Tabs defaultValue={defaultValue} className={className}>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "whitespace-nowrap border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700",
                "data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-900 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {children}
      </div>
    </Tabs>
  )
}

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
}

