"use client";

import { useState } from "react";
import { Library, Play, CheckCircle2, Bookmark, Heart } from "lucide-react";
import { useLibraryStore, type LibraryList } from "@/store/library.store";
import { useFavoritesStore } from "@/store/favorites.store";
import { useHistoryStore } from "@/store/history.store";
import { useHydrated } from "@/hooks/useHydrated";
import { AnimeCardPremium } from "@/components/AnimeCardPremium";
import { EmptyState } from "@/components/ui/EmptyState";
import { GridSkeleton } from "@/components/ui/LoadingSkeleton";
import { cn } from "@/utils/cn";
import { progressPercent } from "@/utils/format";
import type { AnimeSummary } from "@/types";

const TABS: { id: LibraryList | "favorites"; label: string; icon: typeof Play }[] = [
  { id: "watching", label: "Assistindo", icon: Play },
  { id: "completed", label: "Completo", icon: CheckCircle2 },
  { id: "planned", label: "Planejado", icon: Bookmark },
  { id: "favorites", label: "Favoritos", icon: Heart },
];

export default function LibraryPage() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<LibraryList | "favorites">("watching");
  const watching = useLibraryStore((s) => s.watching);
  const completed = useLibraryStore((s) => s.completed);
  const planned = useLibraryStore((s) => s.planned);
  const favorites = useFavoritesStore((s) => s.items);
  const entries = useHistoryStore((s) => s.entries);

  if (!hydrated) return <GridSkeleton count={6} />;

  const inProgressIds = new Set(
    entries
      .filter((e) => progressPercent(e.progress, e.duration) < 90)
      .map((e) => e.animeId),
  );

  const autoWatching: AnimeSummary[] = watching.length
    ? watching
    : favorites.filter((a) => inProgressIds.has(a.id));

  const items =
    tab === "favorites"
      ? favorites
      : tab === "watching"
        ? autoWatching
        : tab === "completed"
          ? completed
          : planned;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
        <Library className="text-primary size-7" />
        Biblioteca
      </h1>
      <p className="text-muted mt-1 text-sm">
        Suas listas pessoais — assistindo, completos, planejados e favoritos.
      </p>

      <div className="scrollbar-hide mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
              tab === id
                ? "border-transparent bg-brand-gradient text-white"
                : "border-border bg-card text-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState
            icon={Library}
            title="Lista vazia"
            description="Explore o catálogo e adicione animes à sua biblioteca."
            action={{ label: "Explorar", href: "/" }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((anime) => (
              <AnimeCardPremium key={anime.id} anime={anime} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
