"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Play, Trash2 } from "lucide-react";
import { useHistoryStore } from "@/store/history.store";
import { useHydrated } from "@/hooks/useHydrated";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { progressPercent, timeAgo } from "@/utils/format";

export default function HistoryPage() {
  const hydrated = useHydrated();
  const entries = useHistoryStore((s) => s.entries);
  const remove = useHistoryStore((s) => s.remove);
  const clear = useHistoryStore((s) => s.clear);

  const sorted = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <Clock className="text-primary size-6" /> Histórico
          </h1>
          <p className="text-muted mt-1 text-sm">
            Continue de onde você parou.
          </p>
        </div>
        {hydrated && entries.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-muted hover:text-foreground text-sm transition-colors"
          >
            Limpar histórico
          </button>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {!hydrated ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Seu histórico está vazio"
            description="Os episódios que você assistir aparecerão aqui para continuar depois."
            action={{ label: "Começar a assistir", href: "/" }}
          />
        ) : (
          sorted.map((entry) => {
            const percent = progressPercent(entry.progress, entry.duration);
            const watched = percent >= 90;
            return (
              <div
                key={`${entry.animeId}-${entry.episodeId}`}
                className="group border-border bg-card hover:bg-card-hover flex gap-4 rounded-xl border p-3 transition-colors"
              >
                <Link
                  href={`/watch/${entry.animeId}/${entry.episodeId}`}
                  className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg sm:w-40"
                >
                  <Image
                    src={entry.animeImage}
                    alt={entry.animeTitle}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="size-7 fill-white text-white" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
                    <div
                      className="bg-brand-gradient h-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <Link
                    href={`/anime/${entry.animeId}`}
                    className="hover:text-primary line-clamp-1 font-semibold transition-colors"
                  >
                    {entry.animeTitle}
                  </Link>
                  <p className="text-muted-strong mt-0.5 line-clamp-1 text-sm">
                    EP {entry.episodeNumber} · {entry.episodeTitle}
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {watched ? "Concluído" : `${percent}% assistido`} ·{" "}
                    {timeAgo(entry.updatedAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => remove(entry.animeId, entry.episodeId)}
                  aria-label="Remover do histórico"
                  className="text-muted hover:bg-white/10 hover:text-foreground flex size-9 shrink-0 items-center justify-center self-center rounded-full transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
