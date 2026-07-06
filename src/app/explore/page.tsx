"use client";

import { useState, useEffect } from "react";
import { Compass, Flame, SearchX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useGamificationStore } from "@/store/gamification.store";
import { AnimeCarousel } from "@/features/anime/components/AnimeCarousel";
import { AnimeCard } from "@/features/anime/components/AnimeCard";
import { CarouselSkeleton, GridSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecommendedRow } from "@/features/recommendations/components/RecommendedRow";
import { ExploreFilters } from "@/features/explore/components/ExploreFilters";
import { useDiscover, hasActiveFilters } from "@/features/explore/hooks/useExplore";
import { useTrending, useGenres } from "@/features/anime/hooks/useAnimeQueries";
import { useDiscoveryCollections } from "@/features/recommendations/hooks/useRecommendations";
import { staggerContainer, staggerItem, fade } from "@/utils/animation";
import type { DiscoverFilters } from "@/services/animeService";

export default function ExplorePage() {
  const [filters, setFilters] = useState<DiscoverFilters>({});
  const active = hasActiveFilters(filters);
  const recordExplore = useGamificationStore((s) => s.recordExplore);

  useEffect(() => {
    if (active) recordExplore();
  }, [active, recordExplore]);

  const { data: genres } = useGenres();
  const { data: results, isFetching } = useDiscover(filters, active);
  const trending = useTrending();
  const { collections, isLoading } = useDiscoveryCollections();

  return (
    <div className="pb-20">
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="animate-gradient-shift absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-[1600px] px-4 py-12 md:px-8 md:py-16">
          <motion.div variants={fade} initial="hidden" animate="visible">
            <p className="text-primary flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]">
              <Compass className="size-4" /> Discovery Engine
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Explore o universo anime
            </h1>
            <p className="text-muted mt-3 max-w-xl text-sm md:text-base">
              Catálogo inteligente com filtros fluidos e curadoria viva — estilo
              streaming premium.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="sticky top-16 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-8">
          <ExploreFilters
            filters={filters}
            genres={genres ?? []}
            onChange={setFilters}
            onClear={() => setFilters({})}
            active={active}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key="results"
            className="mx-auto max-w-[1600px] px-4 py-8 md:px-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {isFetching && !results ? (
              <GridSkeleton />
            ) : results && results.length > 0 ? (
              <>
                <p className="text-muted mb-5 text-sm">
                  {results.length} resultado{results.length === 1 ? "" : "s"}
                </p>
                <motion.div
                  className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {results.map((anime) => (
                    <motion.div key={anime.id} variants={staggerItem}>
                      <AnimeCard anime={anime} tilt />
                    </motion.div>
                  ))}
                </motion.div>
              </>
            ) : (
              <EmptyState
                icon={SearchX}
                title="Nenhum anime encontrado"
                description="Tente afrouxar os filtros (nota, status ou temporada)."
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="curated"
            className="mt-10 space-y-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RecommendedRow />

            {trending.isLoading ? (
              <div className="space-y-3 px-4 md:px-8">
                <Flame className="text-primary size-4" />
                <CarouselSkeleton />
              </div>
            ) : (
              trending.data &&
              trending.data.length > 0 && (
                <AnimeCarousel
                  title="Trending agora"
                  eyebrow="Em alta"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
