"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import {
  useTrending,
  usePopular,
  useTopRated,
  useDiscoveryPool,
} from "@/features/anime/hooks/useAnimeQueries";
import { RankingCard } from "@/components/RankingCard";
import { GridSkeleton } from "@/components/ui/LoadingSkeleton";
import { cn } from "@/utils/cn";
import type { AnimeSummary } from "@/types";

type RankingTab = "popular" | "rating" | "trending" | "discoveries";

const TABS: { id: RankingTab; label: string }[] = [
  { id: "popular", label: "Mais populares" },
  { id: "rating", label: "Melhor avaliação" },
  { id: "trending", label: "Em alta" },
  { id: "discoveries", label: "Descobertas" },
];

export default function RankingPage() {
  const [tab, setTab] = useState<RankingTab>("popular");
  const popular = usePopular();
  const topRated = useTopRated();
  const trending = useTrending();
  const pool = useDiscoveryPool();

  const loading =
    tab === "popular"
      ? popular.isLoading
      : tab === "rating"
        ? topRated.isLoading
        : tab === "trending"
          ? trending.isLoading
          : pool.isLoading;

  const list: AnimeSummary[] = (() => {
    if (tab === "popular") return popular.data ?? [];
    if (tab === "rating") return topRated.data ?? [];
    if (tab === "trending") return trending.data ?? [];
    const p = pool.data ?? [];
    return [...p]
      .filter((a) => a.rating >= 7)
      .sort((a, b) => (a.popularity ?? 9999) - (b.popularity ?? 9999))
      .slice(0, 30);
  })();

  const metric =
    tab === "popular" ? "popular" : tab === "rating" ? "rating" : "members";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
        <Trophy className="text-primary size-7" />
        Ranking Global
      </h1>
      <p className="text-muted mt-1 text-sm">
        Os animes mais quentes do catálogo, atualizados em tempo real.
      </p>

      <div className="scrollbar-hide mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all",
              tab === t.id
                ? "border-transparent bg-brand-gradient text-white"
                : "border-border bg-card text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-2">
        {loading ? (
          <GridSkeleton count={8} />
        ) : (
          list.map((anime, i) => (
            <RankingCard
              key={anime.id}
              anime={anime}
              rank={i + 1}
              metric={metric}
            />
          ))
        )}
      </div>
    </div>
  );
}
