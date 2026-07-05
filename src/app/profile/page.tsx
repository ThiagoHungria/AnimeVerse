"use client";

import { useMemo } from "react";
import { UserCircle2, Sparkles, RotateCcw } from "lucide-react";
import { useProfileStore } from "@/store/profile.store";
import { useHydrated } from "@/hooks/useHydrated";
import { useGenres } from "@/features/anime/hooks/useAnimeQueries";
import { useRecommended } from "@/features/recommendations/hooks/useRecommendations";
import { AnimeCard } from "@/features/anime/components/AnimeCard";
import { GridSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { GamificationPanel } from "@/features/gamification/components/GamificationPanel";
import { cn } from "@/utils/cn";

export default function ProfilePage() {
  const hydrated = useHydrated();
  const genreScores = useProfileStore((s) => s.genreScores);
  const preferredGenres = useProfileStore((s) => s.preferredGenres);
  const togglePreferredGenre = useProfileStore((s) => s.togglePreferredGenre);
  const reset = useProfileStore((s) => s.reset);

  const { data: genres } = useGenres();
  const { recommendations, isLoading, personalized } = useRecommended(12);

  // Top learned interests, derived from view/favorite affinity.
  const topInterests = useMemo(
    () =>
      Object.entries(genreScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name]) => name),
    [genreScores],
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <UserCircle2 className="text-primary size-7" /> Seu perfil
          </h1>
          <p className="text-muted mt-1 text-sm">
            Quanto mais você explora, mais inteligente fica a curadoria.
          </p>
        </div>
        {hydrated &&
          (preferredGenres.length > 0 || topInterests.length > 0) && (
            <button
              type="button"
              onClick={reset}
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
            >
              <RotateCcw className="size-4" /> Resetar
            </button>
          )}
      </div>

      {/* Preferred genres */}
      <section className="border-border bg-surface/40 mt-8 rounded-2xl border p-5">
        <h2 className="font-semibold">Gêneros preferidos</h2>
        <p className="text-muted mt-1 text-sm">
          Selecione o que você curte para turbinar as recomendações.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(genres ?? []).map((genre) => {
            const active = preferredGenres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => togglePreferredGenre(genre)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "border-transparent bg-brand-gradient text-white"
                    : "border-border bg-card text-muted hover:text-foreground",
                )}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </section>

      <GamificationPanel />

      {/* Learned interests */}
      {hydrated && topInterests.length > 0 && (
        <section className="mt-6">
          <h2 className="text-muted mb-2 text-sm font-semibold uppercase tracking-wide">
            Interesses detectados
          </h2>
          <div className="flex flex-wrap gap-2">
            {topInterests.map((interest) => (
              <span
                key={interest}
                className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
              >
                <Sparkles className="size-3" /> {interest}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="text-primary size-5" />
          {personalized ? "Recomendado para você" : "Sugestões para começar"}
        </h2>
        <p className="text-muted mt-1 text-sm">
          {personalized
            ? "Com base nos seus gêneros e no que você explorou."
            : "Curta alguns gêneros acima ou favorite animes para personalizar."}
        </p>

        <div className="mt-6">
          {isLoading ? (
            <GridSkeleton count={6} />
          ) : recommendations.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Sem recomendações ainda"
              description="Explore o catálogo para alimentarmos sua curadoria."
              action={{ label: "Explorar agora", href: "/explore" }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {recommendations.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
