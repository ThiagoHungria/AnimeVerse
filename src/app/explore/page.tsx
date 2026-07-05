"use client";

import { useState } from "react";
import { Compass, Flame, SearchX } from "lucide-react";
import { AnimeCarousel } from "@/features/anime/components/AnimeCarousel";
import { AnimeCard } from "@/features/anime/components/AnimeCard";
import { CarouselSkeleton, GridSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecommendedRow } from "@/features/recommendations/components/RecommendedRow";
import { ExploreFilters } from "@/features/explore/components/ExploreFilters";
import { useDiscover, hasActiveFilters } from "@/features/explore/hooks/useExplore";
import { useTrending, useGenres } from "@/features/anime/hooks/useAnimeQueries";
import { useDiscoveryCollections } from "@/features/recommendations/hooks/useRecommendations";
import type { DiscoverFilters } from "@/services/animeService";

export default function ExplorePage() {
  const [filters, setFilters] = useState<DiscoverFilters>({});
  const active = hasActiveFilters(filters);

  const { data: genres } = useGenres();
  const { data: results, isFetching } = useDiscover(filters, active);
  const trending = useTrending();
  const { collections, isLoading } = useDiscoveryCollections();

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-8">
          <p className="text-primary flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
            <Compass className="size-4" /> Explore inteligente
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
            Descubra seu próximo anime
          </h1>
          <p className="text-muted mt-2 max-w-xl text-sm md:text-base">
            Filtros avançados + coleções curadas automaticamente pela camada de
            inteligência do AnimeVerse.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 pt-6 md:px-8">
        <ExploreFilters
          filters={filters}
          genres={genres ?? []}
          onChange={setFilters}
          onClear={() => setFilters({})}
          active={active}
        />
      </div>

      {/* Filtered results */}
      {active ? (
        <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
          {isFetching && !results ? (
            <GridSkeleton />
          ) : results && results.length > 0 ? (
            <>
              <p className="text-muted mb-4 text-sm">
                {results.length} resultado{results.length === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {results.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="Nenhum anime encontrado"
              description="Tente afrouxar os filtros (nota, status ou temporada)."
            />
          )}
        </div>
      ) : (
        /* Curated discovery (no active filters) */
        <div className="mt-8 space-y-10">
          <RecommendedRow />

          {trending.isLoading ? (
            <div className="space-y-3 px-4 md:px-8">
              <div className="flex items-center gap-2">
                <Flame className="text-primary size-4" />
                <div className="bg-card h-6 w-40 animate-pulse rounded" />
              </div>
              <CarouselSkeleton />
            </div>
          ) : (
            trending.data &&
            trending.data.length > 0 && (
              <AnimeCarousel
                title="Em alta agora"
                eyebrow="Trending"
                animes={trending.data}
              />
            )
          )}

          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3 px-4 md:px-8">
                  <div className="bg-card h-6 w-48 animate-pulse rounded" />
                  <CarouselSkeleton />
                </div>
              ))
            : collections.map((collection) => (
                <AnimeCarousel
                  key={collection.id}
                  title={collection.title}
                  eyebrow={collection.description}
                  animes={collection.animes}
                />
              ))}
        </div>
      )}
    </div>
  );
}
