import { useState, useEffect, useCallback } from 'react';
import { Shop, ShopAnalytics, ShopSales, WithdrawalRequest, CreateShopRequest, UpdateShopRequest } from '@/types';

interface UseShopsReturn {
  shops: Shop[];
  loading: boolean;
  error: string | null;
  createShop: (data: CreateShopRequest) => Promise<{ success: boolean; error?: string }>;
  updateShop: (shopId: string, data: UpdateShopRequest) => Promise<{ success: boolean; error?: string }>;
  deleteShop: (shopId: string) => Promise<{ success: boolean; error?: string }>;
  refreshShops: () => Promise<void>;
}

export function useShops(): UseShopsReturn {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/shops');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch shops');
      }

      setShops(data.shops || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shops');
    } finally {
      setLoading(false);
    }
  }, []);

  const createShop = useCallback(async (data: CreateShopRequest) => {
    try {
      const response = await fetch('/api/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to create shop' };
      }

      // Refresh shops list
      await fetchShops();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create shop' };
    }
  }, [fetchShops]);

  const updateShop = useCallback(async (shopId: string, data: UpdateShopRequest) => {
    try {
      const response = await fetch(`/api/shops/${shopId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update shop' };
      }

      // Refresh shops list
      await fetchShops();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update shop' };
    }
  }, [fetchShops]);

  const deleteShop = useCallback(async (shopId: string) => {
    try {
      const response = await fetch(`/api/shops/${shopId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete shop' };
      }

      // Refresh shops list
      await fetchShops();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete shop' };
    }
  }, [fetchShops]);

  const refreshShops = useCallback(async () => {
    await fetchShops();
  }, [fetchShops]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  return {
    shops,
    loading,
    error,
    createShop,
    updateShop,
    deleteShop,
    refreshShops,
  };
}

interface UseShopAnalyticsReturn {
  analytics: ShopAnalytics | null;
  loading: boolean;
  error: string | null;
  fetchAnalytics: (period?: string) => Promise<void>;
}

export function useShopAnalytics(shopId: string): UseShopAnalyticsReturn {
  const [analytics, setAnalytics] = useState<ShopAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (period: string = '30d') => {
    if (!shopId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/shops/${shopId}/analytics?period=${period}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  return {
    analytics,
    loading,
    error,
    fetchAnalytics,
  };
}

interface UseShopSalesReturn {
  sales: ShopSales | null;
  loading: boolean;
  error: string | null;
  fetchSales: (params?: { page?: number; limit?: number; period?: string }) => Promise<void>;
}

export function useShopSales(shopId: string): UseShopSalesReturn {
  const [sales, setSales] = useState<ShopSales | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async (params: { page?: number; limit?: number; period?: string } = {}) => {
    if (!shopId) return;

    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.period) searchParams.set('period', params.period);

      const response = await fetch(`/api/shops/${shopId}/sales?${searchParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sales');
      }

      setSales(data.sales);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  return {
    sales,
    loading,
    error,
    fetchSales,
  };
}

interface UseWithdrawalsReturn {
  requests: WithdrawalRequest[];
  loading: boolean;
  error: string | null;
  createWithdrawal: (amount: number, method: string, accountDetails: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  fetchWithdrawals: () => Promise<void>;
}

export function useWithdrawals(shopId: string): UseWithdrawalsReturn {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithdrawals = useCallback(async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/shops/${shopId}/withdraw`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch withdrawal requests');
      }

      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch withdrawal requests');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  const createWithdrawal = useCallback(async (amount: number, method: string, accountDetails: Record<string, any>) => {
    try {
      const response = await fetch(`/api/shops/${shopId}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          method,
          account_details: accountDetails,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to create withdrawal request' };
      }

      // Refresh withdrawal requests
      await fetchWithdrawals();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create withdrawal request' };
    }
  }, [shopId, fetchWithdrawals]);

  return {
    requests,
    loading,
    error,
    createWithdrawal,
    fetchWithdrawals,
  };
}
