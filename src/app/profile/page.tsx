'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { useAuthContext } from '@/contexts/AuthContext'
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  CreditCard,
  Package,
  Heart,
  Star,
  TrendingUp,
  Calendar,
  MapPin,
  Globe,
  Mail,
  Phone
} from 'lucide-react'

export default function ProfilePage() {
  const { user, profile } = useAuthContext()

  const stats = [
    {
      label: 'Total Purchases',
      value: '24',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      label: 'Favorites',
      value: '156',
      icon: Heart,
      color: 'text-red-600'
    },
    {
      label: 'Reviews Given',
      value: '18',
      icon: Star,
      color: 'text-yellow-600'
    },
    {
      label: 'Member Since',
      value: new Date(profile?.created_at || '').getFullYear().toString(),
      icon: Calendar,
      color: 'text-green-600'
    }
  ]

  const recentActivity = [
    {
      id: '1',
      type: 'purchase',
      title: 'Purchased Premium UI Kit',
      description: 'Digital design system with 200+ components',
      date: '2 days ago',
      amount: '$49.99'
    },
    {
      id: '2',
      type: 'review',
      title: 'Reviewed React Templates Bundle',
      description: 'Left a 5-star review',
      date: '5 days ago',
      rating: 5
    },
    {
      id: '3',
      type: 'favorite',
      title: 'Added to Favorites',
      description: 'Icon Pack Collection',
      date: '1 week ago'
    },
    {
      id: '4',
      type: 'purchase',
      title: 'Purchased Mobile App Template',
      description: 'React Native template with authentication',
      date: '2 weeks ago',
      amount: '$79.99'
    }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Package className="h-4 w-4 text-blue-600" />
      case 'review':
        return <Star className="h-4 w-4 text-yellow-600" />
      case 'favorite':
        return <Heart className="h-4 w-4 text-red-600" />
      default:
        return <TrendingUp className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Badge variant="default" size="sm">Purchase</Badge>
      case 'review':
        return <Badge variant="warning" size="sm">Review</Badge>
      case 'favorite':
        return <Badge variant="danger" size="sm">Favorite</Badge>
      default:
        return <Badge variant="secondary" size="sm">Activity</Badge>
    }
  }

  return (
    <DashboardLayout
      title="My Profile"
      description="Manage your profile information and account settings"
    >
      <div className="space-y-6">
        {/* Profile Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gray-100`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <ProfileForm />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your recent purchases, reviews, and interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </h4>
                          {getActivityBadge(activity.type)}
                        </div>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">{activity.date}</span>
                          {activity.amount && (
                            <span className="text-sm font-medium text-green-600">
                              {activity.amount}
                            </span>
                          )}
                          {activity.rating && (
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < activity.rating 
                                      ? 'text-yellow-500 fill-current' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center pt-4">
                    <Button variant="outline">
                      View All Activity
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>
                    Customize your experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="h-4 w-4 mr-2" />
                    Notification Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Globe className="h-4 w-4 mr-2" />
                    Language & Region
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Privacy Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                  <CardDescription>
                    Manage your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payment Methods
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Download Data
                  </Button>
                  <Button variant="danger" className="w-full justify-start">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Protect your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Two-Factor Authentication
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Active Sessions
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Status</CardTitle>
                  <CardDescription>
                    Your account security overview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Email Verified</span>
                    <Badge variant={user?.email_confirmed_at ? "success" : "warning"}>
                      {user?.email_confirmed_at ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Two-Factor Auth</span>
                    <Badge variant="warning">Disabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Strong Password</span>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Login Notifications</span>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
