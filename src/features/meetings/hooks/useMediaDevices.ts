'use client';

import * as React from 'react';
import {
  enumerateMediaDevices,
  requestMediaPermissions,
  checkMediaPermissions,
  isScreenShareSupported,
  MediaDeviceInventory,
} from '../services/mediaService';

export function useMediaDevices() {
  const [devices, setDevices] = React.useState<MediaDeviceInventory>({
    audioInputs: [],
    audioOutputs: [],
    videoInputs: [],
  });
  const [selectedAudioInput, setSelectedAudioInputState] = React.useState<string>('');
  const [selectedVideoInput, setSelectedVideoInputState] = React.useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutputState] = React.useState<string>('');
  const [hasScreenShareSupport, setHasScreenShareSupport] = React.useState(false);
  const [permissionState, setPermissionState] = React.useState<{
    camera: PermissionState | 'unknown';
    microphone: PermissionState | 'unknown';
  }>({ camera: 'unknown', microphone: 'unknown' });

  // Load saved preferences on client mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCam = localStorage.getItem('qms_preferred_camera');
      const savedMic = localStorage.getItem('qms_preferred_mic');
      const savedSpeaker = localStorage.getItem('qms_preferred_speaker');
      if (savedCam) setSelectedVideoInputState(savedCam);
      if (savedMic) setSelectedAudioInputState(savedMic);
      if (savedSpeaker) setSelectedAudioOutputState(savedSpeaker);
    }
  }, []);

  const setSelectedAudioInput = React.useCallback((id: string) => {
    setSelectedAudioInputState(id);
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem('qms_preferred_mic', id);
    }
  }, []);

  const setSelectedVideoInput = React.useCallback((id: string) => {
    setSelectedVideoInputState(id);
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem('qms_preferred_camera', id);
    }
  }, []);

  const setSelectedAudioOutput = React.useCallback((id: string) => {
    setSelectedAudioOutputState(id);
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem('qms_preferred_speaker', id);
    }
  }, []);

  const refreshDevices = React.useCallback(async () => {
    const inv = await enumerateMediaDevices();
    setDevices(inv);

    const savedCam = typeof window !== 'undefined' ? localStorage.getItem('qms_preferred_camera') : null;
    const savedMic = typeof window !== 'undefined' ? localStorage.getItem('qms_preferred_mic') : null;
    const savedSpeaker = typeof window !== 'undefined' ? localStorage.getItem('qms_preferred_speaker') : null;

    if (inv.audioInputs.length > 0) {
      const match = savedMic && inv.audioInputs.some((d) => d.deviceId === savedMic);
      if (match) {
        setSelectedAudioInputState(savedMic!);
      } else if (!selectedAudioInput || !inv.audioInputs.some((d) => d.deviceId === selectedAudioInput)) {
        setSelectedAudioInputState(inv.audioInputs[0].deviceId);
      }
    }

    if (inv.videoInputs.length > 0) {
      const match = savedCam && inv.videoInputs.some((d) => d.deviceId === savedCam);
      if (match) {
        setSelectedVideoInputState(savedCam!);
      } else if (!selectedVideoInput || !inv.videoInputs.some((d) => d.deviceId === selectedVideoInput)) {
        setSelectedVideoInputState(inv.videoInputs[0].deviceId);
      }
    }

    if (inv.audioOutputs.length > 0) {
      const match = savedSpeaker && inv.audioOutputs.some((d) => d.deviceId === savedSpeaker);
      if (match) {
        setSelectedAudioOutputState(savedSpeaker!);
      } else if (!selectedAudioOutput || !inv.audioOutputs.some((d) => d.deviceId === selectedAudioOutput)) {
        setSelectedAudioOutputState(inv.audioOutputs[0].deviceId);
      }
    }

    const perms = await checkMediaPermissions();
    setPermissionState(perms);
    setHasScreenShareSupport(isScreenShareSupported());
  }, [selectedAudioInput, selectedVideoInput, selectedAudioOutput]);

  const requestPermissions = React.useCallback(
    async (constraints: MediaStreamConstraints = { video: true, audio: true }) => {
      const success = await requestMediaPermissions(constraints);
      await refreshDevices();
      return success;
    },
    [refreshDevices]
  );

  React.useEffect(() => {
    refreshDevices();

    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, [refreshDevices]);

  return {
    devices,
    selectedAudioInput,
    setSelectedAudioInput,
    selectedVideoInput,
    setSelectedVideoInput,
    selectedAudioOutput,
    setSelectedAudioOutput,
    hasScreenShareSupport,
    permissionState,
    refreshDevices,
    requestPermissions,
  };
}
