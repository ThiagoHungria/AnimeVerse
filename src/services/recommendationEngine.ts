/**
 * AnimeVerse Recommendation Engine — production-grade scoring layer.
 *
 * Combines taste profile, favorites, watch history, interaction time,
 * global popularity and MAL score into ranked feeds for the UI.
 */

import type { AnimeSummary } from "@/types";
import {
  findSimilar,
  getHiddenGems,
  recommend,
  similarityScore,
  type TasteProfile,
} from "@/services/intelligenceEngine";

export interface UserBehavior {
  tasteProfile: TasteProfile;
  favoriteIds: Set<string>;
  watchedAnimeIds: Set<string>;
  /** Sum of progress seconds per anime (interaction proxy). */
  watchTimeByAnime: Record<string, number>;
}

export interface RecommendationFeed {
  id: string;
  title: string;
  eyebrow: string;
  animes: AnimeSummary[];
}

function traitsOf(anime: AnimeSummary): string[] {
  return [...anime.genres, ...anime.themes, ...anime.demographics];
}

function malQuality(anime: AnimeSummary): number {
  return anime.rating / 10;
}

function popularityScore(anime: AnimeSummary): number {
  if (!anime.popularity) return 0.35;
  return 1 - Math.min(1, Math.log10(anime.popularity) / 4);
}

function interactionBoost(anime: AnimeSummary, behavior: UserBehavior): number {
  const watchSec = behavior.watchTimeByAnime[anime.id] ?? 0;
  const watched = behavior.watchedAnimeIds.has(anime.id) ? 0.15 : 0;
  const favorited = behavior.favoriteIds.has(anime.id) ? 0.25 : 0;
  return Math.min(0.5, watchSec / 3600 + watched + favorited);
}

function tasteAffinity(anime: AnimeSummary, profile: TasteProfile): number {
  const traits = traitsOf(anime);
  if (traits.length === 0) return 0;
  const sum = traits.reduce((acc, t) => acc + (profile[t] ?? 0), 0);
  return sum / traits.length;
}

function compositeScore(anime: AnimeSummary, behavior: UserBehavior): number {
  const taste = tasteAffinity(anime, behavior.tasteProfile);
  const quality = malQuality(anime);
  const pop = popularityScore(anime);
  const interaction = interactionBoost(anime, behavior);
  const hasTaste = Object.keys(behavior.tasteProfile).length > 0;

  if (!hasTaste) {
    return quality * 0.6 + pop * 0.4;
  }

  return taste * 0.45 + quality * 0.3 + pop * 0.15 + interaction * 0.1;
}

function rankPool(
  pool: AnimeSummary[],
  behavior: UserBehavior,
  options: { exclude?: Set<string>; limit?: number } = {},
): AnimeSummary[] {
  const exclude = options.exclude ?? new Set<string>();
  return pool
    .filter((a) => !exclude.has(a.id))
    .map((a) => ({ anime: a, score: compositeScore(a, behavior) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 18)
    .map((s) => s.anime);
}

/** "Recomendado para você" — full behavioral + MAL scoring. */
export function recommendForYou(
  pool: AnimeSummary[],
  behavior: UserBehavior,
  limit = 18,
): AnimeSummary[] {
  const exclude = new Set([...behavior.favoriteIds]);
  const hasTaste = Object.keys(behavior.tasteProfile).length > 0;

  if (!hasTaste && behavior.watchedAnimeIds.size === 0) {
    return rankPool(pool, behavior, { exclude, limit });
  }

  return rankPool(pool, behavior, { exclude, limit });
}

/** "Baseado no seu gosto" — strict taste affinity. */
export function recommendByTaste(
  pool: AnimeSummary[],
  behavior: UserBehavior,
  limit = 18,
): AnimeSummary[] {
  const exclude = new Set([
    ...behavior.favoriteIds,
    ...behavior.watchedAnimeIds,
  ]);

  return pool
    .filter((a) => !exclude.has(a.id))
    .map((a) => ({
      anime: a,
      score: tasteAffinity(a, behavior.tasteProfile) * 2 + malQuality(a),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.anime);
}

/** Similar to a target anime with user taste re-ranking. */
export function recommendSimilar(
  target: AnimeSummary,
  pool: AnimeSummary[],
  behavior: UserBehavior,
  limit = 12,
): AnimeSummary[] {
  const base = findSimilar(target, pool, limit * 2);
  return base
    .map((a) => ({
      anime: a,
      score:
        similarityScore(target, a) * 0.7 +
        compositeScore(a, behavior) * 0.3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.anime);
}

/** Trending now — popularity + quality. */
export function getTrendingNow(
  pool: AnimeSummary[],
  limit = 18,
): AnimeSummary[] {
  return [...pool]
    .sort(
      (a, b) =>
        popularityScore(b) * 0.5 +
        malQuality(b) * 0.5 -
        (popularityScore(a) * 0.5 + malQuality(a) * 0.5),
    )
    .slice(0, limit);
}

/** Hidden gems with optional taste boost. */
export function getHiddenGemsForUser(
  pool: AnimeSummary[],
  behavior: UserBehavior,
  limit = 18,
): AnimeSummary[] {
  const gems = getHiddenGems(pool, limit * 2);
  return gems
    .map((a) => ({
      anime: a,
      score: compositeScore(a, behavior),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.anime);
}

/** Build all home feed sections from one pool fetch. */
export function buildHomeFeeds(
  pool: AnimeSummary[],
  behavior: UserBehavior,
  trending: AnimeSummary[],
): RecommendationFeed[] {
  const personalized = Object.keys(behavior.tasteProfile).length > 0;

  const feeds: RecommendationFeed[] = [
    {
      id: "for-you",
      title: "Recomendado para você",
      eyebrow: personalized ? "Curadoria viva" : "Comece a explorar",
      animes: recommendForYou(pool, behavior),
    },
  ];

  if (personalized) {
    feeds.push({
      id: "by-taste",
      title: "Baseado no seu gosto",
      eyebrow: "Afinidade máxima",
      animes: recommendByTaste(pool, behavior),
    });
  }

  feeds.push(
    {
      id: "trending",
      title: "Trending agora",
      eyebrow: "Em alta no mundo",
      animes: trending.length ? trending : getTrendingNow(pool),
    },
    {
      id: "hidden-gems",
      title: "Hidden gems",
      eyebrow: "Joias escondidas",
      animes: getHiddenGemsForUser(pool, behavior),
    },
  );

  return feeds.filter((f) => f.animes.length > 0);
}

/** Legacy bridge — delegates to intelligence engine when no behavior context. */
export { recommend, findSimilar, getHiddenGems };
