'use client';

import { useState, useRef } from 'react';
import { 
  Download, 
  Check, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Eye,
  Shield,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface DownloadableFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  download_count: number;
  max_downloads: number;
  expires_at?: string;
  is_available: boolean;
  last_downloaded_at?: string;
}

interface DownloadButtonProps {
  file: DownloadableFile;
  orderId: string;
  productId: string;
  onDownloadStart?: (fileId: string) => void;
  onDownloadComplete?: (fileId: string, success: boolean) => void;
  onDownloadError?: (fileId: string, error: string) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  showProgress?: boolean;
  showFileInfo?: boolean;
}

export function DownloadButton({
  file,
  orderId,
  productId,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError,
  className,
  variant = 'default',
  showProgress = true,
  showFileInfo = true,
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.split('/')[0];
    switch (type) {
      case 'image':
        return ImageIcon;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      case 'application':
        if (fileType.includes('zip') || fileType.includes('rar')) {
          return Archive;
        }
        if (fileType.includes('javascript') || fileType.includes('json')) {
          return Code;
        }
        return FileText;
      case 'text':
        return FileText;
      default:
        return FileText;
    }
  };

  const getFileTypeColor = (fileType: string) => {
    const type = fileType.split('/')[0];
    switch (type) {
      case 'image':
        return 'text-green-600';
      case 'video':
        return 'text-purple-600';
      case 'audio':
        return 'text-blue-600';
      case 'application':
        return 'text-orange-600';
      case 'text':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const isDownloadAvailable = () => {
    if (!file.is_available) return false;
    if (file.max_downloads > 0 && file.download_count >= file.max_downloads) return false;
    if (file.expires_at && new Date(file.expires_at) < new Date()) return false;
    return true;
  };

  const getUnavailableReason = () => {
    if (!file.is_available) return 'File is not available';
    if (file.max_downloads > 0 && file.download_count >= file.max_downloads) {
      return `Download limit reached (${file.max_downloads} downloads)`;
    }
    if (file.expires_at && new Date(file.expires_at) < new Date()) {
      return 'Download link has expired';
    }
    return 'Download not available';
  };

  const getRemainingDownloads = () => {
    if (file.max_downloads <= 0) return 'Unlimited';
    return file.max_downloads - file.download_count;
  };

  const getExpiryInfo = () => {
    if (!file.expires_at) return null;
    
    const expiryDate = new Date(file.expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry === 0) return 'Expires today';
    if (daysUntilExpiry === 1) return 'Expires tomorrow';
    if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
    
    return `Expires ${expiryDate.toLocaleDateString()}`;
  };

  const handleDownload = async () => {
    if (!isDownloadAvailable()) {
      toast.error(getUnavailableReason());
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadError(null);
      
      if (onDownloadStart) {
        onDownloadStart(file.id);
      }

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // First, verify download access
      setIsVerifying(true);
      const verifyResponse = await fetch(`/api/buyer/downloads/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: file.id,
          order_id: orderId,
          product_id: productId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Download verification failed');
      }

      const { download_url, expires_in } = await verifyResponse.json();
      setIsVerifying(false);

      // Start the actual download
      const downloadResponse = await fetch(download_url, {
        signal: abortControllerRef.current.signal,
      });

      if (!downloadResponse.ok) {
        throw new Error('Download failed');
      }

      const contentLength = downloadResponse.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      const reader = downloadResponse.body?.getReader();
      if (!reader) {
        throw new Error('Unable to read download stream');
      }

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        received += value.length;
        
        if (total > 0) {
          const progress = (received / total) * 100;
          setDownloadProgress(progress);
        }
      }

      // Create blob and download
      const blob = new Blob(chunks as BlobPart[]);
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadProgress(100);
      toast.success('Download completed successfully');
      
      if (onDownloadComplete) {
        onDownloadComplete(file.id, true);
      }

      // Update download count (optimistic update)
      // The actual count will be updated by the server

    } catch (error: any) {
      console.error('Download error:', error);
      
      if (error.name === 'AbortError') {
        toast.error('Download cancelled');
      } else {
        const errorMessage = error.message || 'Download failed';
        setDownloadError(errorMessage);
        toast.error(errorMessage);
        
        if (onDownloadError) {
          onDownloadError(file.id, errorMessage);
        }
      }
      
      if (onDownloadComplete) {
        onDownloadComplete(file.id, false);
      }
    } finally {
      setIsDownloading(false);
      setIsVerifying(false);
      setDownloadProgress(0);
      abortControllerRef.current = null;
    }
  };

  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetryDownload = () => {
    setDownloadError(null);
    handleDownload();
  };

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <Button
        onClick={handleDownload}
        disabled={!isDownloadAvailable() || isDownloading}
        size="sm"
        className={cn('flex items-center space-x-2', className)}
      >
        {isDownloading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
      </Button>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    const IconComponent = getFileIcon(file.type);
    const available = isDownloadAvailable();

    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn('p-2 rounded-lg bg-gray-100', getFileTypeColor(file.type))}>
              <IconComponent className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(file.size)}
                {file.max_downloads > 0 && (
                  <> • {getRemainingDownloads()} downloads left</>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {!available && (
                <Badge variant="outline" className="text-xs text-red-600">
                  Unavailable
                </Badge>
              )}
              
              <Button
                onClick={available ? handleDownload : undefined}
                disabled={!available || isDownloading}
                size="sm"
                variant={available ? 'primary' : 'outline'}
                className="flex items-center space-x-1"
              >
                {isDownloading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : available ? (
                  <Download className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          
          {isDownloading && showProgress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">
                  {isVerifying ? 'Verifying access...' : 'Downloading...'}
                </span>
                <span className="font-medium">{downloadProgress.toFixed(0)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-1" />
            </div>
          )}
          
          {downloadError && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
              <div className="flex items-center justify-between">
                <span className="text-red-600">{downloadError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetryDownload}
                  className="h-6 text-xs"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  const IconComponent = getFileIcon(file.type);
  const available = isDownloadAvailable();
  const expiryInfo = getExpiryInfo();

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* File Header */}
          <div className="flex items-start space-x-4">
            <div className={cn('p-3 rounded-lg bg-gray-100', getFileTypeColor(file.type))}>
              <IconComponent className="h-6 w-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{file.name}</h3>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span>{formatFileSize(file.size)}</span>
                <span className="capitalize">{file.type.split('/')[1] || 'file'}</span>
                {file.last_downloaded_at && (
                  <span>Last: {new Date(file.last_downloaded_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {available ? (
                <Badge className="bg-green-100 text-green-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Available
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unavailable
                </Badge>
              )}
            </div>
          </div>

          {/* File Information */}
          {showFileInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Downloads:</span>
                  <span className="font-medium">
                    {file.download_count}
                    {file.max_downloads > 0 && ` / ${file.max_downloads}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-medium">{getRemainingDownloads()}</span>
                </div>
              </div>
              
              <div>
                {expiryInfo && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires:</span>
                    <span className={cn(
                      'font-medium',
                      expiryInfo.includes('Expired') ? 'text-red-600' :
                      expiryInfo.includes('today') || expiryInfo.includes('tomorrow') ? 'text-yellow-600' :
                      'text-gray-900'
                    )}>
                      {expiryInfo}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">File Type:</span>
                  <span className="font-medium">{file.type}</span>
                </div>
              </div>
            </div>
          )}

          {/* Download Progress */}
          {isDownloading && showProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {isVerifying ? 'Verifying download access...' : 'Downloading file...'}
                </span>
                <span className="font-medium">{downloadProgress.toFixed(0)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {isVerifying ? 'Please wait...' : `${formatFileSize(file.size * (downloadProgress / 100))} of ${formatFileSize(file.size)}`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelDownload}
                  className="text-xs h-6"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {downloadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-600 font-medium">Download Failed</p>
                  <p className="text-sm text-red-600 mt-1">{downloadError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryDownload}
                    className="mt-2 text-xs h-6"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Unavailable Message */}
          {!available && !downloadError && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Download Unavailable</p>
                  <p className="text-sm text-yellow-600 mt-1">{getUnavailableReason()}</p>
                  {file.expires_at && new Date(file.expires_at) < new Date() && (
                    <p className="text-xs text-yellow-600 mt-2">
                      Contact support if you need access to this file.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Download Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-3">
              {file.last_downloaded_at && (
                <span className="text-xs text-gray-500">
                  Last downloaded: {new Date(file.last_downloaded_at).toLocaleDateString()}
                </span>
              )}
              
              {expiryInfo && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs',
                    expiryInfo.includes('Expired') ? 'text-red-600 border-red-200' :
                    expiryInfo.includes('today') || expiryInfo.includes('tomorrow') ? 'text-yellow-600 border-yellow-200' :
                    'text-gray-600'
                  )}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {expiryInfo}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {available && file.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(file.url, '_blank')}
                  className="flex items-center space-x-1"
                >
                  <Eye className="h-3 w-3" />
                  <span>Preview</span>
                </Button>
              )}
              
              <Button
                onClick={available ? handleDownload : undefined}
                disabled={!available || isDownloading}
                className={cn(
                  'flex items-center space-x-2',
                  !available && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : available ? (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>Unavailable</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Bulk download component for multiple files
interface BulkDownloadProps {
  files: DownloadableFile[];
  orderId: string;
  productId: string;
  onDownloadComplete?: (results: { success: number; failed: number }) => void;
  className?: string;
}

export function BulkDownloadButton({
  files,
  orderId,
  productId,
  onDownloadComplete,
  className,
}: BulkDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadResults, setDownloadResults] = useState<{ success: number; failed: number } | null>(null);

  const availableFiles = files.filter(file => {
    if (!file.is_available) return false;
    if (file.max_downloads > 0 && file.download_count >= file.max_downloads) return false;
    if (file.expires_at && new Date(file.expires_at) < new Date()) return false;
    return true;
  });

  const handleBulkDownload = async () => {
    if (availableFiles.length === 0) {
      toast.error('No files available for download');
      return;
    }

    setIsDownloading(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      // Create ZIP file with all downloads
      const response = await fetch('/api/buyer/downloads/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_ids: availableFiles.map(f => f.id),
          order_id: orderId,
          product_id: productId,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${orderId}-files.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        successCount = availableFiles.length;
        toast.success(`Downloaded ${successCount} files successfully`);
      } else {
        throw new Error('Bulk download failed');
      }
    } catch (error) {
      failedCount = availableFiles.length;
      console.error('Bulk download error:', error);
      toast.error('Bulk download failed');
    } finally {
      setIsDownloading(false);
      const results = { success: successCount, failed: failedCount };
      setDownloadResults(results);
      
      if (onDownloadComplete) {
        onDownloadComplete(results);
      }
    }
  };

  return (
    <Button
      onClick={handleBulkDownload}
      disabled={availableFiles.length === 0 || isDownloading}
      className={cn('flex items-center space-x-2', className)}
    >
      {isDownloading ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Creating ZIP...</span>
        </>
      ) : (
        <>
          <Archive className="h-4 w-4" />
          <span>Download All ({availableFiles.length})</span>
        </>
      )}
    </Button>
  );
}
