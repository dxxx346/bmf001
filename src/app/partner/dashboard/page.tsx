'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  MousePointer, 
  Target, 
  DollarSign, 
  TrendingUp,
  Link,
  Calendar,
  Filter,
  RefreshCw,
  ExternalLink,
  Award,
  Users,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReferralStats, CompactReferralStats, ReferralStatsData } from '@/components/partner/ReferralStats';
import { SimpleDateRangePicker, PredefinedPeriod, getDateRangeFromPeriod } from '@/components/analytics/DateRangePicker';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface RecentReferral {
  id: string;
  link_name: string;
  link_code: string;
  product_name: string;
  customer_name: string;
  commission: number;
  status: 'pending' | 'confirmed' | 'paid';
  created_at: string;
}

interface TopLink {
  id: string;
  name: string;
  code: string;
  clicks: number;
  conversions: number;
  earnings: number;
  conversion_rate: number;
  created_at: string;
}

interface PartnerDashboardData {
  stats: ReferralStatsData;
  recent_referrals: RecentReferral[];
  payout_info: {
    pending_amount: number;
    next_payout_date: string;
    total_paid: number;
    minimum_payout: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earned_at: string;
  }>;
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuthContext();
  
  const [dashboardData, setDashboardData] = useState<PartnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PredefinedPeriod>('30d');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, selectedPeriod]);

  const loadDashboardData = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const dateRange = getDateRangeFromPeriod(selectedPeriod);
      const params = new URLSearchParams({
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
      });

      const response = await fetch(`/api/partner/dashboard?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setDashboardData(data);
      } else {
        throw new Error(data.error || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Target className="h-3 w-3" />;
      case 'pending':
        return <Calendar className="h-3 w-3" />;
      case 'paid':
        return <DollarSign className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
              <p className="text-gray-600">
                Track your referral performance and earnings
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <SimpleDateRangePicker
                period={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
              
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                <span>Refresh</span>
              </Button>
              
              <Button
                onClick={() => router.push('/partner/links/create')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Link</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-8">
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                      </div>
                      <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Charts skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : dashboardData ? (
          <div className="space-y-8">
            {/* Welcome Message */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-2">
                    Welcome back, {profile?.name || 'Partner'}! 🎉
                  </h2>
                  <p className="text-blue-100">
                    You've earned {formatCurrency(dashboardData.stats.total_earnings)} this {selectedPeriod === '7d' ? 'week' : 'month'}!
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {dashboardData.stats.total_conversions}
                  </div>
                  <div className="text-blue-100 text-sm">Conversions</div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Clicks</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {dashboardData.stats.total_clicks.toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-500">
                        All time
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <MousePointer className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Conversions</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {dashboardData.stats.total_conversions}
                      </div>
                      <p className="text-sm text-gray-500">
                        {dashboardData.stats.conversion_rate.toFixed(1)}% rate
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Target className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(dashboardData.stats.total_earnings)}
                      </div>
                      <p className="text-sm text-gray-500">
                        This period
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Payout</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(dashboardData.payout_info.pending_amount)}
                      </div>
                      <p className="text-sm text-gray-500">
                        Next: {new Date(dashboardData.payout_info.next_payout_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Performance Stats */}
              <div>
                <ReferralStats
                  data={dashboardData.stats}
                  period={selectedPeriod}
                  onPeriodChange={(period: string) => setSelectedPeriod(period as PredefinedPeriod)}
                />
              </div>

              {/* Quick Actions and Info */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={() => router.push('/partner/links/create')}
                      className="w-full justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Referral Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/partner/links')}
                      className="w-full justify-start"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Manage All Links
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/partner/analytics')}
                      className="w-full justify-start"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Detailed Analytics
                    </Button>
                  </CardContent>
                </Card>

                {/* Payout Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5" />
                      <span>Payout Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Pending Amount</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(dashboardData.payout_info.pending_amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Paid</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(dashboardData.payout_info.total_paid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Next Payout</span>
                      <span className="font-medium text-gray-900">
                        {new Date(dashboardData.payout_info.next_payout_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500">
                        Minimum payout: {formatCurrency(dashboardData.payout_info.minimum_payout)}
                      </div>
                      {dashboardData.payout_info.pending_amount >= dashboardData.payout_info.minimum_payout ? (
                        <Badge className="mt-1 bg-green-100 text-green-800">
                          Ready for payout
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mt-1">
                          {formatCurrency(dashboardData.payout_info.minimum_payout - dashboardData.payout_info.pending_amount)} to minimum
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Achievements */}
                {dashboardData.achievements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Award className="h-5 w-5" />
                        <span>Recent Achievements</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dashboardData.achievements.slice(0, 3).map((achievement) => (
                          <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-2xl">{achievement.icon}</div>
                            <div>
                              <p className="font-medium text-yellow-900">{achievement.title}</p>
                              <p className="text-sm text-yellow-700">{achievement.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Recent Referrals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Recent Referrals</span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/partner/referrals')}
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View All</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dashboardData.recent_referrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Link
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Commission
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dashboardData.recent_referrals.map((referral) => (
                          <tr key={referral.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div>
                                <div className="font-medium text-gray-900">{referral.link_name}</div>
                                <div className="text-sm text-gray-500">Code: {referral.link_code}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {referral.product_name}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {referral.customer_name}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-green-600">
                              {formatCurrency(referral.commission)}
                            </td>
                            <td className="px-4 py-4">
                              <Badge className={getStatusColor(referral.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(referral.status)}
                                  <span>{referral.status}</span>
                                </div>
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {new Date(referral.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No referrals yet</h3>
                    <p className="text-gray-600 mb-4">
                      Create your first referral link to start earning commissions
                    </p>
                    <Button onClick={() => router.push('/partner/links/create')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Link
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Performance Tips</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Increase Click-Through Rate</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Write compelling descriptions for your links</li>
                      <li>• Share in relevant communities and groups</li>
                      <li>• Use eye-catching visuals and QR codes</li>
                      <li>• Time your posts for maximum engagement</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Boost Conversions</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Target products that match your audience</li>
                      <li>• Add personal recommendations and reviews</li>
                      <li>• Share during sales and promotional periods</li>
                      <li>• Build trust with your audience first</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Maximize Earnings</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Focus on higher-priced products</li>
                      <li>• Promote products with higher commission rates</li>
                      <li>• Diversify across different product categories</li>
                      <li>• Track and optimize your best-performing links</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">Long-term Success</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Build a loyal audience and email list</li>
                      <li>• Create valuable content around products</li>
                      <li>• Stay updated on new products and trends</li>
                      <li>• Analyze your performance data regularly</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to the Partner Program!</h3>
            <p className="text-gray-600 mb-8">
              Start earning commissions by creating your first referral link
            </p>
            <Button onClick={() => router.push('/partner/links/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Link
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
