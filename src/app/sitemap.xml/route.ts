import { generateSitemapResponse } from '@/lib/sitemap'

export async function GET() {
  return await generateSitemapResponse()
}

// Revalidate every hour
export const revalidate = 3600
