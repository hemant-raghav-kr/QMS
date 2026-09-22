'use client';

import * as React from 'react';
import { Users, Wifi, WifiOff, Shield } from 'lucide-react';
import { MediaConnectionState } from '../../realtime/media-provider';
import { cn } from '@/lib/utils/cn';

interface MeetingHeaderProps {
  title: string;
  elapsedSeconds: number;
  participantCount: number;
  connectionState: MediaConnectionState;
  isLiveKitConfigured: boolean;
  onToggleParticipants: () => void;
}

export function MeetingHeader({
  title,
  elapsedSeconds,
  participantCount,
  connectionState,
  isLiveKitConfigured,
  onToggleParticipants,
}: MeetingHeaderProps) {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return `${hours}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="flex h-14 sm:h-16 w-full items-center justify-between px-3 sm:px-6 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-20 shrink-0">
      {/* Left: Brand / Title & LIVE status */}
      <div className="flex items-center gap-2 sm:gap-3 truncate">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="uppercase tracking-wider text-[10px]">LIVE</span>
        </div>

        <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-md">
          {title}
        </h1>

        <span className="font-mono text-xs text-slate-400 font-medium hidden sm:inline-block">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      {/* Right: Connectivity & Participants summary */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection status indicator */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors',
            connectionState === 'CONNECTED'
              ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400'
              : connectionState === 'CONNECTING' || connectionState === 'RECONNECTING'
              ? 'border-amber-500/30 bg-amber-950/30 text-amber-400'
              : 'border-rose-500/30 bg-rose-950/30 text-rose-400'
          )}
        >
          {connectionState === 'CONNECTED' ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-rose-400" />
          )}
          <span className="text-[11px] hidden md:inline-block capitalize font-mono">
            {connectionState.toLowerCase()}
          </span>
        </div>

        {!isLiveKitConfigured && (
          <span className="hidden lg:inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400 font-mono">
            <Shield className="h-3 w-3" />
            Media Server Pending Setup
          </span>
        )}

        <button
          onClick={onToggleParticipants}
          aria-label="View Participants"
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Users className="h-3.5 w-3.5 text-emerald-400" />
          <span>{participantCount}</span>
        </button>
      </div>
    </header>
  );
}
