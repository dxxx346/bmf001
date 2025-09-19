import * as Sentry from '@sentry/nextjs';

/**
 * Sentry Error Tracking Integration
 * Configures Sentry for comprehensive error tracking and performance monitoring
 */

export interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  debug: boolean;
  enableTracing: boolean;
  enableProfiling: boolean;
  enableUserFeedback: boolean;
}

const defaultConfig: SentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.NODE_ENV === 'development',
  enableTracing: true,
  enableProfiling: true,
  enableUserFeedback: true,
};

/**
 * Initialize Sentry with custom configuration
 */
export function initializeSentry(config: Partial<SentryConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.dsn) {
    console.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: finalConfig.dsn,
    environment: finalConfig.environment,
    debug: finalConfig.debug,
    
    // Performance monitoring
    tracesSampleRate: finalConfig.tracesSampleRate,
    profilesSampleRate: finalConfig.profilesSampleRate,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out common non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        
        // Skip chunk loading errors (usually recoverable)
        if (error && error.toString().includes('ChunkLoadError')) {
          return null;
        }
        
        // Skip network errors that are likely temporary
        if (error && error.toString().includes('NetworkError')) {
          return null;
        }
        
        // Skip script errors from browser extensions
        if (event.message === 'Script error.') {
          return null;
        }
      }
      
      return event;
    },

    // Add custom tags
    initialScope: {
      tags: {
        component: 'bmf001-marketplace',
        version: process.env.NEXT_PUBLIC_BUILD_VERSION || 'unknown',
      },
    },

    // Integration configuration
    integrations: [
      // Only add browser integrations if available
      ...(typeof window !== 'undefined' && (Sentry as any).BrowserTracing ? [
        new (Sentry as any).BrowserTracing({
          // Set up automatic route change tracking
          routingInstrumentation: (Sentry as any).nextRouterInstrumentation?.() || undefined,
        }),
      ] : []),
      ...(typeof window !== 'undefined' && (Sentry as any).Replay ? [
        new (Sentry as any).Replay({
          // Capture 10% of all sessions,
          // plus 100% of sessions with an error
          sessionSampleRate: 0.1,
          errorSampleRate: 1.0,
        }),
      ] : []),
    ],
  });

  // Set user context
  if (typeof window !== 'undefined') {
    const userId = getUserId();
    const userEmail = getUserEmail();
    
    if (userId || userEmail) {
      Sentry.setUser({
        id: userId,
        email: userEmail,
      });
    }
  }

  console.log('Sentry initialized successfully', {
    environment: finalConfig.environment,
    tracesSampleRate: finalConfig.tracesSampleRate,
  });
}

/**
 * Capture exception with additional context
 */
export function captureError(
  error: Error,
  context?: {
    level?: 'error' | 'warning' | 'info';
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: { id?: string; email?: string; username?: string };
    fingerprint?: string[];
  }
) {
  Sentry.withScope((scope) => {
    if (context?.level) {
      scope.setLevel(context.level);
    }
    
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    if (context?.user) {
      scope.setUser(context.user);
    }
    
    if (context?.fingerprint) {
      scope.setFingerprint(context.fingerprint);
    }
    
    Sentry.captureException(error);
  });
}

/**
 * Capture message with context
 */
export function captureMessage(
  message: string,
  level: 'error' | 'warning' | 'info' = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    Sentry.captureMessage(message, level);
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level?: 'error' | 'warning' | 'info' | 'debug',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: level || 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(name: string, operation: string) {
  if ((Sentry as any).startTransaction) {
    return (Sentry as any).startTransaction({
      name,
      op: operation,
    });
  }
  
  // Fallback for newer Sentry versions
  return {
    setStatus: () => {},
    finish: () => {},
  };
}

/**
 * Set user context
 */
export function setUser(user: {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
}) {
  Sentry.setUser(user);
}

/**
 * Clear user context (on logout)
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Show user feedback dialog
 */
export function showUserFeedback() {
  if (typeof window !== 'undefined' && (Sentry as any).showReportDialog) {
    const user = (Sentry as any).getCurrentHub?.()?.getScope?.()?.getUser?.();
    
    (Sentry as any).showReportDialog({
      title: 'Report an Issue',
      subtitle: 'Help us improve by reporting this issue',
      subtitle2: 'Our team will investigate and get back to you.',
      labelName: 'Name',
      labelEmail: 'Email',
      labelComments: 'What happened?',
      labelClose: 'Close',
      labelSubmit: 'Submit Report',
      errorGeneric: 'An error occurred while submitting your report. Please try again.',
      errorFormEntry: 'Some fields were invalid. Please correct them and try again.',
      successMessage: 'Thank you for your report! We\'ll investigate this issue.',
      user: {
        name: user?.username || user?.email || '',
        email: user?.email || '',
      },
    });
  }
}

// Helper functions
function getUserId(): string | undefined {
  try {
    return localStorage.getItem('user_id') || undefined;
  } catch {
    return undefined;
  }
}

function getUserEmail(): string | undefined {
  try {
    return localStorage.getItem('user_email') || undefined;
  } catch {
    return undefined;
  }
}

// Performance monitoring helpers
export const performance = {
  /**
   * Measure function execution time
   */
  measure: <T>(name: string, fn: () => T): T => {
    const transaction = startTransaction(name, 'function');
    try {
      const result = fn();
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  },

  /**
   * Measure async function execution time
   */
  measureAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const transaction = startTransaction(name, 'async_function');
    try {
      const result = await fn();
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  },

  /**
   * Mark a page load
   */
  markPageLoad: (pageName: string) => {
    addBreadcrumb(`Page loaded: ${pageName}`, 'navigation', 'info', {
      page: pageName,
      url: window.location.href,
    });
  },

  /**
   * Mark a user action
   */
  markUserAction: (action: string, data?: Record<string, any>) => {
    addBreadcrumb(`User action: ${action}`, 'user', 'info', data);
  },
};

export default Sentry;
