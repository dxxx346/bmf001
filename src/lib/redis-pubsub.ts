import { subscriber, publisher } from './redis';
import logger from './logger';

// Event types
export interface PubSubEvent {
  type: string;
  data: any;
  timestamp: number;
  source: string;
}

// Event handler type
export type EventHandler<T = any> = (event: PubSubEvent & { data: T }) => Promise<void> | void;

// Channel patterns
export const channels = {
  // Product events
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  PRODUCT_VIEWED: 'product:viewed',
  
  // User events
  USER_REGISTERED: 'user:registered',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  
  // Shop events
  SHOP_CREATED: 'shop:created',
  SHOP_UPDATED: 'shop:updated',
  SHOP_DELETED: 'shop:deleted',
  
  // Purchase events
  PURCHASE_CREATED: 'purchase:created',
  PURCHASE_COMPLETED: 'purchase:completed',
  PURCHASE_FAILED: 'purchase:failed',
  
  // Payment events
  PAYMENT_INITIATED: 'payment:initiated',
  PAYMENT_COMPLETED: 'payment:completed',
  PAYMENT_FAILED: 'payment:failed',
  PAYMENT_REFUNDED: 'payment:refunded',
  
  // Referral events
  REFERRAL_CREATED: 'referral:created',
  REFERRAL_CLICKED: 'referral:clicked',
  REFERRAL_REWARD: 'referral:reward',
  
  // Analytics events
  ANALYTICS_UPDATE: 'analytics:update',
  STATS_UPDATE: 'stats:update',
  
  // Cache events
  CACHE_INVALIDATE: 'cache:invalidate',
  CACHE_WARM: 'cache:warm',
  
  // System events
  SYSTEM_MAINTENANCE: 'system:maintenance',
  SYSTEM_ERROR: 'system:error',
} as const;

// Pub/Sub manager
export class PubSubManager {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private isSubscribed = false;

  constructor() {
    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message);
    });

    subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
      this.handleMessage(channel, message, pattern);
    });

    subscriber.on('error', (error) => {
      logger.error('Redis subscriber error:', error);
    });
  }

  private async handleMessage(channel: string, message: string, pattern?: string): Promise<void> {
    try {
      const event: PubSubEvent = JSON.parse(message);
      
      // Get handlers for this channel
      const channelHandlers = this.handlers.get(channel) || new Set();
      const patternHandlers = pattern ? this.handlers.get(pattern) || new Set() : new Set();
      
      // Combine handlers
      const allHandlers = new Set([...channelHandlers, ...patternHandlers]);
      
      // Execute handlers
      const promises = Array.from(allHandlers).map((handler) => {
        try {
          return (handler as EventHandler)(event);
        } catch (error) {
          logger.error(`Error in event handler for channel ${channel}:`, error);
          return Promise.resolve();
        }
      });
      
      await Promise.all(promises);
      
      logger.debug(`Processed message on channel ${channel} with ${allHandlers.size} handlers`);
    } catch (error) {
      logger.error(`Error handling message on channel ${channel}:`, error);
    }
  }

  // Subscribe to a channel
  async subscribe(channel: string, handler: EventHandler): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    
    this.handlers.get(channel)!.add(handler);
    
    if (!this.isSubscribed) {
      await subscriber.subscribe(channel);
      this.isSubscribed = true;
    } else {
      await subscriber.subscribe(channel);
    }
    
    logger.info(`Subscribed to channel: ${channel}`);
  }

  // Subscribe to multiple channels
  async subscribeMultiple(channels: string[], handler: EventHandler): Promise<void> {
    for (const channel of channels) {
      await this.subscribe(channel, handler);
    }
  }

  // Subscribe to a pattern
  async psubscribe(pattern: string, handler: EventHandler): Promise<void> {
    if (!this.handlers.has(pattern)) {
      this.handlers.set(pattern, new Set());
    }
    
    this.handlers.get(pattern)!.add(handler);
    
    await subscriber.psubscribe(pattern);
    logger.info(`Subscribed to pattern: ${pattern}`);
  }

  // Unsubscribe from a channel
  async unsubscribe(channel: string, handler?: EventHandler): Promise<void> {
    if (handler) {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(channel);
          await subscriber.unsubscribe(channel);
        }
      }
    } else {
      this.handlers.delete(channel);
      await subscriber.unsubscribe(channel);
    }
    
    logger.info(`Unsubscribed from channel: ${channel}`);
  }

  // Unsubscribe from a pattern
  async punsubscribe(pattern: string, handler?: EventHandler): Promise<void> {
    if (handler) {
      const handlers = this.handlers.get(pattern);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(pattern);
          await subscriber.punsubscribe(pattern);
        }
      }
    } else {
      this.handlers.delete(pattern);
      await subscriber.punsubscribe(pattern);
    }
    
    logger.info(`Unsubscribed from pattern: ${pattern}`);
  }

  // Publish an event
  async publish(channel: string, event: Omit<PubSubEvent, 'timestamp' | 'source'>): Promise<void> {
    try {
      const fullEvent: PubSubEvent = {
        ...event,
        timestamp: Date.now(),
        source: process.env.NODE_NAME || 'unknown',
      };
      
      await publisher.publish(channel, JSON.stringify(fullEvent));
      logger.debug(`Published event to channel ${channel}:`, event.type);
    } catch (error) {
      logger.error(`Error publishing to channel ${channel}:`, error);
    }
  }

  // Publish to multiple channels
  async publishMultiple(channels: string[], event: Omit<PubSubEvent, 'timestamp' | 'source'>): Promise<void> {
    const promises = channels.map(channel => this.publish(channel, event));
    await Promise.all(promises);
  }

  // Get active subscriptions
  getActiveSubscriptions(): string[] {
    return Array.from(this.handlers.keys());
  }

  // Check if subscribed to a channel
  isSubscribedTo(channel: string): boolean {
    return this.handlers.has(channel);
  }
}

// Event emitter for specific event types
export class EventEmitter<T = any> {
  private handlers: Set<EventHandler<T>> = new Set();

  on(handler: EventHandler<T>): void {
    this.handlers.add(handler);
  }

  off(handler: EventHandler<T>): void {
    this.handlers.delete(handler);
  }

  async emit(event: PubSubEvent & { data: T }): Promise<void> {
    const promises = Array.from(this.handlers).map(handler => {
      try {
        return handler(event);
      } catch (error) {
        logger.error('Error in event handler:', error);
        return Promise.resolve();
      }
    });
    
    await Promise.all(promises);
  }

  getHandlerCount(): number {
    return this.handlers.size;
  }
}

// Specific event emitters for different event types
export const eventEmitters = {
  product: new EventEmitter(),
  user: new EventEmitter(),
  shop: new EventEmitter(),
  purchase: new EventEmitter(),
  payment: new EventEmitter(),
  referral: new EventEmitter(),
  analytics: new EventEmitter(),
  cache: new EventEmitter(),
  system: new EventEmitter(),
};

// Event factory functions
export const createEvent = {
  productCreated: (productId: string, shopId: string, categoryId: string) => ({
    type: 'product:created',
    data: { productId, shopId, categoryId },
  }),
  
  productUpdated: (productId: string, changes: Record<string, any>) => ({
    type: 'product:updated',
    data: { productId, changes },
  }),
  
  productDeleted: (productId: string, shopId: string) => ({
    type: 'product:deleted',
    data: { productId, shopId },
  }),
  
  userRegistered: (userId: string, email: string) => ({
    type: 'user:registered',
    data: { userId, email },
  }),
  
  purchaseCompleted: (purchaseId: string, userId: string, productId: string, amount: number) => ({
    type: 'purchase:completed',
    data: { purchaseId, userId, productId, amount },
  }),
  
  paymentCompleted: (paymentId: string, userId: string, amount: number, currency: string) => ({
    type: 'payment:completed',
    data: { paymentId, userId, amount, currency },
  }),
  
  referralClicked: (referralId: string, productId: string, userId?: string) => ({
    type: 'referral:clicked',
    data: { referralId, productId, userId },
  }),
  
  cacheInvalidate: (pattern: string, reason: string) => ({
    type: 'cache:invalidate',
    data: { pattern, reason },
  }),
};

// Export singleton instance
export const pubSubManager = new PubSubManager();

// Convenience functions
export const pubsub = {
  // Publish events
  publish: (channel: string, event: Omit<PubSubEvent, 'timestamp' | 'source'>) =>
    pubSubManager.publish(channel, event),
  
  publishMultiple: (channels: string[], event: Omit<PubSubEvent, 'timestamp' | 'source'>) =>
    pubSubManager.publishMultiple(channels, event),
  
  // Subscribe to events
  subscribe: (channel: string, handler: EventHandler) =>
    pubSubManager.subscribe(channel, handler),
  
  subscribeMultiple: (channels: string[], handler: EventHandler) =>
    pubSubManager.subscribeMultiple(channels, handler),
  
  psubscribe: (pattern: string, handler: EventHandler) =>
    pubSubManager.psubscribe(pattern, handler),
  
  // Unsubscribe from events
  unsubscribe: (channel: string, handler?: EventHandler) =>
    pubSubManager.unsubscribe(channel, handler),
  
  punsubscribe: (pattern: string, handler?: EventHandler) =>
    pubSubManager.punsubscribe(pattern, handler),
  
  // Utility functions
  getActiveSubscriptions: () => pubSubManager.getActiveSubscriptions(),
  isSubscribedTo: (channel: string) => pubSubManager.isSubscribedTo(channel),
};

export default pubSubManager;
