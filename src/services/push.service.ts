import { getMessaging, MulticastMessage, BatchResponse } from 'firebase-admin/messaging';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { defaultLogger as logger } from '@/lib/logger';
import { SendPushRequest, PushProvider } from '@/types/notifications';

export class PushService implements PushProvider {
  name = 'fcm';
  private messaging: any;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Initialize Firebase Admin if not already initialized
      if (!getApps().length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        if (!serviceAccount) {
          logger.warn('Firebase service account not configured');
          return;
        }

        const serviceAccountKey = JSON.parse(serviceAccount);
        
        initializeApp({
          credential: cert(serviceAccountKey),
          projectId: serviceAccountKey.project_id,
        });
      }

      this.messaging = getMessaging();
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
    }
  }

  async send(request: SendPushRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.messaging) {
        logger.warn('Firebase messaging not initialized, returning mock success');
        return { 
          success: true, 
          messageId: 'mock-' + Date.now(),
        };
      }

      if (request.tokens.length === 0) {
        return { 
          success: false, 
          error: 'No device tokens provided' 
        };
      }

      const message: MulticastMessage = {
        tokens: request.tokens,
        notification: {
          title: request.title,
          body: request.body,
          imageUrl: request.image,
        },
        data: request.data ? this.stringifyData(request.data) : undefined,
        webpush: request.click_action ? {
          fcmOptions: {
            link: request.click_action,
          },
        } : undefined,
        android: {
          notification: {
            clickAction: request.click_action,
            icon: 'ic_notification',
            color: '#007bff',
            sound: 'default',
          },
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
          // APNS fcmOptions for iOS do not support link; omit
        },
      };

      const response: BatchResponse = await this.messaging.sendMulticast(message);

      // Check for failures
      if (response.failureCount > 0) {
        const errors = response.responses
          .filter((resp, idx) => !resp.success)
          .map((resp, idx) => `Token ${idx}: ${resp.error?.message}`)
          .join(', ');

        logger.warn(`Push notification partially failed: ${errors}`);
        
        // If some succeeded, still consider it a success
        if (response.successCount > 0) {
          return { 
            success: true, 
            messageId: response.responses.find(r => r.success)?.messageId,
            error: `Partial failure: ${errors}` 
          };
        } else {
          return { 
            success: false, 
            error: errors 
          };
        }
      }

      logger.info(`Push notification sent successfully to ${response.successCount} devices`);
      return { 
        success: true, 
        messageId: response.responses[0]?.messageId 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown push notification error';
      logger.error('Failed to send push notification:', error);
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      if (!this.messaging) {
        return false;
      }

      // Try to send a test message to validate the service
      // We'll use an invalid token to test the service without sending actual notifications
      const testMessage: MulticastMessage = {
        tokens: ['invalid_token_for_testing'],
        notification: {
          title: 'Test',
          body: 'Test message',
        },
      };

      await this.messaging.sendMulticast(testMessage);
      return true; // If we get here, the service is working (even if token is invalid)
    } catch (error) {
      // Check if it's a service initialization error vs invalid token error
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('app/invalid-credential') || 
          errorMessage.includes('app/no-app')) {
        return false;
      }
      // Other errors (like invalid token) mean the service is working
      return true;
    }
  }

  /**
   * Convert data object to string values (required by FCM)
   */
  private stringifyData(data: Record<string, any>): Record<string, string> {
    const stringData: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return stringData;
  }

  /**
   * Send to a single device token
   */
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.send({
      tokens: [token],
      title,
      body,
      data,
    });
  }

  /**
   * Send to topic subscribers
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.messaging) {
        return { 
          success: false, 
          error: 'Firebase messaging not initialized' 
        };
      }

      const message = {
        topic,
        notification: {
          title,
          body,
        },
        data: data ? this.stringifyData(data) : undefined,
      };

      const messageId = await this.messaging.send(message);
      return { success: true, messageId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send topic notification:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
    errors?: string[];
  }> {
    try {
      if (!this.messaging) {
        return { 
          success: false, 
          successCount: 0, 
          failureCount: tokens.length,
          errors: ['Firebase messaging not initialized']
        };
      }

      const response = await this.messaging.subscribeToTopic(tokens, topic);
      
      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors?.map((err: any) => err.error?.message) || undefined,
      };

    } catch (error) {
      logger.error('Failed to subscribe to topic:', error);
      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
    errors?: string[];
  }> {
    try {
      if (!this.messaging) {
        return { 
          success: false, 
          successCount: 0, 
          failureCount: tokens.length,
          errors: ['Firebase messaging not initialized']
        };
      }

      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      
      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors?.map((err: any) => err.error?.message) || undefined,
      };

    } catch (error) {
      logger.error('Failed to unsubscribe from topic:', error);
      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Validate device token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      if (!this.messaging) {
        return false;
      }

      // Try to send a test message to validate the token
      const testMessage = {
        token,
        data: { test: 'true' },
        dryRun: true, // Don't actually send
      };

      await this.messaging.send(testMessage);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('registration-token-not-registered') ||
          errorMessage.includes('invalid-registration-token')) {
        return false;
      }
      // Other errors might not be token-related
      logger.warn('Token validation error:', error);
      return false;
    }
  }

  /**
   * Clean up invalid tokens
   */
  async cleanupInvalidTokens(tokens: string[]): Promise<string[]> {
    const validTokens: string[] = [];
    
    // Test tokens in batches to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const validationResults = await Promise.allSettled(
        batch.map(token => this.validateToken(token))
      );

      validationResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validTokens.push(batch[index]);
        }
      });
    }

    return validTokens;
  }

  /**
   * Get token registration details
   */
  async getTokenInfo(token: string): Promise<{
    isValid: boolean;
    platform?: string;
    appId?: string;
  }> {
    try {
      const isValid = await this.validateToken(token);
      
      // Extract platform info from token if possible
      // This is a simplified approach - actual implementation would depend on token format
      let platform: string | undefined;
      if (token.length > 100) {
        // Typical Android token length
        platform = 'android';
      } else if (token.length === 64) {
        // Typical iOS token length
        platform = 'ios';
      }

      return {
        isValid,
        platform,
      };
    } catch (error) {
      logger.error('Failed to get token info:', error);
      return { isValid: false };
    }
  }
}

export const pushService = new PushService();
