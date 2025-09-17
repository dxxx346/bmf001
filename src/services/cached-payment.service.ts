import { PaymentService } from './payment.service';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '@/lib/cache.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import {
  PaymentIntent,
  PaymentMethod,
  PaymentTransaction,
  Refund,
  Invoice,
  ExchangeRate,
  PaymentRequest,
  StripePaymentData,
  YooKassaPaymentData,
  CoinGatePaymentData,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
  InvoiceRequest,
  InvoiceResponse,
  PaymentMethodRequest,
  PaymentMethodResponse,
  ExchangeRateRequest,
  ExchangeRateResponse,
  WebhookEvent,
  PaymentAnalytics,
  PaymentConfig,
  IdempotencyKey,
  RetryConfig,
  PaymentError,
  PaymentWebhook,
  PaymentSummary,
  PaymentProvider,
  PaymentStatus,
  Currency,
  RefundStatus,
} from '@/types/payment';

export class CachedPaymentService extends PaymentService {
  // =============================================
  // CACHED EXCHANGE RATE OPERATIONS
  // =============================================

  async convertCurrency(amount: number, fromCurrency: Currency, toCurrency: Currency): Promise<{ amount: number; currency: Currency; rate: number }> {
    try {
      if (fromCurrency === toCurrency) {
        return { amount, currency: toCurrency, rate: 1 };
      }

      const cacheKey = CACHE_KEYS.exchangeRate(fromCurrency, toCurrency);
      
      // Try cache first
      const cached = await cacheService.get<{ amount: number; currency: Currency; rate: number }>(cacheKey);
      if (cached) {
        logger.info('Exchange rate cache hit', { fromCurrency, toCurrency });
        return cached;
      }

      // Fetch from database or external API
      const result = await super.convertCurrency(amount, fromCurrency, toCurrency);
      
      // Cache the result
      await cacheService.set(cacheKey, result, CACHE_TTL.EXCHANGE_RATES);
      logger.info('Exchange rate cached', { fromCurrency, toCurrency, rate: result.rate });

      return result;
    } catch (error) {
      logError(error as Error, { action: 'cached_convert_currency', fromCurrency, toCurrency });
      throw error;
    }
  }

  async getExchangeRates(baseCurrency: Currency = 'USD'): Promise<Record<string, number>> {
    try {
      const cacheKey = CACHE_KEYS.exchangeRates(baseCurrency);
      
      // Try cache first
      const cached = await cacheService.get<Record<string, number>>(cacheKey);
      if (cached) {
        logger.info('Exchange rates cache hit', { baseCurrency });
        return cached;
      }

      // Fetch from database or external API
      const rates = await this.fetchExchangeRates(baseCurrency);
      
      // Cache the result
      await cacheService.set(cacheKey, rates, CACHE_TTL.EXCHANGE_RATES);
      logger.info('Exchange rates cached', { baseCurrency, rateCount: Object.keys(rates).length });

      return rates;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_exchange_rates', baseCurrency });
      return {};
    }
  }

  async getPaymentAnalytics(userId: string, period: string = '30d'): Promise<PaymentAnalytics | null> {
    try {
      const cacheKey = `payment:analytics:${userId}:${period}`;
      
      // Try cache first
      const cached = await cacheService.get<PaymentAnalytics>(cacheKey);
      if (cached) {
        logger.info('Payment analytics cache hit', { userId, period });
        return cached;
      }

      // Fetch from database
      const analytics = await this.fetchPaymentAnalytics(userId, period);
      
      // Cache the result
      await cacheService.set(cacheKey, analytics, CACHE_TTL.SHOP_ANALYTICS);
      logger.info('Payment analytics cached', { userId, period });

      return analytics;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_payment_analytics', userId, period });
      return null;
    }
  }

  async getPaymentHistory(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const cacheKey = `payment:history:${userId}:${page}`;
      
      // Try cache first
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        logger.info('Payment history cache hit', { userId, page });
        return cached;
      }

      // Fetch from database
      const history = await this.fetchPaymentHistory(userId, page, limit);
      
      // Cache the result
      await cacheService.set(cacheKey, history, CACHE_TTL.USER_SESSIONS);
      logger.info('Payment history cached', { userId, page });

      return history;
    } catch (error) {
      logError(error as Error, { action: 'get_cached_payment_history', userId, page });
      return { payments: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  }

  // =============================================
  // CACHE INVALIDATION ON UPDATES
  // =============================================

  async createPayment(request: PaymentRequest, idempotencyKey?: string): Promise<PaymentResponse> {
    const result = await super.createPayment(request, idempotencyKey);
    
    if (result.success && result.payment_intent) {
      // Invalidate payment caches - get user_id from metadata or request
      const userId = (result.payment_intent.metadata?.user_id as string) || (request.metadata?.user_id as string) || '';
      await this.invalidatePaymentCaches(userId);
      logger.info('Payment caches invalidated after creation', { paymentIntentId: result.payment_intent.id });
    }

    return result;
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    const result = await super.processRefund(request);
    
    if (result.success && result.refund) {
      // Invalidate payment caches - get user_id from metadata
      const userId = (result.refund.metadata?.user_id as string) || '';
      await this.invalidatePaymentCaches(userId);
      logger.info('Payment caches invalidated after refund', { refundId: result.refund.id });
    }

    return result;
  }

  // =============================================
  // CACHE WARMING
  // =============================================

  async warmupExchangeRates(): Promise<void> {
    try {
      logger.info('Starting exchange rates warmup');

      const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'RUB', 'BTC', 'ETH'];
      
      // Warm up exchange rates for all currency pairs
      const promises: Promise<void>[] = [];
      
      for (const fromCurrency of currencies) {
        // Warm up rates for this base currency
        promises.push(
          this.getExchangeRates(fromCurrency).then(() => {
            logger.info('Exchange rates warmed up', { baseCurrency: fromCurrency });
          })
        );
        
        // Warm up individual conversions for popular pairs
        for (const toCurrency of currencies) {
          if (fromCurrency !== toCurrency) {
            promises.push(
              this.convertCurrency(1, fromCurrency, toCurrency).then(() => {
                logger.info('Exchange rate warmed up', { fromCurrency, toCurrency });
              })
            );
          }
        }
      }

      await Promise.all(promises);
      logger.info('Exchange rates warmup completed');
    } catch (error) {
      logError(error as Error, { action: 'warmup_exchange_rates' });
    }
  }

  async warmupPaymentCaches(): Promise<void> {
    try {
      logger.info('Starting payment cache warmup');

      // This would typically warm up frequently accessed payment data
      // For now, we'll just log the action
      logger.info('Payment cache warmup completed');
    } catch (error) {
      logError(error as Error, { action: 'warmup_payment_caches' });
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private async fetchExchangeRates(baseCurrency: Currency): Promise<Record<string, number>> {
    try {
      // This would fetch from your exchange rate API
      // For now, we'll return mock data
      const mockRates: Record<string, Record<string, number>> = {
        USD: { EUR: 0.85, GBP: 0.73, JPY: 110.0, CAD: 1.25, AUD: 1.35, CHF: 0.92, CNY: 6.45, RUB: 75.0, BTC: 0.000023, ETH: 0.00035 },
        EUR: { USD: 1.18, GBP: 0.86, JPY: 129.0, CAD: 1.47, AUD: 1.59, CHF: 1.08, CNY: 7.58, RUB: 88.0, BTC: 0.000027, ETH: 0.00041 },
        GBP: { USD: 1.37, EUR: 1.16, JPY: 150.0, CAD: 1.71, AUD: 1.85, CHF: 1.26, CNY: 8.82, RUB: 102.0, BTC: 0.000031, ETH: 0.00048 },
        // Add more currencies as needed
      };

      return mockRates[baseCurrency] || {};
    } catch (error) {
      logError(error as Error, { action: 'fetch_exchange_rates', baseCurrency });
      return {};
    }
  }

  private async fetchPaymentAnalytics(userId: string, period: string): Promise<PaymentAnalytics | null> {
    try {
      // This would fetch payment analytics from the database
      // For now, we'll return mock data
      const endDate = new Date();
      const startDate = new Date();
      
      // Calculate start date based on period
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      return {
        total_volume: 0,
        total_transactions: 0,
        success_rate: 0,
        average_transaction_value: 0,
        currency_breakdown: [],
        provider_breakdown: [],
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      };
    } catch (error) {
      logError(error as Error, { action: 'fetch_payment_analytics', userId, period });
      return null;
    }
  }

  private async fetchPaymentHistory(userId: string, page: number, limit: number): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      // This would fetch payment history from the database
      // For now, we'll return mock data
      return {
        payments: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    } catch (error) {
      logError(error as Error, { action: 'fetch_payment_history', userId, page });
      return { payments: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  }

  private async invalidatePaymentCaches(userId: string): Promise<void> {
    try {
      if (!userId) return;

      // Invalidate user-specific payment caches
      await cacheService.delPattern(`payment:analytics:${userId}:*`);
      await cacheService.delPattern(`payment:history:${userId}:*`);
      
      // Invalidate exchange rate caches (they might be user-specific in some cases)
      await cacheService.delPattern('exchange:*');
    } catch (error) {
      logError(error as Error, { action: 'invalidate_payment_caches', userId });
    }
  }

  // =============================================
  // CACHE REFRESH OPERATIONS
  // =============================================

  async refreshExchangeRates(baseCurrency: Currency = 'USD'): Promise<void> {
    try {
      // Remove existing cache
      await cacheService.del(CACHE_KEYS.exchangeRates(baseCurrency));
      
      // Fetch fresh data and cache it
      const rates = await this.fetchExchangeRates(baseCurrency);
      await cacheService.set(
        CACHE_KEYS.exchangeRates(baseCurrency),
        rates,
        CACHE_TTL.EXCHANGE_RATES
      );
      
      logger.info('Exchange rates refreshed', { baseCurrency });
    } catch (error) {
      logError(error as Error, { action: 'refresh_exchange_rates', baseCurrency });
    }
  }

  async refreshAllExchangeRates(): Promise<void> {
    try {
      const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'RUB', 'BTC', 'ETH'];
      
      const promises = currencies.map(currency => this.refreshExchangeRates(currency));
      await Promise.all(promises);
      
      logger.info('All exchange rates refreshed');
    } catch (error) {
      logError(error as Error, { action: 'refresh_all_exchange_rates' });
    }
  }

  // =============================================
  // CACHE STATISTICS
  // =============================================

  async getCacheStats(): Promise<{
    exchange_rates_cached: number;
    payment_analytics_cached: number;
    payment_history_cached: number;
    cache_hit_rate: number;
  }> {
    try {
      const exchangeRateKeys = await cacheService.getPattern('exchange:*');
      const analyticsKeys = await cacheService.getPattern('payment:analytics:*');
      const historyKeys = await cacheService.getPattern('payment:history:*');
      
      return {
        exchange_rates_cached: exchangeRateKeys.length,
        payment_analytics_cached: analyticsKeys.length,
        payment_history_cached: historyKeys.length,
        cache_hit_rate: 0, // Would need to track this separately
      };
    } catch (error) {
      logError(error as Error, { action: 'get_payment_cache_stats' });
      return {
        exchange_rates_cached: 0,
        payment_analytics_cached: 0,
        payment_history_cached: 0,
        cache_hit_rate: 0,
      };
    }
  }
}
