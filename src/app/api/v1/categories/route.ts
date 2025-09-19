import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cache, cacheKeys } from '@/lib/redis';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Try to get from cache first
    const cacheKey = cacheKeys.categories();
    const cached = await cache.get(cacheKey);

    if (cached) {
      logger.info('Categories served from cache');
      return NextResponse.json({ data: cached });
    }

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      logError(error as Error, { action: 'get_categories' });
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Cache for 1 hour
    await cache.set(cacheKey, categories, 3600);

    logger.info('Categories fetched', { count: categories?.length });
    return NextResponse.json({ data: categories });
  } catch (error) {
    logError(error as Error, { action: 'get_categories' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
