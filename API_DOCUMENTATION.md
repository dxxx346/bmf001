# Digital Marketplace API Documentation

## Overview

This document provides comprehensive information about the Digital Marketplace RESTful API, which enables users to manage digital products, handle payments, and deliver files securely.

## Base URL

```
http://localhost:3000/api
```

## Authentication

The API supports two authentication methods:

1. **Bearer Token**: Include `Authorization: Bearer <token>` header
2. **Session ID**: Include `X-Session-ID: <session_id>` header

## API Endpoints

### Products

#### GET /api/products

Retrieve a paginated list of products with optional filtering and sorting.

**Query Parameters:**
- `query` (string): Search query for product title and description
- `category_id` (integer): Filter by category ID
- `subcategory_id` (integer): Filter by subcategory ID
- `min_price` (number): Minimum price filter
- `max_price` (number): Maximum price filter
- `min_rating` (number): Minimum rating filter
- `max_rating` (number): Maximum rating filter
- `tags` (string): Comma-separated list of tags
- `file_types` (string): Comma-separated list of file types
- `status` (string): Comma-separated list of statuses
- `is_featured` (boolean): Filter by featured products
- `is_on_sale` (boolean): Filter by products on sale
- `seller_id` (uuid): Filter by seller ID
- `shop_id` (uuid): Filter by shop ID
- `created_after` (datetime): Filter by creation date (after)
- `created_before` (datetime): Filter by creation date (before)
- `sort_by` (string): Sort by field (price, rating, created_at, updated_at, popularity, name)
- `sort_order` (string): Sort order (asc, desc)
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20)
- `include_facets` (boolean): Include search facets

**Example Request:**
```bash
curl "http://localhost:3000/api/products?query=digital&min_price=10&max_price=100&page=1&limit=10"
```

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "title": "Digital Product",
      "description": "Product description",
      "price": 29.99,
      "currency": "USD",
      "status": "active",
      "tags": ["digital", "download"],
      "files": [...],
      "images": [...],
      "stats": {...}
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "total_pages": 5,
  "filters_applied": {...},
  "facets": {...}
}
```

#### POST /api/products

Create a new product. Requires seller authentication.

**Authentication:** Required (Seller)

**Request Body:** multipart/form-data
- `title` (string, required): Product title
- `description` (string, required): Product description
- `price` (number, required): Product price
- `product_type` (string, required): digital, physical, or service
- `is_digital` (boolean, required): Whether product is digital
- `is_downloadable` (boolean, required): Whether product is downloadable
- `currency` (string): Currency code (default: USD)
- `category_id` (integer): Category ID
- `tags` (string): Comma-separated tags
- `files[]` (file): Product files
- `images[]` (file): Product images

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/products" \
  -H "Authorization: Bearer <token>" \
  -F "title=My Digital Product" \
  -F "description=Product description" \
  -F "price=29.99" \
  -F "product_type=digital" \
  -F "is_digital=true" \
  -F "is_downloadable=true" \
  -F "tags=digital,download" \
  -F "files[]=@product.zip"
```

**Response:**
```json
{
  "message": "Product created successfully",
  "product": {
    "id": "uuid",
    "title": "My Digital Product",
    "description": "Product description",
    "price": 29.99,
    "status": "draft",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/products/{id}

Retrieve details of a specific product.

**Path Parameters:**
- `id` (uuid): Product ID

**Example Request:**
```bash
curl "http://localhost:3000/api/products/123e4567-e89b-12d3-a456-426614174000"
```

**Response:**
```json
{
  "product": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Digital Product",
    "description": "Product description",
    "price": 29.99,
    "files": [...],
    "images": [...],
    "stats": {...}
  }
}
```

#### PUT /api/products/{id}

Update an existing product. Requires seller authentication and ownership.

**Authentication:** Required (Seller)

**Path Parameters:**
- `id` (uuid): Product ID

**Request Body:** multipart/form-data (same as POST)

**Example Request:**
```bash
curl -X PUT "http://localhost:3000/api/products/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <token>" \
  -F "title=Updated Product Title" \
  -F "price=39.99"
```

**Response:**
```json
{
  "message": "Product updated successfully",
  "product": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Updated Product Title",
    "price": 39.99,
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### DELETE /api/products/{id}

Delete an existing product. Requires seller authentication and ownership.

**Authentication:** Required (Seller)

**Path Parameters:**
- `id` (uuid): Product ID

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/products/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "message": "Product deleted successfully"
}
```

#### POST /api/products/{id}/purchase

Initiate a purchase for a specific product. Requires buyer authentication.

**Authentication:** Required (Buyer)

**Path Parameters:**
- `id` (uuid): Product ID

**Request Body:**
```json
{
  "payment_method": "stripe",
  "currency": "USD",
  "referral_code": "optional_referral_code",
  "metadata": {
    "custom_field": "value"
  }
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/products/123e4567-e89b-12d3-a456-426614174000/purchase" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "stripe",
    "currency": "USD"
  }'
```

**Response:**
```json
{
  "message": "Payment intent created successfully",
  "payment_intent": {
    "id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_xyz",
    "status": "requires_payment_method"
  },
  "product": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Digital Product",
    "price": 29.99,
    "currency": "USD"
  }
}
```

#### GET /api/products/{id}/download

Download a purchased product. Requires buyer authentication and ownership.

**Authentication:** Required (Buyer)

**Path Parameters:**
- `id` (uuid): Product ID

**Query Parameters:**
- `file_id` (string, optional): Specific file ID to download
- `version` (string, optional): Specific version to download

**Example Request:**
```bash
curl "http://localhost:3000/api/products/123e4567-e89b-12d3-a456-426614174000/download" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "download_url": "https://storage.supabase.co/object/sign/...",
  "file_name": "product_files.zip",
  "file_size": 1024000,
  "expires_at": "2024-01-01T01:00:00Z"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": [
    {
      "field": "price",
      "message": "Price must be a positive number"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Product not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Authentication endpoints**: 5 requests per minute per IP
- **Product endpoints**: 100 requests per minute per user
- **Download endpoints**: 10 requests per minute per user

## Pagination

All list endpoints support pagination:
- `page`: Page number (starts from 1)
- `limit`: Items per page (max 100)
- `total`: Total number of items
- `total_pages`: Total number of pages

## Filtering and Sorting

### Available Filters
- **Text search**: `query` parameter searches in title and description
- **Price range**: `min_price` and `max_price`
- **Rating range**: `min_rating` and `max_rating`
- **Category**: `category_id` and `subcategory_id`
- **Tags**: `tags` (comma-separated)
- **Status**: `status` (comma-separated)
- **Date range**: `created_after` and `created_before`
- **Boolean filters**: `is_featured`, `is_on_sale`

### Available Sort Fields
- `price`: Sort by price
- `rating`: Sort by average rating
- `created_at`: Sort by creation date
- `updated_at`: Sort by last update date
- `popularity`: Sort by popularity score
- `name`: Sort by product name

### Sort Order
- `asc`: Ascending order
- `desc`: Descending order (default)

## Interactive Documentation

Visit `/api/swagger` for interactive API documentation with Swagger UI, where you can:
- Test endpoints directly in the browser
- View detailed request/response schemas
- Try different authentication methods
- Explore all available parameters

## Testing

Run the API tests to verify functionality:

```bash
curl "http://localhost:3000/api/test-products"
```

This will return a comprehensive test report showing which features are working correctly.

## Support

For API support and questions:
- Email: support@marketplace.com
- Documentation: `/api/swagger`
- Test endpoint: `/api/test-products`
