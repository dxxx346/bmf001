'use client';

import { useState, useEffect } from 'react';

// Queue names - duplicated here to avoid importing from server-side code
const QUEUE_NAMES = {
  EMAIL_SENDING: 'email-sending',
  FILE_PROCESSING: 'file-processing',
  ANALYTICS_AGGREGATION: 'analytics-aggregation',
  PAYMENT_RETRY: 'payment-retry',
  REFERRAL_COMMISSION: 'referral-commission',
  DAILY_REPORTS: 'daily-reports',
  WEEKLY_REPORTS: 'weekly-reports',
  DEAD_LETTER: 'dead-letter',
} as const;

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

interface JobDetails {
  id: string;
  name: string;
  data: any;
  progress?: number;
  createdAt?: number;
  processedOn?: number;
  finishedOn?: number;
  attemptsMade?: number;
  failedReason?: string;
  delay?: number;
  priority?: number;
}

export default function JobsDashboard() {
  const [stats, setStats] = useState<QueueStats[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [queueDetails, setQueueDetails] = useState<{
    waiting: JobDetails[];
    active: JobDetails[];
    completed: JobDetails[];
    failed: JobDetails[];
    delayed: JobDetails[];
  }>({
    waiting: [],
    active: [],
    completed: [],
    failed: [],
    delayed: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/jobs/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch queue statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueDetails = async (queueName: string) => {
    try {
      const response = await fetch(`/api/jobs/queues/${queueName}`);
      const data = await response.json();
      
      if (data.success) {
        setQueueDetails(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch queue details');
    }
  };

  const retryJob = async (queueName: string, jobId: string) => {
    try {
      const response = await fetch('/api/jobs/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queueName, jobId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh queue details
        fetchQueueDetails(queueName);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to retry job');
    }
  };

  const clearQueue = async (queueName: string, type: string = 'all') => {
    try {
      const response = await fetch(`/api/jobs/queues/${queueName}?type=${type}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh stats and queue details
        fetchStats();
        if (selectedQueue === queueName) {
          fetchQueueDetails(queueName);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to clear queue');
    }
  };

  const scheduleRecurringJobs = async () => {
    try {
      const response = await fetch('/api/jobs/schedule', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Recurring jobs scheduled successfully');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to schedule recurring jobs');
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      fetchQueueDetails(selectedQueue);
    }
  }, [selectedQueue]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      if (selectedQueue) {
        fetchQueueDetails(selectedQueue);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedQueue]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-600 bg-yellow-100';
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'delayed': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job queue dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Queue Dashboard</h1>
          <p className="text-gray-600">Monitor and manage background job queues</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Queue Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((queue) => (
            <div
              key={queue.name}
              className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedQueue(queue.name)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{queue.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{queue.total}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Waiting: {queue.waiting}</div>
                    <div>Active: {queue.active}</div>
                    <div>Completed: {queue.completed}</div>
                    <div>Failed: {queue.failed}</div>
                    <div>Delayed: {queue.delayed}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Queue Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Queue to View Details
          </label>
          <select
            value={selectedQueue}
            onChange={(e) => setSelectedQueue(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a queue...</option>
            {Object.values(QUEUE_NAMES).map((queueName) => (
              <option key={queueName} value={queueName}>
                {queueName.replace('-', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Queue Details */}
        {selectedQueue && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  {selectedQueue.replace('-', ' ').toUpperCase()} Queue Details
                </h2>
                <div className="space-x-2">
                  <button
                    onClick={() => clearQueue(selectedQueue, 'completed')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Clear Completed
                  </button>
                  <button
                    onClick={() => clearQueue(selectedQueue, 'failed')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Clear Failed
                  </button>
                  <button
                    onClick={() => clearQueue(selectedQueue, 'all')}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Job Lists */}
              {['waiting', 'active', 'completed', 'failed', 'delayed'].map((status) => (
                <div key={status} className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3 capitalize">
                    {status} Jobs ({queueDetails[status as keyof typeof queueDetails].length})
                  </h3>
                  
                  {queueDetails[status as keyof typeof queueDetails].length === 0 ? (
                    <p className="text-gray-500 text-sm">No {status} jobs</p>
                  ) : (
                    <div className="space-y-2">
                      {queueDetails[status as keyof typeof queueDetails].map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status)}`}>
                                {status}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {job.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                ID: {job.id}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                              <div>Created: {formatTimestamp(job.createdAt)}</div>
                              {job.processedOn && (
                                <div>Processed: {formatTimestamp(job.processedOn)}</div>
                              )}
                              {job.finishedOn && (
                                <div>Finished: {formatTimestamp(job.finishedOn)}</div>
                              )}
                              {job.attemptsMade && (
                                <div>Attempts: {job.attemptsMade}</div>
                              )}
                              {job.failedReason && (
                                <div className="text-red-600">Error: {job.failedReason}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {status === 'failed' && (
                              <button
                                onClick={() => retryJob(selectedQueue, job.id)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                Retry
                              </button>
                            )}
                            <button
                              onClick={() => {
                                // Show job data in a modal or console
                                console.log('Job data:', job.data);
                              }}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              View Data
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex space-x-4">
          <button
            onClick={scheduleRecurringJobs}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Schedule Recurring Jobs
          </button>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );
}
