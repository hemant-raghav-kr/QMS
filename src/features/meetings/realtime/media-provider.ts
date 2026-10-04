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
  RemoteAudioTrack,
  RemoteTrack,
  RemoteTrackPublication,
  TrackPublication,
  RemoteParticipant,
  ConnectionState,
  Participant,
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
  onParticipantTrackMuted?: (identity: string, kind: 'audio' | 'video') => void;
  onParticipantTrackUnmuted?: (identity: string, kind: 'audio' | 'video') => void;
  onAudioPlaybackStatusChanged?: (canPlayAudio: boolean) => void;
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
  switchSpeaker(deviceId: string): Promise<void>;
  canPlaybackAudio(): boolean;
  startAudio(): Promise<boolean>;
  setParticipantVolume(identity: string, volume: number): void;
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
  private selectedSpeakerDeviceId: string | null = null;
  private audioContainer: HTMLElement | null = null;

  constructor(callbacks: MediaProviderCallbacks) {
    this.callbacks = callbacks;
    if (typeof window !== 'undefined') {
      this.selectedCameraDeviceId = localStorage.getItem('qms_preferred_camera');
      this.selectedMicrophoneDeviceId = localStorage.getItem('qms_preferred_mic');
      this.selectedSpeakerDeviceId = localStorage.getItem('qms_preferred_speaker');
    }
  }

  private getOrCreateAudioContainer(): HTMLElement {
    if (typeof document === 'undefined') {
      throw new Error('DOM unavailable');
    }
    if (this.audioContainer && document.body.contains(this.audioContainer)) {
      return this.audioContainer;
    }
    let container = document.getElementById('livekit-audio-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'livekit-audio-container';
      container.style.position = 'fixed';
      container.style.width = '0';
      container.style.height = '0';
      container.style.overflow = 'hidden';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    this.audioContainer = container;
    return container;
  }

  private attachRemoteAudio(track: RemoteAudioTrack, participantIdentity: string, trackSid: string): HTMLMediaElement {
    const container = this.getOrCreateAudioContainer();
    const el = track.attach();
    el.id = `lk-audio-${participantIdentity}-${trackSid}`;
    el.dataset.participantIdentity = participantIdentity;
    el.dataset.trackSid = trackSid;
    el.autoplay = true;
    if (!container.contains(el)) {
      container.appendChild(el);
    }
    if (this.selectedSpeakerDeviceId && 'setSinkId' in el) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any).setSinkId(this.selectedSpeakerDeviceId).catch(() => {});
    }
    return el;
  }

  private detachRemoteAudio(track: RemoteAudioTrack): void {
    try {
      const detached = track.detach();
      detached.forEach((el) => el.remove());
    } catch (err) {
      console.warn('[LiveKit] Error detaching audio track:', err);
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
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.setupRoomEventListeners();
      await this.room.connect(url, token);
      this.callbacks.onConnectionStateChanged('CONNECTED');

      // Check audio playback status
      if (!this.room.canPlaybackAudio) {
        this.callbacks.onAudioPlaybackStatusChanged?.(false);
      }

      // Process any already-connected participants in the room
      this.room.remoteParticipants.forEach((participant) => {
        this.callbacks.onParticipantJoined({
          identity: participant.identity,
          name: participant.name || participant.identity,
          isSpeaking: participant.isSpeaking,
          isAudioEnabled: participant.isMicrophoneEnabled,
          isVideoEnabled: participant.isCameraEnabled,
          isScreenSharing: participant.isScreenShareEnabled,
        });

        participant.trackPublications.forEach((pub) => {
          if (pub.isSubscribed && pub.track && pub.track.mediaStreamTrack) {
            const kind = pub.kind === Track.Kind.Audio ? 'audio' : 'video';
            const source = pub.source === Track.Source.ScreenShare ? 'screen_share' : kind;
            if (kind === 'audio' && pub.track instanceof RemoteAudioTrack) {
              this.attachRemoteAudio(pub.track, participant.identity, pub.trackSid);
            }
            this.callbacks.onTrackSubscribed(participant.identity, pub.track.mediaStreamTrack, kind, source);
            if (pub.isMuted) {
              this.callbacks.onParticipantTrackMuted?.(participant.identity, kind);
            }
          }
        });
      });

      // Enable and publish initial local tracks
      try {
        const audioOption = this.selectedMicrophoneDeviceId
          ? { deviceId: this.selectedMicrophoneDeviceId }
          : true;
        const videoOption = this.selectedCameraDeviceId
          ? { deviceId: this.selectedCameraDeviceId }
          : true;

        await Promise.allSettled([
          this.room.localParticipant.setMicrophoneEnabled(true, typeof audioOption === 'object' ? audioOption : undefined),
          this.room.localParticipant.setCameraEnabled(true, typeof videoOption === 'object' ? videoOption : undefined),
        ]);

        const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
        this.localAudioTrack = (micPub?.track as LocalAudioTrack) || null;

        const camPub = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
        this.localVideoTrack = (camPub?.track as LocalVideoTrack) || null;
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
      participant.audioTrackPublications.forEach((pub) => {
        if (pub.track && pub.track instanceof RemoteAudioTrack) {
          this.detachRemoteAudio(pub.track);
        }
      });
      this.callbacks.onParticipantLeft(participant.identity);
    });

    this.room.on(
      RoomEvent.TrackSubscribed,
      (track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio && track instanceof RemoteAudioTrack) {
          this.attachRemoteAudio(track, participant.identity, publication.trackSid);
        }

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
        if (track.kind === Track.Kind.Audio && track instanceof RemoteAudioTrack) {
          this.detachRemoteAudio(track);
        }
        const kind = track.kind === Track.Kind.Audio ? 'audio' : 'video';
        const source = publication.source === Track.Source.ScreenShare ? 'screen_share' : kind;
        this.callbacks.onTrackUnsubscribed(participant.identity, kind, source);
      }
    );

    this.room.on(RoomEvent.TrackMuted, (publication: TrackPublication, participant: Participant) => {
      if (participant instanceof RemoteParticipant) {
        const isMic = publication.source === Track.Source.Microphone || publication.kind === Track.Kind.Audio;
        const isCam = publication.source === Track.Source.Camera || publication.kind === Track.Kind.Video;
        if (isMic) {
          this.callbacks.onParticipantTrackMuted?.(participant.identity, 'audio');
        } else if (isCam) {
          this.callbacks.onParticipantTrackMuted?.(participant.identity, 'video');
        }
      }
    });

    this.room.on(RoomEvent.TrackUnmuted, (publication: TrackPublication, participant: Participant) => {
      if (participant instanceof RemoteParticipant) {
        const isMic = publication.source === Track.Source.Microphone || publication.kind === Track.Kind.Audio;
        const isCam = publication.source === Track.Source.Camera || publication.kind === Track.Kind.Video;
        if (isMic) {
          this.callbacks.onParticipantTrackUnmuted?.(participant.identity, 'audio');
        } else if (isCam) {
          this.callbacks.onParticipantTrackUnmuted?.(participant.identity, 'video');
        }
      }
    });

    this.room.on(RoomEvent.AudioPlaybackStatusChanged, (playing: boolean) => {
      this.callbacks.onAudioPlaybackStatusChanged?.(playing);
    });

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
      const audioOption = this.selectedMicrophoneDeviceId
        ? { deviceId: this.selectedMicrophoneDeviceId }
        : undefined;
      await this.room.localParticipant.setMicrophoneEnabled(enabled, audioOption);
      const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
      this.localAudioTrack = (micPub?.track as LocalAudioTrack) || null;
      return enabled;
    } catch (err) {
      console.error('Error toggling microphone:', err);
      return false;
    }
  }

  async setCameraEnabled(enabled: boolean): Promise<boolean> {
    if (!this.room) return false;
    try {
      const videoOption = this.selectedCameraDeviceId
        ? { deviceId: this.selectedCameraDeviceId }
        : undefined;
      await this.room.localParticipant.setCameraEnabled(enabled, videoOption);
      const camPub = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
      this.localVideoTrack = (camPub?.track as LocalVideoTrack) || null;
      return enabled;
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('qms_preferred_camera', deviceId);
    }
    if (this.room) {
      try {
        await this.room.switchActiveDevice('videoinput', deviceId);
        const camPub = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
        this.localVideoTrack = (camPub?.track as LocalVideoTrack) || null;
      } catch (err) {
        console.warn('LiveKit switch camera error:', err);
      }
    }
  }

  async switchMicrophone(deviceId: string): Promise<void> {
    this.selectedMicrophoneDeviceId = deviceId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('qms_preferred_mic', deviceId);
    }
    if (this.room) {
      try {
        await this.room.switchActiveDevice('audioinput', deviceId);
        const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
        this.localAudioTrack = (micPub?.track as LocalAudioTrack) || null;
      } catch (err) {
        console.warn('LiveKit switch microphone error:', err);
      }
    }
  }

  async switchSpeaker(deviceId: string): Promise<void> {
    this.selectedSpeakerDeviceId = deviceId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('qms_preferred_speaker', deviceId);
    }
    if (this.room) {
      try {
        await this.room.switchActiveDevice('audiooutput', deviceId);
      } catch (err) {
        console.warn('LiveKit switch speaker error:', err);
      }
    }
  }

  setParticipantVolume(identity: string, volume: number): void {
    if (!this.room) return;
    const participant = this.room.getParticipantByIdentity(identity);
    if (participant instanceof RemoteParticipant) {
      participant.audioTrackPublications.forEach((pub) => {
        if (pub.track && pub.track instanceof RemoteAudioTrack) {
          pub.track.setVolume(volume);
        }
      });
    }
  }

  canPlaybackAudio(): boolean {
    return this.room?.canPlaybackAudio ?? true;
  }

  async startAudio(): Promise<boolean> {
    if (!this.room) return false;
    try {
      await this.room.startAudio();
      return true;
    } catch (err) {
      console.warn('[LiveKit] startAudio error:', err);
      return false;
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
        this.room.remoteParticipants.forEach((p) => {
          p.audioTrackPublications.forEach((pub) => {
            if (pub.track && pub.track instanceof RemoteAudioTrack) {
              this.detachRemoteAudio(pub.track);
            }
          });
        });
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
    if (this.audioContainer) {
      this.audioContainer.remove();
      this.audioContainer = null;
    }
    this.callbacks.onConnectionStateChanged('DISCONNECTED');
  }
}
