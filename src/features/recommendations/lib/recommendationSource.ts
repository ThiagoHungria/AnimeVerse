/**
 * Feature-flag + selection logic for the recommendation data source.
 *
 * Pure and framework-free so the switch behaviour can be unit-tested without a
 * React renderer. `useRecommended` delegates its decision to `selectRecommended`.
 */

import type { AnimeSummary } from "@/types";

export type RecoSource = "client" | "backend";

/** Read the client feature flag. Defaults to "client" (backend opt-in). */
export function getRecoSource(): RecoSource {
  return process.env.NEXT_PUBLIC_RECO_SOURCE === "backend"
    ? "backend"
    : "client";
}

/** Common shape returned by both the client and backend recommendation feeds. */
export interface RecommendationFeedResult {
  recommendations: AnimeSummary[];
  isLoading: boolean;
  personalized: boolean;
}

/**
 * Choose the backend feed only when the flag is on, the user is authenticated
 * and the backend actually returned data; otherwise fall back to the client
 * engine. This keeps the current experience intact for anonymous users, when
 * the flag is off, and whenever the backend is empty or errors out.
 */
export function selectRecommended(params: {
  source: RecoSource;
  isAuthenticated: boolean;
  backend: RecommendationFeedResult;
  client: RecommendationFeedResult;
}): RecommendationFeedResult {
  const { source, isAuthenticated, backend, client } = params;
  const useBackend =
    source === "backend" &&
    isAuthenticated &&
    backend.recommendations.length > 0;
  return useBackend ? backend : client;
}
