# Partner Referral Integration Examples

## Quick Integration Guide

### 1. Basic Partner Dashboard Setup

```tsx
// Complete partner dashboard implementation
import { useState, useEffect } from 'react';
import { ReferralStats, CompactReferralStats } from '@/components/partner';
import { SimpleDateRangePicker } from '@/components/analytics';

function PartnerDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async (selectedPeriod) => {
    setIsLoading(true);
    try {
      const dateRange = getDateRangeFromPeriod(selectedPeriod);
      const params = new URLSearchParams({
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
      });
      
      const response = await fetch(`/api/partner/dashboard?${params}`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(period);
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Partner Dashboard</h1>
        <SimpleDateRangePicker
          period={period}
          onPeriodChange={setPeriod}
        />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Clicks"
          value={dashboardData?.stats.total_clicks || 0}
          icon="👆"
          color="blue"
        />
        <MetricCard
          title="Conversions"
          value={dashboardData?.stats.total_conversions || 0}
          icon="🎯"
          color="green"
        />
        <MetricCard
          title="Earnings"
          value={dashboardData?.stats.total_earnings || 0}
          format="currency"
          icon="💰"
          color="yellow"
        />
        <MetricCard
          title="Conversion Rate"
          value={dashboardData?.stats.conversion_rate || 0}
          format="percentage"
          icon="📈"
          color="purple"
        />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReferralStats
          data={dashboardData?.stats || {}}
          isLoading={isLoading}
          period={period}
          onPeriodChange={setPeriod}
        />
        
        <div className="space-y-4">
          <CompactReferralStats
            data={dashboardData?.stats || {}}
          />
          
          {/* Recent referrals */}
          <RecentReferralsList
            referrals={dashboardData?.recent_referrals || []}
          />
        </div>
      </div>

      {/* Payout information */}
      <PayoutInfoCard
        payoutInfo={dashboardData?.payout_info || {}}
      />
    </div>
  );
}

// Helper components
function MetricCard({ title, value, format = 'number', icon, color }) {
  const formatValue = (val, fmt) => {
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-600">{title}</h3>
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(value, format)}
          </div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}
```

### 2. Advanced Link Generator with Custom Features

```tsx
// Enhanced link generator with additional features
import { useState } from 'react';
import { LinkGenerator } from '@/components/partner/LinkGenerator';

function AdvancedLinkCreator() {
  const [generatedLinks, setGeneratedLinks] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [templateMode, setTemplateMode] = useState(false);

  // Bulk link generation
  const handleBulkGeneration = async (products) => {
    const links = [];
    
    for (const product of products) {
      try {
        const linkData = {
          name: `${product.title} Referral`,
          type: 'product',
          target_id: product.id,
          commission_rate: calculateOptimalRate(product),
        };
        
        const newLink = await generateReferralLink(linkData);
        links.push(newLink);
      } catch (error) {
        console.error(`Failed to create link for ${product.title}:`, error);
      }
    }
    
    setGeneratedLinks(links);
    toast.success(`Generated ${links.length} referral links`);
  };

  // Template-based generation
  const linkTemplates = [
    {
      name: 'Holiday Sale Template',
      pattern: '{product_name} Holiday Deal - {discount}% OFF',
      codePattern: 'HOLIDAY{random}',
      commission_rate: 15,
    },
    {
      name: 'New Product Launch',
      pattern: 'New: {product_name} - Limited Time',
      codePattern: 'NEW{random}',
      commission_rate: 12,
    },
    {
      name: 'Bundle Promotion',
      pattern: '{product_name} Bundle Deal',
      codePattern: 'BUNDLE{random}',
      commission_rate: 10,
    },
  ];

  const applyTemplate = (template, product) => {
    return {
      name: template.pattern
        .replace('{product_name}', product.title)
        .replace('{discount}', '20'),
      code: template.codePattern
        .replace('{random}', Math.floor(Math.random() * 1000)),
      commission_rate: template.commission_rate,
    };
  };

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex space-x-2">
        <Button
          variant={!bulkMode && !templateMode ? 'primary' : 'outline'}
          onClick={() => { setBulkMode(false); setTemplateMode(false); }}
        >
          Single Link
        </Button>
        <Button
          variant={bulkMode ? 'primary' : 'outline'}
          onClick={() => { setBulkMode(true); setTemplateMode(false); }}
        >
          Bulk Generation
        </Button>
        <Button
          variant={templateMode ? 'primary' : 'outline'}
          onClick={() => { setTemplateMode(true); setBulkMode(false); }}
        >
          Template Mode
        </Button>
      </div>

      {/* Bulk mode */}
      {bulkMode && (
        <div>
          <h3>Bulk Link Generation</h3>
          <ProductSelector
            multiple={true}
            onSelectionChange={handleBulkGeneration}
          />
        </div>
      )}

      {/* Template mode */}
      {templateMode && (
        <div>
          <h3>Template-Based Generation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {linkTemplates.map(template => (
              <div
                key={template.name}
                className="p-4 border rounded-lg hover:border-blue-500 cursor-pointer"
                onClick={() => useTemplate(template)}
              >
                <h4 className="font-medium">{template.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{template.pattern}</p>
                <div className="mt-2 text-xs text-blue-600">
                  {template.commission_rate}% commission
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard link generator */}
      {!bulkMode && !templateMode && (
        <LinkGenerator
          onLinkGenerated={(link) => {
            setGeneratedLinks(prev => [...prev, link]);
          }}
        />
      )}

      {/* Generated links display */}
      {generatedLinks.length > 0 && (
        <GeneratedLinksDisplay links={generatedLinks} />
      )}
    </div>
  );
}
```

### 3. Real-Time Link Performance Monitoring

```tsx
// Real-time monitoring with WebSocket integration
import { useState, useEffect, useRef } from 'react';

function RealTimeLinkMonitor() {
  const [liveStats, setLiveStats] = useState({});
  const [recentClicks, setRecentClicks] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket('wss://api.yoursite.com/partner/live');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to real-time partner monitoring');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'click_event':
          setRecentClicks(prev => [data.payload, ...prev.slice(0, 9)]);
          updateLiveStats('clicks', 1);
          break;
          
        case 'conversion_event':
          updateLiveStats('conversions', 1);
          updateLiveStats('earnings', data.payload.commission);
          showConversionNotification(data.payload);
          break;
          
        case 'stats_update':
          setLiveStats(prev => ({ ...prev, ...data.payload }));
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(connectWebSocket, 5000);
    };
  };

  const updateLiveStats = (metric, increment) => {
    setLiveStats(prev => ({
      ...prev,
      [metric]: (prev[metric] || 0) + increment
    }));
  };

  const showConversionNotification = (conversion) => {
    // Show toast notification
    toast.success(
      `New conversion! Earned ${formatCurrency(conversion.commission)} from ${conversion.product_name}`,
      { duration: 5000 }
    );
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Referral Conversion!', {
        body: `You earned ${formatCurrency(conversion.commission)}`,
        icon: '/icon-192x192.png'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <h2>Real-Time Monitoring</h2>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span>{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Today's Clicks</h3>
          <div className="text-2xl font-bold text-blue-600">
            {liveStats.clicks || 0}
          </div>
          <div className="text-xs text-gray-500">Live updates</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Today's Conversions</h3>
          <div className="text-2xl font-bold text-green-600">
            {liveStats.conversions || 0}
          </div>
          <div className="text-xs text-gray-500">Real-time</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Today's Earnings</h3>
          <div className="text-2xl font-bold text-yellow-600">
            ${(liveStats.earnings || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">Live tracking</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Conversion Rate</h3>
          <div className="text-2xl font-bold text-purple-600">
            {liveStats.clicks > 0 ? ((liveStats.conversions / liveStats.clicks) * 100).toFixed(1) : 0}%
          </div>
          <div className="text-xs text-gray-500">Current rate</div>
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Live Activity Feed</h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {recentClicks.map((click, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <div className="flex-1">
                  <span className="text-sm">
                    New click on <strong>{click.link_name}</strong>
                  </span>
                  <span className="text-sm text-gray-600 ml-2">
                    from {click.country || 'Unknown'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(click.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4. Link Performance Optimization

```tsx
// Automated link optimization and A/B testing
function LinkOptimizer() {
  const [links, setLinks] = useState([]);
  const [optimizationResults, setOptimizationResults] = useState([]);

  const analyzePerformance = async (linkId) => {
    const response = await fetch(`/api/partner/links/${linkId}/analytics`);
    const analytics = await response.json();
    
    const insights = generateInsights(analytics);
    return insights;
  };

  const generateInsights = (analytics) => {
    const insights = [];
    
    // Low conversion rate analysis
    if (analytics.conversion_rate < 2 && analytics.clicks > 50) {
      insights.push({
        type: 'conversion_optimization',
        severity: 'high',
        message: 'Low conversion rate despite good traffic',
        recommendations: [
          'Review target audience alignment',
          'Consider promoting different products',
          'Improve call-to-action messaging',
          'Test different promotion channels'
        ]
      });
    }
    
    // High click, no conversion analysis
    if (analytics.clicks > 100 && analytics.conversions === 0) {
      insights.push({
        type: 'targeting_issue',
        severity: 'critical',
        message: 'High traffic but zero conversions',
        recommendations: [
          'Review audience targeting',
          'Check product-market fit',
          'Analyze traffic sources',
          'Consider promoting different products'
        ]
      });
    }
    
    // Seasonal performance analysis
    if (analytics.click_trend) {
      const recentPerformance = analytics.click_trend.slice(-7);
      const avgRecent = recentPerformance.reduce((sum, day) => sum + day.clicks, 0) / 7;
      const overallAvg = analytics.total_clicks / analytics.click_trend.length;
      
      if (avgRecent < overallAvg * 0.5) {
        insights.push({
          type: 'declining_performance',
          severity: 'medium',
          message: 'Performance declining recently',
          recommendations: [
            'Refresh promotion content',
            'Try new marketing channels',
            'Update link targeting',
            'Create seasonal variations'
          ]
        });
      }
    }
    
    return insights;
  };

  const optimizeAllLinks = async () => {
    const results = [];
    
    for (const link of links) {
      const insights = await analyzePerformance(link.id);
      if (insights.length > 0) {
        results.push({
          link,
          insights,
          optimization_score: calculateOptimizationScore(insights)
        });
      }
    }
    
    setOptimizationResults(results);
  };

  const calculateOptimizationScore = (insights) => {
    let score = 100;
    insights.forEach(insight => {
      switch (insight.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });
    return Math.max(score, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2>Link Optimization</h2>
        <Button onClick={optimizeAllLinks}>
          Analyze All Links
        </Button>
      </div>

      {/* Optimization results */}
      <div className="space-y-4">
        {optimizationResults.map((result, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{result.link.name}</h3>
                <p className="text-sm text-gray-600">Code: {result.link.code}</p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  result.optimization_score >= 80 ? 'text-green-600' :
                  result.optimization_score >= 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {result.optimization_score}
                </div>
                <div className="text-sm text-gray-500">Optimization Score</div>
              </div>
            </div>

            <div className="space-y-3">
              {result.insights.map((insight, insightIndex) => (
                <div
                  key={insightIndex}
                  className={`p-3 rounded-lg border ${
                    insight.severity === 'critical' ? 'border-red-200 bg-red-50' :
                    insight.severity === 'high' ? 'border-orange-200 bg-orange-50' :
                    insight.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <h4 className="font-medium mb-1">{insight.message}</h4>
                  <ul className="text-sm space-y-1">
                    {insight.recommendations.map((rec, recIndex) => (
                      <li key={recIndex} className="flex items-center space-x-2">
                        <span>•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5. Advanced QR Code Integration

```tsx
// Enhanced QR code features with customization
import QRCode from 'qrcode';

function AdvancedQRCodeGenerator() {
  const [qrOptions, setQrOptions] = useState({
    size: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M',
    type: 'image/png'
  });

  const generateCustomQR = async (url, options = {}) => {
    const finalOptions = { ...qrOptions, ...options };
    
    try {
      const qrCodeDataURL = await QRCode.toDataURL(url, finalOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('QR code generation error:', error);
      return null;
    }
  };

  const generateBrandedQR = async (url, brandingOptions) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Generate base QR code
    const qrCode = await generateCustomQR(url, { type: 'image/png' });
    
    // Add branding elements
    const qrImage = new Image();
    qrImage.onload = () => {
      canvas.width = qrImage.width + 40;
      canvas.height = qrImage.height + 80;
      
      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(qrImage, 20, 20);
      
      // Add branding text
      ctx.fillStyle = brandingOptions.textColor || '#000000';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        brandingOptions.text || 'Scan to visit',
        canvas.width / 2,
        canvas.height - 20
      );
      
      // Add logo if provided
      if (brandingOptions.logo) {
        const logo = new Image();
        logo.onload = () => {
          const logoSize = 40;
          const x = (canvas.width - logoSize) / 2;
          const y = (qrImage.height - logoSize) / 2 + 20;
          
          // White background for logo
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
          
          // Draw logo
          ctx.drawImage(logo, x, y, logoSize, logoSize);
        };
        logo.src = brandingOptions.logo;
      }
    };
    qrImage.src = qrCode;
    
    return canvas.toDataURL();
  };

  const downloadQRCode = (dataURL, filename) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* QR Code customization */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">QR Code Customization</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Size</label>
              <input
                type="range"
                min="100"
                max="400"
                value={qrOptions.size}
                onChange={(e) => setQrOptions(prev => ({
                  ...prev,
                  size: parseInt(e.target.value)
                }))}
                className="w-full"
              />
              <div className="text-sm text-gray-500">{qrOptions.size}px</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Colors</label>
              <div className="flex space-x-4">
                <div>
                  <label className="block text-xs text-gray-600">Foreground</label>
                  <input
                    type="color"
                    value={qrOptions.color.dark}
                    onChange={(e) => setQrOptions(prev => ({
                      ...prev,
                      color: { ...prev.color, dark: e.target.value }
                    }))}
                    className="w-12 h-8 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Background</label>
                  <input
                    type="color"
                    value={qrOptions.color.light}
                    onChange={(e) => setQrOptions(prev => ({
                      ...prev,
                      color: { ...prev.color, light: e.target.value }
                    }))}
                    className="w-12 h-8 rounded border"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <QRCodePreview url="https://example.com" options={qrOptions} />
          </div>
        </div>
      </div>

      {/* Batch QR generation */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Batch QR Code Generation</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Links</label>
            <LinkSelector
              multiple={true}
              onSelectionChange={(selectedLinks) => {
                generateBatchQRCodes(selectedLinks);
              }}
            />
          </div>
          
          <Button onClick={downloadAllQRCodes}>
            Download All QR Codes as ZIP
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 6. Partner Collaboration and Teams

```tsx
// Team management for partner accounts
function PartnerTeamManagement() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const inviteTeamMember = async (email, role) => {
    const response = await fetch('/api/partner/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });

    if (response.ok) {
      const invitation = await response.json();
      setInvitations(prev => [...prev, invitation]);
      toast.success('Team member invited successfully');
    }
  };

  const assignLinkPermissions = async (memberId, linkIds, permissions) => {
    const response = await fetch('/api/partner/team/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId,
        link_ids: linkIds,
        permissions: permissions // ['view', 'edit', 'create', 'delete']
      }),
    });

    if (response.ok) {
      toast.success('Permissions updated successfully');
    }
  };

  return (
    <div className="space-y-6">
      {/* Team overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Team Management</h3>
        
        <div className="space-y-4">
          {teamMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h4 className="font-medium">{member.name}</h4>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{member.role}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editMemberPermissions(member.id)}
                >
                  Edit Permissions
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex space-x-2">
            <input
              type="email"
              placeholder="Team member email"
              className="flex-1 px-3 py-2 border rounded"
            />
            <select className="px-3 py-2 border rounded">
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <Button onClick={() => inviteTeamMember(email, role)}>
              Invite
            </Button>
          </div>
        </div>
      </div>

      {/* Link permissions matrix */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Link Permissions</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2">Team Member</th>
                <th className="text-center p-2">View</th>
                <th className="text-center p-2">Edit</th>
                <th className="text-center p-2">Create</th>
                <th className="text-center p-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map(member => (
                <tr key={member.id} className="border-t">
                  <td className="p-2">{member.name}</td>
                  <td className="text-center p-2">
                    <input
                      type="checkbox"
                      checked={member.permissions.includes('view')}
                      onChange={(e) => updatePermission(member.id, 'view', e.target.checked)}
                    />
                  </td>
                  <td className="text-center p-2">
                    <input
                      type="checkbox"
                      checked={member.permissions.includes('edit')}
                      onChange={(e) => updatePermission(member.id, 'edit', e.target.checked)}
                    />
                  </td>
                  <td className="text-center p-2">
                    <input
                      type="checkbox"
                      checked={member.permissions.includes('create')}
                      onChange={(e) => updatePermission(member.id, 'create', e.target.checked)}
                    />
                  </td>
                  <td className="text-center p-2">
                    <input
                      type="checkbox"
                      checked={member.permissions.includes('delete')}
                      onChange={(e) => updatePermission(member.id, 'delete', e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### 7. Commission Optimization Engine

```tsx
// Intelligent commission rate optimization
function CommissionOptimizer() {
  const [optimizationData, setOptimizationData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const analyzeCommissionPerformance = async () => {
    const response = await fetch('/api/partner/optimization/commission');
    const data = await response.json();
    
    setOptimizationData(data);
    generateRecommendations(data);
  };

  const generateRecommendations = (data) => {
    const recs = [];
    
    // Analyze by commission rate
    data.links.forEach(link => {
      if (link.clicks > 50 && link.conversions === 0) {
        recs.push({
          type: 'rate_too_low',
          link: link,
          current_rate: link.commission_rate,
          suggested_rate: Math.min(link.commission_rate + 2, 20),
          reason: 'High traffic but no conversions - try higher commission'
        });
      }
      
      if (link.conversion_rate > 10 && link.commission_rate > 15) {
        recs.push({
          type: 'rate_too_high',
          link: link,
          current_rate: link.commission_rate,
          suggested_rate: Math.max(link.commission_rate - 2, 5),
          reason: 'High conversion rate - can reduce commission and maintain performance'
        });
      }
    });
    
    setRecommendations(recs);
  };

  const applyRecommendation = async (recommendation) => {
    const response = await fetch(`/api/partner/links/${recommendation.link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commission_rate: recommendation.suggested_rate
      }),
    });

    if (response.ok) {
      toast.success('Commission rate updated successfully');
      analyzeCommissionPerformance(); // Refresh data
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2>Commission Optimization</h2>
        <Button onClick={analyzeCommissionPerformance}>
          Analyze Performance
        </Button>
      </div>

      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Optimization Recommendations</h3>
          
          {recommendations.map((rec, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{rec.link.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                  <div className="mt-2 flex items-center space-x-4 text-sm">
                    <span>Current: {rec.current_rate}%</span>
                    <span>→</span>
                    <span className="font-medium text-blue-600">
                      Suggested: {rec.suggested_rate}%
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyRecommendation(rec)}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissRecommendation(rec)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Commission performance matrix */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Commission Performance Matrix</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Commission Rate</th>
                <th className="text-center p-2">Links</th>
                <th className="text-center p-2">Avg Clicks</th>
                <th className="text-center p-2">Avg Conversions</th>
                <th className="text-center p-2">Avg Earnings</th>
                <th className="text-center p-2">Performance</th>
              </tr>
            </thead>
            <tbody>
              {optimizationData?.commission_analysis?.map((analysis, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{analysis.rate}%</td>
                  <td className="text-center p-2">{analysis.link_count}</td>
                  <td className="text-center p-2">{analysis.avg_clicks}</td>
                  <td className="text-center p-2">{analysis.avg_conversions}</td>
                  <td className="text-center p-2">${analysis.avg_earnings.toFixed(2)}</td>
                  <td className="text-center p-2">
                    <div className={`px-2 py-1 rounded text-xs ${
                      analysis.performance_score >= 80 ? 'bg-green-100 text-green-800' :
                      analysis.performance_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {analysis.performance_score}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

This integration guide provides comprehensive examples for implementing and extending the partner referral system with advanced features like real-time monitoring, A/B testing, QR code customization, team management, and commission optimization while maintaining the security and performance standards of the base system.
