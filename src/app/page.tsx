'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/MainLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProductCarousel } from '@/components/products/ProductCarousel'
import { ProductCard } from '@/components/products/ProductCard'
import { useAuthContext } from '@/contexts/AuthContext'
import { 
  Search, 
  TrendingUp, 
  Star, 
  ArrowRight,
  Package,
  Code,
  Palette,
  Music,
  Video,
  FileText,
  Image as ImageIcon,
  Smartphone,
  Shield
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [searchQuery, setSearchQuery] = React.useState('')

  // Mock data for demonstration
  const featuredProducts = []
  const recommendedProducts = []
  const categories = [
    { id: 1, name: 'Software' },
    { id: 2, name: 'Design' },
    { id: 3, name: 'Music' },
    { id: 4, name: 'Video' },
    { id: 5, name: 'Documents' },
    { id: 6, name: 'Graphics' },
    { id: 7, name: 'Mobile' },
    { id: 8, name: 'Templates' }
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'Software': Code,
    'Design': Palette,
    'Music': Music,
    'Video': Video,
    'Documents': FileText,
    'Graphics': ImageIcon,
    'Mobile': Smartphone,
    'Templates': Package
  }

  const getCategoryIcon = (categoryName: string) => {
    return categoryIcons[categoryName] || Package
  }

  return (
    <ContentLayout maxWidth="7xl" className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Discover Amazing
            <span className="text-blue-600"> Digital Products</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            From templates and tools to courses and assets - find everything you need 
            to power your next project in our curated marketplace.
          </p>

          {/* Hero Search */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search for products, categories, or creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 text-lg pl-6 pr-20 shadow-lg border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500"
                leftIcon={<Search className="h-6 w-6 text-gray-400" />}
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 top-2 h-10"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">10K+</div>
              <div className="text-gray-600">Digital Products</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">5K+</div>
              <div className="text-gray-600">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">500+</div>
              <div className="text-gray-600">Trusted Sellers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Browse by Category
          </h2>
          <p className="text-lg text-gray-600">
            Find exactly what you&apos;re looking for in our organized categories
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((category) => {
            const IconComponent = getCategoryIcon(category.name)
            
            return (
              <Link
                key={category.id}
                href={`/categories/${category.id}`}
                className="group"
              >
                <Card className="aspect-square hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <div className="p-3 bg-blue-100 rounded-lg mb-3 group-hover:bg-blue-200 transition-colors">
                      <IconComponent className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm">
                      {category.name}
                    </h3>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" asChild>
            <Link href="/categories">
              View All Categories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white p-12 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Start Selling?
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Join thousands of creators earning money by selling their digital products. 
          Set up your shop in minutes and start earning today.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            <Link href="/auth/register?role=seller">
              Become a Seller
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="border-white text-white hover:bg-white/10"
          >
            <Link href="/about">
              Learn More
            </Link>
          </Button>
        </div>
      </section>
    </ContentLayout>
  )
}
