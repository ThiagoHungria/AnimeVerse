"use client";

import { HeroSection } from "@/features/anime/components/HeroSection";
import { AnimeCarousel } from "@/features/anime/components/AnimeCarousel";
import {
  useFeatured,
  useTrending,
  usePopular,
  useTopRated,
  useSeasonNow,
} from "@/features/anime/hooks/useAnimeQueries";
import {
  HeroSkeleton,
  CarouselSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { ContinueWatchingRow } from "@/features/profile/components/ContinueWatchingRow";
import { RecommendedRow } from "@/features/recommendations/components/RecommendedRow";
import { HiddenGemsRow } from "@/features/recommendations/components/HiddenGemsRow";
import type { AnimeSummary } from "@/types";

export default function HomePage() {
  const { data: featured, isLoading: loadingFeatured } = useFeatured();
  const trending = useTrending();
  const popular = usePopular();
  const topRated = useTopRated();
  const season = useSeasonNow();

  return (
    <div className="pb-16">
      {loadingFeatured || !featured ? (
        <HeroSkeleton />
      ) : (
        <HeroSection anime={featured} />
      )}

      <div className="mt-10 space-y-10">
        <ContinueWatchingRow />
        <RecommendedRow />

        <Row
          title="Em alta agora"
          eyebrow="Trending"
          loading={trending.isLoading}
          animes={trending.data}
        />
        <Row
          title="Mais populares"
          eyebrow="Favoritos do público"
          loading={popular.isLoading}
          animes={popular.data}
        />
        <Row
          title="Mais bem avaliados"
          eyebrow="Nota máxima"
          loading={topRated.isLoading}
          animes={topRated.data}
        />
        <HiddenGemsRow />
        <Row
          title="Temporada atual"
          eyebrow="No ar"
          loading={season.isLoading}
          animes={season.data}
        />
      </div>
    </div>
  );
}

function Row({
  title,
  eyebrow,
  loading,
  animes,
}: {
  title: string;
  eyebrow: string;
  loading: boolean;
  animes?: AnimeSummary[];
}) {
  if (loading) {
    return (
      <div className="space-y-3 px-4 md:px-8">
        <div className="bg-card h-6 w-44 animate-pulse rounded" />
        <CarouselSkeleton />
      </div>
    );
  }
  if (!animes || animes.length === 0) return null;
  return <AnimeCarousel title={title} eyebrow={eyebrow} animes={animes} />;
}
