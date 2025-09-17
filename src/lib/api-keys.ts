import { createClient } from '@supabase/supabase-js';
import { defaultLogger as logger } from './logger';
import { generateApiKey, hashApiKey, secureCompare } from './security-utils';
import crypto from 'crypto';

// Supabase client for API key management
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  permissions: string[];
  usage_count: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateApiKeyRequest {
  user_id: string;
  name: string;
  permissions: string[];
  expires_at?: string;
}

export interface ApiKeyUsage {
  api_key_id: string;
  endpoint: string;
  method: string;
  ip_address: string;
  user_agent: string;
  response_status: number;
  response_time_ms: number;
  created_at: string;
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(request: CreateApiKeyRequest): Promise<{ 
  success: boolean; 
  apiKey?: string; 
  keyData?: Partial<ApiKey>; 
  error?: string 
}> {
  try {
    // Generate new API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    // Insert into database
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: request.user_id,
        name: request.name,
        key_hash: keyHash,
        permissions: request.permissions,
        expires_at: request.expires_at,
        usage_count: 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create API key:', error);
      return { success: false, error: 'Failed to create API key' };
    }

    logger.info('API key created', { 
      user_id: request.user_id, 
      key_id: data.id,
      permissions: request.permissions 
    });

    return {
      success: true,
      apiKey, // Return the raw key only once
      keyData: {
        id: data.id,
        name: data.name,
        permissions: data.permissions,
        expires_at: data.expires_at,
        created_at: data.created_at
      }
    };
  } catch (error) {
    logger.error('Error creating API key:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Validate an API key and return associated data
 */
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  keyData?: ApiKey;
  error?: string;
}> {
  try {
    if (!apiKey || !apiKey.startsWith('pk_')) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const keyHash = hashApiKey(apiKey);

    // Get API key from database
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      logger.warn('API key validation failed', { keyHash: keyHash.substring(0, 8) + '...' });
      return { valid: false, error: 'Invalid API key' };
    }

    // Check if key is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      logger.warn('Expired API key used', { key_id: data.id });
      return { valid: false, error: 'API key expired' };
    }

    // Update usage count and last used timestamp
    await supabase
      .from('api_keys')
      .update({
        usage_count: data.usage_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', data.id);

    return { valid: true, keyData: data };
  } catch (error) {
    logger.error('Error validating API key:', error);
    return { valid: false, error: 'Internal server error' };
  }
}

/**
 * Check if API key has specific permission
 */
export function hasPermission(apiKey: ApiKey, permission: string): boolean {
  return apiKey.permissions.includes(permission) || apiKey.permissions.includes('*');
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<{
  success: boolean;
  keys?: Partial<ApiKey>[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, permissions, usage_count, last_used_at, expires_at, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get user API keys:', error);
      return { success: false, error: 'Failed to retrieve API keys' };
    }

    return { success: true, keys: data };
  } catch (error) {
    logger.error('Error getting user API keys:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to revoke API key:', error);
      return { success: false, error: 'Failed to revoke API key' };
    }

    logger.info('API key revoked', { key_id: keyId, user_id: userId });
    return { success: true };
  } catch (error) {
    logger.error('Error revoking API key:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Update API key permissions
 */
export async function updateApiKeyPermissions(
  keyId: string, 
  userId: string, 
  permissions: string[]
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('api_keys')
      .update({ permissions })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to update API key permissions:', error);
      return { success: false, error: 'Failed to update API key permissions' };
    }

    logger.info('API key permissions updated', { key_id: keyId, user_id: userId, permissions });
    return { success: true };
  } catch (error) {
    logger.error('Error updating API key permissions:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(usage: Omit<ApiKeyUsage, 'created_at'>): Promise<void> {
  try {
    await supabase
      .from('api_key_usage')
      .insert({
        ...usage,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    logger.error('Failed to log API key usage:', error);
  }
}

/**
 * Get API key usage statistics
 */
export async function getApiKeyUsageStats(
  keyId: string,
  userId: string,
  days: number = 30
): Promise<{
  success: boolean;
  stats?: {
    total_requests: number;
    avg_response_time: number;
    error_rate: number;
    requests_by_day: Array<{ date: string; count: number }>;
    endpoints_used: Array<{ endpoint: string; count: number }>;
  };
  error?: string;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Verify the API key belongs to the user
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single();

    if (keyError || !keyData) {
      return { success: false, error: 'API key not found' };
    }

    // Get usage statistics
    const { data: usage, error: usageError } = await supabase
      .from('api_key_usage')
      .select('*')
      .eq('api_key_id', keyId)
      .gte('created_at', startDate.toISOString());

    if (usageError) {
      logger.error('Failed to get API key usage stats:', usageError);
      return { success: false, error: 'Failed to retrieve usage statistics' };
    }

    // Calculate statistics
    const totalRequests = usage.length;
    const avgResponseTime = usage.length > 0 
      ? usage.reduce((sum, req) => sum + req.response_time_ms, 0) / usage.length 
      : 0;
    const errorCount = usage.filter(req => req.response_status >= 400).length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Group by day
    const requestsByDay = usage.reduce((acc, req) => {
      const date = new Date(req.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by endpoint
    const endpointsUsed = usage.reduce((acc, req) => {
      acc[req.endpoint] = (acc[req.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      stats: {
        total_requests: totalRequests,
        avg_response_time: Math.round(avgResponseTime),
        error_rate: Math.round(errorRate * 100) / 100,
        requests_by_day: Object.entries(requestsByDay).map(([date, count]) => ({ date, count: Number(count) })),
        endpoints_used: Object.entries(endpointsUsed)
          .map(([endpoint, count]) => ({ endpoint, count: Number(count) }))
          .sort((a, b) => Number(b.count) - Number(a.count))
      }
    };
  } catch (error) {
    logger.error('Error getting API key usage stats:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Available permissions for API keys
 */
export const API_PERMISSIONS = {
  // Product permissions
  'products:read': 'Read product information',
  'products:create': 'Create new products',
  'products:update': 'Update existing products',
  'products:delete': 'Delete products',
  
  // Shop permissions
  'shops:read': 'Read shop information',
  'shops:update': 'Update shop settings',
  
  // Analytics permissions
  'analytics:read': 'Read analytics data',
  
  // Payment permissions
  'payments:read': 'Read payment information',
  'payments:create': 'Process payments',
  
  // User permissions
  'users:read': 'Read user information',
  
  // Admin permissions
  'admin:*': 'Full administrative access',
  
  // All permissions
  '*': 'Full access to all resources'
} as const;

export type ApiPermission = keyof typeof API_PERMISSIONS;
