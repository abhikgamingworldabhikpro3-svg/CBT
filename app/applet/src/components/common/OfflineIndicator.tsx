import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-lg transition-all duration-300 ${
      isOnline 
        ? 'bg-emerald-600 text-white translate-y-12 opacity-0 pointer-events-none' 
        : 'bg-amber-600 text-white translate-y-0 opacity-100'
    }`}>
      {isOnline ? (
        <Wifi className="h-3.5 w-3.5 text-white animate-pulse" />
      ) : (
        <WifiOff className="h-3.5 w-3.5 text-white animate-bounce" />
      )}
      <span>{isOnline ? "Connected to Proctor Server" : "Offline Mode — Saved answers cached locally"}</span>
    </div>
  );
};
