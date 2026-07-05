"use client";

import { useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  SkipForward,
  SkipBack,
  Info,
  AlertCircle,
} from "lucide-react";
import { useAnime } from "@/features/anime/hooks/useAnimeQueries";
import { useHistoryStore } from "@/store/history.store";
import { syncHistoryAction } from "@/services/syncService";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { EpisodeList } from "@/features/anime/components/EpisodeList";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";

export default function WatchPage() {
  const params = useParams<{ animeId: string; episodeId: string }>();
  const { animeId, episodeId } = params;
  const router = useRouter();

  const { data: anime, isLoading } = useAnime(animeId);

  const record = useHistoryStore((s) => s.record);
  const updateProgress = useHistoryStore((s) => s.updateProgress);
  const entries = useHistoryStore((s) => s.entries);

  // Capture the resume position once, before we upsert the history entry.
  const startTimeRef = useRef<number>(0);
  const recordedKey = useRef<string | null>(null);

  const episode = anime?.episodes.find((e) => e.id === episodeId) ?? null;

  const { prevEpisode, nextEpisode } = useMemo(() => {
    if (!anime || !episode) {
      return { prevEpisode: null, nextEpisode: null };
    }
    const idx = anime.episodes.findIndex((e) => e.id === episode.id);
    return {
      prevEpisode: idx > 0 ? anime.episodes[idx - 1] : null,
      nextEpisode:
        idx < anime.episodes.length - 1 ? anime.episodes[idx + 1] : null,
    };
  }, [anime, episode]);

  // Register the episode in history (resume-aware) when it loads/changes.
  useEffect(() => {
    if (!anime || !episode) return;
    const key = `${anime.id}::${episode.id}`;
    if (recordedKey.current === key) return;
    recordedKey.current = key;

    const existing = entries.find(
      (e) => e.animeId === anime.id && e.episodeId === episode.id,
    );
    startTimeRef.current = existing?.progress ?? 0;

    record({
      animeId: anime.id,
      episodeId: episode.id,
      animeTitle: anime.title,
      animeImage: anime.banner,
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      progress: existing?.progress ?? 0,
      duration: existing?.duration ?? episode.duration ?? 0,
      updatedAt: Date.now(),
    });
    syncHistoryAction({
      animeId: anime.id,
      episodeId: episode.id,
      animeTitle: anime.title,
      animeImage: anime.banner,
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      progress: existing?.progress ?? 0,
      duration: existing?.duration ?? episode.duration ?? 0,
      updatedAt: Date.now(),
    });
  }, [anime, episode, entries, record]);

  if (isLoading) return <WatchSkeleton />;

  if (!anime || !episode) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          icon={AlertCircle}
          title="Episódio não encontrado"
          description="Este episódio não está disponível. Verifique o catálogo."
          action={{ label: "Voltar ao início", href: "/" }}
        />
      </div>
    );
  }

  const goToNext = () => {
    if (nextEpisode) {
      router.push(`/watch/${anime.id}/${nextEpisode.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
      <Link
        href={`/anime/${anime.id}`}
        className="text-muted hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ChevronLeft className="size-4" /> {anime.title}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Player + meta */}
        <div className="min-w-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
            <VideoPlayer
              key={episode.id}
              src={episode.videoUrl}
              poster={episode.thumbnail}
              startTime={startTimeRef.current}
              onProgress={(time, duration) => {
                updateProgress(anime.id, episode.id, time, duration);
                syncHistoryAction({
                  animeId: anime.id,
                  episodeId: episode.id,
                  animeTitle: anime.title,
                  animeImage: anime.banner,
                  episodeNumber: episode.number,
                  episodeTitle: episode.title,
                  progress: time,
                  duration,
                  updatedAt: Date.now(),
                });
              }}
              onEnded={goToNext}
              className="size-full"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-primary text-sm font-bold">
                Episódio {episode.number}
              </p>
              <h1 className="truncate text-xl font-bold md:text-2xl">
                {episode.title}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <NavButton
                disabled={!prevEpisode}
                onClick={() =>
                  prevEpisode &&
                  router.push(`/watch/${anime.id}/${prevEpisode.id}`)
                }
                label="Anterior"
                icon={<SkipBack className="size-4" />}
              />
              <NavButton
                disabled={!nextEpisode}
                onClick={goToNext}
                label="Próximo"
                icon={<SkipForward className="size-4" />}
                primary
                iconRight
              />
            </div>
          </div>

          <p className="text-muted mt-3 inline-flex items-center gap-1.5 text-xs">
            <Info className="size-3.5" /> O próximo episódio inicia
            automaticamente ao final.
          </p>
        </div>

        {/* Episode sidebar */}
        <aside className="lg:max-h-[80vh] lg:overflow-y-auto lg:pr-1">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Episódios · {anime.episodes.length}
          </h2>
          <EpisodeList
            animeId={anime.id}
            episodes={anime.episodes}
            currentEpisodeId={episode.id}
            variant="list"
          />
        </aside>
      </div>
    </div>
  );
}

function NavButton({
  disabled,
  onClick,
  label,
  icon,
  primary,
  iconRight,
}: {
  disabled?: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  iconRight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
        primary
          ? "bg-brand-gradient text-white hover:scale-105"
          : "border-border bg-card hover:bg-card-hover border",
      )}
    >
      {!iconRight && icon}
      {label}
      {iconRight && icon}
    </button>
  );
}

function WatchSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="mt-4 h-7 w-1/2" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
