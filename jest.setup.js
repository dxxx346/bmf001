import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test_db'

// Mock Next.js Request and Response
global.Request = class Request {
  constructor(input, init) {
    this.url = typeof input === 'string' ? input : input.url
    this.method = init?.method || 'GET'
    this.headers = new Map(Object.entries(init?.headers || {}))
    this._body = init?.body
  }
  
  async json() {
    return JSON.parse(this._body)
  }
  
  async text() {
    return this._body
  }
}

global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Map(Object.entries(init?.headers || {}))
  }
  
  async json() {
    return JSON.parse(this.body)
  }
}

// Mock fetch globally
global.fetch = jest.fn()

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'http://example.com/file.jpg' } })),
      })),
    },
  })),
}))

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
  }))
})

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' }),
        retrieve: jest.fn().mockResolvedValue({ id: 'cs_test_123', status: 'complete' }),
      },
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_123' } },
      }),
    },
  }))
})

// Add TextEncoder/TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util')
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}

// Polyfill setImmediate for Node 22 under Jest
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args)
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})

// Start a minimal HTTP server for integration tests to hit
if (!global.__TEST_HTTP_SERVER__) {
  // Global handler registry shared within this worker
  if (!global.__HANDLERS__) global.__HANDLERS__ = {}

  const routeModules = [
    '@/app/api/auth/register/route',
    '@/app/api/auth/login/route',
    '@/app/api/auth/logout/route',
    '@/app/api/auth/refresh/route',
    '@/app/api/products/route',
    '@/app/api/products/bulk/route',
    '@/app/api/products/[id]/route',
    '@/app/api/payments/route',
    '@/app/api/payments/refund/route',
    '@/app/api/webhooks/stripe/route',
  ]

  const makeRouteMock = (key) => new Proxy({}, {
    get(_t, prop) {
      return global.__HANDLERS__?.[key]?.[prop]
    },
    set(_t, prop, value) {
      if (!global.__HANDLERS__[key]) global.__HANDLERS__[key] = {}
      global.__HANDLERS__[key][prop] = value
      return true
    },
  })

  routeModules.forEach(m => {
    jest.mock(m, () => makeRouteMock(m))
  })

  const http = require('http')
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost:3000')
      const pathname = url.pathname
      const method = req.method || 'GET'

      // Collect body
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const rawBody = Buffer.concat(chunks).toString('utf8')

      // Map pathname to route module key
      const routeMap = {
        '/api/auth/register': '@/app/api/auth/register/route',
        '/api/auth/login': '@/app/api/auth/login/route',
        '/api/auth/logout': '@/app/api/auth/logout/route',
        '/api/auth/refresh': '@/app/api/auth/refresh/route',
        '/api/products': '@/app/api/products/route',
        '/api/products/bulk': '@/app/api/products/bulk/route',
        '/api/payments': '@/app/api/payments/route',
        '/api/payments/refund': '@/app/api/payments/refund/route',
        '/api/webhooks/stripe': '@/app/api/webhooks/stripe/route',
      }

      let moduleKey = routeMap[pathname]
      // Dynamic product id
      if (!moduleKey) {
        const m = pathname.match(/^\/api\/products\/([^/]+)$/)
        if (m) moduleKey = '@/app/api/products/[id]/route'
      }

      if (!moduleKey) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: false, error: 'Not Found' }))
        return
      }

      const handler = global.__HANDLERS__?.[moduleKey]?.[method]
      if (typeof handler !== 'function') {
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }))
        return
      }

      // Build a fetch-like Request for handlers
      const headersObj = {}
      for (const [key, value] of req.rawHeaders.reduce((acc, cur, idx) => {
        if (idx % 2 === 0) acc.push([cur, req.rawHeaders[idx + 1]])
        return acc
      }, [])) {
        headersObj[key.toLowerCase()] = value
      }

      const requestInit = { method, headers: headersObj, body: rawBody || undefined }
      const handlerReq = new global.Request('http://localhost:3000' + req.url, requestInit)

      const resp = await handler(handlerReq)
      const status = resp.status || 200
      const bodyText = typeof resp.body === 'string' ? resp.body : resp.body ? resp.body : await (async () => {
        try { return await resp.text?.() } catch { return '' }
      })()

      res.statusCode = status
      // Set headers if available
      if (resp.headers && typeof resp.headers.forEach === 'function') {
        resp.headers.forEach((v, k) => res.setHeader(k, v))
      } else {
        res.setHeader('Content-Type', 'application/json')
      }
      res.end(bodyText)
    } catch (e) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: false, error: 'Server Error' }))
    }
  })
  server.listen(3000)
  // @ts-expect-error - Global test server assignment for test cleanup
  global.__TEST_HTTP_SERVER__ = server
  // Ensure server closes after tests
  afterAll(() => {
    try { server.close() } catch { /* noop */ }
  })
}
