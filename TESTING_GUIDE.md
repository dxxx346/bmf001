# 🧪 Comprehensive Testing Guide

This guide covers the complete testing infrastructure for the BMF001 Digital Marketplace, designed to achieve 80% code coverage and ensure robust, secure, and performant code.

## 📋 Table of Contents

- [Overview](#overview)
- [Testing Types](#testing-types)
- [Quick Start](#quick-start)
- [Test Configuration](#test-configuration)
- [Running Tests](#running-tests)
- [Coverage Reports](#coverage-reports)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Our testing strategy follows the testing pyramid approach:

```
    🔺 E2E Tests (10%)
       - User flows
       - Integration scenarios
       
   🔷 Integration Tests (30%)
      - API endpoints
      - Database interactions
      - Service communication
      
🔶 Unit Tests (60%)
   - Individual functions
   - Service methods
   - Business logic
```

### Testing Tools Stack

- **Unit Tests**: Jest + Testing Library
- **Integration Tests**: Jest + Supertest
- **E2E Tests**: Playwright
- **Load Testing**: k6
- **Security Testing**: OWASP ZAP
- **Coverage**: Istanbul/nyc
- **Mocking**: Jest mocks + MSW

## 🔧 Testing Types

### 1. Unit Tests (`__tests__/unit/`)

Test individual functions and methods in isolation.

```bash
npm run test:unit
```

**Coverage Target**: 85%+

**What to test**:
- Service methods
- Utility functions
- Business logic
- Error handling
- Edge cases

**Example**:
```typescript
import { AuthService } from '@/services/auth.service'

describe('AuthService', () => {
  it('should validate email format', async () => {
    const result = await authService.register({
      email: 'invalid-email',
      password: 'Password123!'
    })
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('email')
  })
})
```

### 2. Integration Tests (`__tests__/integration/`)

Test API endpoints and service interactions.

```bash
npm run test:integration
```

**Coverage Target**: 80%+

**What to test**:
- API route handlers
- Database operations
- External service integration
- Authentication flows
- Error responses

**Example**:
```typescript
import { POST as authRoute } from '@/app/api/auth/route'

describe('/api/auth', () => {
  it('should handle user registration', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!',
        action: 'signup'
      })
    })

    const response = await authRoute(request)
    expect(response.status).toBe(200)
  })
})
```

### 3. E2E Tests (`tests/e2e/`)

Test complete user workflows from UI perspective.

```bash
npm run test:e2e
```

**What to test**:
- Critical user journeys
- Payment flows
- Authentication
- Product management
- Cross-browser compatibility

**Example**:
```typescript
test('complete purchase flow', async ({ page }) => {
  await page.goto('/products')
  await page.click('[data-testid="product-card"]')
  await page.click('[data-testid="add-to-cart"]')
  await page.click('[data-testid="checkout"]')
  // ... complete flow
})
```

### 4. Load Tests (`tests/load/`)

Test system performance under various load conditions.

```bash
npm run test:load
```

**Test Types**:
- **Basic Load**: Normal user traffic patterns
- **Stress Test**: High concurrent users
- **Spike Test**: Sudden traffic increases

**Example**:
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
}
```

### 5. Security Tests (`tests/security/`)

Automated security vulnerability scanning.

```bash
npm run test:security
```

**What it tests**:
- OWASP Top 10 vulnerabilities
- Authentication bypass
- SQL injection
- XSS vulnerabilities
- Security headers
- Payment security

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Test Environment

```bash
# Copy environment variables
cp .env.example .env.test

# Install additional tools
npm install -g k6  # For load testing
docker pull owasp/zap2docker-stable  # For security testing
```

### 3. Run All Tests

```bash
# Run comprehensive test suite
npm run test:all

# Or use the custom test runner
node tests/scripts/test-runner.js
```

### 4. Generate Coverage Report

```bash
npm run test:coverage
```

## ⚙️ Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/__tests__/unit/**/*.(test|spec).(ts|tsx)'],
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/__tests__/integration/**/*.(test|spec).(ts|tsx)'],
      testEnvironment: 'node',
    },
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

### Playwright Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
```

## 🏃‍♂️ Running Tests

### Individual Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Load tests
npm run test:load

# Security tests
npm run test:security
```

### Advanced Test Execution

```bash
# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="payment"

# Run tests in CI mode
npm run test:ci
```

### Custom Test Runner

```bash
# Run all tests with custom options
node tests/scripts/test-runner.js

# Run in parallel
node tests/scripts/test-runner.js --parallel

# Skip optional tests
node tests/scripts/test-runner.js --skip-optional

# Verbose output
node tests/scripts/test-runner.js --verbose
```

## 📊 Coverage Reports

### Viewing Coverage

After running tests with coverage:

```bash
# Open HTML coverage report
open coverage/index.html

# View terminal summary
npm run test:coverage
```

### Coverage Targets

| Component | Target | Critical Files |
|-----------|--------|----------------|
| Services | 85% | Payment, Auth, Product |
| API Routes | 80% | All endpoints |
| Utilities | 90% | Security, Validation |
| Components | 75% | UI components |
| Overall | 80% | Project-wide |

### Coverage Analysis

The test suite includes automated coverage analysis:

```bash
node tests/scripts/coverage-report.js
```

This generates:
- Detailed coverage analysis
- Critical file coverage check
- Improvement recommendations
- Coverage badges

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Test Environment Variables

```bash
# .env.test
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=test_key
STRIPE_SECRET_KEY=sk_test_...
```

## 📚 Best Practices

### Writing Tests

1. **Follow AAA Pattern**:
   ```typescript
   test('should create user', async () => {
     // Arrange
     const userData = { email: 'test@example.com' }
     
     // Act
     const result = await createUser(userData)
     
     // Assert
     expect(result.success).toBe(true)
   })
   ```

2. **Use Descriptive Names**:
   ```typescript
   // ❌ Bad
   test('user test', () => {})
   
   // ✅ Good
   test('should return error when email is invalid', () => {})
   ```

3. **Test Edge Cases**:
   ```typescript
   describe('validateEmail', () => {
     it('should handle empty string', () => {})
     it('should handle null values', () => {})
     it('should handle special characters', () => {})
   })
   ```

### Test Data Management

1. **Use Factories**:
   ```typescript
   import { generateTestUser } from '@/tests/utils/test-helpers'
   
   const user = generateTestUser({
     email: 'specific@example.com'
   })
   ```

2. **Clean Up After Tests**:
   ```typescript
   afterEach(async () => {
     await cleanupTestData(['users', 'products'])
   })
   ```

3. **Isolate Tests**:
   - Each test should be independent
   - Use fresh data for each test
   - Mock external dependencies

### Performance Testing

1. **Set Realistic Thresholds**:
   ```javascript
   thresholds: {
     http_req_duration: ['p(95)<500'],
     http_req_failed: ['rate<0.1'],
   }
   ```

2. **Test Different Scenarios**:
   - Normal load
   - Stress conditions
   - Spike traffic
   - Extended duration

### Security Testing

1. **Regular Scans**:
   - Run security tests in CI/CD
   - Scan after major changes
   - Monitor for new vulnerabilities

2. **Critical Path Focus**:
   - Authentication flows
   - Payment processing
   - Data access controls
   - File uploads

## 🐛 Troubleshooting

### Common Issues

#### Tests Timing Out

```bash
# Increase timeout in Jest
jest.setTimeout(30000)

# For specific test
test('slow operation', async () => {
  // test code
}, 60000)
```

#### Mock Issues

```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
})

// Reset mock implementation
mockFunction.mockReset()
```

#### Database Connection Issues

```typescript
// Ensure proper cleanup
afterAll(async () => {
  await dbConnection.close()
})
```

#### E2E Test Failures

```bash
# Run with debug mode
npm run test:e2e -- --debug

# Take screenshots on failure
npm run test:e2e -- --screenshot=on-failure
```

### Debug Commands

```bash
# Run single test with debugging
npm test -- --runInBand --detectOpenHandles auth.test.ts

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run load tests with debug output
k6 run --verbose tests/load/basic-load.js

# Check security test logs
docker logs <zap-container-id>
```

### Performance Issues

```bash
# Profile Jest tests
npm test -- --runInBand --logHeapUsage

# Analyze bundle size impact
npm run build && npm run analyze

# Check for memory leaks
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📈 Metrics and Monitoring

### Test Metrics Tracked

- **Coverage Percentage**: Overall and per-file
- **Test Execution Time**: Individual and total
- **Flaky Test Rate**: Tests that intermittently fail
- **Security Vulnerabilities**: Count and severity
- **Performance Regression**: Response time trends

### Reporting

The test suite generates multiple reports:

- **HTML Coverage Report**: `coverage/index.html`
- **Test Results**: `test-results/test-report.html`
- **Security Report**: `test-results/security/`
- **Load Test Report**: `test-results/load/`
- **Performance Metrics**: `test-results/performance.json`

### Continuous Monitoring

```bash
# Set up test result monitoring
node tests/scripts/test-runner.js --generate-reports

# Upload metrics to monitoring service
curl -X POST "https://monitoring.example.com/metrics" \
  -d @test-results/test-summary.json
```

## 🎯 Goals and Targets

### Coverage Goals

- **Overall Coverage**: 80%
- **Critical Services**: 90%
- **API Endpoints**: 85%
- **Security Functions**: 95%

### Performance Targets

- **API Response Time**: < 500ms (p95)
- **Page Load Time**: < 2s
- **Error Rate**: < 1%
- **Concurrent Users**: 100+

### Security Standards

- **Zero High-Risk Vulnerabilities**
- **Max 5 Medium-Risk Issues**
- **All OWASP Top 10 Covered**
- **Security Headers Present**

---

## 📝 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [k6 Documentation](https://k6.io/docs/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Remember**: Testing is not just about coverage numbers—it's about confidence in your code and ensuring a great user experience. Write meaningful tests that catch real bugs and regressions!
