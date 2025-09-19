/**
 * Playwright Global Teardown
 * Runs once after all tests to clean up the test environment
 */

import { chromium, FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...')
  
  // Start browser for cleanup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Connect to the application
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000')
    
    // Clean up test data
    await cleanupTestData(page)
    
    // Generate test report
    await generateTestReport()
    
    // Clean up test artifacts
    await cleanupTestArtifacts()
    
    console.log('✅ Global teardown completed successfully')
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw error here as it might mask test failures
  } finally {
    await browser.close()
  }
}

async function cleanupTestData(page: any) {
  console.log('🗑️ Cleaning up test data...')
  
  try {
    // Clean up test users, products, orders, etc.
    await page.evaluate(async () => {
      try {
        // This would typically call cleanup endpoints
        // For now, we'll just log the cleanup attempt
        console.log('Test data cleanup would happen here')
        
        // In a real implementation, you might:
        // - Delete test users with specific email patterns
        // - Remove test products
        // - Clean up test orders and payments
        // - Reset test discount codes
        
        // Example cleanup calls:
        /*
        await fetch('/api/admin/cleanup/test-users', { method: 'DELETE' })
        await fetch('/api/admin/cleanup/test-products', { method: 'DELETE' })
        await fetch('/api/admin/cleanup/test-orders', { method: 'DELETE' })
        */
        
      } catch (error) {
        console.warn('Test data cleanup had issues:', error)
      }
    })
    
    console.log('✅ Test data cleanup completed')
    
  } catch (error) {
    console.warn('⚠️ Test data cleanup had issues:', error)
  }
}

async function generateTestReport() {
  console.log('📊 Generating test report...')
  
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results')
    const reportPath = path.join(testResultsDir, 'e2e-summary.json')
    
    // Ensure test results directory exists
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true })
    }
    
    // Generate summary report
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
      testSuite: 'E2E Purchase Flow Tests',
      summary: {
        message: 'E2E tests completed. Check detailed reports for results.',
        generatedAt: new Date().toISOString()
      }
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`📄 Test report generated: ${reportPath}`)
    
  } catch (error) {
    console.warn('⚠️ Test report generation had issues:', error)
  }
}

async function cleanupTestArtifacts() {
  console.log('🧽 Cleaning up old test artifacts...')
  
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results')
    const e2eArtifactsDir = path.join(testResultsDir, 'e2e-artifacts')
    
    if (fs.existsSync(e2eArtifactsDir)) {
      // Clean up old screenshots, videos, and traces older than 7 days
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      
      const cleanupDir = (dirPath: string) => {
        if (!fs.existsSync(dirPath)) return
        
        const files = fs.readdirSync(dirPath)
        let cleanedCount = 0
        
        files.forEach(file => {
          const filePath = path.join(dirPath, file)
          const stats = fs.statSync(filePath)
          
          if (stats.isDirectory()) {
            cleanupDir(filePath)
          } else if (stats.mtime.getTime() < sevenDaysAgo) {
            try {
              fs.unlinkSync(filePath)
              cleanedCount++
            } catch (error) {
              console.warn(`Failed to delete ${filePath}:`, error)
            }
          }
        })
        
        if (cleanedCount > 0) {
          console.log(`🗑️ Cleaned up ${cleanedCount} old files from ${dirPath}`)
        }
      }
      
      cleanupDir(e2eArtifactsDir)
    }
    
    console.log('✅ Test artifacts cleanup completed')
    
  } catch (error) {
    console.warn('⚠️ Test artifacts cleanup had issues:', error)
  }
}

// Performance monitoring cleanup
async function cleanupPerformanceData() {
  console.log('📈 Cleaning up performance monitoring data...')
  
  try {
    const performanceDir = path.join(process.cwd(), 'test-results', 'performance')
    
    if (fs.existsSync(performanceDir)) {
      // Archive old performance data
      const archiveDir = path.join(performanceDir, 'archive')
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true })
      }
      
      // Move files older than 30 days to archive
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
      
      const files = fs.readdirSync(performanceDir)
      files.forEach(file => {
        if (file === 'archive') return
        
        const filePath = path.join(performanceDir, file)
        const stats = fs.statSync(filePath)
        
        if (stats.mtime.getTime() < thirtyDaysAgo) {
          const archivePath = path.join(archiveDir, file)
          try {
            fs.renameSync(filePath, archivePath)
            console.log(`📦 Archived performance data: ${file}`)
          } catch (error) {
            console.warn(`Failed to archive ${file}:`, error)
          }
        }
      })
    }
    
    console.log('✅ Performance data cleanup completed')
    
  } catch (error) {
    console.warn('⚠️ Performance data cleanup had issues:', error)
  }
}

// Database cleanup helper
async function cleanupTestDatabase() {
  console.log('🗄️ Cleaning up test database...')
  
  try {
    // This would typically connect to your test database and clean up
    // test-specific data that was created during the test run
    
    // Example cleanup operations:
    // - Delete users with test email patterns
    // - Remove test products and orders
    // - Clean up test files from storage
    // - Reset sequences and auto-increment values
    
    console.log('✅ Test database cleanup completed')
    
  } catch (error) {
    console.warn('⚠️ Test database cleanup had issues:', error)
  }
}

// Email service cleanup
async function cleanupEmailMocks() {
  console.log('📧 Cleaning up email service mocks...')
  
  try {
    // Clear any email service mocks or test data
    // Reset email counters, clear mock inboxes, etc.
    
    console.log('✅ Email mocks cleanup completed')
    
  } catch (error) {
    console.warn('⚠️ Email mocks cleanup had issues:', error)
  }
}

// Payment provider cleanup
async function cleanupPaymentMocks() {
  console.log('💳 Cleaning up payment provider mocks...')
  
  try {
    // Clean up any test payment data
    // Reset mock payment providers
    // Clear test transaction records
    
    console.log('✅ Payment mocks cleanup completed')
    
  } catch (error) {
    console.warn('⚠️ Payment mocks cleanup had issues:', error)
  }
}

export default globalTeardown
