'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  X, 
  File, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  FileText,
  Code,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadProgress?: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  onFilesChange: (files: UploadedFile[]) => void;
  onUpload?: (files: File[]) => Promise<string[]>;
  uploadEndpoint?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  showPreview?: boolean;
  allowedTypes?: string[];
  disabled?: boolean;
}

const FILE_TYPE_ICONS = {
  'image': ImageIcon,
  'video': Video,
  'audio': Music,
  'application/zip': Archive,
  'application/x-zip': Archive,
  'application/x-rar': Archive,
  'text': FileText,
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument': FileText,
  'application/javascript': Code,
  'text/javascript': Code,
  'application/json': Code,
  'text/html': Code,
  'text/css': Code,
  'text/plain': FileText,
};

const FILE_TYPE_COLORS = {
  'image': 'text-green-600',
  'video': 'text-purple-600',
  'audio': 'text-blue-600',
  'application': 'text-orange-600',
  'text': 'text-gray-600',
  'default': 'text-gray-600',
};

export function FileUpload({
  accept = '*/*',
  multiple = false,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB default
  onFilesChange,
  onUpload,
  uploadEndpoint,
  className,
  variant = 'default',
  showPreview = true,
  allowedTypes = [],
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    const type = fileType.split('/')[0];
    const fullType = fileType;
    
    if (FILE_TYPE_ICONS[fullType]) {
      return FILE_TYPE_ICONS[fullType];
    }
    if (FILE_TYPE_ICONS[type]) {
      return FILE_TYPE_ICONS[type];
    }
    return File;
  };

  const getFileColor = (fileType: string) => {
    const type = fileType.split('/')[0];
    return FILE_TYPE_COLORS[type] || FILE_TYPE_COLORS.default;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`;
    }

    if (allowedTypes.length > 0 && !allowedTypes.some(type => file.type.includes(type))) {
      return `File type ${file.type} is not allowed`;
    }

    return null;
  };

  const generateFileId = () => {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    
    if (!multiple && fileArray.length > 1) {
      toast.error('Only one file is allowed');
      return;
    }

    if (files.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: UploadedFile[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const validation = validateFile(file);
      if (validation) {
        errors.push(`${file.name}: ${validation}`);
        return;
      }

      const uploadedFile: UploadedFile = {
        id: generateFileId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
      };

      newFiles.push(uploadedFile);
    });

    if (errors.length > 0) {
      toast.error(`Upload errors: ${errors.join(', ')}`);
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    }
  }, [files, maxFiles, multiple, onFilesChange, maxSize, allowedTypes]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      handleFileSelect(selectedFiles);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles) {
      handleFileSelect(droppedFiles);
    }
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const clearAllFiles = () => {
    setFiles([]);
    onFilesChange([]);
  };

  const uploadFiles = async () => {
    if (!onUpload && !uploadEndpoint) {
      toast.error('No upload handler configured');
      return;
    }

    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast.error('No files to upload');
      return;
    }

    setIsUploading(true);

    try {
      // Update status to uploading
      setFiles(prevFiles =>
        prevFiles.map(f =>
          f.status === 'pending' ? { ...f, status: 'uploading', uploadProgress: 0 } : f
        )
      );

      let uploadUrls: string[] = [];

      if (onUpload) {
        // Use custom upload handler
        uploadUrls = await onUpload(pendingFiles.map(f => f.file));
      } else if (uploadEndpoint) {
        // Use endpoint upload
        const formData = new FormData();
        pendingFiles.forEach((f, index) => {
          formData.append(`files[${index}]`, f.file);
        });

        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        uploadUrls = data.urls || [];
      }

      // Update files with URLs and completed status
      setFiles(prevFiles =>
        prevFiles.map((f, index) => {
          if (f.status === 'uploading') {
            return {
              ...f,
              status: 'completed' as const,
              url: uploadUrls[pendingFiles.findIndex(pf => pf.id === f.id)],
              uploadProgress: 100,
            };
          }
          return f;
        })
      );

      toast.success(`${pendingFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      
      // Update failed files
      setFiles(prevFiles =>
        prevFiles.map(f =>
          f.status === 'uploading' 
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        )
      );

      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const retryUpload = (fileId: string) => {
    setFiles(prevFiles =>
      prevFiles.map(f =>
        f.id === fileId ? { ...f, status: 'pending', error: undefined } : f
      )
    );
  };

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={cn('', className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Select Files
        </Button>

        {files.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            {files.length} file(s) selected
          </div>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {isDragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
          isDragOver ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400 hover:bg-gray-50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="space-y-4">
          <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Upload className={cn(
              'h-8 w-8',
              isDragOver ? 'text-blue-600' : 'text-gray-400'
            )} />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragOver ? 'Drop files here' : 'Upload your files'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop files here, or click to browse
            </p>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Maximum file size: {formatFileSize(maxSize)}</p>
            {multiple && <p>Maximum files: {maxFiles}</p>}
            {allowedTypes.length > 0 && (
              <p>Allowed types: {allowedTypes.join(', ')}</p>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Selected Files ({files.length})
            </h4>
            <div className="flex items-center space-x-2">
              {(onUpload || uploadEndpoint) && (
                <Button
                  onClick={uploadFiles}
                  disabled={isUploading || files.every(f => f.status === 'completed')}
                  size="sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={clearAllFiles}
                disabled={isUploading}
                size="sm"
              >
                Clear All
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {files.map((file) => (
              <FilePreview
                key={file.id}
                file={file}
                onRemove={() => removeFile(file.id)}
                onRetry={() => retryUpload(file.id)}
                showPreview={showPreview}
                disabled={isUploading}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual file preview component
interface FilePreviewProps {
  file: UploadedFile;
  onRemove: () => void;
  onRetry: () => void;
  showPreview: boolean;
  disabled: boolean;
}

function FilePreview({ file, onRemove, onRetry, showPreview, disabled }: FilePreviewProps) {
  const IconComponent = getFileIcon(file.type);
  const fileColor = getFileColor(file.type);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Generate image preview for image files
  useState(() => {
    if (showPreview && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file.file);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file.file, file.type, showPreview]);

  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (file.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'uploading':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <Card className={cn('transition-all duration-200', getStatusColor())}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* File Icon/Preview */}
          <div className="flex-shrink-0">
            {showPreview && imagePreview ? (
              <img
                src={imagePreview}
                alt={file.name}
                className="h-12 w-12 object-cover rounded-lg border border-gray-200"
              />
            ) : (
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <IconComponent className={cn('h-6 w-6', fileColor)} />
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </h5>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  disabled={disabled}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-4 mt-1">
              <span className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </span>
              <Badge variant="outline" size="sm" className="text-xs">
                {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
              </Badge>
            </div>

            {/* Upload Progress */}
            {file.status === 'uploading' && file.uploadProgress !== undefined && (
              <div className="mt-2">
                <Progress value={file.uploadProgress} className="h-1" />
              </div>
            )}

            {/* Error Message */}
            {file.status === 'error' && file.error && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-red-600">{file.error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="text-xs h-6"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Success Message */}
            {file.status === 'completed' && (
              <div className="mt-2">
                <p className="text-xs text-green-600">Upload completed successfully</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
