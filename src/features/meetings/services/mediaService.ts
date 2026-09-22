/**
 * Quartzite Management System (QMS)
 * Browser Media Devices Service
 */

export interface AvailableMediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface MediaDeviceInventory {
  audioInputs: AvailableMediaDevice[];
  audioOutputs: AvailableMediaDevice[];
  videoInputs: AvailableMediaDevice[];
}

export async function requestMediaPermissions(
  constraints: MediaStreamConstraints = { video: true, audio: true }
): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err) {
    console.warn('Could not acquire full media permissions:', err);
    // Fallback: try audio-only then video-only if combined request was rejected
    try {
      if (constraints.audio) {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        aStream.getTracks().forEach((t) => t.stop());
      }
    } catch {}
    try {
      if (constraints.video) {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
        vStream.getTracks().forEach((t) => t.stop());
      }
    } catch {}
    return false;
  }
}

export async function enumerateMediaDevices(): Promise<MediaDeviceInventory> {
  if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return { audioInputs: [], audioOutputs: [], videoInputs: [] };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inventory: MediaDeviceInventory = {
      audioInputs: [],
      audioOutputs: [],
      videoInputs: [],
    };

    let camIndex = 1;
    let micIndex = 1;
    let speakerIndex = 1;

    devices.forEach((device) => {
      let defaultLabel = '';
      if (device.kind === 'videoinput') {
        defaultLabel = `Camera ${camIndex++}`;
      } else if (device.kind === 'audioinput') {
        defaultLabel = `Microphone ${micIndex++}`;
      } else if (device.kind === 'audiooutput') {
        defaultLabel = `Speaker ${speakerIndex++}`;
      }

      const item: AvailableMediaDevice = {
        deviceId: device.deviceId,
        label: device.label || defaultLabel,
        kind: device.kind,
      };

      if (device.kind === 'audioinput') {
        inventory.audioInputs.push(item);
      } else if (device.kind === 'audiooutput') {
        inventory.audioOutputs.push(item);
      } else if (device.kind === 'videoinput') {
        inventory.videoInputs.push(item);
      }
    });

    return inventory;
  } catch (err) {
    console.warn('Unable to enumerate media devices:', err);
    return { audioInputs: [], audioOutputs: [], videoInputs: [] };
  }
}

export function isScreenShareSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function')
  );
}

export async function checkMediaPermissions(): Promise<{
  camera: PermissionState | 'unknown';
  microphone: PermissionState | 'unknown';
}> {
  if (typeof window === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
    return { camera: 'unknown', microphone: 'unknown' };
  }

  try {
    const [camPermission, micPermission] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigator.permissions.query({ name: 'camera' as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigator.permissions.query({ name: 'microphone' as any }),
    ]);

    return {
      camera: camPermission.status === 'fulfilled' ? camPermission.value.state : 'unknown',
      microphone: micPermission.status === 'fulfilled' ? micPermission.value.state : 'unknown',
    };
  } catch {
    return { camera: 'unknown', microphone: 'unknown' };
  }
}
