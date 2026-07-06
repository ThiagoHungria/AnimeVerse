"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useAnime } from "@/features/anime/hooks/useAnimeQueries";
import { useHistoryStore } from "@/store/history.store";
import { useProfileStore } from "@/store/profile.store";
import { useHydrated } from "@/hooks/useHydrated";
import { AnimeDetailCinematic } from "@/features/anime/components/AnimeDetailCinematic";
import { AnimeDetailTabs } from "@/features/anime/components/AnimeDetailTabs";
import { HeroCinematicSkeleton } from "@/components/ui/CinematicSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AnimeDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: anime, isLoading } = useAnime(id);
  const hydrated = useHydrated();
  const getForAnime = useHistoryStore((s) => s.getForAnime);
  const recordView = useProfileStore((s) => s.recordView);
  const recordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!anime || recordedRef.current === anime.id) return;
    recordedRef.current = anime.id;
    recordView(anime.id, [
      ...anime.genres,
      ...anime.themes,
      ...anime.demographics,
    ]);
  }, [anime, recordView]);

  if (isLoading) return <HeroCinematicSkeleton />;

  if (!anime) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          icon={AlertCircle}
          title="Anime não encontrado"
          description="O anime que você procura não existe ou foi removido do catálogo."
          action={{ label: "Voltar ao início", href: "/" }}
        />
      </div>
    );
  }

  const lastWatched = hydrated ? getForAnime(anime.id) : undefined;
  const resumeEpisode = lastWatched?.episodeId ?? anime.episodes[0]?.id;
  const watchHref = resumeEpisode
    ? `/watch/${anime.id}/${resumeEpisode}`
    : undefined;

  return (
    <div className="pb-20">
      <AnimeDetailCinematic
        anime={anime}
        watchHref={watchHref}
        resumeLabel={lastWatched ? "Continuar assistindo" : "Assistir agora"}
      />

      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <AnimeDetailTabs anime={anime} />
      </div>
    </div>
  );
}
