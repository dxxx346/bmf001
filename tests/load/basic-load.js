import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const responseTime = new Trend('response_time')
const apiCalls = new Counter('api_calls')

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be below 10%
    errors: ['rate<0.05'],            // Custom error rate should be below 5%
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Test data
const testUsers = [
  { email: 'test-buyer@example.com', password: 'TestPassword123!' },
  { email: 'test-seller@example.com', password: 'TestPassword123!' },
]

export function setup() {
  // Setup function runs once before all VUs
  console.log('Setting up load test environment...')
  
  // Verify the application is running
  const response = http.get(`${BASE_URL}/`)
  check(response, {
    'homepage is accessible': (r) => r.status === 200,
  })
  
  return { baseUrl: BASE_URL }
}

export default function(data) {
  const testUser = testUsers[Math.floor(Math.random() * testUsers.length)]
  
  // Test scenario: User browsing and purchasing
  userBrowsingScenario(testUser)
  
  sleep(1) // Think time between iterations
}

function userBrowsingScenario(user) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  }
  
  // 1. Visit homepage
  const homepageResponse = http.get(`${BASE_URL}/`)
  check(homepageResponse, {
    'homepage loads': (r) => r.status === 200,
    'homepage has content': (r) => r.body.includes('marketplace'),
  }) || errorRate.add(1)
  responseTime.add(homepageResponse.timings.duration)
  apiCalls.add(1)
  
  // 2. Browse products
  const productsResponse = http.get(`${BASE_URL}/api/products?limit=20`)
  check(productsResponse, {
    'products API responds': (r) => r.status === 200,
    'products have data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.products && Array.isArray(body.products)
      } catch {
        return false
      }
    },
  }) || errorRate.add(1)
  responseTime.add(productsResponse.timings.duration)
  apiCalls.add(1)
  
  // 3. Search products
  const searchResponse = http.get(`${BASE_URL}/api/products?q=test&limit=10`)
  check(searchResponse, {
    'search API responds': (r) => r.status === 200,
    'search returns results': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.products !== undefined
      } catch {
        return false
      }
    },
  }) || errorRate.add(1)
  responseTime.add(searchResponse.timings.duration)
  apiCalls.add(1)
  
  sleep(1) // Think time
}

export function teardown(data) {
  // Teardown function runs once after all VUs
  console.log('Load test completed')
}
