"use client";

import { useMemo } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { useProfileStore, buildTasteProfile } from "@/store/profile.store";
import { useFavoritesStore } from "@/store/favorites.store";
import { useHistoryStore } from "@/store/history.store";
import type { UserBehavior } from "@/services/recommendationEngine";

/** Aggregate local behavioral signals for the recommendation engine. */
export function useUserBehavior(): UserBehavior {
  const hydrated = useHydrated();
  const genreScores = useProfileStore((s) => s.genreScores);
  const preferredGenres = useProfileStore((s) => s.preferredGenres);
  const favorites = useFavoritesStore((s) => s.items);
  const entries = useHistoryStore((s) => s.entries);

  return useMemo(() => {
    if (!hydrated) {
      return {
        tasteProfile: {},
        favoriteIds: new Set<string>(),
        watchedAnimeIds: new Set<string>(),
        watchTimeByAnime: {},
      };
    }

    const watchTimeByAnime: Record<string, number> = {};
    const watchedAnimeIds = new Set<string>();

    for (const e of entries) {
      watchedAnimeIds.add(e.animeId);
      watchTimeByAnime[e.animeId] =
        (watchTimeByAnime[e.animeId] ?? 0) + (e.progress ?? 0);
    }

    return {
      tasteProfile: buildTasteProfile({ genreScores, preferredGenres }),
      favoriteIds: new Set(favorites.map((f) => f.id)),
      watchedAnimeIds,
      watchTimeByAnime,
    };
  }, [hydrated, genreScores, preferredGenres, favorites, entries]);
}
