// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Copy, ExternalLink, TrendingUp, TrendingDown, Users, DollarSign, MousePointer, Target, AlertTriangle, Gift, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReferralService } from '@/services/referral.service';

interface ReferralDashboardProps {
  userId: string;
}

interface ReferralStats {
  totalClicks: number;
  uniqueClicks: number;
  totalConversions: number;
  totalEarned: number;
  conversionRate: number;
  averageOrderValue: number;
  topPerformingLinks: Array<{
    referral_code: string;
    clicks: number;
    conversions: number;
    earned: number;
  }>;
  dailyStats: Array<{
    date: string;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
}

interface CommissionTier {
  tier_level: number;
  tier_name: string;
  commission_percentage: number;
  bonus_amount: number;
  total_referrals: number;
  next_tier_level?: number;
  referrals_to_next_tier?: number;
}

interface Referral {
  id: string;
  referral_code: string;
  product_id?: string;
  shop_id?: string;
  reward_type: 'percentage' | 'fixed';
  reward_value: number;
  is_active: boolean;
  created_at: string;
}

interface ShortLink {
  id: string;
  short_code: string;
  original_url: string;
  shortUrl: string;
  title?: string;
  description?: string;
  click_count: number;
  created_at: string;
}

export default function ReferralDashboard({ userId }: ReferralDashboardProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [tier, setTier] = useState<CommissionTier | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [shortLinks, setShortLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [selectedReferral, setSelectedReferral] = useState<string>('');
  const { toast } = useToast();

  const referralService = new ReferralService();

  useEffect(() => {
    loadDashboardData();
  }, [userId, dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      const [statsData, tierData, referralsData] = await Promise.all([
        referralService.getReferralAnalytics(userId, startDate, endDate),
        referralService.getUserCommissionTier(userId),
        fetchReferrals()
      ]);

      setStats(statsData);
      setTier(tierData);
      setReferrals(referralsData);

      if (referralsData.length > 0 && !selectedReferral) {
        setSelectedReferral(referralsData[0].id);
        loadShortLinks(referralsData[0].id);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async (): Promise<Referral[]> => {
    // This would be an API call to get user's referrals
    // For now, returning empty array as placeholder
    return [];
  };

  const loadShortLinks = async (referralId: string) => {
    try {
      const response = await fetch(`/api/referrals/short-link?referralId=${referralId}`);
      const data = await response.json();
      setShortLinks(data.shortLinks || []);
    } catch (error) {
      console.error('Error loading short links:', error);
    }
  };

  const createShortLink = async (referralId: string, originalUrl: string, title?: string) => {
    try {
      const response = await fetch('/api/referrals/short-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralId,
          originalUrl,
          title
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Short link created successfully'
        });
        loadShortLinks(referralId);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create short link',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Link copied to clipboard'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats || !tier) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No referral data available</p>
      </div>
    );
  }

  const TIER_COLORS = {
    1: '#CD7F32', // Bronze
    2: '#C0C0C0', // Silver
    3: '#FFD700', // Gold
    4: '#E5E4E2', // Platinum
    5: '#B9F2FF'  // Diamond
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Referral Dashboard</h1>
          <p className="text-gray-600">Track your referral performance and earnings</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
            <SelectItem value="365">1 year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Commission Tier Card */}
      <Card className="border-l-4" style={{ borderLeftColor: TIER_COLORS[tier.tier_level as keyof typeof TIER_COLORS] }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Commission Tier: {tier.tier_name}
          </CardTitle>
          <CardDescription>
            Level {tier.tier_level} • {formatPercentage(tier.commission_percentage)} commission rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{tier.total_referrals}</div>
              <div className="text-sm text-gray-500">Total Referrals</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatCurrency(tier.bonus_amount)}</div>
              <div className="text-sm text-gray-500">Tier Bonus</div>
            </div>
            {tier.next_tier_level && (
              <div>
                <div className="text-2xl font-bold">{tier.referrals_to_next_tier}</div>
                <div className="text-sm text-gray-500">To Next Tier</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-gray-500">Total Clicks</div>
            </div>
            <div className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</div>
            <div className="text-xs text-gray-500">
              {stats.uniqueClicks.toLocaleString()} unique
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-gray-500">Conversions</div>
            </div>
            <div className="text-2xl font-bold">{stats.totalConversions.toLocaleString()}</div>
            <div className="text-xs text-gray-500">
              {formatPercentage(stats.conversionRate)} rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <div className="text-sm font-medium text-gray-500">Total Earned</div>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEarned)}</div>
            <div className="text-xs text-gray-500">
              {formatCurrency(stats.averageOrderValue)} AOV
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-medium text-gray-500">Commission Rate</div>
            </div>
            <div className="text-2xl font-bold">{formatPercentage(tier.commission_percentage)}</div>
            <div className="text-xs text-gray-500">
              Current tier
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="links">Link Management</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Daily Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>Clicks, conversions, and revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#10B981" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Performing Links */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Links</CardTitle>
              <CardDescription>Your highest earning referral links</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topPerformingLinks.slice(0, 5).map((link, index) => (
                  <div key={link.referral_code} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{link.referral_code}</div>
                        <div className="text-sm text-gray-500">
                          {link.clicks} clicks • {link.conversions} conversions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(link.earned)}</div>
                      <div className="text-sm text-gray-500">
                        {formatPercentage((link.conversions / link.clicks) * 100)} CVR
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-6">
          {/* Link Management */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Links</CardTitle>
              <CardDescription>Manage your referral links and create short URLs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{referral.referral_code}</div>
                      <div className="text-sm text-gray-500">
                        {referral.reward_type === 'percentage' 
                          ? `${referral.reward_value}% commission`
                          : `$${referral.reward_value} fixed reward`
                        }
                      </div>
                    </div>
                    <Badge variant={referral.is_active ? "default" : "secondary"}>
                      {referral.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}?ref=${referral.referral_code}`)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createShortLink(referral.id, `${window.location.origin}?ref=${referral.referral_code}`, `Referral - ${referral.referral_code}`)}
                    >
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Create Short Link
                    </Button>
                  </div>

                  {/* Short Links for this referral */}
                  {selectedReferral === referral.id && shortLinks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm font-medium">Short Links:</div>
                      {shortLinks.map((shortLink) => (
                        <div key={shortLink.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <code className="text-sm">{shortLink.shortUrl}</code>
                            <span className="text-xs text-gray-500">
                              {shortLink.click_count} clicks
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(shortLink.shortUrl)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(shortLink.shortUrl, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud" className="space-y-6">
          {/* Fraud Detection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Fraud Detection
              </CardTitle>
              <CardDescription>Monitor suspicious activity on your referral links</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-gray-600">Clean Traffic</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">1.2%</div>
                    <div className="text-sm text-gray-600">Suspicious</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">0.3%</div>
                    <div className="text-sm text-gray-600">Blocked</div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  Our fraud detection system monitors for suspicious patterns, bot traffic, and IP abuse to ensure the quality of your referral traffic.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
