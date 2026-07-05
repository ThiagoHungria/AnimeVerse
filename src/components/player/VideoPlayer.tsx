"use client";

import { useEffect, useRef } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  /** Seconds to resume from on load. */
  startTime?: number;
  /** Called periodically with playback progress (throttled ~5s). */
  onProgress?: (currentTime: number, duration: number) => void;
  /** Called when the episode finishes (used for auto-next). */
  onEnded?: () => void;
  className?: string;
}

const isHls = (src: string) => src.includes(".m3u8");

/**
 * HTML5 video player with hls.js support.
 * - Native playback for MP4 and Safari HLS.
 * - hls.js fallback for HLS on browsers without native support.
 * - Resumes from `startTime` and reports throttled progress.
 */
export function VideoPlayer({
  src,
  poster,
  startTime = 0,
  onProgress,
  onEnded,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReported = useRef(0);

  // Attach the source (with hls.js when needed).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hls: any;

    const canPlayNativeHls = video.canPlayType(
      "application/vnd.apple.mpegurl",
    );

    if (isHls(src) && !canPlayNativeHls) {
      // Dynamically import hls.js only when an HLS stream is actually used.
      import("hls.js").then(({ default: Hls }) => {
        if (destroyed) return;
        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true });
          hls.loadSource(src);
          hls.attachMedia(video);
        } else {
          video.src = src;
        }
      });
    } else {
      video.src = src;
    }

    return () => {
      destroyed = true;
      if (hls) hls.destroy();
    };
  }, [src]);

  // Resume from the saved position once metadata is available.
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (startTime > 0 && startTime < video.duration - 5) {
      video.currentTime = startTime;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !onProgress) return;
    const now = video.currentTime;
    // Throttle persistence to roughly every 5 seconds.
    if (Math.abs(now - lastReported.current) >= 5) {
      lastReported.current = now;
      onProgress(now, video.duration || 0);
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (video && onProgress) onProgress(video.duration, video.duration);
    onEnded?.();
  };

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      playsInline
      autoPlay
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      className={className}
    >
      Seu navegador não suporta reprodução de vídeo.
    </video>
  );
}
