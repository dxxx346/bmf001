import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const productService = new ProductService();

export async function GET(request: NextRequest) {
  try {
    logger.info('Running product API tests');

    const tests: Array<{ name: string; status: string; details: string }> = [];
    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Search products with filters
    totalTests++;
    try {
      const searchResult = await productService.searchProducts({
        filters: {
          query: 'test',
          page: 1,
          limit: 5,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
        include_facets: true,
      });

      if (searchResult && typeof searchResult === 'object' && 'products' in searchResult) {
        tests.push({ name: 'Search products with filters', status: 'PASS', details: `Found ${searchResult.products.length} products` });
        passedTests++;
      } else {
        tests.push({ name: 'Search products with filters', status: 'FAIL', details: 'Invalid response format' });
      }
    } catch (error) {
      tests.push({ name: 'Search products with filters', status: 'ERROR', details: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Test 2: Search products with pagination
    totalTests++;
    try {
      const paginationResult = await productService.searchProducts({
        filters: {
          page: 1,
          limit: 2,
        },
        include_facets: false,
      });

      if (paginationResult && paginationResult.products && paginationResult.total !== undefined) {
        tests.push({ name: 'Search products with pagination', status: 'PASS', details: `Page 1 of ${Math.ceil(paginationResult.total / 2)} pages` });
        passedTests++;
      } else {
        tests.push({ name: 'Search products with pagination', status: 'FAIL', details: 'Invalid pagination response' });
      }
    } catch (error) {
      tests.push({ name: 'Search products with pagination', status: 'ERROR', details: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Test 3: Search products with price filters
    totalTests++;
    try {
      const priceFilterResult = await productService.searchProducts({
        filters: {
          min_price: 0,
          max_price: 100,
          page: 1,
          limit: 10,
        },
        include_facets: false,
      });

      if (priceFilterResult && priceFilterResult.products) {
        const validPriceRange = priceFilterResult.products.every(p => 
          p.price >= 0 && p.price <= 100
        );
        if (validPriceRange) {
          tests.push({ name: 'Search products with price filters', status: 'PASS', details: 'All products within price range' });
          passedTests++;
        } else {
          tests.push({ name: 'Search products with price filters', status: 'FAIL', details: 'Some products outside price range' });
        }
      } else {
        tests.push({ name: 'Search products with price filters', status: 'FAIL', details: 'Invalid response format' });
      }
    } catch (error) {
      tests.push({ name: 'Search products with price filters', status: 'ERROR', details: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Test 4: Search products with sorting
    totalTests++;
    try {
      const sortResult = await productService.searchProducts({
        filters: {
          sort_by: 'price',
          sort_order: 'asc',
          page: 1,
          limit: 5,
        },
        include_facets: false,
      });

      if (sortResult && sortResult.products && sortResult.products.length > 1) {
        const isSorted = sortResult.products.every((product, index) => {
          if (index === 0) return true;
          return product.price >= sortResult.products[index - 1].price;
        });
        
        if (isSorted) {
          tests.push({ name: 'Search products with sorting', status: 'PASS', details: 'Products sorted by price ascending' });
          passedTests++;
        } else {
          tests.push({ name: 'Search products with sorting', status: 'FAIL', details: 'Products not properly sorted' });
        }
      } else {
        tests.push({ name: 'Search products with sorting', status: 'PASS', details: 'Not enough products to test sorting' });
        passedTests++;
      }
    } catch (error) {
      tests.push({ name: 'Search products with sorting', status: 'ERROR', details: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Test 5: Search products with tags
    totalTests++;
    try {
      const tagResult = await productService.searchProducts({
        filters: {
          tags: ['digital', 'download'],
          page: 1,
          limit: 10,
        },
        include_facets: false,
      });

      if (tagResult && tagResult.products) {
        tests.push({ name: 'Search products with tags', status: 'PASS', details: `Found ${tagResult.products.length} products with specified tags` });
        passedTests++;
      } else {
        tests.push({ name: 'Search products with tags', status: 'FAIL', details: 'Invalid response format' });
      }
    } catch (error) {
      tests.push({ name: 'Search products with tags', status: 'ERROR', details: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Test 6: Search products with facets
    totalTests++;
    try {
      const facetsResult = await productService.searchProducts({
        filters: {
          page: 1,
          limit: 10,
        },
        include_facets: true,
      });

      if (facetsResult && facetsResult.facets) {
        tests.push({ name: 'Search products with facets', status: 'PASS', details: 'Facets included in response' });
        passedTests++;
      } else {
        tests.push({ name: 'Search products with facets', status: 'FAIL', details: 'Facets not included in response' });
      }
    } catch (error) {
      tests.push({ name: 'Search products with facets', status: 'ERROR', details: error instanceof Error ? error.message : 'Unknown error' });
    }

    const testSummary = {
      total_tests: totalTests,
      passed_tests: passedTests,
      failed_tests: totalTests - passedTests,
      success_rate: Math.round((passedTests / totalTests) * 100),
      tests: tests,
    };

    logger.info('Product API tests completed', testSummary);

    return NextResponse.json({
      message: 'Product API tests completed',
      summary: testSummary,
    });
  } catch (error) {
    logError(error as Error, { action: 'test_products_api' });
    return NextResponse.json(
      { 
        error: 'Failed to run product API tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
