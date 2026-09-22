'use client';

import * as React from 'react';
import { MicOff, Crown, Volume2 } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/cn';

interface ParticipantTileProps {
  name: string;
  avatarUrl?: string | null;
  videoTrack?: MediaStreamTrack | null;
  audioTrack?: MediaStreamTrack | null;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isSpeaking?: boolean;
  isHost?: boolean;
  isLocal?: boolean;
  className?: string;
}

export function ParticipantTile({
  name,
  avatarUrl,
  videoTrack,
  audioTrack,
  isAudioEnabled = false,
  isVideoEnabled = false,
  isSpeaking = false,
  isHost = false,
  isLocal = false,
  className,
}: ParticipantTileProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Explicitly ensure video element is permanently muted to prevent browsers from flagging camera video as playing audio
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
    }
  }, []);

  // Attach video track
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      if (videoTrack && isVideoEnabled) {
        const stream = new MediaStream([videoTrack]);
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [videoTrack, isVideoEnabled]);

  // Attach audio track (only for remote participants; local is muted in element to prevent feedback loop)
  React.useEffect(() => {
    if (audioRef.current && !isLocal) {
      if (audioTrack && isAudioEnabled) {
        const stream = new MediaStream([audioTrack]);
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, [audioTrack, isAudioEnabled, isLocal]);

  const hasActiveVideo = Boolean(videoTrack && isVideoEnabled);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-slate-900 border transition-all duration-200 select-none shadow-sm',
        isSpeaking
          ? 'border-emerald-500 ring-2 ring-emerald-500/40'
          : 'border-slate-800 hover:border-slate-700',
        className
      )}
    >
      {/* Remote Audio Element (Hidden) - Only mounted when an active audio track exists */}
      {!isLocal && isAudioEnabled && Boolean(audioTrack) && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      {/* Real Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={true}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          isLocal && 'transform -scale-x-100', // Mirror local camera
          hasActiveVideo ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
        )}
      />

      {/* Fallback Avatar when camera is off */}
      {!hasActiveVideo && (
        <div className="flex flex-col items-center justify-center space-y-3 p-6">
          <Avatar
            src={avatarUrl}
            fallback={name}
            size="lg"
            className="h-20 w-20 text-2xl font-bold bg-slate-800 text-slate-200 ring-4 ring-slate-800"
          />
          <span className="text-sm font-semibold text-slate-200 truncate max-w-[180px]">
            {name} {isLocal && '(You)'}
          </span>
        </div>
      )}

      {/* Top badges: Host pill & Speaking wave indicator */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        {isHost && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-950 shadow-sm">
            <Crown className="h-3 w-3" />
            Host
          </span>
        )}
        {isSpeaking && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm animate-pulse">
            <Volume2 className="h-3 w-3" />
            Speaking
          </span>
        )}
      </div>

      {/* Bottom Name & Audio Indicator Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-950/70 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-white max-w-[80%] shadow">
          <span className="truncate">
            {name} {isLocal && '(You)'}
          </span>
        </div>

        <div className="rounded-lg bg-slate-950/70 backdrop-blur-md p-1 text-white shadow">
          {isAudioEnabled ? (
            <div className="flex items-center gap-0.5 px-1">
              <span
                className={cn(
                  'h-3 w-1 rounded-full bg-emerald-400 transition-all',
                  isSpeaking ? 'animate-bounce' : 'opacity-70'
                )}
              />
              <span
                className={cn(
                  'h-4 w-1 rounded-full bg-emerald-400 transition-all',
                  isSpeaking ? 'animate-bounce delay-75' : 'opacity-70'
                )}
              />
              <span
                className={cn(
                  'h-2 w-1 rounded-full bg-emerald-400 transition-all',
                  isSpeaking ? 'animate-bounce delay-150' : 'opacity-70'
                )}
              />
            </div>
          ) : (
            <div className="p-0.5 text-rose-400">
              <MicOff className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
