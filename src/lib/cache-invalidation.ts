import { cache, cacheKeys } from './redis';
import logger from './logger';

// Cache invalidation strategies
export interface InvalidationStrategy {
  name: string;
  execute: (context: InvalidationContext) => Promise<void>;
}

export interface InvalidationContext {
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  additionalData?: Record<string, any>;
}

// Tag-based invalidation strategy
export class TagBasedInvalidation implements InvalidationStrategy {
  name = 'tag-based';

  async execute(context: InvalidationContext): Promise<void> {
    const { entityType, entityId, operation } = context;
    
    try {
      const tags = this.generateTags(entityType, entityId, operation);
      
      for (const tag of tags) {
        await this.invalidateByTag(tag);
      }
      
      logger.info(`Tag-based invalidation completed for ${entityType}:${entityId}`);
    } catch (error) {
      logger.error('Tag-based invalidation failed:', error);
    }
  }

  private generateTags(entityType: string, entityId: string, operation: string): string[] {
    const tags: string[] = [];
    
    // Base entity tag
    tags.push(`${entityType}:${entityId}`);
    
    // Operation-specific tags
    switch (operation) {
      case 'create':
        tags.push(`${entityType}:list`);
        tags.push(`${entityType}:count`);
        break;
      case 'update':
        tags.push(`${entityType}:${entityId}`);
        tags.push(`${entityType}:list`);
        break;
      case 'delete':
        tags.push(`${entityType}:${entityId}`);
        tags.push(`${entityType}:list`);
        tags.push(`${entityType}:count`);
        break;
    }
    
    return tags;
  }

  private async invalidateByTag(tag: string): Promise<void> {
    const pattern = `*:tag:${tag}:*`;
    const keys = await cache.scan(pattern);
    if (keys.length > 0) {
      await cache.delMultiple(keys);
    }
  }
}

// Pattern-based invalidation strategy
export class PatternBasedInvalidation implements InvalidationStrategy {
  name = 'pattern-based';

  async execute(context: InvalidationContext): Promise<void> {
    const { entityType, entityId, operation } = context;
    
    try {
      const patterns = this.generatePatterns(entityType, entityId, operation, context.additionalData);
      
      for (const pattern of patterns) {
        await this.invalidateByPattern(pattern);
      }
      
      logger.info(`Pattern-based invalidation completed for ${entityType}:${entityId}`);
    } catch (error) {
      logger.error('Pattern-based invalidation failed:', error);
    }
  }

  private generatePatterns(entityType: string, entityId: string, operation: string, additionalData?: Record<string, any>): string[] {
    const patterns: string[] = [];
    
    switch (entityType) {
      case 'product':
        patterns.push(`product:${entityId}`);
        patterns.push('products:*');
        patterns.push('popular:products:*');
        patterns.push('search:*');
        if (operation === 'delete') {
          patterns.push(`user:favorites:*:${entityId}`);
        }
        break;
        
      case 'user':
        patterns.push(`user:${entityId}`);
        patterns.push(`user:purchases:${entityId}*`);
        patterns.push(`user:favorites:${entityId}*`);
        break;
        
      case 'shop':
        patterns.push(`shop:${entityId}`);
        patterns.push(`shop:products:${entityId}*`);
        patterns.push('shops:*');
        break;
        
      case 'category':
        patterns.push(`category:${entityId}`);
        patterns.push('categories:*');
        patterns.push('products:*'); // Products might be filtered by category
        break;
        
      case 'purchase':
        patterns.push(`user:purchases:${additionalData?.userId}*`);
        patterns.push(`analytics:*:${entityId}*`);
        break;
        
      case 'referral':
        patterns.push(`referral:stats:${entityId}*`);
        patterns.push('analytics:referral:*');
        break;
    }
    
    return patterns;
  }

  private async invalidateByPattern(pattern: string): Promise<void> {
    const keys = await cache.scan(pattern);
    if (keys.length > 0) {
      await cache.delMultiple(keys);
    }
  }
}

// Time-based invalidation strategy
export class TimeBasedInvalidation implements InvalidationStrategy {
  name = 'time-based';

  async execute(context: InvalidationContext): Promise<void> {
    const { entityType, operation } = context;
    
    try {
      // Invalidate time-sensitive caches based on operation
      const timeSensitivePatterns = this.getTimeSensitivePatterns(entityType, operation);
      
      for (const pattern of timeSensitivePatterns) {
        await this.invalidateByPattern(pattern);
      }
      
      logger.info(`Time-based invalidation completed for ${entityType}`);
    } catch (error) {
      logger.error('Time-based invalidation failed:', error);
    }
  }

  private getTimeSensitivePatterns(entityType: string, operation: string): string[] {
    const patterns: string[] = [];
    
    // Always invalidate analytics and stats
    patterns.push('analytics:*');
    patterns.push('stats:*');
    
    // Invalidate popular/trending data
    patterns.push('popular:*');
    patterns.push('trending:*');
    
    // Invalidate recommendation caches
    patterns.push('recommendations:*');
    
    return patterns;
  }

  private async invalidateByPattern(pattern: string): Promise<void> {
    const keys = await cache.scan(pattern);
    if (keys.length > 0) {
      await cache.delMultiple(keys);
    }
  }
}

// Cascade invalidation strategy
export class CascadeInvalidation implements InvalidationStrategy {
  name = 'cascade';

  async execute(context: InvalidationContext): Promise<void> {
    const { entityType, entityId, operation, additionalData } = context;
    
    try {
      // Define cascade relationships
      const cascades = this.getCascadeRelationships(entityType, entityId, additionalData);
      
      for (const cascade of cascades) {
        await this.invalidateCascade(cascade);
      }
      
      logger.info(`Cascade invalidation completed for ${entityType}:${entityId}`);
    } catch (error) {
      logger.error('Cascade invalidation failed:', error);
    }
  }

  private getCascadeRelationships(
    entityType: string, 
    entityId: string, 
    additionalData?: Record<string, any>
  ): Array<{ type: string; id: string; patterns: string[] }> {
    const cascades: Array<{ type: string; id: string; patterns: string[] }> = [];
    
    switch (entityType) {
      case 'product':
        // When product changes, invalidate shop and category caches
        if (additionalData?.shopId) {
          cascades.push({
            type: 'shop',
            id: additionalData.shopId,
            patterns: [`shop:${additionalData.shopId}`, `shop:products:${additionalData.shopId}*`]
          });
        }
        if (additionalData?.categoryId) {
          cascades.push({
            type: 'category',
            id: additionalData.categoryId,
            patterns: [`category:${additionalData.categoryId}`, 'categories:*']
          });
        }
        break;
        
      case 'purchase':
        // When purchase is made, invalidate user and product caches
        if (additionalData?.userId) {
          cascades.push({
            type: 'user',
            id: additionalData.userId,
            patterns: [`user:${additionalData.userId}`, `user:purchases:${additionalData.userId}*`]
          });
        }
        if (additionalData?.productId) {
          cascades.push({
            type: 'product',
            id: additionalData.productId,
            patterns: [`product:${additionalData.productId}`, 'analytics:product:*']
          });
        }
        break;
        
      case 'user':
        // When user changes, invalidate related data
        cascades.push({
          type: 'user',
          id: entityId,
          patterns: [
            `user:${entityId}`,
            `user:purchases:${entityId}*`,
            `user:favorites:${entityId}*`,
            'analytics:user:*'
          ]
        });
        break;
    }
    
    return cascades;
  }

  private async invalidateCascade(cascade: { type: string; id: string; patterns: string[] }): Promise<void> {
    for (const pattern of cascade.patterns) {
      const keys = await cache.scan(pattern);
      if (keys.length > 0) {
        await cache.delMultiple(keys);
      }
    }
  }
}

// Cache invalidation manager
export class CacheInvalidationManager {
  private strategies: Map<string, InvalidationStrategy> = new Map();
  private defaultStrategy: InvalidationStrategy;

  constructor() {
    // Register default strategies
    this.registerStrategy(new TagBasedInvalidation());
    this.registerStrategy(new PatternBasedInvalidation());
    this.registerStrategy(new TimeBasedInvalidation());
    this.registerStrategy(new CascadeInvalidation());
    
    // Set default strategy
    this.defaultStrategy = new PatternBasedInvalidation();
  }

  registerStrategy(strategy: InvalidationStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  async invalidate(context: InvalidationContext, strategyName?: string): Promise<void> {
    const strategy = strategyName 
      ? this.strategies.get(strategyName) 
      : this.defaultStrategy;

    if (!strategy) {
      logger.error(`Invalidation strategy '${strategyName}' not found`);
      return;
    }

    try {
      await strategy.execute(context);
      logger.info(`Cache invalidation completed using ${strategy.name} strategy`);
    } catch (error) {
      logger.error(`Cache invalidation failed using ${strategy.name} strategy:`, error);
    }
  }

  // Convenience methods for common operations
  async invalidateProduct(productId: string, operation: 'create' | 'update' | 'delete', shopId?: string, categoryId?: string): Promise<void> {
    await this.invalidate({
      entityType: 'product',
      entityId: productId,
      operation,
      additionalData: { shopId, categoryId }
    });
  }

  async invalidateUser(userId: string, operation: 'create' | 'update' | 'delete'): Promise<void> {
    await this.invalidate({
      entityType: 'user',
      entityId: userId,
      operation
    });
  }

  async invalidateShop(shopId: string, operation: 'create' | 'update' | 'delete'): Promise<void> {
    await this.invalidate({
      entityType: 'shop',
      entityId: shopId,
      operation
    });
  }

  async invalidatePurchase(purchaseId: string, userId: string, productId: string): Promise<void> {
    await this.invalidate({
      entityType: 'purchase',
      entityId: purchaseId,
      operation: 'create',
      additionalData: { userId, productId }
    });
  }

  async invalidateReferral(referralId: string, operation: 'create' | 'update' | 'delete'): Promise<void> {
    await this.invalidate({
      entityType: 'referral',
      entityId: referralId,
      operation
    });
  }

  // Bulk invalidation
  async invalidateMultiple(contexts: InvalidationContext[]): Promise<void> {
    const promises = contexts.map(context => this.invalidate(context));
    await Promise.all(promises);
  }

  // Get available strategies
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// Export singleton instance
export const cacheInvalidationManager = new CacheInvalidationManager();

// Export convenience functions
export const invalidateCache = {
  product: (productId: string, operation: 'create' | 'update' | 'delete', shopId?: string, categoryId?: string) =>
    cacheInvalidationManager.invalidateProduct(productId, operation, shopId, categoryId),
  
  user: (userId: string, operation: 'create' | 'update' | 'delete') =>
    cacheInvalidationManager.invalidateUser(userId, operation),
  
  shop: (shopId: string, operation: 'create' | 'update' | 'delete') =>
    cacheInvalidationManager.invalidateShop(shopId, operation),
  
  purchase: (purchaseId: string, userId: string, productId: string) =>
    cacheInvalidationManager.invalidatePurchase(purchaseId, userId, productId),
  
  referral: (referralId: string, operation: 'create' | 'update' | 'delete') =>
    cacheInvalidationManager.invalidateReferral(referralId, operation),
};

export default cacheInvalidationManager;
