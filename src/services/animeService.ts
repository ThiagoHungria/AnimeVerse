/**
 * Unified, source-agnostic anime service (the facade the whole app talks to).
 *
 * Orchestrates the providers with a clear precedence:
 *    1. Official MAL API (`malApi`)  — used when a client id is configured.
 *    2. Jikan API (`jikanApi`)       — always-available fallback/default.
 *    3. Local dataset (`fallbackData`) — offline/last-resort fallback.
 *
 * The UI and hooks depend ONLY on this module — never on a provider directly.
 * Adding another provider later means implementing it + slotting it into the
 * `runProviders` chain; the UI stays untouched.
 */

import { malApi } from "./malApi";
import { jikanApi, type DiscoverOptions } from "./jikanApi";
import { fallbackData } from "./fallbackData";
import {
  buildAnimeDetail,
  mapExternalListToSummaries,
} from "@/domain/anime.mapper";
import { seasonDateRange, type SeasonName } from "@/domain/external";
import type { Anime, AnimeSummary } from "@/types";

/**
 * Try the official MAL provider first (when configured), then Jikan. The local
 * fallback is handled per-method so callers always get *something* usable.
 */
async function runProviders<T>(
  withProvider: (provider: typeof malApi | typeof jikanApi) => Promise<T>,
): Promise<T> {
  if (malApi.isConfigured()) {
    try {
      return await withProvider(malApi);
    } catch {
      // fall through to Jikan
    }
  }
  return withProvider(jikanApi);
}

// --- Genre name <-> id resolution (cached) ---------------------------------

let genreListPromise: Promise<{ name: string; id: number }[]> | null = null;

async function loadGenres(): Promise<{ name: string; id: number }[]> {
  if (!genreListPromise) {
    genreListPromise = jikanApi
      .getGenres()
      .catch(() => {
        genreListPromise = null;
        return [];
      });
  }
  return genreListPromise;
}

async function resolveGenreId(name?: string): Promise<string | undefined> {
  if (!name) return undefined;
  const genres = await loadGenres();
  const match = genres.find((g) => g.name.toLowerCase() === name.toLowerCase());
  return match ? String(match.id) : undefined;
}

const isMalId = (id: string) => /^\d+$/.test(id);

export interface SearchParams {
  query?: string;
  genre?: string;
}

/** Advanced discovery filters (Explore page). */
export interface DiscoverFilters {
  genre?: string;
  year?: number;
  season?: SeasonName;
  minScore?: number;
  status?: "airing" | "complete" | "upcoming";
  type?: string;
  sort?: "score" | "popularity" | "rank";
}

export const animeService = {
  async getTrending(limit = 18): Promise<AnimeSummary[]> {
    try {
      return mapExternalListToSummaries(
        await runProviders((p) => p.getTop("airing", limit)),
      );
    } catch {
      return fallbackData.popular().slice(0, limit);
    }
  },

  async getPopular(limit = 18): Promise<AnimeSummary[]> {
    try {
      return mapExternalListToSummaries(
        await runProviders((p) => p.getTop("bypopularity", limit)),
      );
    } catch {
      return fallbackData.popular().slice(0, limit);
    }
  },

  async getTopRated(limit = 18): Promise<AnimeSummary[]> {
    try {
      return mapExternalListToSummaries(
        await runProviders((p) => p.getTop(undefined, limit)),
      );
    } catch {
      return fallbackData.popular().slice(0, limit);
    }
  },

  async getSeasonNow(limit = 18): Promise<AnimeSummary[]> {
    try {
      return mapExternalListToSummaries(
        await runProviders((p) => p.getSeasonNow(limit)),
      );
    } catch {
      return fallbackData.recent().slice(0, limit);
    }
  },

  async getFeatured(): Promise<AnimeSummary | null> {
    const top = await this.getTopRated(10);
    return top[0] ?? null;
  },

  async getById(id: string): Promise<Anime | null> {
    if (!isMalId(id)) return fallbackData.byId(id);
    try {
      const ext = await runProviders((p) => p.getById(Number(id)));
      // Episode metadata always comes from Jikan (MAL v2 has no episode list).
      const episodes = await jikanApi.getEpisodes(Number(id)).catch(() => []);
      return buildAnimeDetail(ext, episodes);
    } catch {
      return fallbackData.byId(id);
    }
  },

  async search({ query, genre }: SearchParams): Promise<AnimeSummary[]> {
    try {
      const genreId = await resolveGenreId(genre);
      const list = await runProviders((p) =>
        p.discover({
          q: query?.trim() || undefined,
          genres: genreId,
          order_by: query?.trim() ? undefined : "popularity",
          sort: "desc",
          limit: 24,
        }),
      );
      return mapExternalListToSummaries(list);
    } catch {
      const q = query?.trim().toLowerCase();
      return fallbackData
        .all()
        .filter(
          (a) =>
            (!q ||
              a.title.toLowerCase().includes(q) ||
              a.genres.some((g) => g.toLowerCase().includes(q))) &&
            (!genre || a.genres.includes(genre)),
        );
    }
  },

  /** Advanced multi-criteria discovery for the Explore page. */
  async discover(filters: DiscoverFilters): Promise<AnimeSummary[]> {
    try {
      const genreId = await resolveGenreId(filters.genre);
      const options: DiscoverOptions = {
        genres: genreId,
        min_score: filters.minScore,
        status: filters.status,
        type: filters.type,
        order_by: filters.sort ?? "popularity",
        sort: "desc",
        limit: 24,
      };
      if (filters.year) {
        const { start, end } = seasonDateRange(filters.year, filters.season);
        options.start_date = start;
        options.end_date = end;
      }
      // Advanced filters are Jikan-specific; use it directly here.
      return mapExternalListToSummaries(await jikanApi.discover(options));
    } catch {
      return fallbackData.popular();
    }
  },

  async getGenres(): Promise<string[]> {
    try {
      const genres = await loadGenres();
      if (genres.length === 0) return fallbackData.genres();
      return genres.map((g) => g.name).sort((a, b) => a.localeCompare(b));
    } catch {
      return fallbackData.genres();
    }
  },

  async getSimilar(id: string, limit = 12): Promise<AnimeSummary[]> {
    if (!isMalId(id)) return fallbackData.popular().slice(0, limit);
    try {
      // Similarity uses Jikan's recommendation graph (richest source).
      const list = await jikanApi.getRecommendations(Number(id));
      return mapExternalListToSummaries(list).slice(0, limit);
    } catch {
      return fallbackData.popular().slice(0, limit);
    }
  },

  /**
   * Broad, de-duplicated candidate pool for the intelligence engine
   * (recommendations, hidden gems, own ranking, discovery collections).
   */
  async getDiscoveryPool(): Promise<AnimeSummary[]> {
    try {
      const [top, popular, season] = await Promise.all([
        this.getTopRated(25),
        this.getPopular(25),
        this.getSeasonNow(25),
      ]);
      const seen = new Set<string>();
      const pool: AnimeSummary[] = [];
      for (const anime of [...top, ...popular, ...season]) {
        if (seen.has(anime.id)) continue;
        seen.add(anime.id);
        pool.push(anime);
      }
      return pool;
    } catch {
      return fallbackData.popular();
    }
  },

  async getCharacters(id: string) {
    if (!isMalId(id)) return [];
    try {
      return await jikanApi.getCharacters(Number(id));
    } catch {
      return [];
    }
  },

  async getStaff(id: string) {
    if (!isMalId(id)) return [];
    try {
      return await jikanApi.getStaff(Number(id));
    } catch {
      return [];
    }
  },
};
