/**
 * Quartzite Management System (QMS)
 * Real-Time Media Provider Abstraction & LiveKit SFU Implementation
 */

import {
  Room,
  RoomEvent,
  VideoPresets,
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  ConnectionState,
  Participant,
  createLocalTracks,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from 'livekit-client';

export type MediaConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'FAILED';

export interface ParticipantMediaTrackInfo {
  trackId: string;
  kind: 'audio' | 'video';
  source: 'camera' | 'microphone' | 'screen_share';
  isMuted: boolean;
  mediaStreamTrack?: MediaStreamTrack;
}

export interface RemoteParticipantState {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  screenShareTrack?: MediaStreamTrack;
}

export interface MediaProviderCallbacks {
  onConnectionStateChanged: (state: MediaConnectionState) => void;
  onParticipantJoined: (participant: RemoteParticipantState) => void;
  onParticipantLeft: (identity: string) => void;
  onActiveSpeakersChanged: (speakerIdentities: string[]) => void;
  onTrackSubscribed: (identity: string, track: MediaStreamTrack, kind: 'audio' | 'video', source: string) => void;
  onTrackUnsubscribed: (identity: string, kind: 'audio' | 'video', source: string) => void;
  onError: (error: Error) => void;
}

export interface MediaProvider {
  connect(url: string, token: string): Promise<void>;
  disconnect(): Promise<void>;
  setMicrophoneEnabled(enabled: boolean): Promise<boolean>;
  setCameraEnabled(enabled: boolean): Promise<boolean>;
  setScreenShareEnabled(enabled: boolean): Promise<boolean>;
  switchCamera(deviceId: string): Promise<void>;
  switchMicrophone(deviceId: string): Promise<void>;
  getLocalTracks(): {
    videoTrack: MediaStreamTrack | null;
    audioTrack: MediaStreamTrack | null;
    screenShareTrack: MediaStreamTrack | null;
  };
  getConnectionState(): MediaConnectionState;
}

export class LiveKitMediaProvider implements MediaProvider {
  private room: Room | null = null;
  private callbacks: MediaProviderCallbacks;
  private localVideoTrack: LocalVideoTrack | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;
  private localScreenTrack: LocalVideoTrack | null = null;
  private selectedCameraDeviceId: string | null = null;
  private selectedMicrophoneDeviceId: string | null = null;

  constructor(callbacks: MediaProviderCallbacks) {
    this.callbacks = callbacks;
    if (typeof window !== 'undefined') {
      this.selectedCameraDeviceId = localStorage.getItem('qms_preferred_camera');
      this.selectedMicrophoneDeviceId = localStorage.getItem('qms_preferred_mic');
    }
  }

  async connect(url: string, token: string): Promise<void> {
    try {
      this.callbacks.onConnectionStateChanged('CONNECTING');

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      this.setupRoomEventListeners();
      await this.room.connect(url, token);
      this.callbacks.onConnectionStateChanged('CONNECTED');

      // Publish initial local tracks if accessible
      try {
        const audioOption = this.selectedMicrophoneDeviceId
          ? { deviceId: this.selectedMicrophoneDeviceId }
          : true;
        const videoOption = this.selectedCameraDeviceId
          ? { deviceId: this.selectedCameraDeviceId }
          : true;

        const tracks = await createLocalTracks({
          audio: audioOption,
          video: videoOption,
        });

        for (const track of tracks) {
          if (track.kind === Track.Kind.Video) {
            this.localVideoTrack = track as LocalVideoTrack;
            await this.room.localParticipant.publishTrack(track);
          } else if (track.kind === Track.Kind.Audio) {
            this.localAudioTrack = track as LocalAudioTrack;
            await this.room.localParticipant.publishTrack(track);
          }
        }
      } catch (trackError) {
        console.warn('Initial camera/mic access deferred or permission prompt declined:', trackError);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to connect to media server');
      this.callbacks.onConnectionStateChanged('FAILED');
      this.callbacks.onError(error);
      throw error;
    }
  }

  private setupRoomEventListeners(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      switch (state) {
        case ConnectionState.Connected:
          this.callbacks.onConnectionStateChanged('CONNECTED');
          break;
        case ConnectionState.Reconnecting:
          this.callbacks.onConnectionStateChanged('RECONNECTING');
          break;
        case ConnectionState.Connecting:
          this.callbacks.onConnectionStateChanged('CONNECTING');
          break;
        case ConnectionState.Disconnected:
        default:
          this.callbacks.onConnectionStateChanged('DISCONNECTED');
          break;
      }
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      this.callbacks.onParticipantJoined({
        identity: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        isAudioEnabled: participant.isMicrophoneEnabled,
        isVideoEnabled: participant.isCameraEnabled,
        isScreenSharing: participant.isScreenShareEnabled,
      });
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.callbacks.onParticipantLeft(participant.identity);
    });

    this.room.on(
      RoomEvent.TrackSubscribed,
      (track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.mediaStreamTrack) {
          const kind = track.kind === Track.Kind.Audio ? 'audio' : 'video';
          const source = publication.source === Track.Source.ScreenShare ? 'screen_share' : kind;
          this.callbacks.onTrackSubscribed(participant.identity, track.mediaStreamTrack, kind, source);
        }
      }
    );

    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        const kind = track.kind === Track.Kind.Audio ? 'audio' : 'video';
        const source = publication.source === Track.Source.ScreenShare ? 'screen_share' : kind;
        this.callbacks.onTrackUnsubscribed(participant.identity, kind, source);
      }
    );

    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      this.callbacks.onActiveSpeakersChanged(speakers.map((s) => s.identity));
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.callbacks.onConnectionStateChanged('DISCONNECTED');
    });
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    if (!this.room) return false;
    try {
      if (enabled) {
        if (!this.localAudioTrack) {
          this.localAudioTrack = await createLocalAudioTrack(
            this.selectedMicrophoneDeviceId
              ? { deviceId: this.selectedMicrophoneDeviceId }
              : undefined
          );
          await this.room.localParticipant.publishTrack(this.localAudioTrack);
        } else {
          await this.localAudioTrack.unmute();
        }
        return true;
      } else {
        if (this.localAudioTrack) {
          await this.localAudioTrack.mute();
        }
        return false;
      }
    } catch (err) {
      console.error('Error toggling microphone:', err);
      return false;
    }
  }

  async setCameraEnabled(enabled: boolean): Promise<boolean> {
    if (!this.room) return false;
    try {
      if (enabled) {
        if (!this.localVideoTrack) {
          this.localVideoTrack = await createLocalVideoTrack(
            this.selectedCameraDeviceId
              ? { deviceId: this.selectedCameraDeviceId }
              : undefined
          );
          await this.room.localParticipant.publishTrack(this.localVideoTrack);
        } else {
          await this.localVideoTrack.unmute();
        }
        return true;
      } else {
        if (this.localVideoTrack) {
          await this.localVideoTrack.mute();
        }
        return false;
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
      return false;
    }
  }

  async setScreenShareEnabled(enabled: boolean): Promise<boolean> {
    if (!this.room) return false;
    try {
      await this.room.localParticipant.setScreenShareEnabled(enabled, {
        audio: true,
      });

      if (enabled) {
        const screenPub = this.room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        this.localScreenTrack = (screenPub?.track as LocalVideoTrack) || null;
      } else {
        this.localScreenTrack = null;
      }

      return enabled;
    } catch (err) {
      console.error('Error toggling screen share:', err);
      return false;
    }
  }

  async switchCamera(deviceId: string): Promise<void> {
    this.selectedCameraDeviceId = deviceId;
    if (this.room) {
      try {
        await this.room.switchActiveDevice('videoinput', deviceId);
      } catch (err) {
        console.warn('LiveKit switch camera error:', err);
      }
    }
  }

  async switchMicrophone(deviceId: string): Promise<void> {
    this.selectedMicrophoneDeviceId = deviceId;
    if (this.room) {
      try {
        await this.room.switchActiveDevice('audioinput', deviceId);
      } catch (err) {
        console.warn('LiveKit switch microphone error:', err);
      }
    }
  }

  getLocalTracks() {
    return {
      videoTrack: this.localVideoTrack?.mediaStreamTrack || null,
      audioTrack: this.localAudioTrack?.mediaStreamTrack || null,
      screenShareTrack: this.localScreenTrack?.mediaStreamTrack || null,
    };
  }

  getConnectionState(): MediaConnectionState {
    if (!this.room) return 'DISCONNECTED';
    switch (this.room.state) {
      case ConnectionState.Connected:
        return 'CONNECTED';
      case ConnectionState.Connecting:
        return 'CONNECTING';
      case ConnectionState.Reconnecting:
        return 'RECONNECTING';
      case ConnectionState.Disconnected:
      default:
        return 'DISCONNECTED';
    }
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      try {
        if (this.localVideoTrack) {
          this.localVideoTrack.stop();
          this.localVideoTrack = null;
        }
        if (this.localAudioTrack) {
          this.localAudioTrack.stop();
          this.localAudioTrack = null;
        }
        if (this.localScreenTrack) {
          this.localScreenTrack.stop();
          this.localScreenTrack = null;
        }
        await this.room.disconnect();
      } catch (err) {
        console.warn('Error during room disconnect:', err);
      } finally {
        this.room = null;
      }
    }
    this.callbacks.onConnectionStateChanged('DISCONNECTED');
  }
}
