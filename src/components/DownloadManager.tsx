'use client';

import React, { useState, useEffect } from 'react';
import { useDelivery, useDownloadManager, useBandwidthMonitor } from '@/hooks/useDelivery';
import type { DeliveryOptions } from '@/services/delivery.service';

interface DownloadManagerProps {
  productId: string;
  productTitle: string;
  onDownloadStart?: () => void;
  onDownloadComplete?: (url: string) => void;
  onDownloadError?: (error: string) => void;
}

export function DownloadManager({
  productId,
  productTitle,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError,
}: DownloadManagerProps) {
  const { generateDownloadUrl, loading, error } = useDelivery();
  const { addDownload, getDownload, isDownloadExpired } = useDownloadManager();
  const { bandwidthUsage, isOverLimit, isNearLimit } = useBandwidthMonitor();

  const [downloadOptions, setDownloadOptions] = useState<DeliveryOptions>({
    expiresIn: 24,
    maxDownloads: 5,
    watermark: false,
    licenseKey: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const existingDownload = getDownload(productId);
  const hasValidDownload = existingDownload && !isDownloadExpired(productId);

  useEffect(() => {
    if (isOverLimit()) {
      onDownloadError?.('Bandwidth limit exceeded. Please try again later.');
    }
  }, [isOverLimit, onDownloadError]);

  const handleDownload = async () => {
    if (hasValidDownload) {
      // Use existing download
      window.open(existingDownload.url, '_blank');
      return;
    }

    if (isOverLimit()) {
      onDownloadError?.('Bandwidth limit exceeded. Please try again later.');
      return;
    }

    setIsGenerating(true);
    onDownloadStart?.();

    try {
      const result = await generateDownloadUrl(productId, downloadOptions);
      
      addDownload(productId, result);
      onDownloadComplete?.(result.url);
      
      // Open download in new tab
      window.open(result.url, '_blank');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      onDownloadError?.(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatExpiryTime = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Bandwidth Warning */}
      {isNearLimit(80) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800 text-sm">
              You&apos;re using {bandwidthUsage ? Math.round((bandwidthUsage.bytesUsed / bandwidthUsage.limit) * 100) : 0}% of your monthly bandwidth limit.
            </span>
          </div>
        </div>
      )}

      {/* Download Options */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Download Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires In (hours)
            </label>
            <select
              value={downloadOptions.expiresIn}
              onChange={(e) => setDownloadOptions((prev: DeliveryOptions) => ({
                ...prev,
                expiresIn: parseInt(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>72 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Downloads
            </label>
            <select
              value={downloadOptions.maxDownloads}
              onChange={(e) => setDownloadOptions((prev: DeliveryOptions) => ({
                ...prev,
                maxDownloads: parseInt(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 download</option>
              <option value={3}>3 downloads</option>
              <option value={5}>5 downloads</option>
              <option value={10}>10 downloads</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={downloadOptions.watermark}
              onChange={(e) => setDownloadOptions((prev: DeliveryOptions) => ({
                ...prev,
                watermark: e.target.checked
              }))}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Add watermark to files</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={downloadOptions.licenseKey}
              onChange={(e) => setDownloadOptions((prev: DeliveryOptions) => ({
                ...prev,
                licenseKey: e.target.checked
              }))}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Generate license key for software</span>
          </label>
        </div>
      </div>

      {/* Download Button */}
      <div className="space-y-2">
        {hasValidDownload && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-800 font-medium">
                  Download ready
                </p>
                <p className="text-xs text-green-600">
                  Expires in {formatExpiryTime(existingDownload.expiresAt)}
                </p>
              </div>
              <button
                onClick={() => window.open(existingDownload.url, '_blank')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Download Now
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={isGenerating || loading || isOverLimit()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isGenerating || loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isGenerating ? 'Generating...' : 'Loading...'}
            </>
          ) : hasValidDownload ? (
            'Download Again'
          ) : (
            'Download Now'
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for bulk downloads (zip files)
interface BulkDownloadManagerProps {
  productIds: string[];
  onDownloadStart?: () => void;
  onDownloadComplete?: (url: string) => void;
  onDownloadError?: (error: string) => void;
}

export function BulkDownloadManager({
  productIds,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError,
}: BulkDownloadManagerProps) {
  const { generateZipFile, loading, error } = useDelivery();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleBulkDownload = async () => {
    setIsGenerating(true);
    onDownloadStart?.();

    try {
      const result = await generateZipFile(productIds, {
        expiresIn: 24,
        maxDownloads: 3,
        zipFiles: true,
      });
      
      onDownloadComplete?.(result.zipUrl);
      window.open(result.zipUrl, '_blank');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bulk download failed';
      onDownloadError?.(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          Bulk Download ({productIds.length} files)
        </h3>
        <p className="text-sm text-blue-700 mb-4">
          Download all selected files as a single ZIP archive.
        </p>
        
        <button
          onClick={handleBulkDownload}
          disabled={isGenerating || loading}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isGenerating || loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isGenerating ? 'Creating ZIP...' : 'Loading...'}
            </>
          ) : (
            'Download as ZIP'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
