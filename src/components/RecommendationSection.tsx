"use client";

import type { AnimeSummary } from "@/types";
import { HorizontalCarousel, CarouselItem } from "@/components/HorizontalCarousel";
import { AnimeCardPremium } from "@/components/AnimeCardPremium";
import { CarouselSkeleton } from "@/components/ui/LoadingSkeleton";

interface RecommendationSectionProps {
  id?: string;
  title: string;
  eyebrow?: string;
  animes: AnimeSummary[];
  loading?: boolean;
}

/** Smart recommendation row with premium cards. */
export function RecommendationSection({
  title,
  eyebrow,
  animes,
  loading,
}: RecommendationSectionProps) {
  if (loading) {
    return (
      <div className="space-y-3 px-4 md:px-8">
        <div className="bg-card h-7 w-48 animate-pulse rounded" />
        <CarouselSkeleton />
      </div>
    );
  }

  if (animes.length === 0) return null;

  return (
    <HorizontalCarousel title={title} eyebrow={eyebrow}>
      {animes.map((anime) => (
        <CarouselItem key={anime.id}>
          <AnimeCardPremium anime={anime} />
        </CarouselItem>
      ))}
    </HorizontalCarousel>
  );
}
