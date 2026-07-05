"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, History } from "lucide-react";
import { useHistoryStore } from "@/store/history.store";
import { useHydrated } from "@/hooks/useHydrated";
import { progressPercent } from "@/utils/format";

/** "Continue assistindo" carousel sourced from the LocalStorage history. */
export function ContinueWatchingRow() {
  const hydrated = useHydrated();
  const entries = useHistoryStore((s) => s.entries);

  // Only show in-progress (not finished) episodes, newest first.
  const inProgress = entries
    .filter((e) => progressPercent(e.progress, e.duration) < 90)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12);

  if (!hydrated || inProgress.length === 0) return null;

  return (
    <section className="animate-fade-up">
      <div className="mb-3 flex items-center gap-2 px-4 md:px-8">
        <History className="text-primary size-4" />
        <h2 className="text-lg font-bold md:text-xl">Continuar assistindo</h2>
      </div>

      <div className="scrollbar-hide flex gap-4 overflow-x-auto px-4 pb-2 md:px-8">
        {inProgress.map((entry) => {
          const percent = progressPercent(entry.progress, entry.duration);
          return (
            <Link
              key={`${entry.animeId}-${entry.episodeId}`}
              href={`/watch/${entry.animeId}/${entry.episodeId}`}
              className="group relative w-60 shrink-0 overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-border-strong sm:w-72"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <Image
                  src={entry.animeImage}
                  alt={entry.animeTitle}
                  fill
                  sizes="288px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="bg-brand-gradient flex size-12 items-center justify-center rounded-full">
                    <Play className="size-5 fill-white text-white" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
                  <div
                    className="bg-brand-gradient h-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <div className="p-3">
                <h3 className="line-clamp-1 text-sm font-semibold">
                  {entry.animeTitle}
                </h3>
                <p className="text-muted mt-0.5 text-xs">
                  EP {entry.episodeNumber} · {percent}% assistido
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
