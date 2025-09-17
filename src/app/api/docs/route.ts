import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'Digital Marketplace API',
      version: '1.0.0',
      description: 'RESTful API for a digital products marketplace with user authentication, product management, payments, and file delivery.',
      contact: {
        name: 'API Support',
        email: 'support@marketplace.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Session-ID',
        },
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            seller_id: { type: 'string', format: 'uuid' },
            shop_id: { type: 'string', format: 'uuid' },
            category_id: { type: 'integer' },
            subcategory_id: { type: 'integer' },
            title: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            short_description: { type: 'string' },
            price: { type: 'number', format: 'decimal' },
            sale_price: { type: 'number', format: 'decimal' },
            currency: { type: 'string', default: 'USD' },
            product_type: { type: 'string', enum: ['digital', 'physical', 'service'] },
            status: { type: 'string', enum: ['draft', 'active', 'inactive', 'archived'] },
            is_featured: { type: 'boolean' },
            is_digital: { type: 'boolean' },
            is_downloadable: { type: 'boolean' },
            download_limit: { type: 'integer' },
            download_expiry_days: { type: 'integer' },
            version: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            seo: { type: 'object' },
            files: { type: 'array', items: { $ref: '#/components/schemas/ProductFile' } },
            images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
            stats: { $ref: '#/components/schemas/ProductStats' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        ProductFile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            product_id: { type: 'string', format: 'uuid' },
            file_name: { type: 'string' },
            file_size: { type: 'integer' },
            file_type: { type: 'string', enum: ['image', 'video', 'audio', 'document', 'archive', 'code', 'other'] },
            mime_type: { type: 'string' },
            file_url: { type: 'string' },
            thumbnail_url: { type: 'string' },
            is_primary: { type: 'boolean' },
            version: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        ProductImage: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            product_id: { type: 'string', format: 'uuid' },
            image_url: { type: 'string' },
            thumbnail_url: { type: 'string' },
            alt_text: { type: 'string' },
            sort_order: { type: 'integer' },
            is_primary: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        ProductStats: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            product_id: { type: 'string', format: 'uuid' },
            view_count: { type: 'integer' },
            download_count: { type: 'integer' },
            purchase_count: { type: 'integer' },
            favorite_count: { type: 'integer' },
            review_count: { type: 'integer' },
            average_rating: { type: 'number', format: 'decimal' },
            total_revenue: { type: 'number', format: 'decimal' },
            last_updated: { type: 'string', format: 'date-time' },
          },
        },
        ProductSearchResult: {
          type: 'object',
          properties: {
            products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total_pages: { type: 'integer' },
            filters_applied: { $ref: '#/components/schemas/ProductSearchFilters' },
            facets: { $ref: '#/components/schemas/SearchFacets' },
          },
        },
        ProductSearchFilters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            category_id: { type: 'integer' },
            subcategory_id: { type: 'integer' },
            min_price: { type: 'number', format: 'decimal' },
            max_price: { type: 'number', format: 'decimal' },
            min_rating: { type: 'number', format: 'decimal' },
            max_rating: { type: 'number', format: 'decimal' },
            tags: { type: 'array', items: { type: 'string' } },
            file_types: { type: 'array', items: { type: 'string' } },
            status: { type: 'array', items: { type: 'string' } },
            is_featured: { type: 'boolean' },
            is_on_sale: { type: 'boolean' },
            seller_id: { type: 'string', format: 'uuid' },
            shop_id: { type: 'string', format: 'uuid' },
            created_after: { type: 'string', format: 'date-time' },
            created_before: { type: 'string', format: 'date-time' },
            sort_by: { type: 'string', enum: ['price', 'rating', 'created_at', 'updated_at', 'popularity', 'name'] },
            sort_order: { type: 'string', enum: ['asc', 'desc'] },
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
          },
        },
        SearchFacets: {
          type: 'object',
          properties: {
            categories: { type: 'array', items: { $ref: '#/components/schemas/CategoryFacet' } },
            price_ranges: { type: 'array', items: { $ref: '#/components/schemas/PriceRangeFacet' } },
            ratings: { type: 'array', items: { $ref: '#/components/schemas/RatingFacet' } },
            tags: { type: 'array', items: { $ref: '#/components/schemas/TagFacet' } },
          },
        },
        CategoryFacet: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            count: { type: 'integer' },
          },
        },
        PriceRangeFacet: {
          type: 'object',
          properties: {
            min: { type: 'number', format: 'decimal' },
            max: { type: 'number', format: 'decimal' },
            count: { type: 'integer' },
          },
        },
        RatingFacet: {
          type: 'object',
          properties: {
            rating: { type: 'number', format: 'decimal' },
            count: { type: 'integer' },
          },
        },
        TagFacet: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            count: { type: 'integer' },
          },
        },
        CreateProductRequest: {
          type: 'object',
          required: ['title', 'description', 'price', 'product_type', 'is_digital', 'is_downloadable'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            short_description: { type: 'string' },
            price: { type: 'number', format: 'decimal' },
            sale_price: { type: 'number', format: 'decimal' },
            currency: { type: 'string', default: 'USD' },
            category_id: { type: 'integer' },
            subcategory_id: { type: 'integer' },
            product_type: { type: 'string', enum: ['digital', 'physical', 'service'] },
            is_digital: { type: 'boolean' },
            is_downloadable: { type: 'boolean' },
            download_limit: { type: 'integer' },
            download_expiry_days: { type: 'integer' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            seo: { type: 'object' },
          },
        },
        UpdateProductRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            short_description: { type: 'string' },
            price: { type: 'number', format: 'decimal' },
            sale_price: { type: 'number', format: 'decimal' },
            currency: { type: 'string' },
            category_id: { type: 'integer' },
            subcategory_id: { type: 'integer' },
            product_type: { type: 'string', enum: ['digital', 'physical', 'service'] },
            status: { type: 'string', enum: ['draft', 'active', 'inactive', 'archived'] },
            is_featured: { type: 'boolean' },
            is_digital: { type: 'boolean' },
            is_downloadable: { type: 'boolean' },
            download_limit: { type: 'integer' },
            download_expiry_days: { type: 'integer' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            seo: { type: 'object' },
          },
        },
        PurchaseRequest: {
          type: 'object',
          required: ['payment_method'],
          properties: {
            payment_method: { type: 'string', enum: ['stripe', 'yookassa', 'crypto'] },
            currency: { type: 'string', default: 'USD' },
            referral_code: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
        DownloadResponse: {
          type: 'object',
          properties: {
            download_url: { type: 'string' },
            file_name: { type: 'string' },
            file_size: { type: 'integer' },
            expires_at: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    paths: {
      '/api/products': {
        get: {
          summary: 'Get products with pagination, filters, and sorting',
          description: 'Retrieve a paginated list of products with optional filtering and sorting capabilities.',
          tags: ['Products'],
          parameters: [
            { $ref: '#/components/parameters/QueryParam' },
            { $ref: '#/components/parameters/CategoryIdParam' },
            { $ref: '#/components/parameters/SubcategoryIdParam' },
            { $ref: '#/components/parameters/MinPriceParam' },
            { $ref: '#/components/parameters/MaxPriceParam' },
            { $ref: '#/components/parameters/MinRatingParam' },
            { $ref: '#/components/parameters/MaxRatingParam' },
            { $ref: '#/components/parameters/TagsParam' },
            { $ref: '#/components/parameters/FileTypesParam' },
            { $ref: '#/components/parameters/StatusParam' },
            { $ref: '#/components/parameters/IsFeaturedParam' },
            { $ref: '#/components/parameters/IsOnSaleParam' },
            { $ref: '#/components/parameters/SellerIdParam' },
            { $ref: '#/components/parameters/ShopIdParam' },
            { $ref: '#/components/parameters/CreatedAfterParam' },
            { $ref: '#/components/parameters/CreatedBeforeParam' },
            { $ref: '#/components/parameters/SortByParam' },
            { $ref: '#/components/parameters/SortOrderParam' },
            { $ref: '#/components/parameters/PageParam' },
            { $ref: '#/components/parameters/LimitParam' },
            { $ref: '#/components/parameters/IncludeFacetsParam' },
          ],
          responses: {
            '200': {
              description: 'Products retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ProductSearchResult' },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create a new product',
          description: 'Create a new product. Requires seller authentication.',
          tags: ['Products'],
          security: [{ bearerAuth: [] }, { sessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: { $ref: '#/components/schemas/CreateProductRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Product created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      product: { $ref: '#/components/schemas/Product' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '403': {
              description: 'Insufficient permissions',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/products/{id}': {
        get: {
          summary: 'Get a specific product',
          description: 'Retrieve details of a specific product by ID.',
          tags: ['Products'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Product ID',
            },
          ],
          responses: {
            '200': {
              description: 'Product retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      product: { $ref: '#/components/schemas/Product' },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Product not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        put: {
          summary: 'Update a product',
          description: 'Update an existing product. Requires seller authentication and ownership.',
          tags: ['Products'],
          security: [{ bearerAuth: [] }, { sessionAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Product ID',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: { $ref: '#/components/schemas/UpdateProductRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Product updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      product: { $ref: '#/components/schemas/Product' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '403': {
              description: 'Insufficient permissions',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Product not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        delete: {
          summary: 'Delete a product',
          description: 'Delete an existing product. Requires seller authentication and ownership.',
          tags: ['Products'],
          security: [{ bearerAuth: [] }, { sessionAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Product ID',
            },
          ],
          responses: {
            '200': {
              description: 'Product deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '403': {
              description: 'Insufficient permissions',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Product not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/products/{id}/purchase': {
        post: {
          summary: 'Purchase a product',
          description: 'Initiate a purchase for a specific product. Requires buyer authentication.',
          tags: ['Products'],
          security: [{ bearerAuth: [] }, { sessionAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Product ID',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PurchaseRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Purchase initiated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      payment_intent: { type: 'object' },
                      product: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                          price: { type: 'number' },
                          currency: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Product not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/products/{id}/download': {
        get: {
          summary: 'Download a product',
          description: 'Download a purchased product. Requires buyer authentication and ownership.',
          tags: ['Products'],
          security: [{ bearerAuth: [] }, { sessionAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Product ID',
            },
            {
              name: 'file_id',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Specific file ID to download',
            },
            {
              name: 'version',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Specific version to download',
            },
          ],
          responses: {
            '200': {
              description: 'Download link generated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DownloadResponse' },
                },
              },
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '403': {
              description: 'Access denied - product not owned',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Product or file not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '410': {
              description: 'Download link expired',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '429': {
              description: 'Download limit exceeded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
    },
    parameters: {
      QueryParam: {
        name: 'query',
        in: 'query',
        description: 'Search query for product title and description',
        required: false,
        schema: { type: 'string' },
      },
      CategoryIdParam: {
        name: 'category_id',
        in: 'query',
        description: 'Filter by category ID',
        required: false,
        schema: { type: 'integer' },
      },
      SubcategoryIdParam: {
        name: 'subcategory_id',
        in: 'query',
        description: 'Filter by subcategory ID',
        required: false,
        schema: { type: 'integer' },
      },
      MinPriceParam: {
        name: 'min_price',
        in: 'query',
        description: 'Minimum price filter',
        required: false,
        schema: { type: 'number', format: 'decimal' },
      },
      MaxPriceParam: {
        name: 'max_price',
        in: 'query',
        description: 'Maximum price filter',
        required: false,
        schema: { type: 'number', format: 'decimal' },
      },
      MinRatingParam: {
        name: 'min_rating',
        in: 'query',
        description: 'Minimum rating filter',
        required: false,
        schema: { type: 'number', format: 'decimal' },
      },
      MaxRatingParam: {
        name: 'max_rating',
        in: 'query',
        description: 'Maximum rating filter',
        required: false,
        schema: { type: 'number', format: 'decimal' },
      },
      TagsParam: {
        name: 'tags',
        in: 'query',
        description: 'Filter by tags (comma-separated)',
        required: false,
        schema: { type: 'string' },
      },
      FileTypesParam: {
        name: 'file_types',
        in: 'query',
        description: 'Filter by file types (comma-separated)',
        required: false,
        schema: { type: 'string' },
      },
      StatusParam: {
        name: 'status',
        in: 'query',
        description: 'Filter by status (comma-separated)',
        required: false,
        schema: { type: 'string' },
      },
      IsFeaturedParam: {
        name: 'is_featured',
        in: 'query',
        description: 'Filter by featured products',
        required: false,
        schema: { type: 'boolean' },
      },
      IsOnSaleParam: {
        name: 'is_on_sale',
        in: 'query',
        description: 'Filter by products on sale',
        required: false,
        schema: { type: 'boolean' },
      },
      SellerIdParam: {
        name: 'seller_id',
        in: 'query',
        description: 'Filter by seller ID',
        required: false,
        schema: { type: 'string', format: 'uuid' },
      },
      ShopIdParam: {
        name: 'shop_id',
        in: 'query',
        description: 'Filter by shop ID',
        required: false,
        schema: { type: 'string', format: 'uuid' },
      },
      CreatedAfterParam: {
        name: 'created_after',
        in: 'query',
        description: 'Filter by creation date (after)',
        required: false,
        schema: { type: 'string', format: 'date-time' },
      },
      CreatedBeforeParam: {
        name: 'created_before',
        in: 'query',
        description: 'Filter by creation date (before)',
        required: false,
        schema: { type: 'string', format: 'date-time' },
      },
      SortByParam: {
        name: 'sort_by',
        in: 'query',
        description: 'Sort by field',
        required: false,
        schema: { type: 'string', enum: ['price', 'rating', 'created_at', 'updated_at', 'popularity', 'name'] },
      },
      SortOrderParam: {
        name: 'sort_order',
        in: 'query',
        description: 'Sort order',
        required: false,
        schema: { type: 'string', enum: ['asc', 'desc'] },
      },
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        schema: { type: 'integer', default: 1 },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        required: false,
        schema: { type: 'integer', default: 20 },
      },
      IncludeFacetsParam: {
        name: 'include_facets',
        in: 'query',
        description: 'Include search facets',
        required: false,
        schema: { type: 'boolean' },
      },
    },
  };

  return NextResponse.json(swaggerDocument);
}
