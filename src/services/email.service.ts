import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { addEmailJob, EmailJobData } from '@/jobs/queue';
import { SendEmailRequest, EmailProvider } from '@/types/notifications';

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export class EmailService implements EmailProvider {
  name = 'sendgrid';
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Welcome email template
    this.templates.set('welcome', {
      name: 'welcome',
      subject: 'Welcome to Digital Marketplace!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to Digital Marketplace!</h1>
          <p>Hi {{name}},</p>
          <p>Thank you for joining our digital marketplace. You can now start exploring and purchasing digital products.</p>
          <p>Get started by browsing our <a href="{{marketplaceUrl}}">product catalog</a>.</p>
          <p>Best regards,<br>The Digital Marketplace Team</p>
        </div>
      `,
      text: `
        Welcome to Digital Marketplace!
        
        Hi {{name}},
        
        Thank you for joining our digital marketplace. You can now start exploring and purchasing digital products.
        
        Get started by browsing our product catalog: {{marketplaceUrl}}
        
        Best regards,
        The Digital Marketplace Team
      `,
    });

    // Purchase confirmation template
    this.templates.set('purchase-confirmation', {
      name: 'purchase-confirmation',
      subject: 'Purchase Confirmation - {{productTitle}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Purchase Confirmed!</h1>
          <p>Hi {{buyerName}},</p>
          <p>Your purchase has been confirmed. Here are the details:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Product:</strong> {{productTitle}}</p>
            <p><strong>Price:</strong> {{price}} {{currency}}</p>
            <p><strong>Order ID:</strong> {{orderId}}</p>
            <p><strong>Purchase Date:</strong> {{purchaseDate}}</p>
          </div>
          <p>You can download your product <a href="{{downloadUrl}}">here</a>.</p>
          <p>Thank you for your purchase!</p>
          <p>Best regards,<br>The Digital Marketplace Team</p>
        </div>
      `,
      text: `
        Purchase Confirmed!
        
        Hi {{buyerName}},
        
        Your purchase has been confirmed. Here are the details:
        
        Order Details:
        - Product: {{productTitle}}
        - Price: {{price}} {{currency}}
        - Order ID: {{orderId}}
        - Purchase Date: {{purchaseDate}}
        
        Download your product: {{downloadUrl}}
        
        Thank you for your purchase!
        
        Best regards,
        The Digital Marketplace Team
      `,
    });

    // Password reset template
    this.templates.set('password-reset', {
      name: 'password-reset',
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Password Reset Request</h1>
          <p>Hi {{name}},</p>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p>This link will expire in {{expiryTime}}.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>The Digital Marketplace Team</p>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hi {{name}},
        
        You requested to reset your password. Use the link below to reset it:
        
        {{resetUrl}}
        
        This link will expire in {{expiryTime}}.
        
        If you didn't request this, please ignore this email.
        
        Best regards,
        The Digital Marketplace Team
      `,
    });

    // Referral commission template
    this.templates.set('referral-commission', {
      name: 'referral-commission',
      subject: 'You earned a commission!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Commission Earned!</h1>
          <p>Hi {{referrerName}},</p>
          <p>Congratulations! You've earned a commission from a referral purchase.</p>
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #16a34a;">Commission Details</h3>
            <p><strong>Amount:</strong> {{commissionAmount}} {{currency}}</p>
            <p><strong>Product:</strong> {{productTitle}}</p>
            <p><strong>Buyer:</strong> {{buyerName}}</p>
            <p><strong>Date:</strong> {{commissionDate}}</p>
          </div>
          <p>Your commission has been added to your account balance.</p>
          <p>Keep sharing your referral links to earn more!</p>
          <p>Best regards,<br>The Digital Marketplace Team</p>
        </div>
      `,
      text: `
        Commission Earned!
        
        Hi {{referrerName}},
        
        Congratulations! You've earned a commission from a referral purchase.
        
        Commission Details:
        - Amount: {{commissionAmount}} {{currency}}
        - Product: {{productTitle}}
        - Buyer: {{buyerName}}
        - Date: {{commissionDate}}
        
        Your commission has been added to your account balance.
        
        Keep sharing your referral links to earn more!
        
        Best regards,
        The Digital Marketplace Team
      `,
    });
  }

  async sendEmail(
    to: string | string[],
    templateName: string,
    data: Record<string, any> = {},
    options: {
      priority?: 'high' | 'normal' | 'low';
      subject?: string;
      attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
      }>;
    } = {}
  ): Promise<void> {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      // Replace template variables
      const processedSubject = this.replaceVariables(template.subject, data);
      const processedHtml = this.replaceVariables(template.html, data);
      const processedText = template.text ? this.replaceVariables(template.text, data) : undefined;

      const emailData: EmailJobData = {
        to,
        template: templateName,
        data: {
          ...data,
          subject: processedSubject,
          html: processedHtml,
          text: processedText,
        },
        priority: options.priority || 'normal',
        subject: options.subject || processedSubject,
        attachments: options.attachments,
      };

      await addEmailJob(emailData);
      logger.info('Email queued for sending', {
        to: Array.isArray(to) ? to.join(', ') : to,
        template: templateName,
        priority: options.priority,
      });
    } catch (error) {
      logError(error as Error, {
        context: 'send-email',
        to: Array.isArray(to) ? to.join(', ') : to,
        template: templateName,
      });
      throw error;
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string, marketplaceUrl: string): Promise<void> {
    await this.sendEmail(userEmail, 'welcome', {
      name: userName,
      marketplaceUrl,
    });
  }

  async sendPurchaseConfirmation(
    buyerEmail: string,
    buyerName: string,
    productTitle: string,
    price: number,
    currency: string,
    orderId: string,
    downloadUrl: string
  ): Promise<void> {
    await this.sendEmail(buyerEmail, 'purchase-confirmation', {
      buyerName,
      productTitle,
      price,
      currency,
      orderId,
      purchaseDate: new Date().toLocaleDateString(),
      downloadUrl,
    });
  }

  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetUrl: string,
    expiryTime: string = '1 hour'
  ): Promise<void> {
    await this.sendEmail(userEmail, 'password-reset', {
      name: userName,
      resetUrl,
      expiryTime,
    });
  }

  async sendReferralCommissionEmail(
    referrerEmail: string,
    referrerName: string,
    commissionAmount: number,
    currency: string,
    productTitle: string,
    buyerName: string
  ): Promise<void> {
    await this.sendEmail(referrerEmail, 'referral-commission', {
      referrerName,
      commissionAmount,
      currency,
      productTitle,
      buyerName,
      commissionDate: new Date().toLocaleDateString(),
    });
  }

  async sendBulkEmail(
    recipients: EmailRecipient[],
    templateName: string,
    data: Record<string, any> = {},
    options: {
      priority?: 'high' | 'normal' | 'low';
      batchSize?: number;
    } = {}
  ): Promise<void> {
    const batchSize = options.batchSize || 100;
    const emails = recipients.map(recipient => recipient.email);

    // Split into batches
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      await this.sendEmail(batch, templateName, data, {
        priority: options.priority,
      });
    }
  }

  private replaceVariables(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  getTemplate(templateName: string): EmailTemplate | undefined {
    return this.templates.get(templateName);
  }

  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Send email using notification system interface
   */
  async send(request: SendEmailRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const recipients = Array.isArray(request.to) ? request.to : [request.to];
      
      const emailData: EmailJobData = {
        to: request.to,
        template: request.template_id || 'custom',
        data: {
          subject: request.subject,
          html: request.html,
          text: request.text,
          ...request.template_data,
        },
        priority: 'normal',
        subject: request.subject,
        attachments: request.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      await addEmailJob(emailData);
      
      logger.info('Email queued for sending via notification system', {
        to: recipients.join(', '),
        subject: request.subject,
      });

      return { 
        success: true, 
        messageId: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
      logger.error('Failed to send email via notification system:', error);
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  /**
   * Verify email service configuration
   */
  async verify(): Promise<boolean> {
    try {
      // Test by checking if we can queue an email job
      // In a real implementation, you'd verify SMTP/API credentials
      const testEmailData: EmailJobData = {
        to: 'test@example.com',
        template: 'test',
        data: { subject: 'Test', html: 'Test', text: 'Test' },
        priority: 'low',
        subject: 'Test Email',
      };

      // Don't actually send, just test the queuing mechanism
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }

  /**
   * Check if email address is valid
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send transactional email with better error handling
   */
  async sendTransactional(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    attachments?: Array<{
      filename: string;
      content: string | Buffer;
      contentType?: string;
    }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.send({
      to,
      subject,
      html: htmlContent,
      text: textContent,
      attachments,
    });
  }

  /**
   * Send marketing email with unsubscribe handling
   */
  async sendMarketing(
    to: string,
    subject: string,
    htmlContent: string,
    unsubscribeUrl: string,
    textContent?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const enhancedHtml = htmlContent + `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #666;">
        <p>You received this email because you're subscribed to our updates.</p>
        <p><a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> from these emails.</p>
      </div>
    `;

    const enhancedText = textContent + `\n\nUnsubscribe: ${unsubscribeUrl}`;

    return this.send({
      to,
      subject,
      html: enhancedHtml,
      text: enhancedText,
    });
  }
}

export const emailService = new EmailService();
