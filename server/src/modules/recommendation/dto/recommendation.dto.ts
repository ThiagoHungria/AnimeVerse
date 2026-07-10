/**
 * Recommendation API contracts (FASE 2.1).
 *
 * Defines the additive `reasons` shape that recommendations will carry so the
 * UI can explain each suggestion ("Recomendado porque você assistiu X").
 *
 * These types are contract-only: they are NOT yet produced by the engine or
 * required by any response. Wiring happens in a later phase.
 */

import type { AnimeCacheService } from "../../anime/anime-cache.service";

/** Why an anime was recommended. */
export type RecommendationReasonType =
  | "genre_similar"
  | "theme_similar"
  | "similar_users"
  | "high_rating"
  | "trending";

export interface RecommendationReason {
  type: RecommendationReasonType;
  /** MAL id of the anime that triggered this reason (when applicable). */
  sourceAnimeId?: number;
  /** Human-readable title of the source anime (when applicable). */
  sourceTitle?: string;
  /** Display label, e.g. "Gênero semelhante a Attack on Titan". */
  label: string;
}

/** Canonical anime summary shape returned by the anime cache layer. */
export type AnimeSummaryResponse = ReturnType<AnimeCacheService["toResponse"]>;

/**
 * Anime summary enriched with recommendation metadata.
 *
 * `reasons` is always present (possibly empty). `score`/`trending` are additive
 * and optional: they are populated by the engine, but any legacy consumer or
 * legacy cache entry that lacks them keeps working (fields resolve to undefined).
 */
export type RecommendedAnimeDto = AnimeSummaryResponse & {
  reasons: RecommendationReason[];
  /** Final blended recommendation score (0-1), from ScoredRecommendation. */
  score?: number;
  /** Whether the anime is part of the current trending pool. */
  trending?: boolean;
};

/** Persisted shape of RecommendationCache.meta (Json column). */
export interface RecommendationCacheMeta {
  personalized?: boolean;
  /** Reasons keyed by anime MAL id. */
  reasons?: Record<number, RecommendationReason[]>;
}
