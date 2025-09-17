'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  User,
  Package,
  Star,
  Flag,
  Search,
  Filter,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { adminService, ReportedContent } from '@/services/admin.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/dropdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReportFilters {
  type?: string;
  status?: string;
  priority?: string;
  search?: string;
}

interface ReportActionModalProps {
  report: ReportedContent | null;
  action: 'resolve' | 'dismiss' | 'escalate' | 'view' | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  loading: boolean;
}

function ReportActionModal({ report, action, isOpen, onClose, onConfirm, loading }: ReportActionModalProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = async () => {
    await onConfirm(notes);
    setNotes('');
    onClose();
  };

  const getActionTitle = () => {
    switch (action) {
      case 'resolve': return 'Resolve Report';
      case 'dismiss': return 'Dismiss Report';
      case 'escalate': return 'Escalate Report';
      case 'view': return 'Report Details';
      default: return '';
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case 'resolve': return 'Mark this report as resolved with appropriate action taken.';
      case 'dismiss': return 'Dismiss this report as invalid or not actionable.';
      case 'escalate': return 'Escalate this report for higher-level review.';
      case 'view': return 'View detailed information about this report.';
      default: return '';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return <Package className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'review': return <Star className="w-4 h-4" />;
      case 'comment': return <MessageSquare className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (!report || !action) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getActionTitle()}
      description={getActionDescription()}
    >
      <div className="space-y-4">
        {/* Report Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getContentTypeIcon(report.type)}
              <span className="font-medium text-gray-900 capitalize">{report.type} Report</span>
              <Badge className={cn(
                "capitalize ml-auto",
                report.priority === 'critical' && "bg-red-100 text-red-800",
                report.priority === 'high' && "bg-orange-100 text-orange-800",
                report.priority === 'medium' && "bg-yellow-100 text-yellow-800",
                report.priority === 'low' && "bg-blue-100 text-blue-800"
              )}>
                {report.priority} priority
              </Badge>
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-700">Reason:</div>
              <div className="text-sm text-gray-900">{report.reason}</div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-700">Description:</div>
              <div className="text-sm text-gray-900">{report.description}</div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Reported by: {report.reporter_name}</span>
              <span>{new Date(report.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Content Preview */}
        {report.content_preview && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Content Preview:</h4>
            <p className="text-sm text-blue-800">{report.content_preview}</p>
          </div>
        )}

        {/* Previous Resolution */}
        {report.resolution_notes && (
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Previous Resolution:</h4>
            <p className="text-sm text-green-800">{report.resolution_notes}</p>
          </div>
        )}

        {action !== 'view' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolution Notes {action === 'resolve' ? '(Required)' : '(Optional)'}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Add notes for ${action} action...`}
              rows={3}
              required={action === 'resolve'}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {action === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {action !== 'view' && (
            <Button
              variant={action === 'dismiss' ? 'danger' : action === 'resolve' ? 'success' : 'warning'}
              onClick={handleConfirm}
              disabled={loading || (action === 'resolve' && !notes.trim())}
            >
              {loading ? <LoadingSpinner size="sm" /> : getActionTitle()}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const [reports, setReports] = useState<ReportedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalReports, setTotalReports] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [reportModal, setReportModal] = useState<{
    report: ReportedContent | null;
    action: 'resolve' | 'dismiss' | 'escalate' | 'view' | null;
  }>({ report: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  
  const reportsPerPage = 50;

  // Check admin authorization
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Load reports data
  const loadReports = useCallback(async (page: number = 1, reportFilters: ReportFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await adminService.getReportedContent(page, reportsPerPage, {
        type: reportFilters.type,
        status: reportFilters.status,
        priority: reportFilters.priority,
      });
      
      if (result) {
        setReports(result.reports);
        setTotalReports(result.total);
        setTotalPages(Math.ceil(result.total / reportsPerPage));
        setCurrentPage(page);
      } else {
        // Mock data for demonstration
        const mockReports: ReportedContent[] = [
          {
            id: '1',
            type: 'product',
            content_id: 'prod_123',
            reporter_id: 'user_456',
            reporter_name: 'John Doe',
            reason: 'Inappropriate Content',
            description: 'This product contains inappropriate images and descriptions.',
            status: 'pending',
            priority: 'high',
            created_at: new Date().toISOString(),
            content_preview: 'Premium Digital Assets Collection...',
          },
          {
            id: '2',
            type: 'user',
            content_id: 'user_789',
            reporter_id: 'user_101',
            reporter_name: 'Jane Smith',
            reason: 'Spam/Scam',
            description: 'This user is sending spam messages to buyers.',
            status: 'reviewing',
            priority: 'medium',
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '3',
            type: 'review',
            content_id: 'review_456',
            reporter_id: 'user_789',
            reporter_name: 'Mike Johnson',
            reason: 'Fake Review',
            description: 'This review appears to be fake and misleading.',
            status: 'resolved',
            priority: 'low',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            resolved_at: new Date(Date.now() - 86400000).toISOString(),
            resolved_by: 'admin_001',
            resolution_notes: 'Review verified as legitimate after investigation.',
          },
        ];
        
        setReports(mockReports);
        setTotalReports(mockReports.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user?.role === 'admin') {
      loadReports(1, filters);
    }
  }, [user, loadReports, filters]);

  // Handle report actions
  const handleReportAction = async (reportId: string, action: string, notes?: string) => {
    if (!user) return;

    try {
      // Mock implementation - would call actual admin service
      const success = true;
      let message = '';

      switch (action) {
        case 'resolve':
          message = 'Report resolved successfully';
          break;
        case 'dismiss':
          message = 'Report dismissed successfully';
          break;
        case 'escalate':
          message = 'Report escalated successfully';
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (success) {
        toast.success(message);
        // Reload reports to reflect changes
        await loadReports(currentPage, filters);
      } else {
        toast.error('Failed to perform action');
      }
    } catch (err) {
      console.error('Error performing report action:', err);
      toast.error('Failed to perform action');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newFilters = { ...filters, search: searchQuery || undefined };
    setFilters(newFilters);
    loadReports(1, newFilters);
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    loadReports(1, newFilters);
  };

  const handleRefresh = useCallback(() => {
    loadReports(currentPage, filters);
  }, [loadReports, currentPage, filters]);

  const handleReportActionModal = async (report: ReportedContent, action: string) => {
    setReportModal({ report, action: action as any });
  };

  const handleActionConfirm = async (notes?: string) => {
    if (!reportModal.report || !reportModal.action) return;

    setActionLoading(true);
    try {
      await handleReportAction(reportModal.report.id, reportModal.action, notes);
      setReportModal({ report: null, action: null });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewing': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return <Package className="w-4 h-4 text-blue-600" />;
      case 'user': return <User className="w-4 h-4 text-green-600" />;
      case 'review': return <Star className="w-4 h-4 text-yellow-600" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-purple-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (error && !reports.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorMessage title="Error Loading Reports" message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reported Content</h1>
            <p className="text-gray-600 mt-1">
              Review and handle reported content and users
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Reports</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {reports.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Under Review</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reports.filter(r => r.status === 'reviewing').length}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-red-600">
                    {reports.filter(r => r.priority === 'high' || r.priority === 'critical').length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolved Today</p>
                  <p className="text-2xl font-bold text-green-600">
                    {reports.filter(r => r.status === 'resolved').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>
              
              <div className="flex gap-2">
                <Select
                  value={filters.type || ''}
                  onValueChange={(value) => handleFilterChange('type', value)}
                  placeholder="All Types"
                >
                  <option value="">All Types</option>
                  <option value="product">Product</option>
                  <option value="user">User</option>
                  <option value="review">Review</option>
                  <option value="comment">Comment</option>
                </Select>
                
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => handleFilterChange('status', value)}
                  placeholder="All Status"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </Select>
                
                <Select
                  value={filters.priority || ''}
                  onValueChange={(value) => handleFilterChange('priority', value)}
                  placeholder="All Priorities"
                >
                  <option value="">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
                
                <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Reporter</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Priority</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getContentTypeIcon(report.type)}
                          <span className="text-sm font-medium capitalize">{report.type}</span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <div className="font-medium text-gray-900 truncate">
                            {report.reason}
                          </div>
                          <div className="text-sm text-gray-600 truncate">
                            {report.description}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {report.reporter_name}
                      </td>
                      
                      <td className="px-4 py-4">
                        <Badge className={cn("capitalize", getPriorityBadgeColor(report.priority))}>
                          {report.priority}
                        </Badge>
                      </td>
                      
                      <td className="px-4 py-4">
                        <Badge className={cn("capitalize", getStatusBadgeColor(report.status))}>
                          {report.status}
                        </Badge>
                      </td>
                      
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReportActionModal(report, 'view')}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {report.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReportActionModal(report, 'resolve')}
                                className="text-green-600 hover:text-green-700"
                                title="Resolve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReportActionModal(report, 'dismiss')}
                                className="text-gray-600 hover:text-gray-700"
                                title="Dismiss"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReportActionModal(report, 'escalate')}
                            className="text-orange-600 hover:text-orange-700"
                            title="Escalate"
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Report Action Modal */}
        <ReportActionModal
          report={reportModal.report}
          action={reportModal.action}
          isOpen={!!reportModal.report && !!reportModal.action}
          onClose={() => setReportModal({ report: null, action: null })}
          onConfirm={handleActionConfirm}
          loading={actionLoading}
        />
      </div>
    </div>
  );
}
