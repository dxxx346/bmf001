'use client'

import * as React from "react"
import Link from "next/link"
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Github,
  Heart
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  const [email, setEmail] = React.useState("")
  const [isSubscribing, setIsSubscribing] = React.useState(false)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubscribing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubscribing(false)
    setEmail("")
    // Show success message
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className={cn("bg-gray-900 text-gray-300", className)}>
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">DM</span>
              </div>
              <span className="font-bold text-xl text-white">
                Digital Marketplace
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your trusted platform for digital products, connecting buyers, sellers, 
              and partners in a secure and innovative marketplace ecosystem.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Linkedin className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Github className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white text-lg">Quick Links</h3>
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/products" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Browse Products
              </Link>
              <Link 
                href="/categories" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Categories
              </Link>
              <Link 
                href="/shops" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Featured Shops
              </Link>
              <Link 
                href="/become-seller" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Become a Seller
              </Link>
              <Link 
                href="/partner-program" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Partner Program
              </Link>
              <Link 
                href="/affiliate" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Affiliate Program
              </Link>
            </nav>
          </div>

          {/* Support & Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white text-lg">Support & Legal</h3>
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/help" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Help Center
              </Link>
              <Link 
                href="/contact" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Contact Us
              </Link>
              <Link 
                href="/faq" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                FAQ
              </Link>
              <Link 
                href="/terms" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Terms of Service
              </Link>
              <Link 
                href="/privacy" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/gdpr" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                GDPR Compliance
              </Link>
              <Link 
                href="/cookies" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Cookie Policy
              </Link>
            </nav>
          </div>

          {/* Newsletter & Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white text-lg">Stay Connected</h3>
            <p className="text-gray-400 text-sm">
              Subscribe to our newsletter for updates, new features, and exclusive offers.
            </p>
            
            {/* Newsletter Signup */}
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                required
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                loading={isSubscribing}
                loadingText="Subscribing..."
              >
                Subscribe
              </Button>
            </form>

            {/* Contact Info */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">support@digitalmarketplace.com</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">San Francisco, CA</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-800" />

        {/* Bottom Footer */}
        <div className="py-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
            <p className="text-gray-400 text-sm">
              © {currentYear} Digital Marketplace. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <Link 
                href="/status" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Status
              </Link>
              <Link 
                href="/security" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Security
              </Link>
              <Link 
                href="/accessibility" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Accessibility
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-red-500" />
            <span>for creators</span>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-wrap justify-center items-center space-x-8 space-y-4">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="h-6 w-6 rounded bg-green-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">SSL</span>
              </div>
              <span>Secure Payments</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">GDPR</span>
              </div>
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="h-6 w-6 rounded bg-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">24/7</span>
              </div>
              <span>Customer Support</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="h-6 w-6 rounded bg-yellow-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">⭐</span>
              </div>
              <span>Trusted Platform</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
