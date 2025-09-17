import { redis } from './redis';
import logger from './logger';

// Lock options
export interface LockOptions {
  ttl?: number; // Time to live in milliseconds
  retryDelay?: number; // Delay between retry attempts in milliseconds
  maxRetries?: number; // Maximum number of retry attempts
  blocking?: boolean; // Whether to block until lock is acquired
  blockingTimeout?: number; // Maximum time to block in milliseconds
}

// Lock result
export interface LockResult {
  acquired: boolean;
  lockId?: string;
  error?: string;
}

// Lock information
export interface LockInfo {
  lockId: string;
  resource: string;
  acquiredAt: number;
  ttl: number;
  expiresAt: number;
}

// Default lock options
const DEFAULT_OPTIONS: Required<LockOptions> = {
  ttl: 30000, // 30 seconds
  retryDelay: 100, // 100ms
  maxRetries: 10,
  blocking: false,
  blockingTimeout: 5000, // 5 seconds
};

// Distributed lock manager
export class DistributedLockManager {
  private locks: Map<string, LockInfo> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  // Acquire a lock
  async acquire(
    resource: string, 
    options: LockOptions = {}
  ): Promise<LockResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const lockId = this.generateLockId();
    const lockKey = this.getLockKey(resource);
    const now = Date.now();
    const expiresAt = now + opts.ttl;

    try {
      // Try to acquire lock using SET with NX and EX options
      const result = await redis.set(
        lockKey,
        JSON.stringify({
          lockId,
          resource,
          acquiredAt: now,
          ttl: opts.ttl,
          expiresAt,
        }),
        'PX', // Set expiration in milliseconds
        opts.ttl,
        'NX' // Only set if key doesn't exist
      );

      if (result === 'OK') {
        // Lock acquired successfully
        const lockInfo: LockInfo = {
          lockId,
          resource,
          acquiredAt: now,
          ttl: opts.ttl,
          expiresAt,
        };

        this.locks.set(resource, lockInfo);
        logger.debug(`Lock acquired for resource: ${resource}, lockId: ${lockId}`);
        
        return { acquired: true, lockId };
      } else {
        // Lock already exists
        if (opts.blocking) {
          return await this.acquireBlocking(resource, opts, lockId);
        } else if (opts.maxRetries > 0) {
          return await this.acquireWithRetry(resource, { ...opts, maxRetries: opts.maxRetries - 1 }, lockId);
        } else {
          return { acquired: false, error: 'Lock already exists' };
        }
      }
    } catch (error) {
      logger.error(`Error acquiring lock for resource ${resource}:`, error);
      return { acquired: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Acquire lock with retry
  private async acquireWithRetry(
    resource: string,
    options: Required<LockOptions>,
    lockId: string
  ): Promise<LockResult> {
    await this.delay(options.retryDelay);
    return this.acquire(resource, options);
  }

  // Acquire lock with blocking
  private async acquireBlocking(
    resource: string,
    options: Required<LockOptions>,
    lockId: string
  ): Promise<LockResult> {
    const startTime = Date.now();
    const endTime = startTime + options.blockingTimeout;

    while (Date.now() < endTime) {
      const result = await this.acquire(resource, { ...options, blocking: false });
      if (result.acquired) {
        return result;
      }

      await this.delay(options.retryDelay);
    }

    return { acquired: false, error: 'Blocking timeout exceeded' };
  }

  // Release a lock
  async release(resource: string, lockId: string): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(resource);
      
      // Use Lua script to ensure atomic release
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await redis.eval(luaScript, 1, lockKey, lockId) as number;
      
      if (result === 1) {
        this.locks.delete(resource);
        logger.debug(`Lock released for resource: ${resource}, lockId: ${lockId}`);
        return true;
      } else {
        logger.warn(`Failed to release lock for resource: ${resource}, lockId: ${lockId} - lock not found or expired`);
        return false;
      }
    } catch (error) {
      logger.error(`Error releasing lock for resource ${resource}:`, error);
      return false;
    }
  }

  // Extend lock TTL
  async extend(resource: string, lockId: string, additionalTtl: number): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(resource);
      
      // Use Lua script to ensure atomic extension
      const luaScript = `
        local current = redis.call("get", KEYS[1])
        if current == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await redis.eval(luaScript, 1, lockKey, lockId, additionalTtl) as number;
      
      if (result === 1) {
        // Update local lock info
        const lockInfo = this.locks.get(resource);
        if (lockInfo) {
          lockInfo.ttl += additionalTtl;
          lockInfo.expiresAt += additionalTtl;
          this.locks.set(resource, lockInfo);
        }
        
        logger.debug(`Lock extended for resource: ${resource}, additional TTL: ${additionalTtl}ms`);
        return true;
      } else {
        logger.warn(`Failed to extend lock for resource: ${resource} - lock not found or expired`);
        return false;
      }
    } catch (error) {
      logger.error(`Error extending lock for resource ${resource}:`, error);
      return false;
    }
  }

  // Check if lock exists
  async exists(resource: string): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(resource);
      const result = await redis.exists(lockKey);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking lock existence for resource ${resource}:`, error);
      return false;
    }
  }

  // Get lock information
  async getLockInfo(resource: string): Promise<LockInfo | null> {
    try {
      const lockKey = this.getLockKey(resource);
      const lockData = await redis.get(lockKey);
      
      if (lockData) {
        return JSON.parse(lockData) as LockInfo;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting lock info for resource ${resource}:`, error);
      return null;
    }
  }

  // Force release lock (admin operation)
  async forceRelease(resource: string): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(resource);
      const result = await redis.del(lockKey);
      
      if (result === 1) {
        this.locks.delete(resource);
        logger.warn(`Force released lock for resource: ${resource}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error force releasing lock for resource ${resource}:`, error);
      return false;
    }
  }

  // Get all active locks
  async getAllLocks(): Promise<LockInfo[]> {
    try {
      const pattern = 'lock:*';
      const keys = await redis.scan(pattern);
      const locks: LockInfo[] = [];

      for (const key of keys) {
        const lockData = await redis.get(key as string);
        if (lockData) {
          try {
            const lockInfo = JSON.parse(lockData) as LockInfo;
            locks.push(lockInfo);
          } catch (parseError) {
            logger.warn(`Failed to parse lock data for key ${key}:`, parseError);
          }
        }
      }

      return locks;
    } catch (error) {
      logger.error('Error getting all locks:', error);
      return [];
    }
  }

  // Cleanup expired locks
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredLocks();
    }, 60000); // Run every minute
  }

  private async cleanupExpiredLocks(): Promise<void> {
    try {
      const now = Date.now();
      const expiredLocks: string[] = [];

      for (const [resource, lockInfo] of this.locks.entries()) {
        if (now > lockInfo.expiresAt) {
          expiredLocks.push(resource);
        }
      }

      for (const resource of expiredLocks) {
        this.locks.delete(resource);
        logger.debug(`Cleaned up expired lock for resource: ${resource}`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired locks:', error);
    }
  }

  // Generate unique lock ID
  private generateLockId(): string {
    return `${process.pid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get lock key
  private getLockKey(resource: string): string {
    return `lock:${resource}`;
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup on shutdown
  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Release all local locks
    const releasePromises = Array.from(this.locks.entries()).map(([resource, lockInfo]) =>
      this.release(resource, lockInfo.lockId)
    );

    await Promise.all(releasePromises);
    this.locks.clear();
  }
}

// Lock decorator for methods
export function WithLock(
  resourceKey: string | ((...args: any[]) => string),
  options: LockOptions = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const lockManager = new DistributedLockManager();

    descriptor.value = async function (...args: any[]) {
      const resource = typeof resourceKey === 'function' 
        ? resourceKey(...args) 
        : resourceKey;

      const lockResult = await lockManager.acquire(resource, options);
      
      if (!lockResult.acquired) {
        throw new Error(`Failed to acquire lock for resource: ${resource}. ${lockResult.error}`);
      }

      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        await lockManager.release(resource, lockResult.lockId!);
      }
    };

    return descriptor;
  };
}

// Mutex implementation
export class Mutex {
  private lockManager: DistributedLockManager;
  private resource: string;
  private lockId?: string;

  constructor(resource: string) {
    this.lockManager = new DistributedLockManager();
    this.resource = resource;
  }

  async lock(options: LockOptions = {}): Promise<boolean> {
    const result = await this.lockManager.acquire(this.resource, options);
    if (result.acquired) {
      this.lockId = result.lockId;
      return true;
    }
    return false;
  }

  async unlock(): Promise<boolean> {
    if (!this.lockId) {
      return false;
    }

    const result = await this.lockManager.release(this.resource, this.lockId);
    if (result) {
      this.lockId = undefined;
    }
    return result;
  }

  async extend(additionalTtl: number): Promise<boolean> {
    if (!this.lockId) {
      return false;
    }

    return this.lockManager.extend(this.resource, this.lockId, additionalTtl);
  }

  isLocked(): boolean {
    return this.lockId !== undefined;
  }

  async dispose(): Promise<void> {
    if (this.lockId) {
      await this.unlock();
    }
  }
}

// Semaphore implementation
export class Semaphore {
  private lockManager: DistributedLockManager;
  private resource: string;
  private maxPermits: number;
  private permits: number;

  constructor(resource: string, maxPermits: number) {
    this.lockManager = new DistributedLockManager();
    this.resource = resource;
    this.maxPermits = maxPermits;
    this.permits = maxPermits;
  }

  async acquire(permits: number = 1, options: LockOptions = {}): Promise<boolean> {
    if (permits > this.maxPermits) {
      throw new Error(`Requested permits (${permits}) exceed maximum permits (${this.maxPermits})`);
    }

    const resourceKey = `${this.resource}:${permits}`;
    const result = await this.lockManager.acquire(resourceKey, options);
    
    if (result.acquired) {
      this.permits -= permits;
    }
    
    return result.acquired;
  }

  async release(permits: number = 1): Promise<boolean> {
    if (permits > this.maxPermits - this.permits) {
      throw new Error(`Cannot release more permits than acquired`);
    }

    const resourceKey = `${this.resource}:${permits}`;
    const result = await this.lockManager.release(resourceKey, '');
    
    if (result) {
      this.permits += permits;
    }
    
    return result;
  }

  getAvailablePermits(): number {
    return this.permits;
  }

  getMaxPermits(): number {
    return this.maxPermits;
  }
}

// Export singleton instance
export const lockManager = new DistributedLockManager();

// Convenience functions
export const locks = {
  acquire: (resource: string, options?: LockOptions) => lockManager.acquire(resource, options),
  release: (resource: string, lockId: string) => lockManager.release(resource, lockId),
  extend: (resource: string, lockId: string, additionalTtl: number) => 
    lockManager.extend(resource, lockId, additionalTtl),
  exists: (resource: string) => lockManager.exists(resource),
  getInfo: (resource: string) => lockManager.getLockInfo(resource),
  forceRelease: (resource: string) => lockManager.forceRelease(resource),
  getAll: () => lockManager.getAllLocks(),
  cleanup: () => lockManager.cleanup(),
};

export default lockManager;
