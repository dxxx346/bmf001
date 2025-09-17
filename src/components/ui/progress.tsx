'use client'

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative h-4 w-full overflow-hidden rounded-full",
  {
    variants: {
      variant: {
        default: "bg-gray-200",
        success: "bg-green-200",
        warning: "bg-yellow-200",
        danger: "bg-red-200"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-blue-600",
        success: "bg-green-600",
        warning: "bg-yellow-600",
        danger: "bg-red-600"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  value?: number
  max?: number
  showValue?: boolean
  size?: 'sm' | 'default' | 'lg'
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ 
  className, 
  variant, 
  value = 0, 
  max = 100, 
  showValue = false,
  size = 'default',
  ...props 
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const sizeClasses = {
    sm: 'h-2',
    default: 'h-4',
    lg: 'h-6'
  }

  return (
    <div className="w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          progressVariants({ variant }),
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(progressIndicatorVariants({ variant }))}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>
      
      {showValue && (
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

// Circular Progress Component
export interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  className?: string
  variant?: VariantProps<typeof progressIndicatorVariants>['variant']
  showValue?: boolean
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  className,
  variant = 'default',
  showValue = true
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getStrokeColor = (variant: string) => {
    switch (variant) {
      case 'success':
        return '#16a34a'
      case 'warning':
        return '#ca8a04'
      case 'danger':
        return '#dc2626'
      default:
        return '#2563eb'
    }
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getStrokeColor(variant || 'default')}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-gray-900">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  )
}

// Step Progress Component
export interface StepProgressProps {
  steps: Array<{
    title: string
    description?: string
    completed?: boolean
    current?: boolean
  }>
  className?: string
}

export function StepProgress({ steps, className }: StepProgressProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li
            key={step.title}
            className={cn(
              stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20" : "",
              "relative"
            )}
          >
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div
                className={cn(
                  "h-0.5 w-full",
                  step.completed ? "bg-blue-600" : "bg-gray-200"
                )}
              />
            </div>
            <div
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full border-2",
                step.completed
                  ? "border-blue-600 bg-blue-600"
                  : step.current
                  ? "border-blue-600 bg-white"
                  : "border-gray-300 bg-white"
              )}
            >
              {step.completed ? (
                <Check className="h-5 w-5 text-white" />
              ) : (
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    step.current ? "bg-blue-600" : "bg-transparent"
                  )}
                />
              )}
            </div>
            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-32 text-center">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.completed || step.current
                    ? "text-blue-600"
                    : "text-gray-500"
                )}
              >
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export { Progress, progressVariants }
