import { useState, useCallback } from 'react';
import {
  PaymentIntent,
  PaymentResponse,
  RefundResponse,
  InvoiceResponse,
  ExchangeRateResponse,
  PaymentRequest,
  RefundRequest,
  InvoiceRequest,
  ExchangeRateRequest,
  Currency,
  PaymentProvider,
} from '@/types/payment';

interface UsePaymentsState {
  isLoading: boolean;
  error: string | null;
  currentPayment: PaymentIntent | null;
}

interface UsePaymentsActions {
  createPayment: (request: PaymentRequest, idempotencyKey?: string) => Promise<PaymentResponse>;
  processRefund: (request: RefundRequest) => Promise<RefundResponse>;
  generateInvoice: (request: InvoiceRequest) => Promise<InvoiceResponse>;
  convertCurrency: (request: ExchangeRateRequest) => Promise<ExchangeRateResponse>;
  clearError: () => void;
  clearCurrentPayment: () => void;
}

export function usePayments(): UsePaymentsState & UsePaymentsActions {
  const [state, setState] = useState<UsePaymentsState>({
    isLoading: false,
    error: null,
    currentPayment: null,
  });

  const createPayment = useCallback(async (
    request: PaymentRequest, 
    idempotencyKey?: string
  ): Promise<PaymentResponse> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (idempotencyKey) {
        headers['idempotency-key'] = idempotencyKey;
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      setState(prev => ({
        ...prev,
        currentPayment: data.payment_intent,
        isLoading: false,
      }));

      return {
        success: true,
        payment_intent: data.payment_intent,
        payment_data: data.payment_data,
      };
    } catch (error) {
      console.error('Create payment error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create payment',
      }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment',
      };
    }
  }, []);

  const processRefund = useCallback(async (request: RefundRequest): Promise<RefundResponse> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
      }));

      return {
        success: true,
        refund: data.refund,
      };
    } catch (error) {
      console.error('Process refund error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  }, []);

  const generateInvoice = useCallback(async (request: InvoiceRequest): Promise<InvoiceResponse> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/payments/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invoice');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
      }));

      return {
        success: true,
        invoice: data.invoice,
      };
    } catch (error) {
      console.error('Generate invoice error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate invoice',
      }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate invoice',
      };
    }
  }, []);

  const convertCurrency = useCallback(async (request: ExchangeRateRequest): Promise<ExchangeRateResponse> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/payments/convert-currency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert currency');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
      }));

      return {
        success: true,
        converted_amount: data.converted_amount,
        exchange_rate: data.exchange_rate,
      };
    } catch (error) {
      console.error('Convert currency error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to convert currency',
      }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert currency',
      };
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearCurrentPayment = useCallback(() => {
    setState(prev => ({ ...prev, currentPayment: null }));
  }, []);

  return {
    ...state,
    createPayment,
    processRefund,
    generateInvoice,
    convertCurrency,
    clearError,
    clearCurrentPayment,
  };
}

// Helper hook for Stripe payments
export function useStripePayment() {
  const { createPayment, isLoading, error } = usePayments();

  const createStripePayment = useCallback(async (
    amount: number,
    currency: Currency,
    description: string,
    metadata?: Record<string, string>
  ) => {
    return createPayment({
      amount,
      currency,
      provider: 'stripe',
      description,
      metadata,
    });
  }, [createPayment]);

  return {
    createStripePayment,
    isLoading,
    error,
  };
}

// Helper hook for YooKassa payments
export function useYooKassaPayment() {
  const { createPayment, isLoading, error } = usePayments();

  const createYooKassaPayment = useCallback(async (
    amount: number,
    currency: Currency,
    description: string,
    metadata?: Record<string, string>
  ) => {
    return createPayment({
      amount,
      currency,
      provider: 'yookassa',
      description,
      metadata,
    });
  }, [createPayment]);

  return {
    createYooKassaPayment,
    isLoading,
    error,
  };
}

// Helper hook for crypto payments
export function useCryptoPayment() {
  const { createPayment, isLoading, error } = usePayments();

  const createCryptoPayment = useCallback(async (
    amount: number,
    currency: Currency,
    description: string,
    metadata?: Record<string, string>
  ) => {
    return createPayment({
      amount,
      currency,
      provider: 'coingate',
      description,
      metadata,
    });
  }, [createPayment]);

  return {
    createCryptoPayment,
    isLoading,
    error,
  };
}
