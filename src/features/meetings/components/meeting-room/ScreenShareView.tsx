'use client';

import * as React from 'react';
import { Monitor, Maximize2, Minimize2, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScreenShareViewProps {
  screenTrack: MediaStreamTrack;
  presenterName: string;
  isLocal: boolean;
  onStopSharing?: () => void;
}

export function ScreenShareView({
  screenTrack,
  presenterName,
  isLocal,
  onStopSharing,
}: ScreenShareViewProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      if (screenTrack) {
        const stream = new MediaStream([screenTrack]);
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [screenTrack]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl"
    >
      {/* Real Screen Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={true}
        className="w-full h-full object-contain"
      />

      {/* Top Banner Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 rounded-lg bg-slate-900/80 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white shadow">
          <Monitor className="h-4 w-4 text-emerald-400" />
          <span>
            {isLocal ? 'You are sharing your screen' : `${presenterName}'s screen`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isLocal && onStopSharing && (
            <Button
              variant="danger"
              size="sm"
              onClick={onStopSharing}
              className="gap-1.5 text-xs shadow-md"
            >
              <StopCircle className="h-3.5 w-3.5" />
              Stop Sharing
            </Button>
          )}

          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="rounded-lg bg-slate-900/80 backdrop-blur-md p-2 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
