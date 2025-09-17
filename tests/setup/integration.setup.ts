import { config } from 'dotenv'
import { createServiceClient } from '@/lib/supabase'

// Load test environment variables
config({ path: '.env.test' })

let testDbCleanup: (() => Promise<void>) | null = null

// Setup test database before all tests
beforeAll(async () => {
  // Initialize test database
  const supabase = createServiceClient()
  
  // Create test data cleanup function
  testDbCleanup = async () => {
    try {
      // Clean up test data in correct order (respecting foreign key constraints)
      await supabase.from('referral_stats').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('referrals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('favorites').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('shops').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    } catch (error) {
      console.error('Test database cleanup failed:', error)
    }
  }
})

// Clean database after each test
afterEach(async () => {
  if (testDbCleanup) {
    await testDbCleanup()
  }
})

// Final cleanup
afterAll(async () => {
  if (testDbCleanup) {
    await testDbCleanup()
  }
})

// Extend Jest timeout for integration tests
jest.setTimeout(60000)
