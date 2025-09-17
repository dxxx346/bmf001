'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkeletonStats } from '@/components/ui/skeleton'
import { 
  ShoppingBag, 
  Heart, 
  Download, 
  TrendingUp,
  Package,
  DollarSign,
  Users,
  Activity
} from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true)

  // Simulate loading
  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    {
      title: "Total Purchases",
      value: "24",
      change: "+12%",
      changeType: "positive" as const,
      icon: ShoppingBag,
    },
    {
      title: "Favorites",
      value: "156",
      change: "+8%",
      changeType: "positive" as const,
      icon: Heart,
    },
    {
      title: "Downloads",
      value: "89",
      change: "+23%",
      changeType: "positive" as const,
      icon: Download,
    },
    {
      title: "Total Spent",
      value: "$2,847",
      change: "+15%",
      changeType: "positive" as const,
      icon: DollarSign,
    },
  ]

  const recentPurchases = [
    {
      id: "1",
      title: "Premium UI Kit",
      price: "$49.99",
      date: "2 days ago",
      status: "completed"
    },
    {
      id: "2", 
      title: "React Templates Bundle",
      price: "$89.99",
      date: "5 days ago",
      status: "completed"
    },
    {
      id: "3",
      title: "Icon Pack Collection",
      price: "$24.99",
      date: "1 week ago",
      status: "completed"
    }
  ]

  if (loading) {
    return (
      <DashboardLayout
        title="Dashboard"
        description="Welcome back! Here's an overview of your account."
      >
        <div className="space-y-6">
          <SkeletonStats cards={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gray-200 rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-40 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Dashboard"
      description="Welcome back! Here's an overview of your account."
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <stat.icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <Badge 
                    variant={stat.changeType === 'positive' ? 'success' : 'danger'}
                    size="sm"
                  >
                    {stat.change}
                  </Badge>
                  <span className="ml-2 text-sm text-gray-600">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Purchases */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Purchases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{purchase.title}</h4>
                      <p className="text-sm text-gray-600">{purchase.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{purchase.price}</p>
                    <Badge variant="success" size="sm">
                      {purchase.status}
                    </Badge>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                View All Purchases
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" variant="outline">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Products
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Heart className="h-4 w-4 mr-2" />
                View Favorites
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                My Downloads
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Invite Friends
              </Button>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Become a Seller</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Start selling your digital products and earn money.
                </p>
                <Button variant="primary" className="w-full">
                  Get Started
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
