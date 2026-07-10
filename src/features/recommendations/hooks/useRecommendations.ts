"use client";

import { useMemo } from "react";
import { useDiscoveryPool } from "@/features/anime/hooks/useAnimeQueries";
import { useUserBehavior } from "@/features/recommendations/hooks/useUserBehavior";
import { useBackendRecommended } from "@/features/recommendations/hooks/useBackendRecommended";
import {
  getRecoSource,
  selectRecommended,
} from "@/features/recommendations/lib/recommendationSource";
import { useAuthStore } from "@/store/auth.store";
import {
  recommendForYou,
  recommendByTaste,
  getHiddenGemsForUser,
} from "@/services/recommendationEngine";
import {
  buildDiscoveryCollections,
} from "@/services/intelligenceEngine";

/**
 * "For you" feed. Backed by the client engine by default; switches to the
 * backend recommendation API only when the flag is on, the user is authenticated
 * and the backend returns data (see `selectRecommended`). The return shape is
 * unchanged so consuming components need no modification.
 */
export function useRecommended(limit = 18) {
  const { data: pool, isLoading } = useDiscoveryPool();
  const behavior = useUserBehavior();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const recommendations = useMemo(() => {
    if (!pool) return [];
    return recommendForYou(pool, behavior, limit);
  }, [pool, behavior, limit]);

  const personalized =
    Object.keys(behavior.tasteProfile).length > 0 ||
    behavior.watchedAnimeIds.size > 0;

  const backend = useBackendRecommended(limit);

  return selectRecommended({
    source: getRecoSource(),
    isAuthenticated,
    backend,
    client: { recommendations, isLoading, personalized },
  });
}

export function useTasteBased(limit = 18) {
  const { data: pool, isLoading } = useDiscoveryPool();
  const behavior = useUserBehavior();

  const recommendations = useMemo(() => {
    if (!pool) return [];
    return recommendByTaste(pool, behavior, limit);
  }, [pool, behavior, limit]);

  return {
    recommendations,
    isLoading,
    hasTaste: Object.keys(behavior.tasteProfile).length > 0,
  };
}

export function useDiscoveryCollections() {
  const { data: pool, isLoading } = useDiscoveryPool();
  const collections = useMemo(
    () => (pool ? buildDiscoveryCollections(pool) : []),
    [pool],
  );
  return { collections, isLoading };
}

export function useHiddenGems(limit = 18) {
  const { data: pool, isLoading } = useDiscoveryPool();
  const behavior = useUserBehavior();

  const hiddenGems = useMemo(() => {
    if (!pool) return [];
    return getHiddenGemsForUser(pool, behavior, limit);
  }, [pool, behavior, limit]);

  return { hiddenGems, isLoading };
}
