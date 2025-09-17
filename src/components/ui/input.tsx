'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
  {
    variants: {
      variant: {
        default: "border-gray-300 bg-white focus-visible:ring-blue-500",
        error: "border-red-500 bg-red-50 focus-visible:ring-red-500",
        success: "border-green-500 bg-green-50 focus-visible:ring-green-500",
        warning: "border-yellow-500 bg-yellow-50 focus-visible:ring-yellow-500"
      },
      size: {
        sm: "h-9 px-3 text-xs",
        default: "h-10 px-3 py-2",
        lg: "h-11 px-4 py-3 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string
  error?: string
  success?: string
  warning?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  showPasswordToggle?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    type = "text",
    label,
    error,
    success,
    warning,
    helperText,
    leftIcon,
    rightIcon,
    showPasswordToggle = false,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [inputType, setInputType] = React.useState(type)

    // Determine variant based on validation state
    const computedVariant = error ? "error" : success ? "success" : warning ? "warning" : variant

    React.useEffect(() => {
      if (type === "password" && showPasswordToggle) {
        setInputType(showPassword ? "text" : "password")
      } else {
        setInputType(type)
      }
    }, [type, showPassword, showPasswordToggle])

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    const hasLeftIcon = leftIcon || (error && <AlertCircle className="h-4 w-4 text-red-500" />) || 
                       (success && <CheckCircle className="h-4 w-4 text-green-500" />) ||
                       (warning && <AlertCircle className="h-4 w-4 text-yellow-500" />)
    
    const hasRightIcon = rightIcon || (showPasswordToggle && type === "password")

    return (
      <div className="w-full">
        {label && (
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {label}
          </label>
        )}
        <div className="relative">
          {hasLeftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon || (error && <AlertCircle className="h-4 w-4 text-red-500" />) || 
               (success && <CheckCircle className="h-4 w-4 text-green-500" />) ||
               (warning && <AlertCircle className="h-4 w-4 text-yellow-500" />)}
            </div>
          )}
          
          <input
            type={inputType}
            className={cn(
              inputVariants({ variant: computedVariant, size, className }),
              hasLeftIcon && "pl-10",
              hasRightIcon && "pr-10"
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          />
          
          {hasRightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {showPasswordToggle && type === "password" ? (
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={disabled}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>
        
        {(error || success || warning || helperText) && (
          <div className="mt-1 text-xs">
            {error && <p className="text-red-600">{error}</p>}
            {success && <p className="text-green-600">{success}</p>}
            {warning && <p className="text-yellow-600">{warning}</p>}
            {!error && !success && !warning && helperText && (
              <p className="text-gray-500">{helperText}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }

