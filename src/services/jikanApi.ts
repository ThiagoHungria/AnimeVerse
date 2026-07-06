/**
 * Jikan v4 provider (unofficial MyAnimeList API) — the always-available source.
 *
 * Acts as the fallback/default provider behind `animeService`. Responsibilities:
 *  - Talk to the network and normalize raw Jikan payloads into `ExternalAnime`.
 *  - Centralize rate-limiting (Jikan allows ~3 req/s) and retry `429`.
 *
 * The UI never imports this directly — only `animeService` does.
 */

import {
  parseDurationMinutes,
  type ExternalAnime,
} from "@/domain/external";

const BASE_URL = "https://api.jikan.moe/v4";

// --- Raw Jikan shapes (only the fields we consume) -------------------------

interface JikanImageSet {
  jpg?: { image_url?: string; large_image_url?: string };
}
interface JikanNamedEntity {
  mal_id: number;
  name: string;
}
interface JikanTrailer {
  youtube_id?: string | null;
  embed_url?: string | null;
  images?: { maximum_image_url?: string | null; large_image_url?: string | null };
}
interface JikanAnime {
  mal_id: number;
  images?: JikanImageSet;
  trailer?: JikanTrailer;
  title: string;
  title_english?: string | null;
  type?: string | null;
  episodes?: number | null;
  status?: string | null;
  duration?: string | null;
  score?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  synopsis?: string | null;
  background?: string | null;
  season?: string | null;
  year?: number | null;
  studios?: JikanNamedEntity[];
  genres?: JikanNamedEntity[];
  themes?: JikanNamedEntity[];
  demographics?: JikanNamedEntity[];
}
export interface JikanEpisode {
  mal_id: number;
  title?: string | null;
  aired?: string | null;
  filler?: boolean;
  recap?: boolean;
}
interface JikanGenre {
  mal_id: number;
  name: string;
}
interface JikanList<T> {
  data: T[];
}
interface JikanItem<T> {
  data: T;
}

export type TopFilter = "airing" | "upcoming" | "bypopularity" | "favorite";

export interface DiscoverOptions {
  q?: string;
  genres?: string;
  order_by?: "score" | "popularity" | "rank" | "members" | "favorites";
  sort?: "asc" | "desc";
  type?: string;
  status?: "airing" | "complete" | "upcoming";
  min_score?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// --- Rate-limited request scheduler ----------------------------------------

const MIN_GAP_MS = 450;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastRequestAt = 0;
let chain: Promise<unknown> = Promise.resolve();

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
    lastRequestAt = Date.now();
    return task();
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function jget<T>(path: string, retries = 3): Promise<T> {
  return schedule(async () => {
    let attempt = 0;
    while (true) {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { Accept: "application/json" },
      });
      if (res.status === 429 && attempt < retries) {
        attempt += 1;
        await sleep(800 * attempt);
        continue;
      }
      if (!res.ok) {
        throw new Error(`Jikan request failed (${res.status}) for ${path}`);
      }
      return (await res.json()) as T;
    }
  });
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== null) {
      qs.set(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

const names = (list?: JikanNamedEntity[]): string[] =>
  (list ?? []).map((e) => e.name);

/** Normalize a raw Jikan anime into the provider-neutral model. */
function toExternal(raw: JikanAnime): ExternalAnime {
  return {
    id: raw.mal_id,
    title: raw.title,
    titleEnglish: raw.title_english ?? undefined,
    synopsis:
      raw.synopsis?.replace(/\[Written by MAL Rewrite\]/i, "").trim() ||
      undefined,
    poster: raw.images?.jpg?.large_image_url || raw.images?.jpg?.image_url,
    banner:
      raw.trailer?.images?.maximum_image_url ||
      raw.trailer?.images?.large_image_url ||
      raw.images?.jpg?.large_image_url ||
      undefined,
    score: raw.score ?? undefined,
    rank: raw.rank ?? undefined,
    popularity: raw.popularity ?? undefined,
    members: raw.members ?? undefined,
    favorites: raw.favorites ?? undefined,
    genres: names(raw.genres),
    themes: names(raw.themes),
    demographics: names(raw.demographics),
    studios: names(raw.studios),
    status: raw.status ?? undefined,
    type: raw.type ?? undefined,
    episodes: raw.episodes ?? undefined,
    durationMinutes: parseDurationMinutes(raw.duration),
    season: raw.season ?? undefined,
    year: raw.year ?? undefined,
    trailerEmbedUrl: raw.trailer?.embed_url ?? undefined,
    trailerYoutubeId: raw.trailer?.youtube_id ?? undefined,
    background: raw.background ?? undefined,
    source: "jikan",
  };
}

// --- Public API -------------------------------------------------------------

export const jikanApi = {
  isConfigured: () => true,

  async getTop(filter?: TopFilter, limit = 24, page = 1): Promise<ExternalAnime[]> {
    const res = await jget<JikanList<JikanAnime>>(
      `/top/anime${buildQuery({ filter, limit, page, sfw: "true" })}`,
    );
    return res.data.map(toExternal);
  },

  async getById(id: number): Promise<ExternalAnime> {
    const res = await jget<JikanItem<JikanAnime>>(`/anime/${id}/full`);
    return toExternal(res.data);
  },

  async discover(options: DiscoverOptions): Promise<ExternalAnime[]> {
    const res = await jget<JikanList<JikanAnime>>(
      `/anime${buildQuery({
        q: options.q,
        genres: options.genres,
        order_by: options.order_by,
        sort: options.sort,
        type: options.type,
        status: options.status,
        min_score: options.min_score,
        start_date: options.start_date,
        end_date: options.end_date,
        page: options.page ?? 1,
        limit: options.limit ?? 24,
        sfw: "true",
      })}`,
    );
    return res.data.map(toExternal);
  },

  async getSeasonNow(limit = 24): Promise<ExternalAnime[]> {
    const res = await jget<JikanList<JikanAnime>>(
      `/seasons/now${buildQuery({ limit, sfw: "true" })}`,
    );
    return res.data.map(toExternal);
  },

  async getGenres(): Promise<{ id: number; name: string }[]> {
    const res = await jget<JikanList<JikanGenre>>(`/genres/anime`);
    return res.data.map((g) => ({ id: g.mal_id, name: g.name }));
  },

  async getRecommendations(id: number): Promise<ExternalAnime[]> {
    const res = await jget<JikanList<{ entry: JikanAnime }>>(
      `/anime/${id}/recommendations`,
    );
    return res.data.map((r) => toExternal(r.entry));
  },

  async getEpisodes(id: number, page = 1): Promise<JikanEpisode[]> {
    const res = await jget<JikanList<JikanEpisode>>(
      `/anime/${id}/episodes${buildQuery({ page })}`,
    );
    return res.data;
  },

  async getCharacters(id: number): Promise<
    { id: string; name: string; image: string; role: string; voiceActor?: string }[]
  > {
    interface JikanCharEntry {
      character: {
        mal_id: number;
        name: string;
        images?: { jpg?: { image_url?: string } };
      };
      role: string;
    }
    const res = await jget<JikanList<JikanCharEntry>>(
      `/anime/${id}/characters`,
    );
    const base: {
      id: string;
      name: string;
      image: string;
      role: string;
      voiceActor?: string;
    }[] = res.data.map((entry) => ({
      id: String(entry.character.mal_id),
      name: entry.character.name,
      image: entry.character.images?.jpg?.image_url ?? "",
      role: entry.role,
    }));

    const mains = base.filter((c) => c.role === "Main").slice(0, 6);
    await Promise.all(
      mains.map(async (ch) => {
        try {
          interface JikanCharFull {
            data: {
              voices?: { person: { name: string }; language: string }[];
            };
          }
          const full = await jget<JikanCharFull>(`/characters/${ch.id}/full`);
          const jp =
            full.data.voices?.find((v) => v.language === "Japanese") ??
            full.data.voices?.[0];
          if (jp) ch.voiceActor = jp.person.name;
        } catch {
          /* voice optional */
        }
      }),
    );

    return base;
  },

  async getStaff(id: number): Promise<
    { id: string; name: string; image: string; positions: string[] }[]
  > {
    interface JikanStaffEntry {
      person: {
        mal_id: number;
        name: string;
        images?: { jpg?: { image_url?: string } };
      };
      positions: string[];
    }
    const res = await jget<JikanList<JikanStaffEntry>>(`/anime/${id}/staff`);
    return res.data.map((entry) => ({
      id: String(entry.person.mal_id),
      name: entry.person.name,
      image: entry.person.images?.jpg?.image_url ?? "",
      positions: entry.positions,
    }));
  },
};
