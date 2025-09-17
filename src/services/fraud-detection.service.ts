import { createServiceClient } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import { ReferralService } from './referral.service';

interface FraudRule {
  id: string;
  name: string;
  type: 'ip_abuse' | 'click_fraud' | 'bot_traffic' | 'suspicious_pattern' | 'duplicate_conversion';
  threshold: number;
  weight: number;
  is_active: boolean;
}

interface FraudAnalysis {
  riskScore: number;
  fraudTypes: string[];
  details: Record<string, any>;
  recommendations: string[];
  shouldBlock: boolean;
  shouldFlag: boolean;
}

interface IPAnalysis {
  ip: string;
  clickCount24h: number;
  conversionCount24h: number;
  isVPN: boolean;
  isProxy: boolean;
  isDatacenter: boolean;
  country: string;
  riskScore: number;
}

interface UserAgentAnalysis {
  userAgent: string;
  isBot: boolean;
  browserFamily: string;
  osFamily: string;
  deviceFamily: string;
  riskScore: number;
}

interface ConversionPattern {
  referralId: string;
  timeBetweenClickAndPurchase: number; // in seconds
  purchaseAmount: number;
  ipAddress: string;
  userAgent: string;
  riskScore: number;
}

export class FraudDetectionService {
  private supabase = createServiceClient();
  private referralService = new ReferralService();

  // Default fraud detection rules
  private defaultRules: Omit<FraudRule, 'id'>[] = [
    {
      name: 'High IP Click Volume',
      type: 'ip_abuse',
      threshold: 10, // clicks per hour from same IP
      weight: 0.3,
      is_active: true
    },
    {
      name: 'Rapid Conversions',
      type: 'suspicious_pattern',
      threshold: 3, // conversions per hour
      weight: 0.25,
      is_active: true
    },
    {
      name: 'Bot User Agent',
      type: 'bot_traffic',
      threshold: 1, // any bot detection
      weight: 0.2,
      is_active: true
    },
    {
      name: 'Click Fraud Pattern',
      type: 'click_fraud',
      threshold: 20, // clicks without conversion
      weight: 0.15,
      is_active: true
    },
    {
      name: 'Duplicate Conversion',
      type: 'duplicate_conversion',
      threshold: 1, // same IP multiple conversions
      weight: 0.4,
      is_active: true
    }
  ];

  /**
   * Analyze a referral click for fraud patterns
   */
  async analyzeClick(
    referralId: string,
    ipAddress: string,
    userAgent: string,
    referrerUrl?: string
  ): Promise<FraudAnalysis> {
    try {
      logInfo('Analyzing click for fraud', { referralId, ipAddress });

      const analyses = await Promise.all([
        this.analyzeIP(ipAddress),
        this.analyzeUserAgent(userAgent),
        this.analyzeClickPattern(referralId, ipAddress, userAgent)
      ]);

      const [ipAnalysis, uaAnalysis, patternAnalysis] = analyses;

      // Calculate overall risk score
      let riskScore = 0;
      const fraudTypes: string[] = [];
      const details: Record<string, any> = {};
      const recommendations: string[] = [];

      // IP Analysis
      if (ipAnalysis.riskScore > 0.3) {
        riskScore += ipAnalysis.riskScore * 0.4;
        fraudTypes.push('ip_abuse');
        details.ip_analysis = ipAnalysis;
        
        if (ipAnalysis.isVPN || ipAnalysis.isProxy) {
          recommendations.push('Block VPN/Proxy traffic');
        }
        if (ipAnalysis.clickCount24h > 20) {
          recommendations.push('Rate limit this IP address');
        }
      }

      // User Agent Analysis
      if (uaAnalysis.riskScore > 0.3) {
        riskScore += uaAnalysis.riskScore * 0.3;
        fraudTypes.push('bot_traffic');
        details.user_agent_analysis = uaAnalysis;
        
        if (uaAnalysis.isBot) {
          recommendations.push('Block bot traffic');
        }
      }

      // Pattern Analysis
      if (patternAnalysis.riskScore > 0.3) {
        riskScore += patternAnalysis.riskScore * 0.3;
        fraudTypes.push('suspicious_pattern');
        details.pattern_analysis = patternAnalysis;
        recommendations.push('Monitor referral for suspicious patterns');
      }

      // Normalize risk score
      riskScore = Math.min(riskScore, 1.0);

      // Determine actions
      const shouldBlock = riskScore >= 0.8;
      const shouldFlag = riskScore >= 0.5;

      // Log fraud detection if significant risk
      if (shouldFlag) {
        await this.logFraudDetection(
          referralId,
          null,
          null,
          fraudTypes[0] || 'suspicious_pattern',
          riskScore,
          details,
          ipAddress,
          userAgent,
          shouldBlock
        );
      }

      return {
        riskScore,
        fraudTypes,
        details,
        recommendations,
        shouldBlock,
        shouldFlag
      };

    } catch (error) {
      logError(error as Error, { action: 'analyze_click', referralId, ipAddress });
      return {
        riskScore: 0,
        fraudTypes: [],
        details: {},
        recommendations: [],
        shouldBlock: false,
        shouldFlag: false
      };
    }
  }

  /**
   * Analyze a referral conversion for fraud patterns
   */
  async analyzeConversion(
    referralId: string,
    purchaseId: string,
    ipAddress: string,
    userAgent: string,
    timeBetweenClickAndPurchase?: number
  ): Promise<FraudAnalysis> {
    try {
      logInfo('Analyzing conversion for fraud', { referralId, purchaseId, ipAddress });

      const [
        ipAnalysis,
        uaAnalysis,
        conversionPattern,
        duplicateCheck
      ] = await Promise.all([
        this.analyzeIP(ipAddress),
        this.analyzeUserAgent(userAgent),
        this.analyzeConversionPattern(referralId, purchaseId, ipAddress, timeBetweenClickAndPurchase),
        this.checkDuplicateConversions(referralId, ipAddress, userAgent)
      ]);

      let riskScore = 0;
      const fraudTypes: string[] = [];
      const details: Record<string, any> = {};
      const recommendations: string[] = [];

      // IP Analysis
      if (ipAnalysis.riskScore > 0.3) {
        riskScore += ipAnalysis.riskScore * 0.3;
        fraudTypes.push('ip_abuse');
        details.ip_analysis = ipAnalysis;
      }

      // User Agent Analysis
      if (uaAnalysis.riskScore > 0.3) {
        riskScore += uaAnalysis.riskScore * 0.2;
        fraudTypes.push('bot_traffic');
        details.user_agent_analysis = uaAnalysis;
      }

      // Conversion Pattern Analysis
      if (conversionPattern.riskScore > 0.3) {
        riskScore += conversionPattern.riskScore * 0.3;
        fraudTypes.push('suspicious_pattern');
        details.conversion_pattern = conversionPattern;
      }

      // Duplicate Conversion Check
      if (duplicateCheck.isDuplicate) {
        riskScore += 0.4;
        fraudTypes.push('duplicate_conversion');
        details.duplicate_check = duplicateCheck;
        recommendations.push('Review for duplicate conversions');
      }

      // Time-based fraud detection
      if (timeBetweenClickAndPurchase !== undefined) {
        if (timeBetweenClickAndPurchase < 10) { // Less than 10 seconds
          riskScore += 0.3;
          fraudTypes.push('suspicious_pattern');
          details.conversion_speed = {
            seconds: timeBetweenClickAndPurchase,
            risk: 'too_fast'
          };
          recommendations.push('Conversion happened too quickly after click');
        }
      }

      riskScore = Math.min(riskScore, 1.0);
      const shouldBlock = riskScore >= 0.7;
      const shouldFlag = riskScore >= 0.4;

      // Log fraud detection
      if (shouldFlag) {
        await this.logFraudDetection(
          referralId,
          null,
          purchaseId,
          fraudTypes[0] || 'suspicious_pattern',
          riskScore,
          details,
          ipAddress,
          userAgent,
          shouldBlock
        );
      }

      return {
        riskScore,
        fraudTypes,
        details,
        recommendations,
        shouldBlock,
        shouldFlag
      };

    } catch (error) {
      logError(error as Error, { action: 'analyze_conversion', referralId, purchaseId });
      return {
        riskScore: 0,
        fraudTypes: [],
        details: {},
        recommendations: [],
        shouldBlock: false,
        shouldFlag: false
      };
    }
  }

  /**
   * Analyze IP address for fraud indicators
   */
  private async analyzeIP(ipAddress: string): Promise<IPAnalysis> {
    try {
      // Get click statistics for this IP in the last 24 hours
      const { data: ipClicks, error: clickError } = await this.supabase
        .from('referral_clicks')
        .select('clicked_at')
        .eq('visitor_ip', ipAddress)
        .gte('clicked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (clickError) throw clickError;

      // Get conversion statistics for this IP in the last 24 hours
      const { data: ipConversions, error: convError } = await this.supabase
        .from('referral_conversions')
        .select('created_at')
        .eq('ip_address', ipAddress)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (convError) throw convError;

      const clickCount24h = ipClicks?.length || 0;
      const conversionCount24h = ipConversions?.length || 0;

      // Basic IP risk assessment
      let riskScore = 0;

      // High click volume
      if (clickCount24h > 50) {
        riskScore += 0.4;
      } else if (clickCount24h > 20) {
        riskScore += 0.2;
      }

      // High conversion volume
      if (conversionCount24h > 10) {
        riskScore += 0.3;
      } else if (conversionCount24h > 5) {
        riskScore += 0.15;
      }

      // Check for local IP addresses
      const isLocalIP = this.isLocalIP(ipAddress);
      if (isLocalIP) {
        riskScore += 0.1;
      }

      // Placeholder for VPN/Proxy detection (integrate with actual service)
      const vpnCheck = await this.checkVPNProxy(ipAddress);

      return {
        ip: ipAddress,
        clickCount24h,
        conversionCount24h,
        isVPN: vpnCheck.isVPN,
        isProxy: vpnCheck.isProxy,
        isDatacenter: vpnCheck.isDatacenter,
        country: vpnCheck.country,
        riskScore: Math.min(riskScore, 1.0)
      };

    } catch (error) {
      logError(error as Error, { action: 'analyze_ip', ipAddress });
      return {
        ip: ipAddress,
        clickCount24h: 0,
        conversionCount24h: 0,
        isVPN: false,
        isProxy: false,
        isDatacenter: false,
        country: 'unknown',
        riskScore: 0
      };
    }
  }

  /**
   * Analyze User Agent for bot patterns
   */
  private async analyzeUserAgent(userAgent: string): Promise<UserAgentAnalysis> {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
      /python/i, /java/i, /go-http/i, /okhttp/i, /apache-httpclient/i,
      /headlesschrome/i, /phantomjs/i, /selenium/i, /webdriver/i
    ];

    const isBot = botPatterns.some(pattern => pattern.test(userAgent));

    // Simple browser detection
    const browserFamily = this.extractBrowserFamily(userAgent);
    const osFamily = this.extractOSFamily(userAgent);
    const deviceFamily = this.extractDeviceFamily(userAgent);

    let riskScore = 0;

    if (isBot) {
      riskScore += 0.8;
    }

    // Check for suspicious patterns
    if (userAgent.length < 20) {
      riskScore += 0.2;
    }

    if (!userAgent.includes('Mozilla')) {
      riskScore += 0.3;
    }

    return {
      userAgent,
      isBot,
      browserFamily,
      osFamily,
      deviceFamily,
      riskScore: Math.min(riskScore, 1.0)
    };
  }

  /**
   * Analyze click patterns for a referral
   */
  private async analyzeClickPattern(
    referralId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ riskScore: number; details: any }> {
    try {
      // Get recent clicks for this referral
      const { data: recentClicks, error } = await this.supabase
        .from('referral_clicks')
        .select('visitor_ip, user_agent, clicked_at')
        .eq('referral_id', referralId)
        .gte('clicked_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('clicked_at', { ascending: false });

      if (error) throw error;

      let riskScore = 0;
      const details: any = {};

      // Check for rapid clicking
      if (recentClicks && recentClicks.length > 10) {
        riskScore += 0.3;
        details.rapid_clicking = {
          clicksLastHour: recentClicks.length,
          risk: 'high_frequency'
        };
      }

      // Check for same IP multiple clicks
      const sameIPClicks = recentClicks?.filter(click => click.visitor_ip === ipAddress).length || 0;
      if (sameIPClicks > 5) {
        riskScore += 0.2;
        details.ip_repetition = {
          clicksFromSameIP: sameIPClicks,
          risk: 'ip_abuse'
        };
      }

      // Check for same user agent multiple clicks
      const sameUAClicks = recentClicks?.filter(click => click.user_agent === userAgent).length || 0;
      if (sameUAClicks > 5) {
        riskScore += 0.15;
        details.ua_repetition = {
          clicksFromSameUA: sameUAClicks,
          risk: 'bot_pattern'
        };
      }

      return {
        riskScore: Math.min(riskScore, 1.0),
        details
      };

    } catch (error) {
      logError(error as Error, { action: 'analyze_click_pattern', referralId });
      return { riskScore: 0, details: {} };
    }
  }

  /**
   * Analyze conversion patterns
   */
  private async analyzeConversionPattern(
    referralId: string,
    purchaseId: string,
    ipAddress: string,
    timeBetweenClickAndPurchase?: number
  ): Promise<ConversionPattern> {
    try {
      // Get purchase details
      const { data: purchase, error: purchaseError } = await this.supabase
        .from('purchases')
        .select('amount')
        .eq('id', purchaseId)
        .single();

      if (purchaseError) throw purchaseError;

      let riskScore = 0;

      // Analyze conversion speed
      if (timeBetweenClickAndPurchase !== undefined) {
        if (timeBetweenClickAndPurchase < 10) {
          riskScore += 0.4; // Very fast conversion is suspicious
        } else if (timeBetweenClickAndPurchase < 30) {
          riskScore += 0.2;
        }
      }

      // Analyze purchase amount patterns
      const purchaseAmount = parseFloat(purchase.amount);
      if (purchaseAmount > 1000) {
        riskScore += 0.1; // High-value purchases need more scrutiny
      }

      return {
        referralId,
        timeBetweenClickAndPurchase: timeBetweenClickAndPurchase || 0,
        purchaseAmount,
        ipAddress,
        userAgent: '', // Would be passed in real implementation
        riskScore: Math.min(riskScore, 1.0)
      };

    } catch (error) {
      logError(error as Error, { action: 'analyze_conversion_pattern', referralId, purchaseId });
      return {
        referralId,
        timeBetweenClickAndPurchase: 0,
        purchaseAmount: 0,
        ipAddress,
        userAgent: '',
        riskScore: 0
      };
    }
  }

  /**
   * Check for duplicate conversions
   */
  private async checkDuplicateConversions(
    referralId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ isDuplicate: boolean; details: any }> {
    try {
      // Check for multiple conversions from same IP
      const { data: ipConversions, error: ipError } = await this.supabase
        .from('referral_conversions')
        .select('id, created_at')
        .eq('referral_id', referralId)
        .eq('ip_address', ipAddress)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (ipError) throw ipError;

      // Check for multiple conversions from same user agent
      const { data: uaConversions, error: uaError } = await this.supabase
        .from('referral_conversions')
        .select('id, created_at')
        .eq('referral_id', referralId)
        .eq('user_agent', userAgent)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (uaError) throw uaError;

      const isDuplicate = (ipConversions?.length || 0) > 1 || (uaConversions?.length || 0) > 1;

      return {
        isDuplicate,
        details: {
          ipConversions: ipConversions?.length || 0,
          uaConversions: uaConversions?.length || 0
        }
      };

    } catch (error) {
      logError(error as Error, { action: 'check_duplicate_conversions', referralId });
      return { isDuplicate: false, details: {} };
    }
  }

  /**
   * Log fraud detection to database
   */
  private async logFraudDetection(
    referralId: string,
    trackingId: string | null,
    conversionId: string | null,
    fraudType: string,
    riskScore: number,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    isBlocked: boolean
  ): Promise<void> {
    try {
      await this.supabase
        .from('fraud_detection')
        .insert({
          referral_id: referralId,
          tracking_id: trackingId,
          conversion_id: conversionId,
          fraud_type: fraudType,
          risk_score: riskScore,
          details,
          ip_address: ipAddress,
          user_agent: userAgent,
          is_flagged: isBlocked,
          status: isBlocked ? 'rejected' : 'pending'
        });

      logInfo('Fraud detection logged', {
        referralId,
        fraudType,
        riskScore,
        isBlocked
      });

    } catch (error) {
      logError(error as Error, { action: 'log_fraud_detection', referralId });
    }
  }

  /**
   * Check if IP is VPN/Proxy (placeholder for actual service integration)
   */
  private async checkVPNProxy(ipAddress: string): Promise<{
    isVPN: boolean;
    isProxy: boolean;
    isDatacenter: boolean;
    country: string;
  }> {
    // This would integrate with services like:
    // - MaxMind GeoIP2
    // - IPQualityScore
    // - IPinfo.io
    // - VPN/Proxy detection APIs

    // For now, return basic info
    return {
      isVPN: false,
      isProxy: false,
      isDatacenter: false,
      country: 'unknown'
    };
  }

  /**
   * Check if IP is a local/private address
   */
  private isLocalIP(ip: string): boolean {
    const localPatterns = [
      /^127\./,           // 127.0.0.0/8 (localhost)
      /^192\.168\./,      // 192.168.0.0/16 (private)
      /^10\./,            // 10.0.0.0/8 (private)
      /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12 (private)
      /^::1$/,            // IPv6 localhost
      /^fe80:/            // IPv6 link-local
    ];

    return localPatterns.some(pattern => pattern.test(ip));
  }

  /**
   * Extract browser family from user agent
   */
  private extractBrowserFamily(userAgent: string): string {
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'Safari';
    if (/edge/i.test(userAgent)) return 'Edge';
    if (/opera/i.test(userAgent)) return 'Opera';
    return 'Unknown';
  }

  /**
   * Extract OS family from user agent
   */
  private extractOSFamily(userAgent: string): string {
    if (/windows/i.test(userAgent)) return 'Windows';
    if (/macintosh|mac os x/i.test(userAgent)) return 'macOS';
    if (/linux/i.test(userAgent)) return 'Linux';
    if (/android/i.test(userAgent)) return 'Android';
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  /**
   * Extract device family from user agent
   */
  private extractDeviceFamily(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }

  /**
   * Get fraud detection rules
   */
  async getFraudRules(): Promise<FraudRule[]> {
    try {
      const { data, error } = await this.supabase
        .from('fraud_rules')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logError(error as Error, { action: 'get_fraud_rules' });
      return [];
    }
  }

  /**
   * Update fraud detection rule
   */
  async updateFraudRule(ruleId: string, updates: Partial<FraudRule>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('fraud_rules')
        .update(updates)
        .eq('id', ruleId);

      if (error) throw error;

      logInfo('Fraud rule updated', { ruleId, updates });
    } catch (error) {
      logError(error as Error, { action: 'update_fraud_rule', ruleId });
      throw error;
    }
  }

  /**
   * Get fraud detection statistics
   */
  async getFraudStats(referrerId?: string, days: number = 30): Promise<{
    totalFlags: number;
    blockedConversions: number;
    fraudByType: Record<string, number>;
    averageRiskScore: number;
    recentFlags: Array<{
      id: string;
      fraud_type: string;
      risk_score: number;
      created_at: string;
      details: any;
    }>;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let query = this.supabase
        .from('fraud_detection')
        .select('*')
        .gte('created_at', startDate);

      if (referrerId) {
        query = query.in('referral_id', 
          this.supabase
            .from('referrals')
            .select('id')
            .eq('referrer_id', referrerId)
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalFlags = data?.length || 0;
      const blockedConversions = data?.filter(d => d.is_flagged).length || 0;
      
      const fraudByType = data?.reduce((acc: Record<string, number>, item) => {
        acc[item.fraud_type] = (acc[item.fraud_type] || 0) + 1;
        return acc;
      }, {}) || {};

      const averageRiskScore = data?.length 
        ? data.reduce((sum, item) => sum + parseFloat(item.risk_score), 0) / data.length
        : 0;

      const recentFlags = data?.slice(-10) || [];

      return {
        totalFlags,
        blockedConversions,
        fraudByType,
        averageRiskScore,
        recentFlags
      };

    } catch (error) {
      logError(error as Error, { action: 'get_fraud_stats', referrerId });
      return {
        totalFlags: 0,
        blockedConversions: 0,
        fraudByType: {},
        averageRiskScore: 0,
        recentFlags: []
      };
    }
  }
}
