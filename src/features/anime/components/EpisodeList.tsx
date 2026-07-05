"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Check } from "lucide-react";
import type { Episode } from "@/types";
import { useHistoryStore } from "@/store/history.store";
import { useHydrated } from "@/hooks/useHydrated";
import { progressPercent } from "@/utils/format";
import { cn } from "@/utils/cn";

interface EpisodeListProps {
  animeId: string;
  episodes: Episode[];
  currentEpisodeId?: string;
  /** "list" is the compact watch-page sidebar; "grid" is the details page. */
  variant?: "list" | "grid";
}

export function EpisodeList({
  animeId,
  episodes,
  currentEpisodeId,
  variant = "grid",
}: EpisodeListProps) {
  const hydrated = useHydrated();
  const entries = useHistoryStore((s) => s.entries);

  const getProgress = (episodeId: string) => {
    if (!hydrated) return null;
    const entry = entries.find(
      (e) => e.animeId === animeId && e.episodeId === episodeId,
    );
    if (!entry) return null;
    return {
      percent: progressPercent(entry.progress, entry.duration),
      watched: progressPercent(entry.progress, entry.duration) >= 90,
    };
  };

  return (
    <ul
      className={cn(
        variant === "grid"
          ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          : "flex flex-col gap-2",
      )}
    >
      {episodes.map((episode) => {
        const isCurrent = episode.id === currentEpisodeId;
        const progress = getProgress(episode.id);

        return (
          <li key={episode.id}>
            <Link
              href={`/watch/${animeId}/${episode.id}`}
              aria-current={isCurrent ? "true" : undefined}
              className={cn(
                "group relative flex gap-3 overflow-hidden rounded-xl border p-2 transition-all",
                isCurrent
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-card hover:border-border-strong hover:bg-card-hover",
              )}
            >
              <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg sm:w-32">
                <Image
                  src={episode.thumbnail}
                  alt={`Episódio ${episode.number}`}
                  fill
                  sizes="128px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Play className="size-6 fill-white text-white" />
                </div>
                {progress && progress.percent > 0 && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
                    <div
                      className="bg-brand-gradient h-full"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-primary text-xs font-bold">
                    EP {episode.number}
                  </span>
                  {progress?.watched && (
                    <span className="text-success inline-flex items-center gap-0.5 text-[10px] font-semibold">
                      <Check className="size-3" /> Assistido
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-primary text-[10px] font-semibold">
                      • Assistindo
                    </span>
                  )}
                </div>
                <p className="line-clamp-1 text-sm font-medium">
                  {episode.title}
                </p>
                {progress && !progress.watched && progress.percent > 0 && (
                  <p className="text-muted mt-0.5 text-[11px]">
                    Continuar · {progress.percent}%
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
