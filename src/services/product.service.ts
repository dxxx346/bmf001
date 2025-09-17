import { createServiceClient, createServerClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { nanoid } from 'nanoid/non-secure';
import {
  Product,
  ProductFile,
  ProductVersion,
  ProductImage,
  ProductStats,
  ProductSearchFilters,
  ProductSearchResult,
  ProductRecommendation,
  BulkOperation,
  ProductAnalytics,
  CreateProductRequest,
  UpdateProductRequest,
  ProductUploadResult,
  ProductVersionRequest,
  BulkUpdateRequest,
  ProductRecommendationRequest,
  ProductSearchRequest,
  ProductAnalyticsRequest,
  FileUploadProgress,
  ProductExportOptions,
  ProductImportResult,
  ProductStatus,
  ProductType,
  FileType,
} from '@/types/product';

export class ProductService {
  private supabase = createServiceClient();
  private serverSupabase = createServerClient();

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  async createProduct(request: CreateProductRequest, sellerId: string): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      logger.info('Creating product', { sellerId, title: request.title });

      // Validate input
      const validation = this.validateProductRequest(request);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate slug
      const slug = this.generateSlug(request.title);

      // Create product record
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .insert({
          seller_id: sellerId,
          shop_id: request.shop_id || await this.getDefaultShopId(sellerId),
          category_id: request.category_id,
          subcategory_id: request.subcategory_id,
          title: request.title,
          slug,
          description: request.description,
          short_description: request.short_description,
          price: request.price,
          sale_price: request.sale_price,
          currency: request.currency,
          product_type: request.product_type,
          is_digital: request.is_digital,
          is_downloadable: request.is_downloadable,
          download_limit: request.download_limit,
          download_expiry_days: request.download_expiry_days,
          tags: request.tags,
          metadata: request.metadata || {},
          seo: request.seo || {},
          status: 'draft',
          version: '1.0.0',
        })
        .select()
        .single();

      if (productError) {
        logError(productError, { action: 'create_product', sellerId });
        return { success: false, error: 'Failed to create product' };
      }

      // Upload files if provided
      if (request.files && request.files.length > 0) {
        const uploadResults = await this.uploadProductFiles(product.id, request.files);
        if (uploadResults.some(result => !result.success)) {
          logger.warn('Some files failed to upload', { productId: product.id });
        }
      }

      // Upload images if provided
      if (request.images && request.images.length > 0) {
        const imageResults = await this.uploadProductImages(product.id, request.images);
        if (imageResults.some(result => !result.success)) {
          logger.warn('Some images failed to upload', { productId: product.id });
        }
      }

      // Create initial stats record
      await this.createProductStats(product.id);

      logger.info('Product created successfully', { productId: product.id, sellerId });
      return { success: true, product: product as Product };
    } catch (error) {
      logError(error as Error, { action: 'create_product', sellerId });
      return { success: false, error: 'Failed to create product due to server error' };
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const { data: product, error } = await this.supabase
        .from('products')
        .select(`
          *,
          files:product_files(*),
          images:product_images(*),
          versions:product_versions(*),
          stats:product_stats(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Product not found
        }
        logError(error, { action: 'get_product', productId: id });
        return null;
      }

      return product as Product;
    } catch (error) {
      logError(error as Error, { action: 'get_product', productId: id });
      return null;
    }
  }

  async updateProduct(id: string, updates: UpdateProductRequest, sellerId: string): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      logger.info('Updating product', { productId: id, sellerId, updates: Object.keys(updates) });

      // Check if user owns the product
      const { data: existingProduct } = await this.supabase
        .from('products')
        .select('seller_id')
        .eq('id', id)
        .single();

      if (!existingProduct || existingProduct.seller_id !== sellerId) {
        return { success: false, error: 'Product not found or access denied' };
      }

      // Update slug if title changed
      if (updates.title) {
        updates.slug = this.generateSlug(updates.title);
      }

      // Update product
      const { data: product, error } = await this.supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logError(error, { action: 'update_product', productId: id });
        return { success: false, error: 'Failed to update product' };
      }

      // Handle file uploads
      if (updates.files && updates.files.length > 0) {
        const uploadResults = await this.uploadProductFiles(id, updates.files);
        if (uploadResults.some(result => !result.success)) {
          logger.warn('Some files failed to upload', { productId: id });
        }
      }

      // Handle image uploads
      if (updates.images && updates.images.length > 0) {
        const imageResults = await this.uploadProductImages(id, updates.images);
        if (imageResults.some(result => !result.success)) {
          logger.warn('Some images failed to upload', { productId: id });
        }
      }

      logger.info('Product updated successfully', { productId: id });
      return { success: true, product: product as Product };
    } catch (error) {
      logError(error as Error, { action: 'update_product', productId: id });
      return { success: false, error: 'Failed to update product due to server error' };
    }
  }

  async deleteProduct(id: string, sellerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Deleting product', { productId: id, sellerId });

      // Check if user owns the product
      const { data: existingProduct } = await this.supabase
        .from('products')
        .select('seller_id')
        .eq('id', id)
        .single();

      if (!existingProduct || existingProduct.seller_id !== sellerId) {
        return { success: false, error: 'Product not found or access denied' };
      }

      // Delete associated files from storage
      await this.deleteProductFiles(id);

      // Delete product and related records
      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        logError(error, { action: 'delete_product', productId: id });
        return { success: false, error: 'Failed to delete product' };
      }

      logger.info('Product deleted successfully', { productId: id });
      return { success: true };
    } catch (error) {
      logError(error as Error, { action: 'delete_product', productId: id });
      return { success: false, error: 'Failed to delete product due to server error' };
    }
  }

  // =============================================
  // FILE UPLOAD WITH VIRUS SCANNING
  // =============================================

  async uploadProductFiles(productId: string, files: File[]): Promise<ProductUploadResult[]> {
    const results: ProductUploadResult[] = [];

    for (const file of files) {
      try {
        logger.info('Uploading product file', { productId, fileName: file.name, fileSize: file.size });

        // Virus scanning
        const virusScanResult = await this.scanFileForViruses(file);
        if (!virusScanResult.clean) {
          results.push({
            success: false,
            error: `File failed virus scan: ${virusScanResult.threats.join(', ')}`,
            virus_scan_result: virusScanResult,
          });
          continue;
        }

        // Generate unique filename
        const fileId = nanoid();
        const fileExtension = file.name.split('.').pop() || '';
        const fileName = `${fileId}.${fileExtension}`;
        const filePath = `products/${productId}/files/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from('product-files')
          .upload(filePath, file);

        if (uploadError) {
          logError(uploadError, { action: 'upload_file', productId, fileName });
          results.push({
            success: false,
            error: 'Failed to upload file',
            virus_scan_result: virusScanResult,
          });
          continue;
        }

        // Generate thumbnail for images
        let thumbnailUrl: string | undefined;
        if (this.isImageFile(file)) {
          const thumbnailResult = await this.generateThumbnail(file, productId, fileId);
          if (thumbnailResult.success) {
            thumbnailUrl = thumbnailResult.thumbnail_url;
          }
        }

        // Create file record
        const { data: fileRecord, error: fileError } = await this.supabase
          .from('product_files')
          .insert({
            id: fileId,
            product_id: productId,
            file_name: file.name,
            file_size: file.size,
            file_type: this.getFileType(file),
            mime_type: file.type,
            file_url: uploadData.path,
            thumbnail_url: thumbnailUrl,
            is_primary: false,
            version: '1.0.0',
          })
          .select()
          .single();

        if (fileError) {
          logError(fileError, { action: 'create_file_record', productId, fileId });
          results.push({
            success: false,
            error: 'Failed to create file record',
            virus_scan_result: virusScanResult,
          });
          continue;
        }

        results.push({
          success: true,
          file_id: fileId,
          file_url: uploadData.path,
          thumbnail_url: thumbnailUrl,
          virus_scan_result: virusScanResult,
        });

        logger.info('File uploaded successfully', { productId, fileId, fileName });
      } catch (error) {
        logError(error as Error, { action: 'upload_file', productId, fileName: file.name });
        results.push({
          success: false,
          error: 'File upload failed due to server error',
        });
      }
    }

    return results;
  }

  async uploadProductImages(productId: string, images: File[]): Promise<ProductUploadResult[]> {
    const results: ProductUploadResult[] = [];

    for (const image of images) {
      try {
        logger.info('Uploading product image', { productId, fileName: image.name });

        // Validate image file
        if (!this.isImageFile(image)) {
          results.push({
            success: false,
            error: 'File is not a valid image',
          });
          continue;
        }

        // Optimize image
        const optimizedImage = await this.optimizeImage(image);
        const imageId = nanoid();
        const fileExtension = image.name.split('.').pop() || 'jpg';
        const fileName = `${imageId}.${fileExtension}`;
        const imagePath = `products/${productId}/images/${fileName}`;

        // Upload original image
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from('product-images')
          .upload(imagePath, optimizedImage);

        if (uploadError) {
          logError(uploadError, { action: 'upload_image', productId, fileName });
          results.push({
            success: false,
            error: 'Failed to upload image',
          });
          continue;
        }

        // Generate thumbnail
        const thumbnailResult = await this.generateThumbnail(optimizedImage, productId, imageId);
        if (!thumbnailResult.success) {
          results.push({
            success: false,
            error: 'Failed to generate thumbnail',
          });
          continue;
        }

        // Create image record
        const { data: imageRecord, error: imageError } = await this.supabase
          .from('product_images')
          .insert({
            id: imageId,
            product_id: productId,
            image_url: uploadData.path,
            thumbnail_url: thumbnailResult.thumbnail_url,
            alt_text: image.name,
            sort_order: 0,
            is_primary: false,
          })
          .select()
          .single();

        if (imageError) {
          logError(imageError, { action: 'create_image_record', productId, imageId });
          results.push({
            success: false,
            error: 'Failed to create image record',
          });
          continue;
        }

        results.push({
          success: true,
          file_id: imageId,
          file_url: uploadData.path,
          thumbnail_url: thumbnailResult.thumbnail_url,
          image_optimization: {
            original_size: image.size,
            optimized_size: optimizedImage.size,
            compression_ratio: (image.size - optimizedImage.size) / image.size,
          },
        });

        logger.info('Image uploaded successfully', { productId, imageId, fileName });
      } catch (error) {
        logError(error as Error, { action: 'upload_image', productId, fileName: image.name });
        results.push({
          success: false,
          error: 'Image upload failed due to server error',
        });
      }
    }

    return results;
  }

  // =============================================
  // PRODUCT VERSIONING
  // =============================================

  async createProductVersion(productId: string, request: ProductVersionRequest, userId: string): Promise<{ success: boolean; version?: ProductVersion; error?: string }> {
    try {
      logger.info('Creating product version', { productId, version: request.version, userId });

      // Check if user owns the product
      const { data: product } = await this.supabase
        .from('products')
        .select('seller_id')
        .eq('id', productId)
        .single();

      if (!product || product.seller_id !== userId) {
        return { success: false, error: 'Product not found or access denied' };
      }

      // Upload version file
      const uploadResult = await this.uploadProductFiles(productId, [request.file]);
      if (!uploadResult[0]?.success) {
        return { success: false, error: 'Failed to upload version file' };
      }

      // Create version record
      const { data: version, error } = await this.supabase
        .from('product_versions')
        .insert({
          product_id: productId,
          version: request.version,
          changelog: request.changelog,
          file_url: uploadResult[0].file_url!,
          file_size: request.file.size,
          is_active: true,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        logError(error, { action: 'create_product_version', productId });
        return { success: false, error: 'Failed to create version record' };
      }

      // Update product version
      await this.supabase
        .from('products')
        .update({ version: request.version })
        .eq('id', productId);

      logger.info('Product version created successfully', { productId, version: request.version });
      return { success: true, version: version as ProductVersion };
    } catch (error) {
      logError(error as Error, { action: 'create_product_version', productId });
      return { success: false, error: 'Failed to create product version due to server error' };
    }
  }

  async getProductVersions(productId: string): Promise<ProductVersion[]> {
    try {
      const { data: versions, error } = await this.supabase
        .from('product_versions')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        logError(error, { action: 'get_product_versions', productId });
        return [];
      }

      return versions as ProductVersion[];
    } catch (error) {
      logError(error as Error, { action: 'get_product_versions', productId });
      return [];
    }
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  async createBulkOperation(
    operationType: 'update' | 'delete' | 'activate' | 'deactivate' | 'archive',
    productIds: string[],
    parameters: Record<string, unknown>,
    userId: string
  ): Promise<{ success: boolean; operationId?: string; error?: string }> {
    try {
      logger.info('Creating bulk operation', { operationType, productCount: productIds.length, userId });

      const operationId = nanoid();
      const { data: operation, error } = await this.supabase
        .from('bulk_operations')
        .insert({
          id: operationId,
          operation_type: operationType,
          product_ids: productIds,
          parameters,
          status: 'pending',
          created_by: userId,
          progress: 0,
        })
        .select()
        .single();

      if (error) {
        logError(error, { action: 'create_bulk_operation', userId });
        return { success: false, error: 'Failed to create bulk operation' };
      }

      // Process bulk operation asynchronously
      this.processBulkOperation(operationId);

      logger.info('Bulk operation created successfully', { operationId, userId });
      return { success: true, operationId };
    } catch (error) {
      logError(error as Error, { action: 'create_bulk_operation', userId });
      return { success: false, error: 'Failed to create bulk operation due to server error' };
    }
  }

  async processBulkOperation(operationId: string): Promise<void> {
    try {
      logger.info('Processing bulk operation', { operationId });

      const { data: operation, error } = await this.supabase
        .from('bulk_operations')
        .select('*')
        .eq('id', operationId)
        .single();

      if (error || !operation) {
        logError(error, { action: 'process_bulk_operation', operationId });
        return;
      }

      // Update status to processing
      await this.supabase
        .from('bulk_operations')
        .update({ status: 'processing' })
        .eq('id', operationId);

      const productIds = operation.product_ids;
      const totalProducts = productIds.length;
      let processedCount = 0;

      for (const productId of productIds) {
        try {
          switch (operation.operation_type) {
            case 'update':
              await this.updateProduct(productId, operation.parameters as UpdateProductRequest, operation.created_by);
              break;
            case 'delete':
              await this.deleteProduct(productId, operation.created_by);
              break;
            case 'activate':
              await this.updateProduct(productId, { status: 'active' }, operation.created_by);
              break;
            case 'deactivate':
              await this.updateProduct(productId, { status: 'inactive' }, operation.created_by);
              break;
            case 'archive':
              await this.updateProduct(productId, { status: 'archived' }, operation.created_by);
              break;
          }

          processedCount++;
          const progress = Math.round((processedCount / totalProducts) * 100);

          await this.supabase
            .from('bulk_operations')
            .update({ progress })
            .eq('id', operationId);
        } catch (error) {
          logError(error as Error, { action: 'process_bulk_operation_item', operationId, productId });
        }
      }

      // Mark as completed
      await this.supabase
        .from('bulk_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress: 100,
        })
        .eq('id', operationId);

      logger.info('Bulk operation completed', { operationId, processedCount, totalProducts });
    } catch (error) {
      logError(error as Error, { action: 'process_bulk_operation', operationId });

      await this.supabase
        .from('bulk_operations')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', operationId);
    }
  }

  // =============================================
  // SEARCH WITH FILTERS
  // =============================================

  async searchProducts(request: ProductSearchRequest): Promise<ProductSearchResult> {
    try {
      logger.info('Searching products', { filters: request.filters, userId: request.user_id });

      const { filters } = request;
      let query = this.supabase
        .from('products')
        .select(`
          *,
          files:product_files(*),
          images:product_images(*),
          stats:product_stats(*)
        `, { count: 'exact' });

      // Apply filters
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
      }

      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters.subcategory_id) {
        query = query.eq('subcategory_id', filters.subcategory_id);
      }

      if (filters.min_price !== undefined) {
        query = query.gte('price', filters.min_price);
      }

      if (filters.max_price !== undefined) {
        query = query.lte('price', filters.max_price);
      }

      if (filters.min_rating !== undefined) {
        query = query.gte('stats.average_rating', filters.min_rating);
      }

      if (filters.max_rating !== undefined) {
        query = query.lte('stats.average_rating', filters.max_rating);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.is_featured !== undefined) {
        query = query.eq('is_featured', filters.is_featured);
      }

      if (filters.is_on_sale !== undefined) {
        if (filters.is_on_sale) {
          query = query.not('sale_price', 'is', null);
        } else {
          query = query.is('sale_price', null);
        }
      }

      if (filters.seller_id) {
        query = query.eq('seller_id', filters.seller_id);
      }

      if (filters.shop_id) {
        query = query.eq('shop_id', filters.shop_id);
      }

      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after);
      }

      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before);
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        logError(error, { action: 'search_products' });
        return {
          products: [],
          total: 0,
          page: 1,
          limit: 20,
          total_pages: 0,
          filters_applied: filters,
          facets: {
            categories: [],
            price_ranges: [],
            ratings: [],
            tags: [],
          },
        };
      }

      const totalPages = Math.ceil((count || 0) / limit);

      // Generate facets if requested
      let facets = {
        categories: [],
        price_ranges: [],
        ratings: [],
        tags: [],
      };

      if (request.include_facets) {
        facets = await this.generateSearchFacets(filters);
      }

      logger.info('Product search completed', { 
        resultCount: products?.length || 0, 
        total: count || 0,
        page,
        limit 
      });

      return {
        products: products as Product[],
        total: count || 0,
        page,
        limit,
        total_pages: totalPages,
        filters_applied: filters,
        facets,
      };
    } catch (error) {
      logError(error as Error, { action: 'search_products' });
      return {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
        filters_applied: request.filters,
        facets: {
          categories: [],
          price_ranges: [],
          ratings: [],
          tags: [],
        },
      };
    }
  }

  // =============================================
  // RECOMMENDATION ALGORITHM
  // =============================================

  async getProductRecommendations(request: ProductRecommendationRequest): Promise<ProductRecommendation[]> {
    try {
      logger.info('Generating product recommendations', { 
        userId: request.user_id, 
        productId: request.product_id,
        algorithm: request.algorithm 
      });

      const algorithm = request.algorithm || 'hybrid';
      const limit = request.limit || 10;

      let recommendations: ProductRecommendation[] = [];

      switch (algorithm) {
        case 'collaborative':
          recommendations = await this.getCollaborativeRecommendations(request.user_id!, limit);
          break;
        case 'content_based':
          recommendations = await this.getContentBasedRecommendations(request.product_id!, limit);
          break;
        case 'hybrid':
          const collaborative = await this.getCollaborativeRecommendations(request.user_id!, Math.ceil(limit / 2));
          const contentBased = await this.getContentBasedRecommendations(request.product_id!, Math.ceil(limit / 2));
          recommendations = this.mergeRecommendations(collaborative, contentBased, limit);
          break;
      }

      logger.info('Product recommendations generated', { 
        count: recommendations.length,
        algorithm 
      });

      return recommendations;
    } catch (error) {
      logError(error as Error, { action: 'get_product_recommendations' });
      return [];
    }
  }

  private async getCollaborativeRecommendations(userId: string, limit: number): Promise<ProductRecommendation[]> {
    try {
      // Get user's purchase history
      const { data: purchases } = await this.supabase
        .from('purchases')
        .select('product_id')
        .eq('buyer_id', userId);

      if (!purchases || purchases.length === 0) {
        return [];
      }

      const purchasedProductIds = purchases.map((p: { product_id: string }) => p.product_id);

      // Find users with similar purchase patterns
      const { data: similarUsers } = await this.supabase
        .from('purchases')
        .select('buyer_id, product_id')
        .in('product_id', purchasedProductIds)
        .neq('buyer_id', userId);

      if (!similarUsers || similarUsers.length === 0) {
        return [];
      }

      // Get products purchased by similar users
      const similarUserIds = [...new Set(similarUsers.map((u: { buyer_id: string }) => u.buyer_id))];
      const { data: recommendedPurchases } = await this.supabase
        .from('purchases')
        .select('product_id')
        .in('buyer_id', similarUserIds)
        .not('product_id', 'in', `(${purchasedProductIds.join(',')})`);

      if (!recommendedPurchases || recommendedPurchases.length === 0) {
        return [];
      }

      // Calculate recommendation scores
      const productScores = new Map<string, number>();
      for (const purchase of recommendedPurchases) {
        const currentScore = productScores.get(purchase.product_id) || 0;
        productScores.set(purchase.product_id, currentScore + 1);
      }

      // Get product details for top recommendations
      const topProductIds = Array.from(productScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([productId]) => productId);

      const { data: products } = await this.supabase
        .from('products')
        .select('*')
        .in('id', topProductIds)
        .eq('status', 'active');

      if (!products) {
        return [];
      }

      return products.map((product: any) => ({
        product: product as Product,
        score: productScores.get(product.id) || 0,
        reason: 'Users with similar preferences also purchased this',
        algorithm: 'collaborative' as const,
      }));
    } catch (error) {
      logError(error as Error, { action: 'get_collaborative_recommendations' });
      return [];
    }
  }

  private async getContentBasedRecommendations(productId: string, limit: number): Promise<ProductRecommendation[]> {
    try {
      // Get the source product
      const { data: sourceProduct } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (!sourceProduct) {
        return [];
      }

      // Find products with similar characteristics
      const { data: similarProducts } = await this.supabase
        .from('products')
        .select('*')
        .eq('category_id', sourceProduct.category_id)
        .eq('status', 'active')
        .neq('id', productId)
        .limit(limit * 2); // Get more to filter by tags

      if (!similarProducts) {
        return [];
      }

      // Calculate similarity scores based on tags and category
      const recommendations = similarProducts
        .map((product: any) => {
          const tagSimilarity = this.calculateTagSimilarity(sourceProduct.tags, product.tags);
          const categorySimilarity = product.category_id === sourceProduct.category_id ? 1 : 0;
          const score = (tagSimilarity * 0.7) + (categorySimilarity * 0.3);

          return {
            product: product as Product,
            score,
            reason: 'Similar products in the same category',
            algorithm: 'content_based' as const,
          };
        })
        .filter((rec: any) => rec.score > 0.1)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      logError(error as Error, { action: 'get_content_based_recommendations' });
      return [];
    }
  }

  private mergeRecommendations(
    collaborative: ProductRecommendation[],
    contentBased: ProductRecommendation[],
    limit: number
  ): ProductRecommendation[] {
    const merged = new Map<string, ProductRecommendation>();

    // Add collaborative recommendations with weight 0.6
    for (const rec of collaborative) {
      merged.set(rec.product.id, {
        ...rec,
        score: rec.score * 0.6,
        reason: 'Recommended based on similar users',
      });
    }

    // Add content-based recommendations with weight 0.4
    for (const rec of contentBased) {
      const existing = merged.get(rec.product.id);
      if (existing) {
        existing.score += rec.score * 0.4;
        existing.reason = 'Recommended based on similar users and content';
      } else {
        merged.set(rec.product.id, {
          ...rec,
          score: rec.score * 0.4,
          reason: 'Recommended based on similar content',
        });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private validateProductRequest(request: CreateProductRequest): { valid: boolean; error?: string } {
    if (!request.title || !request.description || !request.price) {
      return { valid: false, error: 'Title, description, and price are required' };
    }

    if (request.price < 0) {
      return { valid: false, error: 'Price must be positive' };
    }

    if (request.sale_price && request.sale_price >= request.price) {
      return { valid: false, error: 'Sale price must be less than regular price' };
    }

    return { valid: true };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async getDefaultShopId(sellerId: string): Promise<string> {
    const { data: shop } = await this.supabase
      .from('shops')
      .select('id')
      .eq('owner_id', sellerId)
      .single();

    return shop?.id || '';
  }

  private async createProductStats(productId: string): Promise<void> {
    await this.supabase
      .from('product_stats')
      .insert({
        product_id: productId,
        view_count: 0,
        download_count: 0,
        purchase_count: 0,
        favorite_count: 0,
        review_count: 0,
        average_rating: 0,
        total_revenue: 0,
      });
  }

  private async scanFileForViruses(file: File): Promise<{ clean: boolean; threats: string[] }> {
    // This would integrate with a virus scanning service
    // For now, we'll simulate a clean scan
    return { clean: true, threats: [] };
  }

  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  private getFileType(file: File): FileType {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.includes('pdf') || file.type.includes('document')) return 'document';
    if (file.type.includes('zip') || file.type.includes('archive')) return 'archive';
    if (file.type.includes('javascript') || file.type.includes('code')) return 'code';
    return 'other';
  }

  private async generateThumbnail(file: File, productId: string, fileId: string): Promise<{ success: boolean; thumbnail_url?: string }> {
    try {
      // This would use a service like Sharp or ImageMagick to generate thumbnails
      // For now, we'll return a placeholder
      return {
        success: true,
        thumbnail_url: `products/${productId}/thumbnails/${fileId}_thumb.jpg`,
      };
    } catch (error) {
      logError(error as Error, { action: 'generate_thumbnail', productId, fileId });
      return { success: false };
    }
  }

  private async optimizeImage(file: File): Promise<File> {
    // This would use a service to optimize images
    // For now, we'll return the original file
    return file;
  }

  private async deleteProductFiles(productId: string): Promise<void> {
    try {
      // Delete files from storage
      const { data: files } = await this.supabase
        .from('product_files')
        .select('file_url')
        .eq('product_id', productId);

      if (files) {
        for (const file of files) {
          await this.supabase.storage
            .from('product-files')
            .remove([file.file_url]);
        }
      }

      // Delete file records
      await this.supabase
        .from('product_files')
        .delete()
        .eq('product_id', productId);
    } catch (error) {
      logError(error as Error, { action: 'delete_product_files', productId });
    }
  }

  private calculateTagSimilarity(tags1: string[], tags2: string[]): number {
    if (!tags1.length || !tags2.length) return 0;

    const set1 = new Set(tags1);
    const set2 = new Set(tags2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private async generateSearchFacets(filters: ProductSearchFilters): Promise<any> {
    // This would generate search facets for filtering
    // For now, we'll return empty facets
    return {
      categories: [],
      price_ranges: [],
      ratings: [],
      tags: [],
    };
  }
}
