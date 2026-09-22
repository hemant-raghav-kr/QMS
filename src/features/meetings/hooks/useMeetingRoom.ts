'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LiveKitMediaProvider,
  MediaConnectionState,
  RemoteParticipantState,
} from '../realtime/media-provider';
import {
  startAttendanceSession,
  endAttendanceSession,
} from '../services/attendanceSessionService';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface MeetingUserIdentity {
  id: string;
  name: string;
  isHost: boolean;
  role: string;
}

export interface UseMeetingRoomOptions {
  meetingId: string;
  initialUser: MeetingUserIdentity;
}

export function useMeetingRoom({ meetingId, initialUser }: UseMeetingRoomOptions) {
  const router = useRouter();
  const supabase = createClient();

  // Connection & Media state
  const [connectionState, setConnectionState] = React.useState<MediaConnectionState>('CONNECTING');
  const [isLiveKitConfigured, setIsLiveKitConfigured] = React.useState(true);
  const [isMicOn, setIsMicOn] = React.useState(false);
  const [isCameraOn, setIsCameraOn] = React.useState(false);
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);

  // Local tracks
  const [localVideoTrack, setLocalVideoTrack] = React.useState<MediaStreamTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = React.useState<MediaStreamTrack | null>(null);
  const [localScreenTrack, setLocalScreenTrack] = React.useState<MediaStreamTrack | null>(null);

  // Remote participants & Active speaker
  const [remoteParticipants, setRemoteParticipants] = React.useState<Map<string, RemoteParticipantState>>(
    new Map()
  );
  const [activeSpeaker, setActiveSpeaker] = React.useState<string | null>(null);

  // UI Panels state
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [unreadChatCount, setUnreadChatCount] = React.useState(0);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  // References
  const mediaProviderRef = React.useRef<LiveKitMediaProvider | null>(null);
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const sessionIdRef = React.useRef<string>(`sess_${initialUser.id}_${Date.now()}`);

  // Room elapsed timer
  React.useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update local tracks helper
  const syncLocalTracks = React.useCallback(() => {
    if (mediaProviderRef.current) {
      const tracks = mediaProviderRef.current.getLocalTracks();
      setLocalVideoTrack(tracks.videoTrack);
      setLocalAudioTrack(tracks.audioTrack);
      setLocalScreenTrack(tracks.screenShareTrack);
      setIsCameraOn(Boolean(tracks.videoTrack && tracks.videoTrack.enabled));
      setIsMicOn(Boolean(tracks.audioTrack && tracks.audioTrack.enabled));
      setIsScreenSharing(Boolean(tracks.screenShareTrack));
    }
  }, []);

  // Initialize room & media
  React.useEffect(() => {
    let isCancelled = false;
    const sessionId = sessionIdRef.current;

    async function initRoom() {
      try {
        // 1. Record attendance session start
        await startAttendanceSession(meetingId, initialUser.id, sessionId);

        // 2. Request LiveKit token from server
        const res = await fetch(`/api/meetings/${meetingId}/token`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to authenticate meeting room');
        }

        const data = await res.json();
        if (isCancelled) return;

        if (!data.livekitConfigured) {
          setIsLiveKitConfigured(false);
          setConnectionState('CONNECTED'); // Fallback connected for presence/chat/controls
        } else {
          setIsLiveKitConfigured(true);

          // 3. Connect to LiveKit SFU media server
          const provider = new LiveKitMediaProvider({
            onConnectionStateChanged: (state) => {
              if (!isCancelled) setConnectionState(state);
            },
            onParticipantJoined: (p) => {
              if (!isCancelled) {
                setRemoteParticipants((prev) => {
                  const updated = new Map(prev);
                  updated.set(p.identity, p);
                  return updated;
                });
              }
            },
            onParticipantLeft: (identity) => {
              if (!isCancelled) {
                setRemoteParticipants((prev) => {
                  const updated = new Map(prev);
                  updated.delete(identity);
                  return updated;
                });
              }
            },
            onActiveSpeakersChanged: (speakers) => {
              if (!isCancelled) {
                setActiveSpeaker(speakers.length > 0 ? speakers[0] : null);
              }
            },
            onTrackSubscribed: (identity, track, kind, source) => {
              if (!isCancelled) {
                setRemoteParticipants((prev) => {
                  const updated = new Map(prev);
                  const p = updated.get(identity) || {
                    identity,
                    name: identity,
                    isSpeaking: false,
                    isAudioEnabled: false,
                    isVideoEnabled: false,
                    isScreenSharing: false,
                  };

                  if (source === 'screen_share') {
                    p.screenShareTrack = track;
                    p.isScreenSharing = true;
                  } else if (kind === 'video') {
                    p.videoTrack = track;
                    p.isVideoEnabled = true;
                  } else if (kind === 'audio') {
                    p.audioTrack = track;
                    p.isAudioEnabled = true;
                  }

                  updated.set(identity, { ...p });
                  return updated;
                });
              }
            },
            onTrackUnsubscribed: (identity, kind, source) => {
              if (!isCancelled) {
                setRemoteParticipants((prev) => {
                  const updated = new Map(prev);
                  const p = updated.get(identity);
                  if (p) {
                    if (source === 'screen_share') {
                      p.screenShareTrack = undefined;
                      p.isScreenSharing = false;
                    } else if (kind === 'video') {
                      p.videoTrack = undefined;
                      p.isVideoEnabled = false;
                    } else if (kind === 'audio') {
                      p.audioTrack = undefined;
                      p.isAudioEnabled = false;
                    }
                    updated.set(identity, { ...p });
                  }
                  return updated;
                });
              }
            },
            onError: (err) => {
              console.error('LiveKit Media error:', err);
            },
          });

          mediaProviderRef.current = provider;
          await provider.connect(data.url, data.token);
          if (!isCancelled) syncLocalTracks();
        }

        // 4. Setup Supabase Realtime channel for presence and signals
        const channel = supabase.channel(`meeting-room:${meetingId}`, {
          config: { presence: { key: initialUser.id } },
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            // Track participants from presence if media SFU is in fallback
            Object.keys(state).forEach((userId) => {
              if (userId !== initialUser.id) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pInfo: any = state[userId]?.[0];
                if (pInfo) {
                  setRemoteParticipants((prev) => {
                    const updated = new Map(prev);
                    if (!updated.has(userId)) {
                      updated.set(userId, {
                        identity: userId,
                        name: pInfo.name || 'Member',
                        isSpeaking: false,
                        isAudioEnabled: pInfo.isMicOn || false,
                        isVideoEnabled: pInfo.isCameraOn || false,
                        isScreenSharing: pInfo.isScreenSharing || false,
                      });
                    }
                    return updated;
                  });
                }
              }
            });
          })
          .on('broadcast', { event: 'host_signal' }, ({ payload }) => {
            if (payload.action === 'END_MEETING') {
              alert('The meeting has concluded.');
              router.push(`/meetings/${meetingId}`);
            } else if (payload.action === 'MUTE_PARTICIPANT' && payload.targetUserId === initialUser.id) {
              if (mediaProviderRef.current) {
                mediaProviderRef.current.setMicrophoneEnabled(false);
                setIsMicOn(false);
              }
            } else if (payload.action === 'KICK_PARTICIPANT' && payload.targetUserId === initialUser.id) {
              alert('You have been removed from this meeting by the host.');
              router.push(`/meetings/${meetingId}`);
            }
          })
          .on('broadcast', { event: 'new_chat_message' }, () => {
            setIsChatOpen((isOpen) => {
              if (!isOpen) setUnreadChatCount((c) => c + 1);
              return isOpen;
            });
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                userId: initialUser.id,
                name: initialUser.name,
                isHost: initialUser.isHost,
                isMicOn: false,
                isCameraOn: false,
                isScreenSharing: false,
                joinedAt: new Date().toISOString(),
              });
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Meeting init error:', err);
        if (!isCancelled) setConnectionState('FAILED');
      }
    }

    initRoom();

    // Browser unload handler: ensure attendance session is closed
    const handleBeforeUnload = () => {
      endAttendanceSession(sessionId);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isCancelled = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endAttendanceSession(sessionId);
      if (mediaProviderRef.current) {
        mediaProviderRef.current.disconnect();
        mediaProviderRef.current = null;
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [meetingId, initialUser, router, supabase, syncLocalTracks]);

  // Controls actions
  const toggleMicrophone = async () => {
    if (mediaProviderRef.current) {
      const nextState = !isMicOn;
      const success = await mediaProviderRef.current.setMicrophoneEnabled(nextState);
      setIsMicOn(success ? nextState : isMicOn);
      syncLocalTracks();
    } else {
      setIsMicOn((prev) => !prev);
    }
  };

  const toggleCamera = async () => {
    if (mediaProviderRef.current) {
      const nextState = !isCameraOn;
      const success = await mediaProviderRef.current.setCameraEnabled(nextState);
      setIsCameraOn(success ? nextState : isCameraOn);
      syncLocalTracks();
    } else {
      setIsCameraOn((prev) => !prev);
    }
  };

  const toggleScreenShare = async () => {
    if (mediaProviderRef.current) {
      const nextState = !isScreenSharing;
      const success = await mediaProviderRef.current.setScreenShareEnabled(nextState);
      setIsScreenSharing(success);
      syncLocalTracks();
    }
  };

  const switchCamera = async (deviceId: string) => {
    if (mediaProviderRef.current) {
      await mediaProviderRef.current.switchCamera(deviceId);
      syncLocalTracks();
    }
  };

  const switchMicrophone = async (deviceId: string) => {
    if (mediaProviderRef.current) {
      await mediaProviderRef.current.switchMicrophone(deviceId);
      syncLocalTracks();
    }
  };

  const leaveMeeting = async () => {
    await endAttendanceSession(sessionIdRef.current);
    if (mediaProviderRef.current) {
      await mediaProviderRef.current.disconnect();
    }
    router.push(`/meetings/${meetingId}`);
  };

  const endMeetingForAll = async () => {
    if (!initialUser.isHost) return;

    // Broadcast termination signal
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'host_signal',
        payload: { action: 'END_MEETING' },
      });
    }

    // Call server API to complete meeting and finalize attendance
    await fetch(`/api/meetings/${meetingId}/end`, { method: 'POST' });
    await leaveMeeting();
  };

  const muteParticipant = async (targetUserId: string) => {
    if (!initialUser.isHost || !channelRef.current) return;
    await channelRef.current.send({
      type: 'broadcast',
      event: 'host_signal',
      payload: { action: 'MUTE_PARTICIPANT', targetUserId },
    });
  };

  const kickParticipant = async (targetUserId: string) => {
    if (!initialUser.isHost || !channelRef.current) return;
    await channelRef.current.send({
      type: 'broadcast',
      event: 'host_signal',
      payload: { action: 'KICK_PARTICIPANT', targetUserId },
    });
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) setUnreadChatCount(0);
      return next;
    });
  };

  const toggleParticipants = () => setIsParticipantsOpen((prev) => !prev);
  const toggleSettings = () => setIsSettingsOpen((prev) => !prev);

  return {
    connectionState,
    isLiveKitConfigured,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    localVideoTrack,
    localAudioTrack,
    localScreenTrack,
    remoteParticipants,
    activeSpeaker,
    isChatOpen,
    isParticipantsOpen,
    isSettingsOpen,
    unreadChatCount,
    elapsedSeconds,
    toggleMicrophone,
    toggleCamera,
    toggleScreenShare,
    switchCamera,
    switchMicrophone,
    leaveMeeting,
    endMeetingForAll,
    muteParticipant,
    kickParticipant,
    toggleChat,
    toggleParticipants,
    toggleSettings,
  };
}
