/**
 * Unified Recommendation Scoring — type contracts (FASE 2.2-B, base structure).
 *
 * These types describe the *inputs and outputs* of the isolated scoring service.
 * No scoring math lives here. The service (`recommendation-scoring.service.ts`)
 * is the single source of truth for how signals combine into a final score.
 *
 * Signal coverage prepared here (per plan 2.2-B):
 *   history · genres · ratings · similarUsers · trends
 *
 * Nothing in this file is wired into the engine, endpoint, cache or frontend yet.
 */

import type { ExternalAnimeDto } from "../jikan.service";
import type { TasteProfile } from "../recommendation.service";

// Re-export the reason contract from FASE 2.1 so scoring has a single, shared
// definition instead of duplicating it.
export type {
  RecommendationReason,
  RecommendationReasonType,
} from "../../modules/recommendation/dto/recommendation.dto";

/**
 * A single watch-history entry, used by the (behavioural) history component.
 * Carries the raw engagement signals so the scorer can weight by how much and
 * how recently the user actually watched each anime.
 */
export interface WatchHistorySignal {
  /** MAL id of the watched anime. */
  animeId: number;
  /** Genres of the watched anime. */
  genres: string[];
  /** Themes of the watched anime (optional, blended with genres). */
  themes?: string[];
  /** Amount watched (e.g. seconds/position or episodes). */
  progress: number;
  /** Total length for the same unit as `progress` (episode/anime duration). */
  duration?: number;
  /** Last interaction time — drives the recency weight. */
  updatedAt?: Date | string | number;
}

/**
 * Aggregated per-user signals used to score candidates.
 * Assembled by the orchestrator (RecommendationEngineService) in a later step —
 * the scoring service only consumes this shape.
 */
export interface UserSignals {
  /** Genre/theme taste profile (preferred + favorites + history weighting). */
  tasteProfile: TasteProfile;
  /** Genres extracted from favorites — strong explicit signal. */
  favoriteGenres: string[];
  /** Genres extracted from recent watch history — behavioural signal. */
  historyGenres: string[];
  /**
   * Detailed watch history (progress + duration + recency) for the behavioural
   * history component. Empty for cold-start users.
   */
  history: WatchHistorySignal[];
  /**
   * Explicit user ratings keyed by MAL id (1..10).
   * Empty until rating UI exists; weight is `0` by default (see weights).
   */
  ratings: Record<number, number>;
  /** MAL ids the user already engaged with (favorites/history) — excluded. */
  seenAnimeIds: number[];
  /**
   * Neighbour user ids for collaborative scoring.
   * Empty until real cross-user data exists (FASE 2.2-C); a popularity/quality
   * proxy is used meanwhile without emitting a collaborative reason.
   */
  similarUserIds?: string[];
}

/**
 * A single anime candidate to be scored. Mirrors the external catalog shape and
 * carries optional precomputed global signals (e.g. trending membership).
 */
export interface CandidateAnime extends ExternalAnimeDto {
  /** True when this anime is part of the current trending pool. */
  trending?: boolean;
}

/**
 * Relative weight of each signal in the final score.
 * Values are renormalized by the service when some signals are disabled.
 */
export interface ScoringWeights {
  history: number;
  genres: number;
  ratings: number;
  similarUsers: number;
  trends: number;
}

/**
 * Default weights (plan 2.2-B).
 *
 * `ratings` is held at `0` in FASE 2.2-B2 (no rating UI/data yet): the service
 * renormalizes the remaining active weights so ratings cannot influence the
 * final score. Its planned share (~15%) is restored once ratings go live.
 * `similarUsers` currently resolves through a popularity/quality proxy.
 *
 * Active weights renormalize as: history ≈ 0.4706, genres ≈ 0.2353,
 * similarUsers ≈ 0.1765, trends ≈ 0.1176 (sum 1).
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  history: 0.4,
  genres: 0.2,
  ratings: 0,
  similarUsers: 0.15,
  trends: 0.1,
};

/** Tunable options for a scoring run. */
export interface ScoringOptions {
  /** Max number of recommendations to return. */
  limit?: number;
  /** Partial override of the default weights. */
  weights?: Partial<ScoringWeights>;
  /** Drop candidates present in `UserSignals.seenAnimeIds` (default: true). */
  excludeSeen?: boolean;
  /** Max number of reasons attached per recommendation (default: 3). */
  maxReasons?: number;
}

/** Per-signal contribution to a candidate's final score. */
export interface ScoreBreakdown {
  history: number;
  genres: number;
  ratings: number;
  similarUsers: number;
  trends: number;
}

/** A scored candidate ready to be ranked and returned. */
export interface ScoredRecommendation {
  anime: CandidateAnime;
  /** Final blended score (weighted sum of the breakdown). */
  score: number;
  /** Contribution of each signal, for ranking, debugging and reason building. */
  breakdown: ScoreBreakdown;
  /** Top explanations for this recommendation (see RecommendationReason). */
  reasons: import("../../modules/recommendation/dto/recommendation.dto").RecommendationReason[];
}
