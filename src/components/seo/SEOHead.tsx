'use client'

import Head from 'next/head'
import { useRouter } from 'next/router'

export interface SEOProps {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product'
  author?: string
  publishedTime?: string
  modifiedTime?: string
  section?: string
  tags?: string[]
  price?: {
    amount: number
    currency: string
  }
  availability?: 'in stock' | 'out of stock' | 'preorder'
  brand?: string
  category?: string
  sku?: string
  gtin?: string
  mpn?: string
  condition?: 'new' | 'used' | 'refurbished'
  rating?: {
    value: number
    count: number
    bestRating?: number
    worstRating?: number
  }
  reviews?: {
    count: number
    averageRating: number
  }
  noindex?: boolean
  nofollow?: boolean
  canonical?: string
}

const defaultSEO = {
  title: 'Digital Marketplace - Buy and Sell Digital Products',
  description: 'Discover and purchase high-quality digital products from verified sellers. Join thousands of creators and buyers in our secure marketplace.',
  keywords: ['digital products', 'marketplace', 'buy online', 'sell digital', 'downloads'],
  type: 'website' as const,
  image: '/og-image.png',
}

export function SEOHead({
  title,
  description,
  keywords = [],
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  price,
  availability,
  brand,
  category,
  sku,
  gtin,
  mpn,
  condition,
  rating,
  reviews,
  noindex = false,
  nofollow = false,
  canonical
}: SEOProps) {
  const router = useRouter()
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourmarketplace.com'
  const currentUrl = url || `${siteUrl}${router.asPath}`
  
  const seoTitle = title ? `${title} | ${defaultSEO.title}` : defaultSEO.title
  const seoDescription = description || defaultSEO.description
  const seoImage = image ? `${siteUrl}${image}` : `${siteUrl}${defaultSEO.image}`
  const seoKeywords = [...defaultSEO.keywords, ...keywords].join(', ')
  
  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow'
  ].join(', ')

  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': type === 'product' ? 'Product' : 'WebSite',
    name: title || defaultSEO.title,
    description: seoDescription,
    url: currentUrl,
  }

  if (type === 'product') {
    structuredData.image = seoImage
    
    if (price) {
      structuredData.offers = {
        '@type': 'Offer',
        price: price.amount,
        priceCurrency: price.currency,
        availability: availability ? `https://schema.org/${availability.replace(' ', '')}` : 'https://schema.org/InStock',
        url: currentUrl,
      }
    }

    if (brand) {
      structuredData.brand = {
        '@type': 'Brand',
        name: brand
      }
    }

    if (category) {
      structuredData.category = category
    }

    if (sku) structuredData.sku = sku
    if (gtin) structuredData.gtin = gtin
    if (mpn) structuredData.mpn = mpn
    if (condition) structuredData.itemCondition = `https://schema.org/${condition.charAt(0).toUpperCase() + condition.slice(1)}Condition`

    if (rating) {
      structuredData.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: rating.value,
        reviewCount: rating.count,
        bestRating: rating.bestRating || 5,
        worstRating: rating.worstRating || 1,
      }
    }

    if (reviews) {
      structuredData.review = {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: reviews.averageRating,
        },
        author: {
          '@type': 'Person',
          name: 'Verified Buyer'
        }
      }
    }
  }

  if (type === 'website') {
    structuredData['@type'] = 'WebSite'
    structuredData.potentialAction = {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      <meta name="robots" content={robotsContent} />
      
      {canonical && <link rel="canonical" href={canonical} />}
      {author && <meta name="author" content={author} />}
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content="Digital Marketplace" />
      
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}
      {section && <meta property="article:section" content={section} />}
      {tags.map(tag => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
      
      {/* Product specific meta tags */}
      {type === 'product' && (
        <>
          {price && (
            <>
              <meta property="product:price:amount" content={price.amount.toString()} />
              <meta property="product:price:currency" content={price.currency} />
            </>
          )}
          {availability && <meta property="product:availability" content={availability} />}
          {brand && <meta property="product:brand" content={brand} />}
          {category && <meta property="product:category" content={category} />}
          {condition && <meta property="product:condition" content={condition} />}
        </>
      )}

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />

      {/* Additional meta tags for better SEO */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta httpEquiv="Content-Language" content="en" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Favicon and app icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
    </Head>
  )
}

// Utility function to generate SEO props for products
export function generateProductSEO(product: any): SEOProps {
  return {
    title: product.title,
    description: product.description || product.short_description,
    keywords: product.tags || [],
    image: product.thumbnail_url,
    type: 'product',
    price: product.price ? {
      amount: product.price,
      currency: product.currency || 'USD'
    } : undefined,
    availability: product.status === 'active' ? 'in stock' : 'out of stock',
    brand: product.shops?.name,
    category: product.categories?.name,
    sku: product.id,
    condition: 'new',
    rating: product.average_rating ? {
      value: product.average_rating,
      count: product.review_count || 0
    } : undefined,
    tags: product.tags || []
  }
}

// Utility function to generate SEO props for shop pages
export function generateShopSEO(shop: any): SEOProps {
  return {
    title: shop.name,
    description: shop.description || `Shop ${shop.name} - Quality digital products`,
    keywords: ['digital shop', 'online store', shop.name],
    image: shop.logo_url,
    type: 'website',
    author: shop.name,
  }
}

// Utility function for category pages
export function generateCategorySEO(category: any, products: any[]): SEOProps {
  return {
    title: `${category.name} - Digital Products`,
    description: `Browse ${products.length} ${category.name.toLowerCase()} products. Find the best digital ${category.name.toLowerCase()} from verified sellers.`,
    keywords: [category.name, 'digital products', 'marketplace', 'buy online'],
    type: 'website',
  }
}
