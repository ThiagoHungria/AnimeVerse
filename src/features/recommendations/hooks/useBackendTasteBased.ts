"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/auth.store";
import { useSyncStore } from "@/store/sync.store";
import { useDiscoveryPool } from "@/features/anime/hooks/useAnimeQueries";
import { useUserBehavior } from "@/features/recommendations/hooks/useUserBehavior";
import { hydrateRecommendations } from "@/features/recommendations/lib/hydrateRecommendations";
import {
  getRecoSource,
  isBackendRecoEnabled,
  type TasteFeedResult,
} from "@/features/recommendations/lib/recommendationSource";

/**
 * Backend-powered "baseado no seu gosto" feed. Fetches the genre-heavy ranking
 * from the API and hydrates it against the discovery pool by `malId`.
 *
 * The query only runs when the backend flag is on AND the user is authenticated,
 * so with the default flag ("client") this hook does no network work and returns
 * an empty, non-loading result — letting `useTasteBased` fall back to the client
 * engine transparently.
 */
export function useBackendTasteBased(limit = 18): TasteFeedResult {
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSyncCompleted = useSyncStore((s) => s.isSyncCompleted);
  const enabled = isBackendRecoEnabled({
    source: getRecoSource(),
    isAuthenticated,
    userId,
    isSyncCompleted,
  });

  const { data: pool } = useDiscoveryPool();
  const behavior = useUserBehavior();

  const query = useQuery({
    queryKey: ["reco-taste", userId, limit],
    queryFn: () => apiClient.getTasteRecommendations(userId as string),
    enabled,
    staleTime: 1000 * 60 * 15, // 15 min — aligns with backend cache TTL
    gcTime: 1000 * 60 * 30,
  });

  const recommendations = useMemo(
    () =>
      query.data
        ? hydrateRecommendations(query.data.slice(0, limit), pool)
        : [],
    [query.data, pool, limit],
  );

  const hasTaste = Object.keys(behavior.tasteProfile).length > 0;

  return { recommendations, isLoading: query.isLoading, hasTaste };
}
