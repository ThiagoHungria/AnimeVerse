"use client";

import { motion } from "framer-motion";

interface EpisodeProgressProps {
  percent: number;
  episodeNumber?: number;
  label?: string;
  accentColor?: string;
  className?: string;
}

/** Progress bar for continue-watching cards. */
export function EpisodeProgress({
  percent,
  episodeNumber,
  label,
  accentColor,
  className,
}: EpisodeProgressProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={className}>
      {(episodeNumber !== undefined || label) && (
        <p className="text-muted mb-1.5 text-xs">
          {episodeNumber !== undefined && `EP ${episodeNumber}`}
          {episodeNumber !== undefined && label && " · "}
          {label ?? `${clamped}% assistido`}
        </p>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: accentColor ?? "var(--anime-gradient, var(--color-primary))",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
