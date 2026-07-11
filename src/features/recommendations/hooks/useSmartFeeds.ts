"use client";

import { useMemo } from "react";
import { useDiscoveryPool } from "@/features/anime/hooks/useAnimeQueries";
import { useUserBehavior } from "@/features/recommendations/hooks/useUserBehavior";
import { useBackendSmartFeeds } from "@/features/recommendations/hooks/useBackendSmartFeeds";
import { useHistoryStore } from "@/store/history.store";
import { useAuthStore } from "@/store/auth.store";
import {
  getRecoSource,
  selectSmartFeeds,
  type SmartFeed,
} from "@/features/recommendations/lib/recommendationSource";
import {
  recommendBecauseYouWatched,
  recommendProbablyLike,
  recommendHighRatedObscure,
  recommendLike,
} from "@/services/recommendationEngine";

export type { SmartFeed } from "@/features/recommendations/lib/recommendationSource";

export function useSmartFeeds() {
  const { data: pool, isLoading } = useDiscoveryPool();
  const behavior = useUserBehavior();
  const entries = useHistoryStore((s) => s.entries);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const clientFeeds = useMemo((): SmartFeed[] => {
    if (!pool) return [];

    const result: SmartFeed[] = [];
    const lastEntry = entries[0];
    const lastWatched = lastEntry
      ? pool.find((a) => a.id === lastEntry.animeId)
      : undefined;

    if (lastWatched) {
      const because = recommendBecauseYouWatched(
        lastWatched.title,
        lastWatched,
        pool,
        behavior,
      );
      if (because.length > 0) {
        result.push({
          id: "because-watched",
          title: `Porque você assistiu ${lastWatched.title}`,
          eyebrow: "Continuidade de gosto",
          animes: because,
        });
      }
    }

    const favorite = pool.find((a) => behavior.favoriteIds.has(a.id));
    if (favorite) {
      const similar = recommendLike(favorite, pool, behavior);
      if (similar.length > 0) {
        result.push({
          id: "like-favorite",
          title: `Parecidos com ${favorite.title}`,
          eyebrow: "Mesma vibe",
          animes: similar,
        });
      }
    }

    const probably = recommendProbablyLike(pool, behavior);
    if (probably.length > 0) {
      result.push({
        id: "probably",
        title: "Você provavelmente vai gostar",
        eyebrow: "Curadoria inteligente",
        animes: probably,
      });
    }

    const obscure = recommendHighRatedObscure(pool, behavior);
    if (obscure.length > 0) {
      result.push({
        id: "high-obscure",
        title: "Alta avaliação, pouco conhecido",
        eyebrow: "Descobertas premium",
        animes: obscure,
      });
    }

    return result;
  }, [pool, behavior, entries]);

  const backend = useBackendSmartFeeds();

  return selectSmartFeeds({
    source: getRecoSource(),
    isAuthenticated,
    backend,
    client: { feeds: clientFeeds, isLoading },
  });
}
