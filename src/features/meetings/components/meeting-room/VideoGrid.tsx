'use client';

import * as React from 'react';
import { ParticipantTile } from './ParticipantTile';
import { ScreenShareView } from './ScreenShareView';
import { RemoteParticipantState } from '../../realtime/media-provider';
import { cn } from '@/lib/utils/cn';

interface VideoGridProps {
  localUser: {
    name: string;
    avatarUrl?: string | null;
    isHost: boolean;
  };
  localTracks: {
    videoTrack: MediaStreamTrack | null;
    audioTrack: MediaStreamTrack | null;
    screenShareTrack: MediaStreamTrack | null;
  };
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  remoteParticipants: Map<string, RemoteParticipantState>;
  activeSpeaker: string | null;
  onStopScreenShare?: () => void;
}

export function VideoGrid({
  localUser,
  localTracks,
  isMicOn,
  isCameraOn,
  isScreenSharing,
  remoteParticipants,
  activeSpeaker,
  onStopScreenShare,
}: VideoGridProps) {
  const remotesList = Array.from(remoteParticipants.values());
  const totalCount = 1 + remotesList.length;

  // Check if anyone (local or remote) is sharing screen
  const remoteScreenPresenter = remotesList.find((p) => p.isScreenSharing && p.screenShareTrack);
  const isAnyScreenSharing = Boolean(isScreenSharing || remoteScreenPresenter);

  // If screen sharing is active
  if (isAnyScreenSharing) {
    const activeScreenTrack = isScreenSharing
      ? localTracks.screenShareTrack
      : remoteScreenPresenter?.screenShareTrack;

    const presenterName = isScreenSharing
      ? localUser.name
      : remoteScreenPresenter?.name || 'Participant';

    return (
      <div className="flex flex-col h-full w-full gap-3 p-2 sm:p-4 overflow-hidden">
        {/* Main Stage: Screen Share */}
        <div className="flex-1 min-h-0 w-full">
          {activeScreenTrack ? (
            <ScreenShareView
              screenTrack={activeScreenTrack}
              presenterName={presenterName}
              isLocal={isScreenSharing}
              onStopSharing={isScreenSharing ? onStopScreenShare : undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Loading presentation feed...
            </div>
          )}
        </div>

        {/* Bottom Horizontal Tile Strip */}
        <div className="h-32 sm:h-36 shrink-0 flex items-center gap-3 overflow-x-auto pb-1">
          {/* Local User Thumbnail */}
          <div className="h-full aspect-video shrink-0">
            <ParticipantTile
              name={localUser.name}
              avatarUrl={localUser.avatarUrl}
              videoTrack={localTracks.videoTrack}
              audioTrack={null}
              isAudioEnabled={isMicOn}
              isVideoEnabled={isCameraOn}
              isSpeaking={false}
              isHost={localUser.isHost}
              isLocal={true}
              className="h-full w-full"
            />
          </div>

          {/* Remote Users Thumbnails */}
          {remotesList.map((p) => (
            <div key={p.identity} className="h-full aspect-video shrink-0">
              <ParticipantTile
                name={p.name}
                videoTrack={p.videoTrack}
                audioTrack={p.audioTrack}
                isAudioEnabled={p.isAudioEnabled}
                isVideoEnabled={p.isVideoEnabled}
                isSpeaking={activeSpeaker === p.identity || p.isSpeaking}
                className="h-full w-full"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Regular Grid layout calculations
  const getGridClasses = (count: number) => {
    if (count === 1) return 'grid-cols-1 grid-rows-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 grid-rows-2 sm:grid-rows-1';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-2 sm:grid-cols-3 grid-rows-3 sm:grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-2 sm:grid-cols-4 grid-rows-auto';
  };

  return (
    <div
      className={cn(
        'grid h-full w-full gap-2 sm:gap-4 p-2 sm:p-4 overflow-y-auto',
        getGridClasses(totalCount)
      )}
    >
      {/* Local User Tile */}
      <ParticipantTile
        name={localUser.name}
        avatarUrl={localUser.avatarUrl}
        videoTrack={localTracks.videoTrack}
        audioTrack={null}
        isAudioEnabled={isMicOn}
        isVideoEnabled={isCameraOn}
        isSpeaking={false}
        isHost={localUser.isHost}
        isLocal={true}
        className="w-full h-full min-h-[160px] sm:min-h-[220px]"
      />

      {/* Remote Participant Tiles */}
      {remotesList.map((p) => (
        <ParticipantTile
          key={p.identity}
          name={p.name}
          videoTrack={p.videoTrack}
          audioTrack={p.audioTrack}
          isAudioEnabled={p.isAudioEnabled}
          isVideoEnabled={p.isVideoEnabled}
          isSpeaking={activeSpeaker === p.identity || p.isSpeaking}
          className="w-full h-full min-h-[160px] sm:min-h-[220px]"
        />
      ))}
    </div>
  );
}
