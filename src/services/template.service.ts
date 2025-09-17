import { createClient } from '@supabase/supabase-js';
import Handlebars from 'handlebars';
import { defaultLogger as logger } from '@/lib/logger';
import { 
  NotificationTemplate, 
  NotificationType, 
  NotificationChannel,
  TemplateContext 
} from '@/types/notifications';

export class TemplateService {
  private supabase;
  private templateCache: Map<string, NotificationTemplate> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.initializeHandlebarsHelpers();
  }

  /**
   * Initialize Handlebars helpers for template rendering
   */
  private initializeHandlebarsHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', function(date: string, format: string = 'MMM DD, YYYY') {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: format.includes('HH') ? 'numeric' : undefined,
        minute: format.includes('mm') ? 'numeric' : undefined,
      });
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', function(amount: number, currency: string = 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount);
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', function(str: string) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(this: unknown, arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // URL helper
    Handlebars.registerHelper('url', function(path: string, context: TemplateContext) {
      return `${context.app_url}${path}`;
    });

    // Unsubscribe link helper
    Handlebars.registerHelper('unsubscribeUrl', function(context: TemplateContext) {
      return context.unsubscribe_url || `${context.app_url}/unsubscribe`;
    });

    // Localization helper (simplified)
    Handlebars.registerHelper('t', function(key: string, context: TemplateContext, options: any) {
      // This would integrate with your i18n system
      // For now, return the key or default value
      return options?.default || key;
    });

    // Array length helper
    Handlebars.registerHelper('length', function(array: any[]) {
      return array ? array.length : 0;
    });

    // Each with index helper
    Handlebars.registerHelper('eachWithIndex', function(array: any[], options: any) {
      let result = '';
      if (array && array.length > 0) {
        for (let i = 0; i < array.length; i++) {
          result += options.fn({ ...array[i], index: i });
        }
      }
      return result;
    });
  }

  /**
   * Get template by ID with caching
   */
  async getTemplate(templateId: string, locale: string = 'en'): Promise<NotificationTemplate | null> {
    const cacheKey = `${templateId}:${locale}`;
    
    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      const cached = this.templateCache.get(cacheKey)!;
      // Simple cache invalidation based on time
      if (Date.now() - new Date(cached.updated_at).getTime() < this.cacheTimeout) {
        return cached;
      }
      this.templateCache.delete(cacheKey);
    }

    try {
      const { data: template, error } = await this.supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .eq('locale', locale)
        .eq('is_active', true)
        .single();

      if (error) {
        // Try fallback to default locale
        if (locale !== 'en') {
          return await this.getTemplate(templateId, 'en');
        }
        logger.error(`Template ${templateId} not found:`, error);
        return null;
      }

      // Cache the template
      this.templateCache.set(cacheKey, template);
      return template;

    } catch (error) {
      logger.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Get template by name and type
   */
  async getTemplateByName(
    name: string,
    type: NotificationType,
    channel: NotificationChannel,
    locale: string = 'en'
  ): Promise<NotificationTemplate | null> {
    try {
      const { data: template, error } = await this.supabase
        .from('notification_templates')
        .select('*')
        .eq('name', name)
        .eq('type', type)
        .eq('channel', channel)
        .eq('locale', locale)
        .eq('is_active', true)
        .single();

      if (error) {
        // Try fallback to default locale
        if (locale !== 'en') {
          return await this.getTemplateByName(name, type, channel, 'en');
        }
        logger.error(`Template ${name} not found:`, error);
        return null;
      }

      return template;

    } catch (error) {
      logger.error('Error fetching template by name:', error);
      return null;
    }
  }

  /**
   * Render template with context
   */
  async render(templateContent: string, context: TemplateContext): Promise<string> {
    try {
      const template = Handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      logger.error('Error rendering template:', error);
      throw new Error(`Template rendering failed: ${error}`);
    }
  }

  /**
   * Render all template parts for a notification
   */
  async renderTemplate(
    template: NotificationTemplate,
    context: TemplateContext
  ): Promise<{
    subject?: string;
    title: string;
    message?: string;
    html?: string;
  }> {
    try {
      const rendered: any = {};

      if (template.subject_template) {
        rendered.subject = await this.render(template.subject_template, context);
      }

      rendered.title = await this.render(template.title_template, context);

      if (template.message_template) {
        rendered.message = await this.render(template.message_template, context);
      }

      if (template.html_template) {
        rendered.html = await this.render(template.html_template, context);
      }

      return rendered;

    } catch (error) {
      logger.error('Error rendering notification template:', error);
      throw error;
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    try {
      const { data: template, error } = await this.supabase
        .from('notification_templates')
        .insert({
          name: templateData.name,
          type: templateData.type,
          channel: templateData.channel,
          locale: templateData.locale || 'en',
          subject_template: templateData.subject_template,
          title_template: templateData.title_template,
          message_template: templateData.message_template,
          html_template: templateData.html_template,
          variables: templateData.variables || {},
          metadata: templateData.metadata || {},
          is_active: templateData.is_active !== false,
          version: 1,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating template:', error);
        throw error;
      }

      return template;

    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> {
    try {
      // Increment version
      const { data: currentTemplate } = await this.supabase
        .from('notification_templates')
        .select('version')
        .eq('id', templateId)
        .single();

      const newVersion = (currentTemplate?.version || 0) + 1;

      const { data: template, error } = await this.supabase
        .from('notification_templates')
        .update({
          ...updates,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating template:', error);
        throw error;
      }

      // Clear cache for this template
      this.clearTemplateCache(templateId);

      return template;

    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        logger.error('Error deleting template:', error);
        throw error;
      }

      // Clear cache for this template
      this.clearTemplateCache(templateId);

    } catch (error) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * List templates with filtering
   */
  async listTemplates(filters: {
    type?: NotificationType;
    channel?: NotificationChannel;
    locale?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<NotificationTemplate[]> {
    try {
      let query = this.supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.type) query = query.eq('type', filters.type);
      if (filters.channel) query = query.eq('channel', filters.channel);
      if (filters.locale) query = query.eq('locale', filters.locale);
      if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
      if (filters.limit) query = query.limit(filters.limit);
      if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);

      const { data: templates, error } = await query;

      if (error) {
        logger.error('Error listing templates:', error);
        throw error;
      }

      return templates || [];

    } catch (error) {
      logger.error('Error listing templates:', error);
      throw error;
    }
  }

  /**
   * Validate template syntax
   */
  async validateTemplate(templateContent: string): Promise<{
    isValid: boolean;
    errors?: string[];
  }> {
    try {
      // Test compilation
      Handlebars.compile(templateContent);
      
      // Test rendering with minimal context
      const testContext: TemplateContext = {
        user: { id: 'test', email: 'test@example.com' },
        data: {},
        app_url: 'https://example.com',
        locale: 'en',
      };

      await this.render(templateContent, testContext);
      
      return { isValid: true };

    } catch (error) {
      logger.error('Template validation failed:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      };
    }
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    templateContent: string,
    sampleData: Record<string, any> = {}
  ): Promise<string> {
    try {
      const sampleContext: TemplateContext = {
        user: {
          id: 'sample-user-id',
          name: 'John Doe',
          email: 'john.doe@example.com',
        },
        data: {
          product_name: 'Sample Product',
          order_id: 'ORD-12345',
          amount: 99.99,
          currency: 'USD',
          ...sampleData,
        },
        app_url: process.env.NEXT_PUBLIC_APP_URL || 'https://example.com',
        unsubscribe_url: 'https://example.com/unsubscribe?token=sample',
        locale: 'en',
      };

      return await this.render(templateContent, sampleContext);

    } catch (error) {
      logger.error('Template preview failed:', error);
      throw error;
    }
  }

  /**
   * Clone template to different locale
   */
  async cloneTemplate(
    sourceTemplateId: string,
    targetLocale: string,
    updates: Partial<NotificationTemplate> = {}
  ): Promise<NotificationTemplate> {
    try {
      const sourceTemplate = await this.getTemplate(sourceTemplateId);
      if (!sourceTemplate) {
        throw new Error('Source template not found');
      }

      const clonedTemplate = await this.createTemplate({
        ...sourceTemplate,
        id: undefined, // Let database generate new ID
        locale: targetLocale,
        created_at: undefined,
        updated_at: undefined,
        version: 1,
        ...updates,
      });

      return clonedTemplate;

    } catch (error) {
      logger.error('Error cloning template:', error);
      throw error;
    }
  }

  /**
   * Clear template cache
   */
  private clearTemplateCache(templateId: string): void {
    // Clear all cached entries for this template (across all locales)
    for (const key of this.templateCache.keys()) {
      if (key.startsWith(`${templateId}:`)) {
        this.templateCache.delete(key);
      }
    }
  }

  /**
   * Clear all template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Get template variables for documentation
   */
  getTemplateVariables(type: NotificationType): Record<string, string> {
    const commonVariables = {
      'user.name': 'User\'s display name',
      'user.email': 'User\'s email address',
      'user.id': 'User\'s unique identifier',
      'app_url': 'Application base URL',
      'unsubscribe_url': 'Unsubscribe link',
    };

    const typeSpecificVariables: Record<NotificationType, Record<string, string>> = {
      order_confirmation: {
        'data.order_id': 'Order ID',
        'data.total_amount': 'Order total amount',
        'data.currency': 'Currency code',
        'data.items': 'Array of order items',
      },
      payment_received: {
        'data.payment_id': 'Payment ID',
        'data.amount': 'Payment amount',
        'data.currency': 'Currency code',
        'data.method': 'Payment method',
      },
      product_purchased: {
        'data.product_name': 'Product name',
        'data.product_id': 'Product ID',
        'data.download_url': 'Download link',
        'data.price': 'Product price',
      },
      // Add more type-specific variables as needed
    } as any;

    return {
      ...commonVariables,
      ...(typeSpecificVariables[type] || {}),
    };
  }

  /**
   * Bulk import templates from JSON
   */
  async importTemplates(templates: Partial<NotificationTemplate>[]): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const templateData of templates) {
      try {
        await this.createTemplate(templateData);
        imported++;
      } catch (error) {
        failed++;
        errors.push(
          `Template ${templateData.name}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return { imported, failed, errors };
  }

  /**
   * Export templates to JSON
   */
  async exportTemplates(filters: {
    type?: NotificationType;
    channel?: NotificationChannel;
    locale?: string;
  } = {}): Promise<NotificationTemplate[]> {
    return await this.listTemplates(filters);
  }
}

export const templateService = new TemplateService();
