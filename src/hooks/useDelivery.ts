import { useState, useCallback } from 'react';
import { deliveryService, DeliveryOptions } from '@/services/delivery.service';

export interface UseDeliveryReturn {
  generateDownloadUrl: (productId: string, options?: DeliveryOptions) => Promise<{
    url: string;
    sessionId: string;
    expiresAt: Date;
  }>;
  generateZipFile: (productIds: string[], options?: DeliveryOptions) => Promise<{
    zipUrl: string;
    sessionId: string;
  }>;
  getBandwidthUsage: () => Promise<{
    userId: string;
    period: string;
    bytesUsed: number;
    limit: number;
    lastReset: Date;
  }>;
  loading: boolean;
  error: string | null;
}

export function useDelivery(): UseDeliveryReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: any) => {
    const errorMessage = err?.message || 'An unexpected error occurred';
    setError(errorMessage);
    console.error('Delivery service error:', err);
    return errorMessage;
  };

  const generateDownloadUrl = useCallback(async (
    productId: string,
    options: DeliveryOptions = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate download URL');
      }

      return data.data;
    } catch (err) {
      throw new Error(handleError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const generateZipFile = useCallback(async (
    productIds: string[],
    options: DeliveryOptions = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/delivery/download/zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds,
          options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate zip file');
      }

      return data.data;
    } catch (err) {
      throw new Error(handleError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const getBandwidthUsage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/delivery?action=bandwidth');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get bandwidth usage');
      }

      return data.data;
    } catch (err) {
      throw new Error(handleError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    generateDownloadUrl,
    generateZipFile,
    getBandwidthUsage,
    loading,
    error,
  };
}

// Hook for download management
export function useDownloadManager() {
  const [downloads, setDownloads] = useState<Map<string, {
    url: string;
    sessionId: string;
    expiresAt: Date;
    productId: string;
  }>>(new Map());

  const addDownload = useCallback((productId: string, downloadInfo: {
    url: string;
    sessionId: string;
    expiresAt: Date;
  }) => {
    setDownloads(prev => new Map(prev.set(productId, {
      ...downloadInfo,
      productId,
    })));
  }, []);

  const removeDownload = useCallback((productId: string) => {
    setDownloads(prev => {
      const newMap = new Map(prev);
      newMap.delete(productId);
      return newMap;
    });
  }, []);

  const getDownload = useCallback((productId: string) => {
    return downloads.get(productId);
  }, [downloads]);

  const clearExpiredDownloads = useCallback(() => {
    const now = new Date();
    setDownloads(prev => {
      const newMap = new Map();
      prev.forEach((download, productId) => {
        if (download.expiresAt > now) {
          newMap.set(productId, download);
        }
      });
      return newMap;
    });
  }, []);

  const isDownloadExpired = useCallback((productId: string) => {
    const download = downloads.get(productId);
    if (!download) return true;
    return new Date() > download.expiresAt;
  }, [downloads]);

  return {
    downloads: Array.from(downloads.values()),
    addDownload,
    removeDownload,
    getDownload,
    clearExpiredDownloads,
    isDownloadExpired,
  };
}

// Hook for bandwidth monitoring
export function useBandwidthMonitor() {
  const [bandwidthUsage, setBandwidthUsage] = useState<{
    userId: string;
    period: string;
    bytesUsed: number;
    limit: number;
    lastReset: Date;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBandwidthUsage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/delivery?action=bandwidth');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bandwidth usage');
      }

      setBandwidthUsage(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const getUsagePercentage = useCallback(() => {
    if (!bandwidthUsage) return 0;
    return Math.round((bandwidthUsage.bytesUsed / bandwidthUsage.limit) * 100);
  }, [bandwidthUsage]);

  const getFormattedUsage = useCallback(() => {
    if (!bandwidthUsage) return { used: '0 B', limit: '0 B' };

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      used: formatBytes(bandwidthUsage.bytesUsed),
      limit: formatBytes(bandwidthUsage.limit),
    };
  }, [bandwidthUsage]);

  const isNearLimit = useCallback((threshold: number = 80) => {
    if (!bandwidthUsage) return false;
    return getUsagePercentage() >= threshold;
  }, [bandwidthUsage, getUsagePercentage]);

  const isOverLimit = useCallback(() => {
    if (!bandwidthUsage) return false;
    return bandwidthUsage.bytesUsed >= bandwidthUsage.limit;
  }, [bandwidthUsage]);

  return {
    bandwidthUsage,
    loading,
    error,
    fetchBandwidthUsage,
    getUsagePercentage,
    getFormattedUsage,
    isNearLimit,
    isOverLimit,
  };
}
