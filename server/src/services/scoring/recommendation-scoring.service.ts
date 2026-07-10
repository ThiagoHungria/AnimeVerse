/**
 * RecommendationScoringService — isolated, pure scoring engine (FASE 2.2-B2).
 *
 * Given per-user signals and candidate anime, produces a ranked list of
 * `ScoredRecommendation` with a per-signal breakdown and human-readable reasons.
 *
 * The engine is deterministic and side-effect free: no DB, cache, Jikan, HTTP,
 * clock or randomness. Recency is computed relative to the newest history entry
 * (not `Date.now()`), so the same inputs always yield the same output.
 *
 * Component scores are each normalized to [0, 1] and blended with renormalized
 * weights (see DEFAULT_SCORING_WEIGHTS), so the final score is also in [0, 1].
 *
 * This service is standalone: it is NOT wired into RecommendationEngineService,
 * the endpoint, the cache or the frontend in this phase.
 */

import { Injectable } from "@nestjs/common";
import {
  DEFAULT_SCORING_WEIGHTS,
  type CandidateAnime,
  type RecommendationReason,
  type ScoreBreakdown,
  type ScoredRecommendation,
  type ScoringOptions,
  type ScoringWeights,
  type UserSignals,
  type WatchHistorySignal,
} from "./scoring.types";

/** Recency half-scale: an entry this old gets half the weight of the newest. */
const RECENCY_SCALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Fallback episode count when a history entry lacks `duration`. */
const ASSUMED_EPISODES = 12;

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Popularity is a MAL rank (lower = more popular); map it to [0, 1]. */
function popularityScore(popularity?: number): number {
  if (!popularity || popularity <= 0) return 0.3;
  return clamp01(1 - Math.log10(popularity) / 4);
}

/** Per-run precomputed profiles shared across all candidates. */
interface ScoringContext {
  historyProfile: Map<string, number>;
  genreProfile: Map<string, number>;
}

@Injectable()
export class RecommendationScoringService {
  /**
   * Rank candidates for a user.
   *
   * Steps: exclude seen → build shared profiles → score each candidate →
   * blend with renormalized weights → sort desc → apply limit.
   */
  score(
    signals: UserSignals,
    candidates: CandidateAnime[],
    options: ScoringOptions = {},
  ): ScoredRecommendation[] {
    const weights = this.resolveWeights(options.weights);
    const excludeSeen = options.excludeSeen ?? true;
    const maxReasons = options.maxReasons ?? 3;
    const seen = new Set(signals.seenAnimeIds ?? []);

    const pool =
      excludeSeen && seen.size > 0
        ? candidates.filter((c) => !seen.has(c.id))
        : candidates;

    const context: ScoringContext = {
      historyProfile: this.buildHistoryProfile(signals.history ?? []),
      genreProfile: this.buildGenreProfile(signals),
    };

    const scored = pool.map((anime) => {
      const breakdown = this.scoreCandidate(anime, signals, context);
      const score = this.blend(breakdown, weights);
      const reasons = this.buildReasons(anime, breakdown, weights, maxReasons);
      return { anime, score, breakdown, reasons };
    });

    scored.sort((a, b) => b.score - a.score);

    return typeof options.limit === "number"
      ? scored.slice(0, options.limit)
      : scored;
  }

  /** Merge caller weights over defaults, then renormalize to sum 1. */
  resolveWeights(overrides?: Partial<ScoringWeights>): ScoringWeights {
    const merged: ScoringWeights = { ...DEFAULT_SCORING_WEIGHTS, ...overrides };
    return this.normalizeWeights(merged);
  }

  /**
   * Renormalize so active (non-zero) weights sum to 1.
   * Because disabled signals carry weight 0, they contribute nothing to the
   * total and are effectively removed from the blend (e.g. ratings in 2.2-B2).
   */
  normalizeWeights(weights: ScoringWeights): ScoringWeights {
    const total =
      weights.history +
      weights.genres +
      weights.ratings +
      weights.similarUsers +
      weights.trends;
    if (total <= 0) return { ...weights };
    return {
      history: weights.history / total,
      genres: weights.genres / total,
      ratings: weights.ratings / total,
      similarUsers: weights.similarUsers / total,
      trends: weights.trends / total,
    };
  }

  /** Combine per-signal contributions into the final score. */
  private blend(breakdown: ScoreBreakdown, weights: ScoringWeights): number {
    return clamp01(
      breakdown.history * weights.history +
        breakdown.genres * weights.genres +
        breakdown.ratings * weights.ratings +
        breakdown.similarUsers * weights.similarUsers +
        breakdown.trends * weights.trends,
    );
  }

  /** Assemble the per-signal breakdown for a single candidate. */
  private scoreCandidate(
    anime: CandidateAnime,
    signals: UserSignals,
    context: ScoringContext,
  ): ScoreBreakdown {
    return {
      history: this.affinity(this.traitsOf(anime), context.historyProfile),
      genres: this.affinity(this.traitsOf(anime), context.genreProfile),
      ratings: this.scoreRatings(anime, signals),
      similarUsers: this.scoreSimilarUsers(anime),
      trends: this.scoreTrends(anime),
    };
  }

  // --- History component (40%) --------------------------------------------

  /**
   * Build a normalized genre/theme affinity map from watch history, weighting
   * each entry by engagement (watched fraction) × recency (vs newest entry).
   */
  private buildHistoryProfile(
    history: WatchHistorySignal[],
  ): Map<string, number> {
    const profile = new Map<string, number>();
    if (history.length === 0) return profile;

    const times = history
      .map((h) => this.toTime(h.updatedAt))
      .filter((t): t is number => t !== null);
    const newest = times.length > 0 ? Math.max(...times) : null;

    for (const entry of history) {
      const weight =
        this.engagementOf(entry) * this.recencyWeight(entry, newest);
      if (weight <= 0) continue;
      for (const trait of this.traitsOf(entry)) {
        profile.set(trait, (profile.get(trait) ?? 0) + weight);
      }
    }
    return this.normalizeMap(profile);
  }

  /** Fraction of the anime actually watched, in [0, 1]. */
  private engagementOf(entry: WatchHistorySignal): number {
    if (entry.duration && entry.duration > 0) {
      return clamp01(entry.progress / entry.duration);
    }
    if (entry.progress <= 0) return 0;
    // No duration: treat progress as episodes against an assumed season length.
    return clamp01(entry.progress / ASSUMED_EPISODES);
  }

  /** Recency weight in (0, 1]; newest entry = 1, older entries decay. */
  private recencyWeight(
    entry: WatchHistorySignal,
    newest: number | null,
  ): number {
    const t = this.toTime(entry.updatedAt);
    if (t === null || newest === null) return 1;
    const age = Math.max(0, newest - t);
    return 1 / (1 + age / RECENCY_SCALE_MS);
  }

  // --- Genre component (20%) ----------------------------------------------

  /**
   * Build a normalized genre affinity map from the explicit/learned taste
   * profile, with favorite genres reinforced as a strong explicit signal.
   */
  private buildGenreProfile(signals: UserSignals): Map<string, number> {
    const profile = new Map<string, number>();
    for (const [trait, weight] of Object.entries(signals.tasteProfile ?? {})) {
      if (weight > 0) profile.set(trait, weight);
    }
    for (const genre of signals.favoriteGenres ?? []) {
      profile.set(genre, (profile.get(genre) ?? 0) + 3);
    }
    return this.normalizeMap(profile);
  }

  // --- Ratings component (0% in 2.2-B2) -----------------------------------

  /**
   * Explicit rating affinity, in [0, 1]. Fully computed but held out of the
   * final score by its 0 weight until rating data/UI exists.
   */
  private scoreRatings(anime: CandidateAnime, signals: UserSignals): number {
    const rating = signals.ratings?.[anime.id];
    return typeof rating === "number" ? clamp01(rating / 10) : 0;
  }

  // --- Similar-users component (15%, proxy) -------------------------------

  /**
   * Collaborative proxy until FASE 2.2-C: blends global quality, popularity and
   * trending. Deliberately emits NO "similar_users" reason (see buildReasons).
   */
  private scoreSimilarUsers(anime: CandidateAnime): number {
    const quality = clamp01((anime.score ?? 0) / 10);
    const popularity = popularityScore(anime.popularity);
    const trend = anime.trending ? 1 : 0;
    return clamp01(quality * 0.55 + popularity * 0.35 + trend * 0.1);
  }

  // --- Trends component (10%) ---------------------------------------------

  /** Trending membership, normalized to [0, 1]. */
  private scoreTrends(anime: CandidateAnime): number {
    return anime.trending ? 1 : 0;
  }

  // --- Reasons -------------------------------------------------------------

  /**
   * Emit the top explanations by weighted contribution (max `maxReasons`),
   * deduped by type. Never emits a collaborative "similar_users" reason while
   * that component is only a proxy, and skips ratings while its weight is 0.
   */
  private buildReasons(
    anime: CandidateAnime,
    breakdown: ScoreBreakdown,
    weights: ScoringWeights,
    maxReasons: number,
  ): RecommendationReason[] {
    const candidates: Array<
      RecommendationReason & { contribution: number }
    > = [];

    const historyContribution = breakdown.history * weights.history;
    if (historyContribution > 0) {
      candidates.push({
        type: "genre_similar",
        label: "Parecido com o que você tem assistido",
        contribution: historyContribution,
      });
    }

    const genreContribution = breakdown.genres * weights.genres;
    if (genreContribution > 0) {
      candidates.push({
        type: "genre_similar",
        label: "Combina com seus gêneros favoritos",
        contribution: genreContribution,
      });
    }

    const trendContribution = breakdown.trends * weights.trends;
    if (anime.trending && trendContribution > 0) {
      candidates.push({
        type: "trending",
        label: "Em alta agora",
        contribution: trendContribution,
      });
    }

    candidates.sort((a, b) => b.contribution - a.contribution);

    const reasons: RecommendationReason[] = [];
    const usedTypes = new Set<string>();
    for (const candidate of candidates) {
      if (usedTypes.has(candidate.type)) continue;
      usedTypes.add(candidate.type);
      reasons.push({ type: candidate.type, label: candidate.label });
      if (reasons.length >= maxReasons) break;
    }
    return reasons;
  }

  // --- Shared helpers ------------------------------------------------------

  /** Mean of the profile weights matched by the candidate's traits, in [0, 1]. */
  private affinity(traits: string[], profile: Map<string, number>): number {
    if (profile.size === 0 || traits.length === 0) return 0;
    let sum = 0;
    for (const trait of traits) sum += profile.get(trait) ?? 0;
    return clamp01(sum / traits.length);
  }

  /** Divide every weight by the max so the strongest trait becomes 1. */
  private normalizeMap(profile: Map<string, number>): Map<string, number> {
    let max = 0;
    for (const value of profile.values()) if (value > max) max = value;
    if (max <= 0) return profile;
    const normalized = new Map<string, number>();
    for (const [trait, value] of profile) normalized.set(trait, value / max);
    return normalized;
  }

  /** Genre + theme traits of an anime or history entry. */
  private traitsOf(item: {
    genres: string[];
    themes?: string[];
  }): string[] {
    return [...(item.genres ?? []), ...(item.themes ?? [])];
  }

  /** Normalize a timestamp-ish value to epoch ms, or null when absent/invalid. */
  private toTime(value?: Date | string | number): number | null {
    if (value === undefined || value === null) return null;
    const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  }
}
