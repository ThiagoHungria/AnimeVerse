"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/auth.store";
import { useSyncStore } from "@/store/sync.store";
import { useDiscoveryPool } from "@/features/anime/hooks/useAnimeQueries";
import { hydrateSmartFeedSections } from "@/features/recommendations/lib/hydrateSmartFeeds";
import {
  getRecoSource,
  isBackendRecoEnabled,
  type SmartFeedResult,
} from "@/features/recommendations/lib/recommendationSource";

/**
 * Backend-powered contextual feeds (because-watched / like-favorite). Fetches
 * the anchored sections from the API and hydrates each one against the discovery
 * pool, preserving section order, item order, reasons and the anchor source.
 *
 * The query only runs when the backend flag is on AND the user is authenticated,
 * so with the default flag ("client") this hook does no network work and returns
 * an empty, non-loading result — letting `useSmartFeeds` keep the client engine.
 */
export function useBackendSmartFeeds(): SmartFeedResult {
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

  const query = useQuery({
    queryKey: ["reco-feeds", userId],
    queryFn: () => apiClient.getSmartFeeds(userId as string),
    enabled,
    staleTime: 1000 * 60 * 15, // 15 min — aligns with backend cache TTL
    gcTime: 1000 * 60 * 30,
  });

  const feeds = useMemo(
    () => (query.data ? hydrateSmartFeedSections(query.data, pool) : []),
    [query.data, pool],
  );

  return { feeds, isLoading: query.isLoading };
}
