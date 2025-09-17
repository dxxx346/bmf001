# Authentication Forms Documentation

## 🔐 Complete Authentication System

A comprehensive authentication system with form validation, error handling, and excellent user experience built with React Hook Form, Zod validation, and Supabase integration.

## 📁 File Structure

```
src/
├── app/auth/
│   ├── login/page.tsx           # Login page with OAuth
│   ├── register/page.tsx        # Registration with role selection
│   ├── forgot-password/page.tsx # Password recovery
│   ├── reset-password/page.tsx  # Password reset
│   ├── verify-email/page.tsx    # Email verification
│   └── callback/route.ts        # OAuth callback handler
├── components/auth/
│   ├── LoginForm.tsx           # Reusable login form
│   └── OAuthButtons.tsx        # OAuth provider buttons
└── lib/validations/
    └── auth.ts                 # Zod validation schemas
```

## 🎯 Authentication Pages

### 1. **Login Page** (`/auth/login`)

Complete login experience with multiple authentication methods.

#### Features:
- ✅ **Email/password** authentication with validation
- ✅ **OAuth integration** (Google, GitHub)
- ✅ **Remember me** functionality
- ✅ **Password visibility** toggle
- ✅ **Forgot password** link
- ✅ **Error handling** with specific field errors
- ✅ **Loading states** with progress indicators
- ✅ **Redirect handling** after successful login

#### Form Validation:
```typescript
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
})
```

#### Usage:
```tsx
// Automatic redirect after login
// URL: /auth/login?redirectTo=/seller/dashboard

// Error handling from OAuth
// URL: /auth/login?error=access_denied
```

### 2. **Registration Page** (`/auth/register`)

Comprehensive registration with role selection and validation.

#### Features:
- ✅ **Full name** validation with character restrictions
- ✅ **Email validation** with uniqueness checking
- ✅ **Strong password** requirements with visual feedback
- ✅ **Password confirmation** matching
- ✅ **Role selection** (Buyer/Seller) with descriptions
- ✅ **Terms acceptance** requirement
- ✅ **Marketing emails** opt-in
- ✅ **Password strength** indicator
- ✅ **Real-time validation** feedback

#### Role Selection:
- **Buyer**: Browse and purchase digital products
- **Seller**: Create shop and sell digital products

#### Password Requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### Form Validation:
```typescript
const registerSchema = z.object({
  name: z.string().min(2).regex(/^[a-zA-Z\s'-]+$/),
  email: z.string().email(),
  password: passwordSchema, // Complex password validation
  confirmPassword: z.string(),
  role: z.enum(['buyer', 'seller']),
  termsAccepted: z.boolean().refine(val => val === true),
  marketingEmails: z.boolean().optional()
}).refine(data => data.password === data.confirmPassword)
```

### 3. **Forgot Password Page** (`/auth/forgot-password`)

Password recovery with email-based reset flow.

#### Features:
- ✅ **Email validation** before sending reset
- ✅ **Success confirmation** with email display
- ✅ **Resend functionality** with rate limiting
- ✅ **Error handling** for non-existent emails
- ✅ **Help text** and troubleshooting
- ✅ **Back navigation** to login

#### Flow:
1. User enters email address
2. System sends reset email
3. Confirmation screen with resend option
4. User clicks link in email
5. Redirected to reset password page

### 4. **Reset Password Page** (`/auth/reset-password`)

Secure password reset with token validation.

#### Features:
- ✅ **Token validation** from URL parameters
- ✅ **New password** with strength indicator
- ✅ **Password confirmation** matching
- ✅ **Success confirmation** page
- ✅ **Security tips** and best practices
- ✅ **Token expiration** handling

#### URL Format:
```
/auth/reset-password?token=abc123&email=user@example.com
```

### 5. **Email Verification Page** (`/auth/verify-email`)

Email verification handling with resend functionality.

#### Features:
- ✅ **Verification status** display
- ✅ **Resend verification** email
- ✅ **Token processing** from URL
- ✅ **Help and troubleshooting** information
- ✅ **Alternative actions** (contact support, sign up again)

## 🔧 OAuth Integration

### **OAuthButtons Component**

Comprehensive OAuth authentication with multiple providers.

#### Features:
- ✅ **Google OAuth** with proper branding
- ✅ **GitHub OAuth** with dark styling
- ✅ **Loading states** per provider
- ✅ **Error handling** with user feedback
- ✅ **Responsive design** (default/compact variants)
- ✅ **Accessibility** compliance

#### Usage:
```tsx
import { OAuthButtons, GoogleLoginButton, GitHubLoginButton } from '@/components/auth/OAuthButtons'

// Complete OAuth section
<OAuthButtons
  onSuccess={() => router.push('/dashboard')}
  onError={(error) => toast.error(error)}
/>

// Individual buttons
<GoogleLoginButton onSuccess={handleSuccess} />
<GitHubLoginButton onSuccess={handleSuccess} />
```

## 📋 Form Validation

### **Zod Schemas** (`src/lib/validations/auth.ts`)

Comprehensive validation schemas for all authentication forms.

#### Available Schemas:
- `loginSchema` - Email/password login
- `registerSchema` - Registration with role selection
- `forgotPasswordSchema` - Email for password reset
- `resetPasswordSchema` - New password with confirmation
- `updateProfileSchema` - Profile updates
- `changePasswordSchema` - Password change
- `emailVerificationSchema` - Email verification token

#### Password Validation:
```typescript
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Password must contain uppercase, lowercase, number, and special character'
  )
```

#### Helper Functions:
```typescript
// Validate individual fields
validateEmail(email: string): boolean
validatePassword(password: string): boolean

// Get password strength with feedback
getPasswordStrength(password: string): {
  score: number,      // 0-5
  feedback: string[]  // Missing requirements
}
```

## 🎨 User Experience Features

### **Visual Feedback**
- ✅ **Password strength** indicator with color coding
- ✅ **Real-time validation** with field-specific errors
- ✅ **Loading states** with descriptive text
- ✅ **Success confirmations** with next steps
- ✅ **Error messages** with actionable suggestions

### **Accessibility**
- ✅ **Screen reader** support with proper labels
- ✅ **Keyboard navigation** for all interactive elements
- ✅ **Focus management** through form flow
- ✅ **ARIA attributes** for form validation
- ✅ **Color contrast** compliance

### **Mobile Experience**
- ✅ **Touch-friendly** form controls
- ✅ **Responsive design** for all screen sizes
- ✅ **Optimized keyboards** (email, password types)
- ✅ **Proper autocomplete** attributes

## 🚀 Usage Examples

### **Basic Login Form**
```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/lib/validations/auth'

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data) => {
    const result = await signIn(data.email, data.password)
    // Handle result...
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('email')}
        type="email"
        label="Email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        type="password"
        label="Password"
        error={errors.password?.message}
      />
      <Button type="submit">Sign In</Button>
    </form>
  )
}
```

### **Registration with Role Selection**
```tsx
function RegistrationForm() {
  const { register, watch } = useForm({
    resolver: zodResolver(registerSchema)
  })

  const selectedRole = watch('role')

  return (
    <form>
      {/* Basic fields */}
      <Input {...register('name')} label="Name" />
      <Input {...register('email')} label="Email" />
      
      {/* Role selection */}
      <div className="space-y-2">
        <label>
          <input {...register('role')} type="radio" value="buyer" />
          <div className={selectedRole === 'buyer' ? 'selected' : ''}>
            Buyer - Browse and purchase products
          </div>
        </label>
        <label>
          <input {...register('role')} type="radio" value="seller" />
          <div className={selectedRole === 'seller' ? 'selected' : ''}>
            Seller - Create shop and sell products
          </div>
        </label>
      </div>
      
      <Button type="submit">Create Account</Button>
    </form>
  )
}
```

### **OAuth Integration**
```tsx
function AuthPage() {
  const handleOAuthSuccess = () => {
    router.push('/dashboard')
  }

  const handleOAuthError = (error: string) => {
    toast.error(error)
  }

  return (
    <div>
      <OAuthButtons
        onSuccess={handleOAuthSuccess}
        onError={handleOAuthError}
        variant="compact" // or "default"
      />
      
      {/* Or individual buttons */}
      <GoogleLoginButton onSuccess={handleOAuthSuccess} />
      <GitHubLoginButton onSuccess={handleOAuthSuccess} />
    </div>
  )
}
```

## 🔒 Security Features

### **Password Security**
- ✅ **Strong password** requirements
- ✅ **Password strength** visualization
- ✅ **Password confirmation** validation
- ✅ **Secure transmission** (HTTPS required)

### **Form Security**
- ✅ **CSRF protection** via Supabase
- ✅ **Rate limiting** on authentication endpoints
- ✅ **Input sanitization** via Zod validation
- ✅ **XSS prevention** with proper escaping

### **Session Security**
- ✅ **Secure tokens** via Supabase Auth
- ✅ **Token expiration** handling
- ✅ **Automatic refresh** for long sessions
- ✅ **Logout on security** events

## 🎯 Error Handling

### **Field-Level Errors**
```tsx
// Specific field errors
<Input
  error={errors.email?.message}  // "Please enter a valid email"
  success={!errors.email && touched.email ? "Looks good!" : undefined}
/>
```

### **Form-Level Errors**
```tsx
// Root errors for general issues
{errors.root && (
  <div className="error-banner">
    {errors.root.message}
  </div>
)}
```

### **API Error Mapping**
```typescript
// Map API errors to form fields
if (result.message.includes('email')) {
  setError('email', { message: 'Email already exists' })
} else if (result.message.includes('password')) {
  setError('password', { message: 'Password too weak' })
}
```

## 🚀 Production Ready

### **Features Included**
- ✅ **Complete form validation** with Zod schemas
- ✅ **Error handling** with user-friendly messages
- ✅ **Loading states** for all async operations
- ✅ **OAuth integration** with major providers
- ✅ **Mobile-responsive** design
- ✅ **Accessibility** compliance
- ✅ **Security best** practices
- ✅ **TypeScript** type safety

### **Integration Points**
- ✅ **Supabase Auth** for backend authentication
- ✅ **React Hook Form** for form management
- ✅ **Zod validation** for schema validation
- ✅ **Toast notifications** for user feedback
- ✅ **Next.js routing** for navigation
- ✅ **Tailwind CSS** for styling

Your authentication system is now production-ready with comprehensive form validation, excellent user experience, and robust security features!
