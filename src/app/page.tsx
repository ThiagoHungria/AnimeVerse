"use client";

import { CinematicHero } from "@/features/anime/components/CinematicHero";
import { AnimatedSection } from "@/features/anime/components/AnimatedSection";
import {
  useFeatured,
  useTrending,
  usePopular,
  useTopRated,
  useSeasonNow,
} from "@/features/anime/hooks/useAnimeQueries";
import { HeroCinematicSkeleton } from "@/components/ui/CinematicSkeleton";
import { ContinueWatchingRow } from "@/features/profile/components/ContinueWatchingRow";
import { RecommendedRow } from "@/features/recommendations/components/RecommendedRow";
import { TasteBasedRow } from "@/features/recommendations/components/TasteBasedRow";
import { HiddenGemsRow } from "@/features/recommendations/components/HiddenGemsRow";
import { useSmartFeeds } from "@/features/recommendations/hooks/useSmartFeeds";
import { RecommendationSection } from "@/components/RecommendationSection";
import { HorizontalCarousel, CarouselItem } from "@/components/HorizontalCarousel";
import { AnimeHero } from "@/components/AnimeHero";
import { AnimeCardPremium } from "@/components/AnimeCardPremium";
import { RankingCard } from "@/components/RankingCard";
import { CarouselSkeleton } from "@/components/ui/LoadingSkeleton";

export default function HomePage() {
  const { data: featured, isLoading: loadingFeatured } = useFeatured();
  const trending = useTrending();
  const popular = usePopular();
  const topRated = useTopRated();
  const season = useSeasonNow();
  const { feeds, isLoading: loadingFeeds } = useSmartFeeds();

  const launches = season.data?.slice(0, 3) ?? [];

  return (
    <div className="pb-24 lg:pb-12">
      {loadingFeatured || !featured ? (
        <HeroCinematicSkeleton />
      ) : (
        <CinematicHero anime={featured} />
      )}

      <div className="mt-10 space-y-12">
        <AnimatedSection>
          <ContinueWatchingRow />
        </AnimatedSection>

        {launches.length > 0 && (
          <HorizontalCarousel title="Lançamentos" eyebrow="Temporada atual">
            {launches.map((anime) => (
              <CarouselItem key={anime.id} className="w-[85vw] shrink-0 snap-start sm:w-[420px] md:w-[480px]">
                <AnimeHero anime={anime} />
              </CarouselItem>
            ))}
          </HorizontalCarousel>
        )}

        <RecommendedRow />
        <TasteBasedRow />

        {feeds.map((feed) => (
          <RecommendationSection
            key={feed.id}
            title={feed.title}
            eyebrow={feed.eyebrow}
            animes={feed.animes}
            loading={loadingFeeds}
          />
        ))}

        <RecommendationSection
          title="Trending agora"
          eyebrow="Em alta no mundo"
          animes={trending.data ?? []}
          loading={trending.isLoading}
        />

        {trending.data && trending.data.length > 0 && (
          <section className="px-4 md:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--anime-accent,var(--color-primary))]">
              Top 5
            </p>
            <h2 className="mb-4 text-xl font-black md:text-2xl">Ranking ao vivo</h2>
            <div className="space-y-2">
              {trending.data.slice(0, 5).map((anime, i) => (
                <RankingCard key={anime.id} anime={anime} rank={i + 1} />
              ))}
            </div>
          </section>
        )}

        <RecommendationSection
          title="Mais populares"
          eyebrow="Favoritos do público"
          animes={popular.data ?? []}
          loading={popular.isLoading}
        />

        <RecommendationSection
          title="Mais bem avaliados"
          eyebrow="Nota máxima MAL"
          animes={topRated.data ?? []}
          loading={topRated.isLoading}
        />

        <HiddenGemsRow />

        {season.isLoading ? (
          <div className="px-4 md:px-8">
            <CarouselSkeleton />
          </div>
        ) : (
          <HorizontalCarousel title="Descubra mais" eyebrow="Catálogo vivo">
            {season.data?.slice(0, 12).map((anime) => (
              <CarouselItem key={anime.id}>
                <AnimeCardPremium anime={anime} />
              </CarouselItem>
            ))}
          </HorizontalCarousel>
        )}
      </div>
    </div>
  );
}
