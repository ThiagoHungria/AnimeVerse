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

/**
 * Whether a backend recommendation query may run (FASE 2.2-I.1).
 *
 * Requires the backend flag, an authenticated user with an id, AND that the
 * initial sync has completed — so queries never hit the server before the
 * user's local signals were pushed/merged. Anonymous users and the client flag
 * short-circuit to `false`, keeping the client engine + fallback intact.
 *
 * Pure and framework-free so it can be unit-tested and shared by every backend
 * reco hook without duplicating the gate.
 */
export function isBackendRecoEnabled(params: {
  source: RecoSource;
  isAuthenticated: boolean;
  userId?: string | null;
  isSyncCompleted: boolean;
}): boolean {
  const { source, isAuthenticated, userId, isSyncCompleted } = params;
  return (
    source === "backend" &&
    isAuthenticated &&
    Boolean(userId) &&
    isSyncCompleted
  );
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

/**
 * Shape returned by the "baseado no seu gosto" feed. Mirrors
 * `RecommendationFeedResult` but exposes `hasTaste` instead of `personalized`,
 * matching the existing `useTasteBased` contract consumed by `TasteBasedRow`.
 */
export interface TasteFeedResult {
  recommendations: AnimeSummary[];
  isLoading: boolean;
  hasTaste: boolean;
}

/**
 * Taste-feed counterpart of `selectRecommended`. Kept as a separate selector
 * (not generalized yet) so the taste migration stays isolated and the "for you"
 * path is untouched. Same guard: backend only when the flag is on, the user is
 * authenticated and the backend actually returned data — otherwise fall back to
 * the client engine (covering anonymous users, flag off, empty or errored API).
 */
export function selectTasteBased(params: {
  source: RecoSource;
  isAuthenticated: boolean;
  backend: TasteFeedResult;
  client: TasteFeedResult;
}): TasteFeedResult {
  const { source, isAuthenticated, backend, client } = params;
  const useBackend =
    source === "backend" &&
    isAuthenticated &&
    backend.recommendations.length > 0;
  return useBackend ? backend : client;
}

/**
 * A contextual home-feed section. Shared shape for both the client engine and
 * the backend SmartFeeds. `source` (anchor) is only present on backend-driven
 * anchored sections; the UI only reads title/eyebrow/animes.
 */
export interface SmartFeed {
  id: string;
  title: string;
  eyebrow: string;
  source?: { animeId: number; title: string };
  animes: AnimeSummary[];
}

export interface SmartFeedResult {
  feeds: SmartFeed[];
  isLoading: boolean;
}

/**
 * Section ids owned by the backend contextual engine (FASE 2.2-G.2). When the
 * backend feed is used, these replace their client counterparts while the
 * remaining client-only sections (probably / high-obscure) are appended.
 */
export const BACKEND_SMART_FEED_IDS: ReadonlySet<string> = new Set([
  "because-watched",
  "like-favorite",
]);

/**
 * Choose the SmartFeeds source. Uses the backend anchored sections only when the
 * flag is on, the user is authenticated and the backend returned sections;
 * otherwise the full client engine result is kept (flag off, anonymous, empty or
 * errored). When the backend is used, client-only sections (probably /
 * high-obscure) are appended after the backend sections, preserving order.
 */
export function selectSmartFeeds(params: {
  source: RecoSource;
  isAuthenticated: boolean;
  backend: SmartFeedResult;
  client: SmartFeedResult;
}): SmartFeedResult {
  const { source, isAuthenticated, backend, client } = params;
  const useBackend =
    source === "backend" && isAuthenticated && backend.feeds.length > 0;
  if (!useBackend) return client;

  const clientExtras = client.feeds.filter(
    (f) => !BACKEND_SMART_FEED_IDS.has(f.id),
  );
  return {
    feeds: [...backend.feeds, ...clientExtras],
    isLoading: backend.isLoading || client.isLoading,
  };
}
