'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { MediaDeviceInventory } from '../../services/mediaService';
import {
  Camera,
  Mic,
  Volume2,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
} from 'lucide-react';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: MediaDeviceInventory;
  selectedCamera: string;
  selectedMicrophone: string;
  selectedSpeaker: string;
  onSelectCamera: (deviceId: string) => void;
  onSelectMicrophone: (deviceId: string) => void;
  onSelectSpeaker: (deviceId: string) => void;
  onRequestPermissions?: (constraints?: MediaStreamConstraints) => Promise<boolean>;
  onRefreshDevices?: () => Promise<void>;
  permissionState?: {
    camera: PermissionState | 'unknown';
    microphone: PermissionState | 'unknown';
  };
}

export function DeviceSettingsModal({
  isOpen,
  onClose,
  devices,
  selectedCamera,
  selectedMicrophone,
  selectedSpeaker,
  onSelectCamera,
  onSelectMicrophone,
  onSelectSpeaker,
  onRequestPermissions,
  onRefreshDevices,
  permissionState,
}: DeviceSettingsModalProps) {
  const videoPreviewRef = React.useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = React.useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  // Microphone audio meter state
  const [audioLevel, setAudioLevel] = React.useState(0);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const animFrameRef = React.useRef<number | null>(null);

  // Mic test record & playback state
  const [isRecordingTest, setIsRecordingTest] = React.useState(false);
  const [recordCountdown, setRecordCountdown] = React.useState(0);
  const [isPlayingTestAudio, setIsPlayingTestAudio] = React.useState(false);
  const [testAudioStatus, setTestAudioStatus] = React.useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);

  // Speaker chime test state
  const [isPlayingSpeakerTone, setIsPlayingSpeakerTone] = React.useState(false);

  // Permission requesting state
  const [isRequestingPerms, setIsRequestingPerms] = React.useState(false);

  const hasGenericLabels = React.useMemo(() => {
    const checkGeneric = (label: string) =>
      !label ||
      label.includes('videoinput ()') ||
      label.includes('audioinput ()') ||
      label.includes('audiooutput ()') ||
      /^Camera \d+$/.test(label) ||
      /^Microphone \d+$/.test(label);

    return (
      devices.videoInputs.some((d) => checkGeneric(d.label)) ||
      devices.audioInputs.some((d) => checkGeneric(d.label))
    );
  }, [devices]);

  // 1. Auto-request permissions on modal open if labels are still masked
  React.useEffect(() => {
    if (!isOpen) return;

    if (hasGenericLabels && onRequestPermissions) {
      onRequestPermissions().catch(() => {});
    }
  }, [isOpen, hasGenericLabels, onRequestPermissions]);

  // 2. Camera Live Preview with safe fallback
  React.useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsCameraActive(false);
    setCameraError(null);

    async function startCamera() {
      try {
        if (previewStreamRef.current) {
          previewStreamRef.current.getTracks().forEach((t) => t.stop());
          previewStreamRef.current = null;
        }

        // Use ideal constraint rather than exact so it gracefully falls back without throwing OverconstrainedError
        const constraints: MediaStreamConstraints = {
          video: selectedCamera
            ? { deviceId: { ideal: selectedCamera } }
            : true,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // If ideal device failed (e.g. mobile webcam disconnected), fallback to any camera
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        previewStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.muted = true;
          videoPreviewRef.current.defaultMuted = true;
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(() => {});
        }
        setIsCameraActive(true);
      } catch (err) {
        if (isMounted) {
          console.warn('Camera preview failed:', err);
          setCameraError('Camera unavailable or permission denied.');
          setIsCameraActive(false);
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.pause();
        videoPreviewRef.current.srcObject = null;
      }
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
        previewStreamRef.current = null;
      }
      setIsCameraActive(false);
    };
  }, [isOpen, selectedCamera]);

  // 3. Microphone Live Audio Meter
  React.useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function startMicMeter() {
      try {
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }
        if (audioContextRef.current) {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
          }
          audioContextRef.current = null;
        }
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }

        const micConstraints: MediaStreamConstraints = {
          audio: selectedMicrophone
            ? { deviceId: { ideal: selectedMicrophone } }
            : true,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(micConstraints);
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        micStreamRef.current = stream;

        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextClass) return;

        // Use sinkId: { type: 'none' } so Chromium/Opera GX routes the audio graph to a silent null sink
        // and does NOT show the speaker icon on the browser tab when analyzing microphone levels.
        let audioCtx: AudioContext;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          audioCtx = new AudioContextClass({ sinkId: { type: 'none' } } as any);
        } catch {
          audioCtx = new AudioContextClass();
        }
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateMeter = () => {
          if (!isMounted) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          // Scale from 0-255 with perceptual sensitivity curve
          const scaled = Math.min(100, Math.round((average / 110) * 100));
          setAudioLevel(scaled);

          animFrameRef.current = requestAnimationFrame(updateMeter);
        };

        animFrameRef.current = requestAnimationFrame(updateMeter);
      } catch (err) {
        console.warn('Microphone audio meter error:', err);
      }
    }

    startMicMeter();

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        audioContextRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      setAudioLevel(0);
    };
  }, [isOpen, selectedMicrophone]);

  // 4. Test Microphone: Record 3 Seconds and Playback
  const handleTestMicRecording = async () => {
    if (isRecordingTest || isPlayingTestAudio) return;

    try {
      const stream =
        micStreamRef.current ||
        (await navigator.mediaDevices.getUserMedia({
          audio: selectedMicrophone ? { deviceId: { ideal: selectedMicrophone } } : true,
        }));

      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        setIsPlayingTestAudio(true);
        setTestAudioStatus('Playing back your audio...');

        const cleanupTestAudio = () => {
          try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
          } catch {}
          URL.revokeObjectURL(audioUrl);
          setIsPlayingTestAudio(false);
        };

        audio.onended = () => {
          cleanupTestAudio();
          setTestAudioStatus('Mic verified! You sound clear.');
          setTimeout(() => setTestAudioStatus(null), 4000);
        };

        audio.onerror = () => {
          cleanupTestAudio();
          setTestAudioStatus('Could not play back audio.');
          setTimeout(() => setTestAudioStatus(null), 3000);
        };

        audio.play().catch((err) => {
          console.warn('Audio playback error:', err);
          cleanupTestAudio();
          setTestAudioStatus(null);
        });
      };

      setIsRecordingTest(true);
      setTestAudioStatus('Speak now... recording test sample');
      setRecordCountdown(3);
      mediaRecorder.start();

      let timeLeft = 3;
      const interval = setInterval(() => {
        timeLeft -= 1;
        setRecordCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(interval);
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          setIsRecordingTest(false);
        }
      }, 1000);
    } catch (err) {
      console.warn('Mic test recording error:', err);
      setTestAudioStatus('Could not record mic test.');
      setIsRecordingTest(false);
    }
  };

  // 5. Test Speaker: Synthesize Pleasant Two-Tone Chime
  const handleTestSpeaker = async () => {
    if (isPlayingSpeakerTone) return;
    setIsPlayingSpeakerTone(true);

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      const ctx = new AudioContextClass();

      // Two harmonic chime tones: C5 (523.25 Hz) and G5 (783.99 Hz)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.2);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(783.99, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.85);
      osc2.stop(now + 0.85);

      setTimeout(() => {
        setIsPlayingSpeakerTone(false);
        if (ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      }, 900);
    } catch (err) {
      console.warn('Speaker test error:', err);
      setIsPlayingSpeakerTone(false);
    }
  };

  // Explicit permission prompt click
  const handleGrantPermissions = async () => {
    setIsRequestingPerms(true);
    try {
      if (onRequestPermissions) {
        await onRequestPermissions();
      }
      if (onRefreshDevices) {
        await onRefreshDevices();
      }
    } finally {
      setIsRequestingPerms(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Audio & Video Settings"
      description="Configure your camera, microphone, and output devices"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Permission Request Prompt if labels are hidden */}
        {hasGenericLabels && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="font-medium text-amber-100">
                Device names are currently hidden by browser security.
              </p>
              <p className="text-amber-200/80">
                Grant permission so QMS can display your real webcam and microphone models instead of generic identifiers.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGrantPermissions}
                disabled={isRequestingPerms}
                className="border-amber-400/40 text-amber-200 hover:bg-amber-400/20 text-xs py-1 h-7 gap-1.5"
              >
                <Sparkles className="h-3 w-3" />
                {isRequestingPerms ? 'Requesting...' : 'Allow Permissions & Show Devices'}
              </Button>
            </div>
          </div>
        )}

        {/* Live Camera Test Box */}
        <div className="relative aspect-video w-full rounded-xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
              isCameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <Camera className="h-8 w-8 text-slate-600 mb-2 animate-pulse" />
              <p className="text-xs font-medium text-slate-400">
                {cameraError || 'Initializing camera preview...'}
              </p>
              {cameraError && (
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Make sure your camera is connected and not in use by another app (Zoom, Teams, or Windows Phone Link).
                </p>
              )}
            </div>
          )}

          {isCameraActive && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Preview Active
            </div>
          )}
        </div>

        {/* Camera Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Camera className="h-3.5 w-3.5 text-emerald-500" />
              <span>Camera</span>
            </div>
            {onRefreshDevices && (
              <button
                type="button"
                onClick={() => onRefreshDevices()}
                className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                title="Refresh device list"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Refresh
              </button>
            )}
          </div>

          <Select
            value={selectedCamera}
            onChange={(e) => onSelectCamera(e.target.value)}
          >
            {devices.videoInputs.map((d, i) => (
              <option key={d.deviceId || `cam-${i}`} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </Select>

          {/* Windows Phone Link / Mobile camera tip */}
          <div className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-0.5">
            <Info className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Phone showing up as camera? In Windows 11, disable &quot;Use as connected camera&quot; under <b>Settings &gt; Bluetooth &amp; devices &gt; Mobile devices</b> to default back to your integrated webcam.
            </span>
          </div>
        </div>

        {/* Microphone Selector & Audio Meter */}
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Mic className="h-3.5 w-3.5 text-emerald-500" />
              <span>Microphone</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestMicRecording}
                disabled={isRecordingTest || isPlayingTestAudio}
                className="text-xs h-7 py-0 px-2.5 gap-1 border-slate-700 text-slate-300 hover:text-emerald-400"
              >
                {isRecordingTest ? (
                  <>
                    <Square className="h-3 w-3 text-rose-400 fill-rose-400 animate-pulse" />
                    Recording ({recordCountdown}s)...
                  </>
                ) : isPlayingTestAudio ? (
                  <>
                    <Volume2 className="h-3 w-3 text-emerald-400 animate-bounce" />
                    Playing Test...
                  </>
                ) : (
                  <>
                    <Mic className="h-3 w-3 text-emerald-400" />
                    Test Mic (3s)
                  </>
                )}
              </Button>
            </div>
          </div>

          <Select
            value={selectedMicrophone}
            onChange={(e) => onSelectMicrophone(e.target.value)}
          >
            {devices.audioInputs.map((d, i) => (
              <option key={d.deviceId || `mic-${i}`} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </Select>

          {/* Real-time visual audio level bar */}
          <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Microphone Input Level</span>
              <span className={`font-mono font-medium ${audioLevel > 15 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {audioLevel > 5 ? 'Detecting sound' : 'Speak to test'}
              </span>
            </div>

            {/* 12-Segment LED Meter */}
            <div className="grid grid-cols-12 gap-1 h-2 w-full">
              {Array.from({ length: 12 }).map((_, idx) => {
                const threshold = (idx + 1) * 8.33;
                const isLit = audioLevel >= threshold;
                const isHigh = idx >= 9;
                const isMid = idx >= 6 && idx < 9;

                return (
                  <div
                    key={idx}
                    className={`h-full rounded-sm transition-colors duration-75 ${
                      isLit
                        ? isHigh
                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                          : isMid
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                          : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>

            {testAudioStatus && (
              <p className="text-[11px] text-emerald-400 font-medium pt-0.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {testAudioStatus}
              </p>
            )}
          </div>
        </div>

        {/* Speaker Output Selector & Test */}
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Speakers / Output</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSpeaker}
              disabled={isPlayingSpeakerTone}
              className="text-xs h-7 py-0 px-2.5 gap-1 border-slate-700 text-slate-300 hover:text-emerald-400"
            >
              <Play className={`h-3 w-3 text-emerald-400 ${isPlayingSpeakerTone ? 'animate-spin' : ''}`} />
              {isPlayingSpeakerTone ? 'Playing Tone...' : 'Test Audio'}
            </Button>
          </div>

          <Select
            value={selectedSpeaker}
            onChange={(e) => onSelectSpeaker(e.target.value)}
          >
            {devices.audioOutputs.length > 0 ? (
              devices.audioOutputs.map((d, i) => (
                <option key={d.deviceId || `out-${i}`} value={d.deviceId}>
                  {d.label}
                </option>
              ))
            ) : (
              <option value="">Default System Output</option>
            )}
          </Select>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Selected devices are saved automatically
          </span>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
