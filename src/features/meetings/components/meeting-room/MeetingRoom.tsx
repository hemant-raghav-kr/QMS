'use client';

import * as React from 'react';
import { VolumeX } from 'lucide-react';
import { useMeetingRoom, MeetingUserIdentity } from '../../hooks/useMeetingRoom';
import { useMediaDevices } from '../../hooks/useMediaDevices';
import { MeetingHeader } from './MeetingHeader';
import { VideoGrid } from './VideoGrid';
import { MeetingControls } from './MeetingControls';
import { MeetingChat } from './MeetingChat';
import { ParticipantList } from './ParticipantList';
import { DeviceSettingsModal } from './DeviceSettingsModal';

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
  currentUser: MeetingUserIdentity;
  userAvatarUrl?: string | null;
}

export function MeetingRoom({
  meetingId,
  meetingTitle,
  currentUser,
  userAvatarUrl,
}: MeetingRoomProps) {
  const room = useMeetingRoom({
    meetingId,
    initialUser: currentUser,
  });

  const mediaDevices = useMediaDevices();

  const handleSelectCamera = async (deviceId: string) => {
    mediaDevices.setSelectedVideoInput(deviceId);
    await room.switchCamera(deviceId);
  };

  const handleSelectMicrophone = async (deviceId: string) => {
    mediaDevices.setSelectedAudioInput(deviceId);
    await room.switchMicrophone(deviceId);
  };

  const handleSelectSpeaker = async (deviceId: string) => {
    mediaDevices.setSelectedAudioOutput(deviceId);
    await room.switchSpeaker(deviceId);
  };

  const totalParticipants = 1 + room.remoteParticipants.size;

  return (
    <div
      onClick={() => {
        if (!room.canPlaybackAudio) {
          room.startAudio();
        }
      }}
      className="relative flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none"
    >
      {/* Autoplay blocked notification banner */}
      {!room.canPlaybackAudio && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-medium text-xs sm:text-sm shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-2">
          <VolumeX className="h-4 w-4 shrink-0" />
          <span>Audio playback paused by browser autoplay policy.</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              room.startAudio();
            }}
            className="px-3 py-1 rounded-lg bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow"
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Top Meeting Header Bar */}
      <MeetingHeader
        title={meetingTitle}
        elapsedSeconds={room.elapsedSeconds}
        participantCount={totalParticipants}
        connectionState={room.connectionState}
        isLiveKitConfigured={room.isLiveKitConfigured}
        onToggleParticipants={room.toggleParticipants}
      />

      {/* Center Stage: Video Grid / Screen Share */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden">
        <VideoGrid
          localUser={{
            name: currentUser.name,
            avatarUrl: userAvatarUrl,
            isHost: currentUser.isHost,
          }}
          localTracks={{
            videoTrack: room.localVideoTrack,
            audioTrack: room.localAudioTrack,
            screenShareTrack: room.localScreenTrack,
          }}
          isMicOn={room.isMicOn}
          isCameraOn={room.isCameraOn}
          isScreenSharing={room.isScreenSharing}
          remoteParticipants={room.remoteParticipants}
          activeSpeaker={room.activeSpeaker}
          onStopScreenShare={room.toggleScreenShare}
        />

        {/* Side Panels */}
        <MeetingChat
          isOpen={room.isChatOpen}
          onClose={room.toggleChat}
          meetingId={meetingId}
          currentUserId={currentUser.id}
        />

        <ParticipantList
          isOpen={room.isParticipantsOpen}
          onClose={room.toggleParticipants}
          localUser={{
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: userAvatarUrl,
            isHost: currentUser.isHost,
          }}
          isMicOn={room.isMicOn}
          isCameraOn={room.isCameraOn}
          isScreenSharing={room.isScreenSharing}
          remoteParticipants={room.remoteParticipants}
          isHost={currentUser.isHost}
          onMuteParticipant={room.muteParticipant}
          onKickParticipant={room.kickParticipant}
        />
      </main>

      {/* Bottom Meeting Control Dock */}
      <MeetingControls
        isMicOn={room.isMicOn}
        isCameraOn={room.isCameraOn}
        isScreenSharing={room.isScreenSharing}
        hasScreenShareSupport={mediaDevices.hasScreenShareSupport}
        isChatOpen={room.isChatOpen}
        isParticipantsOpen={room.isParticipantsOpen}
        unreadChatCount={room.unreadChatCount}
        isHost={currentUser.isHost}
        onToggleMic={room.toggleMicrophone}
        onToggleCamera={room.toggleCamera}
        onToggleScreenShare={room.toggleScreenShare}
        onToggleChat={room.toggleChat}
        onToggleParticipants={room.toggleParticipants}
        onOpenSettings={room.toggleSettings}
        onLeaveMeeting={room.leaveMeeting}
        onEndMeetingForAll={room.endMeetingForAll}
      />

      {/* Device Settings Modal */}
      <DeviceSettingsModal
        isOpen={room.isSettingsOpen}
        onClose={room.toggleSettings}
        devices={mediaDevices.devices}
        selectedCamera={mediaDevices.selectedVideoInput}
        selectedMicrophone={mediaDevices.selectedAudioInput}
        selectedSpeaker={mediaDevices.selectedAudioOutput}
        onSelectCamera={handleSelectCamera}
        onSelectMicrophone={handleSelectMicrophone}
        onSelectSpeaker={handleSelectSpeaker}
        onRequestPermissions={mediaDevices.requestPermissions}
        onRefreshDevices={mediaDevices.refreshDevices}
        permissionState={mediaDevices.permissionState}
      />
    </div>
  );
}
