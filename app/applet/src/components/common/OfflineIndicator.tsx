import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
      isOnline 
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 animate-pulse'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline (Saved Locally)</span>
        </>
      )}
    </div>
  );
};
