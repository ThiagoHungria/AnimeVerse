"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import { useHistoryStore } from "@/store/history.store";
import { useHydrated } from "@/hooks/useHydrated";
import { progressPercent } from "@/utils/format";
import { HorizontalCarousel, CarouselItem } from "@/components/HorizontalCarousel";
import { EpisodeProgress } from "@/components/EpisodeProgress";
import { useDominantColor } from "@/hooks/useDominantColor";

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
    <HorizontalCarousel title="Continuar assistindo" eyebrow="De onde parou">
      {inProgress.map((entry) => (
        <CarouselItem key={`${entry.animeId}-${entry.episodeId}`} className="w-64 shrink-0 snap-start sm:w-72">
          <ContinueCard entry={entry} />
        </CarouselItem>
      ))}
    </HorizontalCarousel>
  );
}

function ContinueCard({
  entry,
}: {
  entry: {
    animeId: string;
    episodeId: string;
    animeTitle: string;
    animeImage: string;
    episodeNumber: number;
    progress: number;
    duration: number;
  };
}) {
  const palette = useDominantColor(entry.animeImage, entry.animeId);
  const percent = progressPercent(entry.progress, entry.duration);

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
      <Link
        href={`/watch/${entry.animeId}/${entry.episodeId}`}
        className="group relative block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-white/15"
        style={{ boxShadow: `0 8px 24px -8px ${palette.primary}30` }}
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
            <span
              className="flex size-12 items-center justify-center rounded-full"
              style={{ background: palette.gradient }}
            >
              <Play className="size-5 fill-white text-white" />
            </span>
          </div>
        </div>
        <div className="p-3">
          <h3 className="line-clamp-1 text-sm font-semibold">{entry.animeTitle}</h3>
          <EpisodeProgress
            percent={percent}
            episodeNumber={entry.episodeNumber}
            accentColor={palette.primary}
            className="mt-2"
          />
        </div>
      </Link>
    </motion.div>
  );
}
