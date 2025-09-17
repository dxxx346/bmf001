'use client';

import React, { useState, useEffect } from 'react';
import { ModerationQueueWithRelations, ReviewModerationStats, ReviewModerationStatus } from '@/types/review';
import { formatDistanceToNow } from '@/lib/date';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Flag, 
  User, 
  Eye,
  Filter,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface ModerationDashboardProps {
  onModerate: (queueItemId: string, decision: ReviewModerationStatus, notes?: string) => Promise<void>;
  onAssign: (queueItemId: string, moderatorId: string) => Promise<void>;
}

export function ModerationDashboard({ onModerate, onAssign }: ModerationDashboardProps) {
  const [queueItems, setQueueItems] = useState<ModerationQueueWithRelations[]>([]);
  const [stats, setStats] = useState<ReviewModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationQueueWithRelations | null>(null);
  const [filters, setFilters] = useState({
    status: 'pending' as ReviewModerationStatus | 'all',
    priority: 'all' as string,
    auto_flagged: 'all' as string
  });
  const [moderationNotes, setModerationNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadQueueData();
    loadStats();
  }, [filters]);

  const loadQueueData = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.auto_flagged !== 'all') params.append('auto_flagged', filters.auto_flagged);

      const response = await fetch(`/api/admin/reviews/moderation?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setQueueItems(data.data.items);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/reviews/moderation/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleModerate = async (decision: ReviewModerationStatus) => {
    if (!selectedItem || isProcessing) return;

    setIsProcessing(true);
    try {
      await onModerate(selectedItem.id, decision, moderationNotes);
      setSelectedItem(null);
      setModerationNotes('');
      await loadQueueData();
      await loadStats();
    } catch (error) {
      console.error('Error moderating:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return 'text-red-600 bg-red-100';
      case 4: return 'text-orange-600 bg-orange-100';
      case 3: return 'text-yellow-600 bg-yellow-100';
      case 2: return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityLabel = (priority: number) => {
    const labels = { 5: 'Critical', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Lowest' };
    return labels[priority as keyof typeof labels] || 'Unknown';
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    const cards = [
      {
        title: 'Queue Size',
        value: stats.queue_size,
        icon: Clock,
        color: 'text-blue-600 bg-blue-100'
      },
      {
        title: 'Pending Reviews',
        value: stats.pending_reviews,
        icon: AlertTriangle,
        color: 'text-orange-600 bg-orange-100'
      },
      {
        title: 'Flagged Reviews',
        value: stats.flagged_reviews,
        icon: Flag,
        color: 'text-red-600 bg-red-100'
      },
      {
        title: 'Avg Resolution Time',
        value: `${stats.avg_resolution_time}h`,
        icon: TrendingUp,
        color: 'text-green-600 bg-green-100'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFilters = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="flagged">Flagged</option>
              <option value="spam">Spam</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="5">Critical</option>
              <option value="4">High</option>
              <option value="3">Medium</option>
              <option value="2">Low</option>
              <option value="1">Lowest</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={filters.auto_flagged}
              onChange={(e) => setFilters(prev => ({ ...prev, auto_flagged: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Sources</option>
              <option value="true">Auto-flagged</option>
              <option value="false">Manual Report</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderQueueItem = (item: ModerationQueueWithRelations) => {
    return (
      <div
        key={item.id}
        className={`bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
          selectedItem?.id === item.id ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'
        }`}
        onClick={() => setSelectedItem(item)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(item.priority)}`}>
              {getPriorityLabel(item.priority)}
            </span>
            {item.auto_flagged && (
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                Auto-flagged
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        </div>

        <div className="mb-3">
          <h4 className="font-medium text-gray-900 mb-1">
            {item.review?.title || 'Untitled Review'}
          </h4>
          <p className="text-sm text-gray-600 line-clamp-2">
            {item.reason}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              By: {item.review?.user?.name || 'Unknown'}
            </span>
            <span className="text-gray-600">
              Rating: {item.review?.rating}/5
            </span>
          </div>
          {item.moderator && (
            <div className="flex items-center gap-1 text-blue-600">
              <User className="w-3 h-3" />
              <span>{item.moderator.name}</span>
            </div>
          )}
        </div>

        {item.ml_confidence && (
          <div className="mt-2 text-xs text-orange-600">
            ML Confidence: {Math.round(item.ml_confidence * 100)}%
          </div>
        )}
      </div>
    );
  };

  const renderReviewDetails = () => {
    if (!selectedItem) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Review</h3>
          <p className="text-gray-600">Choose a review from the queue to view details and moderate</p>
        </div>
      );
    }

    const review = selectedItem.review;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Review Details</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(selectedItem.priority)}`}>
            {getPriorityLabel(selectedItem.priority)} Priority
          </span>
        </div>

        {/* Review Content */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">{review?.user?.name || 'Anonymous'}</span>
              <span className="text-sm text-gray-500">
                {review?.created_at && formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
            </div>
            {review?.title && (
              <h4 className="font-medium mb-2">{review.title}</h4>
            )}
            <p className="text-gray-700 mb-2">{review?.content}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Rating: {review?.rating}/5</span>
              {review?.is_verified && <span className="text-green-600">✓ Verified Purchase</span>}
            </div>
          </div>
        </div>

        {/* Moderation Reason */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Moderation Reason</h4>
          <p className="text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            {selectedItem.reason}
          </p>
          {selectedItem.reporter && (
            <p className="text-sm text-gray-600 mt-2">
              Reported by: {selectedItem.reporter.name}
            </p>
          )}
        </div>

        {/* ML Analysis */}
        {selectedItem.ml_confidence && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">ML Analysis</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span>Confidence Score</span>
                <span className="font-medium">{Math.round(selectedItem.ml_confidence * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Moderation Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Moderation Notes (Optional)
          </label>
          <textarea
            value={moderationNotes}
            onChange={(e) => setModerationNotes(e.target.value)}
            placeholder="Add any notes about your decision..."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => handleModerate('approved')}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={() => handleModerate('rejected')}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={() => handleModerate('flagged')}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            <Flag className="w-4 h-4" />
            Flag for Review
          </button>
          <button
            onClick={() => handleModerate('spam')}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            Mark as Spam
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {renderStatsCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue List */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Moderation Queue ({queueItems.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {queueItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                <p>No items in the moderation queue</p>
              </div>
            ) : (
              queueItems.map(renderQueueItem)
            )}
          </div>
        </div>

        {/* Review Details */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Review Details</h2>
          {renderReviewDetails()}
        </div>
      </div>
    </div>
  );
}
