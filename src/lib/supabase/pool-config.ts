/**
 * Database Connection Pool Configuration
 * Environment-specific configurations for connection pooling
 */

export interface EnvironmentConfig {
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  leakDetectionTimeout: number;
  enableMetrics: boolean;
  enableHealthChecks: boolean;
}

// Development environment configuration
export const developmentConfig: EnvironmentConfig = {
  minConnections: 2,
  maxConnections: 5,
  connectionTimeout: 10000, // 10 seconds
  idleTimeout: 60000, // 1 minute
  maxRetries: 2,
  retryDelay: 500,
  healthCheckInterval: 30000, // 30 seconds
  leakDetectionTimeout: 30000, // 30 seconds
  enableMetrics: true,
  enableHealthChecks: true,
};

// Production environment configuration
export const productionConfig: EnvironmentConfig = {
  minConnections: 5,
  maxConnections: 20,
  connectionTimeout: 30000, // 30 seconds
  idleTimeout: 300000, // 5 minutes
  maxRetries: 3,
  retryDelay: 1000,
  healthCheckInterval: 30000, // 30 seconds
  leakDetectionTimeout: 60000, // 1 minute
  enableMetrics: true,
  enableHealthChecks: true,
};

// Testing environment configuration
export const testConfig: EnvironmentConfig = {
  minConnections: 1,
  maxConnections: 3,
  connectionTimeout: 5000, // 5 seconds
  idleTimeout: 30000, // 30 seconds
  maxRetries: 1,
  retryDelay: 100,
  healthCheckInterval: 60000, // 1 minute
  leakDetectionTimeout: 15000, // 15 seconds
  enableMetrics: false,
  enableHealthChecks: false,
};

// High-load environment configuration
export const highLoadConfig: EnvironmentConfig = {
  minConnections: 10,
  maxConnections: 50,
  connectionTimeout: 45000, // 45 seconds
  idleTimeout: 600000, // 10 minutes
  maxRetries: 5,
  retryDelay: 2000,
  healthCheckInterval: 15000, // 15 seconds
  leakDetectionTimeout: 120000, // 2 minutes
  enableMetrics: true,
  enableHealthChecks: true,
};

/**
 * Get configuration based on environment
 */
export function getPoolConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV;
  const customConfig = process.env.DB_POOL_CONFIG;
  
  // Allow custom configuration via environment variable
  if (customConfig) {
    try {
      const parsed = JSON.parse(customConfig);
      return { ...productionConfig, ...parsed };
    } catch (error) {
      console.warn('Invalid DB_POOL_CONFIG, using default configuration');
    }
  }
  
  switch (env) {
    case 'development':
      return developmentConfig;
    case 'test':
      return testConfig;
    case 'production':
      return productionConfig;
    default:
      return productionConfig;
  }
}

/**
 * Validate configuration
 */
export function validatePoolConfig(config: EnvironmentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (config.minConnections < 1) {
    errors.push('minConnections must be at least 1');
  }
  
  if (config.maxConnections < config.minConnections) {
    errors.push('maxConnections must be greater than or equal to minConnections');
  }
  
  if (config.connectionTimeout < 1000) {
    errors.push('connectionTimeout must be at least 1000ms');
  }
  
  if (config.idleTimeout < 10000) {
    errors.push('idleTimeout must be at least 10000ms (10 seconds)');
  }
  
  if (config.maxRetries < 0) {
    errors.push('maxRetries must be non-negative');
  }
  
  if (config.retryDelay < 100) {
    errors.push('retryDelay must be at least 100ms');
  }
  
  if (config.healthCheckInterval < 5000) {
    errors.push('healthCheckInterval must be at least 5000ms (5 seconds)');
  }
  
  if (config.leakDetectionTimeout < 5000) {
    errors.push('leakDetectionTimeout must be at least 5000ms (5 seconds)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get optimized configuration based on expected load
 */
export function getOptimizedConfig(expectedLoad: 'low' | 'medium' | 'high' | 'extreme'): EnvironmentConfig {
  const baseConfig = getPoolConfig();
  
  switch (expectedLoad) {
    case 'low':
      return {
        ...baseConfig,
        minConnections: Math.max(1, Math.floor(baseConfig.minConnections * 0.5)),
        maxConnections: Math.max(2, Math.floor(baseConfig.maxConnections * 0.5)),
        healthCheckInterval: baseConfig.healthCheckInterval * 2,
      };
    
    case 'medium':
      return baseConfig;
    
    case 'high':
      return {
        ...baseConfig,
        minConnections: Math.floor(baseConfig.minConnections * 1.5),
        maxConnections: Math.floor(baseConfig.maxConnections * 1.5),
        healthCheckInterval: Math.floor(baseConfig.healthCheckInterval * 0.5),
        leakDetectionTimeout: Math.floor(baseConfig.leakDetectionTimeout * 0.75),
      };
    
    case 'extreme':
      return {
        ...baseConfig,
        minConnections: baseConfig.minConnections * 2,
        maxConnections: baseConfig.maxConnections * 2,
        healthCheckInterval: Math.floor(baseConfig.healthCheckInterval * 0.25),
        leakDetectionTimeout: Math.floor(baseConfig.leakDetectionTimeout * 0.5),
        maxRetries: baseConfig.maxRetries + 2,
      };
    
    default:
      return baseConfig;
  }
}

/**
 * Environment variable configuration mapping
 */
export const ENV_CONFIG_MAP = {
  DB_POOL_MIN_CONNECTIONS: 'minConnections',
  DB_POOL_MAX_CONNECTIONS: 'maxConnections',
  DB_POOL_CONNECTION_TIMEOUT: 'connectionTimeout',
  DB_POOL_IDLE_TIMEOUT: 'idleTimeout',
  DB_POOL_MAX_RETRIES: 'maxRetries',
  DB_POOL_RETRY_DELAY: 'retryDelay',
  DB_POOL_HEALTH_CHECK_INTERVAL: 'healthCheckInterval',
  DB_POOL_LEAK_DETECTION_TIMEOUT: 'leakDetectionTimeout',
  DB_POOL_ENABLE_METRICS: 'enableMetrics',
  DB_POOL_ENABLE_HEALTH_CHECKS: 'enableHealthChecks',
} as const;

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): Partial<EnvironmentConfig> {
  const config: Partial<EnvironmentConfig> = {};
  
  for (const [envVar, configKey] of Object.entries(ENV_CONFIG_MAP)) {
    const value = process.env[envVar];
    if (value !== undefined) {
      if (configKey === 'enableMetrics' || configKey === 'enableHealthChecks') {
        (config as any)[configKey] = value.toLowerCase() === 'true';
      } else {
        (config as any)[configKey] = parseInt(value, 10);
      }
    }
  }
  
  return config;
}
