'use client'

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ProductCard,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge, StatusBadge, CategoryBadge } from '@/components/ui/badge'
import { UserAvatar, AvatarGroup } from '@/components/ui/avatar'
import { Modal, ConfirmModal, AlertModal } from '@/components/ui/modal'
import { Select, SelectItem, MultiSelect, MultiSelectItem } from '@/components/ui/dropdown'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  DashboardTabs,
  VerticalTabs,
  CardTabs,
} from '@/components/ui/tabs'
import {
  Skeleton,
  SkeletonCard,
  SkeletonProductCard,
  SkeletonStats,
  SkeletonText,
} from '@/components/ui/skeleton'
import {
  Plus,
  Search,
  Mail,
  Settings,
  Users,
  BarChart,
  Heart,
  ShoppingCart,
  Star,
  Trash2,
  Edit,
  Download,
} from 'lucide-react'

export default function ComponentShowcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [selectValue, setSelectValue] = useState('')
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleAsyncAction = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(false)
  }

  const sampleAvatars = [
    { src: '/api/placeholder/32/32', name: 'John Doe' },
    { src: '/api/placeholder/32/32', name: 'Jane Smith' },
    { name: 'Bob Wilson' },
    { name: 'Alice Brown' },
    { name: 'Charlie Davis' },
  ]

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Design System Showcase
        </h1>
        <p className="text-lg text-gray-600">
          Comprehensive component library for the digital marketplace
        </p>
      </div>

      {/* Buttons Section */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>
            Versatile button components with multiple variants, sizes, and states
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Variants */}
          <div>
            <h4 className="text-sm font-medium mb-3">Variants</h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <h4 className="text-sm font-medium mb-3">Sizes</h4>
            <div className="flex items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
              <Button size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* States */}
          <div>
            <h4 className="text-sm font-medium mb-3">States</h4>
            <div className="flex gap-3">
              <Button loading loadingText="Processing...">
                Loading Button
              </Button>
              <Button disabled>Disabled</Button>
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                rightIcon={<Download className="h-4 w-4" />}
              >
                With Icons
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inputs Section */}
      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
          <CardDescription>
            Input components with validation states and built-in features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Basic Input" placeholder="Enter text..." />
            <Input
              label="Email Input"
              type="email"
              placeholder="Enter email..."
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Search Input"
              placeholder="Search..."
              leftIcon={<Search className="h-4 w-4" />}
              rightIcon={<Button size="sm" variant="ghost">Search</Button>}
            />
            <Input
              label="Password Input"
              type="password"
              placeholder="Enter password..."
              showPasswordToggle
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Success State"
              placeholder="Valid input"
              success="Looks good!"
            />
            <Input
              label="Warning State"
              placeholder="Warning input"
              warning="Please double-check this"
            />
            <Input
              label="Error State"
              placeholder="Invalid input"
              error="This field is required"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cards Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cards</CardTitle>
          <CardDescription>
            Flexible card components for displaying content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>Standard card with border</CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is a default card with standard styling.</p>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>Card with enhanced shadow</CardDescription>
              </CardHeader>
              <CardContent>
                <p>This card has an elevated appearance.</p>
              </CardContent>
            </Card>

            <Card variant="info">
              <CardHeader>
                <CardTitle>Info Card</CardTitle>
                <CardDescription>Card with info styling</CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is an informational card.</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Product Card</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
              <ProductCard
                title="Premium Digital Template"
                description="Beautiful and responsive template for modern websites"
                price={49.99}
                currency="USD"
                imageUrl="/api/placeholder/300/200"
                rating={4.8}
                reviewCount={124}
                badge={<Badge variant="sale">Sale</Badge>}
                onAddToCart={() => console.log('Added to cart')}
                onFavorite={() => console.log('Added to favorites')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>
            Flexible badge system for tags, statuses, and labels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Color Variants</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="ghost">Ghost</Badge>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Status Badges</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="pending" />
              <StatusBadge status="approved" />
              <StatusBadge status="rejected" />
              <StatusBadge status="draft" />
              <StatusBadge status="published" />
              <StatusBadge status="featured" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Category Badges</h4>
            <div className="flex flex-wrap gap-2">
              <CategoryBadge category="Electronics" color="blue" />
              <CategoryBadge category="Books" color="green" />
              <CategoryBadge category="Clothing" color="purple" />
              <CategoryBadge category="Home" color="yellow" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Interactive Badges</h4>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="default"
                dismissible
                onDismiss={() => console.log('Dismissed')}
              >
                Dismissible
              </Badge>
              <Badge
                variant="success"
                icon={<Star className="h-3 w-3" />}
              >
                With Icon
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avatars Section */}
      <Card>
        <CardHeader>
          <CardTitle>Avatars</CardTitle>
          <CardDescription>
            User avatar system with fallbacks and status indicators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Sizes</h4>
            <div className="flex items-center gap-4">
              <UserAvatar name="John Doe" size="xs" />
              <UserAvatar name="Jane Smith" size="sm" />
              <UserAvatar name="Bob Wilson" size="default" />
              <UserAvatar name="Alice Brown" size="lg" />
              <UserAvatar name="Charlie Davis" size="xl" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">With Images & Status</h4>
            <div className="flex items-center gap-4">
              <UserAvatar
                src="/api/placeholder/40/40"
                name="Online User"
                showOnlineStatus
                isOnline={true}
              />
              <UserAvatar
                src="/api/placeholder/40/40"
                name="Offline User"
                showOnlineStatus
                isOnline={false}
              />
              <UserAvatar name="Fallback User" showOnlineStatus isOnline={true} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Avatar Group</h4>
            <AvatarGroup avatars={sampleAvatars} max={4} />
          </div>
        </CardContent>
      </Card>

      {/* Dropdowns Section */}
      <Card>
        <CardHeader>
          <CardTitle>Dropdowns</CardTitle>
          <CardDescription>
            Comprehensive dropdown system for selections and filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Single Select"
              placeholder="Choose an option"
              value={selectValue}
              onValueChange={setSelectValue}
            >
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </Select>

            <MultiSelect
              label="Multi Select"
              values={multiSelectValues}
              onValuesChange={setMultiSelectValues}
            >
              <MultiSelectItem value="tag1">Tag 1</MultiSelectItem>
              <MultiSelectItem value="tag2">Tag 2</MultiSelectItem>
              <MultiSelectItem value="tag3">Tag 3</MultiSelectItem>
              <MultiSelectItem value="tag4">Tag 4</MultiSelectItem>
            </MultiSelect>
          </div>
        </CardContent>
      </Card>

      {/* Modals Section */}
      <Card>
        <CardHeader>
          <CardTitle>Modals</CardTitle>
          <CardDescription>
            Portal-based modal system with animations and accessibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
            <Button
              variant="warning"
              onClick={() => setConfirmOpen(true)}
            >
              Confirm Action
            </Button>
            <Button
              variant="success"
              onClick={() => setAlertOpen(true)}
            >
              Show Alert
            </Button>
          </div>

          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Example Modal"
            description="This is an example modal with various content."
            size="lg"
          >
            <div className="space-y-4">
              <p>This is the modal content. You can put any React components here.</p>
              <Input placeholder="Modal input example" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </Modal>

          <ConfirmModal
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              console.log('Confirmed!')
              setConfirmOpen(false)
            }}
            title="Confirm Action"
            description="Are you sure you want to perform this action?"
            variant="danger"
            confirmText="Yes, Delete"
            cancelText="Cancel"
          />

          <AlertModal
            isOpen={alertOpen}
            onClose={() => setAlertOpen(false)}
            title="Success!"
            description="Your action was completed successfully."
            variant="success"
          />
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tabs</CardTitle>
          <CardDescription>
            Comprehensive tab system for organizing content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Dashboard Tabs</h4>
            <DashboardTabs
              defaultValue="overview"
              tabs={[
                {
                  value: 'overview',
                  label: 'Overview',
                  icon: <BarChart className="h-4 w-4" />,
                },
                {
                  value: 'users',
                  label: 'Users',
                  icon: <Users className="h-4 w-4" />,
                  badge: <Badge variant="secondary" size="sm">12</Badge>,
                },
                {
                  value: 'settings',
                  label: 'Settings',
                  icon: <Settings className="h-4 w-4" />,
                },
              ]}
            >
              <TabsContent value="overview">
                <p>Overview dashboard content would go here.</p>
              </TabsContent>
              <TabsContent value="users">
                <p>User management content would go here.</p>
              </TabsContent>
              <TabsContent value="settings">
                <p>Settings content would go here.</p>
              </TabsContent>
            </DashboardTabs>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Card Tabs</h4>
            <CardTabs
              defaultValue="all"
              tabs={[
                { value: 'all', label: 'All Products', count: 24 },
                { value: 'active', label: 'Active', count: 18 },
                { value: 'draft', label: 'Draft', count: 6 },
              ]}
            >
              <TabsContent value="all">All products view</TabsContent>
              <TabsContent value="active">Active products view</TabsContent>
              <TabsContent value="draft">Draft products view</TabsContent>
            </CardTabs>
          </div>
        </CardContent>
      </Card>

      {/* Skeletons Section */}
      <Card>
        <CardHeader>
          <CardTitle>Skeletons</CardTitle>
          <CardDescription>
            Loading state components for better UX during data fetching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Dashboard Stats</h4>
            <SkeletonStats cards={4} />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Product Cards</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Basic Card</h4>
            <SkeletonCard showImage showAvatar lines={4} />
          </div>
        </CardContent>
      </Card>

      {/* Interactive Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Demo</CardTitle>
          <CardDescription>
            Try out the components with real interactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={handleAsyncAction}
              loading={loading}
              loadingText="Processing..."
            >
              Async Action
            </Button>
            <Button
              variant="outline"
              leftIcon={<Heart className="h-4 w-4" />}
              onClick={() => console.log('Favorited!')}
            >
              Add to Favorites
            </Button>
            <Button
              variant="success"
              leftIcon={<ShoppingCart className="h-4 w-4" />}
              onClick={() => console.log('Added to cart!')}
            >
              Add to Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
