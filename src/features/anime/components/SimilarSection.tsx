"use client";

import { Sparkles } from "lucide-react";
import { AnimeCard } from "./AnimeCard";
import { AnimeCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { useSimilar } from "@/features/anime/hooks/useAnimeQueries";

/** "Animes parecidos" powered by the similar engine / MAL recommendations. */
export function SimilarSection({ animeId }: { animeId: string }) {
  const { data, isLoading } = useSimilar(animeId);

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Sparkles className="text-primary size-5" /> Animes parecidos
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {data!.slice(0, 12).map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </section>
  );
}
