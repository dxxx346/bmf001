import { NextRequest, NextResponse } from 'next/server';
import { redis, cache } from '@/lib/redis';
import { defaultLogger as logger } from '@/lib/logger';
import { AuthService } from '@/services/auth.service';

// Types for rate limiting configuration
export interface RateLimitRule {
  requests: number;
  window: number; // in seconds
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitConfig {
  rules: Record<string, RateLimitRule>;
  exemptRoles?: string[];
  exemptIPs?: string[];
  keyGenerator?: (request: NextRequest) => string;
  onExceeded?: (request: NextRequest, limit: RateLimitRule) => Promise<NextResponse>;
  enableExponentialBackoff?: boolean;
  maxBackoffMultiplier?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  backoffMultiplier?: number;
}

export interface SecurityEventData {
  user_id?: string;
  event_type: 'rate_limit_exceeded' | 'suspicious_activity' | 'repeated_violations';
  ip_address: string;
  user_agent: string;
  details: Record<string, unknown>;
}

export interface MemoryStore {
  [key: string]: {
    requests: Array<{ timestamp: number; success: boolean }>;
    violations: number;
    lastViolation?: number;
  };
}

// Default rate limiting rules
const DEFAULT_RULES: Record<string, RateLimitRule> = {
  // Authentication endpoints - strict limits
  '/api/auth/login': { requests: 5, window: 60 }, // 5 requests per minute
  '/api/auth/register': { requests: 3, window: 60 }, // 3 requests per minute
  '/api/auth/reset-password': { requests: 3, window: 300 }, // 3 requests per 5 minutes
  '/api/auth/verify-email': { requests: 5, window: 60 }, // 5 requests per minute
  
  // Payment endpoints - moderate limits
  '/api/payments/create-intent': { requests: 10, window: 60 }, // 10 requests per minute
  '/api/payments/confirm': { requests: 10, window: 60 }, // 10 requests per minute
  '/api/payments/webhook': { requests: 100, window: 60 }, // 100 requests per minute (for webhooks)
  
  // Product creation - hourly limits
  '/api/products/create': { requests: 20, window: 3600 }, // 20 requests per hour
  '/api/products/upload': { requests: 30, window: 3600 }, // 30 requests per hour
  
  // General API endpoints
  '/api/products': { requests: 100, window: 60 }, // 100 requests per minute
  '/api/shops': { requests: 100, window: 60 }, // 100 requests per minute
  '/api/users': { requests: 50, window: 60 }, // 50 requests per minute
  '/api/categories': { requests: 200, window: 60 }, // 200 requests per minute
  '/api/search': { requests: 50, window: 60 }, // 50 requests per minute
  
  // Default rule for unmatched API routes
  'default': { requests: 100, window: 60 }, // 100 requests per minute
};

export class RateLimitMiddleware {
  private authService = new AuthService();
  private memoryStore: MemoryStore = {};
  private isRedisAvailable = false;

  constructor(private config: RateLimitConfig = { rules: DEFAULT_RULES }) {
    this.config = {
      exemptRoles: ['admin'],
      exemptIPs: [],
      enableExponentialBackoff: true,
      maxBackoffMultiplier: 8,
      ...config,
    };
    
    // Test Redis availability
    this.testRedisConnection();
    
    // Clean up memory store every 5 minutes
    setInterval(() => this.cleanupMemoryStore(), 5 * 60 * 1000);
  }

  private async testRedisConnection(): Promise<void> {
    try {
      await redis.ping();
      this.isRedisAvailable = true;
      logger.info('Rate limiter using Redis backend');
    } catch (error) {
      this.isRedisAvailable = false;
      logger.warn('Redis unavailable, falling back to memory store for rate limiting');
    }
  }

  /**
   * Main rate limiting middleware function
   */
  async handle(request: NextRequest): Promise<NextResponse | null> {
    try {
      const pathname = request.nextUrl.pathname;
      
      // Skip rate limiting for non-API routes
      if (!pathname.startsWith('/api/')) {
        return null;
      }

      // Get client identifier
      const clientId = this.getClientIdentifier(request);
      const ipAddress = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Check if client is exempt
      const isExempt = await this.isExemptClient(request, clientId, ipAddress);
      if (isExempt) {
        return null;
      }

      // Get rate limit rule for this endpoint
      const rule = this.getRuleForPath(pathname);
      if (!rule) {
        return null;
      }

      // Check rate limit
      const result = await this.checkRateLimit(clientId, rule, request);
      
      if (!result.success) {
        // Log rate limit violation
        await this.logSecurityEvent({
          event_type: 'rate_limit_exceeded',
          ip_address: ipAddress,
          user_agent: userAgent,
          details: {
            endpoint: pathname,
            limit: rule.requests,
            window: rule.window,
            remaining: result.remaining,
            backoffMultiplier: result.backoffMultiplier,
          },
        });

        // Create rate limit exceeded response
        const response = new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
            retryAfter: result.retryAfter,
          }),
          { 
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.toString(),
              'Retry-After': result.retryAfter?.toString() || '60',
            },
          }
        );

        return response;
      }

      // Add rate limit headers to successful requests
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toString());

      return null; // Continue to next middleware

    } catch (error) {
      logger.error('Rate limiting middleware error:', error);
      return null; // Continue on error
    }
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  private async checkRateLimit(
    clientId: string, 
    rule: RateLimitRule,
    request: NextRequest
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = rule.window * 1000;
    const windowStart = now - windowMs;

    if (this.isRedisAvailable) {
      return this.checkRateLimitRedis(clientId, rule, now, windowStart);
    } else {
      return this.checkRateLimitMemory(clientId, rule, now, windowStart, request);
    }
  }

  /**
   * Redis-based rate limiting with sliding window
   */
  private async checkRateLimitRedis(
    clientId: string,
    rule: RateLimitRule,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${clientId}`;
    const violationsKey = `violations:${clientId}`;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiry on the key
      pipeline.expire(key, rule.window + 10);
      
      // Get violation count for exponential backoff
      pipeline.get(violationsKey);
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Pipeline execution failed');
      }

      const requestCount = (results[1]?.[1] as number) || 0;
      const violations = parseInt((results[4]?.[1] as string) || '0');
      
      // Calculate backoff multiplier
      const backoffMultiplier = this.config.enableExponentialBackoff 
        ? Math.min(Math.pow(2, violations), this.config.maxBackoffMultiplier || 8)
        : 1;

      const adjustedLimit = Math.max(1, Math.floor(rule.requests / backoffMultiplier));
      
      if (requestCount >= adjustedLimit) {
        // Increment violation counter
        await redis.setex(violationsKey, 3600, (violations + 1).toString()); // 1 hour expiry
        
        const retryAfter = Math.ceil(rule.window * backoffMultiplier);
        
        return {
          success: false,
          limit: adjustedLimit,
          remaining: 0,
          reset: Math.ceil((now + rule.window * 1000) / 1000),
          retryAfter,
          backoffMultiplier,
        };
      }

      // Reset violation counter on successful request
      if (violations > 0) {
        await redis.del(violationsKey);
      }

      return {
        success: true,
        limit: adjustedLimit,
        remaining: adjustedLimit - requestCount - 1,
        reset: Math.ceil((now + rule.window * 1000) / 1000),
      };

    } catch (error) {
      logger.error('Redis rate limiting error:', error);
      // Fallback to memory store
      return this.checkRateLimitMemory(clientId, rule, now, windowStart);
    }
  }

  /**
   * Memory-based rate limiting fallback
   */
  private checkRateLimitMemory(
    clientId: string,
    rule: RateLimitRule,
    now: number,
    windowStart: number,
    request?: NextRequest
  ): RateLimitResult {
    if (!this.memoryStore[clientId]) {
      this.memoryStore[clientId] = {
        requests: [],
        violations: 0,
      };
    }

    const clientData = this.memoryStore[clientId];
    
    // Remove expired requests
    clientData.requests = clientData.requests.filter(req => req.timestamp > windowStart);
    
    // Calculate backoff multiplier
    const backoffMultiplier = this.config.enableExponentialBackoff 
      ? Math.min(Math.pow(2, clientData.violations), this.config.maxBackoffMultiplier || 8)
      : 1;

    const adjustedLimit = Math.max(1, Math.floor(rule.requests / backoffMultiplier));
    const currentCount = clientData.requests.length;

    if (currentCount >= adjustedLimit) {
      // Increment violations
      clientData.violations += 1;
      clientData.lastViolation = now;
      
      const retryAfter = Math.ceil(rule.window * backoffMultiplier);
      
      return {
        success: false,
        limit: adjustedLimit,
        remaining: 0,
        reset: Math.ceil((now + rule.window * 1000) / 1000),
        retryAfter,
        backoffMultiplier,
      };
    }

    // Add current request
    clientData.requests.push({
      timestamp: now,
      success: true, // We'll update this based on response status
    });

    // Reset violations on successful request
    if (clientData.violations > 0 && now - (clientData.lastViolation || 0) > 300000) { // 5 minutes
      clientData.violations = 0;
    }

    return {
      success: true,
      limit: adjustedLimit,
      remaining: adjustedLimit - currentCount - 1,
      reset: Math.ceil((now + rule.window * 1000) / 1000),
    };
  }

  /**
   * Get rate limit rule for a given path
   */
  private getRuleForPath(pathname: string): RateLimitRule | null {
    // Try exact match first
    if (this.config.rules[pathname]) {
      return this.config.rules[pathname];
    }

    // Try pattern matching
    for (const [pattern, rule] of Object.entries(this.config.rules)) {
      if (pattern === 'default') continue;
      
      // Convert pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '\\?');
      
      const regex = new RegExp(`^${regexPattern}$`);
      
      if (regex.test(pathname)) {
        return rule;
      }
    }

    // Return default rule
    return this.config.rules['default'] || null;
  }

  /**
   * Check if client is exempt from rate limiting
   */
  private async isExemptClient(
    request: NextRequest, 
    clientId: string, 
    ipAddress: string
  ): Promise<boolean> {
    // Check exempt IPs
    if (this.config.exemptIPs?.includes(ipAddress)) {
      return true;
    }

      // Check if user has exempt role
      if (this.config.exemptRoles?.length) {
        try {
          const authHeader = request.headers.get('authorization');
          const sessionId = request.headers.get('x-session-id');
          const sessionCookie = request.cookies.get('session_id')?.value;

          let user: any = null;

          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            user = await this.validateToken(token);
          } else if (sessionId) {
            const session = await this.validateSession(sessionId);
            if (session) {
              user = await this.authService.getUserProfile(session.user_id);
            }
          } else if (sessionCookie) {
            const session = await this.validateSession(sessionCookie);
            if (session) {
              user = await this.authService.getUserProfile(session.user_id);
            }
          }

          if (user && user.role && this.config.exemptRoles.includes(user.role)) {
            logger.info('Rate limit exemption for admin user', {
              userId: user.id,
              role: user.role,
              endpoint: request.nextUrl.pathname,
            });
            return true;
          }
        } catch (error) {
          logger.error('Error checking user exemption:', error);
        }
      }

    return false;
  }

  /**
   * Generate client identifier for rate limiting
   */
  private getClientIdentifier(request: NextRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }

    const ip = this.getClientIP(request);
    const authHeader = request.headers.get('authorization');
    const sessionId = request.headers.get('x-session-id');
    const sessionCookie = request.cookies.get('session_id')?.value;

    // Use user-based limiting if authenticated
    if (authHeader || sessionId || sessionCookie) {
      const userKey = authHeader || sessionId || sessionCookie || '';
      return `user:${Buffer.from(userKey).toString('base64').slice(0, 32)}`;
    }

    // Fall back to IP-based limiting
    return `ip:${ip}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-client-ip') ||
      'unknown'
    );
  }

  /**
   * Validate JWT token
   */
  private async validateToken(token: string): Promise<any> {
    try {
      const { data: { user }, error } = await this.authService['supabase'].auth.getUser(token);
      
      if (error || !user) {
        return null;
      }

      return await this.authService.getUserProfile(user.id);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate session
   */
  private async validateSession(sessionId: string): Promise<any> {
    try {
      const { data: session, error } = await this.authService['supabase']
        .from('user_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !session) {
        return null;
      }

      return session;
    } catch (error) {
      return null;
    }
  }

  /**
   * Log security events to database
   */
  private async logSecurityEvent(eventData: SecurityEventData): Promise<void> {
    try {
      // Try to get user ID from the current context if available
      let userId = eventData.user_id;
      
      const { error } = await this.authService['supabase']
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: eventData.event_type,
          ip_address: eventData.ip_address,
          user_agent: eventData.user_agent,
          details: eventData.details,
          created_at: new Date().toISOString(),
        });

      if (error) {
        logger.error('Failed to log security event:', error);
      }
    } catch (error) {
      logger.error('Error logging security event:', error);
    }
  }

  /**
   * Clean up expired entries from memory store
   */
  private cleanupMemoryStore(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [clientId, data] of Object.entries(this.memoryStore)) {
      // Remove old requests
      data.requests = data.requests.filter(req => now - req.timestamp < maxAge);
      
      // Remove clients with no recent activity
      if (data.requests.length === 0 && 
          (!data.lastViolation || now - data.lastViolation > maxAge)) {
        delete this.memoryStore[clientId];
      }
    }

    logger.debug('Memory store cleanup completed', {
      activeClients: Object.keys(this.memoryStore).length,
    });
  }

  /**
   * Get current rate limit status for a client
   */
  async getStatus(clientId: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - (rule.window * 1000);

    if (this.isRedisAvailable) {
      const key = `rate_limit:${clientId}`;
      try {
        const count = await redis.zcount(key, windowStart, now);
        return {
          success: count < rule.requests,
          limit: rule.requests,
          remaining: Math.max(0, rule.requests - count),
          reset: Math.ceil((now + rule.window * 1000) / 1000),
        };
      } catch (error) {
        logger.error('Error getting rate limit status from Redis:', error);
      }
    }

    // Fallback to memory store
    const clientData = this.memoryStore[clientId];
    if (!clientData) {
      return {
        success: true,
        limit: rule.requests,
        remaining: rule.requests,
        reset: Math.ceil((now + rule.window * 1000) / 1000),
      };
    }

    const validRequests = clientData.requests.filter(req => req.timestamp > windowStart);
    return {
      success: validRequests.length < rule.requests,
      limit: rule.requests,
      remaining: Math.max(0, rule.requests - validRequests.length),
      reset: Math.ceil((now + rule.window * 1000) / 1000),
    };
  }

  /**
   * Reset rate limit for a client (admin function)
   */
  async reset(clientId: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable) {
        const keys = await redis.keys(`*${clientId}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }

      delete this.memoryStore[clientId];
      return true;
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
      return false;
    }
  }
}

// Export singleton instance with default configuration
export const rateLimitMiddleware = new RateLimitMiddleware();

// Export custom configurations for different use cases
export const strictRateLimitMiddleware = new RateLimitMiddleware({
  rules: {
    '/api/auth/login': { requests: 3, window: 60 },
    '/api/auth/register': { requests: 2, window: 300 },
    'default': { requests: 50, window: 60 },
  },
  enableExponentialBackoff: true,
  maxBackoffMultiplier: 16,
});

export const lenientRateLimitMiddleware = new RateLimitMiddleware({
  rules: {
    '/api/auth/login': { requests: 10, window: 60 },
    '/api/products': { requests: 200, window: 60 },
    'default': { requests: 200, window: 60 },
  },
  enableExponentialBackoff: false,
});
