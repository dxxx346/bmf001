'use client'

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Search, 
  ShoppingCart, 
  User, 
  Menu, 
  LogIn, 
  UserPlus, 
  Settings, 
  LogOut,
  Store,
  Users,
  Briefcase,
  ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown"
import { useAuthContext } from "@/contexts/AuthContext"
import { useCartStore } from "@/lib/store"
import { CartDropdown } from "@/components/cart/CartDropdown"
import { cn } from "@/lib/utils"

interface HeaderProps {
  className?: string
}

type UserMode = 'buyer' | 'seller' | 'partner'

export function Header({ className }: HeaderProps) {
  const router = useRouter()
  const { user, profile, isAuthenticated, signOut } = useAuthContext()
  const { getTotalItems } = useCartStore()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [userMode, setUserMode] = React.useState<UserMode>('buyer')
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const cartItemCount = getTotalItems()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const getModeIcon = (mode: UserMode) => {
    switch (mode) {
      case 'buyer':
        return <User className="h-4 w-4" />
      case 'seller':
        return <Store className="h-4 w-4" />
      case 'partner':
        return <Briefcase className="h-4 w-4" />
    }
  }

  const getModeLabel = (mode: UserMode) => {
    switch (mode) {
      case 'buyer':
        return 'Buyer Mode'
      case 'seller':
        return 'Seller Mode'
      case 'partner':
        return 'Partner Mode'
    }
  }

  const getModeDashboard = (mode: UserMode) => {
    switch (mode) {
      case 'buyer':
        return '/dashboard'
      case 'seller':
        return '/seller/dashboard'
      case 'partner':
        return '/partner/dashboard'
    }
  }

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-white", className)}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">DM</span>
              </div>
              <span className="font-bold text-xl text-gray-900 hidden sm:inline">
                Digital Marketplace
              </span>
            </Link>

            {/* Main Navigation - Hidden on mobile */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/products" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Products
              </Link>
              <Link 
                href="/categories" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Categories
              </Link>
              <Link 
                href="/shops" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Shops
              </Link>
              <Link 
                href="/about" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                About
              </Link>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-6 hidden lg:block">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search products, shops, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12"
                leftIcon={<Search className="h-4 w-4 text-gray-400" />}
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
              >
                Search
              </Button>
            </form>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Icon for mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => {/* Open mobile search */}}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <CartDropdown
              trigger="icon"
              showItemCount={true}
              variant="sheet"
            />

            {/* User Authentication */}
            {isAuthenticated && profile ? (
              <div className="flex items-center space-x-2">
                {/* Mode Switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hidden md:flex">
                      {getModeIcon(userMode)}
                      <span className="ml-2">{getModeLabel(userMode)}</span>
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Switch Mode</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setUserMode('buyer')}>
                      <User className="h-4 w-4 mr-2" />
                      Buyer Mode
                    </DropdownMenuItem>
                    {(profile.role === 'seller' || profile.role === 'admin') && (
                      <DropdownMenuItem onClick={() => setUserMode('seller')}>
                        <Store className="h-4 w-4 mr-2" />
                        Seller Mode
                      </DropdownMenuItem>
                    )}
                    {(profile.role === 'partner' || profile.role === 'admin') && (
                      <DropdownMenuItem onClick={() => setUserMode('partner')}>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Partner Mode
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <UserAvatar
                        src={profile.avatar_url || undefined}
                        name={profile.name || profile.email}
                        size="sm"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile.name || 'User'}
                        </p>
                        <p className="text-xs leading-none text-gray-500">
                          {profile.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push(getModeDashboard(userMode))}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/auth/login')}
                  className="hidden sm:flex"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => router.push('/auth/register')}
                  className="hidden sm:flex"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
                {/* Mobile auth buttons */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  onClick={() => router.push('/auth/login')}
                >
                  <LogIn className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white py-4">
            <nav className="flex flex-col space-y-4">
              <Link 
                href="/products" 
                className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Products
              </Link>
              <Link 
                href="/categories" 
                className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Categories
              </Link>
              <Link 
                href="/shops" 
                className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Shops
              </Link>
              <Link 
                href="/about" 
                className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              
              {/* Mobile Search */}
              <div className="px-4">
                <form onSubmit={handleSearch}>
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                  />
                </form>
              </div>

              {/* Mobile Mode Switcher */}
              {isAuthenticated && profile && (
                <div className="px-4 border-t pt-4">
                  <div className="text-sm font-medium text-gray-500 mb-2">Switch Mode</div>
                  <div className="space-y-2">
                    <Button
                      variant={userMode === 'buyer' ? 'primary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setUserMode('buyer')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Buyer Mode
                    </Button>
                    {(profile.role === 'seller' || profile.role === 'admin') && (
                      <Button
                        variant={userMode === 'seller' ? 'primary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setUserMode('seller')
                          setMobileMenuOpen(false)
                        }}
                      >
                        <Store className="h-4 w-4 mr-2" />
                        Seller Mode
                      </Button>
                    )}
                    {(profile.role === 'partner' || profile.role === 'admin') && (
                      <Button
                        variant={userMode === 'partner' ? 'primary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setUserMode('partner')
                          setMobileMenuOpen(false)
                        }}
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        Partner Mode
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
