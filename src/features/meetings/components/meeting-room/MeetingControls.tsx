'use client';

import * as React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageSquare,
  Users,
  Settings,
  PhoneOff,
  ChevronUp,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface MeetingControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  hasScreenShareSupport: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  unreadChatCount: number;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onOpenSettings: () => void;
  onLeaveMeeting: () => void;
  onEndMeetingForAll?: () => void;
}

export function MeetingControls({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  hasScreenShareSupport,
  isChatOpen,
  isParticipantsOpen,
  unreadChatCount,
  isHost,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onOpenSettings,
  onLeaveMeeting,
  onEndMeetingForAll,
}: MeetingControlsProps) {
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);

  return (
    <>
      <footer className="flex h-16 sm:h-20 w-full items-center justify-center px-3 sm:px-6 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-20 shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 sm:gap-3 max-w-2xl w-full justify-between sm:justify-center">
          {/* Microphone Toggle */}
          <div className="flex items-center">
            <button
              onClick={onToggleMic}
              aria-label={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              className={cn(
                'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-all shadow-md active:scale-95',
                isMicOn
                  ? 'bg-slate-800 text-white hover:bg-slate-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              )}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
          </div>

          {/* Camera Toggle */}
          <div className="flex items-center">
            <button
              onClick={onToggleCamera}
              aria-label={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
              className={cn(
                'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-all shadow-md active:scale-95',
                isCameraOn
                  ? 'bg-slate-800 text-white hover:bg-slate-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              )}
            >
              {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
          </div>

          {/* Screen Share (Only if supported on platform) */}
          {hasScreenShareSupport && (
            <button
              onClick={onToggleScreenShare}
              aria-label={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
              className={cn(
                'hidden sm:flex h-12 w-12 items-center justify-center rounded-xl transition-all shadow-md active:scale-95',
                isScreenSharing
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-500/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
            >
              <Monitor className="h-5 w-5" />
            </button>
          )}

          {/* Chat Toggle with Unread Badge */}
          <div className="relative">
            <button
              onClick={onToggleChat}
              aria-label="Toggle Meeting Chat"
              className={cn(
                'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-all shadow-md active:scale-95',
                isChatOpen
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow ring-2 ring-slate-950 animate-bounce">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </div>

          {/* Participants Roster Toggle */}
          <button
            onClick={onToggleParticipants}
            aria-label="Toggle Participants Roster"
            className={cn(
              'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-all shadow-md active:scale-95',
              isParticipantsOpen
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            )}
          >
            <Users className="h-5 w-5" />
          </button>

          {/* Device Settings Toggle */}
          <button
            onClick={onOpenSettings}
            aria-label="Device Settings"
            className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-md active:scale-95"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Leave / End Meeting Button */}
          <button
            onClick={() => setShowLeaveModal(true)}
            aria-label="Leave Meeting"
            className="flex h-11 w-12 sm:h-12 sm:w-16 items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md active:scale-95 ml-1"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </footer>

      {/* Leave / End Confirmation Dialog */}
      <Dialog
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title={isHost ? 'Meeting Options' : 'Leave Meeting'}
        description={
          isHost
            ? 'You are the host of this session. You can leave the room or end the meeting for all participants.'
            : 'Are you sure you want to leave this meeting? Your attendance session will be saved.'
        }
      >
        <div className="space-y-3 pt-2">
          {isHost && onEndMeetingForAll && (
            <Button
              variant="danger"
              className="w-full justify-center gap-2"
              onClick={() => {
                setShowLeaveModal(false);
                onEndMeetingForAll();
              }}
            >
              End Meeting for All
            </Button>
          )}

          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() => {
              setShowLeaveModal(false);
              onLeaveMeeting();
            }}
          >
            Leave Room
          </Button>

          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={() => setShowLeaveModal(false)}
          >
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}
