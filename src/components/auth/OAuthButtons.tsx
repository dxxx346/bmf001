'use client'

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/contexts/AuthContext"
import { Github } from "lucide-react"
import { cn } from "@/lib/utils"

// Google Icon Component
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

interface OAuthButtonsProps {
  className?: string
  disabled?: boolean
  onSuccess?: () => void
  onError?: (error: string) => void
  variant?: 'default' | 'compact'
  showDivider?: boolean
}

export function OAuthButtons({
  className,
  disabled = false,
  onSuccess,
  onError,
  variant = 'default',
  showDivider = true
}: OAuthButtonsProps) {
  const { signInWithOAuth } = useAuthContext()
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setLoadingProvider(provider)
      const result = await signInWithOAuth(provider)
      
      if (result.success) {
        onSuccess?.()
      } else {
        onError?.(result.message)
      }
    } catch (error: any) {
      const message = error?.message || `${provider} login failed`
      onError?.(message)
    } finally {
      setLoadingProvider(null)
    }
  }

  const isLoading = (provider: string) => loadingProvider === provider

  if (variant === 'compact') {
    return (
      <div className={cn("flex gap-3", className)}>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={disabled || !!loadingProvider}
          loading={isLoading('google')}
          onClick={() => handleOAuthLogin('google')}
        >
          {!isLoading('google') && <GoogleIcon className="w-5 h-5 mr-2" />}
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={disabled || !!loadingProvider}
          loading={isLoading('github')}
          onClick={() => handleOAuthLogin('github')}
        >
          {!isLoading('github') && <Github className="w-5 h-5 mr-2" />}
          GitHub
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={disabled || !!loadingProvider}
        loading={isLoading('google')}
        loadingText="Connecting to Google..."
        onClick={() => handleOAuthLogin('google')}
      >
        {!isLoading('google') && <GoogleIcon className="w-5 h-5 mr-3" />}
        Continue with Google
      </Button>
      
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={disabled || !!loadingProvider}
        loading={isLoading('github')}
        loadingText="Connecting to GitHub..."
        onClick={() => handleOAuthLogin('github')}
      >
        {!isLoading('github') && <Github className="w-5 h-5 mr-3" />}
        Continue with GitHub
      </Button>

      {showDivider && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Individual OAuth Button Components
interface OAuthButtonProps {
  provider: 'google' | 'github'
  className?: string
  disabled?: boolean
  loading?: boolean
  onSuccess?: () => void
  onError?: (error: string) => void
  children?: React.ReactNode
}

export function GoogleLoginButton({
  className,
  disabled,
  loading,
  onSuccess,
  onError,
  children = "Continue with Google"
}: Omit<OAuthButtonProps, 'provider'>) {
  const { signInWithOAuth } = useAuthContext()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    try {
      setIsLoading(true)
      const result = await signInWithOAuth('google')
      
      if (result.success) {
        onSuccess?.()
      } else {
        onError?.(result.message)
      }
    } catch (error: any) {
      onError?.(error?.message || 'Google login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={cn("w-full", className)}
      disabled={disabled || loading || isLoading}
      loading={loading || isLoading}
      loadingText="Connecting to Google..."
      onClick={handleLogin}
    >
      {!(loading || isLoading) && <GoogleIcon className="w-5 h-5 mr-3" />}
      {children}
    </Button>
  )
}

export function GitHubLoginButton({
  className,
  disabled,
  loading,
  onSuccess,
  onError,
  children = "Continue with GitHub"
}: Omit<OAuthButtonProps, 'provider'>) {
  const { signInWithOAuth } = useAuthContext()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    try {
      setIsLoading(true)
      const result = await signInWithOAuth('github')
      
      if (result.success) {
        onSuccess?.()
      } else {
        onError?.(result.message)
      }
    } catch (error: any) {
      onError?.(error?.message || 'GitHub login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={cn("w-full bg-gray-900 text-white hover:bg-gray-800 border-gray-900", className)}
      disabled={disabled || loading || isLoading}
      loading={loading || isLoading}
      loadingText="Connecting to GitHub..."
      onClick={handleLogin}
    >
      {!(loading || isLoading) && <Github className="w-5 h-5 mr-3" />}
      {children}
    </Button>
  )
}

// OAuth Provider Configuration
export const oauthProviders = [
  {
    id: 'google',
    name: 'Google',
    icon: GoogleIcon,
    buttonComponent: GoogleLoginButton,
    description: 'Sign in with your Google account'
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: Github,
    buttonComponent: GitHubLoginButton,
    description: 'Sign in with your GitHub account'
  }
] as const

export type OAuthProvider = typeof oauthProviders[number]['id']
