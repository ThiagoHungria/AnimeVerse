"use client";

import { Gem } from "lucide-react";
import { AnimeCarousel } from "@/features/anime/components/AnimeCarousel";
import { CarouselSkeleton } from "@/components/ui/LoadingSkeleton";
import { useHiddenGems } from "@/features/recommendations/hooks/useRecommendations";

/** "Joias escondidas": high score + low popularity, surfaced by the engine. */
export function HiddenGemsRow() {
  const { hiddenGems, isLoading } = useHiddenGems();

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Gem className="text-primary size-4" />
          <div className="bg-card h-6 w-40 animate-pulse rounded" />
        </div>
        <CarouselSkeleton />
      </div>
    );
  }

  if (hiddenGems.length === 0) return null;

  return (
    <AnimeCarousel
      title="Hidden gems"
      eyebrow="Joias escondidas · nota alta"
      animes={hiddenGems}
    />
  );
}
