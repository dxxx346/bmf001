# Digital Marketplace Design System

A comprehensive, consistent, and accessible component library built with React, TypeScript, Tailwind CSS, and Radix UI primitives.

## 🎨 Color Palette

Our design system follows a consistent color scheme across all components:

### Primary Colors
- **Primary**: `blue-600` (#2563eb) - Main brand color for primary actions
- **Secondary**: `gray-600` (#4b5563) - Secondary actions and neutral elements
- **Success**: `green-600` (#16a34a) - Success states and positive actions
- **Danger**: `red-600` (#dc2626) - Error states and destructive actions
- **Warning**: `yellow-600` (#ca8a04) - Warning states and caution

### Neutral Colors
- **Gray Scale**: `gray-50` to `gray-900` for backgrounds, borders, and text
- **White**: `#ffffff` for backgrounds and cards
- **Black**: `#000000` for high contrast text

## 📦 Component Library

### 1. Button Component (`src/components/ui/button.tsx`)

A versatile button component with multiple variants, sizes, and states.

#### Variants
- `primary` - Main call-to-action buttons
- `secondary` - Secondary actions
- `success` - Positive actions (approve, save)
- `danger` - Destructive actions (delete, cancel)
- `warning` - Caution actions
- `outline` - Outlined buttons
- `ghost` - Minimal buttons
- `link` - Text-only buttons

#### Sizes
- `sm` - Small buttons (h-9)
- `default` - Standard buttons (h-10)
- `lg` - Large buttons (h-11)
- `xl` - Extra large buttons (h-12)
- `icon` - Icon-only buttons (h-10 w-10)

#### Features
- Loading states with spinner
- Left/right icon support
- Polymorphic component (can render as different elements)
- Full accessibility support

```tsx
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

// Basic usage
<Button>Click me</Button>

// With variants and loading
<Button variant="danger" loading loadingText="Deleting...">
  Delete Item
</Button>

// With icons
<Button leftIcon={<Plus className="h-4 w-4" />}>
  Add Product
</Button>
```

### 2. Input Component (`src/components/ui/input.tsx`)

A comprehensive input component with validation states and built-in features.

#### Variants
- `default` - Standard input
- `error` - Error state with red styling
- `success` - Success state with green styling
- `warning` - Warning state with yellow styling

#### Features
- Built-in validation state indicators
- Password visibility toggle
- Left/right icon support
- Label and helper text
- Auto-sizing based on content

```tsx
import { Input } from '@/components/ui/input'
import { Mail, Search } from 'lucide-react'

// Basic usage
<Input placeholder="Enter your email" />

// With validation
<Input 
  label="Email"
  type="email"
  error="Please enter a valid email"
  leftIcon={<Mail className="h-4 w-4" />}
/>

// Password with toggle
<Input 
  type="password"
  label="Password"
  showPasswordToggle
/>
```

### 3. Card Component (`src/components/ui/card.tsx`)

Flexible card components for displaying content with consistent styling.

#### Variants
- `default` - Standard card
- `elevated` - Card with enhanced shadow
- `outlined` - Card with prominent border
- `ghost` - Minimal card without border/shadow
- `product` - Specialized for product listings
- `info/success/warning/danger` - Status-colored cards

#### Sub-components
- `Card` - Main container
- `CardHeader` - Header section
- `CardTitle` - Title element
- `CardDescription` - Description text
- `CardContent` - Main content area
- `CardFooter` - Footer section
- `ProductCard` - Specialized product card

```tsx
import { Card, CardContent, CardHeader, CardTitle, ProductCard } from '@/components/ui/card'

// Basic card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here.
  </CardContent>
</Card>

// Product card
<ProductCard
  title="Digital Product"
  description="Amazing digital product for sale"
  price={29.99}
  imageUrl="/product-image.jpg"
  onAddToCart={() => console.log('Added to cart')}
  onFavorite={() => console.log('Added to favorites')}
/>
```

### 4. Modal Component (`src/components/ui/modal.tsx`)

Portal-based modal system with animations and accessibility.

#### Features
- Portal rendering for proper z-index handling
- Framer Motion animations
- Keyboard navigation (ESC to close)
- Click outside to close
- Focus management
- Scroll lock
- Multiple modal types (Modal, ConfirmModal, AlertModal)

```tsx
import { Modal, ConfirmModal, AlertModal } from '@/components/ui/modal'

// Basic modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  description="Modal description"
>
  <p>Modal content</p>
</Modal>

// Confirmation modal
<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleConfirm}
  title="Delete Item"
  description="Are you sure you want to delete this item?"
  variant="danger"
/>
```

### 5. Dropdown Component (`src/components/ui/dropdown.tsx`)

Comprehensive dropdown system built on Radix UI primitives.

#### Components
- `DropdownMenu` - Basic dropdown menu
- `Select` - Single selection dropdown
- `MultiSelect` - Multiple selection dropdown
- Various menu items (checkbox, radio, etc.)

```tsx
import { Select, SelectItem, MultiSelect, MultiSelectItem } from '@/components/ui/dropdown'

// Single select
<Select
  placeholder="Choose an option"
  value={value}
  onValueChange={setValue}
  label="Category"
>
  <SelectItem value="electronics">Electronics</SelectItem>
  <SelectItem value="books">Books</SelectItem>
</Select>

// Multi-select
<MultiSelect
  values={selectedValues}
  onValuesChange={setSelectedValues}
  label="Tags"
>
  <MultiSelectItem value="featured">Featured</MultiSelectItem>
  <MultiSelectItem value="sale">On Sale</MultiSelectItem>
</MultiSelect>
```

### 6. Badge Component (`src/components/ui/badge.tsx`)

Flexible badge system for tags, statuses, and labels.

#### Variants
- `default/secondary/success/danger/warning` - Color variants
- `outline/ghost` - Style variants
- Status-specific variants (`pending`, `approved`, `rejected`, etc.)
- Product-specific variants (`sale`, `new`, `popular`, etc.)

#### Specialized Components
- `StatusBadge` - For status indicators
- `CategoryBadge` - For category labels

```tsx
import { Badge, StatusBadge, CategoryBadge } from '@/components/ui/badge'

// Basic badges
<Badge variant="success">Active</Badge>
<Badge variant="danger" dismissible onDismiss={handleDismiss}>
  Error
</Badge>

// Status badge
<StatusBadge status="pending" />

// Category badge
<CategoryBadge category="Electronics" color="blue" />
```

### 7. Avatar Component (`src/components/ui/avatar.tsx`)

User avatar system with fallbacks and status indicators.

#### Features
- Image with fallback to initials
- Multiple sizes (xs to 3xl)
- Online status indicators
- Avatar groups for multiple users
- Customizable fallback content

```tsx
import { UserAvatar, AvatarGroup } from '@/components/ui/avatar'

// Single avatar
<UserAvatar
  src="/user-avatar.jpg"
  name="John Doe"
  size="lg"
  showOnlineStatus
  isOnline={true}
/>

// Avatar group
<AvatarGroup
  avatars={[
    { src: "/user1.jpg", name: "User 1" },
    { src: "/user2.jpg", name: "User 2" },
    { name: "User 3" }
  ]}
  max={3}
  size="default"
/>
```

### 8. Skeleton Component (`src/components/ui/skeleton.tsx`)

Loading state components for better UX during data fetching.

#### Preset Components
- `SkeletonText` - Text line skeletons
- `SkeletonAvatar` - Avatar placeholder
- `SkeletonButton` - Button placeholder
- `SkeletonCard` - Card placeholder
- `SkeletonTable` - Table placeholder
- `SkeletonList` - List placeholder
- `SkeletonProductCard` - Product card placeholder
- `SkeletonStats` - Dashboard stats placeholder

```tsx
import { 
  Skeleton, 
  SkeletonCard, 
  SkeletonProductCard,
  SkeletonStats 
} from '@/components/ui/skeleton'

// Basic skeleton
<Skeleton className="h-4 w-full" />

// Product card skeleton
<SkeletonProductCard />

// Dashboard stats skeleton
<SkeletonStats cards={4} />
```

### 9. Tabs Component (`src/components/ui/tabs.tsx`)

Comprehensive tab system for organizing content.

#### Variants
- `default` - Standard tabs with background
- `outline` - Outlined tabs
- `pills` - Pill-shaped tabs

#### Specialized Components
- `DashboardTabs` - For dashboard sections
- `VerticalTabs` - Sidebar-style vertical tabs
- `CardTabs` - Underline-style tabs for cards

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent, DashboardTabs } from '@/components/ui/tabs'
import { BarChart, Users, Settings } from 'lucide-react'

// Basic tabs
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview content</TabsContent>
  <TabsContent value="analytics">Analytics content</TabsContent>
</Tabs>

// Dashboard tabs with icons
<DashboardTabs
  defaultValue="overview"
  tabs={[
    { value: "overview", label: "Overview", icon: <BarChart className="h-4 w-4" /> },
    { value: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { value: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> }
  ]}
>
  <TabsContent value="overview">Dashboard overview</TabsContent>
  <TabsContent value="users">User management</TabsContent>
  <TabsContent value="settings">Settings panel</TabsContent>
</DashboardTabs>
```

## 🛠️ Technical Implementation

### Dependencies
- **React 19** - Latest React with concurrent features
- **TypeScript** - Full type safety
- **Tailwind CSS 4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations
- **Lucide React** - Consistent iconography
- **Class Variance Authority** - Type-safe variant handling

### Design Tokens

#### Spacing Scale
```css
/* Tailwind's default scale */
0.5 = 2px, 1 = 4px, 2 = 8px, 3 = 12px, 4 = 16px, 
6 = 24px, 8 = 32px, 12 = 48px, 16 = 64px
```

#### Typography Scale
```css
text-xs = 12px
text-sm = 14px  
text-base = 16px
text-lg = 18px
text-xl = 20px
text-2xl = 24px
```

#### Border Radius
```css
rounded-sm = 2px
rounded = 4px
rounded-md = 6px
rounded-lg = 8px
rounded-xl = 12px
```

### Accessibility Features
- **Keyboard Navigation** - All interactive components support keyboard navigation
- **Screen Reader Support** - Proper ARIA labels and descriptions
- **Focus Management** - Visible focus indicators and logical tab order
- **Color Contrast** - All color combinations meet WCAG AA standards
- **Motion Preferences** - Respects user's motion preferences

### Usage Guidelines

#### Do's ✅
- Use consistent spacing from the design system
- Follow the established color palette
- Use appropriate component variants for context
- Include proper labels and descriptions
- Test with keyboard navigation
- Provide loading states for async operations

#### Don'ts ❌
- Don't create custom colors outside the palette
- Don't skip loading states
- Don't use generic button text like "Click here"
- Don't ignore accessibility requirements
- Don't mix different component styles inconsistently

## 🚀 Getting Started

### Installation
All components are already installed and configured. Import them as needed:

```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
```

### Customization
Components can be customized through:
1. **Variant props** - Built-in style variations
2. **className prop** - Additional Tailwind classes
3. **CSS variables** - Global theme customization
4. **Component composition** - Combining components for complex UI

### Examples Repository
Check the `/src/components/auth/LoginForm.tsx` for a real-world example of how multiple components work together.

## 📱 Responsive Design

All components are built with mobile-first responsive design:
- Components adapt to different screen sizes automatically
- Touch-friendly interaction areas (minimum 44px)
- Responsive typography and spacing
- Mobile-optimized modals and dropdowns

## 🧪 Testing

Components include:
- **Type safety** with TypeScript
- **Runtime validation** with proper prop types
- **Accessibility testing** with screen readers
- **Visual regression testing** capabilities
- **Unit testing** for component logic

This design system provides a solid foundation for building a consistent, accessible, and maintainable digital marketplace interface. All components follow modern React patterns and accessibility best practices.
