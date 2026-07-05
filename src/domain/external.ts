/**
 * Provider-neutral "external anime" model.
 *
 * Both data providers (`malApi`, `jikanApi`) normalize their raw payloads into
 * this single shape. The mapper (`mapExternalAnimeToInternal`) then turns it
 * into the clean internal domain model the UI consumes. This is the seam that
 * keeps the app decoupled from any specific API.
 */

import type { AnimeStatus } from "@/types";

export type AnimeSource = "mal" | "jikan";

export interface ExternalAnime {
  id: number;
  title: string;
  titleEnglish?: string;
  synopsis?: string;
  poster?: string;
  banner?: string;
  score?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  genres: string[];
  themes: string[];
  demographics: string[];
  studios: string[];
  /** Raw provider status string (normalized later). */
  status?: string;
  type?: string;
  episodes?: number;
  durationMinutes?: number;
  season?: string;
  year?: number;
  trailerEmbedUrl?: string;
  trailerYoutubeId?: string;
  background?: string;
  source: AnimeSource;
}

export type SeasonName = "winter" | "spring" | "summer" | "fall";

/** Inclusive month range (1-12) for each anime season. */
const SEASON_MONTHS: Record<SeasonName, [number, number]> = {
  winter: [1, 3],
  spring: [4, 6],
  summer: [7, 9],
  fall: [10, 12],
};

/** Build a `YYYY-MM-DD` start/end date range for a given year + season. */
export function seasonDateRange(
  year: number,
  season?: SeasonName,
): { start: string; end: string } {
  if (season) {
    const [from, to] = SEASON_MONTHS[season];
    const lastDay = new Date(year, to, 0).getDate();
    return {
      start: `${year}-${String(from).padStart(2, "0")}-01`,
      end: `${year}-${String(to).padStart(2, "0")}-${lastDay}`,
    };
  }
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/** Normalize provider status strings (MAL v2 + Jikan) into our enum + label. */
export function normalizeStatus(raw?: string): {
  status: AnimeStatus;
  statusLabel: string;
} {
  switch (raw) {
    case "Currently Airing":
    case "currently_airing":
      return { status: "ongoing", statusLabel: "Em lançamento" };
    case "Finished Airing":
    case "finished_airing":
      return { status: "completed", statusLabel: "Completo" };
    case "Not yet aired":
    case "not_yet_aired":
      return { status: "upcoming", statusLabel: "Em breve" };
    default:
      return { status: "unknown", statusLabel: raw ?? "Desconhecido" };
  }
}

/** Parse durations like "24 min per ep" or "1 hr 30 min" into minutes. */
export function parseDurationMinutes(raw?: string | null): number | undefined {
  if (!raw) return undefined;
  const hours = raw.match(/(\d+)\s*hr/);
  const minutes = raw.match(/(\d+)\s*min/);
  const total =
    (hours ? parseInt(hours[1], 10) * 60 : 0) +
    (minutes ? parseInt(minutes[1], 10) : 0);
  return total > 0 ? total : undefined;
}
