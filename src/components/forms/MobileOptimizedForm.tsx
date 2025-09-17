'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Check,
  AlertCircle,
  Info,
  Camera,
  Upload,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Mail,
  User,
  CreditCard,
  Lock,
  Search
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mobile-optimized input components
interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  showCounter?: boolean
  maxLength?: number
  isTouched?: boolean
  onTouch?: () => void
}

export function MobileInput({
  label,
  error,
  hint,
  icon,
  rightIcon,
  showCounter,
  maxLength,
  isTouched,
  onTouch,
  className,
  ...props
}: MobileInputProps) {
  const [isFocused, setIsFocused] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    onTouch?.()
    props.onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    props.onBlur?.(e)
  }

  const isPasswordField = props.type === 'password'
  const currentLength = props.value?.toString().length || 0
  const hasError = error && isTouched

  return (
    <div className="space-y-2">
      {label && (
        <Label 
          htmlFor={props.id}
          className={cn(
            "text-sm font-medium transition-colors",
            hasError ? "text-red-600" : "text-gray-700",
            isFocused && "text-blue-600"
          )}
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <Input
          ref={inputRef}
          {...props}
          type={isPasswordField && showPassword ? 'text' : props.type}
          className={cn(
            "h-12 text-base", // Larger height and font size for mobile
            icon && "pl-10",
            (rightIcon || isPasswordField) && "pr-10",
            hasError && "border-red-500 focus:border-red-500 focus:ring-red-200",
            isFocused && !hasError && "border-blue-500 ring-2 ring-blue-100",
            className
          )}
          onFocus={handleFocus}
          onBlur={handleBlur}
          // Mobile-specific attributes
          autoComplete={props.autoComplete || getAutoComplete(props.name)}
          inputMode={getInputMode(props.type)}
          enterKeyHint={getEnterKeyHint(props.name)}
        />
        
        {/* Password toggle */}
        {isPasswordField && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        )}
        
        {/* Right icon */}
        {rightIcon && !isPasswordField && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {/* Counter, hint, and error */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex-1">
          {hasError ? (
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              {error}
            </div>
          ) : hint ? (
            <div className="flex items-center text-gray-500">
              <Info className="h-3 w-3 mr-1" />
              {hint}
            </div>
          ) : null}
        </div>
        
        {showCounter && maxLength && (
          <div className={cn(
            "text-gray-500",
            currentLength > maxLength * 0.9 && "text-amber-600",
            currentLength >= maxLength && "text-red-600"
          )}>
            {currentLength}/{maxLength}
          </div>
        )}
      </div>
    </div>
  )
}

// Mobile-optimized textarea
interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  showCounter?: boolean
  maxLength?: number
  isTouched?: boolean
  onTouch?: () => void
  autoResize?: boolean
}

export function MobileTextarea({
  label,
  error,
  hint,
  showCounter,
  maxLength,
  isTouched,
  onTouch,
  autoResize = true,
  className,
  ...props
}: MobileTextareaProps) {
  const [isFocused, setIsFocused] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true)
    onTouch?.()
    props.onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false)
    props.onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
    props.onChange?.(e)
  }

  React.useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [props.value, autoResize])

  const currentLength = props.value?.toString().length || 0
  const hasError = error && isTouched

  return (
    <div className="space-y-2">
      {label && (
        <Label 
          htmlFor={props.id}
          className={cn(
            "text-sm font-medium transition-colors",
            hasError ? "text-red-600" : "text-gray-700",
            isFocused && "text-blue-600"
          )}
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <Textarea
        ref={textareaRef}
        {...props}
        className={cn(
          "min-h-[96px] text-base resize-none", // Larger min height and font size for mobile
          hasError && "border-red-500 focus:border-red-500 focus:ring-red-200",
          isFocused && !hasError && "border-blue-500 ring-2 ring-blue-100",
          className
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
      />
      
      {/* Counter, hint, and error */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex-1">
          {hasError ? (
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              {error}
            </div>
          ) : hint ? (
            <div className="flex items-center text-gray-500">
              <Info className="h-3 w-3 mr-1" />
              {hint}
            </div>
          ) : null}
        </div>
        
        {showCounter && maxLength && (
          <div className={cn(
            "text-gray-500",
            currentLength > maxLength * 0.9 && "text-amber-600",
            currentLength >= maxLength && "text-red-600"
          )}>
            {currentLength}/{maxLength}
          </div>
        )}
      </div>
    </div>
  )
}

// Mobile-optimized select
interface MobileSelectProps {
  label?: string
  error?: string
  hint?: string
  placeholder?: string
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>
  value?: string
  onValueChange?: (value: string) => void
  isTouched?: boolean
  onTouch?: () => void
  required?: boolean
  disabled?: boolean
  searchable?: boolean
}

export function MobileSelect({
  label,
  error,
  hint,
  placeholder = "Select an option",
  options,
  value,
  onValueChange,
  isTouched,
  onTouch,
  required,
  disabled,
  searchable = false
}: MobileSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const hasError = error && isTouched

  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  const selectedOption = options.find(option => option.value === value)

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue)
    onTouch?.()
    setIsOpen(false)
    setSearchQuery("")
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label 
          className={cn(
            "text-sm font-medium transition-colors",
            hasError ? "text-red-600" : "text-gray-700"
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full h-12 justify-between text-base", // Larger height and font size
              !selectedOption && "text-gray-500",
              hasError && "border-red-500",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <div className="flex items-center">
              {selectedOption?.icon && (
                <span className="mr-2">{selectedOption.icon}</span>
              )}
              {selectedOption?.label || placeholder}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>{label || "Select an option"}</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-4">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            )}
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={value === option.value ? "primary" : "ghost"}
                  className="w-full justify-start h-12 text-base"
                  onClick={() => handleSelect(option.value)}
                >
                  {option.icon && (
                    <span className="mr-2">{option.icon}</span>
                  )}
                  {option.label}
                  {value === option.value && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </Button>
              ))}
              
              {filteredOptions.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No options found
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Hint and error */}
      <div className="text-xs">
        {hasError ? (
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            {error}
          </div>
        ) : hint ? (
          <div className="flex items-center text-gray-500">
            <Info className="h-3 w-3 mr-1" />
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Mobile form step wrapper
interface MobileFormStepProps {
  title: string
  description?: string
  currentStep: number
  totalSteps: number
  children: React.ReactNode
  onNext?: () => void
  onPrevious?: () => void
  nextLabel?: string
  previousLabel?: string
  isNextDisabled?: boolean
  isLoading?: boolean
  className?: string
}

export function MobileFormStep({
  title,
  description,
  currentStep,
  totalSteps,
  children,
  onNext,
  onPrevious,
  nextLabel = "Continue",
  previousLabel = "Back",
  isNextDisabled = false,
  isLoading = false,
  className
}: MobileFormStepProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      {/* Header with progress */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{title}</h1>
            <Badge variant="secondary">
              {currentStep} of {totalSteps}
            </Badge>
          </div>
          
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
          
          <Progress value={progress} className="h-2" />
        </div>
      </div>
      
      {/* Form content */}
      <div className="flex-1 p-4 pb-24">
        {children}
      </div>
      
      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={isLoading}
              className="flex-1 h-12"
            >
              {previousLabel}
            </Button>
          )}
          
          <Button
            onClick={onNext}
            disabled={isNextDisabled || isLoading}
            loading={isLoading}
            className="flex-1 h-12"
          >
            {currentStep === totalSteps ? "Complete" : nextLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Utility functions
function getAutoComplete(name?: string): string {
  const autoCompleteMap: Record<string, string> = {
    email: 'email',
    password: 'current-password',
    'new-password': 'new-password',
    'confirm-password': 'new-password',
    'first-name': 'given-name',
    'last-name': 'family-name',
    name: 'name',
    phone: 'tel',
    address: 'street-address',
    city: 'address-level2',
    state: 'address-level1',
    'postal-code': 'postal-code',
    country: 'country-name',
    'credit-card': 'cc-number',
    'expiry-date': 'cc-exp',
    cvv: 'cc-csc',
    organization: 'organization',
    title: 'organization-title'
  }
  
  return autoCompleteMap[name || ''] || 'off'
}

function getInputMode(type?: string): "search" | "text" | "email" | "url" | "numeric" | "none" | "tel" | "decimal" | undefined {
  const inputModeMap: Record<string, string> = {
    email: 'email',
    tel: 'tel',
    number: 'numeric',
    decimal: 'decimal',
    url: 'url',
    search: 'search'
  }
  
  return (inputModeMap[type || ''] || 'text') as "search" | "text" | "email" | "url" | "numeric" | "none" | "tel" | "decimal" | undefined
}

function getEnterKeyHint(name?: string): "search" | "enter" | "done" | "go" | "next" | "previous" | "send" | undefined {
  const enterKeyMap: Record<string, string> = {
    email: 'next',
    password: 'done',
    search: 'search',
    message: 'send',
    comment: 'send'
  }
  
  return (enterKeyMap[name || ''] || 'next') as "search" | "enter" | "done" | "go" | "next" | "previous" | "send" | undefined
}
