/**
 * Official MyAnimeList API v2 provider (primary source when configured).
 *
 * The MAL API requires a client id (`X-MAL-CLIENT-ID`). Set it via the
 * `NEXT_PUBLIC_MAL_CLIENT_ID` env var to enable this provider. When it is not
 * configured (or a request fails), `animeService` transparently falls back to
 * the Jikan provider, so the app works out of the box with zero setup.
 *
 * Like every provider, it normalizes raw payloads into `ExternalAnime`; the UI
 * never imports it directly.
 */

import {
  parseDurationMinutes,
  type ExternalAnime,
} from "@/domain/external";
import type { DiscoverOptions, TopFilter } from "./jikanApi";

const BASE_URL = "https://api.myanimelist.net/v2";
const CLIENT_ID = process.env.NEXT_PUBLIC_MAL_CLIENT_ID;

/** Fields requested from MAL detail/list endpoints. */
const FIELDS = [
  "id",
  "title",
  "alternative_titles",
  "main_picture",
  "synopsis",
  "mean",
  "rank",
  "popularity",
  "num_list_users",
  "num_episodes",
  "average_episode_duration",
  "status",
  "genres",
  "media_type",
  "start_season",
  "studios",
  "background",
].join(",");

// --- Raw MAL shapes ---------------------------------------------------------

interface MalPicture {
  medium?: string;
  large?: string;
}
interface MalNamed {
  id: number;
  name: string;
}
interface MalNode {
  id: number;
  title: string;
  alternative_titles?: { en?: string };
  main_picture?: MalPicture;
  synopsis?: string;
  mean?: number;
  rank?: number;
  popularity?: number;
  num_list_users?: number;
  num_episodes?: number;
  average_episode_duration?: number;
  status?: string;
  genres?: MalNamed[];
  media_type?: string;
  start_season?: { year?: number; season?: string };
  studios?: MalNamed[];
  background?: string;
}
interface MalListResponse {
  data: { node: MalNode }[];
}

function toExternal(node: MalNode): ExternalAnime {
  return {
    id: node.id,
    title: node.title,
    titleEnglish: node.alternative_titles?.en || undefined,
    synopsis: node.synopsis || undefined,
    poster: node.main_picture?.large || node.main_picture?.medium,
    banner: node.main_picture?.large || node.main_picture?.medium,
    score: node.mean ?? undefined,
    rank: node.rank ?? undefined,
    popularity: node.popularity ?? undefined,
    members: node.num_list_users ?? undefined,
    // MAL v2 lumps genres/themes/demographics together under "genres".
    genres: (node.genres ?? []).map((g) => g.name),
    themes: [],
    demographics: [],
    studios: (node.studios ?? []).map((s) => s.name),
    status: node.status ?? undefined,
    type: node.media_type?.toUpperCase(),
    episodes: node.num_episodes ?? undefined,
    durationMinutes: node.average_episode_duration
      ? Math.round(node.average_episode_duration / 60)
      : undefined,
    season: node.start_season?.season,
    year: node.start_season?.year,
    background: node.background || undefined,
    source: "mal",
  };
}

const RANKING_BY_FILTER: Record<TopFilter, string> = {
  airing: "airing",
  upcoming: "upcoming",
  bypopularity: "bypopularity",
  favorite: "favorite",
};

async function malGet<T>(path: string): Promise<T> {
  if (!CLIENT_ID) throw new Error("MAL client id not configured");
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-MAL-CLIENT-ID": CLIENT_ID },
  });
  if (!res.ok) throw new Error(`MAL request failed (${res.status})`);
  return (await res.json()) as T;
}

const q = (params: Record<string, string | number | undefined>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
};

export const malApi = {
  /** Whether the official MAL provider is usable in this environment. */
  isConfigured: () => Boolean(CLIENT_ID),

  async getTop(filter?: TopFilter, limit = 24): Promise<ExternalAnime[]> {
    const ranking = filter ? RANKING_BY_FILTER[filter] : "all";
    const res = await malGet<MalListResponse>(
      `/anime/ranking${q({ ranking_type: ranking, limit, fields: FIELDS })}`,
    );
    return res.data.map((d) => toExternal(d.node));
  },

  async getById(id: number): Promise<ExternalAnime> {
    const node = await malGet<MalNode>(`/anime/${id}${q({ fields: FIELDS })}`);
    return toExternal(node);
  },

  async discover(options: DiscoverOptions): Promise<ExternalAnime[]> {
    // MAL's search is limited (no rich filters); we use the keyword search and
    // let the service layer post-filter. Falls back to a popularity ranking.
    if (options.q) {
      const res = await malGet<MalListResponse>(
        `/anime${q({ q: options.q, limit: options.limit ?? 24, fields: FIELDS })}`,
      );
      return res.data.map((d) => toExternal(d.node));
    }
    return this.getTop("bypopularity", options.limit ?? 24);
  },

  async getSeasonNow(limit = 24): Promise<ExternalAnime[]> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const season =
      month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "fall";
    const res = await malGet<MalListResponse>(
      `/anime/season/${now.getFullYear()}/${season}${q({
        limit,
        fields: FIELDS,
        sort: "anime_num_list_users",
      })}`,
    );
    return res.data.map((d) => toExternal(d.node));
  },
};
