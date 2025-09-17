import { createServiceClient } from '@/lib/supabase/server'

// Utility function to generate URL-safe slugs
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

export interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  images?: Array<{
    loc: string
    title?: string
    caption?: string
  }>
}

export class SitemapGenerator {
  private baseUrl: string
  private supabase = createServiceClient()

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourmarketplace.com') {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  /**
   * Generate static pages sitemap
   */
  async getStaticPages(): Promise<SitemapUrl[]> {
    const staticPages = [
      {
        loc: `${this.baseUrl}/`,
        changefreq: 'daily' as const,
        priority: 1.0,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${this.baseUrl}/products`,
        changefreq: 'hourly' as const,
        priority: 0.9,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${this.baseUrl}/search`,
        changefreq: 'daily' as const,
        priority: 0.8,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${this.baseUrl}/auth/login`,
        changefreq: 'monthly' as const,
        priority: 0.5,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${this.baseUrl}/auth/register`,
        changefreq: 'monthly' as const,
        priority: 0.5,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${this.baseUrl}/seller/dashboard`,
        changefreq: 'weekly' as const,
        priority: 0.6,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${this.baseUrl}/buyer/dashboard`,
        changefreq: 'weekly' as const,
        priority: 0.6,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${this.baseUrl}/partner/dashboard`,
        changefreq: 'weekly' as const,
        priority: 0.6,
        lastmod: new Date().toISOString()
      }
    ]

    return staticPages
  }

  /**
   * Generate product pages sitemap
   */
  async getProductPages(): Promise<SitemapUrl[]> {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select(`
          id,
          title,
          updated_at,
          thumbnail_url,
          shops(id, name)
        `)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching products for sitemap:', error)
        return []
      }

      return products.map(product => {
        const slug = generateSlug(product.title)
        return {
          loc: `${this.baseUrl}/products/${slug}-${product.id}`,
          lastmod: product.updated_at,
          changefreq: 'weekly' as const,
          priority: 0.7,
          images: product.thumbnail_url ? [{
            loc: `${this.baseUrl}${product.thumbnail_url}`,
            title: product.title,
            caption: `${product.title} - Digital Product`
          }] : []
        }
      })
    } catch (error) {
      console.error('Error generating product sitemap:', error)
      return []
    }
  }

  /**
   * Generate shop pages sitemap
   */
  async getShopPages(): Promise<SitemapUrl[]> {
    try {
      const { data: shops, error } = await this.supabase
        .from('shops')
        .select(`
          id,
          name,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching shops for sitemap:', error)
        return []
      }

      return shops.map(shop => {
        const slug = generateSlug(shop.name)
        return {
          loc: `${this.baseUrl}/shops/${slug}-${shop.id}`,
          lastmod: shop.created_at,
          changefreq: 'weekly' as const,
          priority: 0.6
        }
      })
    } catch (error) {
      console.error('Error generating shop sitemap:', error)
      return []
    }
  }

  /**
   * Generate category pages sitemap
   */
  async getCategoryPages(): Promise<SitemapUrl[]> {
    try {
      const { data: categories, error } = await this.supabase
        .from('categories')
        .select(`
          id,
          name
        `)
        .order('name')

      if (error) {
        console.error('Error fetching categories for sitemap:', error)
        return []
      }

      return categories.map(category => {
        const slug = generateSlug(category.name)
        return {
          loc: `${this.baseUrl}/categories/${slug}-${category.id}`,
          lastmod: new Date().toISOString(),
          changefreq: 'weekly' as const,
          priority: 0.6
        }
      })
    } catch (error) {
      console.error('Error generating category sitemap:', error)
      return []
    }
  }

  /**
   * Generate complete sitemap
   */
  async generateSitemap(): Promise<SitemapUrl[]> {
    const [staticPages, productPages, shopPages, categoryPages] = await Promise.all([
      this.getStaticPages(),
      this.getProductPages(),
      this.getShopPages(),
      this.getCategoryPages()
    ])

    return [
      ...staticPages,
      ...productPages,
      ...shopPages,
      ...categoryPages
    ]
  }

  /**
   * Convert sitemap URLs to XML format
   */
  generateSitemapXML(urls: SitemapUrl[]): string {
    const urlsXML = urls.map(url => {
      const imagesXML = url.images?.map(image => `
    <image:image>
      <image:loc>${this.escapeXML(image.loc)}</image:loc>
      ${image.title ? `<image:title>${this.escapeXML(image.title)}</image:title>` : ''}
      ${image.caption ? `<image:caption>${this.escapeXML(image.caption)}</image:caption>` : ''}
    </image:image>`).join('') || ''

      return `
  <url>
    <loc>${this.escapeXML(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority ? `<priority>${url.priority}</priority>` : ''}${imagesXML}
  </url>`
    }).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urlsXML}
</urlset>`
  }

  /**
   * Generate sitemap index for large sitemaps
   */
  generateSitemapIndex(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
    const sitemapsXML = sitemaps.map(sitemap => `
  <sitemap>
    <loc>${this.escapeXML(sitemap.loc)}</loc>
    ${sitemap.lastmod ? `<lastmod>${sitemap.lastmod}</lastmod>` : ''}
  </sitemap>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapsXML}
</sitemapindex>`
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Disallow sensitive areas
Disallow: /admin/
Disallow: /api/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Disallow: /partner/dashboard/
Disallow: /profile/
Disallow: /cart/
Disallow: /checkout/
Disallow: /auth/

# Allow important pages
Allow: /products/
Allow: /shops/
Allow: /categories/
Allow: /search/

# Sitemap location
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl delay (optional)
Crawl-delay: 1`
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}

// Utility functions for Next.js API routes
export async function generateSitemapResponse(): Promise<Response> {
  const generator = new SitemapGenerator()
  const urls = await generator.generateSitemap()
  const xml = generator.generateSitemapXML(urls)

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
    },
  })
}

export async function generateRobotsResponse(): Promise<Response> {
  const generator = new SitemapGenerator()
  const robotsTxt = generator.generateRobotsTxt()

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
    },
  })
}

// For static generation
export async function generateStaticSitemap(): Promise<string> {
  const generator = new SitemapGenerator()
  const urls = await generator.generateSitemap()
  return generator.generateSitemapXML(urls)
}

// Chunk sitemap for large sites
export async function generateChunkedSitemaps(chunkSize: number = 50000): Promise<{
  index: string
  sitemaps: Array<{ name: string; content: string; lastmod: string }>
}> {
  const generator = new SitemapGenerator()
  const allUrls = await generator.generateSitemap()
  
  const chunks: SitemapUrl[][] = []
  for (let i = 0; i < allUrls.length; i += chunkSize) {
    chunks.push(allUrls.slice(i, i + chunkSize))
  }

  const sitemaps = chunks.map((chunk, index) => ({
    name: `sitemap-${index + 1}.xml`,
    content: generator.generateSitemapXML(chunk),
    lastmod: new Date().toISOString()
  }))

  const indexSitemaps = sitemaps.map(sitemap => ({
    loc: `${generator['baseUrl']}/${sitemap.name}`,
    lastmod: sitemap.lastmod
  }))

  const index = generator.generateSitemapIndex(indexSitemaps)

  return { index, sitemaps }
}
