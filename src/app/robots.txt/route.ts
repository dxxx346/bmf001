import { generateRobotsResponse } from '@/lib/sitemap'

export async function GET() {
  return await generateRobotsResponse()
}

// Revalidate every 24 hours
export const revalidate = 86400
