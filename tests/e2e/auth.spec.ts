import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/')
  })

  test('should allow user registration and login', async ({ page }) => {
    const timestamp = Date.now()
    const testEmail = `test-user-${timestamp}@example.com`
    const testPassword = 'TestPassword123!'
    const testName = `Test User ${timestamp}`

    // Navigate to registration page
    await page.click('text=Sign Up')
    await expect(page).toHaveURL(/.*register/)

    // Fill registration form
    await page.fill('[data-testid="email-input"]', testEmail)
    await page.fill('[data-testid="password-input"]', testPassword)
    await page.fill('[data-testid="name-input"]', testName)
    await page.selectOption('[data-testid="role-select"]', 'buyer')

    // Submit registration
    await page.click('[data-testid="register-button"]')

    // Should redirect to dashboard or show success message
    await expect(page).toHaveURL(/.*dashboard|.*login/)
    
    // If redirected to login, test login flow
    if (page.url().includes('login')) {
      await page.fill('[data-testid="email-input"]', testEmail)
      await page.fill('[data-testid="password-input"]', testPassword)
      await page.click('[data-testid="login-button"]')
    }

    // Should be logged in and see user dashboard
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator('text=' + testName)).toBeVisible()
  })

  test('should handle login with invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Sign In')
    await expect(page).toHaveURL(/.*login/)

    // Try to login with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login/)
  })

  test('should allow logout', async ({ page }) => {
    // Login first
    await loginAsTestUser(page)

    // Click user menu
    await page.click('[data-testid="user-menu"]')
    
    // Click logout
    await page.click('[data-testid="logout-button"]')

    // Should redirect to home page and show login option
    await expect(page).toHaveURL(/.*\/$/)
    await expect(page.locator('text=Sign In')).toBeVisible()
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible()
  })

  test('should redirect unauthenticated users from protected pages', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard')

    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/)
    await expect(page.locator('text=Please sign in')).toBeVisible()
  })

  test('should handle password reset flow', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Sign In')
    
    // Click forgot password
    await page.click('text=Forgot password?')
    await expect(page).toHaveURL(/.*forgot-password/)

    // Enter email
    await page.fill('[data-testid="email-input"]', 'test-buyer@example.com')
    await page.click('[data-testid="reset-button"]')

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('text=Reset link sent')).toBeVisible()
  })
})

// Helper function to login as test user
async function loginAsTestUser(page: any) {
  await page.goto('/login')
  await page.fill('[data-testid="email-input"]', 'test-buyer@example.com')
  await page.fill('[data-testid="password-input"]', 'TestPassword123!')
  await page.click('[data-testid="login-button"]')
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
}
