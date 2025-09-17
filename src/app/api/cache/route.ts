import { NextRequest, NextResponse } from 'next/server';
import { cacheService } from '@/lib/cache.service';
import { cacheWarmingService } from '@/services/cache-warming.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        return await getCacheStats();
      case 'health':
        return await getCacheHealth();
      case 'warmup':
        return await triggerWarmup();
      case 'status':
        return await getWarmupStatus();
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logError(error as Error, { action: 'cache_api_get' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'warmup':
        return await triggerWarmup(params);
      case 'invalidate':
        return await invalidateCache(params);
      case 'refresh':
        return await refreshCache(params);
      case 'cleanup':
        return await cleanupCache();
      case 'config':
        return await updateConfig(params);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logError(error as Error, { action: 'cache_api_post' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern');

    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern parameter is required' },
        { status: 400 }
      );
    }

    const deletedCount = await cacheService.delPattern(pattern);
    
    logger.info('Cache pattern deleted', { pattern, deletedCount });
    
    return NextResponse.json({
      success: true,
      pattern,
      deletedCount,
    });
  } catch (error) {
    logError(error as Error, { action: 'cache_api_delete' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

async function getCacheStats() {
  try {
    const stats = await cacheService.getCacheStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error as Error, { action: 'get_cache_stats' });
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

async function getCacheHealth() {
  try {
    const health = await cacheService.healthCheck();
    const monitoring = await cacheWarmingService.monitorCacheHealth();
    
    return NextResponse.json({
      success: true,
      health,
      monitoring,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error as Error, { action: 'get_cache_health' });
    return NextResponse.json(
      { error: 'Failed to get cache health' },
      { status: 500 }
    );
  }
}

async function triggerWarmup(config?: any) {
  try {
    logger.info('Cache warmup triggered via API', { config });
    
    // Run warmup in background
    cacheWarmingService.warmupAll(config).catch(error => {
      logError(error as Error, { action: 'background_warmup' });
    });
    
    return NextResponse.json({
      success: true,
      message: 'Cache warmup started',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error as Error, { action: 'trigger_warmup' });
    return NextResponse.json(
      { error: 'Failed to trigger warmup' },
      { status: 500 }
    );
  }
}

async function getWarmupStatus() {
  try {
    const status = await cacheWarmingService.getWarmupStatus();
    
    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error as Error, { action: 'get_warmup_status' });
    return NextResponse.json(
      { error: 'Failed to get warmup status' },
      { status: 500 }
    );
  }
}

async function invalidateCache(params: { pattern?: string; type?: string; id?: string }) {
  try {
    const { pattern, type, id } = params;
    
    if (pattern) {
      const deletedCount = await cacheService.delPattern(pattern);
      logger.info('Cache invalidated by pattern', { pattern, deletedCount });
      
      return NextResponse.json({
        success: true,
        message: `Invalidated ${deletedCount} cache entries`,
        pattern,
        deletedCount,
      });
    }
    
    if (type && id) {
      switch (type) {
        case 'product':
          await cacheService.invalidateProduct(id);
          break;
        case 'user':
          await cacheService.invalidateUser(id);
          break;
        case 'shop':
          await cacheService.invalidateShop(id);
          break;
        case 'search':
          await cacheService.invalidateSearch();
          break;
        case 'recommendations':
          await cacheService.invalidateRecommendations();
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid cache type' },
            { status: 400 }
          );
      }
      
      logger.info('Cache invalidated by type', { type, id });
      
      return NextResponse.json({
        success: true,
        message: `Invalidated ${type} cache for ${id}`,
        type,
        id,
      });
    }
    
    return NextResponse.json(
      { error: 'Pattern or type+id required' },
      { status: 400 }
    );
  } catch (error) {
    logError(error as Error, { action: 'invalidate_cache' });
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}

async function refreshCache(params: { type: string; id?: string; period?: string }) {
  try {
    const { type, id, period } = params;
    
    switch (type) {
      case 'exchange_rates':
        await cacheWarmingService.refreshExchangeRates(id);
        break;
      case 'shop_analytics':
        if (id && period) {
          await cacheWarmingService.refreshShopAnalytics(id, period);
        } else {
          return NextResponse.json(
            { error: 'Shop ID and period required for analytics refresh' },
            { status: 400 }
          );
        }
        break;
      case 'shop_sales':
        if (id && period) {
          await cacheWarmingService.refreshShopSales(id, period);
        } else {
          return NextResponse.json(
            { error: 'Shop ID and period required for sales refresh' },
            { status: 400 }
          );
        }
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid refresh type' },
          { status: 400 }
        );
    }
    
    logger.info('Cache refreshed', { type, id, period });
    
    return NextResponse.json({
      success: true,
      message: `Refreshed ${type} cache`,
      type,
      id,
      period,
    });
  } catch (error) {
    logError(error as Error, { action: 'refresh_cache' });
    return NextResponse.json(
      { error: 'Failed to refresh cache' },
      { status: 500 }
    );
  }
}

async function cleanupCache() {
  try {
    await cacheWarmingService.cleanupExpiredCaches();
    
    logger.info('Cache cleanup completed');
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleanup completed',
    });
  } catch (error) {
    logError(error as Error, { action: 'cleanup_cache' });
    return NextResponse.json(
      { error: 'Failed to cleanup cache' },
      { status: 500 }
    );
  }
}

async function updateConfig(config: any) {
  try {
    await cacheWarmingService.updateConfig(config);
    
    logger.info('Cache warmup configuration updated', { config });
    
    return NextResponse.json({
      success: true,
      message: 'Configuration updated',
      config,
    });
  } catch (error) {
    logError(error as Error, { action: 'update_config' });
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
