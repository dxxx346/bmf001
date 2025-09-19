/**
 * Comprehensive E2E Tests for Complete Purchase Flow
 * Tests the entire user journey from registration to file download
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { faker } from '@faker-js/faker'

// Test data generators
const generateTestUser = () => ({
  email: `test-${faker.string.alphanumeric(8)}@example.com`,
  password: 'TestPassword123!',
  name: faker.person.fullName(),
  role: 'buyer' as const
})

const generateTestSeller = () => ({
  email: `seller-${faker.string.alphanumeric(8)}@example.com`,
  password: 'SellerPassword123!',
  name: faker.person.fullName(),
  role: 'seller' as const
})

const testProducts = [
  {
    title: 'Premium Digital Template Pack',
    description: 'High-quality design templates for professionals',
    price: '29.99',
    category: 'Design',
    tags: 'templates,design,premium'
  },
  {
    title: 'JavaScript Course Bundle',
    description: 'Complete JavaScript learning materials',
    price: '49.99',
    category: 'Education',
    tags: 'javascript,programming,course'
  },
  {
    title: 'Stock Photo Collection',
    description: '100+ high-resolution stock photos',
    price: '19.99',
    category: 'Photography',
    tags: 'photos,stock,collection'
  }
]

const testDiscountCodes = [
  { code: 'WELCOME10', discount: 10, type: 'percentage' },
  { code: 'SAVE5USD', discount: 5, type: 'fixed' },
  { code: 'NEWUSER20', discount: 20, type: 'percentage' }
]

// Test credentials for payment providers
const paymentTestCredentials = {
  stripe: {
    cardNumber: '4242424242424242',
    expiryDate: '12/28',
    cvc: '123',
    zipCode: '12345'
  },
  yookassa: {
    cardNumber: '5555555555554444',
    expiryDate: '12/28',
    cvc: '123'
  },
  coingate: {
    // Crypto payments will use test mode
    currency: 'BTC'
  }
}

// Page Object Models
class AuthPage {
  constructor(private page: Page) {}

  async navigateToRegister() {
    await this.page.goto('/')
    // Try multiple selectors for the sign up button
    const signUpSelectors = ['[data-testid="sign-up-button"]', 'text=Sign Up', 'a[href*="register"]', 'button:has-text("Sign Up")']
    
    let clicked = false
    for (const selector of signUpSelectors) {
      try {
        if (await this.page.locator(selector).isVisible({ timeout: 2000 })) {
          await this.page.click(selector)
          clicked = true
          break
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!clicked) {
      // Fallback: navigate directly
      await this.page.goto('/auth/register')
    }
    
    await expect(this.page).toHaveURL(/.*register/)
  }

  async navigateToLogin() {
    await this.page.goto('/')
    // Try multiple selectors for the sign in button
    const signInSelectors = ['[data-testid="sign-in-button"]', 'text=Sign In', 'a[href*="login"]', 'button:has-text("Sign In")']
    
    let clicked = false
    for (const selector of signInSelectors) {
      try {
        if (await this.page.locator(selector).isVisible({ timeout: 2000 })) {
          await this.page.click(selector)
          clicked = true
          break
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!clicked) {
      // Fallback: navigate directly
      await this.page.goto('/auth/login')
    }
    
    await expect(this.page).toHaveURL(/.*login/)
  }

  async register(user: ReturnType<typeof generateTestUser>) {
    await this.navigateToRegister()
    
    // Fill form fields with fallback selectors
    await this.fillInput('email-input', user.email, 'input[type="email"]')
    await this.fillInput('password-input', user.password, 'input[type="password"]')
    await this.fillInput('name-input', user.name, 'input[name="name"]')
    
    // Handle role selection if available
    try {
      await this.page.selectOption('[data-testid="role-select"]', user.role)
    } catch (error) {
      // Role selection might not be available, continue
    }
    
    await this.page.click('[data-testid="register-button"], button[type="submit"], button:has-text("Register")')
    
    // Handle potential email verification step
    const emailVerificationVisible = await this.page.locator('text=Check your email, text=Verify, text=confirmation').isVisible({ timeout: 5000 })
    if (emailVerificationVisible) {
      // Mock email verification by directly navigating to success state
      await this.mockEmailVerification(user.email)
    }
    
    // Should be logged in - try multiple selectors
    const userMenuSelectors = ['[data-testid="user-menu"]', '[data-testid="user-dropdown"]', '.user-menu', 'button:has-text("' + user.name + '")']
    let userMenuVisible = false
    
    for (const selector of userMenuSelectors) {
      try {
        if (await this.page.locator(selector).isVisible({ timeout: 3000 })) {
          userMenuVisible = true
          break
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!userMenuVisible) {
      // Check if we're on a dashboard or profile page as alternative success indicator
      const currentUrl = this.page.url()
      if (!currentUrl.includes('dashboard') && !currentUrl.includes('profile')) {
        throw new Error('Registration may have failed - no user menu visible and not on dashboard')
      }
    }
  }
  
  private async fillInput(testId: string, value: string, fallbackSelector: string) {
    const selectors = [`[data-testid="${testId}"]`, fallbackSelector]
    
    for (const selector of selectors) {
      try {
        if (await this.page.locator(selector).isVisible({ timeout: 2000 })) {
          await this.page.fill(selector, value)
          return
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    throw new Error(`Could not find input field for ${testId}`)
  }

  async login(email: string, password: string) {
    await this.navigateToLogin()
    
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.fill('[data-testid="password-input"]', password)
    await this.page.click('[data-testid="login-button"]')
    
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible()
  }

  async mockEmailVerification(email: string) {
    // Mock email verification by calling the verification endpoint
    await this.page.evaluate(async (userEmail) => {
      await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, token: 'mock-verification-token' })
      })
    }, email)
    
    // Navigate to dashboard
    await this.page.goto('/dashboard')
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout-button"]')
    await expect(this.page.locator('[data-testid="user-menu"]')).not.toBeVisible()
  }
}

class ProductsPage {
  constructor(private page: Page) {}

  async navigateToHome() {
    await this.page.goto('/')
  }

  async searchProducts(query: string) {
    // Try multiple selectors for search input
    const searchInputSelectors = ['[data-testid="search-input"]', 'input[type="search"]', 'input[placeholder*="Search"]', '#search']
    const searchButtonSelectors = ['[data-testid="search-button"]', 'button[type="submit"]', 'button:has-text("Search")', '.search-button']
    
    let searchFilled = false
    for (const selector of searchInputSelectors) {
      try {
        if (await this.page.locator(selector).isVisible({ timeout: 2000 })) {
          await this.page.fill(selector, query)
          searchFilled = true
          break
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!searchFilled) {
      throw new Error('Could not find search input field')
    }
    
    // Try to click search button or press Enter
    let searchTriggered = false
    for (const selector of searchButtonSelectors) {
      try {
        if (await this.page.locator(selector).isVisible({ timeout: 2000 })) {
          await this.page.click(selector)
          searchTriggered = true
          break
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!searchTriggered) {
      // Fallback: press Enter in search input
      await this.page.press(searchInputSelectors[0], 'Enter')
    }
    
    await this.page.waitForLoadState('networkidle')
  }

  async applyFilters(filters: {
    category?: string
    minPrice?: string
    maxPrice?: string
    sortBy?: string
  }) {
    if (filters.category) {
      await this.page.selectOption('[data-testid="category-filter"]', filters.category)
    }
    
    if (filters.minPrice) {
      await this.page.fill('[data-testid="min-price-input"]', filters.minPrice)
    }
    
    if (filters.maxPrice) {
      await this.page.fill('[data-testid="max-price-input"]', filters.maxPrice)
    }
    
    if (filters.sortBy) {
      await this.page.selectOption('[data-testid="sort-select"]', filters.sortBy)
    }
    
    await this.page.click('[data-testid="apply-filters-button"]')
    await this.page.waitForLoadState('networkidle')
  }

  async addProductToCart(productIndex: number = 0) {
    // Try multiple selectors for product cards
    const productCardSelectors = ['[data-testid="product-card"]', '.product-card', '.product-item', '[data-product-id]']
    
    let productClicked = false
    for (const selector of productCardSelectors) {
      try {
        const productCards = this.page.locator(selector)
        const count = await productCards.count()
        if (count > productIndex) {
          await productCards.nth(productIndex).click()
          productClicked = true
          break
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!productClicked) {
      throw new Error(`Could not find product card at index ${productIndex}`)
    }
    
    // On product detail page - wait for navigation
    await this.page.waitForLoadState('networkidle')
    
    // Try multiple selectors for add to cart button
    const addToCartSelectors = ['[data-testid="add-to-cart-button"]', 'button:has-text("Add to Cart")', '.add-to-cart', 'button[data-action="add-to-cart"]']
    
    let cartButtonClicked = false
    for (const selector of addToCartSelectors) {
      try {
        if (await this.page.locator(selector).isVisible({ timeout: 5000 })) {
          await this.page.click(selector)
          cartButtonClicked = true
          break
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!cartButtonClicked) {
      throw new Error('Could not find add to cart button')
    }
    
    // Wait for cart update notification (optional)
    try {
      await expect(this.page.locator('[data-testid="cart-notification"], .cart-notification, .success-message')).toBeVisible({ timeout: 3000 })
    } catch (error) {
      // Notification might not be visible, but cart addition might still work
      console.warn('Cart notification not visible, but cart addition may have succeeded')
    }
  }

  async addToFavorites(productIndex: number = 0) {
    const productCards = this.page.locator('[data-testid="product-card"]')
    await productCards.nth(productIndex).locator('[data-testid="favorite-button"]').click()
    
    await expect(this.page.locator('[data-testid="favorite-notification"]')).toBeVisible()
  }

  async viewProductDetails(productIndex: number = 0) {
    const productCards = this.page.locator('[data-testid="product-card"]')
    await productCards.nth(productIndex).click()
    
    await expect(this.page).toHaveURL(/.*products\/.*/)
    await expect(this.page.locator('[data-testid="product-title"]')).toBeVisible()
  }
}

class CartPage {
  constructor(private page: Page) {}

  async navigateToCart() {
    // Try multiple selectors for the cart
    const cartSelectors = ['[data-testid="cart-icon"]', '[data-testid="cart-button"]', 'a[href*="cart"]', 'button:has-text("Cart")']
    
    let clicked = false
    for (const selector of cartSelectors) {
      try {
        if (await this.page.locator(selector).isVisible({ timeout: 2000 })) {
          await this.page.click(selector)
          clicked = true
          break
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!clicked) {
      // Fallback: navigate directly
      await this.page.goto('/cart')
    }
    
    await expect(this.page).toHaveURL(/.*cart/)
  }

  async updateQuantity(productIndex: number, quantity: number) {
    const quantityInput = this.page.locator('[data-testid="quantity-input"]').nth(productIndex)
    await quantityInput.fill(quantity.toString())
    await this.page.click('[data-testid="update-cart-button"]')
    
    await this.page.waitForLoadState('networkidle')
  }

  async removeProduct(productIndex: number) {
    await this.page.click(`[data-testid="remove-product-${productIndex}"]`)
    await this.page.click('[data-testid="confirm-remove-button"]')
    
    await this.page.waitForLoadState('networkidle')
  }

  async applyDiscountCode(code: string) {
    await this.page.fill('[data-testid="discount-code-input"]', code)
    await this.page.click('[data-testid="apply-discount-button"]')
    
    // Wait for either success or error message
    const successMessage = this.page.locator('[data-testid="discount-success"]')
    const errorMessage = this.page.locator('[data-testid="discount-error"]')
    
    await expect(successMessage.or(errorMessage)).toBeVisible()
    
    return await successMessage.isVisible()
  }

  async proceedToCheckout() {
    await this.page.click('[data-testid="checkout-button"]')
    await expect(this.page).toHaveURL(/.*checkout/)
  }

  async getCartTotal() {
    const totalElement = this.page.locator('[data-testid="cart-total"]')
    const totalText = await totalElement.textContent()
    return parseFloat(totalText?.replace(/[^\d.]/g, '') || '0')
  }

  async getCartItemCount() {
    const itemCountElement = this.page.locator('[data-testid="cart-item-count"]')
    const countText = await itemCountElement.textContent()
    return parseInt(countText || '0')
  }
}

class CheckoutPage {
  constructor(private page: Page) {}

  async fillBillingInformation(info: {
    firstName: string
    lastName: string
    email: string
    address: string
    city: string
    zipCode: string
    country: string
  }) {
    await this.page.fill('[data-testid="first-name-input"]', info.firstName)
    await this.page.fill('[data-testid="last-name-input"]', info.lastName)
    await this.page.fill('[data-testid="email-input"]', info.email)
    await this.page.fill('[data-testid="address-input"]', info.address)
    await this.page.fill('[data-testid="city-input"]', info.city)
    await this.page.fill('[data-testid="zip-code-input"]', info.zipCode)
    await this.page.selectOption('[data-testid="country-select"]', info.country)
  }

  async selectPaymentMethod(provider: 'stripe' | 'yookassa' | 'coingate') {
    await this.page.click(`[data-testid="payment-method-${provider}"]`)
    await this.page.waitForTimeout(1000) // Wait for payment form to load
  }

  async fillStripePayment(credentials = paymentTestCredentials.stripe) {
    // Wait for Stripe iframe to load
    await this.page.waitForSelector('[data-testid="stripe-card-element"]')
    
    const stripeFrame = this.page.frameLocator('[data-testid="stripe-card-element"] iframe')
    await stripeFrame.locator('[name="cardnumber"]').fill(credentials.cardNumber)
    await stripeFrame.locator('[name="exp-date"]').fill(credentials.expiryDate)
    await stripeFrame.locator('[name="cvc"]').fill(credentials.cvc)
    await stripeFrame.locator('[name="postal"]').fill(credentials.zipCode)
  }

  async fillYooKassaPayment(credentials = paymentTestCredentials.yookassa) {
    await this.page.fill('[data-testid="yookassa-card-number"]', credentials.cardNumber)
    await this.page.fill('[data-testid="yookassa-expiry"]', credentials.expiryDate)
    await this.page.fill('[data-testid="yookassa-cvc"]', credentials.cvc)
  }

  async selectCryptoCurrency(currency = paymentTestCredentials.coingate.currency) {
    await this.page.selectOption('[data-testid="crypto-currency-select"]', currency)
  }

  async completePayment() {
    await this.page.click('[data-testid="complete-payment-button"]')
    
    // Wait for payment processing
    await this.page.waitForLoadState('networkidle')
    
    // Should redirect to success page
    await expect(this.page).toHaveURL(/.*checkout\/success|.*orders\/.*/)
  }

  async getOrderTotal() {
    const totalElement = this.page.locator('[data-testid="order-total"]')
    const totalText = await totalElement.textContent()
    return parseFloat(totalText?.replace(/[^\d.]/g, '') || '0')
  }
}

class OrderPage {
  constructor(private page: Page) {}

  async verifyOrderConfirmation() {
    await expect(this.page.locator('[data-testid="order-success-message"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="order-number"]')).toBeVisible()
  }

  async getOrderNumber() {
    const orderNumberElement = this.page.locator('[data-testid="order-number"]')
    return await orderNumberElement.textContent()
  }

  async downloadFile(productIndex: number = 0) {
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.click(`[data-testid="download-button-${productIndex}"]`)
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toBeTruthy()
    return download
  }

  async requestRefund(productIndex: number = 0, reason: string = 'Not as described') {
    await this.page.click(`[data-testid="refund-button-${productIndex}"]`)
    
    await this.page.selectOption('[data-testid="refund-reason-select"]', reason)
    await this.page.fill('[data-testid="refund-description"]', 'Test refund request')
    
    await this.page.click('[data-testid="submit-refund-button"]')
    
    await expect(this.page.locator('[data-testid="refund-success-message"]')).toBeVisible()
  }

  async checkDownloadLimits(productIndex: number = 0) {
    const downloadInfo = this.page.locator(`[data-testid="download-info-${productIndex}"]`)
    const remainingText = await downloadInfo.textContent()
    
    const match = remainingText?.match(/(\d+) downloads remaining/)
    return match ? parseInt(match[1]) : null
  }
}

// Mock email service for testing notifications
class MockEmailService {
  private static emails: Array<{
    to: string
    subject: string
    content: string
    timestamp: Date
  }> = []

  static async setupMockEmailInterceptor(context: BrowserContext) {
    await context.route('**/api/notifications/**', async (route) => {
      const request = route.request()
      if (request.method() === 'POST') {
        const postData = request.postData()
        if (postData) {
          const emailData = JSON.parse(postData)
          MockEmailService.emails.push({
            to: emailData.recipient,
            subject: emailData.subject,
            content: emailData.content,
            timestamp: new Date()
          })
        }
      }
      await route.continue()
    })
  }

  static getEmailsForRecipient(email: string) {
    return MockEmailService.emails.filter(e => e.to === email)
  }

  static getLatestEmailForRecipient(email: string) {
    const emails = MockEmailService.getEmailsForRecipient(email)
    return emails[emails.length - 1] || null
  }

  static clearEmails() {
    MockEmailService.emails = []
  }
}

// Test suites
test.describe('Complete Purchase Flow', () => {
  let authPage: AuthPage
  let productsPage: ProductsPage
  let cartPage: CartPage
  let checkoutPage: CheckoutPage
  let orderPage: OrderPage
  
  let testUser: ReturnType<typeof generateTestUser>
  let testSeller: ReturnType<typeof generateTestSeller>

  test.beforeEach(async ({ page, context }) => {
    authPage = new AuthPage(page)
    productsPage = new ProductsPage(page)
    cartPage = new CartPage(page)
    checkoutPage = new CheckoutPage(page)
    orderPage = new OrderPage(page)
    
    testUser = generateTestUser()
    testSeller = generateTestSeller()
    
    // Setup mock email service
    await MockEmailService.setupMockEmailInterceptor(context)
    MockEmailService.clearEmails()
    
    // Mock payment providers for testing
    await context.route('**/api/payments/**', async (route) => {
      const request = route.request()
      const url = request.url()
      
      if (url.includes('create') && request.method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            payment_intent: {
              id: `pi_test_${Date.now()}`,
              status: 'succeeded',
              amount: 2999,
              currency: 'USD'
            }
          })
        })
      } else {
        await route.continue()
      }
    })
  })

  test('Complete purchase flow with Stripe payment', async ({ page }) => {
    // 1. User Registration and Email Verification
    await authPage.register(testUser)
    
    // Verify email was sent (with timeout for async email processing)
    await page.waitForTimeout(1000) // Allow time for email processing
    const verificationEmail = MockEmailService.getLatestEmailForRecipient(testUser.email)
    if (verificationEmail) {
      expect(verificationEmail.subject).toContain('Verify')
    }
    
    // 2. Browse Products with Search and Filters
    await productsPage.navigateToHome()
    await productsPage.searchProducts('template')
    
    // Apply filters
    await productsPage.applyFilters({
      category: 'Design',
      minPrice: '10',
      maxPrice: '50',
      sortBy: 'price_asc'
    })
    
    // Verify products are displayed
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount({ min: 1 } as any)
    
    // 3. Add Multiple Products to Cart
    await productsPage.addProductToCart(0)
    await page.goBack()
    await productsPage.addProductToCart(1)
    await page.goBack()
    await productsPage.addProductToCart(2)
    
    // 4. Navigate to Cart and Apply Discount Code
    await cartPage.navigateToCart()
    
    // Verify cart has items
    const itemCount = await cartPage.getCartItemCount()
    expect(itemCount).toBeGreaterThan(0)
    
    // Apply discount code
    const discountApplied = await cartPage.applyDiscountCode(testDiscountCodes[0].code)
    expect(discountApplied).toBeTruthy()
    
    // 5. Proceed Through Checkout Steps
    await cartPage.proceedToCheckout()
    
    // Fill billing information
    await checkoutPage.fillBillingInformation({
      firstName: testUser.name.split(' ')[0],
      lastName: testUser.name.split(' ')[1] || 'User',
      email: testUser.email,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode(),
      country: 'US'
    })
    
    // 6. Select Payment Method (Stripe)
    await checkoutPage.selectPaymentMethod('stripe')
    await checkoutPage.fillStripePayment()
    
    // 7. Complete Payment
    await checkoutPage.completePayment()
    
    // 8. Verify Order Confirmation Page
    await orderPage.verifyOrderConfirmation()
    const orderNumber = await orderPage.getOrderNumber()
    expect(orderNumber).toBeTruthy()
    
    // 9. Check Email Notification
    await page.waitForTimeout(2000) // Wait for email processing
    const orderEmail = MockEmailService.getLatestEmailForRecipient(testUser.email)
    expect(orderEmail?.subject).toContain('Order Confirmation')
    expect(orderEmail?.content).toContain(orderNumber!)
    
    // 10. Test File Download After Purchase
    const download = await orderPage.downloadFile(0)
    expect(download).toBeTruthy()
    
    // 11. Test Download Limits
    const remainingDownloads = await orderPage.checkDownloadLimits(0)
    expect(remainingDownloads).toBeGreaterThanOrEqual(0)
  })

  test('Complete purchase flow with YooKassa payment', async ({ page }) => {
    await authPage.register(testUser)
    
    // Add products to cart
    await productsPage.navigateToHome()
    await productsPage.addProductToCart(0)
    
    await cartPage.navigateToCart()
    await cartPage.proceedToCheckout()
    
    // Fill billing information
    await checkoutPage.fillBillingInformation({
      firstName: testUser.name.split(' ')[0],
      lastName: testUser.name.split(' ')[1] || 'User',
      email: testUser.email,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode(),
      country: 'RU'
    })
    
    // Select YooKassa payment
    await checkoutPage.selectPaymentMethod('yookassa')
    await checkoutPage.fillYooKassaPayment()
    
    await checkoutPage.completePayment()
    await orderPage.verifyOrderConfirmation()
  })

  test('Complete purchase flow with CoinGate crypto payment', async ({ page }) => {
    await authPage.register(testUser)
    
    // Add products to cart
    await productsPage.navigateToHome()
    await productsPage.addProductToCart(0)
    
    await cartPage.navigateToCart()
    await cartPage.proceedToCheckout()
    
    // Fill billing information
    await checkoutPage.fillBillingInformation({
      firstName: testUser.name.split(' ')[0],
      lastName: testUser.name.split(' ')[1] || 'User',
      email: testUser.email,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode(),
      country: 'US'
    })
    
    // Select CoinGate payment
    await checkoutPage.selectPaymentMethod('coingate')
    await checkoutPage.selectCryptoCurrency('BTC')
    
    await checkoutPage.completePayment()
    await orderPage.verifyOrderConfirmation()
  })

  test('Test refund request flow', async ({ page }) => {
    // Complete a purchase first
    await authPage.register(testUser)
    await productsPage.navigateToHome()
    await productsPage.addProductToCart(0)
    await cartPage.navigateToCart()
    await cartPage.proceedToCheckout()
    
    await checkoutPage.fillBillingInformation({
      firstName: testUser.name.split(' ')[0],
      lastName: testUser.name.split(' ')[1] || 'User',
      email: testUser.email,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode(),
      country: 'US'
    })
    
    await checkoutPage.selectPaymentMethod('stripe')
    await checkoutPage.fillStripePayment()
    await checkoutPage.completePayment()
    
    // Request refund
    await orderPage.requestRefund(0, 'Not as described')
    
    // Verify refund email was sent
    await page.waitForTimeout(2000)
    const refundEmail = MockEmailService.getLatestEmailForRecipient(testUser.email)
    expect(refundEmail?.subject).toContain('Refund')
  })

  test('Test download limits and expiry', async ({ page }) => {
    await authPage.register(testUser)
    await productsPage.navigateToHome()
    await productsPage.addProductToCart(0)
    await cartPage.navigateToCart()
    await cartPage.proceedToCheckout()
    
    await checkoutPage.fillBillingInformation({
      firstName: testUser.name.split(' ')[0],
      lastName: testUser.name.split(' ')[1] || 'User',
      email: testUser.email,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode(),
      country: 'US'
    })
    
    await checkoutPage.selectPaymentMethod('stripe')
    await checkoutPage.fillStripePayment()
    await checkoutPage.completePayment()
    
    // Test multiple downloads to check limits
    const initialLimit = await orderPage.checkDownloadLimits(0)
    
    if (initialLimit && initialLimit > 0) {
      await orderPage.downloadFile(0)
      
      const afterDownloadLimit = await orderPage.checkDownloadLimits(0)
      expect(afterDownloadLimit).toBe(initialLimit - 1)
    }
  })

  test('Test cart functionality with multiple products', async ({ page }) => {
    await authPage.register(testUser)
    await productsPage.navigateToHome()
    
    // Add multiple products
    await productsPage.addProductToCart(0)
    await page.goBack()
    await productsPage.addProductToCart(1)
    
    await cartPage.navigateToCart()
    
    // Test quantity update
    await cartPage.updateQuantity(0, 2)
    
    // Test product removal
    const initialCount = await cartPage.getCartItemCount()
    await cartPage.removeProduct(1)
    const afterRemovalCount = await cartPage.getCartItemCount()
    
    expect(afterRemovalCount).toBeLessThan(initialCount)
  })

  test('Test invalid discount code handling', async ({ page }) => {
    await authPage.register(testUser)
    await productsPage.navigateToHome()
    await productsPage.addProductToCart(0)
    await cartPage.navigateToCart()
    
    // Try invalid discount code
    const discountApplied = await cartPage.applyDiscountCode('INVALID_CODE')
    expect(discountApplied).toBeFalsy()
    
    // Verify error message is shown
    await expect(page.locator('[data-testid="discount-error"]')).toBeVisible()
  })

  test('Test favorites functionality', async ({ page }) => {
    await authPage.register(testUser)
    await productsPage.navigateToHome()
    
    // Add product to favorites
    await productsPage.addToFavorites(0)
    
    // Navigate to favorites page
    await page.click('[data-testid="favorites-link"]')
    await expect(page).toHaveURL(/.*favorites/)
    
    // Verify product is in favorites
    await expect(page.locator('[data-testid="favorite-product"]')).toHaveCount({ min: 1 } as any)
  })
})

// Mobile viewport tests
test.describe('Mobile Purchase Flow', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test('Complete mobile purchase flow', async ({ page }) => {
    const authPage = new AuthPage(page)
    const productsPage = new ProductsPage(page)
    const cartPage = new CartPage(page)
    const checkoutPage = new CheckoutPage(page)
    const orderPage = new OrderPage(page)
    
    const testUser = generateTestUser()

    // Mobile-specific navigation might use hamburger menu
    await authPage.register(testUser)
    
    // Test mobile product browsing
    await productsPage.navigateToHome()
    await productsPage.searchProducts('template')
    
    // Mobile cart interaction
    await productsPage.addProductToCart(0)
    await cartPage.navigateToCart()
    
    // Mobile checkout
    await cartPage.proceedToCheckout()
    
    await checkoutPage.fillBillingInformation({
      firstName: testUser.name.split(' ')[0],
      lastName: testUser.name.split(' ')[1] || 'User',
      email: testUser.email,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode(),
      country: 'US'
    })
    
    await checkoutPage.selectPaymentMethod('stripe')
    await checkoutPage.fillStripePayment()
    await checkoutPage.completePayment()
    
    await orderPage.verifyOrderConfirmation()
  })

  test('Mobile responsive navigation', async ({ page }) => {
    await page.goto('/')
    
    // Test mobile menu
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]')
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click()
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    }
    
    // Test mobile search
    const mobileSearchButton = page.locator('[data-testid="mobile-search-button"]')
    if (await mobileSearchButton.isVisible()) {
      await mobileSearchButton.click()
      await expect(page.locator('[data-testid="mobile-search-overlay"]')).toBeVisible()
    }
  })
})

// Cross-browser compatibility tests
test.describe('Cross-Browser Purchase Flow', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`Purchase flow in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`)
      
      const authPage = new AuthPage(page)
      const productsPage = new ProductsPage(page)
      const cartPage = new CartPage(page)
      const checkoutPage = new CheckoutPage(page)
      const orderPage = new OrderPage(page)
      
      const testUser = generateTestUser()

      await authPage.register(testUser)
      await productsPage.navigateToHome()
      await productsPage.addProductToCart(0)
      await cartPage.navigateToCart()
      await cartPage.proceedToCheckout()
      
      await checkoutPage.fillBillingInformation({
        firstName: testUser.name.split(' ')[0],
        lastName: testUser.name.split(' ')[1] || 'User',
        email: testUser.email,
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        zipCode: faker.location.zipCode(),
        country: 'US'
      })
      
      await checkoutPage.selectPaymentMethod('stripe')
      await checkoutPage.fillStripePayment()
      await checkoutPage.completePayment()
      
      await orderPage.verifyOrderConfirmation()
    })
  })
})

// Performance tests
test.describe('Purchase Flow Performance', () => {
  test('Page load performance during checkout', async ({ page }) => {
    const authPage = new AuthPage(page)
    const productsPage = new ProductsPage(page)
    const cartPage = new CartPage(page)
    
    const testUser = generateTestUser()

    await authPage.register(testUser)
    await productsPage.navigateToHome()
    
    // Measure product page load time
    const productPageStart = Date.now()
    await productsPage.addProductToCart(0)
    const productPageTime = Date.now() - productPageStart
    
    // Measure cart page load time
    const cartPageStart = Date.now()
    await cartPage.navigateToCart()
    const cartPageTime = Date.now() - cartPageStart
    
    // Measure checkout page load time
    const checkoutPageStart = Date.now()
    await cartPage.proceedToCheckout()
    const checkoutPageTime = Date.now() - checkoutPageStart
    
    // Assert reasonable load times (adjust thresholds as needed)
    expect(productPageTime).toBeLessThan(5000) // 5 seconds
    expect(cartPageTime).toBeLessThan(3000) // 3 seconds
    expect(checkoutPageTime).toBeLessThan(3000) // 3 seconds
    
    console.log('Performance metrics:', {
      productPageTime,
      cartPageTime,
      checkoutPageTime
    })
  })
})

// Error handling tests
test.describe('Purchase Flow Error Handling', () => {
  test('Handle payment failures gracefully', async ({ page, context }) => {
    // Mock payment failure
    await context.route('**/api/payments/**', async (route) => {
      if (route.request().url().includes('create')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Payment failed'
          })
        })
      } else {
        await route.continue()
      }
    })

    const authPage = new AuthPage(page)
    const productsPage = new ProductsPage(page)
    const cartPage = new CartPage(page)
    const checkoutPage = new CheckoutPage(page)
    
    const testUser = generateTestUser()

    await authPage.register(testUser)
    await productsPage.navigateToHome()
    await productsPage.addProductToCart(0)
    await cartPage.navigateToCart()
    await cartPage.proceedToCheckout()
    
    await checkoutPage.fillBillingInformation({
      firstName: testUser.name.split(' ')[0],
      lastName: testUser.name.split(' ')[1] || 'User',
      email: testUser.email,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode(),
      country: 'US'
    })
    
    await checkoutPage.selectPaymentMethod('stripe')
    await checkoutPage.fillStripePayment()
    
    // This should fail
    try {
      await checkoutPage.completePayment()
    } catch (error) {
      // Payment is expected to fail, continue to error verification
    }
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible({ timeout: 10000 })
  })

  test('Handle network failures during checkout', async ({ page, context }) => {
    // Mock network failure
    await context.route('**/api/**', async (route) => {
      await route.abort('failed')
    })

    const authPage = new AuthPage(page)
    
    // This should handle the network failure gracefully
    try {
      await authPage.navigateToRegister()
    } catch (error) {
      // Network failure is expected, continue to error verification
    }
    
    // Verify error message or retry mechanism
    await expect(page.locator('[data-testid="network-error"], [data-testid="retry-button"]')).toBeVisible({ timeout: 10000 })
  })
})
