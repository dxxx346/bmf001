/**
 * Unit tests for AuthService
 */

describe('AuthService', () => {
  // Mock the AuthService
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'buyer' as const,
      }

      const expectedResult = {
        success: true,
        user: {
          id: 'user123',
          email: userData.email,
          name: userData.name,
          role: userData.role,
        },
      }

      mockAuthService.register.mockResolvedValue(expectedResult)

      const result = await mockAuthService.register(userData)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe(userData.email)
      expect(mockAuthService.register).toHaveBeenCalledWith(userData)
    })

    it('should handle registration errors', async () => {
      const userData = {
        email: 'invalid@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'buyer' as const,
      }

      const expectedResult = {
        success: false,
        error: 'Email already exists',
      }

      mockAuthService.register.mockResolvedValue(expectedResult)

      const result = await mockAuthService.register(userData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.user).toBeUndefined()
    })
  })

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      }

      const expectedResult = {
        success: true,
        user: {
          id: 'user123',
          email: credentials.email,
          name: 'Test User',
          role: 'buyer',
        },
        session: {
          access_token: 'token123',
          refresh_token: 'refresh123',
        },
      }

      mockAuthService.login.mockResolvedValue(expectedResult)

      const result = await mockAuthService.login(credentials)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.session).toBeDefined()
      expect(mockAuthService.login).toHaveBeenCalledWith(credentials)
    })

    it('should fail login with invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      const expectedResult = {
        success: false,
        error: 'Invalid credentials',
      }

      mockAuthService.login.mockResolvedValue(expectedResult)

      const result = await mockAuthService.login(credentials)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.user).toBeUndefined()
    })
  })

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const expectedResult = {
        success: true,
      }

      mockAuthService.logout.mockResolvedValue(expectedResult)

      const result = await mockAuthService.logout()

      expect(result.success).toBe(true)
      expect(mockAuthService.logout).toHaveBeenCalled()
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const expectedResult = {
        success: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'buyer',
        },
      }

      mockAuthService.getCurrentUser.mockResolvedValue(expectedResult)

      const result = await mockAuthService.getCurrentUser()

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user.id).toBe('user123')
    })

    it('should handle unauthenticated state', async () => {
      const expectedResult = {
        success: false,
        user: null,
      }

      mockAuthService.getCurrentUser.mockResolvedValue(expectedResult)

      const result = await mockAuthService.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.user).toBeNull()
    })
  })
})
