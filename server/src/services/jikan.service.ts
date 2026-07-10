/**
 * Jikan API client for the backend anime catalog.
 * Rate-limited to respect Jikan's ~3 req/s cap.
 */

export interface ExternalAnimeDto {
  id: number;
  title: string;
  titleEnglish?: string;
  synopsis?: string;
  poster?: string;
  banner?: string;
  score?: number;
  rank?: number;
  popularity?: number;
  genres: string[];
  themes: string[];
  status?: string;
  type?: string;
  episodes?: number;
  season?: string;
  year?: number;
}

interface JikanNamed {
  name: string;
}
interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  synopsis?: string | null;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
  trailer?: {
    images?: { maximum_image_url?: string | null; large_image_url?: string | null };
  };
  score?: number | null;
  rank?: number | null;
  popularity?: number | null;
  genres?: JikanNamed[];
  themes?: JikanNamed[];
  status?: string | null;
  type?: string | null;
  episodes?: number | null;
  season?: string | null;
  year?: number | null;
}

const BASE = "https://api.jikan.moe/v4";
const MIN_GAP = 450;
/** Jikan caps `limit` at 25; requesting more returns HTTP 400. */
const MAX_LIMIT = 25;
let lastAt = 0;
let chain: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Clamp any requested page size into Jikan's accepted [1, 25] range. */
const clampLimit = (n: number): number =>
  Math.min(Math.max(1, Math.trunc(n || 0)), MAX_LIMIT);

async function jget<T>(path: string): Promise<T> {
  const run = chain.then(async () => {
    const elapsed = Date.now() - lastAt;
    if (elapsed < MIN_GAP) await sleep(MIN_GAP - elapsed);
    lastAt = Date.now();
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Jikan ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function map(raw: JikanAnime): ExternalAnimeDto {
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
    genres: (raw.genres ?? []).map((g) => g.name),
    themes: (raw.themes ?? []).map((g) => g.name),
    status: raw.status ?? undefined,
    type: raw.type ?? undefined,
    episodes: raw.episodes ?? undefined,
    season: raw.season ?? undefined,
    year: raw.year ?? undefined,
  };
}

export const jikanClient = {
  async getTrending(limit = 18): Promise<ExternalAnimeDto[]> {
    const res = await jget<{ data: JikanAnime[] }>(
      `/top/anime?filter=airing&limit=${clampLimit(limit)}&sfw=true`,
    );
    return res.data.map(map);
  },

  async getPopular(limit = 18): Promise<ExternalAnimeDto[]> {
    const res = await jget<{ data: JikanAnime[] }>(
      `/top/anime?filter=bypopularity&limit=${clampLimit(limit)}&sfw=true`,
    );
    return res.data.map(map);
  },

  async getById(id: number): Promise<ExternalAnimeDto> {
    const res = await jget<{ data: JikanAnime }>(`/anime/${id}/full`);
    return map(res.data);
  },

  async search(q: string, limit = 24): Promise<ExternalAnimeDto[]> {
    const res = await jget<{ data: JikanAnime[] }>(
      `/anime?q=${encodeURIComponent(q)}&limit=${clampLimit(limit)}&sfw=true&order_by=popularity&sort=desc`,
    );
    return res.data.map(map);
  },

  async getPool(limit = 25): Promise<ExternalAnimeDto[]> {
    const size = clampLimit(limit);
    const [top, popular] = await Promise.all([
      jget<{ data: JikanAnime[] }>(`/top/anime?limit=${size}&sfw=true`),
      jget<{ data: JikanAnime[] }>(
        `/top/anime?filter=bypopularity&limit=${size}&sfw=true`,
      ),
    ]);
    const seen = new Set<number>();
    const pool: ExternalAnimeDto[] = [];
    for (const raw of [...top.data, ...popular.data]) {
      if (seen.has(raw.mal_id)) continue;
      seen.add(raw.mal_id);
      pool.push(map(raw));
    }
    return pool;
  },
};
