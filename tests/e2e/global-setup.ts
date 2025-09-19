/**
 * Playwright Global Setup
 * Runs once before all tests to prepare the test environment
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...')
  
  // Start browser for setup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...')
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000')
    
    // Wait for the app to fully load
    await page.waitForLoadState('networkidle')
    
    // Setup test data
    await setupTestData(page)
    
    // Setup mock services
    await setupMockServices(page)
    
    console.log('✅ Global setup completed successfully')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    // Don't throw in global setup as it might prevent tests from running
    // throw error
  } finally {
    await browser.close()
  }
}

async function setupTestData(page: any) {
  console.log('📝 Setting up test data...')
  
  try {
    // Create test categories
    await page.evaluate(async () => {
      const testCategories = [
        { name: 'Design', description: 'Design templates and resources' },
        { name: 'Education', description: 'Educational materials and courses' },
        { name: 'Photography', description: 'Stock photos and photography resources' },
        { name: 'Software', description: 'Software tools and applications' },
        { name: 'Music', description: 'Music and audio resources' }
      ]
      
      for (const category of testCategories) {
        try {
          await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(category)
          })
        } catch (error) {
          // Category might already exist, continue
        }
      }
    })
    
    // Create test seller and products
    await createTestSeller(page)
    
    // Create test discount codes
    await createTestDiscountCodes(page)
    
    console.log('✅ Test data setup completed')
    
  } catch (error) {
    console.warn('⚠️ Test data setup had issues (this might be expected):', error)
  }
}

async function createTestSeller(page: any) {
  console.log('👤 Creating test seller and products...')
  
  try {
    // Register test seller
    await page.evaluate(async () => {
      const testSeller = {
        email: 'test-seller@example.com',
        password: 'TestSeller123!',
        name: 'Test Seller',
        role: 'seller'
      }
      
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testSeller)
        })
        
        if (response.ok) {
          // Wait a bit for user creation to complete
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Login as seller
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: testSeller.email,
              password: testSeller.password
            })
          })
          
          if (loginResponse.ok) {
            // Create test products
            const testProducts = [
              {
                title: 'Premium Digital Template Pack',
                description: 'High-quality design templates for professionals',
                short_description: 'Professional design templates',
                price: 29.99,
                currency: 'USD',
                category_id: 1,
                product_type: 'digital',
                is_digital: true,
                is_downloadable: true,
                download_limit: 5,
                download_expiry_days: 30,
                tags: ['templates', 'design', 'premium'],
                status: 'active'
              },
              {
                title: 'JavaScript Course Bundle',
                description: 'Complete JavaScript learning materials with examples',
                short_description: 'Complete JavaScript course',
                price: 49.99,
                currency: 'USD',
                category_id: 2,
                product_type: 'digital',
                is_digital: true,
                is_downloadable: true,
                download_limit: 10,
                download_expiry_days: 90,
                tags: ['javascript', 'programming', 'course'],
                status: 'active'
              },
              {
                title: 'Stock Photo Collection',
                description: '100+ high-resolution stock photos for commercial use',
                short_description: 'High-resolution stock photos',
                price: 19.99,
                currency: 'USD',
                category_id: 3,
                product_type: 'digital',
                is_digital: true,
                is_downloadable: true,
                download_limit: 3,
                download_expiry_days: 60,
                tags: ['photos', 'stock', 'collection'],
                status: 'active'
              }
            ]
            
            for (const product of testProducts) {
              try {
                const formData = new FormData()
                Object.entries(product).forEach(([key, value]) => {
                  if (Array.isArray(value)) {
                    formData.append(key, value.join(','))
                  } else {
                    formData.append(key, value.toString())
                  }
                })
                
                // Add mock file
                const mockFile = new File(['mock file content'], 'test-file.pdf', { type: 'application/pdf' })
                formData.append('files[0]', mockFile)
                
                const productResponse = await fetch('/api/products', {
                  method: 'POST',
                  body: formData
                })
                
                if (!productResponse.ok) {
                  console.warn(`Failed to create product: ${product.title}`, await productResponse.text())
                }
              } catch (productError) {
                console.warn(`Error creating product ${product.title}:`, productError)
              }
            }
          }
        }
      } catch (error) {
        console.warn('Test seller creation failed:', error)
      }
    })
    
  } catch (error) {
    console.warn('⚠️ Test seller setup had issues:', error)
  }
}

async function createTestDiscountCodes(page: any) {
  console.log('🎫 Creating test discount codes...')
  
  try {
    await page.evaluate(async () => {
      const testDiscountCodes = [
        {
          code: 'WELCOME10',
          discount_type: 'percentage',
          discount_value: 10,
          minimum_amount: 0,
          maximum_uses: 100,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        },
        {
          code: 'SAVE5USD',
          discount_type: 'fixed',
          discount_value: 5,
          minimum_amount: 20,
          maximum_uses: 50,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          code: 'NEWUSER20',
          discount_type: 'percentage',
          discount_value: 20,
          minimum_amount: 30,
          maximum_uses: 25,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      for (const discountCode of testDiscountCodes) {
        try {
          await fetch('/api/admin/discount-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discountCode)
          })
        } catch (error) {
          // Discount code might already exist or endpoint might not be available
        }
      }
    })
    
  } catch (error) {
    console.warn('⚠️ Discount codes setup had issues:', error)
  }
}

async function setupMockServices(page: any) {
  console.log('🔧 Setting up mock services...')
  
  try {
    // Setup mock email service
    await page.addInitScript(() => {
      // Mock email service in browser context
      ;(window as any).__mockEmailService = {
        emails: [],
        sendEmail: (to: string, subject: string, content: string) => {
          ;(window as any).__mockEmailService.emails.push({
            to,
            subject,
            content,
            timestamp: new Date()
          })
        },
        getEmails: (recipient?: string) => {
          if (recipient) {
            return (window as any).__mockEmailService.emails.filter((e: any) => e.to === recipient)
          }
          return (window as any).__mockEmailService.emails
        },
        clearEmails: () => {
          ;(window as any).__mockEmailService.emails = []
        }
      }
    })
    
    // Setup mock file download service
    await page.addInitScript(() => {
      // Mock file download tracking
      ;(window as any).__mockDownloadService = {
        downloads: {},
        trackDownload: (userId: string, productId: string) => {
          const key = `${userId}-${productId}`
          if (!(window as any).__mockDownloadService.downloads[key]) {
            ;(window as any).__mockDownloadService.downloads[key] = 0
          }
          ;(window as any).__mockDownloadService.downloads[key]++
        },
        getDownloadCount: (userId: string, productId: string) => {
          const key = `${userId}-${productId}`
          return (window as any).__mockDownloadService.downloads[key] || 0
        },
        resetDownloads: () => {
          ;(window as any).__mockDownloadService.downloads = {}
        }
      }
    })
    
    console.log('✅ Mock services setup completed')
    
  } catch (error) {
    console.warn('⚠️ Mock services setup had issues:', error)
  }
}

export default globalSetup
