import twilio from 'twilio';
import { defaultLogger as logger } from '@/lib/logger';
import { SendSMSRequest, SMSProvider } from '@/types/notifications';

export class SMSService implements SMSProvider {
  name = 'twilio';
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';

    if (!accountSid || !authToken) {
      logger.warn('Twilio credentials not configured');
      // Create a mock client for development
      this.client = {} as twilio.Twilio;
    } else {
      this.client = twilio(accountSid, authToken);
    }
  }

  async send(request: SendSMSRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.client.messages) {
        // Mock response for development
        logger.info('SMS service not configured, returning mock success');
        return { 
          success: true, 
          messageId: 'mock-' + Date.now(),
        };
      }

      const message = await this.client.messages.create({
        body: request.message,
        from: request.from || this.fromNumber,
        to: request.to,
      });

      logger.info(`SMS sent successfully: ${message.sid}`);
      return { 
        success: true, 
        messageId: message.sid 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown SMS error';
      logger.error('Failed to send SMS:', error);
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      if (!this.client.api) {
        return false;
      }

      // Test the connection by fetching account info
      await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID || '').fetch();
      return true;
    } catch (error) {
      logger.error('SMS service verification failed:', error);
      return false;
    }
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phone: string, countryCode: string = '+1'): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present
    if (!phone.startsWith('+')) {
      return countryCode + cleaned;
    }
    
    return phone;
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      if (!this.client.messages) {
        return { status: 'unknown' };
      }

      const message = await this.client.messages(messageId).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
      };
    } catch (error) {
      logger.error(`Failed to get SMS delivery status for ${messageId}:`, error);
      return { status: 'unknown' };
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulk(requests: SendSMSRequest[]): Promise<Array<{
    success: boolean;
    messageId?: string;
    error?: string;
    recipient: string;
  }>> {
    const results = await Promise.allSettled(
      requests.map(async (request) => {
        const result = await this.send(request);
        return {
          ...result,
          recipient: request.to,
        };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
          recipient: requests[index].to,
        };
      }
    });
  }

  /**
   * Check if SMS is available for a country
   */
  async isCountrySupported(countryCode: string): Promise<boolean> {
    try {
      if (!this.client.pricing) {
        return false;
      }

      const pricing = await this.client.pricing.v1
        .messaging
        .countries(countryCode)
        .fetch();

      return pricing.outboundSmsPrices.length > 0;
    } catch (error) {
      logger.error(`Failed to check country support for ${countryCode}:`, error);
      return false;
    }
  }

  /**
   * Get SMS pricing for a country
   */
  async getPricing(countryCode: string): Promise<{
    currency: string;
    basePrice: string;
  } | null> {
    try {
      if (!this.client.pricing) {
        return null;
      }

      const pricing = await this.client.pricing.v1
        .messaging
        .countries(countryCode)
        .fetch();

      if (pricing.outboundSmsPrices.length === 0) {
        return null;
      }

      return {
        currency: (pricing as any).currency,
        basePrice: (pricing as any).outboundSmsPrices?.[0]?.basePrice,
      } as any;
    } catch (error) {
      logger.error(`Failed to get pricing for ${countryCode}:`, error);
      return null;
    }
  }
}

export const smsService = new SMSService();
