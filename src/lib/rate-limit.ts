import { NextRequest } from 'next/server';
import { Redis } from 'ioredis';
import { defaultLogger as logger } from './logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimiter {
  private redis: Redis | null = null;
  private memoryStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      logger.info('Rate limiter connected to Redis');
    } catch (error) {
      logger.warn('Redis not available for rate limiting, using memory store');
      this.redis = null;
    }
  }

  private getIdentifier(request: NextRequest): string {
    // Try to get user ID from auth header or session
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // In a real implementation, you'd decode the JWT to get user ID
      // For now, we'll use IP + User-Agent as fallback
    }

    // Fallback to IP address + User-Agent
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }

  private getClientIP(request: NextRequest): string {
    // Check various headers for the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    // Fallback to unknown if no IP found
    return 'unknown';
  }

  private getKey(identifier: string, endpoint: string): string {
    return `rate_limit:${endpoint}:${identifier}`;
  }

  async checkLimit(
    request: NextRequest,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const identifier = this.getIdentifier(request);
    const key = this.getKey(identifier, endpoint);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      if (this.redis) {
        return await this.checkLimitRedis(key, config, now, windowStart);
      } else {
        return this.checkLimitMemory(key, config, now, windowStart);
      }
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }
  }

  private async checkLimitRedis(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult> {
    if (!this.redis) throw new Error('Redis not available');

    const pipeline = this.redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current requests
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));
    
    const results = await pipeline.exec();
    
    if (!results || results.some(result => result[0] !== null)) {
      throw new Error('Redis pipeline execution failed');
    }

    const currentCount = results[1][1] as number;
    const remaining = Math.max(0, config.maxRequests - currentCount);
    const resetTime = now + config.windowMs;

    return {
      success: currentCount < config.maxRequests,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: currentCount >= config.maxRequests ? Math.ceil(config.windowMs / 1000) : undefined,
    };
  }

  private checkLimitMemory(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number
  ): RateLimitResult {
    const current = this.memoryStore.get(key);
    
    if (!current || current.resetTime < now) {
      // New window or expired
      this.memoryStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    if (current.count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      };
    }

    // Increment count
    current.count++;
    this.memoryStore.set(key, current);

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - current.count,
      resetTime: current.resetTime,
    };
  }

  async resetLimit(identifier: string, endpoint: string): Promise<void> {
    const key = this.getKey(identifier, endpoint);
    
    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryStore.delete(key);
      }
    } catch (error) {
      logger.error('Failed to reset rate limit:', error);
    }
  }

  // Clean up expired entries from memory store
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryStore.entries()) {
      if (value.resetTime < now) {
        this.memoryStore.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // Registration - even stricter
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 registrations per hour
    message: 'Too many registration attempts. Please try again later.',
  },
  
  // Password reset - moderate limits
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 reset attempts per hour
    message: 'Too many password reset attempts. Please try again later.',
  },
  
  // General API - more lenient
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'Too many requests. Please try again later.',
  },
  
  // Email verification - very strict
  emailVerification: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3, // 3 attempts per 5 minutes
    message: 'Too many email verification attempts. Please try again later.',
  },
} as const;

// Helper function to create rate limit middleware
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (request: NextRequest, endpoint: string) => {
    const result = await rateLimiter.checkLimit(request, endpoint, config);
    
    if (!result.success) {
      return {
        success: false,
        error: config.message || 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        resetTime: result.resetTime,
      };
    }
    
    return {
      success: true,
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  };
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);
