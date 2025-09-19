import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { cache, cacheKeys } from '@/lib/redis';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    
    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    logger.info('Product suggestions API call', { query });

    // Try to get from cache first
    const cacheKey = cacheKeys.suggestions(query);
    const cached = await cache.get(cacheKey);

    if (cached) {
      const suggestions = cached as string[];
      logger.info('Suggestions served from cache', { query, count: suggestions.length });
      return NextResponse.json({ suggestions });
    }

    const supabase = createServiceClient();
    
    // Get suggestions from product titles and tags
    const { data: titleSuggestions, error: titleError } = await supabase
      .from('products')
      .select('title')
      .eq('status', 'active')
      .ilike('title', `%${query}%`)
      .limit(10);

    if (titleError) {
      logError(titleError as Error, { action: 'get_title_suggestions', query });
    }

    // Get suggestions from tags
    const { data: tagSuggestions, error: tagError } = await supabase
      .from('products')
      .select('tags')
      .eq('status', 'active')
      .overlaps('tags', [query])
      .limit(10);

    if (tagError) {
      logError(tagError as Error, { action: 'get_tag_suggestions', query });
    }

    // Get category suggestions
    const { data: categorySuggestions, error: categoryError } = await supabase
      .from('categories')
      .select('name')
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .limit(5);

    if (categoryError) {
      logError(categoryError as Error, { action: 'get_category_suggestions', query });
    }

    // Combine and deduplicate suggestions
    const suggestions = new Set<string>();

    // Add title suggestions
    titleSuggestions?.forEach(item => {
      if (item.title) {
        suggestions.add(item.title);
      }
    });

    // Add tag suggestions
    tagSuggestions?.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (typeof tag === 'string' && tag.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(tag);
          }
        });
      }
    });

    // Add category suggestions
    categorySuggestions?.forEach(item => {
      if (item.name) {
        suggestions.add(item.name);
      }
    });

    // Convert to array and sort by relevance
    const suggestionArray = Array.from(suggestions)
      .filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        // Prioritize exact matches and prefix matches
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const queryLower = query.toLowerCase();
        
        const aExact = aLower === queryLower;
        const bExact = bLower === queryLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        const aPrefix = aLower.startsWith(queryLower);
        const bPrefix = bLower.startsWith(queryLower);
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;
        
        // Sort by length (shorter suggestions first)
        return a.length - b.length;
      })
      .slice(0, 8);

    // Cache for 5 minutes
    await cache.set(cacheKey, suggestionArray, 300);

    logger.info('Suggestions generated', { 
      query, 
      count: suggestionArray.length,
      titleMatches: titleSuggestions?.length || 0,
      tagMatches: tagSuggestions?.length || 0,
      categoryMatches: categorySuggestions?.length || 0
    });

    return NextResponse.json({ suggestions: suggestionArray });
  } catch (error) {
    logError(error as Error, { action: 'get_suggestions_api' });
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}
