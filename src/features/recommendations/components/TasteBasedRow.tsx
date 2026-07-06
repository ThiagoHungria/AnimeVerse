"use client";

import { Heart } from "lucide-react";
import { AnimeCarousel } from "@/features/anime/components/AnimeCarousel";
import { CarouselSkeleton } from "@/components/ui/LoadingSkeleton";
import { useTasteBased } from "@/features/recommendations/hooks/useRecommendations";

/** "Baseado no seu gosto" — strict affinity recommendations. */
export function TasteBasedRow() {
  const { recommendations, isLoading, hasTaste } = useTasteBased();

  if (!hasTaste) return null;

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Heart className="text-primary size-4" />
          <div className="bg-card h-6 w-52 animate-pulse rounded" />
        </div>
        <CarouselSkeleton />
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <AnimeCarousel
      title="Baseado no seu gosto"
      eyebrow="Afinidade máxima"
      animes={recommendations}
    />
  );
}
