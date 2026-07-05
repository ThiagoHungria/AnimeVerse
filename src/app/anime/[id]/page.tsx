"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  ListVideo,
  Calendar,
  Clapperboard,
  Users,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { useAnime } from "@/features/anime/hooks/useAnimeQueries";
import { useHistoryStore } from "@/store/history.store";
import { useProfileStore } from "@/store/profile.store";
import { useHydrated } from "@/hooks/useHydrated";
import { EpisodeList } from "@/features/anime/components/EpisodeList";
import { FavoriteButton } from "@/features/anime/components/FavoriteButton";
import { SmartTags } from "@/features/anime/components/SmartTags";
import { TrailerEmbed } from "@/features/anime/components/TrailerEmbed";
import { SimilarSection } from "@/features/anime/components/SimilarSection";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AnimeDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: anime, isLoading } = useAnime(id);
  const hydrated = useHydrated();
  const getForAnime = useHistoryStore((s) => s.getForAnime);
  const recordView = useProfileStore((s) => s.recordView);
  const recordedRef = useRef<string | null>(null);

  // Feed the taste profile when an anime page is viewed (once per id).
  useEffect(() => {
    if (!anime || recordedRef.current === anime.id) return;
    recordedRef.current = anime.id;
    recordView(anime.id, [
      ...anime.genres,
      ...anime.themes,
      ...anime.demographics,
    ]);
  }, [anime, recordView]);

  if (isLoading) return <DetailsSkeleton />;

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
    <div className="pb-16">
      {/* Banner */}
      <div className="relative h-[40vh] max-h-[420px] min-h-[260px] w-full overflow-hidden">
        {anime.banner && (
          <Image
            src={anime.banner}
            alt={anime.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="from-background via-background/60 absolute inset-0 bg-gradient-to-t to-transparent" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        {/* Header: poster + meta */}
        <div className="-mt-28 flex flex-col gap-6 md:-mt-32 md:flex-row md:items-end">
          <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-2xl border border-border-strong shadow-2xl md:w-52">
            {anime.image && (
              <Image
                src={anime.image}
                alt={anime.title}
                fill
                priority
                sizes="208px"
                className="object-cover"
              />
            )}
          </div>

          <div className="flex-1 space-y-3 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              {anime.rating > 0 && <RatingBadge rating={anime.rating} />}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium">
                {anime.statusLabel}
              </span>
              {anime.type && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium">
                  {anime.type}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              {anime.title}
            </h1>
            {anime.titleEnglish && anime.titleEnglish !== anime.title && (
              <p className="text-muted -mt-1 text-sm">{anime.titleEnglish}</p>
            )}

            <SmartTags tags={anime.smartTags} max={6} withIcon />

            <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {anime.year && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" /> {anime.year}
                </span>
              )}
              {anime.studio && (
                <span className="inline-flex items-center gap-1.5">
                  <Clapperboard className="size-4" /> {anime.studio}
                </span>
              )}
              {anime.episodeCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <ListVideo className="size-4" /> {anime.episodeCount} episódios
                </span>
              )}
              {anime.rank && (
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="size-4" /> #{anime.rank} no ranking
                </span>
              )}
              {anime.members && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" />{" "}
                  {Intl.NumberFormat("pt-BR", { notation: "compact" }).format(
                    anime.members,
                  )}{" "}
                  membros
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {anime.genres.map((genre) => (
                <Link
                  key={genre}
                  href={`/search?genre=${encodeURIComponent(genre)}`}
                  className="border-border-strong text-muted-strong hover:bg-white/5 rounded-full border px-3 py-1 text-xs transition-colors"
                >
                  {genre}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {watchHref && (
                <Link
                  href={watchHref}
                  className="bg-brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  <Play className="size-5 fill-white" />
                  {lastWatched ? "Continuar assistindo" : "Assistir agora"}
                </Link>
              )}
              <FavoriteButton anime={anime} variant="full" />
            </div>
          </div>
        </div>

        {/* Synopsis + trailer */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="mb-2 text-lg font-bold">Sinopse</h2>
            <p className="text-muted-strong leading-relaxed">
              {anime.description}
            </p>
            {anime.background && (
              <p className="text-muted mt-4 text-sm leading-relaxed">
                {anime.background}
              </p>
            )}
          </section>

          {anime.trailerUrl && (
            <section>
              <h2 className="mb-2 text-lg font-bold">Trailer</h2>
              <TrailerEmbed
                embedUrl={anime.trailerUrl}
                poster={anime.banner}
                title={anime.title}
              />
            </section>
          )}
        </div>

        {/* Episodes */}
        {anime.episodes.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold">Episódios</h2>
            <EpisodeList animeId={anime.id} episodes={anime.episodes} />
          </section>
        )}

        {/* Similar engine */}
        <SimilarSection animeId={anime.id} />
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="pb-16">
      <Skeleton className="h-[40vh] max-h-[420px] min-h-[260px] w-full rounded-none" />
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="-mt-28 flex flex-col gap-6 md:flex-row">
          <Skeleton className="aspect-[2/3] w-40 shrink-0 rounded-2xl md:w-52" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-48 rounded-full" />
          </div>
        </div>
        <Skeleton className="mt-10 h-24 w-full max-w-3xl" />
      </div>
    </div>
  );
}
