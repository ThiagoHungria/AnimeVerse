/**
 * Backend recommendation engine — real behavior-based scoring.
 *
 * Combines:
 *  - preferred genres (explicit + learned)
 *  - watch history (most-watched traits)
 *  - favorites (strong signal)
 *  - MAL score (global quality)
 *  - tag/genre similarity
 *
 * Designed to be swapped for ML/AI later without changing the API contract.
 */

import type { ExternalAnimeDto } from "./jikan.service";

export type TasteProfile = Record<string, number>;

function traitsOf(anime: ExternalAnimeDto): string[] {
  return [...anime.genres, ...anime.themes];
}

export function buildTasteProfile(input: {
  preferredGenres: string[];
  genreScores: Record<string, number>;
  favoriteGenres: string[];
  historyGenres: string[];
}): TasteProfile {
  const profile: TasteProfile = { ...input.genreScores };
  for (const g of input.preferredGenres) {
    profile[g] = (profile[g] ?? 0) + 5;
  }
  for (const g of input.favoriteGenres) {
    profile[g] = (profile[g] ?? 0) + 3;
  }
  for (const g of input.historyGenres) {
    profile[g] = (profile[g] ?? 0) + 1;
  }
  return profile;
}

export function scoreAnime(
  anime: ExternalAnimeDto,
  profile: TasteProfile,
): number {
  const traits = traitsOf(anime);
  const affinity = traits.reduce((s, t) => s + (profile[t] ?? 0), 0);
  const normalizedAffinity = traits.length ? affinity / traits.length : 0;
  const quality = (anime.score ?? 0) / 10;
  const popularityBoost = anime.popularity
    ? 1 - Math.min(1, Math.log10(anime.popularity) / 4)
    : 0.2;
  return normalizedAffinity * 2 + quality * 0.6 + popularityBoost * 0.2;
}

export function recommend(
  pool: ExternalAnimeDto[],
  profile: TasteProfile,
  excludeIds: number[],
  limit = 18,
): ExternalAnimeDto[] {
  const exclude = new Set(excludeIds);
  const hasTaste = Object.keys(profile).length > 0;

  return pool
    .filter((a) => !exclude.has(a.id))
    .map((a) => ({
      anime: a,
      score: hasTaste ? scoreAnime(a, profile) : (a.score ?? 0) / 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.anime);
}

export function animeVerseScore(
  anime: ExternalAnimeDto,
  profile: TasteProfile = {},
): number {
  return Math.round(scoreAnime(anime, profile) * 100) / 10;
}
