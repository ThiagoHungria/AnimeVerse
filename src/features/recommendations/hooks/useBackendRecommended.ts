"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/auth.store";
import { useDiscoveryPool } from "@/features/anime/hooks/useAnimeQueries";
import { useUserBehavior } from "@/features/recommendations/hooks/useUserBehavior";
import { hydrateRecommendations } from "@/features/recommendations/lib/hydrateRecommendations";
import {
  getRecoSource,
  type RecommendationFeedResult,
} from "@/features/recommendations/lib/recommendationSource";

/**
 * Backend-powered "for you" feed. Fetches the ranked recommendations from the
 * API and hydrates them into full display records via the discovery pool.
 *
 * The query only runs when the backend flag is on AND the user is authenticated,
 * so with the default flag ("client") this hook does no network work and returns
 * an empty, non-loading result — letting the caller fall back to the client
 * engine transparently.
 */
export function useBackendRecommended(limit = 18): RecommendationFeedResult {
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const enabled =
    getRecoSource() === "backend" && isAuthenticated && Boolean(userId);

  const { data: pool } = useDiscoveryPool();
  const behavior = useUserBehavior();

  const query = useQuery({
    queryKey: ["reco", userId, limit],
    queryFn: () => apiClient.getRecommendations(userId as string),
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

  const personalized =
    Object.keys(behavior.tasteProfile).length > 0 ||
    behavior.watchedAnimeIds.size > 0;

  return { recommendations, isLoading: query.isLoading, personalized };
}
