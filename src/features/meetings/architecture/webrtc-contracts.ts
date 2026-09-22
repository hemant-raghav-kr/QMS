/**
 * Quartzite Management System (QMS)
 * WebRTC SFU Conference Room Contracts
 */

export type RoomConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'FAILED';

export interface ParticipantMediaTrack {
  id: string;
  kind: 'audio' | 'video';
  source: 'camera' | 'microphone' | 'screen_share';
  isMuted: boolean;
  mediaStreamTrack?: MediaStreamTrack;
}

export interface MeetingParticipantState {
  id: string;
  identity: string; // Supabase user_id
  name: string;
  avatarUrl?: string | null;
  isSpeaking: boolean;
  audioTrack?: ParticipantMediaTrack;
  videoTrack?: ParticipantMediaTrack;
  screenShareTrack?: ParticipantMediaTrack;
  isHost: boolean;
  joinedAt: Date;
}

export interface MediaDeviceSettings {
  audioInputDeviceId: string | null;
  audioOutputDeviceId: string | null;
  videoInputDeviceId: string | null;
}

export interface WebRTCConferenceSession {
  roomId: string;
  connectionState: RoomConnectionState;
  participants: Map<string, MeetingParticipantState>;
  localParticipant: MeetingParticipantState | null;
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;

  // Media Controls
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  setAudioInputDevice: (deviceId: string) => Promise<void>;
  setVideoInputDevice: (deviceId: string) => Promise<void>;

  // Host Controls
  muteParticipant: (participantId: string) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  endMeetingForAll: () => Promise<void>;

  // Session
  connect: (token: string) => Promise<void>;
  disconnect: () => Promise<void>;
}
