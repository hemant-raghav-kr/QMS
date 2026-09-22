'use client';

import * as React from 'react';
import { X, Mic, MicOff, Video, VideoOff, Crown, ShieldAlert, Monitor } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RemoteParticipantState } from '../../realtime/media-provider';

interface ParticipantListProps {
  isOpen: boolean;
  onClose: () => void;
  localUser: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isHost: boolean;
  };
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  remoteParticipants: Map<string, RemoteParticipantState>;
  isHost: boolean;
  onMuteParticipant?: (userId: string) => void;
  onKickParticipant?: (userId: string) => void;
}

export function ParticipantList({
  isOpen,
  onClose,
  localUser,
  isMicOn,
  isCameraOn,
  isScreenSharing,
  remoteParticipants,
  isHost,
  onMuteParticipant,
  onKickParticipant,
}: ParticipantListProps) {
  const remotes = Array.from(remoteParticipants.values());
  const totalCount = 1 + remotes.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-30 w-full sm:w-80 md:w-96 flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex h-14 sm:h-16 items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white">Participants ({totalCount})</h3>
          <p className="text-[11px] text-slate-400">Members currently in this session</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Participants"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Local User Entry */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center gap-3 truncate">
            <Avatar
              src={localUser.avatarUrl}
              fallback={localUser.name}
              size="sm"
              className="h-8 w-8 text-xs shrink-0"
            />
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white truncate">
                  {localUser.name} (You)
                </span>
                {localUser.isHost && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 text-amber-400 px-1.5 py-0.2 text-[9px] font-bold uppercase">
                    <Crown className="h-2.5 w-2.5" /> Host
                  </span>
                )}
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">Connected</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 shrink-0">
            {isScreenSharing && <Monitor className="h-4 w-4 text-emerald-400" />}
            {isCameraOn ? <Video className="h-4 w-4 text-slate-300" /> : <VideoOff className="h-4 w-4 text-rose-400" />}
            {isMicOn ? <Mic className="h-4 w-4 text-slate-300" /> : <MicOff className="h-4 w-4 text-rose-400" />}
          </div>
        </div>

        {/* Remote Participants Entries */}
        {remotes.map((participant) => (
          <div
            key={participant.identity}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-800"
          >
            <div className="flex items-center gap-3 truncate">
              <Avatar
                fallback={participant.name}
                size="sm"
                className="h-8 w-8 text-xs shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {participant.name}
                </p>
                <span className="text-[10px] text-slate-400">In Meeting</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {participant.isScreenSharing && <Monitor className="h-4 w-4 text-emerald-400" />}
              {participant.isVideoEnabled ? (
                <Video className="h-4 w-4 text-slate-300" />
              ) : (
                <VideoOff className="h-4 w-4 text-rose-400" />
              )}
              {participant.isAudioEnabled ? (
                <Mic className="h-4 w-4 text-slate-300" />
              ) : (
                <MicOff className="h-4 w-4 text-rose-400" />
              )}

              {/* Host Moderation Actions */}
              {isHost && (
                <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
                  {participant.isAudioEnabled && onMuteParticipant && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMuteParticipant(participant.identity)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-amber-400"
                      title="Mute participant"
                    >
                      <MicOff className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onKickParticipant && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onKickParticipant(participant.identity)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
                      title="Remove participant"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
