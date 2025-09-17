'use client';

import { Wifi, WifiOff, Clock } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdated: Date | null;
}

export function ConnectionStatus({ isConnected, lastUpdated }: ConnectionStatusProps) {
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="flex items-center space-x-1">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {lastUpdated && (
        <div className="flex items-center space-x-1 text-gray-500">
          <Clock className="h-3 w-3" />
          <span className="text-xs">
            Updated {formatLastUpdated(lastUpdated)}
          </span>
        </div>
      )}
    </div>
  );
}
