"use client";

import { useMemo } from "react";
import { useDiscoveryPool } from "@/features/anime/hooks/useAnimeQueries";
import { useUserBehavior } from "@/features/recommendations/hooks/useUserBehavior";
import {
  recommendForYou,
  recommendByTaste,
  getHiddenGemsForUser,
} from "@/services/recommendationEngine";
import {
  buildDiscoveryCollections,
} from "@/services/intelligenceEngine";

export function useRecommended(limit = 18) {
  const { data: pool, isLoading } = useDiscoveryPool();
  const behavior = useUserBehavior();

  const recommendations = useMemo(() => {
    if (!pool) return [];
    return recommendForYou(pool, behavior, limit);
  }, [pool, behavior, limit]);

  const personalized =
    Object.keys(behavior.tasteProfile).length > 0 ||
    behavior.watchedAnimeIds.size > 0;

  return { recommendations, isLoading, personalized };
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
