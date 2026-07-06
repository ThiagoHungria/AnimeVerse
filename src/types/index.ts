/**
 * Internal domain models for AnimeVerse.
 *
 * These are the *clean, source-agnostic* shapes the UI consumes. They are
 * intentionally decoupled from any provider (MyAnimeList / Jikan): the mapping
 * layer (`src/domain/anime.mapper.ts`) is responsible for translating raw
 * provider payloads into these models. Swapping the data source later only
 * touches the service + mapper layers, never the UI.
 */

export type AnimeStatus = "ongoing" | "completed" | "upcoming" | "unknown";

export interface Episode {
  id: string;
  number: number;
  title: string;
  videoUrl: string;
  thumbnail: string;
  /** Duration in seconds (optional, useful for progress UI). */
  duration?: number;
  aired?: string;
  filler?: boolean;
  recap?: boolean;
}

export interface AnimeCharacter {
  id: string;
  name: string;
  image: string;
  role: string;
  voiceActor?: string;
}

export interface AnimeStaffMember {
  id: string;
  name: string;
  image: string;
  positions: string[];
}

/** Fields shared by list summaries and full detail objects. */
export interface AnimeBase {
  /** Stable id used in routes (string form of the MAL id). */
  id: string;
  malId: number;
  title: string;
  titleEnglish?: string;
  /** Synopsis. */
  description: string;
  /** Portrait poster. */
  image: string;
  /** Wide artwork for heroes/banners (falls back to poster). */
  banner: string;
  /** MAL score, 0-10. */
  rating: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  genres: string[];
  themes: string[];
  demographics: string[];
  /**
   * Human-friendly enriched categories derived from raw MAL data
   * (the "Anime Intelligence Layer"). e.g. "Alta adrenalina".
   */
  smartTags: string[];
  studio?: string;
  studios: string[];
  status: AnimeStatus;
  statusLabel: string;
  type?: string;
  year?: number;
  season?: string;
  /** Number of episodes (0 when unknown). */
  episodeCount: number;
  /** Minutes per episode (when known). */
  durationMinutes?: number;
  trailerUrl?: string;
  trailerYoutubeId?: string;
  /** Which provider produced this record. */
  source: "mal" | "jikan" | "mock";
}

/** Lightweight record used in listings/carousels. */
export type AnimeSummary = AnimeBase;

/** Full record with episodes, used on detail/watch pages. */
export interface Anime extends AnimeBase {
  episodes: Episode[];
  background?: string;
}

export interface HistoryEntry {
  animeId: string;
  episodeId: string;
  animeTitle: string;
  animeImage: string;
  episodeNumber: number;
  episodeTitle: string;
  /** Seconds watched, used for "continue watching". */
  progress: number;
  duration: number;
  updatedAt: number;
}

/** A named, smart-filtered discovery collection (Explore page). */
export interface DiscoveryCollection {
  id: string;
  title: string;
  description: string;
  animes: AnimeSummary[];
}
