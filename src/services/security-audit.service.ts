import { createServiceClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';

/**
 * Security Audit Service
 * Handles all security-related logging and monitoring
 */

export interface SecurityAuditEvent {
  user_id?: string;
  event_type: 'rate_limit_exceeded' | 'invalid_input' | 'suspicious_activity' | 'unauthorized_access' | 'data_breach_attempt';
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  blocked?: boolean;
}

export interface SecurityMetrics {
  total_events: number;
  high_risk_events: number;
  blocked_attempts: number;
  unique_ips: number;
  top_attack_types: Array<{ type: string; count: number }>;
  recent_events: SecurityAuditEvent[];
}

export class SecurityAuditService {
  private supabase = createServiceClient();

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityAuditEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('security_events')
        .insert({
          user_id: event.user_id,
          event_type: event.event_type,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          endpoint: event.resource_type,
          severity: event.severity || event.risk_level,
          blocked: event.blocked || false,
          details: {
            action: event.action,
            resource_type: event.resource_type,
            resource_id: event.resource_id,
            risk_level: event.risk_level,
            timestamp: new Date().toISOString(),
            ...event.metadata,
          },
          created_at: new Date().toISOString(),
        });

      if (error) {
        logger.error('Failed to log security event:', error);
      } else {
        logger.info('Security event logged', {
          event_type: event.event_type,
          action: event.action,
          risk_level: event.risk_level,
        });
      }
    } catch (error) {
      logger.error('Error logging security event:', error);
    }
  }

  /**
   * Log SQL injection attempt
   */
  async logSQLInjectionAttempt(
    input: string,
    endpoint: string,
    userId?: string,
    ipAddress = 'unknown',
    userAgent = 'unknown'
  ): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: 'suspicious_activity',
      action: 'sql_injection_attempt',
      resource_type: endpoint,
      ip_address: ipAddress,
      user_agent: userAgent,
      risk_level: 'critical',
      severity: 'critical',
      blocked: true,
      metadata: {
        malicious_input: input.slice(0, 200), // Limit to avoid storing too much data
        detection_method: 'input_validation',
      },
    });
  }

  /**
   * Log XSS attempt
   */
  async logXSSAttempt(
    input: string,
    endpoint: string,
    userId?: string,
    ipAddress = 'unknown',
    userAgent = 'unknown'
  ): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: 'suspicious_activity',
      action: 'xss_attempt',
      resource_type: endpoint,
      ip_address: ipAddress,
      user_agent: userAgent,
      risk_level: 'high',
      severity: 'high',
      blocked: true,
      metadata: {
        malicious_input: input.slice(0, 200),
        detection_method: 'input_sanitization',
      },
    });
  }

  /**
   * Log rate limit violation
   */
  async logRateLimitViolation(
    endpoint: string,
    limit: number,
    userId?: string,
    ipAddress = 'unknown',
    userAgent = 'unknown'
  ): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: 'rate_limit_exceeded',
      action: 'rate_limit_violation',
      resource_type: endpoint,
      ip_address: ipAddress,
      user_agent: userAgent,
      risk_level: 'medium',
      severity: 'medium',
      blocked: true,
      metadata: {
        rate_limit: limit,
        endpoint,
      },
    });
  }

  /**
   * Log unauthorized access attempt
   */
  async logUnauthorizedAccess(
    endpoint: string,
    requiredRole: string,
    userRole?: string,
    userId?: string,
    ipAddress = 'unknown',
    userAgent = 'unknown'
  ): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: 'unauthorized_access',
      action: 'unauthorized_access_attempt',
      resource_type: endpoint,
      ip_address: ipAddress,
      user_agent: userAgent,
      risk_level: 'high',
      severity: 'high',
      blocked: true,
      metadata: {
        required_role: requiredRole,
        user_role: userRole || 'none',
        endpoint,
      },
    });
  }

  /**
   * Log data breach attempt
   */
  async logDataBreachAttempt(
    action: string,
    resourceType: string,
    resourceId?: string,
    userId?: string,
    ipAddress = 'unknown',
    userAgent = 'unknown'
  ): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      event_type: 'data_breach_attempt',
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress,
      user_agent: userAgent,
      risk_level: 'critical',
      severity: 'critical',
      blocked: true,
      metadata: {
        attempted_action: action,
        resource_type: resourceType,
        resource_id: resourceId,
      },
    });
  }

  /**
   * Get security metrics for dashboard
   */
  async getSecurityMetrics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<SecurityMetrics> {
    try {
      const timeMap = {
        hour: '1 hour',
        day: '1 day',
        week: '7 days',
        month: '30 days',
      };

      const { data: events, error } = await this.supabase
        .from('security_events')
        .select('*')
        .gte('created_at', new Date(Date.now() - this.getTimeframeMs(timeframe)).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalEvents = events?.length || 0;
      const highRiskEvents = events?.filter(e => 
        e.severity === 'high' || e.severity === 'critical'
      ).length || 0;
      const blockedAttempts = events?.filter(e => e.blocked).length || 0;
      const uniqueIps = new Set(events?.map(e => e.ip_address)).size || 0;

      // Calculate top attack types
      const attackTypes: Record<string, number> = {};
      events?.forEach(event => {
        const action = event.details?.action || event.event_type;
        attackTypes[action] = (attackTypes[action] || 0) + 1;
      });

      const topAttackTypes = Object.entries(attackTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        total_events: totalEvents,
        high_risk_events: highRiskEvents,
        blocked_attempts: blockedAttempts,
        unique_ips: uniqueIps,
        top_attack_types: topAttackTypes,
        recent_events: (events?.slice(0, 10) || []) as SecurityAuditEvent[],
      };
    } catch (error) {
      logger.error('Error getting security metrics:', error);
      return {
        total_events: 0,
        high_risk_events: 0,
        blocked_attempts: 0,
        unique_ips: 0,
        top_attack_types: [],
        recent_events: [],
      };
    }
  }

  /**
   * Get recent security events for a specific user
   */
  async getUserSecurityEvents(userId: string, limit = 50): Promise<SecurityAuditEvent[]> {
    try {
      const { data: events, error } = await this.supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (events || []) as SecurityAuditEvent[];
    } catch (error) {
      logger.error('Error getting user security events:', error);
      return [];
    }
  }

  /**
   * Check if IP should be blocked based on recent activity
   */
  async shouldBlockIP(ipAddress: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: events, error } = await this.supabase
        .from('security_events')
        .select('severity, blocked')
        .eq('ip_address', ipAddress)
        .gte('created_at', oneHourAgo);

      if (error) throw error;

      const criticalEvents = events?.filter(e => e.severity === 'critical').length || 0;
      const highRiskEvents = events?.filter(e => e.severity === 'high').length || 0;
      const totalEvents = events?.length || 0;

      // Block IP if:
      // - More than 3 critical events in the last hour
      // - More than 10 high risk events in the last hour
      // - More than 50 total security events in the last hour
      return criticalEvents > 3 || highRiskEvents > 10 || totalEvents > 50;
    } catch (error) {
      logger.error('Error checking IP block status:', error);
      return false;
    }
  }

  /**
   * Clean up old security events (run as a scheduled job)
   */
  async cleanupOldEvents(retentionDays = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await this.supabase
        .from('security_events')
        .delete()
        .lt('created_at', cutoffDate);

      if (error) throw error;

      logger.info('Cleaned up old security events', { cutoffDate, retentionDays });
    } catch (error) {
      logger.error('Error cleaning up old security events:', error);
    }
  }

  private getTimeframeMs(timeframe: string): number {
    const timeMap = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    return timeMap[timeframe as keyof typeof timeMap] || timeMap.day;
  }
}

// Export singleton instance
export const securityAuditService = new SecurityAuditService();
