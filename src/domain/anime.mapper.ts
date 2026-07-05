/**
 * Mapping layer: provider-neutral `ExternalAnime` -> clean internal model.
 *
 * This is the single source of truth for translating external data into the
 * shapes the UI consumes. It standardizes fields, normalizes status, and runs
 * the intelligence layer (smart tags). Works identically for any provider
 * (MAL or Jikan) because both produce `ExternalAnime`.
 */

import type { ExternalAnime } from "@/domain/external";
import { normalizeStatus } from "@/domain/external";
import type { JikanEpisode } from "@/services/jikanApi";
import type { Anime, AnimeSummary, Episode } from "@/types";
import { buildSmartTags } from "./smartTags";

/**
 * Public sample videos used for playback in this MVP. MAL/Jikan cannot provide
 * streaming sources, so episodes are mapped onto these clips to keep the
 * player, history and "continue watching" features functional.
 */
const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

const MAX_SYNTHETIC_EPISODES = 50;

/**
 * Core mapper. Provider-agnostic external record -> internal summary, including
 * the intelligence layer's smart tags.
 */
export function mapExternalAnimeToInternal(ext: ExternalAnime): AnimeSummary {
  const { status, statusLabel } = normalizeStatus(ext.status);
  const rating = ext.score ?? 0;
  const episodeCount = ext.episodes ?? 0;

  const smartTags = buildSmartTags({
    genres: ext.genres,
    themes: ext.themes,
    demographics: ext.demographics,
    rating,
    episodeCount,
    popularity: ext.popularity,
    rank: ext.rank,
    members: ext.members,
    status,
    durationMinutes: ext.durationMinutes,
  });

  return {
    id: String(ext.id),
    malId: ext.id,
    title: ext.title,
    titleEnglish: ext.titleEnglish,
    description: ext.synopsis || "Sinopse não disponível.",
    image: ext.poster || "",
    banner: ext.banner || ext.poster || "",
    rating,
    rank: ext.rank,
    popularity: ext.popularity,
    members: ext.members,
    favorites: ext.favorites,
    genres: ext.genres,
    themes: ext.themes,
    demographics: ext.demographics,
    smartTags,
    studio: ext.studios[0],
    studios: ext.studios,
    status,
    statusLabel,
    type: ext.type,
    year: ext.year,
    season: ext.season,
    episodeCount,
    durationMinutes: ext.durationMinutes,
    trailerUrl: ext.trailerEmbedUrl,
    trailerYoutubeId: ext.trailerYoutubeId,
    source: ext.source,
  };
}

/** Map + de-duplicate a list of external animes. */
export function mapExternalListToSummaries(
  list: ExternalAnime[],
): AnimeSummary[] {
  const seen = new Set<string>();
  const result: AnimeSummary[] = [];
  for (const ext of list) {
    const id = String(ext.id);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(mapExternalAnimeToInternal(ext));
  }
  return result;
}

/** Build episodes from Jikan episode metadata (+ sample video sources). */
export function mapEpisodes(
  animeId: string,
  jikanEpisodes: JikanEpisode[],
  fallbackCount: number,
  animeImage: string,
  durationMinutes?: number,
): Episode[] {
  const durationSeconds = (durationMinutes ?? 24) * 60;

  const fromApi = jikanEpisodes.map((ep, index) => ({
    id: `${animeId}-ep-${index + 1}`,
    number: index + 1,
    title: ep.title?.trim() || `Episódio ${index + 1}`,
    videoUrl: SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length],
    thumbnail: animeImage,
    duration: durationSeconds,
    aired: ep.aired ?? undefined,
    filler: ep.filler,
    recap: ep.recap,
  }));

  if (fromApi.length > 0) return fromApi;

  const count = Math.min(fallbackCount || 1, MAX_SYNTHETIC_EPISODES);
  return Array.from({ length: count }, (_, index) => ({
    id: `${animeId}-ep-${index + 1}`,
    number: index + 1,
    title: `Episódio ${index + 1}`,
    videoUrl: SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length],
    thumbnail: animeImage,
    duration: durationSeconds,
  }));
}

/** Combine an external anime + episodes into the full detail model. */
export function buildAnimeDetail(
  ext: ExternalAnime,
  jikanEpisodes: JikanEpisode[],
): Anime {
  const summary = mapExternalAnimeToInternal(ext);
  return {
    ...summary,
    background: ext.background,
    episodes: mapEpisodes(
      summary.id,
      jikanEpisodes,
      summary.episodeCount,
      summary.image,
      summary.durationMinutes,
    ),
  };
}
