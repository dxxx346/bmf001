'use client';

import { useState, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  Shield, 
  Eye, 
  Settings, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Database,
  Lock,
  Globe
} from 'lucide-react';

interface ExportRequest {
  id: string;
  export_type: string;
  format: string;
  status: string;
  file_url?: string;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
}

interface DeletionRequest {
  id: string;
  reason?: string;
  status: string;
  scheduled_for: string;
  created_at: string;
  completed_at?: string;
}

interface ConsentRecord {
  id: string;
  consent_type: string;
  status: string;
  version: string;
  consented_at?: string;
  revoked_at?: string;
  created_at: string;
}

interface PrivacySettings {
  analytics_consent: boolean;
  marketing_consent: boolean;
  functional_consent: boolean;
  data_processing_consent: boolean;
  third_party_sharing: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  profile_visibility: 'public' | 'private' | 'limited';
  data_retention_preference: string;
}

interface TermsAcceptance {
  id: string;
  terms_version: string;
  privacy_policy_version: string;
  accepted_at: string;
  ip_address: string;
}

export default function PrivacyDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'export' | 'deletion' | 'consent' | 'settings'>('overview');
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [consentHistory, setConsentHistory] = useState<ConsentRecord[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [termsAcceptances, setTermsAcceptances] = useState<TermsAcceptance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPrivacyData();
  }, []);

  const fetchPrivacyData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchExportRequests(),
        fetchDeletionRequests(),
        fetchConsentData(),
        fetchTermsAcceptances(),
      ]);
    } catch (error) {
      console.error('Failed to fetch privacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExportRequests = async () => {
    try {
      const response = await fetch('/api/privacy/export');
      if (response.ok) {
        const data = await response.json();
        setExportRequests(data.exports);
      }
    } catch (error) {
      console.error('Failed to fetch export requests:', error);
    }
  };

  const fetchDeletionRequests = async () => {
    try {
      const response = await fetch('/api/privacy/deletion');
      if (response.ok) {
        const data = await response.json();
        setDeletionRequests(data.deletions);
      }
    } catch (error) {
      console.error('Failed to fetch deletion requests:', error);
    }
  };

  const fetchConsentData = async () => {
    try {
      const response = await fetch('/api/privacy/consent');
      if (response.ok) {
        const data = await response.json();
        setConsentHistory(data.consentHistory);
        setPrivacySettings(data.privacySettings);
      }
    } catch (error) {
      console.error('Failed to fetch consent data:', error);
    }
  };

  const fetchTermsAcceptances = async () => {
    try {
      const response = await fetch('/api/privacy/terms');
      if (response.ok) {
        const data = await response.json();
        setTermsAcceptances(data.acceptances);
      }
    } catch (error) {
      console.error('Failed to fetch terms acceptances:', error);
    }
  };

  const handleExportRequest = async (exportType: string, format: string) => {
    try {
      const response = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exportType, format }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast('Export request created successfully');
        fetchExportRequests();
      } else {
        const error = await response.json();
        showToast(error.error, 'error');
      }
    } catch (error) {
      showToast('Failed to create export request', 'error');
    }
  };

  const handleDeletionRequest = async (reason: string, immediate: boolean = false) => {
    if (!confirm('Are you sure you want to request account deletion? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/privacy/deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, immediate }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast('Deletion request created successfully');
        fetchDeletionRequests();
      } else {
        const error = await response.json();
        showToast(error.error, 'error');
      }
    } catch (error) {
      showToast('Failed to create deletion request', 'error');
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    try {
      const response = await fetch('/api/privacy/consent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setPrivacySettings(data.settings);
        showToast('Privacy settings updated successfully');
      } else {
        const error = await response.json();
        showToast(error.error, 'error');
      }
    } catch (error) {
      showToast('Failed to update privacy settings', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
      case 'declined':
      case 'revoked':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'export', label: 'Data Export', icon: Download },
    { id: 'deletion', label: 'Data Deletion', icon: Trash2 },
    { id: 'consent', label: 'Consent History', icon: FileText },
    { id: 'settings', label: 'Privacy Settings', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Dashboard</h1>
        <p className="text-gray-600">
          Manage your privacy settings, data exports, and GDPR rights
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <Database className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Export Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{exportRequests.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <Trash2 className="w-8 h-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Deletion Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{deletionRequests.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Consents</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {consentHistory.filter(c => c.status === 'accepted').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Terms Accepted</p>
                  <p className="text-2xl font-bold text-gray-900">{termsAcceptances.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Recent Privacy Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {exportRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Download className="w-4 h-4 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium">Data Export Request</p>
                        <p className="text-xs text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {getStatusIcon(request.status)}
                  </div>
                ))}
                
                {consentHistory.slice(0, 3).map((consent) => (
                  <div key={consent.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium">Consent Updated</p>
                        <p className="text-xs text-gray-500">
                          {consent.consent_type} - {new Date(consent.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {getStatusIcon(consent.status)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Request Data Export</h3>
              <p className="text-sm text-gray-600">
                Download a copy of your personal data as required by GDPR Article 20
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleExportRequest('full', 'json')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Database className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Complete Export</h4>
                  <p className="text-sm text-gray-600">All your data in JSON format</p>
                </button>
                
                <button
                  onClick={() => handleExportRequest('partial', 'csv')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <FileText className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">Essential Data</h4>
                  <p className="text-sm text-gray-600">Core profile and purchase data</p>
                </button>
                
                <button
                  onClick={() => handleExportRequest('full', 'xml')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Lock className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900">XML Export</h4>
                  <p className="text-sm text-gray-600">All data in XML format</p>
                </button>
              </div>
            </div>
          </div>

          {/* Export History */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Export History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exportRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.export_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.format.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(request.status)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {request.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {request.status === 'completed' && request.file_url && (
                          <a
                            href={request.file_url}
                            className="text-blue-600 hover:text-blue-900"
                            download
                          >
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deletion' && (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-900">Right to be Forgotten</h3>
                <p className="text-sm text-red-700">
                  Request deletion of your personal data. This action is irreversible.
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => {
                  const reason = prompt('Please provide a reason for deletion (optional):');
                  if (reason !== null) {
                    handleDeletionRequest(reason, false);
                  }
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 mr-3"
              >
                Request Account Deletion
              </button>
              
              <button
                onClick={() => {
                  const reason = prompt('Please provide a reason for immediate deletion:');
                  if (reason !== null) {
                    handleDeletionRequest(reason, true);
                  }
                }}
                className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-900"
              >
                Immediate Deletion
              </button>
            </div>
          </div>

          {/* Deletion History */}
          {deletionRequests.length > 0 && (
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Deletion Requests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scheduled For
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deletionRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.reason || 'No reason provided'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(request.status)}
                            <span className="ml-2 text-sm text-gray-900 capitalize">
                              {request.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(request.scheduled_for).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'consent' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Consent History</h3>
              <p className="text-sm text-gray-600">
                Track all consent decisions you've made
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consent Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consentHistory.map((consent) => (
                    <tr key={consent.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {consent.consent_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(consent.status)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {consent.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {consent.version}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(consent.consented_at || consent.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms Acceptances */}
          {termsAcceptances.length > 0 && (
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Terms & Policy Acceptances</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Terms Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Privacy Policy Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Accepted Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {termsAcceptances.map((acceptance) => (
                      <tr key={acceptance.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {acceptance.terms_version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {acceptance.privacy_policy_version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(acceptance.accepted_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {acceptance.ip_address}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && privacySettings && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Privacy Preferences</h3>
              <p className="text-sm text-gray-600">
                Control how your data is used and shared
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Data Processing Consents */}
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4">Data Processing</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={privacySettings.analytics_consent}
                      onChange={(e) => updatePrivacySettings({ analytics_consent: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      Analytics - Help us improve by analyzing usage patterns
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={privacySettings.marketing_consent}
                      onChange={(e) => updatePrivacySettings({ marketing_consent: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      Marketing - Receive personalized offers and recommendations
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={privacySettings.third_party_sharing}
                      onChange={(e) => updatePrivacySettings({ third_party_sharing: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      Third-party sharing - Allow sharing data with trusted partners
                    </span>
                  </label>
                </div>
              </div>

              {/* Notifications */}
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4">Notifications</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={privacySettings.email_notifications}
                      onChange={(e) => updatePrivacySettings({ email_notifications: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">Email notifications</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={privacySettings.sms_notifications}
                      onChange={(e) => updatePrivacySettings({ sms_notifications: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">SMS notifications</span>
                  </label>
                </div>
              </div>

              {/* Profile Visibility */}
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4">Profile Visibility</h4>
                <select
                  value={privacySettings.profile_visibility}
                  onChange={(e) => updatePrivacySettings({ profile_visibility: e.target.value as any })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="private">Private - Only visible to you</option>
                  <option value="limited">Limited - Visible to connections only</option>
                  <option value="public">Public - Visible to everyone</option>
                </select>
              </div>

              {/* Data Retention */}
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4">Data Retention Preference</h4>
                <select
                  value={privacySettings.data_retention_preference}
                  onChange={(e) => updatePrivacySettings({ data_retention_preference: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="7_days">7 days</option>
                  <option value="30_days">30 days</option>
                  <option value="90_days">90 days</option>
                  <option value="1_year">1 year</option>
                  <option value="2_years">2 years</option>
                  <option value="7_years">7 years</option>
                  <option value="indefinite">Indefinite</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Choose how long you want us to keep your data. Some data may be retained longer for legal compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
