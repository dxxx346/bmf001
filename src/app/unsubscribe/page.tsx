'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UnsubscribeData {
  user: {
    name?: string;
    email: string;
  };
  type?: string;
  channel?: string;
  expires_at: string;
}

export default function UnsubscribePage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [data, setData] = useState<UnsubscribeData | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Load unsubscribe token details
  useEffect(() => {
    if (!token) {
      setError('Invalid unsubscribe link');
      setLoading(false);
      return;
    }

    const loadTokenDetails = async () => {
      try {
        const response = await fetch(`/api/notifications/unsubscribe?token=${token}`);
        
        if (response.ok) {
          const tokenData = await response.json();
          setData(tokenData);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Invalid or expired unsubscribe link');
        }
      } catch (error) {
        setError('Failed to load unsubscribe details');
      } finally {
        setLoading(false);
      }
    };

    loadTokenDetails();
  }, [token]);

  // Process unsubscribe
  const handleUnsubscribe = async () => {
    if (!token || processing) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to unsubscribe');
      }
    } catch (error) {
      setError('Failed to process unsubscribe request');
    } finally {
      setProcessing(false);
    }
  };

  const formatNotificationType = (type?: string) => {
    if (!type) return 'all notifications';
    
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatChannel = (channel?: string) => {
    if (!channel) return 'all channels';
    
    const channelNames: Record<string, string> = {
      email: 'Email',
      sms: 'SMS',
      push: 'Push notifications',
      in_app: 'In-app notifications',
    };
    
    return channelNames[channel] || channel;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircleIcon className="h-16 w-16 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Successfully Unsubscribed
          </h1>
          
          <p className="text-gray-600 mb-6">
            You have been unsubscribed from{' '}
            <span className="font-medium">
              {formatNotificationType(data?.type)}
            </span>
            {data?.channel && (
              <>
                {' '}via{' '}
                <span className="font-medium">
                  {formatChannel(data.channel)}
                </span>
              </>
            )}
            .
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Return to Homepage
            </button>
            
            <button
              onClick={() => window.location.href = '/notifications/preferences'}
              className="w-full bg-gray-200 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Manage All Preferences
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unsubscribe Failed
          </h1>
          
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Return to Homepage
            </button>
            
            <button
              onClick={() => window.location.href = '/contact'}
              className="w-full bg-gray-200 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unsubscribe from Notifications
          </h1>
          <p className="text-gray-600">
            Are you sure you want to unsubscribe?
          </p>
        </div>

        {data && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium text-gray-700">Account:</span>{' '}
                <span className="text-gray-900">
                  {data.user.name || data.user.email}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Email:</span>{' '}
                <span className="text-gray-900">{data.user.email}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Unsubscribing from:</span>{' '}
                <span className="text-gray-900">
                  {formatNotificationType(data.type)}
                </span>
                {data.channel && (
                  <>
                    {' '}via{' '}
                    <span className="text-gray-900">
                      {formatChannel(data.channel)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleUnsubscribe}
            disabled={processing}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Yes, Unsubscribe'}
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-200 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            You can also manage your notification preferences from your account settings.
          </p>
          <div className="text-center mt-2">
            <button
              onClick={() => window.location.href = '/notifications/preferences'}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Manage Preferences Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
