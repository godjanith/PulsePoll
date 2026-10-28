import React, { useState, useEffect } from 'react';
import socketService from '../services/socket.js';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Real-time connection status indicator with animated pulse badge.
 */
export const LiveBadge = ({ showLabel = true, className = '' }) => {
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    const unsubscribe = socketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const config = {
    connected: {
      color: 'bg-emerald-500',
      ping: 'bg-emerald-400',
      border: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500/10 text-emerald-400',
      label: 'Live Sync',
      icon: Wifi,
    },
    reconnecting: {
      color: 'bg-amber-500',
      ping: 'bg-amber-400',
      border: 'border-amber-500/30',
      badgeBg: 'bg-amber-500/10 text-amber-400',
      label: 'Reconnecting...',
      icon: Wifi,
    },
    disconnected: {
      color: 'bg-rose-500',
      ping: 'hidden',
      border: 'border-rose-500/30',
      badgeBg: 'bg-rose-500/10 text-rose-400',
      label: 'Offline',
      icon: WifiOff,
    },
    error: {
      color: 'bg-rose-500',
      ping: 'hidden',
      border: 'border-rose-500/30',
      badgeBg: 'bg-rose-500/10 text-rose-400',
      label: 'Sync Error',
      icon: WifiOff,
    },
  }[status] || {
    color: 'bg-slate-500',
    ping: 'hidden',
    border: 'border-slate-500/30',
    badgeBg: 'bg-slate-500/10 text-slate-400',
    label: 'Connecting...',
    icon: Wifi,
  };

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-all duration-300 ${config.badgeBg} ${config.border} ${className}`}
      title={`Socket connection status: ${status}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.ping}`}
        />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
      </span>
      {showLabel && (
        <span className="flex items-center gap-1.5 tracking-wide">
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      )}
    </div>
  );
};

export default LiveBadge;
