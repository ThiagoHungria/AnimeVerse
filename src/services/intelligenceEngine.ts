/**
 * Anime Intelligence Engine — AnimeVerse's proprietary intelligence layer.
 *
 * Pure, deterministic, side-effect-free functions that power the product's
 * differentiation:
 *   1. Personalized recommendations (history / favorites / genres).
 *   2. Smart human tags (re-exported from the domain layer).
 *   3. Anime similarity (genre + theme + score).
 *   4. AnimeVerse's own ranking (MAL score + popularity + engagement).
 *   5. Intent-based smart-filter collections.
 *
 * Kept I/O-free so it can run on client or server and is trivial to test.
 */

import type { AnimeSummary, DiscoveryCollection } from "@/types";
import { buildSmartTags, isHiddenGem } from "@/domain/smartTags";

export { buildSmartTags as generateSmartTags };

/** Weighted taste profile: how much the user likes each trait. */
export type TasteProfile = Record<string, number>;

/** All signals (genres/themes/demographics) describing an anime. */
function traitsOf(anime: AnimeSummary): string[] {
  return [...anime.genres, ...anime.themes, ...anime.demographics];
}

// ---------------------------------------------------------------------------
// 1. Personalized recommendations
// ---------------------------------------------------------------------------

export function scoreForUser(
  anime: AnimeSummary,
  profile: TasteProfile,
): number {
  const traits = traitsOf(anime);
  const affinity = traits.reduce((sum, t) => sum + (profile[t] ?? 0), 0);
  const normalizedAffinity = traits.length ? affinity / traits.length : 0;
  const quality = anime.rating / 10;
  return normalizedAffinity * 2 + quality;
}

export function recommend(
  pool: AnimeSummary[],
  profile: TasteProfile,
  options: { exclude?: string[]; limit?: number } = {},
): AnimeSummary[] {
  const exclude = new Set(options.exclude ?? []);
  const hasTaste = Object.keys(profile).length > 0;

  return pool
    .filter((a) => !exclude.has(a.id))
    .map((a) => ({
      anime: a,
      score: hasTaste ? scoreForUser(a, profile) : a.rating / 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 18)
    .map((s) => s.anime);
}

// ---------------------------------------------------------------------------
// 3. Similarity engine (genre + theme + score)
// ---------------------------------------------------------------------------

export function similarityScore(a: AnimeSummary, b: AnimeSummary): number {
  const setA = new Set(traitsOf(a));
  const setB = new Set(traitsOf(b));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection += 1;
  const union = new Set([...setA, ...setB]).size;
  const jaccard = intersection / union;

  const scoreCloseness = 1 - Math.min(1, Math.abs(a.rating - b.rating) / 10);
  return jaccard * 0.8 + scoreCloseness * 0.2;
}

export function findSimilar(
  target: AnimeSummary,
  pool: AnimeSummary[],
  limit = 12,
): AnimeSummary[] {
  return pool
    .filter((a) => a.id !== target.id)
    .map((a) => ({ anime: a, score: similarityScore(target, a) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.anime);
}

// ---------------------------------------------------------------------------
// 4. AnimeVerse's own ranking
// ---------------------------------------------------------------------------

/**
 * Composite "AnimeVerse Score" (0..100): blends MAL quality, global popularity
 * and personal engagement, with a small boost for under-discovered gems.
 */
export function animeVerseScore(
  anime: AnimeSummary,
  profile: TasteProfile = {},
): number {
  const quality = anime.rating / 10; // 0..1
  // Popularity rank: smaller number = more popular. Map to 0..1.
  const popularity = anime.popularity
    ? 1 - Math.min(1, Math.log10(anime.popularity) / 4)
    : 0.3;
  const traits = traitsOf(anime);
  const affinityRaw = traits.reduce((s, t) => s + (profile[t] ?? 0), 0);
  const engagement = Math.min(1, affinityRaw / 20);
  const gemBoost = isHiddenGem({
    rating: anime.rating,
    popularity: anime.popularity,
    members: anime.members,
  })
    ? 0.05
    : 0;

  const score =
    quality * 0.55 + popularity * 0.2 + engagement * 0.25 + gemBoost;
  return Math.round(Math.min(1, score) * 1000) / 10;
}

export function rankByAnimeVerseScore(
  pool: AnimeSummary[],
  profile: TasteProfile = {},
): AnimeSummary[] {
  return [...pool].sort(
    (a, b) => animeVerseScore(b, profile) - animeVerseScore(a, profile),
  );
}

// ---------------------------------------------------------------------------
// 5. Smart filters & intent-based collections
// ---------------------------------------------------------------------------

const hasAny = (anime: AnimeSummary, labels: string[]) => {
  const traits = new Set(traitsOf(anime));
  return labels.some((l) => traits.has(l));
};

export const smartFilters = {
  marathon: (a: AnimeSummary) =>
    a.episodeCount > 0 && a.episodeCount <= 13 && a.rating >= 7,
  hiddenGems: (a: AnimeSummary) =>
    isHiddenGem({ rating: a.rating, popularity: a.popularity, members: a.members }),
  underrated: (a: AnimeSummary) =>
    a.rating >= 7.8 && (a.popularity ?? 0) > 800,
  emotional: (a: AnimeSummary) =>
    hasAny(a, ["Drama", "Romance", "Slice of Life"]),
  highIntensity: (a: AnimeSummary) =>
    hasAny(a, ["Action", "Sports", "Super Power", "Martial Arts"]),
  mindBending: (a: AnimeSummary) =>
    hasAny(a, ["Psychological", "Mystery", "Suspense", "Sci-Fi"]),
  weekendBinge: (a: AnimeSummary) =>
    a.episodeCount >= 12 && a.episodeCount <= 26 && a.rating >= 7.5,
};

/** Highly rated but under-discovered animes (Hidden Gems). */
export function getHiddenGems(
  pool: AnimeSummary[],
  limit = 18,
): AnimeSummary[] {
  return pool
    .filter(smartFilters.hiddenGems)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function buildDiscoveryCollections(
  pool: AnimeSummary[],
): DiscoveryCollection[] {
  const make = (
    id: string,
    title: string,
    description: string,
    predicate: (a: AnimeSummary) => boolean,
    sort?: (a: AnimeSummary, b: AnimeSummary) => number,
  ): DiscoveryCollection => {
    const animes = pool.filter(predicate);
    if (sort) animes.sort(sort);
    return { id, title, description, animes: animes.slice(0, 18) };
  };

  return [
    make(
      "hidden-gems",
      "Joias escondidas",
      "Ótimas notas, ainda pouco descobertas.",
      smartFilters.hiddenGems,
      (a, b) => b.rating - a.rating,
    ),
    make(
      "marathon",
      "Para maratonar hoje",
      "Séries curtas que você termina rápido.",
      smartFilters.marathon,
      (a, b) => b.rating - a.rating,
    ),
    make(
      "underrated",
      "Top subestimados",
      "Nota alta, fama injustamente baixa.",
      smartFilters.underrated,
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
    ),
    make(
      "high-intensity",
      "Alta adrenalina",
      "Ação e energia do início ao fim.",
      smartFilters.highIntensity,
      (a, b) => b.rating - a.rating,
    ),
    make(
      "emotional",
      "Histórias emocionais",
      "Tramas que mexem com o coração.",
      smartFilters.emotional,
      (a, b) => b.rating - a.rating,
    ),
    make(
      "mind-bending",
      "Narrativas profundas",
      "Para quem gosta de pensar enquanto assiste.",
      smartFilters.mindBending,
      (a, b) => b.rating - a.rating,
    ),
  ].filter((c) => c.animes.length > 0);
}
