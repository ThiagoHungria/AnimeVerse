/**
 * Offline / failure fallback.
 *
 * When the MAL provider is unreachable or rate-limited, the app degrades
 * gracefully to this curated local dataset (the original MVP mock data),
 * mapped into the current internal model so the UI behaves identically.
 */

import animesData from "@/data/animes.json";
import type { Anime, AnimeStatus, AnimeSummary, Episode } from "@/types";
import { buildSmartTags } from "@/domain/smartTags";

interface RawMockEpisode {
  id: string;
  number: number;
  title: string;
  videoUrl: string;
  thumbnail: string;
  duration?: number;
}

interface RawMockAnime {
  id: string;
  title: string;
  description: string;
  image: string;
  banner: string;
  rating: number;
  genres: string[];
  year?: number;
  status?: string;
  studio?: string;
  episodes: RawMockEpisode[];
}

const raw = animesData as RawMockAnime[];

function toStatus(value?: string): { status: AnimeStatus; statusLabel: string } {
  if (value === "ongoing")
    return { status: "ongoing", statusLabel: "Em lançamento" };
  if (value === "completed")
    return { status: "completed", statusLabel: "Completo" };
  return { status: "unknown", statusLabel: "Desconhecido" };
}

function toSummary(item: RawMockAnime, index: number): AnimeSummary {
  const { status, statusLabel } = toStatus(item.status);
  return {
    id: item.id,
    malId: -(index + 1),
    title: item.title,
    description: item.description,
    image: item.image,
    banner: item.banner,
    rating: item.rating,
    genres: item.genres,
    themes: [],
    demographics: [],
    smartTags: buildSmartTags({
      genres: item.genres,
      themes: [],
      demographics: [],
      rating: item.rating,
      episodeCount: item.episodes.length,
      status,
    }),
    studio: item.studio,
    studios: item.studio ? [item.studio] : [],
    status,
    statusLabel,
    year: item.year,
    episodeCount: item.episodes.length,
    durationMinutes: 24,
    source: "mock",
  };
}

const summaries: AnimeSummary[] = raw.map(toSummary);

const byId = new Map<string, RawMockAnime>(raw.map((a) => [a.id, a]));

export const fallbackData = {
  all(): AnimeSummary[] {
    return summaries;
  },
  popular(): AnimeSummary[] {
    return [...summaries].sort((a, b) => b.rating - a.rating);
  },
  recent(): AnimeSummary[] {
    return [...summaries].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  },
  byId(id: string): Anime | null {
    const item = byId.get(id);
    if (!item) return null;
    const index = raw.indexOf(item);
    const episodes: Episode[] = item.episodes.map((e) => ({
      id: e.id,
      number: e.number,
      title: e.title,
      videoUrl: e.videoUrl,
      thumbnail: e.thumbnail,
      duration: e.duration,
    }));
    return { ...toSummary(item, index), episodes };
  },
  genres(): string[] {
    const set = new Set<string>();
    summaries.forEach((a) => a.genres.forEach((g) => set.add(g)));
    return [...set].sort((a, b) => a.localeCompare(b));
  },
};
