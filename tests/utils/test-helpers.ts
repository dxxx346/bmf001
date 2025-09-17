/**
 * Test Helper Utilities
 * Common utilities for testing across all test types
 */

import { faker } from '@faker-js/faker'
import { User, Product, Shop } from '@/types'

// Test data generators
export const generateTestUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'buyer',
  created_at: faker.date.past().toISOString(),
  avatar_url: faker.image.avatar(),
  ...overrides,
})

export const generateTestProduct = (overrides: Partial<Product> = {}): Product => ({
  id: faker.string.uuid(),
  title: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price({ min: 5, max: 500 })),
  seller_id: faker.string.uuid(),
  shop_id: faker.string.uuid(),
  category_id: faker.number.int({ min: 1, max: 10 }),
  file_url: faker.internet.url(),
  thumbnail_url: faker.image.url(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const generateTestShop = (overrides: Partial<Shop> = {}): Shop => ({
  id: faker.string.uuid(),
  owner_id: faker.string.uuid(),
  name: faker.company.name(),
  description: faker.company.catchPhrase(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

// Mock data sets
export const createMockUsers = (count: number = 10): User[] => {
  return Array.from({ length: count }, () => generateTestUser())
}

export const createMockProducts = (count: number = 20): Product[] => {
  return Array.from({ length: count }, () => generateTestProduct())
}

export const createMockShops = (count: number = 5): Shop[] => {
  return Array.from({ length: count }, () => generateTestShop())
}

// Test assertions
export const expectValidUser = (user: any) => {
  expect(user).toHaveProperty('id')
  expect(user).toHaveProperty('email')
  expect(user).toHaveProperty('name')
  expect(user).toHaveProperty('role')
  expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  expect(['buyer', 'seller', 'partner', 'admin']).toContain(user.role)
}

export const expectValidProduct = (product: any) => {
  expect(product).toHaveProperty('id')
  expect(product).toHaveProperty('title')
  expect(product).toHaveProperty('price')
  expect(product).toHaveProperty('seller_id')
  expect(product.price).toBeGreaterThan(0)
  expect(typeof product.title).toBe('string')
  expect(product.title.length).toBeGreaterThan(0)
}

export const expectValidShop = (shop: any) => {
  expect(shop).toHaveProperty('id')
  expect(shop).toHaveProperty('name')
  expect(shop).toHaveProperty('owner_id')
  expect(typeof shop.name).toBe('string')
  expect(shop.name.length).toBeGreaterThan(0)
}

// Time utilities
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await waitFor(interval)
  }
  
  throw new Error(`Condition not met within ${timeout}ms`)
}

// Mock response generators
export const createMockApiResponse = <T>(data: T, options: {
  status?: number
  headers?: Record<string, string>
  delay?: number
} = {}) => ({
  status: options.status || 200,
  headers: {
    'Content-Type': 'application/json',
    ...options.headers,
  },
  json: async () => data,
  text: async () => JSON.stringify(data),
  ok: (options.status || 200) >= 200 && (options.status || 200) < 300,
})

// Database test utilities
export const cleanupTestData = async (tables: string[] = []) => {
  // This would integrate with your actual database cleanup
  console.log(`Cleaning up test data from tables: ${tables.join(', ')}`)
}

export const seedTestData = async (data: {
  users?: User[]
  products?: Product[]
  shops?: Shop[]
}) => {
  // This would integrate with your actual database seeding
  console.log('Seeding test data:', {
    users: data.users?.length || 0,
    products: data.products?.length || 0,
    shops: data.shops?.length || 0,
  })
}

// Error simulation utilities
export const simulateNetworkError = () => {
  throw new Error('Network Error: Connection timeout')
}

export const simulateRateLimitError = () => {
  const error = new Error('Rate limit exceeded')
  ;(error as any).status = 429
  throw error
}

export const simulateValidationError = (field: string) => {
  const error = new Error(`Validation failed for field: ${field}`)
  ;(error as any).status = 400
  throw error
}

// Performance testing utilities
export const measureExecutionTime = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  
  return { result, duration }
}

export const createPerformanceBenchmark = (name: string) => {
  const timings: number[] = []
  
  return {
    measure: async <T>(fn: () => Promise<T>): Promise<T> => {
      const { result, duration } = await measureExecutionTime(fn)
      timings.push(duration)
      return result
    },
    
    getStats: () => {
      if (timings.length === 0) return null
      
      const sorted = [...timings].sort((a, b) => a - b)
      const sum = timings.reduce((a, b) => a + b, 0)
      
      return {
        name,
        count: timings.length,
        min: Math.min(...timings),
        max: Math.max(...timings),
        avg: sum / timings.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      }
    },
  }
}

// Test environment utilities
export const isCI = (): boolean => {
  return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.JENKINS_URL)
}

export const getTestEnvironment = (): 'development' | 'test' | 'ci' => {
  if (isCI()) return 'ci'
  return process.env.NODE_ENV === 'test' ? 'test' : 'development'
}

export const skipIfCI = (reason: string = 'Skipped in CI environment') => {
  if (isCI()) {
    console.log(`⏭️  ${reason}`)
    return true
  }
  return false
}

// Mock payment providers
export const createMockStripePayment = (overrides: any = {}) => ({
  id: `pi_${faker.string.alphanumeric(24)}`,
  amount: faker.number.int({ min: 100, max: 10000 }),
  currency: 'usd',
  status: 'succeeded',
  payment_method: `pm_${faker.string.alphanumeric(24)}`,
  created: Math.floor(Date.now() / 1000),
  ...overrides,
})

export const createMockYooKassaPayment = (overrides: any = {}) => ({
  id: faker.string.uuid(),
  amount: {
    value: faker.number.int({ min: 100, max: 10000 }),
    currency: 'RUB',
  },
  status: 'succeeded',
  payment_method: {
    type: 'bank_card',
    id: faker.string.alphanumeric(16),
  },
  created_at: new Date().toISOString(),
  ...overrides,
})

// File upload utilities
export const createMockFile = (
  name: string = 'test-file.pdf',
  type: string = 'application/pdf',
  size: number = 1024
): File => {
  const content = new Uint8Array(size)
  return new File([content], name, { type })
}

export const createMockFileList = (files: File[]): FileList => {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    *[Symbol.iterator]() {
      for (const file of files) {
        yield file
      }
    },
  }
  
  Object.defineProperty(fileList, 'length', {
    value: files.length,
    writable: false,
  })
  
  files.forEach((file, index) => {
    Object.defineProperty(fileList, index, {
      value: file,
      writable: false,
    })
  })
  
  return fileList as FileList
}

// Custom Jest matchers
export const customMatchers = {
  toBeValidEmail: (received: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass,
    }
  },
  
  toBeValidUUID: (received: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    }
  },
  
  toBeWithinRange: (received: number, min: number, max: number) => {
    const pass = received >= min && received <= max
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be within range ${min}-${max}`,
      pass,
    }
  },
}

// Test data persistence (for debugging)
export const saveTestData = (name: string, data: any) => {
  const fs = require('fs')
  const path = require('path')
  
  const testDataDir = path.join(process.cwd(), 'test-results', 'data')
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true })
  }
  
  const filePath = path.join(testDataDir, `${name}-${Date.now()}.json`)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  
  console.log(`Test data saved: ${filePath}`)
}

export const loadTestData = (name: string): any => {
  const fs = require('fs')
  const path = require('path')
  
  const testDataDir = path.join(process.cwd(), 'test-results', 'data')
  const files = fs.readdirSync(testDataDir).filter((f: string) => f.startsWith(name))
  
  if (files.length === 0) {
    throw new Error(`No test data found for: ${name}`)
  }
  
  const latestFile = files.sort().pop()
  const filePath = path.join(testDataDir, latestFile)
  
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}
