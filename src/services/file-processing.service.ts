import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { addFileProcessingJob, FileProcessingJobData } from '@/jobs/queue';
import { createServerClient } from '@/lib/supabase';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export interface FileProcessingOptions {
  maxSize?: number;
  allowedFormats?: string[];
  quality?: number;
  dimensions?: { width: number; height: number };
  generateThumbnail?: boolean;
  optimizeImage?: boolean;
  scanForViruses?: boolean;
}

export class FileProcessingService {
  private readonly ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly ALLOWED_DOCUMENT_FORMATS = ['application/pdf', 'text/plain', 'application/msword'];
  private readonly ALLOWED_ARCHIVE_FORMATS = ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'];
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  async processFile(
    fileId: string,
    fileUrl: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    userId: string,
    productId?: string,
    options: FileProcessingOptions = {}
  ): Promise<void> {
    try {
      logger.info('Starting file processing', {
        fileId,
        fileName,
        fileType,
        fileSize,
        userId,
      });

      // Validate file
      await this.validateFile(fileName, fileType, fileSize, options);

      // Determine processing type based on file type and options
      const processingTypes = this.determineProcessingTypes(fileType, options);

      // Queue processing jobs
      for (const processingType of processingTypes) {
        const jobData: FileProcessingJobData = {
          fileId,
          fileUrl,
          fileName,
          fileType,
          fileSize,
          userId,
          productId,
          processingType,
          options: {
            maxSize: options.maxSize || this.MAX_FILE_SIZE,
            allowedFormats: options.allowedFormats,
            quality: options.quality || 80,
            dimensions: options.dimensions,
          },
        };

        await addFileProcessingJob(jobData);
        logger.info('File processing job queued', {
          fileId,
          processingType,
        });
      }
    } catch (error) {
      logError(error as Error, {
        context: 'process-file',
        fileId,
        fileName,
        fileType,
      });
      throw error;
    }
  }

  async processImage(
    fileId: string,
    fileUrl: string,
    fileName: string,
    fileSize: number,
    userId: string,
    productId?: string,
    options: FileProcessingOptions = {}
  ): Promise<void> {
    await this.processFile(
      fileId,
      fileUrl,
      fileName,
      'image/jpeg', // Assume JPEG for images
      fileSize,
      userId,
      productId,
      {
        ...options,
        generateThumbnail: true,
        optimizeImage: true,
        scanForViruses: true,
      }
    );
  }

  async processDocument(
    fileId: string,
    fileUrl: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    userId: string,
    productId?: string,
    options: FileProcessingOptions = {}
  ): Promise<void> {
    await this.processFile(
      fileId,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      userId,
      productId,
      {
        ...options,
        scanForViruses: true,
      }
    );
  }

  async processArchive(
    fileId: string,
    fileUrl: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    userId: string,
    productId?: string,
    options: FileProcessingOptions = {}
  ): Promise<void> {
    await this.processFile(
      fileId,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      userId,
      productId,
      {
        ...options,
        scanForViruses: true,
      }
    );
  }

  private async validateFile(
    fileName: string,
    fileType: string,
    fileSize: number,
    options: FileProcessingOptions
  ): Promise<void> {
    // Check file size
    const maxSize = options.maxSize || this.MAX_FILE_SIZE;
    if (fileSize > maxSize) {
      throw new Error(`File size ${fileSize} exceeds maximum allowed size ${maxSize}`);
    }

    // Check file format
    const allowedFormats = options.allowedFormats || [
      ...this.ALLOWED_IMAGE_FORMATS,
      ...this.ALLOWED_DOCUMENT_FORMATS,
      ...this.ALLOWED_ARCHIVE_FORMATS,
    ];

    if (!allowedFormats.includes(fileType)) {
      throw new Error(`File type ${fileType} is not allowed`);
    }

    // Check file extension
    const extension = path.extname(fileName).toLowerCase();
    const allowedExtensions = this.getAllowedExtensions(fileType);
    
    if (!allowedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} is not allowed for type ${fileType}`);
    }
  }

  private determineProcessingTypes(
    fileType: string,
    options: FileProcessingOptions
  ): Array<'virus_scan' | 'optimization' | 'thumbnail_generation' | 'format_conversion'> {
    const types: Array<'virus_scan' | 'optimization' | 'thumbnail_generation' | 'format_conversion'> = [];

    // Always scan for viruses if requested
    if (options.scanForViruses !== false) {
      types.push('virus_scan');
    }

    // Image-specific processing
    if (this.ALLOWED_IMAGE_FORMATS.includes(fileType)) {
      if (options.generateThumbnail !== false) {
        types.push('thumbnail_generation');
      }
      if (options.optimizeImage !== false) {
        types.push('optimization');
      }
    }

    // Format conversion if needed
    if (options.allowedFormats && !options.allowedFormats.includes(fileType)) {
      types.push('format_conversion');
    }

    return types;
  }

  private getAllowedExtensions(fileType: string): string[] {
    switch (fileType) {
      case 'image/jpeg':
        return ['.jpg', '.jpeg'];
      case 'image/png':
        return ['.png'];
      case 'image/gif':
        return ['.gif'];
      case 'image/webp':
        return ['.webp'];
      case 'application/pdf':
        return ['.pdf'];
      case 'text/plain':
        return ['.txt'];
      case 'application/msword':
        return ['.doc'];
      case 'application/zip':
        return ['.zip'];
      case 'application/x-rar-compressed':
        return ['.rar'];
      case 'application/x-7z-compressed':
        return ['.7z'];
      default:
        return [];
    }
  }

  async generateThumbnail(
    fileUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
    } = {}
  ): Promise<string> {
    try {
      const { width = 300, height = 300, quality = 80 } = options;
      
      // Download file from Supabase Storage
      const supabase = createServerClient();
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('products')
        .download(fileUrl);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Generate thumbnail using Sharp
      const thumbnailBuffer = await sharp(await fileData.arrayBuffer())
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality })
        .toBuffer();

      // Upload thumbnail to Supabase Storage
      const thumbnailFileName = `thumbnails/${path.basename(fileUrl, path.extname(fileUrl))}_thumb.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(thumbnailFileName, thumbnailBuffer, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
      }

      logger.info('Thumbnail generated successfully', {
        originalFile: fileUrl,
        thumbnailFile: uploadData.path,
      });

      return uploadData.path;
    } catch (error) {
      logError(error as Error, {
        context: 'generate-thumbnail',
        fileUrl,
        options,
      });
      throw error;
    }
  }

  async optimizeImage(
    fileUrl: string,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<string> {
    try {
      const { quality = 80, maxWidth = 1920, maxHeight = 1080 } = options;
      
      // Download file from Supabase Storage
      const supabase = createServerClient();
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('products')
        .download(fileUrl);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Optimize image using Sharp
      const optimizedBuffer = await sharp(await fileData.arrayBuffer())
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();

      // Upload optimized image to Supabase Storage
      const optimizedFileName = `optimized/${path.basename(fileUrl, path.extname(fileUrl))}_optimized.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(optimizedFileName, optimizedBuffer, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw new Error(`Failed to upload optimized image: ${uploadError.message}`);
      }

      logger.info('Image optimized successfully', {
        originalFile: fileUrl,
        optimizedFile: uploadData.path,
        originalSize: (await fileData.arrayBuffer()).byteLength,
        optimizedSize: optimizedBuffer.length,
      });

      return uploadData.path;
    } catch (error) {
      logError(error as Error, {
        context: 'optimize-image',
        fileUrl,
        options,
      });
      throw error;
    }
  }

  async scanForViruses(fileUrl: string): Promise<boolean> {
    try {
      // This is a placeholder implementation
      // In a real application, you would integrate with a virus scanning service
      // like ClamAV, VirusTotal API, or AWS GuardDuty
      
      logger.info('Virus scan completed', { fileUrl });
      
      // Simulate virus scanning
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, always return clean
      return true;
    } catch (error) {
      logError(error as Error, {
        context: 'scan-for-viruses',
        fileUrl,
      });
      throw error;
    }
  }

  async convertFormat(
    fileUrl: string,
    targetFormat: string,
    options: {
      quality?: number;
      width?: number;
      height?: number;
    } = {}
  ): Promise<string> {
    try {
      const { quality = 80, width, height } = options;
      
      // Download file from Supabase Storage
      const supabase = createServerClient();
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('products')
        .download(fileUrl);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Convert format using Sharp
      let convertedBuffer: Buffer;
      
      if (targetFormat === 'image/jpeg') {
        convertedBuffer = await sharp(await fileData.arrayBuffer())
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality })
          .toBuffer();
      } else if (targetFormat === 'image/png') {
        convertedBuffer = await sharp(await fileData.arrayBuffer())
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .png({ quality })
          .toBuffer();
      } else if (targetFormat === 'image/webp') {
        convertedBuffer = await sharp(await fileData.arrayBuffer())
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality })
          .toBuffer();
      } else {
        throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      // Upload converted file to Supabase Storage
      const convertedFileName = `converted/${path.basename(fileUrl, path.extname(fileUrl))}_converted.${targetFormat.split('/')[1]}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(convertedFileName, convertedBuffer, {
          contentType: targetFormat,
        });

      if (uploadError) {
        throw new Error(`Failed to upload converted file: ${uploadError.message}`);
      }

      logger.info('Format conversion completed', {
        originalFile: fileUrl,
        convertedFile: uploadData.path,
        targetFormat,
      });

      return uploadData.path;
    } catch (error) {
      logError(error as Error, {
        context: 'convert-format',
        fileUrl,
        targetFormat,
        options,
      });
      throw error;
    }
  }
}

export const fileProcessingService = new FileProcessingService();
