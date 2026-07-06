"use client";

import { CinematicHero } from "@/features/anime/components/CinematicHero";
import { AnimeCarousel } from "@/features/anime/components/AnimeCarousel";
import { AnimatedSection } from "@/features/anime/components/AnimatedSection";
import {
  useFeatured,
  useTrending,
  usePopular,
  useTopRated,
  useSeasonNow,
} from "@/features/anime/hooks/useAnimeQueries";
import { HeroCinematicSkeleton } from "@/components/ui/CinematicSkeleton";
import { CarouselSkeleton } from "@/components/ui/LoadingSkeleton";
import { ContinueWatchingRow } from "@/features/profile/components/ContinueWatchingRow";
import { RecommendedRow } from "@/features/recommendations/components/RecommendedRow";
import { TasteBasedRow } from "@/features/recommendations/components/TasteBasedRow";
import { HiddenGemsRow } from "@/features/recommendations/components/HiddenGemsRow";
import type { AnimeSummary } from "@/types";

export default function HomePage() {
  const { data: featured, isLoading: loadingFeatured } = useFeatured();
  const trending = useTrending();
  const popular = usePopular();
  const topRated = useTopRated();
  const season = useSeasonNow();

  return (
    <div className="pb-20">
      {loadingFeatured || !featured ? (
        <HeroCinematicSkeleton />
      ) : (
        <CinematicHero anime={featured} />
      )}

      <div className="mt-12 space-y-12">
        <AnimatedSection>
          <ContinueWatchingRow />
        </AnimatedSection>

        <RecommendedRow />
        <TasteBasedRow />

        <FeedRow
          title="Trending agora"
          eyebrow="Em alta no mundo"
          loading={trending.isLoading}
          animes={trending.data}
        />
        <FeedRow
          title="Mais populares"
          eyebrow="Favoritos do público"
          loading={popular.isLoading}
          animes={popular.data}
        />
        <FeedRow
          title="Mais bem avaliados"
          eyebrow="Nota máxima MAL"
          loading={topRated.isLoading}
          animes={topRated.data}
        />
        <HiddenGemsRow />
        <FeedRow
          title="Temporada atual"
          eyebrow="No ar agora"
          loading={season.isLoading}
          animes={season.data}
        />
      </div>
    </div>
  );
}

function FeedRow({
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
        <div className="bg-card h-7 w-48 animate-pulse rounded" />
        <CarouselSkeleton />
      </div>
    );
  }
  if (!animes || animes.length === 0) return null;
  return <AnimeCarousel title={title} eyebrow={eyebrow} animes={animes} />;
}
