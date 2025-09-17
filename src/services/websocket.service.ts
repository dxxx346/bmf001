import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { defaultLogger as logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';
import { WebSocketConnection } from '@/types/notifications';

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private redis: Redis;
  private supabase;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME,
      db: parseInt(process.env.REDIS_DB || '0'),
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server: any): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Setup Redis adapter for multi-instance support
    const pubClient = this.redis.duplicate();
    const subClient = this.redis.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', async (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          const { token } = data;
          const user = await this.authenticateUser(token);
          
          if (user) {
            socket.data.userId = user.id;
            socket.data.user = user;
            
            // Join user-specific room
            socket.join(`user:${user.id}`);
            
            // Track connection
            await this.trackConnection(socket);
            
            // Notify user of successful authentication
            socket.emit('authenticated', { user });
            
            // Send any pending notifications
            await this.sendPendingNotifications(user.id, socket.id);
            
            logger.info(`User ${user.id} authenticated on socket ${socket.id}`);
          } else {
            socket.emit('auth_error', { message: 'Invalid token' });
            socket.disconnect();
          }
        } catch (error) {
          logger.error('Authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
        this.updateLastPing(socket.id);
      });

      // Handle notification acknowledgment
      socket.on('notification_ack', async (data) => {
        const { notificationId } = data;
        if (notificationId && socket.data.userId) {
          await this.markNotificationAsDelivered(notificationId, socket.data.userId);
        }
      });

      // Handle notification read
      socket.on('notification_read', async (data) => {
        const { notificationId } = data;
        if (notificationId && socket.data.userId) {
          await this.markNotificationAsRead(notificationId, socket.data.userId);
        }
      });

      // Handle typing indicators (for chat-like features)
      socket.on('typing_start', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('user_typing', {
          userId: socket.data.userId,
          user: socket.data.user,
        });
      });

      socket.on('typing_stop', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('user_stopped_typing', {
          userId: socket.data.userId,
        });
      });

      // Handle presence updates
      socket.on('presence_update', (data) => {
        const { status } = data; // online, away, busy, offline
        if (socket.data.userId) {
          this.updateUserPresence(socket.data.userId, status);
          socket.broadcast.emit('user_presence_changed', {
            userId: socket.data.userId,
            status,
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        logger.info(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
        
        if (socket.data.userId) {
          await this.removeConnection(socket.id, socket.data.userId);
          
          // Update presence to offline if no other connections
          const userSockets = this.userSockets.get(socket.data.userId);
          if (!userSockets || userSockets.size === 0) {
            await this.updateUserPresence(socket.data.userId, 'offline');
            socket.broadcast.emit('user_presence_changed', {
              userId: socket.data.userId,
              status: 'offline',
            });
          }
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`WebSocket error on ${socket.id}:`, error);
      });
    });
  }

  /**
   * Authenticate user using JWT token
   */
  private async authenticateUser(token: string): Promise<any> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        return null;
      }

      return user;
    } catch (error) {
      logger.error('User authentication failed:', error);
      return null;
    }
  }

  /**
   * Track WebSocket connection in database
   */
  private async trackConnection(socket: any): Promise<void> {
    try {
      const connectionData = {
        user_id: socket.data.userId,
        connection_id: socket.id,
        socket_id: socket.id,
        ip_address: socket.handshake.address,
        user_agent: socket.handshake.headers['user-agent'],
        is_active: true,
        metadata: {
          transport: socket.conn.transport.name,
          remoteAddress: socket.handshake.address,
        },
      };

      await this.supabase
        .from('websocket_connections')
        .insert(connectionData);

      // Update in-memory tracking
      if (!this.userSockets.has(socket.data.userId)) {
        this.userSockets.set(socket.data.userId, new Set());
      }
      this.userSockets.get(socket.data.userId)!.add(socket.id);

    } catch (error) {
      logger.error('Failed to track connection:', error);
    }
  }

  /**
   * Remove WebSocket connection tracking
   */
  private async removeConnection(socketId: string, userId: string): Promise<void> {
    try {
      await this.supabase
        .from('websocket_connections')
        .update({
          is_active: false,
          disconnected_at: new Date().toISOString(),
        })
        .eq('connection_id', socketId);

      // Update in-memory tracking
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }

    } catch (error) {
      logger.error('Failed to remove connection tracking:', error);
    }
  }

  /**
   * Update last ping time for connection health monitoring
   */
  private async updateLastPing(socketId: string): Promise<void> {
    try {
      await this.supabase
        .from('websocket_connections')
        .update({ last_ping_at: new Date().toISOString() })
        .eq('connection_id', socketId);
    } catch (error) {
      logger.error('Failed to update last ping:', error);
    }
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(userId: string, data: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.io) {
        return { success: false, error: 'WebSocket server not initialized' };
      }

      const room = `user:${userId}`;
      this.io.to(room).emit('notification', data);

      // Check if user is connected
      const userSockets = this.userSockets.get(userId);
      const isConnected = userSockets && userSockets.size > 0;

      if (!isConnected) {
        // Store notification for later delivery
        await this.storePendingNotification(userId, data);
      }

      return { 
        success: true, 
        messageId: `ws-${userId}-${Date.now()}` 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown WebSocket error';
      logger.error('Failed to send WebSocket notification:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds: string[], data: any): Promise<{
    successCount: number;
    failureCount: number;
    errors?: string[];
  }> {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, data))
    );

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      } else {
        failureCount++;
        const error = result.status === 'fulfilled' 
          ? result.value.error 
          : result.reason?.message || 'Unknown error';
        errors.push(`User ${userIds[index]}: ${error}`);
      }
    });

    return { successCount, failureCount, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Broadcast to all connected users
   */
  async broadcast(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.io) {
        return { success: false, error: 'WebSocket server not initialized' };
      }

      this.io.emit('broadcast', data);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown broadcast error';
      logger.error('Failed to broadcast WebSocket message:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send to users in a specific room
   */
  async sendToRoom(room: string, data: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.io) {
        return { success: false, error: 'WebSocket server not initialized' };
      }

      this.io.to(room).emit('room_message', data);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown room message error';
      logger.error('Failed to send room message:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Store pending notification for offline users
   */
  private async storePendingNotification(userId: string, data: any): Promise<void> {
    try {
      const key = `pending_notifications:${userId}`;
      await this.redis.lpush(key, JSON.stringify(data));
      await this.redis.expire(key, 24 * 60 * 60); // Expire after 24 hours
    } catch (error) {
      logger.error('Failed to store pending notification:', error);
    }
  }

  /**
   * Send pending notifications to newly connected user
   */
  private async sendPendingNotifications(userId: string, socketId: string): Promise<void> {
    try {
      const key = `pending_notifications:${userId}`;
      const notifications = await this.redis.lrange(key, 0, -1);
      
      if (notifications.length === 0) return;

      const socket = this.io?.sockets.sockets.get(socketId);
      if (!socket) return;

      for (const notification of notifications) {
        try {
          const data = JSON.parse(notification);
          socket.emit('notification', data);
        } catch (parseError) {
          logger.error('Failed to parse pending notification:', parseError);
        }
      }

      // Clear pending notifications
      await this.redis.del(key);
      
      logger.info(`Sent ${notifications.length} pending notifications to user ${userId}`);
    } catch (error) {
      logger.error('Failed to send pending notifications:', error);
    }
  }

  /**
   * Mark notification as delivered
   */
  private async markNotificationAsDelivered(notificationId: string, userId: string): Promise<void> {
    try {
      await this.supabase
        .from('notification_delivery_log')
        .update({ delivered_at: new Date().toISOString() })
        .eq('notification_id', notificationId);

      await this.supabase
        .from('notifications')
        .update({ 
          status: 'delivered',
          delivered_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

    } catch (error) {
      logger.error('Failed to mark notification as delivered:', error);
    }
  }

  /**
   * Mark notification as read
   */
  private async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await this.supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Update user presence status
   */
  private async updateUserPresence(userId: string, status: string): Promise<void> {
    try {
      const key = `user_presence:${userId}`;
      await this.redis.setex(key, 300, status); // 5 minutes TTL
    } catch (error) {
      logger.error('Failed to update user presence:', error);
    }
  }

  /**
   * Get user presence status
   */
  async getUserPresence(userId: string): Promise<string | null> {
    try {
      const key = `user_presence:${userId}`;
      return await this.redis.get(key);
    } catch (error) {
      logger.error('Failed to get user presence:', error);
      return null;
    }
  }

  /**
   * Get online users count
   */
  async getOnlineUsersCount(): Promise<number> {
    try {
      if (!this.io) return 0;
      const sockets = await this.io.fetchSockets();
      return sockets.filter(socket => socket.data.userId).length;
    } catch (error) {
      logger.error('Failed to get online users count:', error);
      return 0;
    }
  }

  /**
   * Get user's active connections
   */
  async getUserConnections(userId: string): Promise<WebSocketConnection[]> {
    try {
      const { data, error } = await this.supabase
        .from('websocket_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('connected_at', { ascending: false });

      if (error) {
        logger.error('Failed to get user connections:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get user connections:', error);
      return [];
    }
  }

  /**
   * Disconnect user's sessions
   */
  async disconnectUser(userId: string, reason: string = 'Admin action'): Promise<void> {
    try {
      if (!this.io) return;

      const room = `user:${userId}`;
      const sockets = await this.io.in(room).fetchSockets();
      
      for (const socket of sockets) {
        socket.emit('force_disconnect', { reason });
        socket.disconnect(true);
      }

      // Update database
      await this.supabase
        .from('websocket_connections')
        .update({
          is_active: false,
          disconnected_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      logger.info(`Disconnected all sessions for user ${userId}`);
    } catch (error) {
      logger.error('Failed to disconnect user:', error);
    }
  }

  /**
   * Health check for WebSocket service
   */
  async healthCheck(): Promise<boolean> {
    try {
      return this.io !== null && await this.redis.ping() === 'PONG';
    } catch (error) {
      logger.error('WebSocket health check failed:', error);
      return false;
    }
  }
}

export const websocketService = new WebSocketService();
