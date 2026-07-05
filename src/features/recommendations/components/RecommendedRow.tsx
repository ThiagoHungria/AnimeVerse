"use client";

import { Wand2 } from "lucide-react";
import { AnimeCarousel } from "@/features/anime/components/AnimeCarousel";
import { CarouselSkeleton } from "@/components/ui/LoadingSkeleton";
import { useRecommended } from "@/features/recommendations/hooks/useRecommendations";

/** "Recomendado para você" — personalized via the intelligence layer. */
export function RecommendedRow() {
  const { recommendations, isLoading, personalized } = useRecommended();

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Wand2 className="text-primary size-4" />
          <div className="bg-card h-6 w-52 animate-pulse rounded" />
        </div>
        <CarouselSkeleton />
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <AnimeCarousel
      title="Recomendado para você"
      eyebrow={personalized ? "Curadoria inteligente" : "Comece a explorar"}
      animes={recommendations}
    />
  );
}
